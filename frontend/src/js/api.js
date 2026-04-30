const API_BASE_URL = "http://localhost:3000/api";

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
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(bookingData)
  });

  if (!response.ok) throw new Error("Failed to create booking");
  return response.json();
}