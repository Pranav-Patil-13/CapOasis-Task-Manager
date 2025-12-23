// ====================== SPA NAVIGATION ======================
let isInitialLoad = true;
let allApprovalsCache = [];
const pages = {
    dashboard: document.getElementById("empPageDashboard"),
    tasks: document.getElementById("empPageTasks"),
    announcements: document.getElementById("empPageAnnouncements"),
    files: document.getElementById("empPageFiles"),
    profile: document.getElementById("empPageProfile"),
    attendance: document.getElementById("empPageAttendance"),
    leaveApproval: document.getElementById("empPageLeaveApproval"),
    allApprovals: document.getElementById("empPageAllApprovals"),
    reimbursement: document.getElementById("empPageReimbursement"),
    remuneration: document.getElementById("empPageRemuneration")
};

function initLeaveData() {
    return loadApprovedLeaves();
}

function showPage(name) {
    Object.values(pages).forEach(p => p.style.display = "none");
    pages[name].style.display = "";
}

function setActive(id) {
    document.querySelectorAll(".admin-nav a")
        .forEach(a => a.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

// ================= APPROVALS DROPDOWN =================
const approvalsToggle = document.getElementById("empNavApprovals");
const approvalsMenu = document.getElementById("empApprovalsMenu");

if (approvalsToggle) {
    approvalsToggle.onclick = (e) => {
        e.preventDefault();
        approvalsToggle.parentElement.classList.toggle("open");

        approvalsMenu.style.display =
            approvalsMenu.style.display === "flex" ? "none" : "flex";
    };
}

// ================= LEAVE MODAL =================
const leaveModal = document.getElementById("leaveModal");
const openLeaveBtn = document.getElementById("openLeaveModal");
const closeLeaveBtn = document.getElementById("closeLeaveModal");


if (openLeaveBtn) {
    openLeaveBtn.onclick = () => {
        leaveModal.style.display = "flex";
        loadApprovalAdmins();
    };
}

if (closeLeaveBtn) {
    closeLeaveBtn.onclick = () => {
        leaveModal.style.display = "none";
    };
}

const regModal = document.getElementById("regulariseModal");
const regDateLabel = document.getElementById("regDateLabel");
const closeRegBtn = document.getElementById("closeRegModal");

function openRegularisationModal(dateStr) {
    regDateLabel.textContent =
        `Date: ${new Date(dateStr).toDateString()}`;

    regModal.style.display = "flex";
    regModal.dataset.date = dateStr;

    loadApprovalAdminsForRegularisation();
}

closeRegBtn.onclick = () => {
    regModal.style.display = "none";
};



const bell = document.getElementById("notifBell");
const drawer = document.getElementById("notificationDrawer");
const backdrop = document.getElementById("notifBackdrop");
const closeBtn = document.getElementById("closeNotifDrawer");
const notifBadge = document.getElementById("notifBadge");

// ================= DATE PARSER (DB SAFE) =================
function parseDBDate(dt) {
    if (!dt || typeof dt !== "string") return null;

    // Case 1: ISO format (2024-12-21T10:42:18...)
    if (dt.includes("T")) {
        const d = new Date(dt);
        return isNaN(d) ? null : d;
    }

    // Case 2: SQL format (YYYY-MM-DD HH:MM:SS)
    if (dt.includes(" ")) {
        const [date, time] = dt.split(" ");
        const [y, m, d] = date.split("-").map(Number);
        const [hh = 0, mm = 0, ss = 0] = time.split(":").map(Number);
        return new Date(y, m - 1, d, hh, mm, ss);
    }

    return null;
}

// ================= RENDER NOTIFICATIONS =================
function renderNotifications(typeFilter = "all") {
    fetch("/employee/notifications")
        .then(res => res.json())
        .then(list => {
            list.sort((a, b) => {
                return parseDBDate(b.created_at) - parseDBDate(a.created_at);
            });

            const body = document.querySelector(".notif-body");
            if (!body) return;

            body.innerHTML = "";

            if (!list.length) {
                body.innerHTML = `
                    <p style="text-align:center; color:#6b7280;">
                        No notifications yet
                    </p>
                `;
                return;
            }

            if (typeFilter !== "all") {
                list = list.filter(n => n.type === typeFilter);
            }

            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();

            let lastGroup = null;

            list.forEach(n => {
                const created = parseDBDate(n.created_at);
                let groupLabel = "Older";

                if (created.toDateString() === today) {
                    groupLabel = "Today";
                } else if (created.toDateString() === yesterday) {
                    groupLabel = "Yesterday";
                }

                // Add date heading if changed
                if (groupLabel !== lastGroup) {
                    const dateDiv = document.createElement("div");
                    dateDiv.className = "notif-date";
                    dateDiv.textContent = groupLabel;
                    body.appendChild(dateDiv);
                    lastGroup = groupLabel;
                }

                const card = document.createElement("div");
                card.className = `notif-card ${n.is_read === 0 ? "unread" : ""}`;

                card.innerHTML = `
                    <div class="notif-icon ${n.type}">
                        ${iconForType(n.type)}
                    </div>

                    <div class="notif-content">
                        <div class="notif-title">${n.title}</div>
                        <div class="notif-message">
                            ${n.message || ""}
                        </div>
                        <div class="notif-meta">
                            <span>${timeAgo(n.created_at)}</span>
                            <span class="notif-tag">${capitalize(n.type)}</span>
                        </div>
                    </div>
                `;


                body.appendChild(card);
            });
        })
        .catch(() => {
            console.error("Failed to load notifications");
        });
}

const notifTypeSelect = document.getElementById("drawerNotifType");

if (notifTypeSelect) {
    notifTypeSelect.onchange = () => {
        renderNotifications(notifTypeSelect.value);
    };
}


const markAllBtn = document.getElementById("drawerMarkRead");

if (markAllBtn) {
    markAllBtn.onclick = () => {

        // 1️⃣ Mark all as read in backend
        fetch("/employee/notifications/read", {
            method: "POST"
        }).catch(() => { });

        document
            .querySelectorAll(".notif-card.unread")
            .forEach(card => {
                card.classList.remove("unread");
            });

        notifBadge.style.display = "none";
    };
}


const clearBtn = document.getElementById("drawerClear");

if (clearBtn) {
    clearBtn.onclick = () => {
        clearNotificationsAnimated();
    };
}

// ================= MARK ALL READ (ANIMATED CLEAR) =================
function clearNotificationsAnimated() {
    const cards = document.querySelectorAll(".notif-card");

    if (!cards.length) {
        closeDrawer();
        return;
    }

    const STAGGER = 90;
    const EXIT_DURATION = 350;

    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add("exit");
        }, index * STAGGER);
    });

    const totalExitTime = cards.length * STAGGER + EXIT_DURATION;

    setTimeout(() => {
        fetch("/employee/notifications/clear", {
            method: "POST"
        }).catch(() => { });

        closeDrawer();
    }, totalExitTime);

    setTimeout(() => {
        const body = document.querySelector(".notif-body");
        if (body) body.innerHTML = "";
    }, totalExitTime + 300);
}


