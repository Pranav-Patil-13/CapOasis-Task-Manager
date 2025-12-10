const express = require('express');
const { readNewsletters, writeNewsletters } = require('../db/storage');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all newsletters (accessible to all authenticated users)
router.get('/', authMiddleware, (req, res) => {
  try {
    const newsletters = readNewsletters();
    res.json(newsletters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create newsletter (admin only)
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const newsletters = readNewsletters();
    const newNewsletter = {
      _id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      date: new Date().toLocaleDateString(),
      subscribers: newsletters.length > 0 ? newsletters[0].subscribers || 0 : 0, // Use last known count
      postedBy: req.userId,
      createdAt: new Date().toISOString(),
    };

    newsletters.unshift(newNewsletter); // Add to beginning
    writeNewsletters(newsletters);

    res.status(201).json(newNewsletter);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete newsletter (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const newsletters = readNewsletters();
    const filteredNewsletters = newsletters.filter(n => n._id !== req.params.id);

    if (filteredNewsletters.length === newsletters.length) {
      return res.status(404).json({ message: 'Newsletter not found' });
    }

    writeNewsletters(filteredNewsletters);
    res.json({ message: 'Newsletter deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
