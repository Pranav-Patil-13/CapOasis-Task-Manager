import sqlite3
from werkzeug.security import generate_password_hash
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "database.db")

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

name = "Anurag Mishra"
email = "anurag.m@capoasis.com"
password = "anu.123"
role = "admin"

hashed_password = generate_password_hash(password)

cur.execute("""
INSERT INTO users (name, email, password, role)
VALUES (?, ?, ?, ?)
""", (name, email, hashed_password, role))

conn.commit()
conn.close()

print("✅ Admin created successfully")