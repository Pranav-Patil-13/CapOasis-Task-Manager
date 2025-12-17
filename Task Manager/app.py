# ============================ IMPORTS & CONFIG ============================
from flask import Flask, request, jsonify, render_template, send_from_directory
import sqlite3
import os
from flask import session
from datetime import datetime
from werkzeug.security import generate_password_hash,check_password_hash
from flask import redirect
import math
from datetime import time
from zoneinfo import ZoneInfo
import csv
from io import StringIO
from flask import Response

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-fallback-key")
app.config['UPLOAD_FOLDER'] = 'uploads'

def now_ist():
    return datetime.now(ZoneInfo("Asia/Kolkata"))

# =============================== DATABASE ================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "database.db")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ============================ AUTHENTICATION ==============================
@app.route('/')
def home():
    return render_template("login.html")

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")
    remember_me = data.get("rememberMe", False)

    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        "SELECT * FROM users WHERE email=? AND role=?",
        (email, role)
    )
    user = cur.fetchone()

    if user and check_password_hash(user["password"], password):
        session['user_id'] = user['id']
        session['role'] = user['role']

        if remember_me:
            session.permanent = True
            app.permanent_session_lifetime = 60 * 60 * 24 * 30  # 30 days
        else:
            session.permanent = False

        return jsonify({
            "status": "success",
            "role": user["role"],
            "user_id": user["id"]
        })

    return jsonify({"status": "error", "message": "Invalid credentials"})

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"status": "success"})

# ============================= DASHBOARD VIEWS ============================
@app.route('/admin')
def admin_dashboard():
    if session.get("role") != "admin":
        return redirect("/")

    return render_template("admin-dashboard.html")

@app.route('/employee')
def employee_dashboard():
    if session.get('role') != 'employee':
        return redirect("/")
    return render_template("employee-dashboard.html")

# ============================ ADMIN: USERS ================================
@app.route('/admin/register-employee', methods=['POST'])
def register_employee():
    if session.get("role") != "admin":
        return jsonify({"status": "forbidden"}), 403

    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = 'employee'

    hashed_password = generate_password_hash(password)

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE email=?", (email,))
    if cur.fetchone():
        return jsonify({"status": "error", "message": "Email already exists."})

    cur.execute("""
        INSERT INTO users (name, email, password, role)
        VALUES (?, ?, ?, ?)
    """, (name, email, hashed_password, role))

    conn.commit()

    log_activity("Admin", f"Added employee '{name}'")

    return jsonify({"status": "success", "message": f"Employee {name} registered."})


@app.route('/admin/employee/<int:id>')
def get_employee(id):
    if session.get("role") != "admin":
        return jsonify({"status": "forbidden"}), 403
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, name, email, role FROM users WHERE id=?", (id,))
    emp = cur.fetchone()
    if not emp:
        return jsonify({"status": "error", "message": "Employee not found"}), 404
    return jsonify(dict(emp))


# ============================ ADMIN: TASKS ================================
@app.route('/admin/create-task', methods=['POST'])
def create_task():
    if session.get("role") != "admin":
        return jsonify({"status": "forbidden"}), 403
    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    assigned_to = data.get('assigned_to')
    due_date = data.get('due_date')

    conn = get_db()
    cur = conn.cursor()

    # Optional: check if employee exists
    cur.execute("SELECT * FROM users WHERE id=? AND role='employee'", (assigned_to,))
    if not cur.fetchone():
        return jsonify({"status": "error", "message": "Employee not found."})

    cur.execute("INSERT INTO tasks (title, description, assigned_to, due_date) VALUES (?, ?, ?, ?)",
                (title, description, assigned_to, due_date))
    conn.commit()

    log_activity("Admin", f"Created task '{title}'", cur.lastrowid)

    return jsonify({"status": "success", "message": "Task assigned successfully."})


# ========================= ADMIN: ANNOUNCEMENTS ===========================
@app.route('/admin/create-announcement', methods=['POST'])
def create_announcement():
    if session.get("role") != "admin":
        return jsonify({"status": "forbidden"}), 403
    data = request.get_json()
    title = data.get('title')
    message = data.get('message')
    created_at = now_ist().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db()
    cur = conn.cursor()
    cur.execute("INSERT INTO announcements (title, message, created_at) VALUES (?, ?, ?)",
                (title, message, created_at))
    conn.commit()

    log_activity("Admin", f"Posted announcement '{title}'")

    return jsonify({"status": "success", "message": "Announcement posted."})

# ============================= ADMIN: FILES ===============================
from werkzeug.utils import secure_filename