function iconForType(type) {
    switch (type) {
        case "task": return "📝";
        case "approval": return "✅";
        case "attendance": return "🕘";
        case "file": return "📂";
        case "announcement": return "📢";
        default: return "🔔";
    }
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

// ================= NOTIFICATION UNREAD CHECK =================
fetch("/employee/notifications")
    .then(res => res.json())
    .then(list => {
        const unread = list.some(n => n.is_read === 0);
        if (unread) {
            notifBadge.style.display = "block";
        }
    })
    .catch(() => { });

// ================= NOTIFICATION DRAWER =================
bell.onclick = () => {
    // 1️⃣ Open drawer
    drawer.classList.add("open");
    backdrop.style.display = "block";

    // 2️⃣ Render notifications
    renderNotifications(
        document.getElementById("drawerNotifType").value
    );

    // 3️⃣ Hide badge immediately
    notifBadge.style.display = "none";
};

closeBtn.onclick = closeDrawer;
backdrop.onclick = closeDrawer;

function closeDrawer() {
    drawer.classList.remove("open");
    backdrop.style.display = "none";
}


// ================= SUBMIT LEAVE (BACKEND CONNECTED) =================
document.getElementById("submitLeave").onclick = () => {
    const type = document.getElementById("leaveType").value;
    const from = document.getElementById("leaveFrom").value;
    const to = document.getElementById("leaveTo").value;
    const reason = document.getElementById("leaveReason").value.trim();
    const adminId = document.getElementById("leaveAdmin").value;

    if (!adminId) {
        alert("Please select an approver");
        return;
    }

    if (!type || !from || !to || !reason) {
        alert("All fields are required");
        return;
    }

    if (new Date(from) > new Date(to)) {
        alert("From date cannot be after To date");
        return;
    }

    // 🔹 build payload exactly how backend expects
    const payload = {
        leave_type: type,
        from_date: from,
        to_date: to,
        reason: reason
    };

    // 🔹 call backend
    fetch("/employee/approvals", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            type: "leave",
            payload: payload,
            assigned_to: adminId
        })
    })
        .then(res => res.json())
        .then(data => {
            if (data.status !== "success") {
                alert(data.message || "Failed to submit leave");
                return;
            }

            // 🔹 add row AFTER backend success
            const tbody = document.getElementById("leaveTableBody");
            const tr = document.createElement("tr");

            tr.innerHTML = `
            <td>${new Date(from).toLocaleDateString("en-IN")}</td>
            <td>${type}</td>
            <td>${reason}</td>
            <td><span class="status pending">Pending</span></td>
            <td><button class="view-btn">View</button></td>
        `;

            tbody.prepend(tr);

            // 🔹 reset form
            document.getElementById("leaveType").value = "";
            document.getElementById("leaveFrom").value = "";
            document.getElementById("leaveTo").value = "";
            document.getElementById("leaveReason").value = "";

            // 🔹 close modal
            leaveModal.style.display = "none";
        })
        .catch(() => {
            alert("Server error. Try again.");
        });
};


function loadApprovalAdminsForRegularisation() {
    fetch("/employee/admins")
        .then(res => res.json())
        .then(admins => {
            const select = document.getElementById("regAdmin");
            select.innerHTML = `<option value="">Select Approver</option>`;

            admins.forEach(a => {
                const opt = document.createElement("option");
                opt.value = a.id;
                opt.textContent = `${a.name} (${a.email})`;
                select.appendChild(opt);
            });
        });
}

