if (typeof API_BASE_URL === "undefined") {
  var API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";
}

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const guestSelect = document.getElementById("guest-select");
const resultsContainer = document.getElementById("search-results");
const resultsCount = document.getElementById("results-count");
const loadMoreWrapper = document.getElementById("load-more-wrapper");
const loadMoreButton = document.getElementById("load-more-btn");

const HOTEL_LIMIT = 21;

let currentOffset = 0;
let currentTotal = 0;
let currentHotels = [];

function escapeHtml(value) {
  const temp = document.createElement("div");
  temp.textContent = value ?? "";
  return temp.innerHTML;
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

function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

function formatAddress(address) {
  if (!address) return "No address listed";

  let text = address.trim();

  text = text.replace(/([a-z])([A-Z])/g, "$1 $2");
  text = text.replace(/,\s*/g, ", ");
  text = text.replace(/([A-Za-z])(\d{5})/g, "$1 $2");

  return text;
}

async function searchHotels({ append = false } = {}) {
  const search = searchInput.value.trim();
  const guests = guestSelect.value;

  if (!append) {
    currentOffset = 0;

    // Only show full loading card if grid is currently empty
    if (!currentHotels.length) {
      resultsContainer.innerHTML = `
        <div class="col-span-full rounded-3xl border border-slate-200 bg-white p-6 text-center text-slate-500">
          Searching hotels...
        </div>
      `;
    }

    resultsCount.textContent = "Searching...";
    hideLoadMoreButton();
  } else {
    loadMoreButton.textContent = "Loading...";
    loadMoreButton.disabled = true;
  }

  try {
    const params = new URLSearchParams({
      search,
      guests,
      limit: HOTEL_LIMIT,
      offset: currentOffset
    });

    const response = await fetch(`${API_BASE_URL}/hotels/search/all?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to search hotels.");
    }

    const hotels = data.hotels || [];
    currentTotal = data.total || 0;

    if (append) {
      currentHotels = [...currentHotels, ...hotels];
    } else {
      currentHotels = hotels;
    }

    currentOffset = currentHotels.length;

    renderHotels(currentHotels);
    updateLoadMoreButton();
  } catch (error) {
    console.error(error);

    resultsCount.textContent = "Search failed";
    hideLoadMoreButton();

    resultsContainer.innerHTML = `
      <div class="col-span-full rounded-3xl border border-red-100 bg-red-50 p-6 text-center text-red-600">
        Failed to load hotels. Please try again.
      </div>
    `;
  } finally {
    loadMoreButton.textContent = "Load More Hotels";
    loadMoreButton.disabled = false;
  }
}

function renderHotels(hotels) {
  if (!hotels.length) {
    resultsCount.textContent = "0 hotels found";

    resultsContainer.innerHTML = `
      <div class="col-span-full rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <h3 class="text-xl font-bold text-slate-900">No hotels found</h3>
        <p class="mt-2 text-slate-500">
          Try searching a different location or lowering the number of guests.
        </p>
      </div>
    `;

    return;
  }

  resultsCount.textContent = `Showing ${hotels.length} of ${currentTotal} hotel${currentTotal === 1 ? "" : "s"}`;

  resultsContainer.innerHTML = hotels
    .map((hotel) => {
      const hotelName = escapeHtml(hotel.names);
      const address = escapeHtml(formatAddress(hotel.address));
      const imageUrl = resolveImageUrl(hotel.image_url);
      const rating = hotel.star_rating ?? "N/A";
      const startingPrice = hotel.starting_price
        ? formatCurrency(hotel.starting_price)
        : "Price unavailable";

      return `
        <article class="overflow-hidden rounded-[2rem] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
          <img
            src="${imageUrl}"
            alt="${hotelName}"
            class="h-56 w-full object-cover"
          />

          <div class="p-6">
            <div class="mb-3 flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-600">
                ${rating}★
              </span>

              <span class="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-slate-600">
                Sleeps up to ${hotel.max_capacity}
              </span>
            </div>

            <h3 class="text-xl font-bold text-slate-900">
              ${hotelName}
            </h3>

            <p class="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
              ${address}
            </p>

            <div class="mt-5 rounded-2xl bg-zinc-100 p-4">
              <p class="text-sm text-slate-500">Starting from</p>
              <p class="mt-1 text-2xl font-bold text-slate-900">
                ${startingPrice}
                <span class="text-sm font-semibold text-slate-500">/ night</span>
              </p>
            </div>

            <a
              href="./hotel-details.html?id=${hotel.hotel_id}"
              class="mt-5 block rounded-2xl bg-sky-500 px-5 py-3 text-center font-semibold text-white transition hover:bg-sky-600"
            >
              View Rooms
            </a>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateLoadMoreButton() {
  if (currentHotels.length < currentTotal) {
    loadMoreWrapper.classList.remove("hidden");
  } else {
    hideLoadMoreButton();
  }
}

function hideLoadMoreButton() {
  loadMoreWrapper.classList.add("hidden");
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

      renderAuthNav();
    });

    return;
  }

  authNav.innerHTML = `
    <a
      href="./auth.html?redirect=./search.html"
      class="rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"
    >
      Sign In
    </a>
  `;
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchHotels();
});

searchInput.addEventListener("input", () => {
  clearTimeout(window.searchTimeout);

  window.searchTimeout = setTimeout(() => {
    searchHotels();
  }, 350);
});

guestSelect.addEventListener("change", () => {
  searchHotels();
});

loadMoreButton.addEventListener("click", () => {
  searchHotels({ append: true });
});

function loadSearchParamsFromUrl() {
  const params = new URLSearchParams(window.location.search);

  const search = params.get("search") || "";
  const guests = params.get("guests") || "2";

  searchInput.value = search;
  guestSelect.value = guests;
}

renderAuthNav();
loadSearchParamsFromUrl();
searchHotels();