@app.route('/admin/upload-file', methods=['POST'])
def upload_file():
    if session.get("role") != "admin":
        return jsonify({"status": "forbidden"}), 403
    if 'file' not in request.files:
        return jsonify({"status":"error", "message":"No file part"})
    file = request.files['file']
    if file.filename == '':
        return jsonify({"status":"error", "message":"No selected file"})

    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

    admin_id = session.get("user_id")

    # Save metadata in DB
    conn = get_db()
    cur = conn.cursor()
    uploaded_at = now_ist().strftime("%Y-%m-%d %H:%M:%S")
    shared_with_raw = request.form.get("shared_with", "all")
    if shared_with_raw != "all":
        shared_with = str(int(shared_with_raw))
    else:
        shared_with = "all"

    file_type = request.form.get("file_type", "general")

    cur.execute("""
INSERT INTO files (filename, uploaded_by, uploaded_at, shared_with, file_type)
VALUES (?, ?, ?, ?, ?)
""", (filename, admin_id, uploaded_at, shared_with, file_type))
    conn.commit()

    log_activity("Admin", f"Uploaded file '{filename}'")

    return jsonify({"status":"success", "message":"File uploaded successfully"})


# ============================ EMPLOYEE: TASKS =============================
# Get tasks for employee
@app.route('/employee/tasks')
def get_employee_tasks():
    user_id = session.get('user_id')
    role = session.get('role')

    if not user_id or role != 'employee':
        return jsonify({"status": "forbidden"}), 403
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM tasks WHERE assigned_to=?", (user_id,))
    tasks = [dict(row) for row in cur.fetchall()]
    return jsonify(tasks)

# ====================== EMPLOYEE: FILES ======================
@app.route('/employee/files')
def get_employee_files():
    user_id = session.get('user_id')
    role = session.get('role')

    if not user_id or role != 'employee':
        return jsonify({"status": "forbidden"}), 403

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM files
        WHERE shared_with = 'all'
            OR shared_with = ?
            OR shared_with = CAST(? AS INTEGER)
    ORDER BY uploaded_at DESC
    """, (str(user_id), user_id))

    files = [dict(row) for row in cur.fetchall()]
    return jsonify(files)

# ====================== EMPLOYEE: UPDATE TASK STATUS ======================
@app.route('/employee/update-task-status', methods=['POST'])
def update_task_status():
    user_id = session.get('user_id')
    role = session.get('role')

    if not user_id or role != 'employee':
        return jsonify({"status": "forbidden"}), 403

    data = request.get_json()
    task_id = data.get("task_id")
    status = data.get("status")

    allowed_status = ["Pending", "In Progress", "Completed"]
    if status not in allowed_status:
        return jsonify({"status": "error", "message": "Invalid status"}), 400

    conn = get_db()
    cur = conn.cursor()

    # Make sure this task belongs to the logged-in employee
    cur.execute("SELECT * FROM tasks WHERE id=? AND assigned_to=?", (task_id, user_id))
    task = cur.fetchone()

    if not task:
        return jsonify({"status": "error", "message": "Task not found"}), 404

    # Update status
    cur.execute("SELECT name FROM users WHERE id=?", (user_id,))
    emp = cur.fetchone()
    employee_name = emp["name"] if emp else "Unknown"
    log_activity(employee_name, f"Changed task status to '{status}'", task_id)
    ts = now_ist().strftime("%Y-%m-%d %H:%M:%S")
    cur.execute(
        "UPDATE tasks SET status=?, updated_at=? WHERE id=?", (status, ts, task_id)
    )
    conn.commit()

    return jsonify({"status": "success", "message": "Task status updated"})

# ====================== EMPLOYEE: RECENT UPDATES ======================
@app.route('/employee/recent-activity')
def employee_recent_activity():
    user_id = session.get('user_id')
    role = session.get('role')

    if not user_id or role != 'employee':
        return jsonify({"status": "forbidden"}), 403

    conn = get_db()
    cur = conn.cursor()

    # Fetch latest activity (limit 5)
    cur.execute("""
    SELECT user_name, action, task_id, timestamp
        FROM activity_log
        WHERE
            task_id IN (
                SELECT id FROM tasks WHERE assigned_to = ?
            )
            OR user_name = 'Admin'
        ORDER BY timestamp DESC
        LIMIT 5
    """, (user_id,))

    logs = [
        {
            "user": row["user_name"],
            "action": row["action"],
            "task_id": row["task_id"],
            "timestamp": row["timestamp"]
        }
        for row in cur.fetchall()
    ]

    return jsonify(logs)


@app.route("/employee/today-attendance")
def employee_today_attendance():
    user_id = session.get("user_id")
    role = session.get("role")

    if not user_id or role != "employee":
        return jsonify({"status": "unauthorized"}), 401

    today = now_ist().strftime("%Y-%m-%d")

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT check_in_time, check_out_time
        FROM attendance
        WHERE user_id=? AND date=?
    """, (user_id, today))

    row = cur.fetchone()

    if not row:
        return jsonify({"status": "not_marked"})

    if row["check_in_time"] and not row["check_out_time"]:
        return jsonify({
            "status": "checked_in",
            "check_in_time": row["check_in_time"]
        })

    if row["check_in_time"] and row["check_out_time"]:
        return jsonify({
            "status": "checked_out",
            "check_in_time": row["check_in_time"],
            "check_out_time": row["check_out_time"]
        })

