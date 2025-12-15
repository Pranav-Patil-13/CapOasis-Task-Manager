/* ========================= ADMIN.JS MAIN CONTROLLER =========================
This file handles: Employee registration, Task assignment, Announcements,
File Uploads, Task Rendering, Filters, and Modal Task Editing.
============================================================================ */


// ======================= SPA PAGE NAVIGATION ===========================
const pages = {
    dashboard: document.getElementById("pageDashboard"),
    employees: document.getElementById("pageEmployees"),
    tasks: document.getElementById("pageTasks"),
    files: document.getElementById("pageFiles"),
    announcements: document.getElementById("pageAnnouncements"),
    settings: document.getElementById("pageSettings")
};

function showPage(pageName) {
    Object.values(pages).forEach(p => p.style.display = "none");
    pages[pageName].style.display = "";
}

function setActiveTab(id) {
    document.querySelectorAll(".admin-nav a").forEach(a => a.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

function loadDashboardStats() {
    // Load employees count
    fetch("/admin/employees")
        .then(res => res.json())
        .then(list => {
            document.querySelector("#cardEmployees h2").textContent = list.length;
        });

    // Load tasks summary
    fetch("/admin/all-tasks")
        .then(res => res.json())
        .then(tasks => {
            document.querySelector("#cardTasks h2").textContent = tasks.length;

            const pending = tasks.filter(t => (t.status || "").toLowerCase() === "pending").length;
            const completed = tasks.filter(t => (t.status || "").toLowerCase() === "completed").length;

            document.querySelector("#cardPending h2").textContent = pending;
            document.querySelector("#cardCompleted h2").textContent = completed;
        });
}

document.getElementById("navDashboard").onclick = () => {
  showPage("dashboard");
  loadDashboardStats();
  loadFileShareEmployees();
  setActiveTab("navDashboard");
};

document.getElementById("navEmployees").onclick = () => {
    showPage("employees");
    loadEmployees();
    setActiveTab("navEmployees");
};

document.getElementById("navTasks").onclick = () => {
    showPage("tasks");
    loadTasksPage();
    setActiveTab("navTasks");
};

document.getElementById("navFiles").onclick = () => {
    showPage("files");
    loadFilesPage();
    loadFileShareEmployees();
    setActiveTab("navFiles");
};

document.getElementById("navAnnouncements").onclick = () => {
    showPage("announcements");
    loadAnnouncementsPage();
    setActiveTab("navAnnouncements");
};

document.getElementById("navSettings").onclick = () => {
    showPage("settings");
    loadActivityLog();
    setActiveTab("navSettings");
};


// ========================= EMPLOYEE REGISTRATION ============================
document.getElementById("registerBtn").addEventListener("click", () => {
    const name = document.getElementById("empName").value.trim();
    const email = document.getElementById("empEmail").value.trim();
    const password = document.getElementById("empPassword").value.trim();
    const msg = document.getElementById("registerMsg");

    if (!name || !email || !password) {
        msg.textContent = "All fields are required!";
        return;
    }

    fetch("/admin/register-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
    })
        .then(res => res.json())
        .then(data => {
            msg.style.color = data.status === "success" ? "green" : "red";
            msg.textContent = data.message;
        })
        .catch(err => {
            msg.style.color = "red";
            msg.textContent = "Server error.";
        });
});


// =============================== ASSIGN TASK ================================
document.getElementById("assignBtn").addEventListener("click", () => {
    const title = document.getElementById("taskTitle").value.trim();
    const description = document.getElementById("taskDesc").value.trim();
    const due_date = document.getElementById("taskDue").value;
    const assigned_to = parseInt(document.getElementById("assignedTo").value);
    const msg = document.getElementById("taskMsg");

    if (!title || !description || !due_date || !assigned_to) {
        msg.textContent = "All fields are required!";
        return;
    }

    fetch("/admin/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, due_date, assigned_to })
    })
        .then(res => res.json())
        .then(data => {
            msg.style.color = data.status === "success" ? "green" : "red";
            msg.textContent = data.message;
        })
        .catch(err => {
            msg.style.color = "red";
            msg.textContent = "Server error.";
        });
});


// ============================= ANNOUNCEMENTS ================================
document.getElementById("announceBtn").addEventListener("click", () => {
    const title = document.getElementById("annTitle").value.trim();
    const message = document.getElementById("annMsg").value.trim();
    const msg = document.getElementById("annMsgText");

    if (!title || !message) {
        msg.textContent = "All fields are required!";
        return;
    }

    fetch("/admin/create-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message })
    })
        .then(res => res.json())
        .then(data => {
            msg.style.color = data.status === "success" ? "green" : "red";
            msg.textContent = data.message;
        })
        .catch(err => {
            msg.style.color = "red";
            msg.textContent = "Server error.";
        });
});