// ================= LOAD LEAVE APPROVALS =================
function loadLeaveApprovals() {
    fetch("/employee/approvals?type=leave")
        .then(res => res.json())
        .then(rows => {
            const tbody = document.getElementById("leaveTableBody");
            if (!tbody) return;
            tbody.innerHTML = "";

            if (!rows.length) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align:center;">
                            No leave requests found
                        </td>
                    </tr>`;
                return;
            }

            rows.forEach(r => {
                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>${new Date(r.payload.from_date).toLocaleDateString("en-IN")}</td>
                    <td>${r.payload.leave_type}</td>
                    <td>${r.payload.reason}</td>
                    <td>
                        ${(() => {
                            const status = (r.status || "").toLowerCase();

                            let cls = "pending";
                            let text = r.status;

                            if (status === "approved") {
                                cls = "approved";
                                text = "Approved";
                            }
                            else if (status === "rejected") {
                                cls = "rejected";
                                text = "Rejected";
                            }
                            else if (status === "overridden") {
                                cls = "approved";      // treated as approved visually
                                text = "Approved";
                            }

                            return `<span class="status ${cls}">${text}</span>`;
                        })()}
                    </td>
                    <td>
                        <button class="view-btn" data-id="${r.id}">View</button>
                    </td>
                `;

                tbody.appendChild(tr);
            });
        })
        .catch(() => { });
}


// ================= LOAD ADMINS FOR APPROVAL =================
function loadApprovalAdmins() {
    fetch("/employee/admins")
        .then(res => res.json())
        .then(admins => {
            const select = document.getElementById("leaveAdmin");
            select.innerHTML = `<option value="">Select Approver</option>`;

            admins.forEach(admin => {
                const opt = document.createElement("option");
                opt.value = admin.id;
                opt.textContent = `${admin.name} (${admin.email})`;
                select.appendChild(opt);
            });
        })
        .catch(() => {
            console.error("Failed to load admins");
        });
}


function renderLeaveTimeline(rows) {
    const box = document.getElementById("leaveTimeline");
    box.innerHTML = "";

    if (!rows.length) {
        box.innerHTML = "<p>No approval history yet.</p>";
        return;
    }

    rows.forEach(r => {
        let statusText = "Pending";
        let extraInfo = "";

        if (r.status === "Approved") {
            statusText = "Approved";
            extraInfo = `Approved on ${new Date(r.created_at).toLocaleString("en-IN")}`;
        }

        if (r.status === "Rejected") {
            metaText = `
                Rejected by ${r.approver_name || "Admin"} · ${timeAgo(r.approved_at)}<br>
                Rejection Reason: ${r.rejection_reason || "—"}
            `;
        }

        const card = document.createElement("div");
        card.className = "timeline-card";

        card.innerHTML = `
            <div class="timeline-header">
                <strong>${r.type.toUpperCase()} REQUEST</strong>
                <span class="timeline-status ${r.status.toLowerCase()}">
                    ${statusText}
                </span>
            </div>

            <div class="timeline-body">
                <p><b>From:</b> ${r.payload.from_date}</p>
                <p><b>To:</b> ${r.payload.to_date}</p>
                <p><b>Reason:</b> ${r.payload.reason}</p>
                <p class="timeline-meta">${extraInfo}</p>
            </div>
        `;

        box.appendChild(card);
    });
}


function submitRemuneration() {
    fetch("/employee/remuneration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type: document.getElementById("remType").value,
            amount: document.getElementById("remAmount").value,
            month: document.getElementById("remMonth").value,
            reason: document.getElementById("remReason").value
        })
    })
        .then(res => res.json())
        .then(d => {
            if (d.status === "success") {
                showToast("Remuneration request submitted");
                loadRemunerationHistory();
            }
        });
}


function loadAllApprovals() {
    fetch("/employee/approvals")
        .then(res => res.json())
        .then(rows => {
            allApprovalsCache = rows;
            renderAllApprovals();
        });
}


function renderAllApprovals() {
    const type = document.getElementById("approvalTypeFilter").value;
    const status = document.getElementById("approvalStatusFilter").value;
    const sort = document.getElementById("approvalSort").value;

    let rows = [...allApprovalsCache];

    if (type !== "all") {
        rows = rows.filter(r => r.type === type);
    }

    if (status !== "all") {
        rows = rows.filter(r => r.status === status);
    }

    rows.sort((a, b) => {
        const da = parseDBDate(a.created_at);
        const db = parseDBDate(b.created_at);
        return sort === "latest" ? db - da : da - db;
    });

    const box = document.getElementById("allApprovalsTimeline");
    box.innerHTML = "";

    if (!rows.length) {
        box.innerHTML = "<p>No approvals found.</p>";
        return;
    }

    rows.forEach(r => {
        const card = document.createElement("div");
        card.className = "timeline-card";

        let metaText = `Submitted ${timeAgo(r.created_at)}`;

        if (r.status === "Approved") {
            metaText = `Approved by ${r.approver_name || "Admin"} · ${timeAgo(r.approved_at)}`;
        }

        if (r.status === "Rejected") {
            metaText = `
                Rejected by ${r.approver_name || "Admin"} · ${timeAgo(r.approved_at)}<br>
                Rejection Reason: ${r.rejection_reason || "—"}
            `;
        }

        card.innerHTML = `
                    <div class="timeline-header">
                        <strong>${r.type.toUpperCase()}</strong>
                        ${(() => {
                            const status = (r.status || "").toLowerCase();
                            let cls = status;
                            let text = r.status;

                            if (status === "overridden") {
                                cls = "approved";
                                text = "Approved";
                            }

                            return `
                                <span class="timeline-status ${cls}">
                                    ${text}
                                </span>
                            `;
                        })()}
                    </div>

                    <div class="timeline-body">
                        <p><b>Request Reason:</b> ${r.payload.reason || "-"}</p>
                        <p class="timeline-meta">${metaText}</p>
                    </div>
                `;

        box.appendChild(card);
    });
}

