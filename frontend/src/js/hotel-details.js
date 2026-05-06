// ---------- helpers ----------

function stripHtml(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html || "";
  return temp.textContent || temp.innerText || "";
}

function formatAddress(address) {
  if (!address) return "No address listed";

  let text = address.trim();

  text = text.replace(/([a-z])([A-Z])/g, "$1 $2");
  text = text.replace(/,\s*/g, ", ");
  text = text.replace(/([A-Za-z])(\d{5})/g, "$1 $2");

  return text;
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

function getHotelIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// ---------- description cleanup ----------

const DESCRIPTION_SECTION_LABELS = [
  "Headline",
  "Head Line",
  "Overview",
  "Property Location",
  "Location",
  "Rooms",
  "Dining",
  "Renovations",
  "Amenities",
  "Featured Amenities",
  "Business, Other Amenities",
  "Business Other Amenities",
  "Business Amenities",
  "Attractions",
  "CheckIn Instructions",
  "Check In Instructions",
  "Check-In Instructions",
  "Check-in Instructions",
  "Special Instructions",
  "Special CheckIn Instructions",
  "Special Check In Instructions",
  "Special Check-In Instructions",
  "Special Check-in Instructions",
  "Know Before You Go",
  "Fees",
  "Mandatory Fees",
  "Optional Fees"
];

const BARE_SECTION_LABELS = [
  "Property Location",
  "Rooms",
  "Dining",
  "Renovations",
  "Amenities",
  "Featured Amenities",
  "Business, Other Amenities",
  "Business Other Amenities",
  "Business Amenities",
  "Attractions"
];

function escapeHtml(value) {
  const temp = document.createElement("div");
  temp.textContent = value ?? "";
  return temp.innerHTML;
}

function normalizeDescriptionText(raw) {
  let text = stripHtml(raw).trim();

  text = text
    .replace(/&nbsp;|\u00a0/g, " ")
    .replace(/\byou ll\b/gi, "you'll")
    .replace(/\bdoesn t\b/gi, "doesn't")
    .replace(/\bwon t\b/gi, "won't")
    .replace(/\bcan t\b/gi, "can't")
    .replace(/\bit s\b/gi, "it's")
    .replace(/\bhotel s\b/gi, "hotel's")
    .replace(/\bproperty s\b/gi, "property's")
    .replace(/\bSchrock s\b/gi, "Schrock's")
    .replace(/\bd Alene\b/gi, "d'Alene");

  // Add spacing after periods when text is merged like "Park.Rooms"
  text = text.replace(/\.(?=[A-Z])/g, ". ");

  // Fix merged policy text
  text = text.replace(/policyGovernment-issued/gi, "policy. Government-issued");
  text = text.replace(/chargesSpecial requests/gi, "charges. Special requests");
  text = text.replace(/guaranteedThis property/gi, "guaranteed. This property");
  text = text.replace(/acceptedSafety features/gi, "accepted. Safety features");
  text = text.replace(/cashNoise-free/gi, "cash. Noise-free");
  text = text.replace(/detectorPlease note/gi, "detector. Please note");

  // Normalize whitespace
  text = text.replace(/[ \t]+/g, " ");

  return text.trim();
}

function labelToRegex(label) {
  return label
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
}

function addColonsToBareLabels(text) {
  const bareLabelsPattern = [...BARE_SECTION_LABELS]
    .sort((a, b) => b.length - a.length)
    .map(labelToRegex)
    .join("|");

  /*
    Converts old-style descriptions like:

    Property Location When you stay...
    Rooms Make yourself...
    Amenities Make use...
    Dining Satisfy your appetite...

    into:

    Property Location: When you stay...
    Rooms: Make yourself...
    Amenities: Make use...
    Dining: Satisfy your appetite...

    This is intentionally case-sensitive so lowercase words like
    "convenient amenities such as..." do NOT become a new section.
  */
  const bareLabelRegex = new RegExp(
    `(^|[.!?]\\s+|\\s)(${bareLabelsPattern})(?=\\s+[A-Z])`,
    "g"
  );

  return text.replace(bareLabelRegex, "$1$2:");
}

function getPrettySectionTitle(label) {
  const key = label
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const titleMap = {
    "head line": "Headline",
    headline: "Headline",
    overview: "Overview",

    "property location": "Location",
    location: "Location",

    rooms: "Rooms",
    dining: "Dining",
    renovations: "Renovations",

    // These now display together as Details
    amenities: "Details",
    "featured amenities": "Details",
    "business amenities": "Details",
    "business other amenities": "Details",

    attractions: "Attractions",

    "checkin instructions": "Check-in Instructions",
    "check in instructions": "Check-in Instructions",

    "special instructions": "Special Instructions",
    "special checkin instructions": "Special Check-in Instructions",
    "special check in instructions": "Special Check-in Instructions",

    "know before you go": "Know Before You Go",
    fees: "Fees",
    "mandatory fees": "Mandatory Fees",
    "optional fees": "Optional Fees"
  };

  return titleMap[key] || label;
}

function mergeMatchingSections(sections) {
  const merged = [];
  let detailsSection = null;

  for (const section of sections) {
    if (section.title === "Details") {
      if (!detailsSection) {
        detailsSection = {
          title: "Details",
          content: section.content
        };

        merged.push(detailsSection);
      } else {
        detailsSection.content = `${detailsSection.content} ${section.content}`.trim();
      }

      continue;
    }

    merged.push({ ...section });
  }

  return merged;
}

function parseHotelDescription(rawDescription) {
  let text = normalizeDescriptionText(rawDescription);

  if (!text) return [];

  text = addColonsToBareLabels(text);

  const labelsPattern = [...DESCRIPTION_SECTION_LABELS]
    .sort((a, b) => b.length - a.length)
    .map(labelToRegex)
    .join("|");

  const labelRegex = new RegExp(
    `(?:^|\\s)(${labelsPattern})\\s*:\\s*`,
    "gi"
  );

  const matches = [...text.matchAll(labelRegex)];

  if (!matches.length) {
    return [
      {
        title: "Overview",
        content: text
      }
    ];
  }

  const sections = [];

  const firstMatchIndex = matches[0].index ?? 0;
  const textBeforeFirstLabel = text.slice(0, firstMatchIndex).trim();

  if (textBeforeFirstLabel) {
    sections.push({
      title: "Overview",
      content: textBeforeFirstLabel
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const nextMatch = matches[i + 1];

    const rawLabel = currentMatch[1];
    const title = getPrettySectionTitle(rawLabel);

    const contentStart = currentMatch.index + currentMatch[0].length;
    const contentEnd = nextMatch ? nextMatch.index : text.length;

    let content = text.slice(contentStart, contentEnd).trim();

    content = content.replace(/^:\s*/, "");

    if (content) {
      sections.push({
        title,
        content
      });
    }
  }

  return mergeMatchingSections(sections);
}

function formatDescriptionSections(rawDescription) {
  const sections = parseHotelDescription(rawDescription);

  if (!sections.length) {
    return `
      <p class="mt-3 leading-7 text-slate-600">
        No description available.
      </p>
    `;
  }

  return `
    <div class="mt-5 space-y-5">
      ${sections
        .map(
          (section) => `
            <section class="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <h3 class="text-lg font-bold text-sky-600">
                ${escapeHtml(section.title)}:
              </h3>

              <p class="mt-2 leading-7 text-slate-700">
                ${escapeHtml(section.content)}
              </p>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}
// ---------- amenities ----------

function splitAmenities(text) {
  if (!text) return [];

  text = stripHtml(text).trim();

  text = text.replace(/\s-\s/g, ": ");
  text = text.replace(/:\s*/g, ": ");

  let items = text.split(/ (?=[A-Z])/);

  const merged = [];

  for (let i = 0; i < items.length; i++) {
    if (
      items[i] === "Free" &&
      items[i + 1] &&
      items[i + 1].startsWith("WiFi")
    ) {
      merged.push("Free WiFi");
      i++;
    } else {
      merged.push(items[i]);
    }
  }

  return merged.map((item) => item.trim()).filter((item) => item.length > 2);
}

function renderAmenities(amenitiesText) {
  const items = splitAmenities(amenitiesText);

  if (!items.length) {
    return `<p class="mt-3 text-slate-500">No amenities available.</p>`;
  }

  return `
    <ul class="mt-4 grid grid-cols-1 gap-3 text-slate-600 sm:grid-cols-2">
      ${items
        .map(
          (item) => `
            <li class="flex gap-2 leading-6">
              <span class="mt-1 text-sky-500">•</span>
              <span>${escapeHtml(item)}</span>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

// ---------- main render ----------

function renderHotelDetails(hotel) {
  const container = document.getElementById("hotel-details-container");

  container.innerHTML = `
    <div class="space-y-8">

      <div class="overflow-hidden rounded-[2rem] shadow-md">
        <img
          src="${resolveImageUrl(hotel.image_url)}"
          alt="${escapeHtml(hotel.names)}"
          class="h-[420px] w-full object-cover"
        />
      </div>

      <div class="rounded-[2rem] bg-white p-8 shadow-sm">

        <div class="mb-4 flex flex-wrap items-center gap-3">
          <span class="rounded-full bg-sky-100 px-4 py-1 text-sm font-semibold text-sky-600">
            ${hotel.star_rating ?? "N/A"}★
          </span>
        </div>

        <h1 class="text-4xl font-bold text-slate-900">
          ${escapeHtml(hotel.names)}
        </h1>

        <p class="mt-2 text-slate-500">
          ${escapeHtml(formatAddress(hotel.address))}
        </p>

        <div class="mt-8">
          <h2 class="text-xl font-semibold text-slate-900">Description</h2>
          ${formatDescriptionSections(hotel.descriptions)}
        </div>

        <div class="mt-10 rounded-[1.5rem] bg-zinc-100 p-6">
          <h2 class="text-xl font-semibold text-slate-900">Amenities</h2>
          ${renderAmenities(hotel.caption)}
        </div>

        <div class="mt-8 flex flex-col gap-4 sm:flex-row">
          <a
            href="./index.html#featured"
            class="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-700 transition hover:border-sky-400 hover:text-sky-600"
          >
            View More Hotels
          </a>

          <button
            id="start-booking-btn"
            class="rounded-2xl bg-sky-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-sky-600"
            >
            Start Booking
           </button>
        </div>

      </div>
    </div>
  `;

  setupBookingButton(hotel);
}
// ---------- booking modal ----------

let bookingRooms = [];

async function fetchHotelRooms(hotelId) {
  const response = await fetch(`http://localhost:3000/api/hotels/${hotelId}/rooms`);

  if (!response.ok) {
    throw new Error("Failed to load rooms.");
  }

  return response.json();
}

async function createBooking(bookingData) {
  const response = await fetch("http://localhost:3000/api/bookings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(bookingData)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || result.error || "Failed to create booking.");
  }

  return result;
}

function getTodayDateString() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

function getTomorrowDateString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

function calculateNights(checkInDate, checkOutDate) {
  if (!checkInDate || !checkOutDate) return 0;

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  const difference = checkOut - checkIn;
  const nights = difference / (1000 * 60 * 60 * 24);

  return nights > 0 ? nights : 0;
}

function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

function setupBookingButton(hotel) {
  const button = document.getElementById("start-booking-btn");

  if (!button) return;

  button.addEventListener("click", () => {
    openBookingModal(hotel);
  });
}

async function openBookingModal(hotel) {
  const existingModal = document.getElementById("booking-modal");

  if (existingModal) {
    existingModal.remove();
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        id="booking-modal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      >
        <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">

          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold uppercase tracking-wide text-sky-600">
                Book Your Stay
              </p>

              <h2 class="mt-1 text-2xl font-bold text-slate-900">
                ${escapeHtml(hotel.names)}
              </h2>

              <p class="mt-1 text-sm text-slate-500">
                Choose your room, dates, and number of guests.
              </p>
            </div>

            <button
              id="close-booking-modal"
              class="rounded-full bg-slate-100 px-4 py-2 text-xl font-bold text-slate-600 transition hover:bg-slate-200"
              type="button"
            >
              ×
            </button>
          </div>

          <div
            id="booking-error"
            class="mt-5 hidden rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600"
          ></div>

          <form id="booking-form" class="mt-6 space-y-5">

            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">
                Select Room
              </label>

              <select
                id="booking-room"
                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                required
              >
                <option value="">Loading rooms...</option>
              </select>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-2 block text-sm font-semibold text-slate-700">
                  Check-in Date
                </label>

                <input
                  id="booking-checkin"
                  type="date"
                  min="${getTodayDateString()}"
                  value="${getTodayDateString()}"
                  class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>

              <div>
                <label class="mb-2 block text-sm font-semibold text-slate-700">
                  Check-out Date
                </label>

                <input
                  id="booking-checkout"
                  type="date"
                  min="${getTomorrowDateString()}"
                  value="${getTomorrowDateString()}"
                  class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>
            </div>

            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">
                Number of People
              </label>

              <select
                id="booking-guests"
                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                required
              >
                <option value="1">1 person</option>
                <option value="2">2 people</option>
                <option value="3">3 people</option>
                <option value="4">4 people</option>
                <option value="5">5 people</option>
                <option value="6">6 people</option>
              </select>
            </div>

            <div class="rounded-[1.5rem] bg-slate-50 p-5">
              <h3 class="text-lg font-bold text-slate-900">
                Price Summary
              </h3>

              <div class="mt-4 space-y-3 text-sm text-slate-600">
                <div class="flex justify-between gap-4">
                  <span>Room price per night</span>
                  <span id="summary-price-per-night" class="font-semibold text-slate-900">$0.00</span>
                </div>

                <div class="flex justify-between gap-4">
                  <span>Nights</span>
                  <span id="summary-nights" class="font-semibold text-slate-900">0</span>
                </div>

                <div class="flex justify-between gap-4">
                  <span>Guests</span>
                  <span id="summary-guests" class="font-semibold text-slate-900">1</span>
                </div>

                <div class="border-t border-slate-200 pt-3">
                  <div class="flex justify-between gap-4 text-lg font-bold">
                    <span class="text-slate-900">Total</span>
                    <span id="summary-total" class="text-sky-600">$0.00</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                id="cancel-booking"
                class="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:border-sky-400 hover:text-sky-600 sm:w-1/2"
              >
                Cancel
              </button>

              <button
                type="submit"
                class="rounded-2xl bg-sky-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-sky-600 sm:w-1/2"
              >
                Confirm Booking
              </button>
            </div>

          </form>
        </div>
      </div>
    `
  );

  setupBookingModalEvents();

  try {
    const hotelId = hotel.hotel_id ?? hotel.id;

    bookingRooms = await fetchHotelRooms(hotelId);

    populateRoomSelect();
    updateGuestOptions();
    updateBookingSummary();
  } catch (error) {
    showBookingError(error.message);

    const roomSelect = document.getElementById("booking-room");

    if (roomSelect) {
      roomSelect.innerHTML = `<option value="">No rooms available</option>`;
    }
  }
}

function getLoggedInUserId() {
  return Number(localStorage.getItem("users_id"));
}

function isUserLoggedIn() {
  return Boolean(getLoggedInUserId());
}

function showSignInPrompt() {
  const existingPrompt = document.getElementById("signin-prompt-modal");

  if (existingPrompt) {
    existingPrompt.remove();
  }

  const currentHotelId = getHotelIdFromUrl();
  const redirectUrl = encodeURIComponent(`./hotel-details.html?id=${currentHotelId}`);

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        id="signin-prompt-modal"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
      >
        <div class="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl">
          <div class="text-center">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-2xl text-sky-600">
              🔐
            </div>

            <h2 class="mt-5 text-2xl font-bold text-slate-900">
              Sign in to continue
            </h2>

            <p class="mt-2 text-slate-500">
              You need to sign in or create an account before confirming your booking.
            </p>
          </div>

          <div class="mt-7 flex flex-col gap-3">
            <a
              href="./auth.html?redirect=${redirectUrl}"
              class="rounded-2xl bg-sky-500 px-6 py-3 text-center font-semibold text-white shadow-sm transition hover:bg-sky-600"
            >
              Sign In or Create Account
            </a>

            <button
              type="button"
              id="close-signin-prompt"
              class="rounded-2xl bg-slate-100 px-6 py-3 font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      </div>
    `
  );

  document
    .getElementById("close-signin-prompt")
    .addEventListener("click", () => {
      document.getElementById("signin-prompt-modal")?.remove();
    });
}

function setupBookingModalEvents() {
  const modal = document.getElementById("booking-modal");
  const closeButton = document.getElementById("close-booking-modal");
  const cancelButton = document.getElementById("cancel-booking");
  const form = document.getElementById("booking-form");

  const roomSelect = document.getElementById("booking-room");
  const checkInInput = document.getElementById("booking-checkin");
  const checkOutInput = document.getElementById("booking-checkout");
  const guestsSelect = document.getElementById("booking-guests");

  closeButton.addEventListener("click", closeBookingModal);
  cancelButton.addEventListener("click", closeBookingModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeBookingModal();
    }
  });

  roomSelect.addEventListener("change", () => {
    updateGuestOptions();
    updateBookingSummary();
  });

  checkInInput.addEventListener("change", () => {
    const checkInDate = new Date(checkInInput.value);
    const minCheckout = new Date(checkInDate);

    minCheckout.setDate(minCheckout.getDate() + 1);

    const minCheckoutString = minCheckout.toISOString().split("T")[0];

    checkOutInput.min = minCheckoutString;

    if (checkOutInput.value <= checkInInput.value) {
      checkOutInput.value = minCheckoutString;
    }

    updateBookingSummary();
  });

  checkOutInput.addEventListener("change", updateBookingSummary);
  guestsSelect.addEventListener("change", updateBookingSummary);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isUserLoggedIn()) {
      showSignInPrompt();
      return;
    }

    const selectedRoom = getSelectedRoom();
    const checkInDate = checkInInput.value;
    const checkOutDate = checkOutInput.value;
    const guestCount = Number(guestsSelect.value);
    const nights = calculateNights(checkInDate, checkOutDate);

    if (!selectedRoom) {
      showBookingError("Please select a room.");
      return;
    }

    if (nights <= 0) {
      showBookingError("Check-out date must be after check-in date.");
      return;
    }

    if (guestCount > selectedRoom.capacity) {
      showBookingError(`This room only allows ${selectedRoom.capacity} guests.`);
      return;
    }

    try {
      const usersId = getLoggedInUserId();

      const result = await createBooking({
        users_id: usersId,
        room_id: selectedRoom.room_id,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        guest_count: guestCount
      });

      closeBookingModal();

      alert(
        `Booking created successfully!\nTotal: ${formatCurrency(
          result.booking.total_price
        )}`
      );
    } catch (error) {
      showBookingError(error.message);
    }
  });
}

