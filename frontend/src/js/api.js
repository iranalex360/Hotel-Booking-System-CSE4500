if (typeof API_BASE_URL === "undefined") {
  var API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";
}

/**
 * Custom fetch wrapper that automatically appends JWT Authorization Bearer header.
 */
async function authenticatedFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    console.warn("Unauthorized request (401). Clearing token...");
    localStorage.removeItem("token");
    localStorage.removeItem("users_id");
    localStorage.removeItem("full_name");
    localStorage.removeItem("email");
  }

  return response;
}

async function fetchHotels() {
  const response = await fetch(`${API_BASE_URL}/hotels`);
  if (!response.ok) throw new Error("Failed to fetch hotels");
  return response.json();
}

async function fetchHotelById(id) {
  const response = await fetch(`${API_BASE_URL}/hotels/${id}`);
  if (!response.ok) throw new Error("Failed to fetch hotel");
  return response.json();
}

async function fetchRoomsByHotelId(id) {
  const response = await fetch(`${API_BASE_URL}/hotels/${id}/rooms`);
  if (!response.ok) throw new Error("Failed to fetch rooms");
  return response.json();
}

async function createBooking(bookingData) {
  const response = await authenticatedFetch(`${API_BASE_URL}/bookings`, {
    method: "POST",
    body: JSON.stringify(bookingData)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Failed to create booking");
  }

  return data;
}