["approvalTypeFilter", "approvalStatusFilter", "approvalSort"]
    .forEach(id => {
        document.getElementById(id).onchange = renderAllApprovals;
    });


document.querySelectorAll("#empApprovalsMenu a").forEach(link => {
    link.onclick = (e) => {
        e.preventDefault();

        // clear highlights
        document
            .querySelectorAll(".admin-nav a")
            .forEach(a => a.classList.remove("active"));

        link.classList.add("active");

        const type = link.dataset.approval;

        // ✅ ONLY All Approvals should show timeline
        if (type === "all") {
            showPage("allApprovals");
            loadAllApprovals();

            // ✅ CLEAR APPROVAL NOTIFICATION
            fetch("/employee/mark-seen", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ section: "approvals" })
            });

            // hide dot immediately
            document
                .querySelector("#empNavApprovals .nav-dot")
                ?.style.setProperty("display", "none");

            return;
        }

        if (type === "remuneration") {
            showPage("remuneration");
            setActive("empNavApprovals");
            loadApprovalAdminsForRemuneration();
            loadRemunerations();
            return;
        }

        if (type === "reimbursement") {
            showPage("reimbursement");
            setActive("empNavApprovals");
            loadApprovalAdminsForReimbursement();
            loadReimbursements();
            return;
        }

        // ✅ Everything else goes to Leave page (for now)
        showPage("leaveApproval");
        loadLeaveApprovals();
    };
});



document.getElementById("empNavDashboard").onclick = () => {
    showPage("dashboard");
    loadDashboardStats();
    setActive("empNavDashboard");
};

document.getElementById("empNavTasks").onclick = () => {
    const badge = document.getElementById("taskBadge");
    if (badge) badge.style.display = "none";

    fetch("/employee/mark-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "tasks" })
    });

    showPage("tasks");
    loadTasks();
    setActive("empNavTasks");
};

document.getElementById("empNavProfile").onclick = () => {
    showPage("profile");
    loadProfile();
    setActive("empNavProfile");
};


document.getElementById("empNavAnnouncements").onclick = () => {
    const dot = document.getElementById("annDot");
    if (dot) dot.style.display = "none";

    fetch("/employee/mark-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "announcements" })
    });

    showPage("announcements");
    loadAnnouncements();
    setActive("empNavAnnouncements");
};

document.getElementById("empNavFiles").onclick = () => {
    const dot = document.getElementById("fileDot");
    if (dot) dot.style.display = "none";

    fetch("/employee/mark-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "files" })
    });

    showPage("files");
    loadFiles();
    setActive("empNavFiles");
};


document.getElementById("empNavAttendance").onclick = () => {
    showPage("attendance");
    loadAttendance();              // table + counters
    loadAttendanceForCalendar();
    setActive("empNavAttendance");
};

document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("view-btn")) return;

    const approvalId = e.target.dataset.id;
    if (!approvalId) return;

    fetch(`/employee/approval/${approvalId}`)
        .then(res => res.json())
        .then(data => {

            // Fill modal fields
            document.getElementById("viewApprovalTitle").textContent = "Leave Approval";
            document.getElementById("viewRequestedBy").textContent = data.employee;
            const submitted = parseDBDate(data.submitted_on);
            document.getElementById("viewSubmittedOn").textContent =
                submitted
                    ? submitted.toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true
                    })
                    : "—";
            document.getElementById("viewLeaveType").textContent = data.leave_type;
            document.getElementById("viewLeaveFrom").textContent = data.from_date;
            document.getElementById("viewLeaveTo").textContent = data.to_date;
            document.getElementById("viewLeaveReason").textContent = data.reason;
            document.getElementById("viewStatusText").textContent = data.status;

            const pill = document.getElementById("viewApprovalStatus");
            pill.textContent = data.status.toUpperCase();
            pill.className = `status-pill ${data.status.toLowerCase()}`;

            const footer = document.getElementById("viewApprovalFooter");

            if (data.status === "Pending") {
                footer.textContent = "⏳ This request is under review";
            }

            else if (data.status === "Approved") {
                footer.textContent = "✅ This request has been approved";
            }

            else if (data.status === "Rejected") {
                footer.textContent = "❌ This request was rejected";
            }

            // Show modal
            document.getElementById("viewApprovalModal").style.display = "flex";
        })
        .catch(() => {
            alert("Failed to load leave details");
        });
});

document.getElementById("closeViewApproval").onclick = () => {
    document.getElementById("viewApprovalModal").style.display = "none";
};