function closeBookingModal() {
  const modal = document.getElementById("booking-modal");

  if (modal) {
    modal.remove();
  }
}

function populateRoomSelect() {
  const roomSelect = document.getElementById("booking-room");

  if (!bookingRooms.length) {
    roomSelect.innerHTML = `<option value="">No rooms available</option>`;
    return;
  }

  roomSelect.innerHTML = `
    <option value="">Choose a room</option>
    ${bookingRooms
      .map(
        (room) => `
          <option value="${room.room_id}">
            Room ${room.room_number} — ${escapeHtml(room.room_type || "Room")} — 
            Sleeps ${room.capacity} — ${formatCurrency(room.price)} / night
          </option>
        `
      )
      .join("")}
  `;
}

function getSelectedRoom() {
  const roomSelect = document.getElementById("booking-room");
  const selectedRoomId = Number(roomSelect.value);

  return bookingRooms.find((room) => Number(room.room_id) === selectedRoomId);
}

function updateGuestOptions() {
  const guestsSelect = document.getElementById("booking-guests");
  const selectedRoom = getSelectedRoom();

  if (!selectedRoom) {
    guestsSelect.innerHTML = `
      <option value="1">1 person</option>
      <option value="2">2 people</option>
      <option value="3">3 people</option>
      <option value="4">4 people</option>
      <option value="5">5 people</option>
      <option value="6">6 people</option>
    `;
    return;
  }

  const maxGuests = Number(selectedRoom.capacity) || 1;

  guestsSelect.innerHTML = Array.from({ length: maxGuests }, (_, index) => {
    const guestNumber = index + 1;
    const label = guestNumber === 1 ? "1 person" : `${guestNumber} people`;

    return `<option value="${guestNumber}">${label}</option>`;
  }).join("");
}

