import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';

// Mock the API functions
jest.mock('../utils/api', () => ({
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  getTasks: jest.fn(() => Promise.resolve([])),
  getEmployees: jest.fn(() => Promise.resolve([])),
  getAnnouncements: jest.fn(() => Promise.resolve([])),
  getNewsletters: jest.fn(() => Promise.resolve([])),
  getSharedFiles: jest.fn(() => Promise.resolve([])),
}));

const mockUser = {
  userId: '123',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin'
};

describe('AdminDashboard Signout Functionality', () => {
  test('signout button calls onSignOut prop when clicked', () => {
    const mockOnSignOut = jest.fn();

    render(
      <AdminDashboard
        user={mockUser}
        onSignOut={mockOnSignOut}
        tasks={[]}
        onAddTask={jest.fn()}
        onUpdateTask={jest.fn()}
        onDeleteTask={jest.fn()}
      />
    );

    // Find the profile button to open dropdown
    const profileButton = screen.getByTitle('Menu');
    fireEvent.click(profileButton);

    // Find the signout button
    const signoutButton = screen.getByText('🚪 Sign Out');
    fireEvent.click(signoutButton);

    // Verify onSignOut was called
    expect(mockOnSignOut).toHaveBeenCalledTimes(1);
  });

  test('signout button does not call navigate directly', () => {
    const mockOnSignOut = jest.fn();

    // Mock useNavigate to ensure it's not called
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    render(
      <AdminDashboard
        user={mockUser}
        onSignOut={mockOnSignOut}
        tasks={[]}
        onAddTask={jest.fn()}
        onUpdateTask={jest.fn()}
        onDeleteTask={jest.fn()}
      />
    );

    // Find the profile button to open dropdown
    const profileButton = screen.getByTitle('Menu');
    fireEvent.click(profileButton);

    // Find the signout button
    const signoutButton = screen.getByText('🚪 Sign Out');
    fireEvent.click(signoutButton);

    // Verify navigate was not called (since we removed it)
    expect(mockNavigate).not.toHaveBeenCalled();
    // Verify onSignOut was called
    expect(mockOnSignOut).toHaveBeenCalledTimes(1);
  });
});
