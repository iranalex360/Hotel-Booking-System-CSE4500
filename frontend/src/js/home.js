function stripHtml(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html || "";
  return temp.textContent || temp.innerText || "";
}

function shortenText(text, maxLength = 120) {
  if (!text) return "No description available.";
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

function cleanDescription(description) {
  let text = stripHtml(description || "").trim();

  if (!text) return "No description available.";

  // Remove everything before the first colon, if any
  text = text.replace(/^[^:]*:\s*/, "");

  // Fix merged words like "centerLocation" -> "center Location"
  text = text.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Remove repeated location labels if they still appear
  text = text.replace(/\bLocation\b\s*:?\s*/gi, "");

  return text.trim();
}

function formatAddress(address) {
  if (!address) return "No address listed";

  let text = address.trim();

  // Insert spaces in merged camel-case words
  // "ScotiaNewYork" -> "Scotia New York"
  text = text.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Ensure comma + space if comma exists before state
  text = text.replace(/,\s*/g, ", ");

  // Add a space before zipcode if missing
  // "Tennessee38017" -> "Tennessee 38017"
  text = text.replace(/([A-Za-z])(\d{5})(\b)/g, "$1 $2");

  return text.trim();
}

function resolveImageUrl(imageUrl) {
  if (!imageUrl) {
    return "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80";
  }

  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }

  return `http://localhost:3000${imageUrl}`;
}

function createHotelCard(hotel) {
  return `
    <article class="overflow-hidden rounded-[2rem] bg-zinc-100 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <img
        src="${resolveImageUrl(hotel.image_url)}"
        alt="${hotel.names}"
        class="h-56 w-full object-cover"
      />
      <div class="p-6">
        <div class="flex items-start justify-between gap-4">
          <h3 class="text-xl font-bold text-slate-900">${hotel.names}</h3>
          <span class="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-600">
            ${hotel.star_rating ?? "N/A"}★
          </span>
        </div>

        <p class="mt-3 text-sm text-slate-500">
          ${formatAddress(hotel.address)}
        </p>

        <p class="mt-4 text-sm leading-6 text-slate-600">
          ${shortenText(cleanDescription(hotel.descriptions))}
        </p>

        <div class="mt-6">
          <button class="rounded-2xl bg-sky-500 px-5 py-2.5 font-semibold text-white transition hover:bg-sky-600">
            View Details
          </button>
        </div>
      </div>
    </article>
  `;
}

async function loadHotels() {
  const container = document.getElementById("hotels-container");

  container.innerHTML = `
    <div class="col-span-full rounded-3xl border border-slate-200 bg-zinc-100 p-6 text-center text-slate-500">
      Loading hotels...
    </div>
  `;

  try {
    const hotels = await fetchHotels();

    if (!hotels.length) {
      container.innerHTML = `
        <div class="col-span-full rounded-3xl border border-slate-200 bg-zinc-100 p-6 text-center text-slate-500">
          No hotels found.
        </div>
      `;
      return;
    }

    container.innerHTML = hotels.map(createHotelCard).join("");
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <div class="col-span-full rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
        Could not load hotel data.
      </div>
    `;
  }
}

loadHotels();