// ====================== SPA NAVIGATION ======================
const pages = {
    dashboard: document.getElementById("empPageDashboard"),
    tasks: document.getElementById("empPageTasks"),
    announcements: document.getElementById("empPageAnnouncements"),
    files: document.getElementById("empPageFiles"),
    profile: document.getElementById("empPageProfile")
};

function showPage(name) {
    Object.values(pages).forEach(p => p.style.display = "none");
    pages[name].style.display = "";
}

function setActive(id) {
    document.querySelectorAll(".admin-nav a")
        .forEach(a => a.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}


document.getElementById("empNavDashboard").onclick = () => {
    showPage("dashboard");
    loadDashboardStats();
    setActive("empNavDashboard");
};

document.getElementById("empNavTasks").onclick = () => {
    showPage("tasks");
    loadTasks();
    setActive("empNavTasks");
};

document.getElementById("empNavAnnouncements").onclick = () => {
    showPage("announcements");
    loadAnnouncements();
    setActive("empNavAnnouncements");
};

document.getElementById("empNavFiles").onclick = () => {
    showPage("files");
    loadFiles();
    setActive("empNavFiles");
};

document.getElementById("empNavProfile").onclick = () => {
    showPage("profile");
    loadProfile();
    setActive("empNavProfile");
};

// ====================== ATTENDANCE ======================
const attBtn = document.getElementById("markAttendance");
const attMsg = document.getElementById("attMsg");
const attendanceStatus = document.getElementById("attendanceStatus");
const checkOutBtn = document.getElementById("checkOutBtn");


attBtn.onclick = () => {
    attMsg.textContent = "📍 Fetching location...";

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;

            sendAttendance(latitude, longitude, null);
        },
        () => {
            attMsg.textContent = "❌ Location access denied";
        },
        {
            enableHighAccuracy: true,
            timeout: 10000
        }
    );
};

function sendAttendance(lat, lng, lateComment) {
    fetch("/employee/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            lat: lat,
            lng: lng,
            late_comment: lateComment
        })
    })
        .then(res => res.json())
        .then(data => {
            if (data.status === "Present") {
                attBtn.style.display = "none";
                checkOutBtn.style.display = "inline-block";

                attendanceStatus.innerHTML = `
        ✅ Checked in successfully<br>
        📍 ${data.distance}m from office
    `;

                attMsg.textContent = "";
            }
            else if (data.status === "already_marked") {
                attMsg.textContent = "ℹ Attendance already marked today";
                attMsg.className = "attendance-msg warning";

                attBtn.style.display = "none";

                checkOutBtn.style.display = "inline-block";
            }
            else if (data.status === "Outside") {
                attMsg.textContent = `❌ Outside office (${data.distance}m away)`;
                attMsg.className = "attendance-msg error";
            }
            else if (data.status === "time_blocked") {
                attMsg.textContent = "⏰ Attendance allowed only between 9–11 AM";
                attMsg.className = "attendance-msg warning";
            }
            else if (data.status === "late_comment_required") {
                const reason = prompt("You are late today. Optional: reason");

                sendAttendance(lat, lng, reason || null);
            }
            else {
                attMsg.textContent = "⚠ Attendance failed";
                attMsg.className = "attendance-msg error";
            }
        })
        .catch(() => {
            attMsg.textContent = "⚠ Server error";
        });
}


checkOutBtn.onclick = () => {
    fetch("/employee/check-out", { method: "POST" })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                checkOutBtn.style.display = "none";

                attendanceStatus.innerHTML = `
        ✅ Attendance completed<br>
        🕕 Check-out: <b>${data.check_out_time}</b>
    `;
            }
            else if (data.status === "time_blocked") {
                attMsg.textContent = "⏰ Check-out allowed after 5:45 PM";
                attMsg.className = "attendance-msg warning";
            }
            else if (data.status === "already_checked_out") {
                attMsg.textContent = "ℹ Already checked out";
            }
            else {
                attMsg.textContent = "⚠ Check-out failed";
            }
        });
};

function loadTodayAttendance() {
    fetch("/employee/today-attendance")
        .then(res => res.json())
        .then(data => {
            // reset UI
            attBtn.style.display = "none";
            checkOutBtn.style.display = "none";

            if (data.status === "not_marked") {
                attBtn.style.display = "inline-block";
                attendanceStatus.innerHTML =
                    "⏳ Attendance not marked today";
            }

            if (data.status === "checked_in") {
                checkOutBtn.style.display = "inline-block";
                attendanceStatus.innerHTML = `
                    ✅ Checked in at <b>${data.check_in_time}</b>
                `;
            }

            if (data.status === "checked_out") {
                attendanceStatus.innerHTML = `
                    ✅ Attendance completed<br>
                    🕘 Check-in: <b>${data.check_in_time}</b><br>
                    🕕 Check-out: <b>${data.check_out_time}</b><br>
                    <span class="muted">Have a good evening 👋</span>
                `;
            }
        });
}


function timeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp.replace(" ", "T"));
    const diff = Math.floor((now - past) / 1000);

    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    if (diff < 172800) return "Yesterday";
    return `${Math.floor(diff / 86400)} days ago`;
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}
// ====================== DASHBOARD STATS ======================
function loadDashboardStats() {
    fetch("/employee/tasks")
        .then(res => res.json())
        .then(tasks => {
            document.getElementById("cardTotal").textContent = tasks.length;
            document.getElementById("cardPending").textContent =
                tasks.filter(t => t.status === "Pending").length;
            document.getElementById("cardProgress").textContent =
                tasks.filter(t => t.status === "In Progress").length;
            document.getElementById("cardCompleted").textContent =
                tasks.filter(t => t.status === "Completed").length;



            loadPriorityTasks(tasks);

            // ===== Task status ring calculation =====
            const total = tasks.length || 1;

            const completed = tasks.filter(t => t.status === "Completed").length;
            const inProgress = tasks.filter(t => t.status === "In Progress").length;
            const pending = total - (completed + inProgress);

            const completedPct = Math.round((completed / total) * 100);
            const progressPct = Math.round((inProgress / total) * 100);
            const pendingPct = Math.round((pending / total) * 100);

            // Update SVG rings
            document
                .getElementById("ringCompleted")
                .setAttribute("stroke-dasharray", `${completedPct},100`);

            document
                .getElementById("ringProgress")
                .setAttribute("stroke-dasharray", `${progressPct},100`);

            document
                .getElementById("ringPending")
                .setAttribute("stroke-dasharray", `${pendingPct},100`);

            // Update percentage text
            document.getElementById("completedPercent").textContent = `${completedPct}%`;
            document.getElementById("progressPercent").textContent = `${progressPct}%`;
            document.getElementById("pendingPercent").textContent = `${pendingPct}%`;


            // ===== Tooltip text =====
            document
                .querySelector(".ring.completed")
                .setAttribute(
                    "data-tooltip",
                    `Completed: ${completed} of ${total} tasks`
                );

            document
                .querySelector(".ring.progress")
                .setAttribute(
                    "data-tooltip",
                    `In Progress: ${inProgress} of ${total} tasks`
                );

            document
                .querySelector(".ring.pending")
                .setAttribute(
                    "data-tooltip",
                    `Not Started: ${pending} of ${total} tasks`
                );

            loadTopPerformers();
            loadRecentUpdates();

        });
}

function loadRecentUpdates() {
    fetch("/employee/recent-activity")
        .then(res => res.json())
        .then(logs => {
            const ul = document.getElementById("recentUpdates");
            ul.innerHTML = "";

            if (!logs.length) {
                ul.innerHTML = "<li>No recent updates</li>";
                return;
            }

            logs.forEach(log => {
                const li = document.createElement("li");

                const text = document.createElement("span");
                text.className = "update-text";
                text.textContent = `${log.user}: ${log.action}`;

                const time = document.createElement("span");
                time.className = "update-time";
                time.textContent = timeAgo(log.timestamp);

                li.appendChild(text);
                li.appendChild(time);
                ul.appendChild(li);
            });
        });
}


// ====================== TASKS ======================
function loadTasks() {
    fetch("/employee/tasks")
        .then(res => res.json())
        .then(tasks => {
            const tbody = document.querySelector("#tasksTable tbody");
            tbody.innerHTML = "";

            tasks.forEach(task => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${task.title}</td>
                    <td>${task.description}</td>
                    <td>${task.due_date}</td>
                    <td>
                        <select class="task-status ${getStatusClass(task.status)}"data-id="${task.id}">
                            <option ${task.status === "Pending" ? "selected" : ""}>Pending</option>
                            <option ${task.status === "In Progress" ? "selected" : ""}>In Progress</option>
                            <option ${task.status === "Completed" ? "selected" : ""}>Completed</option>
                        </select>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            document.querySelectorAll(".task-status").forEach(sel => {
                sel.onchange = () => {
                    const newStatus = sel.value;

                    fetch("/employee/update-task-status", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            task_id: sel.dataset.id,
                            status: newStatus
                        })
                    }).then(() => {
                        sel.className = "task-status " + getStatusClass(newStatus);
                        loadDashboardStats();
                        showToast("Task status updated");
                    });
                };
            });
        });
}


