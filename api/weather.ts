// Weather & Environment API service for Singapore live telemetry
// Connects to official keyless live Data.gov.sg v2 endpoints:
// - https://api-open.data.gov.sg/v2/real-time/api/rainfall
// - https://api-open.data.gov.sg/v2/real-time/api/uv
// and related environmental feeds.

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const cache: Record<string, CacheItem<any>> = {};
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export async function fetchWithCache<T>(key: string, url: string, fallbackData?: T): Promise<T | null> {
  const cached = cache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; UmbrellaOracleApp/2.0)",
        Accept: "application/json",
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[API Service] ${url} returned HTTP ${res.status}`);
      if (cached) return cached.data as T;
      return fallbackData || null;
    }
    const data = await res.json();
    if (data && typeof data.code === "number" && data.code !== 0 && cached) {
      return cached.data as T;
    }
    cache[key] = { data, timestamp: Date.now() };
    return data as T;
  } catch (err) {
    console.warn(`[API Service Warning] Failed to fetch ${url}, using cached/fallback:`, err);
    if (cached) return cached.data as T;
    return fallbackData || null;
  }
}

// Fallback SG Towns data
export const FALLBACK_TOWNS = [
  { area: "Jurong West", forecast: "Moderate Rain" },
  { area: "Clementi", forecast: "Light Rain" },
  { area: "Orchard", forecast: "Cloudy" },
  { area: "Tampines", forecast: "Thundery Showers" },
  { area: "Bishan", forecast: "Passing Showers" },
  { area: "Woodlands", forecast: "Partly Cloudy (Day)" },
  { area: "Bedok", forecast: "Cloudy" },
  { area: "Ang Mo Kio", forecast: "Light Showers" },
  { area: "Marina South", forecast: "Fair (Day)" },
  { area: "Sentosa", forecast: "Fair (Day)" },
  { area: "Changi", forecast: "Cloudy" },
  { area: "Novena", forecast: "Cloudy" },
  { area: "Queenstown", forecast: "Light Rain" },
  { area: "Yishun", forecast: "Passing Showers" },
  { area: "Punggol", forecast: "Thundery Showers" },
  { area: "Bukit Timah", forecast: "Moderate Rain" },
  { area: "City", forecast: "Cloudy" },
  { area: "Geylang", forecast: "Light Rain" },
  { area: "Hougang", forecast: "Thundery Showers" },
  { area: "Kallang", forecast: "Cloudy" },
  { area: "Pasir Ris", forecast: "Thundery Showers" },
  { area: "Sengkang", forecast: "Thundery Showers" },
  { area: "Serangoon", forecast: "Light Showers" },
  { area: "Toa Payoh", forecast: "Cloudy" },
  { area: "Tuas", forecast: "Heavy Thundery Showers" },
];

export const QUIRKY_HOT_TAKES_BANK = [
  "UV index high! You will crisp like roasted pork out there. Bring the UV brolly or become char siew.",
  "Sky looks like it is about to drop 10 Olympic swimming pools onto your hair. Take the brolly!",
  "No rain now, but Singapore weather changes faster than people chope table with tissue pack. Take it!",
  "Cloudy but with high drama. Better have brolly than kenna soaked like wet beehoon.",
  "Wind speed high! If you open small pasar malam umbrella, it will turn inside out in 2 seconds flat.",
  "Zero rain registered, but UV is high enough to toast bread on your forehead. Sun umbrella alert!",
  "Forecast says Thundery Showers. Do you trust the sky? If you don't bring brolly, karma will rain on you specifically.",
  "Safe level: 10/10. But remember, the moment you leave your umbrella at home, cloud gods start smiling maliciously.",
  "Moderate drizzle detected at nearest station. Bring umbrella unless you like the dramatic Taiwanese soap opera rain walk.",
  "Sun is blazing like a nuclear furnace. Bring the dual-tone silver UV parasol, auntie-style is the smart style.",
];

export function calculateUmbrellaScore(
  forecast: string = "Cloudy",
  rainfallMm: number = 0,
  uvIndex: number = 6,
  windSpeedKnots: number = 8,
  humidity: number = 75
) {
  let score = 20;

  const f = String(forecast || "").toLowerCase();
  if (f.includes("heavy thundery") || f.includes("heavy rain") || f.includes("torrential")) {
    score += 65;
  } else if (f.includes("thundery") || f.includes("thunder")) {
    score += 55;
  } else if (f.includes("moderate rain") || f.includes("showers") || f.includes("rain")) {
    score += 40;
  } else if (f.includes("light") || f.includes("drizzle")) {
    score += 25;
  } else if (f.includes("cloudy") || f.includes("overcast")) {
    score += 15;
  }

  // Rainfall sensor addition
  if (rainfallMm > 10) score += 40;
  else if (rainfallMm > 2) score += 30;
  else if (rainfallMm > 0.2) score += 20;
  else if (rainfallMm > 0) score += 10;

  // UV protection addition (Singaporeans carry brollies for both rain & scorching sun!)
  if (uvIndex >= 10) score += 30;
  else if (uvIndex >= 7) score += 20;
  else if (uvIndex >= 5) score += 10;

  // High humidity + overcast multiplier
  if (humidity >= 85 && (f.includes("cloud") || f.includes("shower"))) {
    score += 10;
  }

  // Cap score 1 - 100
  score = Math.max(1, Math.min(100, Math.round(score)));

  let verdict: 'LEAVE IT' | 'PROBABLY OK' | 'CONSIDER BRINGING' | 'TAKE IT!' | 'EMERGENCY BROLLY DEFCON 1' = 'LEAVE IT';
  if (score >= 85) verdict = 'EMERGENCY BROLLY DEFCON 1';
  else if (score >= 65) verdict = 'TAKE IT!';
  else if (score >= 45) verdict = 'CONSIDER BRINGING';
  else if (score >= 25) verdict = 'PROBABLY OK';

  return { score, verdict };
}
