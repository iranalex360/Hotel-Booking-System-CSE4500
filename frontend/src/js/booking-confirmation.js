if (typeof API_BASE_URL === "undefined") {
  var API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";
}

function getBookingIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || params.get("booking_id");
}

function escapeHtml(value) {
  const temp = document.createElement("div");
  temp.textContent = value ?? "";
  return temp.innerHTML;
}

function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function calculateNights(checkInStr, checkOutStr) {
  const inDate = new Date(checkInStr);
  const outDate = new Date(checkOutStr);
  const diffTime = outDate.getTime() - inDate.getTime();
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 1;
}

function resolveImageUrl(imageUrl) {
  if (!imageUrl) {
    return "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=80";
  }

  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }

  const origin = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : window.location.origin;

  return `${origin}${imageUrl}`;
}

async function loadBookingConfirmation() {
  const container = document.getElementById("confirmation-container");
  const bookingId = getBookingIdFromUrl();

  if (!bookingId) {
    container.innerHTML = `
      <div class="text-center">
        <h2 class="text-2xl font-bold text-slate-900">No Booking ID Provided</h2>
        <p class="mt-2 text-slate-500">Please check your reservations page to view active bookings.</p>
        <a href="./bookings.html" class="mt-6 inline-block rounded-2xl bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-600">
          View My Bookings
        </a>
      </div>
    `;
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`);

    if (!response.ok) {
      throw new Error("Failed to retrieve booking confirmation details.");
    }

    const booking = await response.json();
    const nights = calculateNights(booking.check_in_date, booking.check_out_date);

    container.innerHTML = `
      <div class="text-center">
        <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
          <svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-700">
          Reservation Confirmed
        </span>

        <h1 class="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          You're all set!
        </h1>
        
        <p class="mt-2 text-base text-slate-500">
          Confirmation Number: <strong class="font-bold text-slate-800">CHKIN-${booking.booking_id}892</strong>
        </p>
      </div>

      <!-- Hotel Summary Card -->
      <div class="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-zinc-50 p-6 sm:p-8">
        <div class="flex flex-col gap-6 md:flex-row md:items-center">
          <img
            src="${resolveImageUrl(booking.hotel_image)}"
            alt="${escapeHtml(booking.hotel_name)}"
            class="h-44 w-full rounded-2xl object-cover md:w-56"
          />
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-600">
                ${escapeHtml(booking.star_rating || "4")} Star Hotel
              </span>
            </div>
            
            <h2 class="mt-2 text-2xl font-bold text-slate-900">${escapeHtml(booking.hotel_name)}</h2>
            <p class="mt-1 flex items-center text-sm text-slate-500">
              <svg class="mr-1 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              ${escapeHtml(booking.hotel_address || "No address listed")}
            </p>

            <div class="mt-4 flex flex-wrap gap-4 border-t border-slate-200 pt-4 text-sm font-semibold text-slate-700">
              <div class="flex items-center gap-1.5">
                <svg class="h-4 w-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h-2m2 0h2m-2-4h2m-2 0H9m-2 4h2m-2 0H9m2-4h2m-2 0H9" />
                </svg>
                <span class="text-slate-500">Room Type:</span> ${escapeHtml(booking.room_type_name || "Standard Room")}
              </div>

              <div class="flex items-center gap-1.5">
                <svg class="h-4 w-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span class="text-slate-500">Guests:</span> ${booking.guest_count || 1} Guests
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reservation Details Table -->
      <div class="mt-8 space-y-4">
        <h3 class="text-lg font-bold text-slate-900">Stay Breakdown</h3>
        
        <div class="grid grid-cols-1 gap-4 rounded-3xl border border-slate-200 bg-white p-6 sm:grid-cols-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Check-in</p>
            <p class="mt-1 text-lg font-extrabold text-slate-900">${formatDate(booking.check_in_date)}</p>
            <p class="text-xs text-slate-500">After 3:00 PM</p>
          </div>

          <div class="border-t border-slate-100 pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Check-out</p>
            <p class="mt-1 text-lg font-extrabold text-slate-900">${formatDate(booking.check_out_date)}</p>
            <p class="text-xs text-slate-500">Before 11:00 AM</p>
          </div>

          <div class="border-t border-slate-100 pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Duration</p>
            <p class="mt-1 text-lg font-extrabold text-sky-600">${nights} ${nights === 1 ? 'Night' : 'Nights'}</p>
            <p class="text-xs text-slate-500">Guaranteed Reservation</p>
          </div>
        </div>
      </div>

      <!-- Price Breakdown -->
      <div class="mt-8 rounded-3xl bg-slate-900 p-6 text-white sm:p-8">
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <span class="text-sm font-semibold text-slate-400">Payment Status</span>
          <span class="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
            Confirmed & Paid
          </span>
        </div>

        <div class="mt-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-400">Total Charged</p>
            <p class="text-3xl font-extrabold text-white">${formatCurrency(booking.total_price)}</p>
          </div>
          <button
            onclick="window.print()"
            class="flex items-center rounded-2xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
          >
            <svg class="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Receipt
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
        <a
          href="./bookings.html"
          class="flex items-center justify-center rounded-2xl bg-sky-500 px-8 py-3.5 text-center font-bold text-white shadow-lg transition hover:bg-sky-600"
        >
          <svg class="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          View My Bookings
        </a>
        <a
          href="./search.html"
          class="flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-8 py-3.5 text-center font-bold text-slate-700 transition hover:bg-slate-100"
        >
          <svg class="mr-2 h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search More Hotels
        </a>
      </div>
    `;
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <div class="text-center">
        <h2 class="text-2xl font-bold text-red-600">Could Not Load Booking Details</h2>
        <p class="mt-2 text-slate-500">${escapeHtml(error.message)}</p>
        <a href="./bookings.html" class="mt-6 inline-block rounded-2xl bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-600">
          Go to My Bookings
        </a>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", loadBookingConfirmation);
