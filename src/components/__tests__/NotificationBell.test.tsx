import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationBell from '../Notifications/NotificationBell';

// Mock Firebase
jest.mock('../../../firebase/config', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
}));

describe('NotificationBell', () => {
  const mockUserId = 'test-user-id';
  const mockOnSnapshot = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const { onSnapshot } = require('firebase/firestore');
    onSnapshot.mockImplementation(mockOnSnapshot);
  });

  it('renders notification bell with correct accessibility attributes', () => {
    render(<NotificationBell userId={mockUserId} />);
    
    const bellButton = screen.getByLabelText('Notifications');
    expect(bellButton).toBeInTheDocument();
    expect(bellButton).toHaveClass('relative', 'p-2', 'text-gray-500');
  });

  it('shows unread count when there are unread notifications', () => {
    // Mock unread notifications
    mockOnSnapshot.mockImplementation((query, callback) => {
      const mockSnapshot = {
        size: 3,
        forEach: jest.fn(),
      };
      callback(mockSnapshot);
      return jest.fn(); // unsubscribe function
    });

    render(<NotificationBell userId={mockUserId} />);
    
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('3')).toHaveClass('bg-red-500', 'text-white');
  });

  it('does not show unread count when there are no unread notifications', () => {
    // Mock no unread notifications
    mockOnSnapshot.mockImplementation((query, callback) => {
      const mockSnapshot = {
        size: 0,
        forEach: jest.fn(),
      };
      callback(mockSnapshot);
      return jest.fn(); // unsubscribe function
    });

    render(<NotificationBell userId={mockUserId} />);
    
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('opens notification center when clicked', async () => {
    render(<NotificationBell userId={mockUserId} />);
    
    const bellButton = screen.getByLabelText('Notifications');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('displays correct notification icon', () => {
    render(<NotificationBell userId={mockUserId} />);
    
    const bellIcon = screen.getByLabelText('Notifications').querySelector('svg');
    expect(bellIcon).toBeInTheDocument();
  });

  it('handles large unread counts correctly', () => {
    // Mock large number of unread notifications
    mockOnSnapshot.mockImplementation((query, callback) => {
      const mockSnapshot = {
        size: 150,
        forEach: jest.fn(),
      };
      callback(mockSnapshot);
      return jest.fn(); // unsubscribe function
    });

    render(<NotificationBell userId={mockUserId} />);
    
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});