function loadTopPerformers() {
    fetch("/employee/top-performers")
        .then(res => res.json())
        .then(list => {
            const ul = document.getElementById("topPerformers");
            ul.innerHTML = "";

            if (!list.length) {
                ul.innerHTML = "<li class='empty'>No data available</li>";
                return;
            }

            list.forEach((emp, index) => {
                const li = document.createElement("li");

                if (index === 0) li.classList.add("rank-1");
                if (index === 1) li.classList.add("rank-2");
                if (index === 2) li.classList.add("rank-3");

                const medal =
                    index === 0 ? "🥇" :
                        index === 1 ? "🥈" :
                            index === 2 ? "🥉" :
                                `#${index + 1}`;

                li.innerHTML = `
                    <div>
                        <div class="performer-name">${medal} ${emp.name}</div>
                        <div class="performer-stats">
                            ✔ ${emp.completed} Completed ·
                            ⏳ ${emp.in_progress} In Progress ·
                            ⚠ ${emp.overdue} Overdue
                        </div>
                    </div>
                    <div class="performer-score">${Math.max(emp.score, 0)}</div>
                `;

                ul.appendChild(li);
            });
        })
        .catch(() => {
            document.getElementById("topPerformers").innerHTML =
                "<li class='empty'>Failed to load leaderboard</li>";
        });
}

// ====================== ANNOUNCEMENTS ======================
function loadAnnouncements() {
    fetch("/announcements")
        .then(res => res.json())
        .then(list => {
            const ul = document.getElementById("announcementsList");
            ul.innerHTML = "";

            if (!list.length) {
                ul.innerHTML = "<li>No announcements</li>";
                return;
            }

            list.forEach(a => {
                const li = document.createElement("li");
                li.textContent = `${a.title} — ${a.message}`;
                ul.appendChild(li);
            });
        });
}

// ====================== FILES ======================
function loadFiles() {
    showLoader();
    fetch("/employee/files")
        .then(res => res.json())
        .then(list => {
            hideLoader();
            const ul = document.getElementById("filesList");
            ul.innerHTML = "";

            if (!list.length) {
                ul.innerHTML = "<li>No files shared</li>";
                return;
            }

            list.forEach(f => {
                const li = document.createElement("li");
                li.innerHTML = `<a href="/uploads/${f.filename}" target="_blank">${f.filename}</a>`;
                ul.appendChild(li);
            });
        });
}

// ====================== LOGOUT ======================
document.getElementById("empLogout").onclick = () => {
    fetch("/logout", { method: "POST" })
        .then(() => window.location.href = "/");
};

function getStatusClass(status) {
    if (status === "Pending") return "pending";
    if (status === "In Progress") return "progress";
    if (status === "Completed") return "completed";
    return "";
}


function loadPriorityTasks(tasks) {
    const ul = document.getElementById("priorityTasks");
    ul.innerHTML = "";

    const today = new Date().toISOString().split("T")[0];

    const priority = tasks
        .filter(t =>
            t.status !== "Completed" &&
            t.due_date &&
            t.due_date <= today
        )
        .slice(0, 5);

    if (!priority.length) {
        ul.innerHTML = "<li>No urgent tasks 🎉</li>";
        return;
    }

    priority.forEach(t => {
        const li = document.createElement("li");
        if (t.due_date < today) li.classList.add("overdue");
        li.textContent = `${t.title} (Due: ${t.due_date})`;
        ul.appendChild(li);
    });
}

function loadProfile() {
    showLoader();

    fetch("/employee/profile")
        .then(res => res.json())
        .then(user => {
            document.getElementById("empName").textContent = user.name;
            document.getElementById("empEmail").textContent = user.email;
            document.getElementById("empRole").textContent = user.role;
            document.getElementById("empId").textContent = user.id;

            const initials = user.name
                .trim()
                .split(/\s+/)
                .map(n => n[0])
                .join("")
                .toUpperCase();

            document.getElementById("empInitials").textContent = initials;
        })
        .finally(() => {
            loadKRAFiles(); // this has its own loader
        });
}

function loadKRAFiles() {
    showLoader();

    fetch("/employee/files")
        .then(res => res.json())
        .then(files => {
            hideLoader();

            const ul = document.getElementById("kraFilesList");
            ul.innerHTML = "";

            const kraFiles = files.filter(f => f.file_type === "KRA");

            if (!kraFiles.length) {
                ul.innerHTML = "<li>No KRA / KPI documents shared</li>";
                return;
            }

            kraFiles.forEach(f => {
                const li = document.createElement("li");
                li.innerHTML = `
                    <a href="/uploads/${f.filename}" target="_blank">
                        📄 ${f.filename}
                    </a>
                `;
                ul.appendChild(li);
            });
        })
        .catch(() => {
            hideLoader();
        });
}


// ====================== INIT ======================
showPage("dashboard");
loadDashboardStats();
loadTodayAttendance();