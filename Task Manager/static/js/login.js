document.getElementById("loginBtn").addEventListener("click", () => {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = document.getElementById("role").value;

    const msg = document.getElementById("msg");

    if (!email || !password) {
        msg.textContent = "All fields are required.";
        return;
    }

    fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email,
            password,
            role
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "success") {
            msg.style.color = "green";
            msg.textContent = "Login successful! Redirecting...";

            // redirect inside .then() block only
            if (data.role === "admin") {
                window.location.href = "/admin";
            } else {
                window.location.href = "/employee";  // redirect employee to fixed URL
            }
        } else {
            msg.textContent = data.message;
        }
    })
    .catch(err => {
        msg.textContent = "Server error.";
    });
});