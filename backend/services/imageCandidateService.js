const axios = require("axios");
const cheerio = require("cheerio");

const BOOKING_BASE_URL = "https://www.booking.com";

function absoluteUrl(baseUrl, maybeRelativeUrl) {
  try {
    return new URL(maybeRelativeUrl, baseUrl).href;
  } catch {
    return null;
  }
}

function canonicalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";

    // Keep Booking hotel URLs stable and avoid duplicate tracking variants.
    const keepParams = new Set(["aid", "label"]);
    for (const key of [...parsed.searchParams.keys()]) {
      if (!keepParams.has(key)) parsed.searchParams.delete(key);
    }

    return parsed.href;
  } catch {
    return url;
  }
}

function normalizeText(value = "") {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenOverlapScore(a = "", b = "") {
  const aTokens = new Set(normalizeText(a).split(" ").filter(Boolean));
  const bTokens = new Set(normalizeText(b).split(" ").filter(Boolean));

  if (!aTokens.size || !bTokens.size) return 0;

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }

  return overlap / aTokens.size;
}

function scoreHotelResult({ searchedName, resultName = "", url = "" }) {
  let score = 0;

  const normalizedSearch = normalizeText(searchedName);
  const normalizedResult = normalizeText(resultName);

  if (normalizedResult === normalizedSearch) score += 20;
  if (normalizedResult.includes(normalizedSearch)) score += 12;
  if (normalizedSearch.includes(normalizedResult)) score += 8;

  score += tokenOverlapScore(searchedName, resultName) * 10;

  if (url.includes("/hotel/")) score += 5;
  if (url.includes("booking.com")) score += 2;

  return score;
}

function scoreImage(url, alt = "", context = "") {
  let score = 0;
  const value = `${url} ${alt} ${context}`.toLowerCase();

  if (!url) return -999;

  if (value.includes("hero")) score += 5;
  if (value.includes("gallery")) score += 5;
  if (value.includes("hotel")) score += 4;
  if (value.includes("room")) score += 3;
  if (value.includes("suite")) score += 3;
  if (value.includes("lobby")) score += 3;
  if (value.includes("exterior")) score += 3;
  if (value.includes("property")) score += 2;
  if (value.includes("bstatic.com")) score += 3;

  if (value.includes("logo")) score -= 10;
  if (value.includes("icon")) score -= 10;
  if (value.includes("sprite")) score -= 10;
  if (value.includes("favicon")) score -= 10;
  if (value.includes("avatar")) score -= 5;
  if (value.includes("badge")) score -= 5;

  if (/\.(jpg|jpeg|png|webp)(\?|$)/i.test(url)) score += 2;

  return score;
}

function uniqueByUrl(items) {
  const seen = new Set();

  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function parseSrcset(srcset = "") {
  return srcset
    .split(",")
    .map((entry) => {
      const parts = entry.trim().split(/\s+/);
      const url = parts[0];
      const descriptor = parts[1] || "";

      let weight = 1;
      if (descriptor.endsWith("w")) weight = Number.parseInt(descriptor, 10) || 1;
      if (descriptor.endsWith("x")) weight = (Number.parseFloat(descriptor) || 1) * 1000;

      return { url, weight };
    })
    .filter((item) => item.url)
    .sort((a, b) => b.weight - a.weight)
    .map((item) => item.url);
}

function imageUrlsFromElement($, el) {
  const $el = $(el);

  const urls = [
    $el.attr("src"),
    $el.attr("data-src"),
    $el.attr("data-lazy-src"),
    $el.attr("data-image"),
    $el.attr("data-highres"),
    $el.attr("data-original")
  ].filter(Boolean);

  const srcset = $el.attr("srcset") || $el.attr("data-srcset");
  if (srcset) urls.push(...parseSrcset(srcset));

  return urls;
}

function looksLikeImageUrl(url = "") {
  const lower = url.toLowerCase();

  if (!url) return false;
  if (lower.startsWith("data:")) return false;
  if (lower.includes("logo")) return false;
  if (lower.includes("icon")) return false;
  if (lower.includes("favicon")) return false;
  if (lower.includes("sprite")) return false;

  return /\.(jpg|jpeg|png|webp)(\?|$)/i.test(lower) || lower.includes("bstatic.com");
}

function buildBookingSearchUrl(hotelName, options = {}) {
  const params = new URLSearchParams({
    ss: hotelName,
    sb: "1",
    src: "searchresults",
    src_elem: "sb",
    group_adults: String(options.adults || 2),
    group_children: String(options.children || 0),
    no_rooms: String(options.rooms || 1)
  });

  // Optional, but useful if your results need a specific locale/currency.
  if (options.currency) params.set("selected_currency", options.currency);
  if (options.language) params.set("lang", options.language);

  return `${BOOKING_BASE_URL}/searchresults.html?${params.toString()}`;
}

async function fetchHtml(url) {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    },
    maxRedirects: 5
  });

  return response.data;
}

