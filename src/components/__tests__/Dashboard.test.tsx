import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard/Dashboard';

// Mock Firebase
jest.mock('../../firebase/config', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn(),
    signOut: jest.fn(),
  },
  db: {},
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('../../services/notificationService', () => ({
  initializeNotifications: jest.fn().mockResolvedValue(true),
  onForegroundMessage: jest.fn(),
}));

describe('Dashboard', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful authentication
    const { onAuthStateChanged } = require('firebase/auth');
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return jest.fn(); // unsubscribe function
    });

    // Mock study plans data
    const { onSnapshot } = require('firebase/firestore');
    onSnapshot.mockImplementation((query, callback) => {
      const mockSnapshot = {
        forEach: jest.fn((fn) => {
          // Mock study plan data
          fn({
            id: 'plan-1',
            data: () => ({
              title: 'Test Study Plan',
              subject: 'Mathematics',
              description: 'Test description',
              dueDate: { toDate: () => new Date() },
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
              participants: ['test-user-id'],
              progress: 50,
              tasks: [],
            }),
          });
        }),
      };
      callback(mockSnapshot);
      return jest.fn(); // unsubscribe function
    });
  });

  it('renders dashboard with user information', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('StudyBuddy')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('displays navigation tabs correctly', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Study Plans')).toBeInTheDocument();
      expect(screen.getByText('Create New Plan')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      const createTab = screen.getByText('Create New Plan');
      fireEvent.click(createTab);
      
      expect(createTab).toHaveClass('bg-indigo-50', 'text-indigo-600');
    });
  });

  it('shows notification bell and settings button', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
      expect(screen.getByLabelText('Notification Settings')).toBeInTheDocument();
    });
  });

  it('opens notification settings when settings button is clicked', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      const settingsButton = screen.getByLabelText('Notification Settings');
      fireEvent.click(settingsButton);
      
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });
  });

  it('handles sign out correctly', async () => {
    const { signOut } = require('firebase/auth');
    signOut.mockResolvedValue(undefined);
    
    render(<Dashboard />);
    
    await waitFor(() => {
      const signOutButton = screen.getByText('Sign Out');
      fireEvent.click(signOutButton);
      
      expect(signOut).toHaveBeenCalled();
    });
  });

  it('displays study plans when plans tab is active', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Study Plans')).toBeInTheDocument();
      // Should show study plan list
      expect(screen.getByText('Test Study Plan')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    // Mock loading state
    const { onAuthStateChanged } = require('firebase/auth');
    onAuthStateChanged.mockImplementation((auth, callback) => {
      // Don't call callback immediately to simulate loading
      return jest.fn();
    });

    render(<Dashboard />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('initializes notifications on user login', async () => {
    const { initializeNotifications } = require('../../services/notificationService');
    
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(initializeNotifications).toHaveBeenCalled();
    });
  });
});
