function showLoader() {
    const loader = document.getElementById("globalLoader");
    if (loader) loader.style.display = "flex";
}

function hideLoader() {
    const loader = document.getElementById("globalLoader");
    if (loader) loader.style.display = "none";
}