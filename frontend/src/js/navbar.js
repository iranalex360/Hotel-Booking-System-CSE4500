/**
 * Mobile Navigation & Dynamic Header Manager for CheckIn.com
 */

function escapeHtmlNav(value) {
  const temp = document.createElement("div");
  temp.textContent = value ?? "";
  return temp.innerHTML;
}

function initNavbar() {
  const mobileToggleBtn = document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileMenuIcon = document.getElementById("mobile-menu-icon");

  if (mobileToggleBtn && mobileMenu) {
    mobileToggleBtn.addEventListener("click", () => {
      const isHidden = mobileMenu.classList.contains("hidden");

      if (isHidden) {
        mobileMenu.classList.remove("hidden");
        if (mobileMenuIcon) {
          mobileMenuIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          `;
        }
      } else {
        mobileMenu.classList.add("hidden");
        if (mobileMenuIcon) {
          mobileMenuIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          `;
        }
      }
    });

    // Close menu when clicking outside
    document.addEventListener("click", (event) => {
      if (
        !mobileMenu.classList.contains("hidden") &&
        !mobileMenu.contains(event.target) &&
        !mobileToggleBtn.contains(event.target)
      ) {
        mobileMenu.classList.add("hidden");
        if (mobileMenuIcon) {
          mobileMenuIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          `;
        }
      }
    });
  }

  renderNavAuth();
}

function renderNavAuth() {
  const desktopAuthNav = document.getElementById("auth-nav");
  const mobileAuthNav = document.getElementById("mobile-auth-nav");

  const usersId = localStorage.getItem("users_id");
  const fullName = localStorage.getItem("full_name");
  const role = localStorage.getItem("role");

  if (usersId && fullName) {
    const desktopHtml = `
      <div class="flex items-center gap-3">
        <span class="text-sm font-semibold text-slate-600">
          Hi, ${escapeHtmlNav(fullName)}
        </span>
        ${
          role === "admin"
            ? `<a href="/admin/hotels" class="rounded-xl bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-700 transition hover:bg-purple-200">
                Admin Manager
               </a>`
            : ""
        }
        <button
          type="button"
          data-signout-btn
          class="rounded-2xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-300"
        >
          Sign Out
        </button>
      </div>
    `;

    const mobileHtml = `
      <div class="mt-4 border-t border-slate-200 pt-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Signed in as</p>
            <p class="text-base font-bold text-slate-900">${escapeHtmlNav(fullName)}</p>
          </div>
          ${
            role === "admin"
              ? `<a href="/admin/hotels" class="rounded-xl bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-700">
                  Admin Manager
                 </a>`
              : ""
          }
        </div>
        <button
          type="button"
          data-signout-btn
          class="mt-3 w-full rounded-2xl bg-red-50 py-3 text-center text-sm font-bold text-red-600 transition hover:bg-red-100"
        >
          Sign Out
        </button>
      </div>
    `;

    if (desktopAuthNav) desktopAuthNav.innerHTML = desktopHtml;
    if (mobileAuthNav) mobileAuthNav.innerHTML = mobileHtml;

    document.querySelectorAll("[data-signout-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("users_id");
        localStorage.removeItem("full_name");
        localStorage.removeItem("email");
        localStorage.removeItem("role");
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
        window.location.reload();
      });
    });

    return;
  }

  const desktopSignIn = `
    <a
      href="./auth.html"
      class="rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"
    >
      Sign In
    </a>
  `;

  const mobileSignIn = `
    <div class="mt-4 border-t border-slate-200 pt-4">
      <a
        href="./auth.html"
        class="block w-full rounded-2xl bg-sky-500 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"
      >
        Sign In / Create Account
      </a>
    </div>
  `;

  if (desktopAuthNav) desktopAuthNav.innerHTML = desktopSignIn;
  if (mobileAuthNav) mobileAuthNav.innerHTML = mobileSignIn;
}

document.addEventListener("DOMContentLoaded", initNavbar);
