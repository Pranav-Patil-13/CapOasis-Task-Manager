// ====================== SPA NAVIGATION ======================
const pages = {
    dashboard: document.getElementById("empPageDashboard"),
    tasks: document.getElementById("empPageTasks"),
    announcements: document.getElementById("empPageAnnouncements"),
    files: document.getElementById("empPageFiles")
};

const trendTooltip = document.createElement("div");
trendTooltip.className = "trend-tooltip";
document.body.appendChild(trendTooltip);

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

            loadWeeklyTrend(tasks);
            loadRecentUpdates();

        });
}

function loadWeeklyTrend(tasks) {
    const today = new Date();
    const days = [];

    // Prepare last 7 days
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        days.push({
            date: d.toISOString().split("T")[0],
            count: 0,
            label: d.toLocaleDateString("en-US", { weekday: "short" })
        });
    }

    // Count completed tasks per day
    tasks.forEach(t => {
        if (t.status === "Completed" && t.updated_at) {
            const day = t.updated_at.split(" ")[0];
            const match = days.find(d => d.date === day);
            if (match) match.count++;
        }
    });

    const max = Math.max(...days.map(d => d.count), 1);
    const points = days.map((d, i) => {
        const x = (i / 6) * 300;
        const y = 100 - (d.count / max) * 80;
        return `${x},${y}`;
    }).join(" ");

    document.getElementById("trendLine").setAttribute("points", points);

    // Labels
    const labels = document.getElementById("trendLabels");
    labels.innerHTML = "";
    days.forEach(d => {
        const span = document.createElement("span");
        span.textContent = d.label;
        labels.appendChild(span);
    });


    // Restart line animation
    const line = document.getElementById("trendLine");
    line.style.animation = "none";
    line.offsetHeight;
    line.style.animation = "drawLine 6s ease forwards";


    const dotsGroup = document.getElementById("trendDots");
    dotsGroup.innerHTML = "";

    days.forEach((d, i) => {
        const x = (i / 6) * 300;
        const y = 100 - (d.count / max) * 80;

        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", x);
        dot.setAttribute("cy", y);
        dot.setAttribute("r", 4);
        dot.classList.add("trend-dot");

        dot.addEventListener("mouseenter", (e) => {
            trendTooltip.textContent = `${d.label}: ${d.count} completed`;
            trendTooltip.style.left = e.pageX + "px";
            trendTooltip.style.top = (e.pageY - 30) + "px";
            trendTooltip.style.opacity = 1;
        });

        dot.addEventListener("mouseleave", () => {
            trendTooltip.style.opacity = 0;
        });

        dotsGroup.appendChild(dot);
    });


    const thisWeekTotal = days.reduce((sum, d) => sum + d.count, 0);

    // Previous 7 days
    const prevDays = [];
    for (let i = 13; i >= 7; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        prevDays.push(d.toISOString().split("T")[0]);
    }

    let lastWeekTotal = 0;
    tasks.forEach(t => {
        if (t.status === "Completed" && t.updated_at) {
            const day = t.updated_at.split(" ")[0];
            if (prevDays.includes(day)) lastWeekTotal++;
        }
    });

    const diff = thisWeekTotal - lastWeekTotal;
    const percent =
        lastWeekTotal === 0
            ? 100
            : Math.round((diff / lastWeekTotal) * 100);

    const comparisonEl = document.getElementById("weekComparison");

    if (diff > 0) {
        comparisonEl.textContent = `⬆ ${percent}% more tasks completed than last week`;
        comparisonEl.style.color = "#16a34a";
    } else if (diff < 0) {
        comparisonEl.textContent = `⬇ ${Math.abs(percent)}% fewer tasks than last week`;
        comparisonEl.style.color = "#dc2626";
    } else {
        comparisonEl.textContent = "Same number of tasks completed as last week";
        comparisonEl.style.color = "#6b7280";
    }
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
    fetch("/employee/files")
        .then(res => res.json())
        .then(list => {
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
    fetch("/logout")
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


// ====================== INIT ======================
showPage("dashboard");
loadDashboardStats();
