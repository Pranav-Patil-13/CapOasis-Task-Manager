const express = require('express');
const { readAnnouncements, writeAnnouncements } = require('../db/storage');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all announcements (accessible to all authenticated users)
router.get('/', authMiddleware, (req, res) => {
  try {
    const announcements = readAnnouncements();
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create announcement (admin only)
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Announcement text is required' });
    }

    const announcements = readAnnouncements();
    const newAnnouncement = {
      _id: Date.now().toString(),
      text: text.trim(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      postedBy: req.userId,
      createdAt: new Date().toISOString(),
    };

    announcements.unshift(newAnnouncement); // Add to beginning
    writeAnnouncements(announcements);

    res.status(201).json(newAnnouncement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete announcement (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const announcements = readAnnouncements();
    const filteredAnnouncements = announcements.filter(a => a._id !== req.params.id);

    if (filteredAnnouncements.length === announcements.length) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    writeAnnouncements(filteredAnnouncements);
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