document.getElementById("submitRegularise").onclick = () => {
    document.getElementById("submitRegularise").onclick = () => {
        const reason = document.getElementById("regReason").value.trim();
        const adminId = document.getElementById("regAdmin").value;
        const date = regModal.dataset.date;

        if (!reason || !adminId) {
            alert("All fields are required");
            return;
        }

        // 🔒 get existing attendance snapshot (if any)
        const existing = attendanceByDate[date] || {};

        const payload = {
            date: date,

            current: {
                status: existing.status || "Absent",
                check_in: existing.check_in || null,
                check_out: existing.check_out || null
            },

            requested: {
                status: "Present",
                check_in: existing.check_in || null,
                check_out: existing.check_out || null
            },

            reason: reason
        };

        fetch("/employee/approvals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "regularisation",
                assigned_to: adminId,
                payload: payload
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.status !== "success") {
                    alert(data.message || "Failed");
                    return;
                }

                showToast("Regularisation submitted");
                regModal.style.display = "none";
                document.getElementById("regReason").value = "";
            });
    };
};


document.getElementById("submitReimb").onclick = () => {

    const billInput = document.getElementById("reimbBill");

    if (!billInput) {
        alert("Upload input not found. Refresh page.");
        return;
    }

    const file = billInput.files.length ? billInput.files[0] : null;

    const cat = document.getElementById("reimbCategory").value;
    const amt = document.getElementById("reimbAmount").value;
    const desc = document.getElementById("reimbDesc").value.trim();
    const adminId = document.getElementById("reimbAdmin").value;

    if (!cat || !amt || !desc || !adminId) {
        alert("All fields are required");
        return;
    }

    if (!file) {
        alert("Please upload a bill");
        return;
    }

    const form = new FormData();
    form.append("type", "reimbursement");
    form.append("category", cat);
    form.append("amount", amt);
    form.append("description", desc);
    form.append("bill", file);
    form.append("assigned_to", adminId);

    fetch("/employee/reimbursement", {
        method: "POST",
        body: form
    })
        .then(res => res.json())
        .then(data => {
            if (data.status !== "success") {
                alert(data.message || "Failed to submit");
                return;
            }

            showToast("Reimbursement submitted");
            loadReimbursements();

            // reset form
            billInput.value = "";
            document.getElementById("reimbAmount").value = "";
            document.getElementById("reimbDesc").value = "";
            document.getElementById("reimbCategory").value = "";
        })
        .catch(() => {
            alert("Server error");
        });
};

const reimbBillInput = document.getElementById("reimbBill");

if (reimbBillInput) {
    reimbBillInput.addEventListener("change", () => {
        const box = document.querySelector(".upload-box");

        if (!box || !reimbBillInput.files.length) return;

        const file = reimbBillInput.files[0];

        box.innerHTML = `
            <div class="upload-icon">📄</div>
            <div class="upload-text">
                <strong>${file.name}</strong>
                <span>${(file.size / 1024).toFixed(1)} KB</span>
            </div>
        `;
    });
}

