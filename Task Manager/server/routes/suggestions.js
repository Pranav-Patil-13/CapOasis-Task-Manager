const express = require('express');
const { readSuggestions, writeSuggestions } = require('../db/storage');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all suggestions
router.get('/', authMiddleware, (req, res) => {
  try {
    const suggestions = readSuggestions();

    // If user is admin, return all suggestions
    if (req.userRole === 'admin') {
      res.json(suggestions);
    } else {
      // If user is employee, return only their own suggestions
      const userSuggestions = suggestions.filter(s => s.submitter.id === req.userId);
      res.json(userSuggestions);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new suggestion
router.post('/', authMiddleware, (req, res) => {
  try {
    const { title, description, category, targetEmployee } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    const suggestions = readSuggestions();
    const newSuggestion = {
      id: Date.now().toString(),
      title,
      description,
      category: category || 'General',
      status: 'pending',
      submitter: {
        id: req.userId,
        name: req.userName || 'Unknown',
      },
      targetEmployee: targetEmployee ? {
        id: targetEmployee.id,
        name: targetEmployee.name,
      } : null,
      createdAt: new Date().toISOString(),
    };

    suggestions.push(newSuggestion);
    writeSuggestions(suggestions);

    res.status(201).json(newSuggestion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update suggestion status (admin only)
router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { status } = req.body;
    const suggestions = readSuggestions();
    const suggestionIndex = suggestions.findIndex(s => s.id === req.params.id);

    if (suggestionIndex === -1) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }

    suggestions[suggestionIndex].status = status;
    writeSuggestions(suggestions);

    res.json(suggestions[suggestionIndex]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete suggestion (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const suggestions = readSuggestions();
    const suggestionIndex = suggestions.findIndex(s => s.id === req.params.id);

    if (suggestionIndex === -1) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }

    const deletedSuggestion = suggestions.splice(suggestionIndex, 1)[0];
    writeSuggestions(suggestions);

    res.json({ message: 'Suggestion deleted successfully', deletedSuggestion });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
