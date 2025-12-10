import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import Home from './components/Home';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import AboutUs from './components/AboutUs';
import { getTasks } from './utils/api';

function AppContent() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const navigate = useNavigate();

  // Check for stored user on app load
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Fetch tasks when user is logged in
  useEffect(() => {
    const fetchTasks = async () => {
      if (user) {
        try {
          const tasksData = await getTasks();
          setTasks(tasksData);
        } catch (error) {
          console.error('Failed to fetch tasks:', error);
        }
      }
    };

    fetchTasks();
  }, [user]);

  const handleAuth = (userData) => {
    setUser(userData);
  };

  const handleSignOut = () => {
    // Clear storage and state, then navigate
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    // Force navigation to login page
    window.location.href = '/home';
  };

  const handleAddTask = (newTask) => {
    setTasks([...tasks, newTask]);
  };

  const handleUpdateTask = (updatedTask) => {
    setTasks(tasks.map(task => task._id === updatedTask._id ? updatedTask : task));
  };

  const handleDeleteTask = (taskId) => {
    setTasks(tasks.filter(task => task._id !== taskId));
  };

  return (
    <div className="App">

      <Routes>
        <Route path="/" element={<Home user={user} onAuth={handleAuth} />} />
        <Route path="/about" element={<AboutUs />} />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />
            ) : (
              <Login onAuth={handleAuth} />
            )
          }
        />
        <Route
          path="/admin"
          element={
            user && user.role === 'admin' ? (
              <AdminDashboard
                user={user}
                onSignOut={handleSignOut}
                tasks={tasks}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/employee"
          element={
            user && user.role === 'employee' ? (
              <EmployeeDashboard
                user={user}
                onSignOut={handleSignOut}
                tasks={tasks}
                onUpdateTask={handleUpdateTask}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