// =============================== FILE UPLOAD ================================
document.getElementById("uploadBtnAll").onclick = () => {
    const file = document.getElementById("fileUploadAll").files[0];
    const msg = document.getElementById("fileMsgAll");

    if (!file) {
        msg.textContent = "Please select a file.";
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("shared_with", "all");

    fetch("/admin/upload-file", { method: "POST", body: formData })
        .then(res => res.json())
        .then(data => {
            msg.style.color = data.status === "success" ? "green" : "red";
            msg.textContent = data.message;
        });
};

document.getElementById("uploadBtnSpecific").onclick = () => {
    const file = document.getElementById("fileUploadSpecific").files[0];
    const emp = document.getElementById("shareFileEmployee").value;
    const msg = document.getElementById("fileMsgSpecific");

    if (!emp) {
        msg.textContent = "Select an employee.";
        return;
    }
    if (!file) {
        msg.textContent = "Select a file.";
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("shared_with", emp);

    fetch("/admin/upload-file", { method: "POST", body: formData })
        .then(res => res.json())
        .then(data => {
            msg.style.color = data.status === "success" ? "green" : "red";
            msg.textContent = data.message;
        });
};

function loadFileShareEmployees() {
    fetch("/admin/employees")
        .then(res => res.json())
        .then(data => {
            const dropdown = document.getElementById("shareFileEmployee");
            dropdown.innerHTML = '<option value="">Select Employee</option>';

            data.forEach(emp => {
                const option = document.createElement("option");
                option.value = emp.id;
                option.textContent = emp.name;
                dropdown.appendChild(option);
            });
        });
}


// ==================== LOAD EMPLOYEES (FOR ASSIGNMENT) =======================
fetch("/admin/employees")
    .then(res => res.json())
    .then(data => {
        const dropdown = document.getElementById("assignedTo");

        dropdown.innerHTML = '<option value="">Select Employee</option>';

        data.forEach(emp => {
            const option = document.createElement("option");
            option.value = emp.id;
            option.textContent = emp.name;
            dropdown.appendChild(option);
        });
    });
let allTasks = []; // store global list


// ============================= LOAD ADMIN TASKS =============================
function loadAdminTasks() {
    fetch("/admin/all-tasks")
        .then(res => res.json())
        .then(tasks => {
            allTasks = tasks;
            renderTasks(tasks);
            loadEmployeesForFilter(tasks);
        });
}


// ============================ FILTERING SUPPORT =============================
function loadEmployeesForFilter(tasks) {
    const empSelect = document.getElementById("filterEmployee");
    empSelect.innerHTML = ""; // clear previous options
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "All Employees";
    empSelect.appendChild(defaultOpt);

    const names = [...new Set(tasks.map(t => t.employee_name).filter(Boolean))];

    names.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        empSelect.appendChild(option);
    });
}

// ------- Employees: Load / Render / Search -------
function loadEmployees(query = "") {
    fetch("/admin/employees")
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector("#employeesTable tbody");
            tbody.innerHTML = "";

            // optional basic client-side search
            const list = data.filter(emp => {
                if (!query) return true;
                const q = query.toLowerCase();
                return (emp.name || "").toLowerCase().includes(q) || (emp.email||"").toLowerCase().includes(q);
            });

            list.forEach(emp => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${emp.name}</td>
                    <td>${emp.email || ""}</td>
                    <td>${emp.role || "employee"}</td>
                    <td>
                        <button class="edit-emp" data-id="${emp.id}">Edit</button>
                        <button class="delete-emp" data-id="${emp.id}">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // attach handlers
            document.querySelectorAll(".edit-emp").forEach(btn => {
                btn.onclick = () => openEditEmployeeModal(parseInt(btn.dataset.id));
            });
            document.querySelectorAll(".delete-emp").forEach(btn => {
                btn.onclick = () => confirmAndDeleteEmployee(parseInt(btn.dataset.id));
            });
        })
        .catch(err => console.error("Failed to load employees", err));
}


// ------- Employee Modal Logic -------
const empModal = document.getElementById("employeeModal");
const empModalName = document.getElementById("empModalName");
const empModalEmail = document.getElementById("empModalEmail");
const empModalRole = document.getElementById("empModalRole");
let currentEditingEmpId = null;

