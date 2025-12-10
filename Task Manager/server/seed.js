const bcrypt = require('bcryptjs');
const { writeUsers, writeTasks } = require('./db/storage');

const seedDatabase = async () => {
  try {
    console.log('Initializing empty database...');

    // Initialize with empty arrays
    const users = [];
    const tasks = [];

    writeUsers(users);
    writeTasks(tasks);

    console.log('Database initialized successfully!');
    console.log('Ready to create users via the app.');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

seedDatabase();


