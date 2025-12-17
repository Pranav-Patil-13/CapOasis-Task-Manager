import sqlite3

conn = sqlite3.connect("database.db")
cur = conn.cursor()

# Users table
cur.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT
)
""")

# Tasks table
cur.execute("""
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    assigned_to INTEGER,
    due_date TEXT,
    status TEXT DEFAULT 'pending',
    updated_at TEXT
)
""")

# Announcements
cur.execute("""
CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    message TEXT,
    created_at TEXT
)
""")

# Files table
cur.execute("""
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    uploaded_by INTEGER,
    uploaded_at TEXT,
    shared_with TEXT DEFAULT 'all'
)
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT,
    action TEXT,
    task_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
""")



# ========================= ATTENDANCE TABLE =========================
cur.execute("""
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    check_in_time TEXT,
    latitude REAL,
    longitude REAL,
    status TEXT,   -- Present / Outside / Absent
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, date)
)
""")
conn.commit()
conn.close()

print("Database initialized.")