const API_BASE_URL = "http://localhost:3000/api";

const signinRequired = document.getElementById("signin-required");
const bookingsContent = document.getElementById("bookings-content");

const currentBookingsContainer = document.getElementById("current-bookings");
const previousBookingsContainer = document.getElementById("previous-bookings");

const currentCount = document.getElementById("current-count");
const previousCount = document.getElementById("previous-count");

function escapeHtml(value) {
  const temp = document.createElement("div");
  temp.textContent = value ?? "";
  return temp.innerHTML;
}

function getLoggedInUserId() {
  return Number(localStorage.getItem("users_id"));
}

function isUserLoggedIn() {
  return Boolean(getLoggedInUserId());
}

function resolveImageUrl(imageUrl) {
  if (!imageUrl) {
    return "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=80";
  }

  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }

  return `http://localhost:3000${imageUrl}`;
}

function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

function formatDate(dateValue) {
  if (!dateValue) return "N/A";

  return new Date(dateValue).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function calculateNights(checkInDate, checkOutDate) {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  const difference = checkOut - checkIn;
  const nights = difference / (1000 * 60 * 60 * 24);

  return nights > 0 ? nights : 0;
}

function renderAuthNav() {
  const authNav = document.getElementById("auth-nav");

  if (!authNav) return;

  const usersId = localStorage.getItem("users_id");
  const fullName = localStorage.getItem("full_name");

  if (usersId && fullName) {
    authNav.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-sm font-semibold text-slate-600">
          Hi, ${escapeHtml(fullName)}
        </span>

        <button
          id="sign-out-btn"
          class="rounded-2xl bg-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
          type="button"
        >
          Sign Out
        </button>
      </div>
    `;

    document.getElementById("sign-out-btn").addEventListener("click", () => {
      localStorage.removeItem("users_id");
      localStorage.removeItem("full_name");
      localStorage.removeItem("email");

      window.location.href = "./index.html";
    });

    return;
  }

  authNav.innerHTML = `
    <a
      href="./auth.html?redirect=./bookings.html"
      class="rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"
    >
      Sign In
    </a>
  `;
}

async function fetchUserBookings() {
  const usersId = getLoggedInUserId();

  const response = await fetch(`${API_BASE_URL}/bookings/user/${usersId}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Failed to load bookings.");
  }

  return data;
}

async function loadBookings() {
  renderAuthNav();

  if (!isUserLoggedIn()) {
    signinRequired.classList.remove("hidden");
    bookingsContent.classList.add("hidden");
    return;
  }

  signinRequired.classList.add("hidden");
  bookingsContent.classList.remove("hidden");

  try {
    const bookings = await fetchUserBookings();

    const currentBookings = bookings.filter((booking) => booking.booking_group === "current");
    const previousBookings = bookings.filter((booking) => booking.booking_group === "previous");

    renderBookingList(currentBookingsContainer, currentBookings, "current");
    renderBookingList(previousBookingsContainer, previousBookings, "previous");

    currentCount.textContent = `${currentBookings.length} booking${currentBookings.length === 1 ? "" : "s"}`;
    previousCount.textContent = `${previousBookings.length} booking${previousBookings.length === 1 ? "" : "s"}`;
  } catch (error) {
    console.error(error);

    currentBookingsContainer.innerHTML = `
      <div class="rounded-3xl bg-red-50 p-6 text-center text-red-600">
        Failed to load bookings.
      </div>
    `;

    previousBookingsContainer.innerHTML = "";
  }
}

function renderBookingList(container, bookings, type) {
  if (!bookings.length) {
    container.innerHTML = `
      <div class="rounded-3xl bg-white p-8 text-center shadow-sm lg:col-span-2">
        <h3 class="text-xl font-bold text-slate-900">
          No ${type} bookings
        </h3>

        <p class="mt-2 text-slate-500">
          ${type === "current"
            ? "When you book a stay, it will appear here."
            : "Completed stays will appear here after checkout."}
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = bookings
    .map((booking) => renderBookingCard(booking, type))
    .join("");

  if (type === "previous") {
    document.querySelectorAll("[data-review-button]").forEach((button) => {
      button.addEventListener("click", () => {
        const bookingId = Number(button.dataset.bookingId);
        const booking = bookings.find((item) => Number(item.booking_id) === bookingId);

        openReviewModal(booking);
      });
    });
  }
}

function renderBookingCard(booking, type) {
  const imageUrl = resolveImageUrl(booking.image_url);
  const hotelName = escapeHtml(booking.hotel_name);
  const address = escapeHtml(booking.hotel_address);
  const roomType = escapeHtml(booking.room_type || "Room");
  const nights = calculateNights(booking.check_in_date, booking.check_out_date);
  const guests = booking.guest_count || 1;

  const canReview = type === "previous" && Number(booking.has_review) !== 1;

  return `
    <article class="overflow-hidden rounded-[2rem] bg-white shadow-sm">
      <div class="grid grid-cols-1 md:grid-cols-5">
        <img
          src="${imageUrl}"
          alt="${hotelName}"
          class="h-56 w-full object-cover md:col-span-2 md:h-full"
        />

        <div class="p-6 md:col-span-3">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-600">
              ${booking.star_rating ?? "N/A"}★
            </span>

            <span class="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-slate-600">
              ${escapeHtml(booking.booking_status || "Booked")}
            </span>
          </div>

          <h3 class="text-2xl font-bold text-slate-900">
            ${hotelName}
          </h3>

          <p class="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
            ${address}
          </p>

          <div class="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-2xl bg-zinc-100 p-4">
              <p class="text-slate-500">Check-in</p>
              <p class="mt-1 font-bold text-slate-900">${formatDate(booking.check_in_date)}</p>
            </div>

            <div class="rounded-2xl bg-zinc-100 p-4">
              <p class="text-slate-500">Check-out</p>
              <p class="mt-1 font-bold text-slate-900">${formatDate(booking.check_out_date)}</p>
            </div>

            <div class="rounded-2xl bg-zinc-100 p-4">
              <p class="text-slate-500">Room</p>
              <p class="mt-1 font-bold text-slate-900">
                ${booking.room_number} • ${roomType}
              </p>
            </div>

            <div class="rounded-2xl bg-zinc-100 p-4">
              <p class="text-slate-500">Guests</p>
              <p class="mt-1 font-bold text-slate-900">
                ${guests} ${guests === 1 ? "person" : "people"}
              </p>
            </div>
          </div>

          <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-slate-500">${nights} night${nights === 1 ? "" : "s"} total</p>
              <p class="text-2xl font-extrabold text-slate-900">
                ${formatCurrency(booking.total_price)}
              </p>
            </div>

            ${
              type === "current"
                ? `
                  <a
                    href="./hotel-details.html?id=${booking.hotel_id}"
                    class="rounded-2xl bg-sky-500 px-5 py-3 text-center font-semibold text-white transition hover:bg-sky-600"
                  >
                    View Hotel
                  </a>
                `
                : canReview
                  ? `
                    <button
                      type="button"
                      data-review-button
                      data-booking-id="${booking.booking_id}"
                      class="rounded-2xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-600"
                    >
                      Leave Review
                    </button>
                  `
                  : `
                    <span class="rounded-2xl bg-green-50 px-5 py-3 text-center font-semibold text-green-700">
                      Reviewed
                    </span>
                  `
            }
          </div>
        </div>
      </div>
    </article>
  `;
}

function openReviewModal(booking) {
  const existingModal = document.getElementById("review-modal");

  if (existingModal) {
    existingModal.remove();
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        id="review-modal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      >
        <div class="w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-2xl">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold uppercase tracking-wide text-sky-600">
                Leave a Review
              </p>

              <h2 class="mt-1 text-2xl font-bold text-slate-900">
                ${escapeHtml(booking.hotel_name)}
              </h2>

              <p class="mt-1 text-sm text-slate-500">
                Tell other travelers about your stay.
              </p>
            </div>

            <button
              id="close-review-modal"
              type="button"
              class="rounded-full bg-slate-100 px-4 py-2 text-xl font-bold text-slate-600 transition hover:bg-slate-200"
            >
              ×
            </button>
          </div>

          <div
            id="review-error"
            class="mt-5 hidden rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600"
          ></div>

          <form id="review-form" class="mt-6 space-y-5">
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">
                Rating
              </label>

              <select
                id="review-rating"
                class="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                required
              >
                <option value="5">5 stars — Excellent</option>
                <option value="4">4 stars — Good</option>
                <option value="3">3 stars — Okay</option>
                <option value="2">2 stars — Poor</option>
                <option value="1">1 star — Bad</option>
              </select>
            </div>

            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">
                Comment
              </label>

              <textarea
                id="review-comment"
                rows="5"
                class="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                placeholder="What did you like? What could have been better?"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              class="w-full rounded-2xl bg-sky-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-sky-600"
            >
              Submit Review
            </button>
          </form>
        </div>
      </div>
    `
  );

  document.getElementById("close-review-modal").addEventListener("click", closeReviewModal);

  document.getElementById("review-modal").addEventListener("click", (event) => {
    if (event.target.id === "review-modal") {
      closeReviewModal();
    }
  });

  document.getElementById("review-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const rating = Number(document.getElementById("review-rating").value);
    const comment = document.getElementById("review-comment").value.trim();

    try {
      await submitReview({
        users_id: getLoggedInUserId(),
        hotel_id: booking.hotel_id,
        rating,
        comment
      });

      closeReviewModal();
      alert("Review submitted successfully!");
      loadBookings();
    } catch (error) {
      showReviewError(error.message);
    }
  });
}

function closeReviewModal() {
  document.getElementById("review-modal")?.remove();
}

function showReviewError(message) {
  const errorBox = document.getElementById("review-error");

  if (!errorBox) return;

  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

async function submitReview(reviewData) {
  const response = await fetch(`${API_BASE_URL}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(reviewData)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || result.error || "Failed to submit review.");
  }

  return result;
}

loadBookings();