const API_BASE_URL = "http://localhost:3000/api";

const showLoginButton = document.getElementById("show-login");
const showRegisterButton = document.getElementById("show-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authMessage = document.getElementById("auth-message");

function showMessage(message, type = "error") {
  authMessage.textContent = message;
  authMessage.classList.remove("hidden");

  if (type === "success") {
    authMessage.className =
      "mb-5 rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-700";
  } else {
    authMessage.className =
      "mb-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700";
  }
}

function showLogin() {
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");

  showLoginButton.className =
    "w-1/2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-sky-600 shadow-sm";

  showRegisterButton.className =
    "w-1/2 rounded-xl px-4 py-3 text-sm font-bold text-slate-500";

  authMessage.classList.add("hidden");
}

function showRegister() {
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");

  showRegisterButton.className =
    "w-1/2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-sky-600 shadow-sm";

  showLoginButton.className =
    "w-1/2 rounded-xl px-4 py-3 text-sm font-bold text-slate-500";

  authMessage.classList.add("hidden");
}

function saveUserToLocalStorage(user) {
  localStorage.setItem("users_id", user.users_id);
  localStorage.setItem("full_name", user.full_name);
  localStorage.setItem("email", user.email);
}

function getRedirectUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect") || "./index.html";
}

showLoginButton.addEventListener("click", showLogin);
showRegisterButton.addEventListener("click", showRegister);

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to sign in.");
    }

    saveUserToLocalStorage(result.user);
    showMessage("Signed in successfully. Redirecting...", "success");

    setTimeout(() => {
      window.location.href = getRedirectUrl();
    }, 800);
  } catch (error) {
    showMessage(error.message);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const full_name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const phone = document.getElementById("register-phone").value.trim();
  const password = document.getElementById("register-password").value;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        full_name,
        email,
        phone,
        password
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to create account.");
    }

    saveUserToLocalStorage(result.user);
    showMessage("Account created successfully. Redirecting...", "success");

    setTimeout(() => {
      window.location.href = getRedirectUrl();
    }, 800);
  } catch (error) {
    showMessage(error.message);
  }
});