function openEditEmployeeModal(empId) {
    currentEditingEmpId = empId;
    // fetch single user? we can reuse /admin/employees list, but fetch user by id for fresh data:
    fetch(`/admin/employee/${empId}`)
        .then(res => res.json())
        .then(emp => {
            empModalName.value = emp.name || "";
            empModalEmail.value = emp.email || "";
            empModalRole.value = emp.role || "employee";
            empModal.style.display = "flex";
        })
        .catch(err => {
            // fallback: load all and filter
            fetch("/admin/employees")
            .then(res => res.json())
            .then(list => {
                const emp = list.find(e => e.id === empId) || {};
                empModalName.value = emp.name || "";
                empModalEmail.value = emp.email || "";
                empModalRole.value = emp.role || "employee";
                empModal.style.display = "flex";
            });
        });
}

document.querySelector(".close-employee-modal").onclick = () => empModal.style.display = "none";
window.addEventListener("click", (e) => { if (e.target === empModal) empModal.style.display = "none"; });

// Save changes
document.getElementById("empSaveBtn").addEventListener("click", () => {
    if (!currentEditingEmpId) return;
    const payload = {
        name: empModalName.value.trim(),
        email: empModalEmail.value.trim(),
        role: empModalRole.value
    };

    fetch(`/admin/update-employee/${currentEditingEmpId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "success") {
            empModal.style.display = "none";
            loadEmployees(); // refresh table
        } else {
            alert(data.message || "Failed to update employee");
        }
    })
    .catch(err => alert("Server error"));
});

// Delete from modal (same as delete button)
document.getElementById("empDeleteBtn").addEventListener("click", () => {
    if (!currentEditingEmpId) return;
    if (!confirm("Delete this employee? This action is irreversible.")) return;

    fetch(`/admin/delete-employee/${currentEditingEmpId}`, { method: "DELETE" })
    .then(res => res.json())
    .then(data => {
        if (data.status === "deleted") {
            empModal.style.display = "none";
            loadEmployees();
        } else {
            alert(data.message || "Failed to delete");
        }
    })
    .catch(err => alert("Server error"));
});

// Confirm delete helper used by table buttons
function confirmAndDeleteEmployee(empId) {
    if (!confirm("Delete this employee?")) return;
    fetch(`/admin/delete-employee/${empId}`, { method: "DELETE" })
        .then(res => res.json())
        .then(data => {
            if (data.status === "deleted") {
                loadEmployees();
            } else {
                alert(data.message || "Failed to delete");
            }
        }).catch(err => alert("Server error"));
}

document.getElementById("refreshEmployeesBtn").addEventListener("click", () => loadEmployees());
document.getElementById("empSearch").addEventListener("input", (e) => {
    const q = e.target.value.trim();
    // simple debounce
    if (this._empSearchTimeout) clearTimeout(this._empSearchTimeout);
    this._empSearchTimeout = setTimeout(() => loadEmployees(q), 250);
});

// ================================ FILTER TASKS ==============================
document.getElementById("filterStatus").addEventListener("change", filterTasks);
document.getElementById("filterEmployee").addEventListener("change", filterTasks);

function filterTasks() {
    const status = document.getElementById("filterStatus").value;
    const employee = document.getElementById("filterEmployee").value;

    let filtered = allTasks;

    if (status) filtered = filtered.filter(t => (t.status || "").toLowerCase() === status.toLowerCase());
    if (employee) filtered = filtered.filter(t => (t.employee_name || "").toLowerCase() === employee.toLowerCase());

    renderTasks(filtered);
}


// ============================== TASK MODAL LOGIC =============================
const modal = document.getElementById("taskModal");

// Open modal function
function openTaskModal(taskId) {
    fetch(`/admin/task/${taskId}`)
        .then(res => res.json())
        .then(task => {
            document.getElementById("modalTitle").textContent = task.title;
            document.getElementById("modalDesc").textContent = task.description;
            document.getElementById("modalDue").value = task.due_date;

            // Fill employee dropdown
            fetch("/admin/employees")
                .then(res => res.json())
                .then(emps => {
                    const empSelect = document.getElementById("modalEmployee");
                    empSelect.innerHTML = "";
                    emps.forEach(emp => {
                        const opt = document.createElement("option");
                        opt.value = emp.id;
                        opt.textContent = emp.name;
                        if (emp.name === task.employee_name) opt.selected = true;
                        empSelect.appendChild(opt);
                    });
                });

            // Fill status
            document.getElementById("modalStatus").value = task.status;

            // Store ID
            document.getElementById("saveTaskBtn").dataset.id = taskId;
            document.getElementById("deleteTaskBtn").dataset.id = taskId;

            modal.style.display = "flex";
        });
}

document.querySelector(".close-modal").onclick = () => modal.style.display = "none";
window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };


// =========================== SAVE / DELETE TASKS ============================
document.getElementById("saveTaskBtn").addEventListener("click", () => {
    const id = parseInt(document.getElementById("saveTaskBtn").dataset.id);

    const updatedTask = {
        assigned_to: parseInt(document.getElementById("modalEmployee").value),
        status: document.getElementById("modalStatus").value,
        due_date: document.getElementById("modalDue").value
    };

    fetch(`/admin/update-task/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask)
    })
    .then(res => res.json())
    .then(() => {
        modal.style.display = "none";
        loadAdminTasks();
    });
});


