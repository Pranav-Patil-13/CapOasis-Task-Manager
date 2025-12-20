document.addEventListener("DOMContentLoaded", () => {
    fetch("/me")
        .then(res => res.json())
        .then(data => {
            if (!data.authenticated) {
                localStorage.removeItem("capoasis_logged_in");
                localStorage.removeItem("capoasis_role");
                return;
            }

            if (data.role === "admin") {
                window.location.href = "/admin";
            } else if (data.role === "employee") {
                window.location.href = "/employee";
            }
        })
        .catch(() => {
            // fail-safe: do nothing
        });
});

document.getElementById("loginBtn").addEventListener("click", () => {

    const emailUser = document.getElementById("emailUser").value.trim();
    const email = emailUser ? `${emailUser}@capoasis.com` : "";
    const password = document.getElementById("password").value.trim();
    const role = document.getElementById("role").value;
    const msg = document.getElementById("msg");
    const rememberMe = document.getElementById("rememberMe").checked;

    if (!emailUser || !password) {
        msg.textContent = "All fields are required.";
        return;
    }

    showLoader();

    fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, rememberMe })
    })
        .then(res => res.json())
        .then(data => {
            hideLoader();

            if (data.status === "success") {

                if (rememberMe) {
                    localStorage.setItem("capoasis_logged_in", "true");
                    localStorage.setItem("capoasis_role", data.role);
                } else {
                    localStorage.removeItem("capoasis_logged_in");
                    localStorage.removeItem("capoasis_role");
                }

                msg.style.color = "green";
                msg.textContent = "Login successful! Redirecting...";

                document.querySelector(".auth-card").classList.add("success");

                setTimeout(() => {
                    if (data.role === "admin") {
                        window.location.href = "/admin";
                    } else {
                        window.location.href = "/employee";
                    }
                }, 450);

            } else {
                msg.style.color = "red";
                msg.textContent = data.message;
            }
        })
        .catch(() => {
            hideLoader();
            msg.style.color = "red";
            msg.textContent = "Server error.";
        });
});


const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

if (togglePassword) {
    togglePassword.addEventListener("click", () => {
        const type = passwordInput.type === "password" ? "text" : "password";
        passwordInput.type = type;
        togglePassword.textContent = type === "password" ? "👁️" : "🙈";
    });
}


const roleButtons = document.querySelectorAll(".role-btn");
const roleInput = document.getElementById("role");

roleButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        roleButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        roleInput.value = btn.dataset.role;
    });
});