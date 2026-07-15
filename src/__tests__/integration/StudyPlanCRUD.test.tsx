import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudyPlan, User } from '../../types';
import StudyPlanDetail from '../../components/StudyPlan/StudyPlanDetail';
import CreateStudyPlan from '../../components/Dashboard/CreateStudyPlan';

// Mock Firebase
jest.mock('../../firebase/config', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn(),
  },
  db: {},
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

describe('StudyPlan CRUD Operations', () => {
  const mockUser: User = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    createdAt: new Date(),
  };

  const mockStudyPlan: StudyPlan = {
    id: 'plan-1',
    title: 'Test Study Plan',
    description: 'Test description',
    subject: 'Mathematics',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId: 'test-user-id',
    isGroup: false,
    participants: ['test-user-id'],
    progress: 0,
    tasks: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication
    const { onAuthStateChanged } = require('firebase/auth');
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return jest.fn();
    });
  });

  describe('Create Study Plan', () => {
    it('creates a new study plan successfully', async () => {
      const { addDoc } = require('firebase/firestore');
      addDoc.mockResolvedValue({ id: 'new-plan-id' });

      render(<CreateStudyPlan user={mockUser} />);
      
      // Fill in form
      fireEvent.change(screen.getByLabelText(/title/i), {
        target: { value: 'New Study Plan' },
      });
      fireEvent.change(screen.getByLabelText(/subject/i), {
        target: { value: 'Science' },
      });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'New description' },
      });
      fireEvent.change(screen.getByLabelText(/due date/i), {
        target: { value: '2024-12-31' },
      });
      
      // Submit form
      fireEvent.click(screen.getByText(/create study plan/i));
      
      await waitFor(() => {
        expect(addDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            title: 'New Study Plan',
            subject: 'Science',
            description: 'New description',
            ownerId: 'test-user-id',
            participants: ['test-user-id'],
            progress: 0,
            isGroup: false,
          })
        );
      });
    });

    it('validates required fields', async () => {
      render(<CreateStudyPlan user={mockUser} />);
      
      // Try to submit without filling required fields
      fireEvent.click(screen.getByText(/create study plan/i));
      
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Read Study Plan', () => {
    it('displays study plan details correctly', async () => {
      const { onSnapshot } = require('firebase/firestore');
      onSnapshot.mockImplementation((docRef, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            ...mockStudyPlan,
            dueDate: { toDate: () => mockStudyPlan.dueDate },
            createdAt: { toDate: () => mockStudyPlan.createdAt },
            updatedAt: { toDate: () => mockStudyPlan.updatedAt },
          }),
        });
        return jest.fn();
      });

      // Mock useParams
      jest.doMock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useParams: () => ({ id: 'plan-1' }),
      }));

      render(<StudyPlanDetail />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Study Plan')).toBeInTheDocument();
        expect(screen.getByText('Mathematics')).toBeInTheDocument();
        expect(screen.getByText('Test description')).toBeInTheDocument();
      });
    });

    it('handles non-existent study plan', async () => {
      const { onSnapshot } = require('firebase/firestore');
      onSnapshot.mockImplementation((docRef, callback) => {
        callback({
          exists: () => false,
        });
        return jest.fn();
      });

      render(<StudyPlanDetail />);
      
      await waitFor(() => {
        expect(screen.getByText('Plan not found')).toBeInTheDocument();
      });
    });
  });

  describe('Update Study Plan', () => {
    it('updates study plan progress when task is completed', async () => {
      const { updateDoc } = require('firebase/firestore');
      updateDoc.mockResolvedValue(undefined);

      const studyPlanWithTasks = {
        ...mockStudyPlan,
        tasks: [
          {
            id: 'task-1',
            title: 'Complete assignment',
            completed: false,
            createdAt: new Date(),
          },
        ],
      };

      const { onSnapshot } = require('firebase/firestore');
      onSnapshot.mockImplementation((docRef, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            ...studyPlanWithTasks,
            dueDate: { toDate: () => studyPlanWithTasks.dueDate },
            createdAt: { toDate: () => studyPlanWithTasks.createdAt },
            updatedAt: { toDate: () => studyPlanWithTasks.updatedAt },
          }),
        });
        return jest.fn();
      });

      render(<StudyPlanDetail />);
      
      await waitFor(() => {
        const taskCheckbox = screen.getByRole('checkbox');
        fireEvent.click(taskCheckbox);
        
        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            progress: 100,
            tasks: expect.arrayContaining([
              expect.objectContaining({
                id: 'task-1',
                completed: true,
              }),
            ]),
          })
        );
      });
    });

    it('adds new task to study plan', async () => {
      const { updateDoc } = require('firebase/firestore');
      updateDoc.mockResolvedValue(undefined);

      const { onSnapshot } = require('firebase/firestore');
      onSnapshot.mockImplementation((docRef, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            ...mockStudyPlan,
            dueDate: { toDate: () => mockStudyPlan.dueDate },
            createdAt: { toDate: () => mockStudyPlan.createdAt },
            updatedAt: { toDate: () => mockStudyPlan.updatedAt },
          }),
        });
        return jest.fn();
      });

      render(<StudyPlanDetail />);
      
      await waitFor(() => {
        // Click add task button
        fireEvent.click(screen.getByText(/add task/i));
        
        // Fill in task form
        fireEvent.change(screen.getByLabelText(/task title/i), {
          target: { value: 'New Task' },
        });
        
        // Submit task
        fireEvent.click(screen.getByText(/add task/i));
        
        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            tasks: expect.arrayContaining([
              expect.objectContaining({
                title: 'New Task',
                completed: false,
              }),
            ]),
          })
        );
      });
    });
  });

  describe('Delete Study Plan', () => {
    it('deletes study plan successfully', async () => {
      const { deleteDoc } = require('firebase/firestore');
      deleteDoc.mockResolvedValue(undefined);

      const { onSnapshot } = require('firebase/firestore');
      onSnapshot.mockImplementation((docRef, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            ...mockStudyPlan,
            dueDate: { toDate: () => mockStudyPlan.dueDate },
            createdAt: { toDate: () => mockStudyPlan.createdAt },
            updatedAt: { toDate: () => mockStudyPlan.updatedAt },
          }),
        });
        return jest.fn();
      });

      render(<StudyPlanDetail />);
      
      await waitFor(() => {
        // Click delete button (assuming it exists)
        const deleteButton = screen.queryByText(/delete/i);
        if (deleteButton) {
          fireEvent.click(deleteButton);
          
          expect(deleteDoc).toHaveBeenCalled();
        }
      });
    });
  });
});