function updateBookingSummary() {
  const selectedRoom = getSelectedRoom();

  const checkInDate = document.getElementById("booking-checkin").value;
  const checkOutDate = document.getElementById("booking-checkout").value;
  const guestCount = Number(document.getElementById("booking-guests").value || 1);

  const nights = calculateNights(checkInDate, checkOutDate);
  const pricePerNight = selectedRoom ? Number(selectedRoom.price) : 0;
  const totalPrice = pricePerNight * nights * guestCount;

  document.getElementById("summary-price-per-night").textContent =
    formatCurrency(pricePerNight);

  document.getElementById("summary-nights").textContent = nights;
  document.getElementById("summary-guests").textContent = guestCount;

  document.getElementById("summary-total").textContent =
    formatCurrency(totalPrice);
}

function showBookingError(message) {
  const errorBox = document.getElementById("booking-error");

  if (!errorBox) return;

  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}
// ---------- reviews ----------

async function fetchHotelReviews(hotelId) {
  const response = await fetch(`http://localhost:3000/api/hotels/${hotelId}/reviews`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Failed to load reviews.");
  }

  return data;
}

function formatReviewDate(dateValue) {
  if (!dateValue) return "";

  return new Date(dateValue).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function renderStars(rating) {
  const numericRating = Number(rating) || 0;
  const filledStars = "★".repeat(Math.min(numericRating, 5));
  const emptyStars = "☆".repeat(Math.max(5 - numericRating, 0));

  return `${filledStars}${emptyStars}`;
}

function renderReviews(reviews) {
  const reviewsContainer = document.getElementById("reviews-container");
  const reviewsCount = document.getElementById("reviews-count");

  if (!reviewsContainer || !reviewsCount) return;

  if (!reviews.length) {
    reviewsCount.textContent = "No reviews yet";

    reviewsContainer.innerHTML = `
      <div class="rounded-3xl bg-zinc-100 p-8 text-center md:col-span-2">
        <h3 class="text-xl font-bold text-slate-900">
          No reviews yet
        </h3>

        <p class="mt-2 text-slate-500">
          Reviews from guests will appear here after completed stays.
        </p>
      </div>
    `;

    return;
  }

  reviewsCount.textContent = `${reviews.length} review${reviews.length === 1 ? "" : "s"}`;

  reviewsContainer.innerHTML = reviews
    .map((review) => {
      const rating = Number(review.rating) || 0;
      const reviewerName = escapeHtml(review.full_name || "Guest");
      const comment = escapeHtml(review.comment || "No comment provided.");
      const createdAt = formatReviewDate(review.created_at);

      return `
        <article class="rounded-3xl border border-slate-100 bg-zinc-50 p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-xl text-sky-500">
                ${renderStars(rating)}
              </div>

              <h3 class="mt-2 font-bold text-slate-900">
                ${reviewerName}
              </h3>
            </div>

            <span class="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-500">
              ${createdAt}
            </span>
          </div>

          <p class="mt-4 leading-7 text-slate-600">
            “${comment}”
          </p>
        </article>
      `;
    })
    .join("");
}

async function loadHotelReviews() {
  const hotelId = getHotelIdFromUrl();
  const reviewsContainer = document.getElementById("reviews-container");
  const reviewsCount = document.getElementById("reviews-count");

  if (!hotelId || !reviewsContainer || !reviewsCount) return;

  try {
    const reviews = await fetchHotelReviews(hotelId);
    renderReviews(reviews);
  } catch (error) {
    console.error(error);

    reviewsCount.textContent = "Reviews unavailable";

    reviewsContainer.innerHTML = `
      <div class="rounded-3xl bg-red-50 p-6 text-center text-red-600 md:col-span-2">
        Failed to load reviews.
      </div>
    `;
  }
}
// ---------- load ----------

async function loadHotelDetails() {
  const container = document.getElementById("hotel-details-container");
  const hotelId = getHotelIdFromUrl();

  if (!hotelId) {
    container.innerHTML = `
      <div class="rounded-[2rem] bg-white p-8 text-center text-red-600 shadow-sm">
        No hotel selected.
      </div>
    `;
    return;
  }

  try {
    const hotel = await fetchHotelById(hotelId);

    if (!hotel) {
      container.innerHTML = `
        <div class="rounded-[2rem] bg-white p-8 text-center text-red-600 shadow-sm">
          Hotel not found.
        </div>
      `;
      return;
    }

    renderHotelDetails(hotel);
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <div class="rounded-[2rem] bg-white p-8 text-center text-red-600 shadow-sm">
        Failed to load hotel details.
      </div>
    `;
  }
}

loadHotelDetails();
loadHotelReviews();