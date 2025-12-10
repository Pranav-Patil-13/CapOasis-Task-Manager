const express = require('express');
const { readFiles, writeFiles, readUsers } = require('../db/storage');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all files shared with current user
router.get('/', authMiddleware, (req, res) => {
  try {
    const files = readFiles();
    const userFiles = files.filter(f => f.sharedWith === req.userId || f.sharedBy === req.userId);
    res.json(userFiles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Share file with employee (admin only) - supports both URL and uploaded files
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { fileName, fileUrl, sharedWith, description, fileType } = req.body;

    // Check if file is being uploaded or shared via URL
    if (!sharedWith) {
      return res.status(400).json({ message: 'sharedWith is required' });
    }

    if (!req.file && !fileUrl && !fileName) {
      return res.status(400).json({ message: 'Either upload a file or provide fileUrl and fileName' });
    }

    const users = readUsers();
    const employee = users.find(u => u._id === sharedWith);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    let finalFileName = fileName;
    let finalFileUrl = fileUrl;

    // If file was uploaded
    if (req.file) {
      finalFileName = req.file.originalname;
      finalFileUrl = `/uploads/${req.file.filename}`;
    }

    const files = readFiles();
    const newFile = {
      _id: Date.now().toString(),
      fileName: finalFileName,
      fileUrl: finalFileUrl,
      description: description || '',
      fileType: fileType || (req.file ? 'uploaded' : 'link'),
      sharedBy: req.userId,
      sharedWith,
      sharedDate: new Date().toISOString(),
      downloadedAt: null,
    };

    files.push(newFile);
    writeFiles(files);

    const sharedByUser = users.find(u => u._id === req.userId);
    const enrichedFile = {
      ...newFile,
      sharedByName: sharedByUser?.name || 'Unknown',
      employeeName: employee.name,
    };

    res.status(201).json(enrichedFile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark file as downloaded
router.put('/:id/download', authMiddleware, (req, res) => {
  try {
    const files = readFiles();
    const fileIndex = files.findIndex(f => f._id === req.params.id);

    if (fileIndex === -1) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = files[fileIndex];

    // Check if user has access
    if (file.sharedWith !== req.userId && file.sharedBy !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    file.downloadedAt = new Date().toISOString();
    files[fileIndex] = file;
    writeFiles(files);

    res.json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete file (admin only or file owner)
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const files = readFiles();
    const file = files.find(f => f._id === req.params.id);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Only admin or file sharer can delete
    if (file.sharedBy !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filteredFiles = files.filter(f => f._id !== req.params.id);
    writeFiles(filteredFiles);
    
    res.json({ message: 'File sharing removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