document.getElementById("submitRemuneration").onclick = () => {
    fetch("/employee/remuneration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type: document.getElementById("remType").value,
            amount: document.getElementById("remAmount").value,
            month: document.getElementById("remMonth").value,
            reason: document.getElementById("remReason").value
        })
    })
    .then(res => res.json())
    .then(d => {
        if (d.status === "success") {
            showToast("Remuneration submitted");
            loadRemunerations();
        }
    });
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
            if (data.status === "error" && data.message) {
                attMsg.textContent = `🟣 ${data.message}`;
                attMsg.className = "attendance-msg warning";

                attBtn.style.display = "none";
                checkOutBtn.style.display = "none";

                attendanceStatus.textContent = "On Approved Leave";
                attendanceStatus.style.color = "#7c3aed";
                return;
            }


            if (data.status === "Present") {
                attBtn.style.display = "none";
                checkOutBtn.style.display = "inline-block";

                attendanceStatus.innerHTML = `
                ✅ Checked in successfully<br>
                📍 ${data.distance}m from office
            `
                loadAttendanceForCalendar(); // 🔄 update calendar instantly

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

function loadApprovalAdminsForReimbursement() {
    fetch("/employee/admins")
        .then(res => res.json())
        .then(admins => {
            const select = document.getElementById("reimbAdmin");
            select.innerHTML = `<option value="">Select Approver</option>`;
            admins.forEach(a => {
                const opt = document.createElement("option");
                opt.value = a.id;
                opt.textContent = `${a.name} (${a.email})`;
                select.appendChild(opt);
            });
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
                loadAttendanceForCalendar();
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


function loadAttendance() {
    fetch("/employee/attendance")
        .then(res => res.json())
        .then(data => {
            // Summary
            document.getElementById("attPresent").textContent = data.present;
            document.getElementById("attAbsent").textContent = data.absent;
            document.getElementById("attLate").textContent = data.late;
            document.getElementById("attTotal").textContent = data.total;

            // Table
            const tbody = document.querySelector("#attendanceTable tbody");
            tbody.innerHTML = "";

            data.records.forEach(r => {
                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>${r.date}</td>

                    <td>
                        <span class="att-status ${r.status === "Present" ? "att-present" :
                        r.status === "Absent" ? "att-absent" :
                            "att-late"
                    }">
                            ${r.status}
                        </span>
                    </td>

                    <td class="att-time">${r.check_in || "—"}</td>
                    <td class="att-time">${r.check_out || "—"}</td>
                `;

                tbody.appendChild(tr);
            });
        });
}

function timeAgo(timestamp) {
    const past = parseDBDate(timestamp);
    if (!past) return "";

    const now = new Date();
    const diff = Math.floor((now - past) / 1000);

    if (diff < 0) return ""; // future / invalid

    if (diff < 5) return "just now";
    if (diff < 60) return `${diff}s ago`;
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

function checkNotifications() {
    fetch("/employee/has-new")
        .then(res => res.json())
        .then(data => {

            if (data.announcements) {
                document.getElementById("annDot")?.style.setProperty("display", "inline-block");
            }

            if (data.files) {
                document.getElementById("fileDot")?.style.setProperty("display", "inline-block");
            }

            if (data.tasks) {
                document.getElementById("taskBadge")?.style.setProperty("display", "inline-block");
            }

            if (data.approvals) {
                // parent approvals dot
                document
                    .querySelector("#empNavApprovals .nav-dot")
                    ?.style.setProperty("display", "inline-block");

                // all approvals submenu dot
                document
                    .getElementById("allApprovalsDot")
                    ?.style.setProperty("display", "inline-block");
            }

            if (data.notifications) {
                document.getElementById("notifBadge").style.display = "block";
            }

        });
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

            // 🔒 HARD ORDER GUARANTEE (newest first, stable)
            tasks.sort((a, b) => {
                const da = a.created_at
                    ? parseDBDate(a.created_at)
                    : new Date(0);

                const db = b.created_at
                    ? parseDBDate(b.created_at)
                    : new Date(0);

                // newest first
                if (db - da !== 0) return db - da;

                // fallback: higher ID first
                return b.id - a.id;
            });

            const tbody = document.querySelector("#tasksTable tbody");
            tbody.innerHTML = "";

            tasks.forEach(task => {
                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>${task.title}</td>
                    <td>${task.description}</td>
                    <td>
                        ${task.due_date || "—"}
                        <div style="font-size:12px;color:#6b7280;margin-top:4px;">
                            Assigned ${task.created_at ? timeAgo(task.created_at) : "earlier"}
                        </div>
                    </td>
                    <td>
                        <select class="task-status ${getStatusClass(task.status)}"
                                data-id="${task.id}">
                            <option ${task.status === "Pending" ? "selected" : ""}>
                                Pending
                            </option>
                            <option ${task.status === "In Progress" ? "selected" : ""}>
                                In Progress
                            </option>
                            <option ${task.status === "Completed" ? "selected" : ""}>
                                Completed
                            </option>
                        </select>
                    </td>
                `;

                tbody.appendChild(tr);
            });

            // ===== Status change handler =====
            document.querySelectorAll(".task-status").forEach(sel => {
                sel.onchange = () => {
                    const newStatus = sel.value;
                    const row = sel.closest("tr");

                    fetch("/employee/update-task-status", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            task_id: sel.dataset.id,
                            status: newStatus
                        })
                    }).then(() => {
                        sel.className = "task-status " + getStatusClass(newStatus);

                        // subtle feedback animation
                        row.classList.add("task-updated");
                        setTimeout(() => row.classList.remove("task-updated"), 900);

                        loadDashboardStats();
                        showToast("Task status updated");
                    });
                };
            });
        })
        .catch(err => {
            console.error("Failed to load tasks:", err);
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
            let myRank = null;

            list.forEach((emp, index) => {
                const li = document.createElement("li");

                if (index === 0) li.classList.add("rank-1");
                if (index === 1) li.classList.add("rank-2");
                if (index === 2) li.classList.add("rank-3");
                if (emp.name === document.getElementById("dashName").textContent) {
                    myRank = index + 1;
                }

                if (myRank && myRank > 3) {
                    const li = document.createElement("li");
                    li.className = "empty";
                    li.textContent = `Your rank: #${myRank}`;
                    ul.appendChild(li);
                }
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
                li.innerHTML = `
                    <div class="announcement-card">
                        <div class="announcement-header">
                            <span class="announcement-icon">📢</span>
                            <span class="announcement-title">${a.title}</span>
                        </div>

                        <div class="announcement-message">
                            ${a.message}
                        </div>

                        <div class="announcement-meta">
                            ${a.created_at ? timeAgo(a.created_at) : ""}
                        </div>
                    </div>
                `;
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
                ul.innerHTML = "<li class='empty'>No files shared yet</li>";
                return;
            }

            list.forEach(f => {
                const li = document.createElement("li");

                const uploadedAgo = f.uploaded_at
                    ? timeAgo(f.uploaded_at)
                    : "";

                li.innerHTML = `
                    <div class="file-card">
                        <div class="file-left">
                            <div class="file-icon">📄</div>
                            <div class="file-info">
                                <div class="file-name">${f.filename}</div>
                                <div class="file-meta">
                                    <span class="file-type ${f.file_type?.toLowerCase() || "general"}">
                                        ${f.file_type || "GENERAL"}
                                    </span>

                                    <span class="file-shared">
                                        ${f.shared_with === "all" ? "Shared with everyone" : "Shared with you"}
                                    </span>

                                    <span class="file-time">${uploadedAgo}</span>
                                </div>
                            </div>
                        </div>

                        <a class="file-download"
                           href="/uploads/${f.filename}"
                           target="_blank">
                            ⬇ Download
                        </a>
                    </div>
                `;

                ul.appendChild(li);
            });
        })
        .catch(() => {
            hideLoader();
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
        let indicator = "⏰ Due today";
        if (t.due_date < today) indicator = "🔥 Overdue";

        li.textContent = `${indicator} — ${t.title}`;
        ul.appendChild(li);
    });
}

function loadProfile() {
    showLoader();

    fetch("/employee/profile")
        .then(res => res.json())
        .then(user => {
            const initials = user.name
                .trim()
                .split(/\s+/)
                .map(n => n[0])
                .join("")
                .toUpperCase();

            // Profile page
            document.getElementById("empName").textContent = user.name;
            document.getElementById("empEmail").textContent = user.email;
            document.getElementById("empRole").textContent = user.role;
            document.getElementById("empId").textContent = user.id;
            document.getElementById("empInitials").textContent = initials;

            // Dashboard identity
            document.getElementById("dashName").textContent = user.name;
            document.getElementById("dashEmail").textContent = user.email;
            document.getElementById("dashAvatar").textContent = initials;

            // Dashboard greeting
            const firstName = user.name.split(" ")[0];
            document.getElementById("dashboardGreeting").textContent =
                `Hello, ${firstName} 👋`;
        })
        .finally(() => {
            hideLoader();
            loadKRAFiles();    // optional secondary loader
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




/* ================= ATTENDANCE CALENDAR LOGIC ================= */
let attendanceMap = {}; // date => present / absent
let attendanceRecords = [];
let attendanceByDate = {}; // date -> record
let currentDate = new Date();
let leaveMap = {}; // date => true

function getTodayKey() {
    const d = new Date();
    return (
        d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0")
    );
}

function isTodayOnLeave() {
    return !!leaveMap[getTodayKey()];
}
function loadAttendanceForCalendar() {
    fetch("/employee/attendance")
        .then(res => res.json())
        .then(data => {

            attendanceMap = {}; // reset
            attendanceRecords = data.records;

            data.records.forEach(r => {
                if (!r.date || r.status !== "Present") return;

                if (r.day_type === "HALF") {
                    attendanceMap[r.date] = "late";
                } else {
                    attendanceMap[r.date] = "present";
                }
            });

            attendanceByDate = {};

            data.records.forEach(r => {
                attendanceByDate[r.date] = r;

                if (r.status === "Present") {
                    attendanceMap[r.date] =
                        r.day_type === "HALF" ? "late" : "present";
                }
            });

            Promise.all([
                loadApprovedLeaves()
            ]).then(() => {
                renderCalendar(currentDate);
            });
        })
        .catch(err => {
            console.error("Calendar attendance load failed", err);
        });
}


const calTitle = document.getElementById("calTitle");
const calGrid = document.getElementById("calendarGrid");
const calPrev = document.getElementById("calPrev");
const calNext = document.getElementById("calNext");

function renderCalendar(date) {
    calGrid.innerHTML = "";

    const year = date.getFullYear();
    const month = date.getMonth();

    calTitle.textContent = date.toLocaleString("en-IN", {
        month: "long",
        year: "numeric"
    });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDay = (firstDay.getDay() + 6) % 7; // Monday start
    const totalDays = lastDay.getDate();



    // Empty cells before
    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement("div");
        empty.className = "calendar-day muted";
        calGrid.appendChild(empty);
    }


    // Actual days
    for (let d = 1; d <= totalDays; d++) {

        const fullDate =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

        const cellDate = new Date(year, month, d);

        const cell = document.createElement("div");
        cell.className = "calendar-day";
        cell.dataset.date = fullDate;
        cell.textContent = d;

        // 👉 click handler
        cell.onclick = () => handleCalendarDateClick(fullDate, cellDate);

        // hover handlers
        cell.onmouseenter = (e) => {
            showHoverCard(fullDate, e.currentTarget);
        };

        cell.onmousemove = (e) => {
            hoverCard.style.left = e.clientX + 12 + "px";
            hoverCard.style.top = e.clientY - 14 + "px";
        };

        cell.onmouseleave = hideHoverCard;

        const status = attendanceMap[fullDate];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const isSunday = cellDate.getDay() === 0;
        const isPast = cellDate < today;

        if (leaveMap[fullDate]) {
            cell.classList.add("leave");
        }
        else if (status === "present") {
            cell.classList.add("present");
        }
        else if (status === "late") {
            cell.classList.add("late");
        }
        else if (isSunday) {
            cell.classList.add("sunday");
        }
        else if (isPast) {
            cell.classList.add("absent");
        }

        // Today highlight
        if (
            d === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        ) {
            cell.classList.add("today");
        }

        calGrid.appendChild(cell);
    }
}

calPrev.onclick = () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
};

calNext.onclick = () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
};

function handleCalendarDateClick(dateStr, dateObj) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // block future
    if (dateObj > today) {
        showToast("Future dates cannot be regularised");
        return;
    }

    const diffDays = Math.floor(
        (today - dateObj) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 7) {
        showToast("Regularisation allowed only for last 7 days");
        return;
    }
    // open modal
    openRegularisationModal(dateStr);
}

