import sqlite3

conn = sqlite3.connect("database.db")
cur = conn.cursor()

cur.execute("""
INSERT INTO users (name, email, password, role)
VALUES (?, ?, ?, ?)
""", ("Employee", "emp@example.com", "123", "employee"))

conn.commit()
conn.close()

print("Employee created!")