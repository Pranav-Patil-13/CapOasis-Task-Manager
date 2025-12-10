const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname);

// Initialize data files
const usersFile = path.join(dbPath, 'users.json');
const tasksFile = path.join(dbPath, 'tasks.json');
const filesFile = path.join(dbPath, 'files.json');
const announcementsFile = path.join(dbPath, 'announcements.json');
const newslettersFile = path.join(dbPath, 'newsletters.json');
const suggestionsFile = path.join(dbPath, 'suggestions.json');

const initializeDB = () => {
  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(tasksFile)) {
    fs.writeFileSync(tasksFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(filesFile)) {
    fs.writeFileSync(filesFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(announcementsFile)) {
    fs.writeFileSync(announcementsFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(newslettersFile)) {
    fs.writeFileSync(newslettersFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(suggestionsFile)) {
    fs.writeFileSync(suggestionsFile, JSON.stringify([], null, 2));
  }
};

const readUsers = () => {
  try {
    const data = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const readTasks = () => {
  try {
    const data = fs.readFileSync(tasksFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const readFiles = () => {
  try {
    const data = fs.readFileSync(filesFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeUsers = (data) => {
  fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
};

const writeTasks = (data) => {
  fs.writeFileSync(tasksFile, JSON.stringify(data, null, 2));
};

const readAnnouncements = () => {
  try {
    const data = fs.readFileSync(announcementsFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const readNewsletters = () => {
  try {
    const data = fs.readFileSync(newslettersFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeFiles = (data) => {
  fs.writeFileSync(filesFile, JSON.stringify(data, null, 2));
};

const writeAnnouncements = (data) => {
  fs.writeFileSync(announcementsFile, JSON.stringify(data, null, 2));
};

const writeNewsletters = (data) => {
  fs.writeFileSync(newslettersFile, JSON.stringify(data, null, 2));
};

const readSuggestions = () => {
  try {
    const data = fs.readFileSync(suggestionsFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeSuggestions = (data) => {
  fs.writeFileSync(suggestionsFile, JSON.stringify(data, null, 2));
};

module.exports = {
  initializeDB,
  readUsers,
  readTasks,
  readFiles,
  readAnnouncements,
  readNewsletters,
  readSuggestions,
  writeUsers,
  writeTasks,
  writeFiles,
  writeAnnouncements,
  writeNewsletters,
  writeSuggestions,
};
