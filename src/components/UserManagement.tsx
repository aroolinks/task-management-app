'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notifyTeamMembersUpdated } from '@/utils/teamMembersSync';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'team_member';
  permissions: {
    canViewTasks: boolean;
    canEditTasks: boolean;
    canViewClients: boolean;
    canEditClients: boolean;
    canManageUsers: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface UserFormData {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'team_member';
  permissions: {
    canViewTasks: boolean;
    canEditTasks: boolean;
    canViewClients: boolean;
    canEditClients: boolean;
    canManageUsers: boolean;
  };
}

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    password: '',
    role: 'team_member',
    permissions: {
      canViewTasks: false,
      canEditTasks: false,
      canViewClients: true,
      canEditClients: true,
      canManageUsers: false
    }
  });

  // Check if current user can manage users
  const canManageUsers = user?.role === 'admin' || user?.permissions?.canManageUsers;

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
    }
  }, [canManageUsers]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`User ${formData.username} created successfully!`);
        resetForm();
        fetchUsers(); // Refresh the list
        notifyTeamMembersUpdated(); // Notify other components
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Create user error:', error);
      setError('Failed to create user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          role: formData.role,
          permissions: formData.permissions,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`User ${formData.username} updated successfully!`);
        resetForm();
        fetchUsers(); // Refresh the list
        notifyTeamMembersUpdated(); // Notify other components
      } else {
        setError(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Update user error:', error);
      setError('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`User ${username} deleted successfully!`);
        fetchUsers(); // Refresh the list
        notifyTeamMembersUpdated(); // Notify other components
      } else {
        setError(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      setError('Failed to delete user');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;

    setError(null);
    setSuccess(null);

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setResettingPassword(true);

    try {
      const response = await fetch(`/api/users/${resetPasswordUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Password reset successfully for ${resetPasswordUser.username}!`);
        setShowPasswordReset(false);
        setResetPasswordUser(null);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const openPasswordResetModal = (userToReset: User) => {
    setResetPasswordUser(userToReset);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordReset(true);
    setError(null);
    setSuccess(null);
  };

  const closePasswordResetModal = () => {
    setShowPasswordReset(false);
    setResetPasswordUser(null);
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleEditUser = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setFormData({
      username: userToEdit.username,
      email: userToEdit.email,
      password: '', // Don't populate password for security
      role: userToEdit.role,
      permissions: userToEdit.permissions,
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'team_member',
      permissions: {
        canViewTasks: false,
        canEditTasks: false,
        canViewClients: true,
        canEditClients: true,
        canManageUsers: false
      }
    });
    setShowCreateForm(false);
    setEditingUser(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          [name]: checkbox.checked
        }
      }));
    } else if (name === 'role') {
      setFormData(prev => ({
        ...prev,
        role: value as 'admin' | 'team_member'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  if (!canManageUsers) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500">
            You don&apos;t have permission to manage users. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
            <p className="text-gray-600 mt-1">Manage user accounts and permissions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors flex items-center gap-1"
              title="Refresh users"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
            >
              Add User
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Create/Edit User Form */}
      {showCreateForm && (
        <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingUser ? 'Edit User' : 'Create New User'}
          </h3>
          <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  required
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    minLength={6}
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="team_member">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Permissions
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="canViewTasks"
                    checked={formData.permissions.canViewTasks}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Can View Tasks</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="canEditTasks"
                    checked={formData.permissions.canEditTasks}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Can Edit Tasks</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="canViewClients"
                    checked={formData.permissions.canViewClients}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Can View Clients</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="canEditClients"
                    checked={formData.permissions.canEditClients}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Can Edit Clients</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="canManageUsers"
                    checked={formData.permissions.canManageUsers}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Can Manage Users</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
              >
                {editingUser ? 'Update User' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setError(null);
                  setSuccess(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Users</h3>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="text-gray-500">Loading users...</div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-500">No users found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{userItem.username}</div>
                        <div className="text-sm text-gray-500">{userItem.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userItem.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {userItem.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {userItem.permissions.canViewTasks && (
                          <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            View Tasks
                          </span>
                        )}
                        {userItem.permissions.canEditTasks && (
                          <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Edit Tasks
                          </span>
                        )}
                        {userItem.permissions.canViewClients && (
                          <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            View Clients
                          </span>
                        )}
                        {userItem.permissions.canEditClients && (
                          <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            Edit Clients
                          </span>
                        )}
                        {userItem.permissions.canManageUsers && (
                          <span className="inline-flex px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                            Manage Users
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(userItem.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditUser(userItem)}
                          className="px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="Edit user"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openPasswordResetModal(userItem)}
                          className="px-3 py-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors"
                          title="Reset password"
                        >
                          Reset Password
                        </button>
                        {user?.username !== userItem.username && (
                          <button
                            onClick={() => handleDeleteUser(userItem.id, userItem.username)}
                            className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Delete user"
                          >
                            Delete
                          </button>
                        )}
                        {user?.username === userItem.username && (
                          <span className="px-3 py-1.5 text-gray-400 text-xs">
                            (You)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {showPasswordReset && resetPasswordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Reset Password
              </h2>
              <button
                onClick={closePasswordResetModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  Resetting password for: <strong>{resetPasswordUser.username}</strong> ({resetPasswordUser.email})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  minLength={6}
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  minLength={6}
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {resettingPassword ? 'Resetting...' : 'Reset Password'}
                </button>
                <button
                  type="button"
                  onClick={closePasswordResetModal}
                  disabled={resettingPassword}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}