# ============================= PUBLIC: FEEDS ==============================
# Get all announcements
@app.route('/announcements')
def get_announcements():
    if not session.get("user_id"):
        return jsonify({"status": "forbidden"}), 403
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM announcements ORDER BY created_at DESC")
    announcements = [dict(row) for row in cur.fetchall()]
    return jsonify(announcements)

# ============================== PUBLIC: FILES =============================
# Get all files
@app.route('/files')
def get_files():
    if not session.get("user_id"):
        return jsonify({"status": "forbidden"}), 403
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM files ORDER BY uploaded_at DESC")
    files = [dict(row) for row in cur.fetchall()]
    return jsonify(files)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    user_id = session.get('user_id')
    role = session.get('role')

    if not user_id:
        return "Unauthorized", 401

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM files
        WHERE filename = ?
          AND (
              shared_with = 'all'
              OR shared_with = ?
              OR ? = 'admin'
          )
    """, (filename, str(user_id), role))

    if not cur.fetchone():
        return "Forbidden", 403

    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# ============================= ADMIN: HELPERS =============================
@app.route('/admin/employees')
def get_employees():
    if session.get("role") != "admin":
        return jsonify({"status": "forbidden"}), 403
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, name, email, role FROM users WHERE role='employee'")
    employees = [dict(row) for row in cur.fetchall()]
    return jsonify(employees)

# =========================== ADMIN: TASK QUERIES ==========================
@app.route('/admin/all-tasks')
def get_all_tasks():
    if session.get("role") != "admin":
        return jsonify({"status": "forbidden"}), 403
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT tasks.id, tasks.title, tasks.description, tasks.due_date, tasks.status,
               users.name AS employee_name
        FROM tasks
        JOIN users ON tasks.assigned_to = users.id
        ORDER BY tasks.id DESC
    """)
    tasks = [dict(row) for row in cur.fetchall()]
    return jsonify(tasks)

# =========================== ADMIN: TASK DETAILS ==========================
@app.route('/admin/task/<int:id>')
def get_single_task(id):
    if session.get("role") != "admin":
        return jsonify({"status": "forbidden"}), 403
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT tasks.*, users.name AS employee_name
        FROM tasks
        JOIN users ON tasks.assigned_to = users.id
        WHERE tasks.id=?
    """, (id,))
    task = cur.fetchone()
    return jsonify(dict(task))


# ============================= ADMIN: EDIT TASK ===========================
@app.route('/admin/update-task/<int:id>', methods=['PUT'])
def update_task(id):
    if session.get("role") != "admin":
        return jsonify({"status": "forbidden"}), 403
    data = request.get_json()
    assigned_to = data.get("assigned_to")
    status = data.get("status")
    due_date = data.get("due_date")

    ts = now_ist().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        UPDATE tasks
        SET assigned_to=?, status=?, due_date=?, updated_at=?
        WHERE id=?
    """, (assigned_to, status, due_date, ts, id))
    conn.commit()

    log_activity("Admin", f"Updated task {id}", id)
    print("ADMIN UPDATE TASK HIT", id)
    return jsonify({"status": "success"})

# ============================ ADMIN: DELETE TASK ==========================
@app.route('/admin/delete-task/<int:id>', methods=['DELETE'])
def delete_task(id):
    if session.get("role") != "admin":
        return jsonify({"status": "forbidden"}), 403
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM tasks WHERE id=?", (id,))
    conn.commit()

    log_activity("Admin", f"Deleted task {id}", id)

    return jsonify({"status": "deleted"})

