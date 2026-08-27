import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Initialize Gemini API client lazily or safely
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const cache: Record<string, CacheItem<any>> = {};
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache for government weather data

async function fetchWithCache<T>(key: string, url: string): Promise<T | null> {
  const cached = cache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; UmbrellaOracleApp/1.0)",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`[WeatherAPI] ${url} returned status ${res.status}`);
      if (cached) return cached.data as T;
      return null;
    }
    const data = await res.json();
    cache[key] = { data, timestamp: Date.now() };
    return data as T;
  } catch (err) {
    console.error(`[WeatherAPI Error] Failed to fetch ${url}:`, err);
    if (cached) return cached.data as T;
    return null;
  }
}

// Fallback SG Towns data if offline
const FALLBACK_TOWNS = [
  { area: "Jurong West", forecast: "Moderate Rain" },
  { area: "Clementi", forecast: "Light Rain" },
  { area: "Orchard", forecast: "Cloudy" },
  { area: "Tampines", forecast: "Thundery Showers" },
  { area: "Bishan", forecast: "Passing Showers" },
  { area: "Woodlands", forecast: "Partly Cloudy" },
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

function calculateUmbrellaScore(forecast: string, rainfallMm: number, uvIndex: number, windSpeedKnots: number) {
  let score = 20; // baseline cautious Singaporean score

  const f = forecast.toLowerCase();
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
  if (rainfallMm > 5) score += 35;
  else if (rainfallMm > 0.5) score += 20;
  else if (rainfallMm > 0) score += 10;

  // UV protection addition (Singaporeans carry brollies for both rain & scorching sun!)
  if (uvIndex >= 9) score += 25;
  else if (uvIndex >= 6) score += 15;

  // Cap score 1 - 100
  score = Math.max(1, Math.min(100, Math.round(score)));

  let verdict: 'LEAVE IT' | 'PROBABLY OK' | 'CONSIDER BRINGING' | 'TAKE IT!' | 'EMERGENCY BROLLY DEFCON 1' = 'LEAVE IT';
  if (score >= 85) verdict = 'EMERGENCY BROLLY DEFCON 1';
  else if (score >= 65) verdict = 'TAKE IT!';
  else if (score >= 45) verdict = 'CONSIDER BRINGING';
  else if (score >= 25) verdict = 'PROBABLY OK';

  return { score, verdict };
}

const QUIRKY_HOT_TAKES_BANK = [
  "UV 9! You will crisp like roasted pork out there. Bring the UV brolly or become char siew.",
  "Sky looks like it is about to drop 10 Olympic swimming pools onto your hair. Take the brolly!",
  "No rain now, but Singapore weather changes faster than people chope table with tissue pack. Take it!",
  "Cloudy but with high drama. Better have brolly than kenna soaked like wet beehoon.",
  "Wind speed high! If you open small pasar malam umbrella, it will turn inside out in 2 seconds flat.",
  "Zero rain registered, but UV is high enough to toast bread on your forehead. Sun umbrella alert!",
  "Forecast says Thundery Showers. Do you trust the sky? If you don't bring brolly, karma will rain on you specifically.",
  "Safe level: 10/10. But remember, the moment you leave your umbrella at home, cloud gods start smiling maliciously.",
  "Moderate drizzle detected at nearest station. Bring umbrella unless you like the dramatic Taiwanese soap opera rain walk.",
  "Sun is blazing like a nuclear furnace. Bring the dual-tone silver UV parasol, auntie-style is the smart style."
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API 1: Live Singapore Weather Aggregator
  app.get("/api/weather/live", async (req, res) => {
    try {
      const requestedArea = (req.query.area as string) || "Jurong West";

      // 1. Fetch 2-hour weather forecast
      const forecastData = await fetchWithCache<any>(
        "forecast-2hr",
        "https://api.data.gov.sg/v1/environment/2-hour-weather-forecast"
      );

      // 2. Fetch rainfall
      const rainfallData = await fetchWithCache<any>(
        "rainfall",
        "https://api.data.gov.sg/v1/environment/rainfall"
      );

      // 3. Fetch UV index
      const uvData = await fetchWithCache<any>(
        "uv-index",
        "https://api.data.gov.sg/v1/environment/uv-index"
      );

      // 4. Fetch Air Temp & Wind
      const tempData = await fetchWithCache<any>(
        "temperature",
        "https://api.data.gov.sg/v1/environment/air-temperature"
      );
      const windData = await fetchWithCache<any>(
        "wind-speed",
        "https://api.data.gov.sg/v1/environment/wind-speed"
      );

      // Process Towns Forecast
      let towns: { area: string; forecast: string }[] = FALLBACK_TOWNS;
      let timestamp = new Date().toISOString();
      let updateTime = "Just now";

      if (forecastData && forecastData.items && forecastData.items[0]) {
        const item = forecastData.items[0];
        timestamp = item.timestamp || timestamp;
        updateTime = item.update_timestamp || updateTime;
        if (Array.isArray(item.forecasts) && item.forecasts.length > 0) {
          towns = item.forecasts.map((f: any) => ({
            area: f.area,
            forecast: f.forecast,
          }));
        }
      }

      // Find matched town or default
      const matchedTown = towns.find(
        (t) => t.area.toLowerCase() === requestedArea.toLowerCase()
      ) || towns[0] || { area: requestedArea, forecast: "Partly Cloudy" };

      // Process UV
      let uvValue = 6;
      let uvTimestamp = new Date().toISOString();
      if (uvData && uvData.items && uvData.items[0] && Array.isArray(uvData.items[0].index) && uvData.items[0].index.length > 0) {
        const latestUV = uvData.items[0].index[uvData.items[0].index.length - 1];
        uvValue = latestUV.value ?? 6;
        uvTimestamp = latestUV.timestamp || uvTimestamp;
      } else {
        // Mock realistic daytime/nighttime UV if missing
        const currentHour = new Date().getHours();
        if (currentHour >= 11 && currentHour <= 15) uvValue = 8.5;
        else if (currentHour >= 8 && currentHour <= 18) uvValue = 4.5;
        else uvValue = 0;
      }

      let uvStatus: 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme' = 'Moderate';
      if (uvValue >= 11) uvStatus = 'Extreme';
      else if (uvValue >= 8) uvStatus = 'Very High';
      else if (uvValue >= 6) uvStatus = 'High';
      else if (uvValue >= 3) uvStatus = 'Moderate';
      else uvStatus = 'Low';

      // Process Rainfall
      let rainfallMm = 0;
      let stationName = "Clementi (Telemetry)";
      if (rainfallData && rainfallData.items && rainfallData.items[0] && Array.isArray(rainfallData.items[0].readings)) {
        const readings = rainfallData.items[0].readings;
        const stationsMeta = rainfallData.metadata?.stations || [];
        
        // Pick station closest to area or with highest rainfall
        const activeReading = readings.find((r: any) => r.value > 0) || readings[0];
        if (activeReading) {
          rainfallMm = activeReading.value || 0;
          const meta = stationsMeta.find((s: any) => s.id === activeReading.station_id);
          if (meta && meta.name) {
            stationName = meta.name;
          }
        }
      }

      let rainStatus: 'Bone Dry' | 'Drizzle' | 'Moderate Rain' | 'Pouring Cats & Dogs' | 'Flash Flood Risk' = 'Bone Dry';
      if (rainfallMm > 20) rainStatus = 'Flash Flood Risk';
      else if (rainfallMm > 5) rainStatus = 'Pouring Cats & Dogs';
      else if (rainfallMm > 1) rainStatus = 'Moderate Rain';
      else if (rainfallMm > 0) rainStatus = 'Drizzle';

      // Process Temperature
      let temperature = 31.0;
      if (tempData?.items?.[0]?.readings?.[0]) {
        temperature = tempData.items[0].readings[0].value || 31.0;
      }

      // Process Wind
      let windSpeed = 8.5;
      if (windData?.items?.[0]?.readings?.[0]) {
        windSpeed = windData.items[0].readings[0].value || 8.5;
      }

      const { score: umbrellaScore, verdict } = calculateUmbrellaScore(
        matchedTown.forecast,
        rainfallMm,
        uvValue,
        windSpeed
      );

      const sunscreenScore = Math.min(100, Math.round(uvValue * 9.5));

      // Choose a quirky hot take
      const randomHotTake =
        QUIRKY_HOT_TAKES_BANK[
          Math.floor(Math.random() * QUIRKY_HOT_TAKES_BANK.length)
        ];

      res.json({
        timestamp,
        updateTime,
        selectedArea: matchedTown.area,
        selectedForecast: matchedTown.forecast,
        towns,
        uvIndex: {
          value: uvValue,
          timestamp: uvTimestamp,
          status: uvStatus,
        },
        nearestRainfall: {
          stationName,
          rainfallMm,
          status: rainStatus,
        },
        temperature,
        humidity: 78,
        windSpeed,
        umbrellaScore,
        sunscreenScore,
        verdict,
        hotTake: randomHotTake,
        source: forecastData ? "live_data_gov_sg" : "fallback",
      });
    } catch (err: any) {
      console.error("[Weather Live Aggregator Error]:", err);
      res.status(500).json({ error: "Failed to load live weather data", details: err.message });
    }
  });

  // API 2: Gemini-Powered Quirky Hot Take & Excuse Generator
  app.post("/api/gemini/hot-take", async (req, res) => {
    try {
      const { area, forecast, rainfallMm, uvIndex, temperature, umbrellaScore } = req.body;

      if (process.env.GEMINI_API_KEY) {
        const prompt = `You are the Singapore Umbrella & UV Oracle, a hilariously quirky, witty, sarcastic Singlish-speaking weather auntie/uncle weather bot.
Current Singapore Weather context:
- Location: ${area || "Singapore"}
- 2-Hour Forecast: ${forecast || "Cloudy"}
- Real-time 5-min Rainfall: ${rainfallMm ?? 0} mm
- UV Index: ${uvIndex ?? 7.5}
- Temperature: ${temperature ?? 32}°C
- Calculated Umbrella Need Score: ${umbrellaScore ?? 75}/100

Generate a super funny, quirky, memorable weather hot take / excuse for whether the user MUST bring an umbrella, sunscreen, or avoid walking outside. Include 1-2 witty Singlish particles (lah, lor, sia, chope, char siew, wet chicken, Defcon 1, auntie visor) naturally. Keep it punchy (1 to 2 sentences max!).

Output format (JSON):
{
  "headline": "Short punchy catchphrase (under 7 words)",
  "body": "The hilarious 1-2 sentence breakdown",
  "singlishVerdict": "TAKE IT LAH / SAFE LEH / ROASTING TIME / DANGER",
  "excuseForBoss": "Funny 1-line excuse for being late due to weather"
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text);
          return res.json(parsed);
        }
      }

      // Offline / Fallback generator
      const fallbackList = [
        {
          headline: "Crispy Roasted Human Alert!",
          body: `UV is at ${uvIndex || 8.5}! If you walk under direct sunlight for 10 minutes without umbrella, you will become medium-rare char siew.`,
          singlishVerdict: "TAKE UV BROLLY LAH",
          excuseForBoss: "Boss, UV index exceeded my skin's warranty, had to seek emergency shelter at bubble tea shop.",
        },
        {
          headline: "Sky Goin' To Open Tap Soon",
          body: `Forecast in ${area || "town"} is '${forecast || "Passing Showers"}'. You know Singapore rain, 2 seconds drizzle then suddenly Niagara Falls!`,
          singlishVerdict: "TAKE BROLLY CONFIRM",
          excuseForBoss: "Boss, the rain was raining horizontally, umbrella inverted, delayed by aerodynamic physics.",
        },
        {
          headline: "Safe For Now, But Don't Action",
          body: `Rainfall is 0.0mm, but the cloud looks suspicious. Don't act hero leave umbrella at home, later regret until crying.`,
          singlishVerdict: "BETTER SAFE THAN SORRY",
          excuseForBoss: "Boss, I spent 15 minutes checking 4 different weather radar scans before daring to cross the road.",
        },
      ];
      const pick = fallbackList[Math.floor(Math.random() * fallbackList.length)];
      res.json(pick);
    } catch (err: any) {
      console.error("[Gemini Hot Take Error]:", err);
      res.json({
        headline: "Rain God Watching You",
        body: "The moment you leave your umbrella at home, the clouds will convene an emergency meeting above your head.",
        singlishVerdict: "JUST BRING LAH",
        excuseForBoss: "Delayed by sudden micro-monsoon over my specific block.",
      });
    }
  });

  // API 3: Sheltered Route Advisor (Quirky proposition from Slide 3)
  app.post("/api/gemini/sheltered-route", async (req, res) => {
    try {
      const { origin, destination, rainIntensity } = req.body;
      const startLoc = origin || "Jurong West MRT";
      const endLoc = destination || "Hawker Centre";

      if (process.env.GEMINI_API_KEY) {
        const prompt = `You are the Singapore Master of Sheltered Walking Routes (Underground Linkways, Void Decks, Shopping Mall Tunnels, Covered Walkways Expert).
The user wants to walk from "${startLoc}" to "${endLoc}".
Current rain/weather status: ${rainIntensity || "Heavy rain & blazing UV"}.

Provide a quirky, practical and hilarious step-by-step sheltered walking route strategy avoiding rain and sun!
Output JSON:
{
  "shelterRating": number (between 70 and 99),
  "quirkyTip": "Hilarious tip on using void decks, MRT underpasses, or dodging bus stop gaps",
  "landmarks": ["Step 1: MRT Underground Link", "Step 2: Cut through Aircon Mall", "Step 3: Sprint 10m across uncovered road gap", "Step 4: Safe arrival at Void Deck"],
  "singlishVerdict": "100% DRY GUARANTEED (except 3 steps)"
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        if (response.text) {
          return res.json(JSON.parse(response.text));
        }
      }

      res.json({
        shelterRating: 88,
        quirkyTip: "Walk strictly along the HDB block void deck edge and draft behind an auntie with a giant floral umbrella.",
        landmarks: [
          `Cut through ${startLoc} MRT underpass (100% dry)`,
          "Enter connected shopping mall to enjoy free aircon & shelter (100% dry)",
          "Follow the LTA covered walkway linkway towards HDB cluster (95% dry)",
          `Perform the classic 5-second Singaporean sprint to reach ${endLoc}`
        ],
        singlishVerdict: "AUNTIE-APPROVED 90% DRY ROUTE",
      });
    } catch (err: any) {
      res.json({
        shelterRating: 85,
        quirkyTip: "Use HDB void decks like Pac-Man tunnels to avoid both raindrops and UV rays.",
        landmarks: [
          "MRT station underground exit",
          "Continuous covered linkway",
          "Cut through multi-storey carpark level 1",
          "Direct covered porch entrance"
        ],
        singlishVerdict: "SOLID SHELTER STRATEGY",
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Live Weather & Umbrella Oracle running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
