# Task Manager Backend

Express.js backend for Task Manager application with MongoDB, JWT authentication, and role-based access control.

## Features
- User authentication (Login/Register)
- Role-based access (Admin/Employee)
- Task management (CRUD operations)
- JWT token-based authorization
- MongoDB database integration

## Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas connection)

## Installation

1. Navigate to the server directory:
```bash
cd "D:\CapOasis\IntraNet\Task Manager\server"
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env` file:
```
MONGODB_URI=mongodb://localhost:27017/task-manager
JWT_SECRET=your_jwt_secret_key_change_in_production
PORT=5000
NODE_ENV=development
```

## Running the Server

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Tasks
- `GET /api/tasks` - Get all tasks (admin) or assigned tasks (employee)
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create task (admin only)
- `PUT /api/tasks/:id` - Update task status/priority
- `DELETE /api/tasks/:id` - Delete task (admin only)

## Demo Credentials

After running, create accounts through the frontend or API:

**Admin:**
- Email: `admin@company.com`
- Password: `admin123`

**Employee:**
- Email: `employee@company.com`
- Password: `emp123`

## Database Setup

### Using MongoDB Locally:
1. Download MongoDB Community Edition
2. Start MongoDB service
3. Run the server - it will auto-connect

### Using MongoDB Atlas (Cloud):
1. Create a free cluster at https://www.mongodb.com/cloud/atlas
2. Update `MONGODB_URI` in `.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/task-manager
```

## Environment Variables

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens (change in production)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
