const axios = require("axios");
const cheerio = require("cheerio");

function absoluteUrl(baseUrl, maybeRelativeUrl) {
  try {
    return new URL(maybeRelativeUrl, baseUrl).href;
  } catch {
    return null;
  }
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

  if (value.includes("logo")) score -= 10;
  if (value.includes("icon")) score -= 10;
  if (value.includes("sprite")) score -= 10;
  if (value.includes("favicon")) score -= 10;

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

async function fetchImageCandidates(pageUrl) {
  const response = await axios.get(pageUrl, {
    timeout: 12000,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; HotelProjectBot/1.0)"
    }
  });

  const html = response.data;
  const $ = cheerio.load(html);

  const candidates = [];

  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) {
    candidates.push({
      url: absoluteUrl(pageUrl, ogImage),
      source: "og:image",
      alt: "",
      score: scoreImage(ogImage, "", "og:image")
    });
  }

  const twitterImage = $('meta[name="twitter:image"]').attr("content");
  if (twitterImage) {
    candidates.push({
      url: absoluteUrl(pageUrl, twitterImage),
      source: "twitter:image",
      alt: "",
      score: scoreImage(twitterImage, "", "twitter:image")
    });
  }

  $("img").each((_, el) => {
    const src =
      $(el).attr("src") ||
      $(el).attr("data-src") ||
      $(el).attr("data-lazy-src") ||
      $(el).attr("data-image");

    const alt = $(el).attr("alt") || "";
    const cls = $(el).attr("class") || "";

    if (!src) return;

    const url = absoluteUrl(pageUrl, src);
    const score = scoreImage(src, alt, cls);

    candidates.push({
      url,
      source: "img",
      alt,
      score
    });
  });

  const filtered = candidates.filter((item) => {
    if (!item.url) return false;

    const lower = item.url.toLowerCase();

    if (lower.startsWith("data:")) return false;
    if (lower.includes("logo")) return false;
    if (lower.includes("icon")) return false;
    if (lower.includes("favicon")) return false;

    return true;
  });

  const unique = uniqueByUrl(filtered)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return unique;
}

module.exports = { fetchImageCandidates };