document.getElementById("deleteTaskBtn").addEventListener("click", () => {
    const id = document.getElementById("deleteTaskBtn").dataset.id;

    fetch(`/admin/delete-task/${id}`, { method: "DELETE" })
        .then(res => res.json())
        .then(() => {
            modal.style.display = "none";
            loadAdminTasks();
        });
});


// =============================== RENDER TASKS ===============================
function renderTasks(tasks) {
    const tbody = document.getElementById("adminTaskBody");
    tbody.innerHTML = "";

    tasks.forEach(task => {
        let s = (task.status || "").toLowerCase();

        let badgeClass =
            s === "pending"
                ? "status-pending"
                : s === "in progress"
                ? "status-progress"
                : "status-completed";

        const row = document.createElement("tr");
        row.classList.add("task-row");
        row.dataset.id = task.id;

        row.innerHTML = `
            <td>${task.title}</td>
            <td>${task.employee_name}</td>
            <td><span class="status-badge ${badgeClass}">${task.status}</span></td>
            <td>${task.due_date}</td>
        `;

        // IMPORTANT: Attach click event!
        row.addEventListener("click", () => {
            openTaskModal(task.id);
        });

        tbody.appendChild(row);
    });
}


function loadActivityLog() {
    fetch("/admin/activity-log")
        .then(res => res.json())
        .then(logs => {
            const tbody = document.getElementById("activityBody");
            tbody.innerHTML = "";

            logs.forEach(log => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${log.user}</td>
                    <td>${log.action}</td>
                    <td>${log.task_id ?? "-"}</td>
                    <td>${log.timestamp}</td>
                `;
                tbody.appendChild(tr);
            });
        });
}

function loadTasksPage() {
    fetch("/admin/all-tasks")
        .then(res => res.json())
        .then(tasks => {
            const tbody = document.getElementById("tasksPageBody");
            tbody.innerHTML = "";

            tasks.forEach(task => {
                let badgeClass =
                    (task.status || "").toLowerCase() === "pending" ? "status-pending" :
                    (task.status || "").toLowerCase() === "in progress" ? "status-progress" :
                    "status-completed";

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${task.title}</td>
                    <td>${task.employee_name}</td>
                    <td><span class="status-badge ${badgeClass}">${task.status}</span></td>
                    <td>${task.due_date}</td>
                `;
                tbody.appendChild(tr);
            });
        });
}


function loadFilesPage() {
    fetch("/files")
        .then(res => res.json())
        .then(files => {
            const tbody = document.getElementById("filesPageBody");
            tbody.innerHTML = "";

            files.forEach(f => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${f.filename}</td>
                    <td><a href="/uploads/${f.filename}" target="_blank" class="download-btn">Download</a></td>
                `;
                tbody.appendChild(tr);
            });
        });
}

function loadAnnouncementsPage() {
    fetch("/announcements")
        .then(res => res.json())
        .then(anns => {
            const ul = document.getElementById("annPageList");
            ul.innerHTML = "";

            anns.forEach(a => {
                const li = document.createElement("li");
                li.textContent = `${a.title} — ${a.message}`;
                ul.appendChild(li);
            });
        });
}

document.getElementById("clearActivityBtn").onclick = () => {
    if (!confirm("Clear entire activity log?")) return;

    fetch("/admin/clear-activity-log", { method: "POST" })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            loadActivityLog();  // refresh list
        });
};

document.querySelector(".admin-logout a").addEventListener("click", () => {
    fetch("/logout")
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                window.location.href = "/";  // redirect to login page
            }
        });
});

// ============================== INITIALIZATION ==============================
// run on page load
loadAdminTasks();
loadDashboardStats();
loadFileShareEmployees();  // ← ADD THIS