loadAttendanceForCalendar();

function calculateTotalHours(checkIn, checkOut) {
    if (!checkIn || !checkOut) return null;

    const [inH, inM] = checkIn.split(":").map(Number);
    const [outH, outM] = checkOut.split(":").map(Number);

    const start = inH * 60 + inM;
    const end = outH * 60 + outM;

    if (end <= start) return null;

    const diff = end - start;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;

    return `${hrs}h ${mins}m`;
}


function loadApprovedLeaves() {
    return fetch("/employee/approvals?type=leave")
        .then(res => res.json())
        .then(rows => {
            leaveMap = {};

            rows.forEach(r => {
                if (r.status !== "Approved") return;

                const from = new Date(r.payload.from_date);
                const to = new Date(r.payload.to_date);

                for (
                    let d = new Date(from);
                    d <= to;
                    d.setDate(d.getDate() + 1)
                ) {
                    const key =
                        d.getFullYear() + "-" +
                        String(d.getMonth() + 1).padStart(2, "0") + "-" +
                        String(d.getDate()).padStart(2, "0");

                    leaveMap[key] = true;
                }
            });
        });
}

function loadReimbursements() {
    fetch("/employee/approvals?type=reimbursement")
        .then(res => res.json())
        .then(rows => {
            const tbody = document.getElementById("reimbTableBody");
            tbody.innerHTML = "";

            if (!rows.length) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align:center;">
                            No reimbursements found
                        </td>
                    </tr>`;
                return;
            }

            rows.forEach(r => {
                const p = r.payload;

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                    <td>${p.category}</td>
                    <td>₹${p.amount}</td>
                    <td>
                        <span class="status ${r.status.toLowerCase()}">
                            ${r.status}
                        </span>
                    </td>
                    <td>
                        <a class="download-btn"
                           href="/uploads/${p.bill_file}"
                           target="_blank">
                           View
                        </a>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
}


function loadApprovalAdminsForRemuneration() {
    fetch("/employee/admins")
        .then(res => res.json())
        .then(admins => {
            const select = document.getElementById("remAdmin");
            select.innerHTML = `<option value="">Select Approver</option>`;

            admins.forEach(a => {
                const opt = document.createElement("option");
                opt.value = a.id;
                opt.textContent = `${a.name} (${a.email})`;
                select.appendChild(opt);
            });
        });
}

function loadRemunerations() {
    fetch("/employee/remuneration")
        .then(res => res.json())
        .then(rows => {
            const tbody = document.getElementById("remTableBody");
            tbody.innerHTML = "";

            if (!rows.length) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align:center;">
                            No remuneration records
                        </td>
                    </tr>
                `;
                return;
            }

            rows.forEach(r => {
                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>${r.month}</td>
                    <td>${capitalize(r.type)}</td>
                    <td>₹${r.amount}</td>
                    <td>
                        <span class="status ${r.status.toLowerCase()}">
                            ${r.status}
                        </span>
                    </td>
                    <td>${r.rejection_reason || "-"}</td>
                `;

                tbody.appendChild(tr);
            });
        });
}

const remBtn = document.getElementById("submitRemuneration");

if (remBtn) {
    remBtn.onclick = submitRemuneration;
}

const hoverCard = document.getElementById("dayHoverCard");
function showHoverCard(date, cell) {
    const record = attendanceByDate[date];
    const rect = cell.getBoundingClientRect();
    const GAP = 14;

    // ---------- POSITION ----------
    hoverCard.classList.add("show");

    const cardWidth = hoverCard.offsetWidth;
    const cardHeight = hoverCard.offsetHeight;

    hoverCard.style.left =
        rect.left + rect.width / 2 - cardWidth / 2 + "px";

    hoverCard.style.top =
        rect.top - cardHeight - GAP + "px";

    // 1️⃣ Leave FIRST
    if (leaveMap[date]) {
        hoverCard.innerHTML = `
        <div class="date">${new Date(date).toDateString()}</div>
        <div class="row">
            <span>Status</span>
            <span class="status leave">On Leave</span>
        </div>
    `;
        return;
    }

    // 2️⃣ Then Absent
    if (!record) {
        hoverCard.innerHTML = `
        <div class="date">${new Date(date).toDateString()}</div>
        <div class="row">
            <span>Status</span>
            <span class="status absent">Absent</span>
        </div>
        <div class="row muted">
            <span>—</span>
            <span>—</span>
        </div>
    `;
        return;
    }

    // ---------- DERIVE UI STATUS (FIX) ----------
    let uiStatus = "absent";

    if (record.status === "Present") {
        uiStatus = record.day_type === "HALF" ? "late" : "present";
    }

    // ---------- CONTENT ----------
    const totalHours = calculateTotalHours(
        record.check_in,
        record.check_out
    );

    hoverCard.innerHTML = `
    <div class="date">
        ${new Date(date).toDateString()}
    </div>

    <div class="row">
        <span>Status</span>
        <span class="status ${uiStatus}">
            ${uiStatus.charAt(0).toUpperCase() + uiStatus.slice(1)}
        </span>
    </div>

    <div class="row muted">
        <span>${record.check_in || "—"}</span>
        <span>${record.check_out || "—"}</span>
    </div>

    ${totalHours
            ? `<div class="row">
                    <span>Total</span>
                    <span><b>${totalHours}</b></span>
               </div>`
            : ""
        }

    ${record.late_comment
            ? `<div class="row muted">📝 ${record.late_comment}</div>`
            : ""
        }
`;
}

function hideHoverCard() {
    hoverCard.classList.remove("show");
}



document.addEventListener("DOMContentLoaded", () => {
    showPage("dashboard");
    loadDashboardStats();
    loadTodayAttendance();
    loadProfile();
    checkNotifications();
    initLeaveData();

    setTimeout(() => {
        isInitialLoad = false;
    }, 0);

    const profileCard = document.getElementById("profileCard");

    if (profileCard) {
        profileCard.addEventListener("click", () => {
            showPage("profile");
            loadProfile();
            setActive("empNavProfile");
        });
    }
});