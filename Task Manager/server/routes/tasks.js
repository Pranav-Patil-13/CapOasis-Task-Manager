const express = require('express');
const { readTasks, writeTasks, readUsers } = require('../db/storage');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all employees
router.get('/employees', authMiddleware, (req, res) => {
  try {
    const users = readUsers();
    const employees = users
      .filter(u => u.role === 'employee')
      .map(u => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department || 'N/A',
      }));
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all tasks for admin, or assigned tasks for employee
router.get('/', authMiddleware, (req, res) => {
  try {
    let tasks = readTasks();
    const users = readUsers();

    if (req.userRole === 'admin') {
      // Admin sees all tasks with user info populated
      tasks = tasks.map(task => ({
        ...task,
        assignedTo: users.find(u => u._id === task.assignedTo) || { _id: task.assignedTo, name: 'Unknown', email: '' },
        assignedBy: users.find(u => u._id === task.assignedBy) || { _id: task.assignedBy, name: 'Unknown', email: '' },
      }));
    } else {
      // Employee sees only their tasks
      tasks = tasks
        .filter(task => task.assignedTo === req.userId)
        .map(task => ({
          ...task,
          assignedTo: users.find(u => u._id === task.assignedTo) || { _id: task.assignedTo, name: 'Unknown', email: '' },
          assignedBy: users.find(u => u._id === task.assignedBy) || { _id: task.assignedBy, name: 'Unknown', email: '' },
        }));
    }

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single task
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const tasks = readTasks();
    const users = readUsers();
    const task = tasks.find(t => t._id === req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is admin or assigned employee
    if (req.userRole !== 'admin' && task.assignedTo !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const enrichedTask = {
      ...task,
      assignedTo: users.find(u => u._id === task.assignedTo),
      assignedBy: users.find(u => u._id === task.assignedBy),
    };

    res.json(enrichedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create task (admin only)
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { title, description, priority, assignedTo, dueDate } = req.body;

    if (!title || !description || !assignedTo || !dueDate) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const users = readUsers();
    const employee = users.find(u => u._id === assignedTo);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const tasks = readTasks();
    const newTask = {
      _id: Date.now().toString(),
      title,
      description,
      status: 'to-do',
      priority: priority || 'medium',
      assignedTo,
      assignedBy: req.userId,
      dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasks.push(newTask);
    writeTasks(tasks);

    const enrichedTask = {
      ...newTask,
      assignedTo: employee,
      assignedBy: users.find(u => u._id === req.userId),
    };

    res.status(201).json(enrichedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update task status (employee can update their own, admin can update any)
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const tasks = readTasks();
    const taskIndex = tasks.findIndex(t => t._id === req.params.id);

    if (taskIndex === -1) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = tasks[taskIndex];

    // Check permissions
    if (req.userRole !== 'admin' && task.assignedTo !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status, priority } = req.body;

    if (status) {
      task.status = status;
      if (status === 'completed') {
        task.completedAt = new Date().toISOString();
      }
    }

    if (priority && req.userRole === 'admin') {
      task.priority = priority;
    }

    task.updatedAt = new Date().toISOString();
    tasks[taskIndex] = task;
    writeTasks(tasks);

    const users = readUsers();
    const enrichedTask = {
      ...task,
      assignedTo: users.find(u => u._id === task.assignedTo),
      assignedBy: users.find(u => u._id === task.assignedBy),
    };

    res.json(enrichedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete task (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const tasks = readTasks();
    const filteredTasks = tasks.filter(t => t._id !== req.params.id);

    if (filteredTasks.length === tasks.length) {
      return res.status(404).json({ message: 'Task not found' });
    }

    writeTasks(filteredTasks);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
