import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import TaskAssignModal from './TaskAssignModal';
import RegisterEmployeeModal from './RegisterEmployeeModal';
import ShareFileModal from './ShareFileModal';
import { getEmployees, createTask, createNewsletter, getSuggestions, updateSuggestion, createSuggestion, deleteSuggestion } from '../utils/api';

export default function AdminDashboard({ user, onSignOut, tasks = [], onAddTask }) {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isShareFileModalOpen, setIsShareFileModalOpen] = useState(false);

  const [isNewsletterModalOpen, setIsNewsletterModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [draggedEmployee, setDraggedEmployee] = useState(null);

  const [newsletters, setNewsletters] = useState([]);
  const [libraryFiles, setLibraryFiles] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const [newsletterTitle, setNewsletterTitle] = useState('');
  const [newsletterContent, setNewsletterContent] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [adminSuggestionTitle, setAdminSuggestionTitle] = useState('');
  const [adminSuggestionDescription, setAdminSuggestionDescription] = useState('');
  const [adminSuggestionCategory, setAdminSuggestionCategory] = useState('General');
  const [adminSuggestionTargetEmployee, setAdminSuggestionTargetEmployee] = useState('');
  const [submittingAdminSuggestion, setSubmittingAdminSuggestion] = useState(false);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await getEmployees();
        setEmployees(data);
        // Initialize top performers with all employees sorted by completed tasks
        calculateTopPerformers(data);
      } catch (error) {
        console.error('Failed to fetch employees:', error);
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const data = await getSuggestions();
        setSuggestions(data);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      }
    };
    fetchSuggestions();
  }, []);

  // Calculate top performers based on completed tasks
  const calculateTopPerformers = useCallback((empList) => {
    const performerStats = empList.map(emp => {
      const completedTasks = tasks.filter(t => {
        const assignedId = typeof t.assignedTo === 'object' ? t.assignedTo._id : t.assignedTo;
        return assignedId === emp._id && t.status === 'completed';
      }).length;

      const assignedTasks = tasks.filter(t => {
        const assignedId = typeof t.assignedTo === 'object' ? t.assignedTo._id : t.assignedTo;
        return assignedId === emp._id;
      }).length;

      return {
        ...emp,
        completedTasks,
        assignedTasks,
        completionRate: assignedTasks > 0 ? Math.round((completedTasks / assignedTasks) * 100) : 0,
      };
    }).sort((a, b) => b.completedTasks - a.completedTasks);

    setTopPerformers(performerStats.slice(0, 5)); // Top 5 performers
  }, [tasks]);

  // Update top performers when tasks or employees change
  useEffect(() => {
    if (employees.length > 0) {
      calculateTopPerformers(employees);
    }
  }, [employees, calculateTopPerformers]);

  // Handle drag and drop
  const handleDragStart = (e, index) => {
    setDraggedEmployee(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedEmployee === null || draggedEmployee === dropIndex) return;

    const newTopPerformers = [...topPerformers];
    const draggedItem = newTopPerformers[draggedEmployee];
    newTopPerformers.splice(draggedEmployee, 1);
    newTopPerformers.splice(dropIndex, 0, draggedItem);
    
    setTopPerformers(newTopPerformers);
    setDraggedEmployee(null);
  };

  // Generate employee activities from tasks
  const getEmployeeActivities = () => {
    const activities = [];
    const employeeMap = new Map();
    
    // Build employee name lookup
    employees.forEach(emp => {
      employeeMap.set(emp._id, emp.name);
    });

    // Get task activities
    tasks.forEach((task) => {
      const employeeName = typeof task.assignedTo === 'object' 
        ? task.assignedTo.name 
        : employeeMap.get(task.assignedTo);

      if (employeeName && task.status) {
        let action = '';
        let icon = '';
        
        if (task.status === 'completed') {
          action = 'Completed task';
          icon = <i className="fas fa-check"></i>;
        } else if (task.status === 'in-progress') {
          action = 'Started task';
          icon = <i className="fas fa-play"></i>;
        } else if (task.status === 'to-do') {
          action = 'Assigned task';
          icon = <i className="fas fa-sticky-note"></i>;
        }

        if (action) {
          activities.push({
            id: task._id,
            employee: employeeName,
            action: action,
            task: task.title,
            time: new Date(task.updatedAt).toLocaleDateString(),
            icon: icon,
          });
        }
      }
    });

    return activities.sort((a, b) => new Date(b.time) - new Date(a.time));
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const toDoCount = tasks.filter(t => t.status === 'to-do').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const totalTasks = tasks.length;

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

  const handleAssignTask = async (formData) => {
    try {
      const newTask = await createTask({
        title: formData.taskName,
        description: formData.description,
        priority: formData.priority,
        assignedTo: formData.assignTo,
        dueDate: formData.dueDate,
      });
      onAddTask(newTask);
      setIsTaskModalOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };



  const handleSendNewsletter = async () => {
    try {
      const newNewsletter = await createNewsletter(newsletterTitle, newsletterContent);
      setNewsletters([newNewsletter, ...newsletters]);
      setNewsletterTitle('');
      setNewsletterContent('');
      setIsNewsletterModalOpen(false);
    } catch (error) {
      console.error('Failed to send newsletter:', error);
    }
  };

  const handleEmployeeAdded = (newEmployee) => {
    setEmployees([...employees, newEmployee]);
    setIsRegisterModalOpen(false);
  };

  const handleFileShared = (newFile) => {
    setSharedFiles([newFile, ...sharedFiles]);
    setIsShareFileModalOpen(false);
  };

  const handleUpdateSuggestion = async (suggestionId, status) => {
    try {
      await updateSuggestion(suggestionId, status);
      setSuggestions(suggestions.map(s =>
        s.id === suggestionId ? { ...s, status } : s
      ));
    } catch (error) {
      console.error('Failed to update suggestion:', error);
    }
  };

  const handleDeleteSuggestion = async (suggestionId) => {
    try {
      await deleteSuggestion(suggestionId);
      setSuggestions(suggestions.filter(s => s.id !== suggestionId));
    } catch (error) {
      console.error('Failed to delete suggestion:', error);
    }
  };

  const handlePostAdminSuggestion = async () => {
    if (!adminSuggestionTitle.trim() || !adminSuggestionDescription.trim()) return;

    setSubmittingAdminSuggestion(true);
    try {
      const targetEmployee = adminSuggestionTargetEmployee ? employees.find(emp => emp._id === adminSuggestionTargetEmployee) : null;
      const newSuggestion = await createSuggestion(adminSuggestionTitle, adminSuggestionDescription, adminSuggestionCategory, targetEmployee);
      setSuggestions([newSuggestion, ...suggestions]);
      setAdminSuggestionTitle('');
      setAdminSuggestionDescription('');
      setAdminSuggestionCategory('General');
      setAdminSuggestionTargetEmployee('');
      setIsSuggestionModalOpen(false);
    } catch (error) {
      console.error('Failed to post suggestion:', error);
    } finally {
      setSubmittingAdminSuggestion(false);
    }
  };



  return (
    <div className="admin-dashboard">
      {/* Left Sidebar */}
      <div
        className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsSidebarOpen(false);
          }
        }}
      >
        <div className="sidebar-header">
          {/* <h1>Admin Panel</h1>
          <p className="sidebar-subtitle">Manage your workspace</p> */}
        </div>

        <div className="sidebar-actions">
          <button className="btn-action btn-assign-task" onClick={() => { setIsTaskModalOpen(true); setIsSidebarOpen(false); }}>
            <span className="btn-icon"><i className="fas fa-plus"></i></span>
            <span className="btn-text">Assign Task</span>
          </button>
          <button className="btn-action btn-register-employee" onClick={() => { setIsRegisterModalOpen(true); setIsSidebarOpen(false); }}>
            <span className="btn-icon"><i className="fas fa-user"></i></span>
            <span className="btn-text">Register Employee</span>
          </button>
          <button className="btn-action btn-share-file" onClick={() => { setIsShareFileModalOpen(true); setIsSidebarOpen(false); }}>
            <span className="btn-icon"><i className="fas fa-folder"></i></span>
            <span className="btn-text">Share File</span>
          </button>

          <button className="btn-action btn-newsletter" onClick={() => { setIsNewsletterModalOpen(true); setIsSidebarOpen(false); }}>
            <span className="btn-icon"><i className="fas fa-envelope"></i></span>
            <span className="btn-text">Newsletter</span>
          </button>
          <button className="btn-action btn-announcement" onClick={() => { setIsAnnouncementModalOpen(true); setIsSidebarOpen(false); }}>
            <span className="btn-icon"><i className="fas fa-bullhorn"></i></span>
            <span className="btn-text">Announcement</span>
          </button>
          <button className="btn-action btn-library" onClick={() => { setIsLibraryModalOpen(true); setIsSidebarOpen(false); }}>
            <span className="btn-icon"><i className="fas fa-book"></i></span>
            <span className="btn-text">Library</span>
          </button>
          <button className="btn-action btn-suggestion" onClick={() => { setIsSuggestionModalOpen(true); setIsSidebarOpen(false); }}>
            <span className="btn-icon"><i className="fas fa-lightbulb"></i></span>
            <span className="btn-text">Post Suggestion</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-label">Logged in as:</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <button className="btn-signout" onClick={onSignOut}>
            <i className="fas fa-sign-out-alt"></i> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Mobile Menu Button */}
        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        {/* Mobile Sign Out Button */}
        <button className="mobile-signout-btn" onClick={onSignOut}>
          <i className="fas fa-sign-out-alt"></i> Sign Out
        </button>

        {/* Desktop Sign Out Button */}
        <button className="desktop-signout-btn" onClick={onSignOut}>
          <i className="fas fa-sign-out-alt"></i> Sign Out
        </button>

        {/* Task Assignment Modal */}
        <TaskAssignModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          onSubmit={handleAssignTask}
          employees={employees}
        />

        {/* Register Employee Modal */}
        {isRegisterModalOpen && (
          <RegisterEmployeeModal
            onClose={() => setIsRegisterModalOpen(false)}
            onEmployeeAdded={handleEmployeeAdded}
          />
        )}

        {/* Share File Modal */}
        <ShareFileModal
          isOpen={isShareFileModalOpen}
          onClose={() => setIsShareFileModalOpen(false)}
          employees={employees}
          onFileShared={handleFileShared}
        />



        {/* Newsletter Modal */}
        {isNewsletterModalOpen && (
          <div className="modal-overlay" onClick={() => setIsNewsletterModalOpen(false)}>
            <div className="modal-content newsletter-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2><i className="fas fa-envelope"></i> Send Newsletter</h2>
                <button className="modal-close" onClick={() => setIsNewsletterModalOpen(false)}>✕</button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  placeholder="Newsletter title..."
                  value={newsletterTitle}
                  onChange={(e) => setNewsletterTitle(e.target.value)}
                  className="newsletter-input-title"
                />
                <textarea
                  placeholder="Newsletter content..."
                  value={newsletterContent}
                  onChange={(e) => setNewsletterContent(e.target.value)}
                  className="newsletter-input-content"
                ></textarea>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setIsNewsletterModalOpen(false)}>Cancel</button>
                <button
                  className="btn-submit"
                  onClick={handleSendNewsletter}
                >
                  Send Newsletter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Library Modal */}
        {isLibraryModalOpen && (
          <div className="modal-overlay" onClick={() => setIsLibraryModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2><i className="fas fa-book"></i> Upload to Library</h2>
                <button className="modal-close" onClick={() => setIsLibraryModalOpen(false)}>✕</button>
              </div>
              <div className="modal-body">
                <input
                  type="file"
                  id="library-file-input-modal"
                  className="library-file-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setLibraryFiles([
                        {
                          id: Date.now(),
                          name: file.name,
                          size: (file.size / 1024).toFixed(2),
                          type: file.type,
                          uploadDate: new Date().toLocaleDateString(),
                          category: 'General',
                        },
                        ...libraryFiles,
                      ]);
                      setIsLibraryModalOpen(false);
                    }
                  }}
                />
                <label htmlFor="library-file-input-modal" className="file-upload-label">
                  <i className="fas fa-upload"></i> Click to select a file
                </label>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setIsLibraryModalOpen(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Announcement Modal */}
        {isAnnouncementModalOpen && (
          <div className="modal-overlay" onClick={() => setIsAnnouncementModalOpen(false)}>
            <div className="modal-content announcement-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2><i className="fas fa-bullhorn"></i> Announcements</h2>
                <button className="modal-close" onClick={() => setIsAnnouncementModalOpen(false)}>✕</button>
              </div>
              <div className="modal-body">
                {/* Post New Announcement */}
                <div className="post-announcement-section">
                  <h3>Post New Announcement</h3>
                  <textarea
                    placeholder="Enter your announcement..."
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    className="announcement-input-content"
                    rows="4"
                  ></textarea>
                  <button
                    className="btn-submit"
                    onClick={() => {
                      if (announcementText.trim()) {
                        const newAnnouncement = {
                          id: Date.now(),
                          text: announcementText,
                          date: new Date().toLocaleDateString(),
                          time: new Date().toLocaleTimeString(),
                        };
                        setAnnouncements([newAnnouncement, ...announcements]);
                        setAnnouncementText('');

                        // Auto-delete after 24 hours
                        setTimeout(() => {
                          setAnnouncements(prev => prev.filter(a => a.id !== newAnnouncement.id));
                        }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
                      }
                    }}
                  >
                    Post Announcement
                  </button>
                </div>

                {/* Existing Announcements */}
                <div className="existing-announcements-section">
                  <h3>Existing Announcements</h3>
                  {announcements.length === 0 ? (
                    <div className="empty-announcements">
                      <p>No announcements yet. Post your first announcement above.</p>
                    </div>
                  ) : (
                    <div className="announcements-list">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="announcement-item">
                          <div className="announcement-header">
                            <span className="announcement-date"><i className="fas fa-calendar"></i> {announcement.date}</span>
                            <span className="announcement-time">{announcement.time}</span>
                            <button
                              className="btn-delete-announcement"
                              onClick={() => {
                                setAnnouncements(announcements.filter(a => a.id !== announcement.id));
                              }}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                          <p className="announcement-text">{announcement.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setIsAnnouncementModalOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Suggestion Modal */}
        {isSuggestionModalOpen && (
          <div className="modal-overlay" onClick={() => setIsSuggestionModalOpen(false)}>
            <div className="modal-content suggestion-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2><i className="fas fa-lightbulb"></i> Post Suggestion</h2>
                <button className="modal-close" onClick={() => setIsSuggestionModalOpen(false)}>✕</button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  placeholder="Suggestion title..."
                  value={adminSuggestionTitle}
                  onChange={(e) => setAdminSuggestionTitle(e.target.value)}
                  className="suggestion-input-title"
                />
                <textarea
                  placeholder="Suggestion description..."
                  value={adminSuggestionDescription}
                  onChange={(e) => setAdminSuggestionDescription(e.target.value)}
                  className="suggestion-input-description"
                  rows="4"
                ></textarea>
                <select
                  value={adminSuggestionCategory}
                  onChange={(e) => setAdminSuggestionCategory(e.target.value)}
                  className="suggestion-input-category"
                >
                  <option value="General">General</option>
                  <option value="Process Improvement">Process Improvement</option>
                  <option value="Technology">Technology</option>
                  <option value="Training">Training</option>
                  <option value="Other">Other</option>
                </select>
                <select
                  value={adminSuggestionTargetEmployee}
                  onChange={(e) => setAdminSuggestionTargetEmployee(e.target.value)}
                  className="suggestion-input-target"
                >
                  <option value="">General (All Employees)</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name} ({employee.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setIsSuggestionModalOpen(false)}>Cancel</button>
                <button
                  className="btn-submit"
                  onClick={handlePostAdminSuggestion}
                  disabled={submittingAdminSuggestion || !adminSuggestionTitle.trim() || !adminSuggestionDescription.trim()}
                >
                  {submittingAdminSuggestion ? 'Posting...' : 'Post Suggestion'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon"><i className="fas fa-chart-bar"></i></div>
            <div className="stat-content">
              <p className="stat-label">Total Tasks</p>
              <h3 className="stat-value">{totalTasks}</h3>
            </div>
          </div>

        <div className="stat-card completed">
          <div className="stat-icon"><i className="fas fa-check"></i></div>
          <div className="stat-content">
            <p className="stat-label">Completed</p>
            <h3 className="stat-value">{completedCount}</h3>
            <p className="stat-percent">{Math.round((completedCount / totalTasks) * 100)}% Complete</p>
          </div>
        </div>

        <div className="stat-card in-progress">
          <div className="stat-icon"><i className="fas fa-spinner"></i></div>
          <div className="stat-content">
            <p className="stat-label">In Progress</p>
            <h3 className="stat-value">{inProgressCount}</h3>
          </div>
        </div>

        <div className="stat-card todo">
          <div className="stat-icon"><i className="fas fa-clipboard-list"></i></div>
          <div className="stat-content">
            <p className="stat-label">Pending</p>
            <h3 className="stat-value">{toDoCount}</h3>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Top Performers Section */}
        <div className="section top-performers-section">
          <h2><i className="fas fa-star"></i> Top Performers</h2>
          <p className="performers-subtitle">Drag to reorder employees</p>
          <div className="performers-list">
            {topPerformers.length === 0 ? (
              <div className="empty-performers">
                <p>No employees yet. Register employees to see top performers.</p>
              </div>
            ) : (
              topPerformers.map((performer, index) => (
                <div
                  key={performer._id}
                  className={`performer-card ${draggedEmployee === index ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <div className="performer-rank">
                    <span className="rank-number">
                      {index === 0 ? <i className="fas fa-trophy"></i> : index === 1 ? <i className="fas fa-medal"></i> : index === 2 ? <i className="fas fa-award"></i> : `#${index + 1}`}
                    </span>
                  </div>

                  <div className="performer-name-above">
                    <h4 className="performer-name">{performer.name}</h4>
                  </div>
                  <div className="performer-stats">
                    <div className="stat-item">
                      <span className="stat-number">{performer.completedTasks}</span>
                      <span className="stat-label">Completed</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">{performer.assignedTasks}</span>
                      <span className="stat-label">Assigned</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">{performer.completionRate}%</span>
                      <span className="stat-label">Rate</span>
                    </div>
                  </div>
                  <div className="drag-handle">⋮⋮</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tasks Section */}
        <div className="section tasks-section">
          <h2><i className="fas fa-clipboard-list"></i> All Tasks</h2>
          <div className="tasks-list">
            {tasks.map((task) => (
              <div key={task._id} className="task-item">
                <div className="task-header">
                  <span className="task-title">{task.title}</span>
                  <span className="task-status" style={{ backgroundColor: getStatusColor(task.status) }}>
                    {getStatusLabel(task.status)}
                  </span>
                </div>
                <div className="task-footer">
                  <span className="task-assignee"><i className="fas fa-user"></i> {task.assignedTo?.name || 'Unknown'}</span>
                  <span className="task-date"><i className="fas fa-calendar"></i> {task.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Activity Section */}
        <div className="section activity-section">
          <h2><i className="fas fa-users"></i> Employee Activity</h2>
          {getEmployeeActivities().length === 0 ? (
            <div className="empty-activity">
              <p>No employee activity yet. Assign tasks to see activity.</p>
            </div>
          ) : (
            <div className="activity-list">
              {getEmployeeActivities().map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">{activity.icon}</div>
                  <div className="activity-content">
                    <p className="activity-main">
                      <strong>{activity.employee}</strong> {activity.action}
                    </p>
                    <p className="activity-task">{activity.task}</p>
                  </div>
                  <span className="activity-time">{activity.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suggestions Section */}
        <div className="section suggestions-section">
          <h2><i className="fas fa-lightbulb"></i> Employee Suggestions</h2>
          {suggestions.length === 0 ? (
            <div className="empty-suggestions">
              <p>No suggestions yet. Employees can submit suggestions through their dashboard.</p>
            </div>
          ) : (
            <div className="suggestions-list">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="suggestion-item">
                  <div className="suggestion-header">
                    <span className="suggestion-title">{suggestion.title}</span>
                    <span className={`suggestion-status ${suggestion.status}`}>
                      {suggestion.status === 'pending' ? <i className="fas fa-clock"></i> : suggestion.status === 'reviewed' ? <i className="fas fa-eye"></i> : <i className="fas fa-check"></i>} {suggestion.status}
                    </span>
                  </div>
                  <div className="suggestion-content">
                    <p className="suggestion-description">{suggestion.description}</p>
                    <div className="suggestion-meta">
                      <span className="suggestion-category"><i className="fas fa-folder"></i> {suggestion.category}</span>
                      <span className="suggestion-submitter"><i className="fas fa-user"></i> {suggestion.submitter?.name || 'Unknown'}</span>
                      {suggestion.targetEmployee && (
                        <span className="suggestion-target"><i className="fas fa-user-tag"></i> For: {suggestion.targetEmployee.name}</span>
                      )}
                      <span className="suggestion-date"><i className="fas fa-calendar"></i> {new Date(suggestion.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="suggestion-actions">
                    {suggestion.status === 'pending' && (
                      <button
                        className="btn-review"
                        onClick={() => handleUpdateSuggestion(suggestion.id, 'reviewed')}
                      >
                        Mark as Reviewed
                      </button>
                    )}
                    {suggestion.status === 'reviewed' && (
                      <button
                        className="btn-implement"
                        onClick={() => handleUpdateSuggestion(suggestion.id, 'implemented')}
                      >
                        Mark as Implemented
                      </button>
                    )}
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteSuggestion(suggestion.id)}
                    >
                      <i className="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      </div>
    </div>
  );
}