@app.route('/admin/update-employee/<int:id>', methods=['PUT'])
def update_employee(id):
    if session.get("role") != "admin":
        return jsonify({"status": "forbidden"}), 403
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    role = data.get('role', 'employee')

    if not name or not email:
        return jsonify({"status":"error", "message":"Name and email required"}), 400

    conn = get_db()
    cur = conn.cursor()
    # Optional: check email uniqueness (skip if same id)
    cur.execute("SELECT id FROM users WHERE email=? AND id!=?", (email, id))
    if cur.fetchone():
        return jsonify({"status":"error", "message":"Email already in use"}), 400

    cur.execute("UPDATE users SET name=?, email=?, role=? WHERE id=?", (name, email, role, id))
    conn.commit()

    log_activity("Admin", f"Updated employee '{name}'")

    return jsonify({"status":"success"})


@app.route('/admin/delete-employee/<int:id>', methods=['DELETE'])
def delete_employee(id):
    if session.get("role") != "admin":
        return jsonify({"status": "forbidden"}), 403

    conn = get_db()
    cur = conn.cursor()
    # OPTIONAL: reassign or delete tasks assigned to this employee
    # For now, delete user and set tasks assigned_to to NULL
    cur.execute("DELETE FROM users WHERE id=?", (id,))
    cur.execute("UPDATE tasks SET assigned_to=NULL WHERE assigned_to=?", (id,))
    conn.commit()

    log_activity("Admin", f"Deleted employee {id}")

    return jsonify({"status":"deleted"})

@app.route('/admin/clear-activity-log', methods=['POST'])
def clear_activity_log():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM activity_log")
    conn.commit()
    return jsonify({"status": "success", "message": "Activity log cleared"})

def log_activity(user_name, action, task_id=None):
    """
    Insert an activity log entry using the server's local time (not SQLite UTC).
    """
    conn = get_db()
    cursor = conn.cursor()
    # Use Python to generate local timestamp so it matches server timezone (e.g. Asia/Kolkata)
    ts = now_ist().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute(
        "INSERT INTO activity_log (user_name, action, task_id, timestamp) VALUES (?, ?, ?, ?)",
        (user_name, action, task_id, ts)
    )
    conn.commit()


@app.route("/admin/activity-log")
def activity_log():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 200")
    logs = cursor.fetchall()

    log_list = [
        {
            "id": row["id"],
            "user": row["user_name"],
            "action": row["action"],
            "task_id": row["task_id"],
            "timestamp": row["timestamp"]
        }
        for row in logs
    ]

    return jsonify(log_list)

@app.route('/admin/activity')
def admin_activity():
    if session.get("role") != "admin":
        return jsonify({"status": "forbidden"}), 403

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT user_name, action, task_id, timestamp
        FROM activity_log
        ORDER BY timestamp DESC
        LIMIT 5
    """)
    return jsonify([dict(row) for row in cur.fetchall()])


OFFICE_LAT = 20.010681255547066
OFFICE_LNG = 73.7419943864044
OFFICE_RADIUS_METERS = 100

# OFFICE_LAT = 19.968256137714054
# OFFICE_LNG = 73.66663090699093
# OFFICE_RADIUS_METERS = 100

def distance_in_meters(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@app.route("/employee/check-in", methods=["POST"])
def employee_check_in():
    user_id = session.get("user_id")
    role = session.get("role")

    if not user_id or role != "employee":
        return jsonify({"status": "unauthorized"}), 401

    data = request.get_json()
    lat = data.get("lat")
    lng = data.get("lng")
    late_comment = data.get("late_comment")

    if lat is None or lng is None:
        return jsonify({"status": "error", "message": "Location missing"}), 400

    now = now_ist()
    today = now.strftime("%Y-%m-%d")
    now_time = now.time()

    # # ⏰ 9–11 AM window
    # if now_time < time(9, 0) or now_time > time(11, 0):
    #     return jsonify({"status": "time_blocked"})

    is_late = now_time > time(10, 30)

    distance = distance_in_meters(lat, lng, OFFICE_LAT, OFFICE_LNG)

    if distance > OFFICE_RADIUS_METERS:
        return jsonify({
            "status": "Outside",
            "distance": round(distance)
        })

    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        "SELECT 1 FROM attendance WHERE user_id=? AND date=?",
        (user_id, today)
    )
    if cur.fetchone():
        return jsonify({"status": "already_marked"})

    if is_late and not late_comment:
        return jsonify({"status": "late_comment_required"})

    day_type = "HALF" if is_late else "FULL"

    cur.execute("""
        INSERT INTO attendance
        (user_id, date, check_in_time, latitude, longitude, status, day_type, late_comment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        today,
        now.strftime("%H:%M:%S"),
        lat,
        lng,
        "Present",
        day_type,
        late_comment
    ))

    conn.commit()

    return jsonify({
        "status": "Present",
        "distance": round(distance)
    })


