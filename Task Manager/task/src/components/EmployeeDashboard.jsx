import React, { useState, useEffect, useRef, useCallback } from 'react';
import { updateTask, updateProfile, getAnnouncements, getNewsletters, getSharedFiles, createSuggestion, getSuggestions, getEmployees } from '../utils/api';
import './EmployeeDashboard.css';

export default function EmployeeDashboard({ user, onSignOut, tasks = [], onUpdateTask }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    department: user?.department || '',
    bio: user?.bio || '',
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [newsletters, setNewsletters] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionDescription, setSuggestionDescription] = useState('');
  const [suggestionCategory, setSuggestionCategory] = useState('General');
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [topPerformers, setTopPerformers] = useState([]);
  const dropdownRef = useRef(null);

  // Fetch announcements, newsletters, shared files, and suggestions on mount and periodically
  useEffect(() => {
    const fetchAdminPosts = async () => {
      try {
        const [announcementsData, newslettersData, filesData, suggestionsData] = await Promise.all([
          getAnnouncements(),
          getNewsletters(),
          getSharedFiles(),
          getSuggestions(),
        ]);
        setAnnouncements(announcementsData);
        setNewsletters(newslettersData);
        setSharedFiles(filesData);
        setSuggestions(suggestionsData);
      } catch (error) {
        console.error('Failed to fetch admin posts:', error);
      }
    };

    // Initial fetch
    fetchAdminPosts();

    // Set up periodic fetching every 30 seconds
    const intervalId = setInterval(fetchAdminPosts, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch employees and calculate top performers
  useEffect(() => {
    const fetchTopPerformers = async () => {
      try {
        const employees = await getEmployees();
        // Calculate completed tasks for each employee
        const employeesWithStats = employees.map(employee => {
          const employeeTasks = tasks.filter(task => {
            if (typeof task.assignedTo === 'object' && task.assignedTo?._id) {
              return task.assignedTo._id === employee._id;
            }
            return task.assignedTo === employee._id;
          });
          const completedTasks = employeeTasks.filter(task => task.status === 'completed').length;
          return {
            ...employee,
            completedTasks
          };
        });
        // Sort by completed tasks and take top 5
        const topPerformersData = employeesWithStats
          .sort((a, b) => b.completedTasks - a.completedTasks)
          .slice(0, 5);
        setTopPerformers(topPerformersData);
      } catch (error) {
        console.error('Failed to fetch top performers:', error);
      }
    };

    if (tasks.length > 0) {
      fetchTopPerformers();
    }
  }, [tasks]);

  // Filter tasks assigned to current employee by userId
  const myTasks = tasks.filter((task) => {
    // Check if assignedTo is an object (from backend) or string (legacy)
    if (typeof task.assignedTo === 'object' && task.assignedTo?._id) {
      return task.assignedTo._id === user?.userId;
    }
    // Fallback for legacy format
    return task.assignedTo === user?.userId;
  });

  const completedCount = myTasks.filter((t) => t.status === 'completed').length;
  const inProgressCount = myTasks.filter((t) => t.status === 'in-progress').length;
  const toDoCount = myTasks.filter((t) => t.status === 'to-do').length;
  const totalTasks = myTasks.length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'in-progress':
        return '#f59e0b';
      case 'to-do':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'to-do':
        return 'To Do';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#ca8a04';
      case 'low':
        return '#16a34a';
      default:
        return '#6b7280';
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTask) return;
    
    setUpdating(true);
    try {
      const updatedTask = await updateTask(selectedTask._id, { status: newStatus });
      setSelectedTask(updatedTask);
      onUpdateTask(updatedTask);
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    try {
      const updateData = {
        phone: profileData.phone,
        department: profileData.department,
        address: profileData.address,
        bio: profileData.bio,
        bloodGroup: profileData.bloodGroup,
      };
      await updateProfile(updateData);
      setIsEditingProfile(false);
      // Show success message (optional - can add toast notification)
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSubmitSuggestion = async () => {
    if (!suggestionTitle.trim() || !suggestionDescription.trim()) {
      alert('Please fill in all fields.');
      return;
    }

    setSubmittingSuggestion(true);
    try {
      await createSuggestion(suggestionTitle, suggestionDescription, suggestionCategory);
      setSuggestionTitle('');
      setSuggestionDescription('');
      setSuggestionCategory('General');
      // Refresh suggestions
      const updatedSuggestions = await getSuggestions();
      setSuggestions(updatedSuggestions);
      alert('Suggestion submitted successfully!');
    } catch (error) {
      console.error('Failed to submit suggestion:', error);
      alert('Failed to submit suggestion. Please try again.');
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  return (
    <div className="employee-dashboard">
      {/* Header */}
      <div className="emp-header">
        <div>
          <h1>CapOasis</h1>
         
        </div>
        <div className="emp-header-actions">
          <span className="emp-badge"><i className="fas fa-user"></i> {user?.email}</span>
          <div className="profile-dropdown-wrapper" ref={dropdownRef}>
            <button className="btn-profile" onClick={() => setShowProfileDropdown(!showProfileDropdown)} title="Menu">
              <i className="fas fa-user-tie"></i> Profile
            </button>
            {showProfileDropdown && (
              <div className="profile-dropdown-menu">
                <button className="dropdown-item" onClick={() => {
                  setShowProfile(true);
                  setShowProfileDropdown(false);
                }}>
                  <i className="fas fa-edit"></i> Edit Profile
                </button>
                <button className="dropdown-item" onClick={onSignOut}>
                  <i className="fas fa-sign-out-alt"></i> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="emp-stats">
        <div className="emp-stat-card">
          <div className="stat-icon"><i className="fas fa-chart-bar"></i></div>
          <div className="stat-info">
            <p>Assigned Tasks</p>
            <h3>{totalTasks}</h3>
          </div>
        </div>
        <div className="emp-stat-card">
          <div className="stat-icon"><i className="fas fa-check"></i></div>
          <div className="stat-info">
            <p>Completed</p>
            <h3>{completedCount}</h3>
          </div>
        </div>
        <div className="emp-stat-card">
          <div className="stat-icon"><i className="fas fa-spinner"></i></div>
          <div className="stat-info">
            <p>In Progress</p>
            <h3>{inProgressCount}</h3>
          </div>
        </div>
        <div className="emp-stat-card">
          <div className="stat-icon"><i className="fas fa-sticky-note"></i></div>
          <div className="stat-info">
            <p>To Do</p>
            <h3>{toDoCount}</h3>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      {showProfile && (
        <div className="emp-profile-section">
          <div className="profile-container">
            <div className="profile-header">
              <h2><i className="fas fa-user"></i> Your Profile</h2>
              <button className="close-profile" onClick={() => setShowProfile(false)}>✕</button>
            </div>

            {isEditingProfile ? (
              <div className="profile-form">
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" value={profileData.name || ''} disabled className="form-input" />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={profileData.email || ''} disabled className="form-input" />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileData.phone || ''}
                    onChange={handleProfileChange}
                    placeholder="Enter your phone number"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    name="department"
                    value={profileData.department || ''}
                    onChange={handleProfileChange}
                    placeholder="Enter your department"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={profileData.address || ''}
                    onChange={handleProfileChange}
                    placeholder="Enter your address"
                    className="form-textarea"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    value={profileData.bio || ''}
                    onChange={handleProfileChange}
                    placeholder="Tell us about yourself"
                    className="form-textarea"
                    rows="4"
                  />
                </div>

                <div className="form-group">
                  <label>Blood Group</label>
                  <select
                    name="bloodGroup"
                    value={profileData.bloodGroup || ''}
                    onChange={handleProfileChange}
                    className="form-input"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div className="profile-actions">
                  <button
                    className="btn-save-profile"
                    onClick={handleSaveProfile}
                    disabled={profileLoading}
                  >
                    {profileLoading ? 'Saving...' : <><i className="fas fa-save"></i> Save Profile</>}
                  </button>
                  <button
                    className="btn-cancel-profile"
                    onClick={() => setIsEditingProfile(false)}
                    disabled={profileLoading}
                  >
                    ✕ Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-view">
                <div className="profile-item">
                  <span className="profile-label">Name:</span>
                  <span className="profile-value">{profileData.name || 'N/A'}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Email:</span>
                  <span className="profile-value">{profileData.email || 'N/A'}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Phone:</span>
                  <span className="profile-value">{profileData.phone || 'Not provided'}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Department:</span>
                  <span className="profile-value">{profileData.department || 'Not provided'}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Address:</span>
                  <span className="profile-value">{profileData.address || 'Not provided'}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Bio:</span>
                  <span className="profile-value">{profileData.bio || 'Not provided'}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Blood Group:</span>
                  <span className="profile-value">{profileData.bloodGroup || 'Not provided'}</span>
                </div>

                <button className="btn-edit-profile" onClick={() => setIsEditingProfile(true)}>
                  <i className="fas fa-edit"></i> Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="emp-content">
        {/* Announcements Section */}
        {announcements.length > 0 && (
          <div className="emp-announcements-section">
            <h2><i className="fas fa-bullhorn"></i> Announcements</h2>
            <div className="emp-announcements-list">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="emp-announcement-card">
                  <div className="announcement-header">
                    <span className="announcement-date"><i className="fas fa-calendar-alt"></i> {announcement.date}</span>
                    <span className="announcement-time">{announcement.time}</span>
                  </div>
                  <p className="announcement-text">{announcement.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Performers Section */}
        {topPerformers.length > 0 && (
          <div className="section top-performers-section">
            <h2><i className="fas fa-trophy"></i> Top Performers</h2>
            <div className="performers-list">
              {topPerformers.map((performer, index) => (
                <div key={performer._id} className="performer-card">
                  <div className="performer-rank">
                    {index === 0 && <i className="fas fa-crown"></i>}
                    {index === 1 && <i className="fas fa-medal"></i>}
                    {index === 2 && <i className="fas fa-award"></i>}
                    {index > 2 && <span>{index + 1}</span>}
                  </div>
                  <div className="performer-info">
                    <div className="performer-avatar">
                      <i className="fas fa-user-circle"></i>
                    </div>
                    <div className="performer-details">
                      <h4 className="performer-name">{performer.name}</h4>
                      <p className="performer-department">
                        <i className="fas fa-building"></i> {performer.department || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="performer-stats">
                    <div className="stats-content">
                      <i className="fas fa-check-circle"></i>
                      <span className="completed-tasks">{performer.completedTasks}</span>
                      <span className="tasks-label">tasks</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Newsletters Section */}
        {newsletters.length > 0 && (
          <div className="emp-newsletters-section">
            <h2><i className="fas fa-envelope"></i> Newsletters</h2>
            <div className="emp-newsletters-list">
              {newsletters.map((newsletter) => (
                <div key={newsletter.id} className="emp-newsletter-card">
                  <div className="newsletter-header">
                    <h4 className="newsletter-title">{newsletter.title}</h4>
                    <span className="newsletter-date"><i className="fas fa-calendar-alt"></i> {newsletter.date}</span>
                  </div>
                  <p className="newsletter-content">{newsletter.content}</p>
                  <span className="newsletter-subscribers"><i className="fas fa-users"></i> {newsletter.subscribers} subscribers</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="emp-tasks-section">
          <h2><i className="fas fa-clipboard-list"></i> Assigned Tasks</h2>
          {myTasks.length === 0 ? (
            <div className="empty-state">
              <p>No tasks assigned yet. Check back soon!</p>
            </div>
          ) : (
            <div className="emp-tasks-list">
              {myTasks.map((task) => (
                <div
                  key={task._id}
                  className="emp-task-card"
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="emp-task-header">
                    <h4 className="emp-task-title">{task.title}</h4>
                    <span className="emp-task-status" style={{ backgroundColor: getStatusColor(task.status) }}>
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                  <p className="emp-task-desc">{task.description}</p>
                  <div className="emp-task-meta">
                    <span className="emp-priority" style={{ color: getPriorityColor(task.priority), borderColor: getPriorityColor(task.priority) }}>
                      {task.priority.toUpperCase()}
                    </span>
                    <span className="emp-due-date"><i className="fas fa-calendar-alt"></i> {task.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suggestion Box Section */}
        <div className="emp-suggestion-section">
          <h2><i className="fas fa-lightbulb"></i> Suggestion Box</h2>
          <div className="suggestion-form">
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={suggestionTitle}
                onChange={(e) => setSuggestionTitle(e.target.value)}
                placeholder="Enter suggestion title"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={suggestionDescription}
                onChange={(e) => setSuggestionDescription(e.target.value)}
                placeholder="Describe your suggestion in detail"
                className="form-textarea"
                rows="4"
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                value={suggestionCategory}
                onChange={(e) => setSuggestionCategory(e.target.value)}
                className="form-input"
              >
                <option value="General">General</option>
                <option value="Process Improvement">Process Improvement</option>
                <option value="Technology">Technology</option>
                <option value="Work Environment">Work Environment</option>
                <option value="Training">Training</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <button
              className="btn-submit-suggestion"
              onClick={handleSubmitSuggestion}
              disabled={submittingSuggestion}
            >
              {submittingSuggestion ? 'Submitting...' : <><i className="fas fa-lightbulb"></i> Submit Suggestion</>}
            </button>
          </div>
          {suggestions.filter(s => s.submitter?.id === user?.userId).length > 0 && (
            <div className="suggestions-list">
              <h3>Your Recent Suggestions</h3>
              {suggestions.filter(s => s.submitter?.id === user?.userId).map((suggestion) => (
                <div key={suggestion.id} className="suggestion-card">
                  <div className="suggestion-header">
                    <h4 className="suggestion-title">{suggestion.title}</h4>
                    <span className="suggestion-category">{suggestion.category}</span>
                  </div>
                  <p className="suggestion-description">{suggestion.description}</p>
                  <div className="suggestion-meta">
                    <span className="suggestion-author">By: {suggestion.submitter?.name || 'Anonymous'}</span>
                    <span className="suggestion-date"><i className="fas fa-calendar-alt"></i> {new Date(suggestion.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Suggestions Section */}
        {(() => {
          const adminSuggestions = suggestions.filter(s =>
            s.submitter?.id !== user?.userId &&
            (!s.targetEmployee || s.targetEmployee.id === user?.userId)
          );
          return adminSuggestions.length > 0 && (
            <div className="emp-admin-suggestions-section">
              <h2><i className="fas fa-user-tie"></i> Admin Suggestions</h2>
              <div className="admin-suggestions-list">
                {adminSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="admin-suggestion-card">
                    <div className="suggestion-header">
                      <h4 className="suggestion-title">{suggestion.title}</h4>
                      <span className="suggestion-category">{suggestion.category}</span>
                      {suggestion.targetEmployee ? (
                        <span className="suggestion-target"><i className="fas fa-user-tag"></i> Targeted to you</span>
                      ) : (
                        <span className="suggestion-general"><i className="fas fa-users"></i> General</span>
                      )}
                    </div>
                    <p className="suggestion-description">{suggestion.description}</p>
                    <div className="suggestion-meta">
                      <span className="suggestion-author">By: {suggestion.submitter?.name || 'Admin'}</span>
                      <span className="suggestion-date"><i className="fas fa-calendar-alt"></i> {new Date(suggestion.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Shared Files Section */}
        {sharedFiles.length > 0 && (
          <div className="emp-files-section">
            <h2><i className="fas fa-folder"></i> Shared Files</h2>
            <div className="emp-files-list">
              {sharedFiles.map((file) => (
                <div key={file.id} className="emp-file-card">
                  <div className="file-icon"><i className="fas fa-file"></i></div>
                  <div className="file-info">
                    <h4 className="file-name">{file.name}</h4>
                    <div className="file-meta">
                      <span className="file-size">{file.size} KB</span>
                      <span className="file-type">{file.type}</span>
                      <span className="file-date"><i className="fas fa-calendar-alt"></i> {file.uploadDate}</span>
                    </div>
                  </div>
                  <button className="btn-download"><i className="fas fa-download"></i> Download</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="emp-task-modal">
          <div className="emp-details-section">
            <button className="close-details" onClick={() => setSelectedTask(null)}>✕</button>
            <h2><i className="fas fa-thumbtack"></i> Task Details</h2>

            <div className="detail-block">
              <h4>Task Name</h4>
              <p>{selectedTask.title}</p>
            </div>

            <div className="detail-block">
              <h4>Description</h4>
              <p>{selectedTask.description}</p>
            </div>

            <div className="detail-row">
              <div className="detail-block">
                <h4>Status</h4>
                <span className="detail-badge" style={{ backgroundColor: getStatusColor(selectedTask.status) }}>
                  {getStatusLabel(selectedTask.status)}
                </span>
              </div>
              <div className="detail-block">
                <h4>Priority</h4>
                <span className="detail-badge detail-priority" style={{ color: getPriorityColor(selectedTask.priority), borderColor: getPriorityColor(selectedTask.priority) }}>
                  {selectedTask.priority.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="detail-block">
              <h4>Update Status</h4>
              <div className="status-buttons">
                <button
                  className={`status-btn ${selectedTask.status === 'to-do' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('to-do')}
                  disabled={updating || selectedTask.status === 'to-do'}
                >
                  <i className="fas fa-pencil-alt"></i> To Do
                </button>
                <button
                  className={`status-btn ${selectedTask.status === 'in-progress' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('in-progress')}
                  disabled={updating || selectedTask.status === 'in-progress'}
                >
                  <i className="fas fa-spinner"></i> In Progress
                </button>
                <button
                  className={`status-btn ${selectedTask.status === 'completed' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('completed')}
                  disabled={updating || selectedTask.status === 'completed'}
                >
                  <i className="fas fa-check"></i> Completed
                </button>
              </div>
            </div>

            <div className="detail-row">
              <div className="detail-block">
                <h4>Due Date</h4>
                <p><i className="fas fa-calendar-alt"></i> {selectedTask.dueDate}</p>
              </div>
              <div className="detail-block">
                <h4>Assigned By</h4>
                <p><i className="fas fa-user"></i> {selectedTask.assignedBy?.name || 'Unknown'}</p>
              </div>
            </div>

            <div className="detail-block">
              <h4>Created</h4>
              <p><i className="fas fa-calendar-alt"></i> {new Date(selectedTask.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