function extractBookingHotelResults(html, searchUrl, hotelName) {
  const $ = cheerio.load(html);
  const results = [];

  // Modern Booking.com result cards.
  $('[data-testid="property-card"]').each((_, card) => {
    const $card = $(card);

    const name =
      $card.find('[data-testid="title"]').first().text().trim() ||
      $card.find("h3").first().text().trim() ||
      $card.text().trim().slice(0, 180);

    const href =
      $card.find('a[href*="/hotel/"]').first().attr("href") ||
      $card.find("a[href]").first().attr("href");

    const url = href ? canonicalizeUrl(absoluteUrl(searchUrl, href)) : null;

    if (url && url.includes("/hotel/")) {
      results.push({
        name,
        url,
        score: scoreHotelResult({ searchedName: hotelName, resultName: name, url })
      });
    }
  });

  // Fallback for older or changed markup.
  $('a[href*="/hotel/"]').each((_, link) => {
    const $link = $(link);
    const href = $link.attr("href");
    const url = href ? canonicalizeUrl(absoluteUrl(searchUrl, href)) : null;

    const name =
      $link.attr("aria-label") ||
      $link.text().trim() ||
      $link.closest("div").text().trim().slice(0, 180);

    if (url) {
      results.push({
        name,
        url,
        score: scoreHotelResult({ searchedName: hotelName, resultName: name, url })
      });
    }
  });

  return uniqueByUrl(results)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function collectJsonImageUrls(value, output = []) {
  if (!value) return output;

  if (typeof value === "string") {
    if (looksLikeImageUrl(value)) output.push(value);
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonImageUrls(item, output));
    return output;
  }

  if (typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();

      if (
        lowerKey.includes("image") ||
        lowerKey.includes("photo") ||
        lowerKey.includes("thumbnail") ||
        lowerKey === "url" ||
        lowerKey === "contenturl"
      ) {
        collectJsonImageUrls(nestedValue, output);
      } else if (typeof nestedValue === "object") {
        collectJsonImageUrls(nestedValue, output);
      }
    }
  }

  return output;
}

function extractJsonLdImages($, pageUrl) {
  const candidates = [];

  $('script[type*="ld+json"]').each((_, script) => {
    const raw = $(script).contents().text().trim();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const urls = collectJsonImageUrls(parsed);

      for (const imageUrl of urls) {
        const url = absoluteUrl(pageUrl, imageUrl);
        candidates.push({
          url,
          source: "json-ld",
          alt: "",
          score: scoreImage(url, "", "json-ld image")
        });
      }
    } catch {
      // Ignore invalid JSON-LD blocks.
    }
  });

  return candidates;
}

function extractRegexImages(html, pageUrl) {
  const candidates = [];
  const matches = html.match(/https?:\\?\/\\?\/[^"'\\\s]+?\.(jpg|jpeg|png|webp)(\?[^"'\\\s]*)?/gi) || [];

  for (const raw of matches) {
    const cleaned = raw
      .replace(/\\u002F/gi, "/")
      .replace(/\\\//g, "/")
      .replace(/&amp;/g, "&");

    const url = absoluteUrl(pageUrl, cleaned);

    candidates.push({
      url,
      source: "html-regex",
      alt: "",
      score: scoreImage(url, "", "booking page html")
    });
  }

  return candidates;
}

async function fetchImageCandidates(pageUrl) {
  const html = await fetchHtml(pageUrl);
  const $ = cheerio.load(html);

  const candidates = [];

  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) {
    const url = absoluteUrl(pageUrl, ogImage);
    candidates.push({
      url,
      source: "og:image",
      alt: "",
      score: scoreImage(url, "", "og:image")
    });
  }

  const twitterImage = $('meta[name="twitter:image"]').attr("content");
  if (twitterImage) {
    const url = absoluteUrl(pageUrl, twitterImage);
    candidates.push({
      url,
      source: "twitter:image",
      alt: "",
      score: scoreImage(url, "", "twitter:image")
    });
  }

  const itempropImage = $('[itemprop="image"]').attr("content") || $('[itemprop="image"]').attr("src");
  if (itempropImage) {
    const url = absoluteUrl(pageUrl, itempropImage);
    candidates.push({
      url,
      source: "itemprop:image",
      alt: "",
      score: scoreImage(url, "", "itemprop:image")
    });
  }

  $("img, source").each((_, el) => {
    const urls = imageUrlsFromElement($, el);
    const alt = $(el).attr("alt") || "";
    const cls = $(el).attr("class") || "";
    const testId = $(el).attr("data-testid") || "";

    for (const src of urls) {
      const url = absoluteUrl(pageUrl, src);

      candidates.push({
        url,
        source: el.name,
        alt,
        score: scoreImage(url, alt, `${cls} ${testId}`)
      });
    }
  });

  candidates.push(...extractJsonLdImages($, pageUrl));
  candidates.push(...extractRegexImages(html, pageUrl));

  return uniqueByUrl(candidates)
    .filter((item) => item.url && looksLikeImageUrl(item.url))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

async function findBookingHotelPage(hotelName, options = {}) {
  const searchUrl = buildBookingSearchUrl(hotelName, options);
  const html = await fetchHtml(searchUrl);

  const results = extractBookingHotelResults(html, searchUrl, hotelName);

  if (!results.length) {
    throw new Error(`No Booking.com hotel result found for "${hotelName}".`);
  }

  return {
    searchUrl,
    selected: results[0],
    alternatives: results.slice(1)
  };
}

async function fetchBookingImageCandidates(hotelName, options = {}) {
  const hotelMatch = await findBookingHotelPage(hotelName, options);
  const images = await fetchImageCandidates(hotelMatch.selected.url);

  return {
    hotelName,
    bookingHotel: hotelMatch.selected,
    alternatives: hotelMatch.alternatives,
    images
  };
}

module.exports = {
  fetchBookingImageCandidates,
  findBookingHotelPage,
  fetchImageCandidates
};