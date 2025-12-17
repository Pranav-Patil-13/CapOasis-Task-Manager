document.getElementById("loginBtn").addEventListener("click", () => {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = document.getElementById("role").value;
    const msg = document.getElementById("msg");
    const rememberMe = document.getElementById("rememberMe").checked;

    const remembered = localStorage.getItem("capoasis_logged_in");
    const rememberedRole = localStorage.getItem("capoasis_role");

    if (remembered && rememberedRole) {
        if (rememberedRole === "admin") {
            window.location.href = "/admin";
        } else {
            window.location.href = "/employee";
        }
    }

    if (!email || !password) {
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

            if (rememberMe) {
                localStorage.setItem("capoasis_logged_in", "true");
                localStorage.setItem("capoasis_role", data.role);
            } else {
                localStorage.removeItem("capoasis_logged_in");
                localStorage.removeItem("capoasis_role");
            }

            if (data.status === "success") {
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