@app.route("/employee/check-out", methods=["POST"])
def employee_check_out():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"status": "unauthorized"}), 401

    now = now_ist()
    today = now.strftime("%Y-%m-%d")
    now_time = now.time()

    if now_time < time(14, 45):
        return jsonify({
            "status": "time_blocked",
            "message": "Check-out allowed only after 5:45 PM"
        })

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM attendance
        WHERE user_id=? AND date=?
    """, (user_id, today))

    row = cur.fetchone()

    if not row or not row["check_in_time"]:
        return jsonify({"status": "not_checked_in"})

    if row["check_out_time"]:
        return jsonify({"status": "already_checked_out"})

    checkout_time = now_ist().strftime("%H:%M:%S")

    cur.execute("""
        UPDATE attendance
        SET check_out_time=?
        WHERE user_id=? AND date=?
    """, (checkout_time, user_id, today))

    conn.commit()

    return jsonify({
        "status": "success",
        "check_out_time": checkout_time
    })


@app.route("/employee/profile")
def employee_profile():
    user_id = session.get("user_id")
    role = session.get("role")

    if not user_id or role != "employee":
        return jsonify({"status": "forbidden"}), 403

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, email, role FROM users WHERE id=?",
        (user_id,)
    )
    user = cur.fetchone()

    if not user:
        return jsonify({"status": "error"}), 404

    return jsonify(dict(user))



@app.route("/admin/attendance")
def admin_attendance():
    if session.get("role") != "admin":
        return jsonify({"status": "forbidden"}), 403

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            users.name,
            attendance.date,
            attendance.check_in_time,
            attendance.check_out_time,
            attendance.day_type,
            attendance.late_comment
        FROM attendance
        JOIN users ON users.id = attendance.user_id
        ORDER BY attendance.date DESC
    """)

    rows = cur.fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/admin/attendance/download")
def download_attendance():
    if session.get("role") != "admin":
        return jsonify({"status": "forbidden"}), 403

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            users.name AS employee,
            attendance.date,
            attendance.check_in_time,
            attendance.check_out_time,
            attendance.day_type,
            attendance.late_comment
        FROM attendance
        JOIN users ON users.id = attendance.user_id
        ORDER BY attendance.date DESC
    """)

    rows = cur.fetchall()

    # Create CSV in memory
    output = StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Employee",
        "Date",
        "Check In",
        "Check Out",
        "Day Type",
        "Late Reason"
    ])

    # Data rows
    for r in rows:
        writer.writerow([
            r["employee"],
            r["date"],
            r["check_in_time"] or "",
            r["check_out_time"] or "",
            r["day_type"],
            r["late_comment"] or ""
        ])

    output.seek(0)

    return Response(
        output,
        mimetype="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=attendance_log.csv"
        }
    )


@app.route("/employee/top-performers")
def employee_top_performers():
    user_id = session.get("user_id")
    role = session.get("role")

    if not user_id or role not in ["employee", "admin"]:
        return jsonify({"status": "forbidden"}), 403

    today = now_ist().strftime("%Y-%m-%d")

    conn = get_db()
    cur = conn.cursor()

    # Fetch all employees
    cur.execute("""
        SELECT id, name
        FROM users
        WHERE role = 'employee'
    """)
    employees = cur.fetchall()

    leaderboard = []

    for emp in employees:
        emp_id = emp["id"]
        emp_name = emp["name"]

        # Completed
        cur.execute("""
            SELECT COUNT(*) as count
            FROM tasks
            WHERE assigned_to = ?
              AND status = 'Completed'
        """, (emp_id,))
        completed = cur.fetchone()["count"]

        # In Progress
        cur.execute("""
            SELECT COUNT(*) as count
            FROM tasks
            WHERE assigned_to = ?
              AND status = 'In Progress'
        """, (emp_id,))
        in_progress = cur.fetchone()["count"]

        # Overdue
        cur.execute("""
            SELECT COUNT(*) as count
            FROM tasks
            WHERE assigned_to = ?
              AND status != 'Completed'
              AND due_date IS NOT NULL
              AND due_date < ?
        """, (emp_id, today))
        overdue = cur.fetchone()["count"]

        score = (completed * 3) + (in_progress * 1) - (overdue * 2)

        leaderboard.append({
            "name": emp_name,
            "completed": completed,
            "in_progress": in_progress,
            "overdue": overdue,
            "score": score
        })

    # Sort by score DESC
    leaderboard.sort(key=lambda x: x["score"], reverse=True)

    # Return top 5
    return jsonify(leaderboard[:5])

# ================================ RUN APP ================================
if __name__ == "__main__":
    app.run()
