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
    settings: document.getElementById("pageSettings"),
    attendance: document.getElementById("pageAttendance"),
    approvals: document.getElementById("adminPageApprovals")
};

const approvalDetailRenderers = {
    regularisation: renderRegularisationApproval,
    reimbursement: renderReimbursementApproval,
    leave: renderLeaveApproval
};

const kraModal = document.getElementById("kraModal");
const kraEmpName = document.getElementById("kraEmpName");
const kraFileInput = document.getElementById("kraFileInput");
const kraUploadMsg = document.getElementById("kraUploadMsg");
let selectedKraEmpId = null;

let allFiles = [];
let currentApprovalStatus = "Pending";

function showPage(pageName) {
    Object.values(pages).forEach(p => {
        if (p) p.style.display = "none";
    });

    if (!pages[pageName]) {
        console.error("Page not found:", pageName);
        return;
    }

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
    // Load tasks summary
    fetch("/admin/all-tasks")
        .then(res => res.json())
        .then(tasks => {
            document.querySelector("#cardTasks h2").textContent = tasks.length;

            const today = new Date().toISOString().split("T")[0];

            let pending = 0;
            let completed = 0;
            let overdue = 0;
            let dueToday = 0;
            let dueWeek = 0;

            tasks.forEach(t => {
                const status = (t.status || "").toLowerCase();
                const due = t.due_date;

                if (status === "completed") {
                    completed++;
                    return;
                }

                pending++;

                if (due) {
                    if (due < today) overdue++;
                    else if (due === today) dueToday++;
                    else {
                        const diff =
                            (new Date(due) - new Date(today)) / (1000 * 60 * 60 * 24);
                        if (diff > 0 && diff <= 7) dueWeek++;
                    }
                }
            });

            document.querySelector("#cardPending h2").textContent = pending;
            document.querySelector("#cardCompleted h2").textContent = completed;

            document.querySelector("#cardOverdue h2").textContent = overdue;
            document.querySelector("#cardToday h2").textContent = dueToday;
            document.querySelector("#cardWeek h2").textContent = dueWeek;
        });
}


function attachDashboardCardHandlers() {

    document.getElementById("cardEmployees").onclick = () => {
        showPage("employees");
        setActiveTab("navEmployees");
        loadEmployees();
    };

    document.getElementById("cardTasks").onclick = () => {
        showPage("tasks");
        setActiveTab("navTasks");
        renderTasksPage(allTasks);
    };

    document.getElementById("cardPending").onclick = () => {
        showPage("tasks");
        setActiveTab("navTasks");
        renderTasksPage(allTasks.filter((t.status || "").toLowerCase() === "pending"));
    };

    document.getElementById("cardCompleted").onclick = () => {
        showPage("tasks");
        setActiveTab("navTasks");
        renderTasksPage(allTasks.filter(t => t.status === "Completed"));
    };

    document.getElementById("cardOverdue").onclick = () => {
        const today = new Date().toISOString().split("T")[0];
        showPage("tasks");
        setActiveTab("navTasks");
        renderTasksPage(
            allTasks.filter(t =>
                t.status !== "Completed" &&
                t.due_date &&
                t.due_date < today
            )
        );
    };

    document.getElementById("cardToday").onclick = () => {
        const today = new Date().toISOString().split("T")[0];
        showPage("tasks");
        setActiveTab("navTasks");
        renderTasksPage(
            allTasks.filter(t =>
                t.status !== "Completed" &&
                t.due_date === today
            )
        );
    };

    document.getElementById("cardWeek").onclick = () => {
        const today = new Date();
        showPage("tasks");
        setActiveTab("navTasks");
        renderTasksPage(
            allTasks.filter(t => {
                if (t.status === "Completed" || !t.due_date) return false;
                const diff =
                    (new Date(t.due_date) - today) / (1000 * 60 * 60 * 24);
                return diff > 0 && diff <= 7;
            })
        );
    };
}


function loadAdminApprovals() {
    fetch(`/admin/approvals?status=${currentApprovalStatus}`)
        .then(res => res.json())
        .then(rows => {
            const tbody = document.getElementById("adminApprovalBody");
            tbody.innerHTML = "";

            if (!rows.length) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align:center;">
                            No ${currentApprovalStatus.toLowerCase()} approvals
                        </td>
                    </tr>
                `;
                return;
            }

            rows.forEach(r => {
                const tr = document.createElement("tr");
                let detailsHtml = "-";
                const renderer = approvalDetailRenderers[r.type];
                if (renderer) {
                    detailsHtml = renderer(r);
                }

                tr.innerHTML = `
                    <td>${r.employee}</td>
                    <td>${r.type}</td>
                    <td>${detailsHtml}</td>
                    <td>${new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                    <td>
                        ${r.status === "Pending"
                        ? `
                                <button class="approve-btn" data-id="${r.id}">
                                    Approve
                                </button>
                                <button class="reject-btn" data-id="${r.id}">
                                    Reject
                                </button>
                              `
                        : `<span class="status-pill ${(r.status || "pending").toLowerCase()}">
                                    ${r.status || "Pending"}
                               </span>`
                    }
                    </td>
                `;

                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            console.error("Failed to load approvals", err);
        });
}

function renderRegularisationApproval(r) {
    const cur = r.payload.current || {};
    const req = r.payload.requested || {};

    return `
        <div style="font-size:13px; line-height:1.4;">
            <b>Date:</b> ${r.payload.date}<br><br>

            <b>Current</b><br>
            Status: ${cur.status || "—"}<br>
            In: ${cur.check_in || "—"}<br>
            Out: ${cur.check_out || "—"}<br><br>

            <b>Requested</b><br>
            Status: ${req.status || "—"}<br>
            In: ${req.check_in || "—"}<br>
            Out: ${req.check_out || "—"}<br><br>

            <b>Reason:</b><br>
            ${r.payload.reason || "-"}
        </div>
    `;
}

function renderReimbursementApproval(r) {
    const p = r.payload || {};

    return `
        <div class="reimb-details">
            <div class="reimb-text">
                <strong>${p.category || "Reimbursement"}</strong>
                <span>₹${p.amount || "0"}</span>
            </div>

            ${p.bill_file
            ? `<a href="/uploads/${p.bill_file}"
                     target="_blank"
                     class="view-bill-btn">
                     View Bill
                   </a>`
            : ""
        }
        </div>
    `;
}

function renderLeaveApproval(r) {
    const p = r.payload || {};
    return `
        <div style="font-size:13px;">
            <b>From:</b> ${p.from_date || "-"}<br>
            <b>To:</b> ${p.to_date || "-"}<br><br>
            <b>Reason:</b><br>
            ${p.reason || "-"}
        </div>
    `;
}


document.addEventListener("click", (e) => {

    // APPROVE
    if (e.target.classList.contains("approve-btn")) {
        const id = e.target.dataset.id;

        if (!confirm("Approve this request?")) return;

        fetch("/admin/approvals/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                approval_id: id,
                action: "approve"
            })
        })
            .then(res => res.json())
            .then(() => loadAdminApprovals());
    }

    // REJECT
    if (e.target.classList.contains("reject-btn")) {
        const id = e.target.dataset.id;

        const reason = prompt("Reason for rejection:");
        if (!reason) return;

        fetch("/admin/approvals/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                approval_id: id,
                action: "reject",
                reason: reason
            })
        })
            .then(res => res.json())
            .then(() => loadAdminApprovals());
    }
});


document.getElementById("navApprovals").onclick = () => {
    showPage("approvals");
    setActiveTab("navApprovals");
    currentApprovalStatus = "Pending";
    loadAdminApprovals();
};

document.querySelectorAll("#adminPageApprovals .approval-tab").forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll("#adminPageApprovals .approval-tab")
            .forEach(t => t.classList.remove("active"));

        tab.classList.add("active");

        currentApprovalStatus = tab.dataset.status;
        loadAdminApprovals();
    };
});

document.getElementById("navDashboard").onclick = () => {
    showPage("dashboard");
    setActiveTab("navDashboard");
    loadDashboardStats();
    loadAdminActivity();
    loadFileShareEmployees();
};

document.getElementById("navEmployees").onclick = () => {
    showPage("employees");
    loadEmployees();
    setActiveTab("navEmployees");
};

document.getElementById("navTasks").onclick = () => {
    showPage("tasks");
    setActiveTab("navTasks");

    // ensure data exists
    if (!allTasks.length) {
        loadAdminTasks();
    } else {
        renderTasksPage(allTasks);
    }

    resetTaskPills();
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

document.getElementById("navAttendance").onclick = () => {
    showPage("attendance");
    setActiveTab("navAttendance");
    loadAttendance();
};

document.querySelectorAll(".task-pills .pill").forEach(pill => {
    pill.onclick = () => {
        // active state
        document.querySelectorAll(".task-pills .pill")
            .forEach(p => p.classList.remove("active"));
        pill.classList.add("active");

        const filter = pill.dataset.filter;
        const today = new Date().toISOString().split("T")[0];

        let filtered = allTasks;

        if (filter === "Overdue") {
            filtered = allTasks.filter(t =>
                t.status !== "Completed" &&
                t.due_date &&
                t.due_date < today
            );
        } else if (filter !== "all") {
            filtered = allTasks.filter(t => t.status === filter);
        }

        renderTasksPage(filtered);
    };
});

document.getElementById("kraUploadBtn").onclick = () => {
    const file = kraFileInput.files[0];

    if (!file || !selectedKraEmpId) {
        kraUploadMsg.textContent = "Select a file";
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("shared_with", selectedKraEmpId);
    formData.append("file_type", "KRA");

    showLoader();
    fetch("/admin/upload-file", {
        method: "POST",
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            hideLoader();
            kraUploadMsg.style.color =
                data.status === "success" ? "green" : "red";
            kraUploadMsg.textContent = data.message;
        })
        .catch(() => {
            hideLoader();
        });
};

document.getElementById("closeKraModal").onclick = () => {
    kraModal.style.display = "none";
};

window.addEventListener("click", e => {
    if (e.target === kraModal) kraModal.style.display = "none";
});
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

    showLoader();
    fetch("/admin/upload-file", { method: "POST", body: formData })
        .then(res => res.json())
        .then(data => {
            hideLoader();
            msg.style.color = data.status === "success" ? "green" : "red";
            msg.textContent = data.message;
        })
        .catch(() => {
            hideLoader();
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

            employeesMap = {};

            data.forEach(emp => {
                employeesMap[String(emp.id)] = emp.name;

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

function resetTaskPills() {
    document.querySelectorAll(".task-pills .pill")
        .forEach(p => p.classList.remove("active"));

    document.querySelector('.task-pills .pill[data-filter="all"]')
        .classList.add("active");
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
                return (emp.name || "").toLowerCase().includes(q) || (emp.email || "").toLowerCase().includes(q);
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
    <button class="kra-emp" data-id="${emp.id}" data-name="${emp.name}">
        Upload KRA
    </button>
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


            document.querySelectorAll(".kra-emp").forEach(btn => {
                btn.onclick = () => {
                    selectedKraEmpId = btn.dataset.id;
                    kraEmpName.textContent = `Employee: ${btn.dataset.name}`;
                    kraFileInput.value = "";
                    kraUploadMsg.textContent = "";
                    kraModal.style.display = "flex";
                };
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

function renderTasksPage(tasks) {
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

let employeesMap = {};

function loadFilesPage() {
    fetch("/files")
        .then(res => res.json())
        .then(files => {
            allFiles = files;
            renderFiles("all");
        });
}

function renderFiles(filter) {
    const tbody = document.getElementById("filesPageBody");
    tbody.innerHTML = "";

    let filteredFiles = allFiles;

    if (filter === "kra") {
        filteredFiles = allFiles.filter(f => f.file_type === "KRA");
    }

    if (!filteredFiles.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3">No files found</td>
            </tr>
        `;
        return;
    }

    filteredFiles.forEach(file => {
        let sharedText = "All Employees";

        if (file.shared_with !== "all") {
            sharedText =
                employeesMap[file.shared_with] ||
                `Employee ID ${file.shared_with}`;
        }

        const tr = document.createElement("tr");
        const sharedOn = file.uploaded_at
            ? new Date(file.uploaded_at.replace(" ", "T"))
                .toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                })
            : "—";

        tr.innerHTML = `
    <td>${file.filename}</td>
    <td>${sharedText}</td>
    <td>${sharedOn}</td>
    <td>
        <a href="/uploads/${file.filename}" class="download-btn">⬇</a>
    </td>
`;
        tbody.appendChild(tr);
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

function calculateWorkingHours(checkIn, checkOut) {
    if (!checkIn || !checkOut) return "-";

    const [inH, inM] = checkIn.split(":").map(Number);
    const [outH, outM] = checkOut.split(":").map(Number);

    let start = inH * 60 + inM;
    let end = outH * 60 + outM;

    // safety: handle overnight edge case
    if (end < start) end += 24 * 60;

    const diff = end - start;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;

    return `${hours}h ${mins}m`;
}

function toMinutes(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;

    const [inH, inM] = checkIn.split(":").map(Number);
    const [outH, outM] = checkOut.split(":").map(Number);

    let start = inH * 60 + inM;
    let end = outH * 60 + outM;

    if (end < start) end += 1440;
    return end - start;
}

function getWeekKey(dateStr) {
    const d = new Date(dateStr);
    const firstDay = new Date(d.setDate(d.getDate() - d.getDay()));
    return firstDay.toISOString().split("T")[0]; // week start
}

function calculateOvertime(checkIn, checkOut) {
    const worked = toMinutes(checkIn, checkOut);
    const normal = 8 * 60;

    if (worked <= normal) return "-";

    const extra = worked - normal;
    return `${Math.floor(extra / 60)}h ${extra % 60}m`;
}

function loadAttendance() {
    fetch("/admin/attendance")
        .then(res => res.json())
        .then(rows => {
            const tbody = document.getElementById("attendanceBody");
            tbody.innerHTML = "";

            if (!rows.length) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="11" style="text-align:center;">
                            No attendance records
                        </td>
                    </tr>`;
                return;
            }

            // ---- Weekly totals ----
            const weeklyTotals = {};

            rows.forEach(r => {
                const key = `${r.employee}_${getWeekKey(r.date)}`;
                weeklyTotals[key] =
                    (weeklyTotals[key] || 0) +
                    toMinutes(r.check_in_time, r.check_out_time);
            });

            // ---- Render rows ----
            rows.forEach((r, index) => {
                const tr = document.createElement("tr");
                const srNo = index + 1;

                const totalHours = calculateWorkingHours(
                    r.check_in_time,
                    r.check_out_time
                );

                const weekKey = `${r.employee}_${getWeekKey(r.date)}`;
                const weeklyMinutes = weeklyTotals[weekKey] || 0;

                const weeklyHours =
                    Math.floor(weeklyMinutes / 60) +
                    "h " +
                    (weeklyMinutes % 60) +
                    "m";

                const overtime = calculateOvertime(
                    r.check_in_time,
                    r.check_out_time
                );

                tr.innerHTML = `
                    <td>${srNo}</td>
                    <td>${r.employee}</td>
                    <td>${r.date}</td>
                    <td>${r.check_in_time || "-"}</td>
                    <td>${r.check_out_time || "-"}</td>
                    <td>${totalHours}</td>
                    <td>${weeklyHours}</td>
                    <td>${overtime}</td>
                    <td>${r.day_type || "-"}</td>
                    <td>${r.late_comment || "-"}</td>
                    <td>
    ${r.regularised === 1
                        ? `<span class="status-pill approved">Yes</span>
           <button class="audit-btn"
               data-emp="${r.user_id}"
               data-date="${r.date}">
               View
           </button>`
                        : 'No'
                    }
</td>
                `;

                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            console.error("Attendance load failed", err);
        });
}


function downloadAttendanceCSV(rows) {
    let csv =
        "Sr,Employee,Date,Check In,Check Out,Total Hours,Weekly Total,Overtime,Day Type,Late Reason\n";

    // ---- Recalculate weekly totals (same logic as table) ----
    const weeklyTotals = {};

    rows.forEach((r, index) => {
        const tr = document.createElement("tr");

        const srNo = index + 1;

        tr.innerHTML = `
        <td>${srNo}</td>
        <td>${r.name}</td>
        <td>${r.date}</td>
        <td>${r.check_in_time || "-"}</td>
        <td>${r.check_out_time || "-"}</td>
        <td>${totalHours}</td>
        <td>${weeklyHours}</td>
        <td>${overtime}</td>
        <td>${r.day_type || "-"}</td>
        <td>${r.late_comment || "-"}</td>
    `;
    });

    // ---- Build CSV rows ----
    rows.forEach((r, index) => {
        const srNo = index + 1;

        const total = calculateWorkingHours(
            r.check_in_time,
            r.check_out_time
        );

        const overtime = calculateOvertime(
            r.check_in_time,
            r.check_out_time
        );

        const weeklyMinutes =
            weeklyTotals[`${r.name}_${getWeekKey(r.date)}`] || 0;

        const weekly =
            Math.floor(weeklyMinutes / 60) +
            "h " +
            (weeklyMinutes % 60) +
            "m";

        csv += `${srNo},${r.name},${r.date},${r.check_in_time || ""},${r.check_out_time || ""},${total},${weekly},${overtime},${r.day_type || ""},${r.late_comment || ""}\n`;
    });

    // ---- Trigger download ----
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance_report.csv";
    a.click();

    URL.revokeObjectURL(url);
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

document.getElementById("logoutBtn").addEventListener("click", () => {
    fetch("/logout", { method: "POST" })
        .then(() => {
            window.location.href = "/";
        });
});


document.querySelectorAll(".file-filter").forEach(btn => {
    btn.onclick = () => {
        document
            .querySelectorAll(".file-filter")
            .forEach(b => b.classList.remove("active"));

        btn.classList.add("active");

        const filter = btn.dataset.filter;
        renderFiles(filter);
    };
});

document.addEventListener("click", e => {
    if (!e.target.classList.contains("audit-btn")) return;

    const empId = e.target.dataset.emp;
    const date = e.target.dataset.date;

    fetch(`/admin/attendance/audit?employee_id=${empId}&date=${date}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === "not_found") {
                alert("Audit record not found");
                return;
            }

            const box = document.getElementById("auditContent");

            box.innerHTML = `
                <b>Before</b><br>
                Status: ${data.before.status}<br>
                In: ${data.before.check_in || "—"}<br>
                Out: ${data.before.check_out || "—"}<br><br>

                <b>After</b><br>
                Status: ${data.after.status}<br>
                In: ${data.after.check_in || "—"}<br>
                Out: ${data.after.check_out || "—"}<br><br>

                <hr>
                <small>
                    Approved by ${data.approved_by}<br>
                    On ${new Date(data.approved_at).toLocaleString("en-IN")}
                </small>
            `;

            document.getElementById("auditModal").style.display = "flex";
        });
});

document.getElementById("closeAuditModal").onclick = () => {
    document.getElementById("auditModal").style.display = "none";
};

function loadAdminActivity() {
    fetch("/admin/activity")
        .then(res => res.json())
        .then(logs => {
            const ul = document.getElementById("adminActivityList");
            ul.innerHTML = "";

            if (!logs.length) {
                ul.innerHTML = "<li>No recent activity</li>";
                return;
            }

            logs.forEach(log => {
                const li = document.createElement("li");
                li.textContent = `${log.user_name}: ${log.action}`;
                ul.appendChild(li);
            });
        });
}


const downloadAttendanceBtn = document.getElementById("downloadAttendanceBtn");
document.getElementById("downloadAttendanceBtn").onclick = () => {
    window.location.href = "/admin/attendance/download";
};

// ====================== INIT ======================
showPage("dashboard");
setActiveTab("navDashboard");
attachDashboardCardHandlers();
loadAdminTasks();
loadDashboardStats();
loadAdminActivity();
loadFileShareEmployees();