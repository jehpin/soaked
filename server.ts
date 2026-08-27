import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Lazy Gemini API Client Initialization
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const cache: Record<string, CacheItem<any>> = {};
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

async function fetchWithCache<T>(key: string, url: string, fallbackData?: T): Promise<T | null> {
  const cached = cache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; UmbrellaOracleApp/1.0)",
        Accept: "application/json",
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[WeatherAPI] ${url} returned status ${res.status}`);
      if (cached) return cached.data as T;
      return fallbackData || null;
    }
    const data = await res.json();
    cache[key] = { data, timestamp: Date.now() };
    return data as T;
  } catch (err) {
    console.warn(`[WeatherAPI Warning] Failed to fetch ${url}, using cached/fallback:`, err);
    if (cached) return cached.data as T;
    return fallbackData || null;
  }
}

// Fallback SG Towns data
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

function calculateUmbrellaScore(
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

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // ==========================================
  // 1. API: 2-Hour Weather Forecast
  // ==========================================
  app.get("/api/weather/2hr-forecast", async (req, res) => {
    try {
      const data = await fetchWithCache<any>(
        "forecast-2hr",
        "https://api.data.gov.sg/v1/environment/2-hour-weather-forecast"
      );
      if (data && data.items) {
        return res.json({
          success: true,
          datasetId: "d_6580738cdd7db79374ed3152159fbd69",
          apiEndpoint: "https://api.data.gov.sg/v1/environment/2-hour-weather-forecast",
          items: data.items,
          area_metadata: data.area_metadata || [],
          valid_period: data.items?.[0]?.valid_period,
          forecasts: data.items?.[0]?.forecasts || FALLBACK_TOWNS,
        });
      }
    } catch (e) {
      console.warn("2hr-forecast fallback triggered", e);
    }
    res.json({
      success: true,
      source: "fallback",
      forecasts: FALLBACK_TOWNS,
      area_metadata: [],
    });
  });

  // ==========================================
  // 2. API: Rainfall Readings
  // ==========================================
  app.get("/api/weather/rainfall", async (req, res) => {
    try {
      const data = await fetchWithCache<any>(
        "rainfall",
        "https://api.data.gov.sg/v1/environment/rainfall"
      );
      if (data && data.items) {
        return res.json({
          success: true,
          datasetId: "d_1b676cd174a9af4704fdb3f9aa58ff5e",
          apiEndpoint: "https://api.data.gov.sg/v1/environment/rainfall",
          metadata: data.metadata,
          stations: data.metadata?.stations || [],
          readings: data.items?.[0]?.readings || [],
          timestamp: data.items?.[0]?.timestamp || new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn("rainfall fallback triggered", e);
    }
    res.json({
      success: true,
      source: "fallback",
      stations: [{ id: "S109", name: "Clementi Road", location: { latitude: 1.32, longitude: 103.77 } }],
      readings: [{ station_id: "S109", value: 0.0 }],
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // 3. API: UV Index
  // ==========================================
  app.get("/api/weather/uv-index", async (req, res) => {
    try {
      const data = await fetchWithCache<any>(
        "uv-index",
        "https://api.data.gov.sg/v1/environment/uv-index"
      );
      if (data && data.items && data.items[0]) {
        const records = data.items[0].index || [];
        const latest = records[records.length - 1] || { value: 6, timestamp: new Date().toISOString() };
        return res.json({
          success: true,
          apiEndpoint: "https://api.data.gov.sg/v1/environment/uv-index",
          latestUV: latest.value,
          timestamp: latest.timestamp,
          records,
        });
      }
    } catch (e) {
      console.warn("uv-index fallback triggered", e);
    }
    const hour = new Date().getHours();
    const mockUV = hour >= 11 && hour <= 15 ? 9.0 : hour >= 8 && hour <= 17 ? 5.5 : 0;
    res.json({
      success: true,
      source: "fallback",
      latestUV: mockUV,
      timestamp: new Date().toISOString(),
      records: [{ value: mockUV, timestamp: new Date().toISOString() }],
    });
  });

  // ==========================================
  // 4. API: Air Temperature
  // ==========================================
  app.get("/api/weather/temperature", async (req, res) => {
    try {
      const data = await fetchWithCache<any>(
        "temperature",
        "https://api.data.gov.sg/v1/environment/air-temperature"
      );
      if (data && data.items) {
        return res.json({
          success: true,
          apiEndpoint: "https://api.data.gov.sg/v1/environment/air-temperature",
          metadata: data.metadata,
          readings: data.items?.[0]?.readings || [],
          timestamp: data.items?.[0]?.timestamp,
        });
      }
    } catch (e) {
      console.warn("temperature fallback triggered", e);
    }
    res.json({
      success: true,
      source: "fallback",
      readings: [{ station_id: "S109", value: 31.5 }],
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // 5. API: Relative Humidity
  // ==========================================
  app.get("/api/weather/humidity", async (req, res) => {
    try {
      const data = await fetchWithCache<any>(
        "humidity",
        "https://api.data.gov.sg/v1/environment/relative-humidity"
      );
      if (data && data.items) {
        return res.json({
          success: true,
          apiEndpoint: "https://api.data.gov.sg/v1/environment/relative-humidity",
          metadata: data.metadata,
          readings: data.items?.[0]?.readings || [],
          timestamp: data.items?.[0]?.timestamp,
        });
      }
    } catch (e) {
      console.warn("humidity fallback triggered", e);
    }
    res.json({
      success: true,
      source: "fallback",
      readings: [{ station_id: "S109", value: 80 }],
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // 6. API: Wind Speed & Direction
  // ==========================================
  app.get("/api/weather/wind-speed", async (req, res) => {
    try {
      const data = await fetchWithCache<any>(
        "wind-speed",
        "https://api.data.gov.sg/v1/environment/wind-speed"
      );
      const dirData = await fetchWithCache<any>(
        "wind-direction",
        "https://api.data.gov.sg/v1/environment/wind-direction"
      );
      return res.json({
        success: true,
        apiEndpoint: "https://api.data.gov.sg/v1/environment/wind-speed",
        speedReadings: data?.items?.[0]?.readings || [{ station_id: "S109", value: 6.5 }],
        directionReadings: dirData?.items?.[0]?.readings || [{ station_id: "S109", value: 160 }],
        timestamp: data?.items?.[0]?.timestamp || new Date().toISOString(),
      });
    } catch (e) {
      console.warn("wind-speed fallback triggered", e);
    }
    res.json({
      success: true,
      source: "fallback",
      speedReadings: [{ station_id: "S109", value: 6.5 }],
      directionReadings: [{ station_id: "S109", value: 160 }],
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // 7. API: 24-Hour Weather Forecast
  // ==========================================
  app.get("/api/weather/24hr-forecast", async (req, res) => {
    try {
      const data = await fetchWithCache<any>(
        "forecast-24hr",
        "https://api.data.gov.sg/v1/environment/24-hour-weather-forecast"
      );
      if (data && data.items) {
        return res.json({
          success: true,
          apiEndpoint: "https://api.data.gov.sg/v1/environment/24-hour-weather-forecast",
          items: data.items,
          general: data.items?.[0]?.general,
          periods: data.items?.[0]?.periods || [],
        });
      }
    } catch (e) {
      console.warn("24hr-forecast fallback triggered", e);
    }
    res.json({
      success: true,
      source: "fallback",
      general: {
        forecast: "Passing Showers",
        relative_humidity: { low: 65, high: 95 },
        temperature: { low: 25, high: 32 },
        wind: { speed: { low: 10, high: 20 }, direction: "SSE" },
      },
      periods: [],
    });
  });

  // ==========================================
  // 8. API: 4-Day Weather Outlook
  // ==========================================
  app.get("/api/weather/4day-outlook", async (req, res) => {
    try {
      const data = await fetchWithCache<any>(
        "forecast-4day",
        "https://api.data.gov.sg/v1/environment/4-day-weather-forecast"
      );
      if (data && data.items && data.items[0]) {
        return res.json({
          success: true,
          apiEndpoint: "https://api.data.gov.sg/v1/environment/4-day-weather-forecast",
          forecasts: data.items[0].forecasts || [],
        });
      }
    } catch (e) {
      console.warn("4day-outlook fallback triggered", e);
    }
    res.json({
      success: true,
      source: "fallback",
      forecasts: [
        { day: "Tomorrow", forecast: "Thundery Showers", temperature: { low: 24, high: 31 } },
        { day: "Day +2", forecast: "Moderate Rain", temperature: { low: 25, high: 32 } },
        { day: "Day +3", forecast: "Passing Showers", temperature: { low: 24, high: 32 } },
        { day: "Day +4", forecast: "Fair (Day)", temperature: { low: 26, high: 33 } },
      ],
    });
  });

  // ==========================================
  // 9. API: Geospatial Radar & Rainfall Stations Map
  // ==========================================
  app.get("/api/weather/radar-stations", async (req, res) => {
    try {
      const rainfallData = await fetchWithCache<any>(
        "rainfall",
        "https://api.data.gov.sg/v1/environment/rainfall"
      );
      const tempData = await fetchWithCache<any>(
        "temperature",
        "https://api.data.gov.sg/v1/environment/air-temperature"
      );

      const stations = rainfallData?.metadata?.stations || [];
      const readings = rainfallData?.items?.[0]?.readings || [];
      const tempReadings = tempData?.items?.[0]?.readings || [];

      const mergedStations = (stations.length > 0 ? stations : [
        { id: "S109", name: "Clementi Road", location: { latitude: 1.32, longitude: 103.77 } },
        { id: "S117", name: "Bantham Road", location: { latitude: 1.30, longitude: 103.75 } },
        { id: "S107", name: "East Coast Parkway", location: { latitude: 1.31, longitude: 103.96 } },
        { id: "S228", name: "Jurong West Street 73", location: { latitude: 1.34, longitude: 103.70 } },
        { id: "S79", name: "Somerset Road", location: { latitude: 1.30, longitude: 103.83 } },
      ]).map((s: any) => {
        const r = readings.find((item: any) => item.station_id === s.id);
        const t = tempReadings.find((item: any) => item.station_id === s.id);
        return {
          id: s.id,
          name: s.name,
          latitude: s.location?.latitude || 1.35,
          longitude: s.location?.longitude || 103.82,
          rainfallMm: r?.value ?? 0,
          temperature: t?.value ?? null,
          hasRain: (r?.value ?? 0) > 0,
        };
      });

      res.json({
        success: true,
        totalStations: mergedStations.length,
        rainActiveStations: mergedStations.filter((s: any) => s.hasRain).length,
        timestamp: rainfallData?.items?.[0]?.timestamp || new Date().toISOString(),
        stations: mergedStations,
      });
    } catch (e) {
      console.warn("radar-stations fallback triggered", e);
      res.json({
        success: true,
        totalStations: 5,
        rainActiveStations: 0,
        timestamp: new Date().toISOString(),
        stations: [
          { id: "S109", name: "Clementi Road", latitude: 1.32, longitude: 103.77, rainfallMm: 0, temperature: 31, hasRain: false },
          { id: "S228", name: "Jurong West", latitude: 1.34, longitude: 103.70, rainfallMm: 0, temperature: 31.5, hasRain: false },
        ],
      });
    }
  });

  // ==========================================
  // 10. Master Aggregated Live Singapore Weather API
  // ==========================================
  app.get("/api/weather/live", async (req, res) => {
    try {
      const requestedArea = (req.query.area as string) || "Jurong West";

      // Parallel fetch all real-time feeds safely
      const [forecastData, rainfallData, uvData, tempData, windData, humidityData] =
        await Promise.all([
          fetchWithCache<any>("forecast-2hr", "https://api.data.gov.sg/v1/environment/2-hour-weather-forecast"),
          fetchWithCache<any>("rainfall", "https://api.data.gov.sg/v1/environment/rainfall"),
          fetchWithCache<any>("uv-index", "https://api.data.gov.sg/v1/environment/uv-index"),
          fetchWithCache<any>("temperature", "https://api.data.gov.sg/v1/environment/air-temperature"),
          fetchWithCache<any>("wind-speed", "https://api.data.gov.sg/v1/environment/wind-speed"),
          fetchWithCache<any>("humidity", "https://api.data.gov.sg/v1/environment/relative-humidity"),
        ]);

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
      const matchedTown =
        towns.find((t) => t.area.toLowerCase() === requestedArea.toLowerCase()) ||
        towns[0] || { area: requestedArea, forecast: "Partly Cloudy" };

      // Process UV
      let uvValue = 6;
      let uvTimestamp = new Date().toISOString();
      if (
        uvData &&
        uvData.items &&
        uvData.items[0] &&
        Array.isArray(uvData.items[0].index) &&
        uvData.items[0].index.length > 0
      ) {
        const latestUV = uvData.items[0].index[uvData.items[0].index.length - 1];
        uvValue = latestUV.value ?? 6;
        uvTimestamp = latestUV.timestamp || uvTimestamp;
      } else {
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
        
        // Pick station with highest rainfall or first valid reading
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

      // Process Humidity
      let humidity = 78;
      if (humidityData?.items?.[0]?.readings?.[0]) {
        humidity = humidityData.items[0].readings[0].value || 78;
      }

      const { score: umbrellaScore, verdict } = calculateUmbrellaScore(
        matchedTown.forecast,
        rainfallMm,
        uvValue,
        windSpeed,
        humidity
      );

      const sunscreenScore = Math.min(100, Math.round(uvValue * 9.5));

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
        humidity,
        windSpeed,
        umbrellaScore,
        sunscreenScore,
        verdict,
        hotTake: randomHotTake,
        source: forecastData ? "live_data_gov_sg" : "fallback",
        datasets: {
          forecast2hr: "d_6580738cdd7db79374ed3152159fbd69",
          rainfall: "d_1b676cd174a9af4704fdb3f9aa58ff5e",
        },
      });
    } catch (err: any) {
      console.warn("[Weather Live Aggregator Fallback]:", err);
      const fallbackResult = calculateUmbrellaScore("Partly Cloudy", 0, 6, 8, 78);
      res.json({
        timestamp: new Date().toISOString(),
        updateTime: "Just now",
        selectedArea: "Jurong West",
        selectedForecast: "Partly Cloudy",
        towns: FALLBACK_TOWNS,
        uvIndex: { value: 6, timestamp: new Date().toISOString(), status: "Moderate" },
        nearestRainfall: { stationName: "Clementi Road", rainfallMm: 0, status: "Bone Dry" },
        temperature: 31.2,
        humidity: 78,
        windSpeed: 7.5,
        umbrellaScore: fallbackResult.score,
        sunscreenScore: 57,
        verdict: fallbackResult.verdict,
        hotTake: QUIRKY_HOT_TAKES_BANK[0],
        source: "fallback",
        datasets: {
          forecast2hr: "d_6580738cdd7db79374ed3152159fbd69",
          rainfall: "d_1b676cd174a9af4704fdb3f9aa58ff5e",
        },
      });
    }
  });

  // ==========================================
  // 11. API: Umbrella Score Calculation Simulator
  // ==========================================
  app.post("/api/weather/calculate-index", (req, res) => {
    const { forecast = "Cloudy", rainfallMm = 0, uvIndex = 6, windSpeed = 8, humidity = 75 } = req.body || {};
    const result = calculateUmbrellaScore(forecast, Number(rainfallMm), Number(uvIndex), Number(windSpeed), Number(humidity));
    res.json({
      success: true,
      input: { forecast, rainfallMm, uvIndex, windSpeed, humidity },
      ...result,
      sunscreenScore: Math.min(100, Math.round(Number(uvIndex) * 9.5)),
    });
  });

  // ==========================================
  // 12. API: Gemini AI Quirky Hot Take & Excuse Generator
  // ==========================================
  app.post("/api/gemini/hot-take", async (req, res) => {
    const { area = "Singapore", forecast = "Cloudy", rainfallMm = 0, uvIndex = 7.5, temperature = 32, umbrellaScore = 75 } = req.body || {};

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

    try {
      const client = getGeminiClient();
      if (client) {
        const prompt = `You are the Singapore Umbrella & UV Oracle, a hilariously quirky, witty, sarcastic Singlish-speaking weather auntie/uncle weather bot.
Current Singapore Weather context:
- Location: ${area}
- 2-Hour Forecast: ${forecast}
- Real-time 5-min Rainfall: ${rainfallMm} mm
- UV Index: ${uvIndex}
- Temperature: ${temperature}°C
- Calculated Umbrella Need Score: ${umbrellaScore}/100

Generate a super funny, quirky, memorable weather hot take / excuse for whether the user MUST bring an umbrella, sunscreen, or avoid walking outside. Include 1-2 witty Singlish particles (lah, lor, sia, chope, char siew, wet chicken, Defcon 1, auntie visor) naturally. Keep it punchy (1 to 2 sentences max!).

Output format (JSON):
{
  "headline": "Short punchy catchphrase (under 7 words)",
  "body": "The hilarious 1-2 sentence breakdown",
  "singlishVerdict": "TAKE IT LAH / SAFE LEH / ROASTING TIME / DANGER",
  "excuseForBoss": "Funny 1-line excuse for being late due to weather"
}`;

        // Add 3-second timeout to prevent stalling
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini timeout")), 3000));
        const genPromise = client.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });

        const response: any = await Promise.race([genPromise, timeoutPromise]);
        const text = response?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return res.json(parsed);
        }
      }
    } catch (err: any) {
      console.warn("[Gemini Hot Take Fallback]:", err?.message);
    }

    const pick = fallbackList[Math.floor(Math.random() * fallbackList.length)];
    res.json(pick);
  });

  // ==========================================
  // 13. API: Sheltered Route Advisor
  // ==========================================
  app.post("/api/gemini/sheltered-route", async (req, res) => {
    const { origin = "Jurong East MRT", destination = "Jem & Westgate", rainIntensity = "Heavy rain & blazing UV" } = req.body || {};

    const fallbackResponse = {
      shelterRating: 92,
      quirkyTip: "Walk strictly along the HDB block void deck edge and draft behind an auntie with a giant floral umbrella.",
      landmarks: [
        `Cut through ${origin} MRT underpass (100% dry)`,
        "Enter connected shopping mall to enjoy free aircon & shelter (100% dry)",
        "Follow the LTA covered walkway linkway towards HDB cluster (95% dry)",
        `Perform the classic 5-second Singaporean sprint to reach ${destination}`
      ],
      singlishVerdict: "AUNTIE-APPROVED 90%+ DRY ROUTE",
    };

    try {
      const client = getGeminiClient();
      if (client) {
        const prompt = `You are the Singapore Master of Sheltered Walking Routes (Underground Linkways, Void Decks, Shopping Mall Tunnels, Covered Walkways Expert).
The user wants to walk from "${origin}" to "${destination}".
Current rain/weather status: ${rainIntensity}.

Provide a quirky, practical and hilarious step-by-step sheltered walking route strategy avoiding rain and sun!
Output JSON:
{
  "shelterRating": number (between 70 and 99),
  "quirkyTip": "Hilarious tip on using void decks, MRT underpasses, or dodging bus stop gaps",
  "landmarks": ["Step 1: MRT Underground Link", "Step 2: Cut through Aircon Mall", "Step 3: Sprint 10m across uncovered road gap", "Step 4: Safe arrival at Void Deck"],
  "singlishVerdict": "100% DRY GUARANTEED (except 3 steps)"
}`;

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini timeout")), 3000));
        const genPromise = client.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });

        const response: any = await Promise.race([genPromise, timeoutPromise]);
        if (response?.text) {
          return res.json(JSON.parse(response.text));
        }
      }
    } catch (err: any) {
      console.warn("[Gemini Sheltered Route Fallback]:", err?.message);
    }

    res.json(fallbackResponse);
  });

  // ==========================================
  // 14. API: Hourly Breakdown Analysis
  // ==========================================
  app.post("/api/gemini/hourly-analysis", async (req, res) => {
    const { area = "Jurong West", currentScore = 65 } = req.body || {};

    const fallbackHourly = {
      hourly: [
        { hour: "+1 hr", umbrellaRisk: Math.min(100, Math.max(10, currentScore + 10)), recommendation: "Rain clouds building up over Western reservoir", icon: "rain" },
        { hour: "+2 hr", umbrellaRisk: Math.min(100, Math.max(10, currentScore + 20)), recommendation: "Peak rain risk! Carry brolly without fail", icon: "thunder" },
        { hour: "+3 hr", umbrellaRisk: Math.max(10, currentScore - 15), recommendation: "Shower dissipating into tropical steam", icon: "cloud" },
        { hour: "+4 hr", umbrellaRisk: 75, recommendation: "Blazing UV 9+! Sun umbrella required", icon: "sun" },
        { hour: "+5 hr", umbrellaRisk: 35, recommendation: "Cool evening breeze setting in", icon: "fair" },
        { hour: "+6 hr", umbrellaRisk: 20, recommendation: "Low rain risk for dinner run", icon: "fair" },
      ],
    };

    try {
      const client = getGeminiClient();
      if (client) {
        const prompt = `Give a 6-hour umbrella need forecast for ${area} in Singapore with current base umbrella score ${currentScore}.
Output JSON format:
{
  "hourly": [
    {"hour": "+1 hr", "umbrellaRisk": 70, "recommendation": "Heavy shower clouds moving in from Malacca Strait", "icon": "rain"},
    {"hour": "+2 hr", "umbrellaRisk": 85, "recommendation": "Flash downpour peak! Stay in office or carry brolly", "icon": "thunder"},
    {"hour": "+3 hr", "umbrellaRisk": 40, "recommendation": "Rain clearing, high humidity evaporation", "icon": "cloud"},
    {"hour": "+4 hr", "umbrellaRisk": 65, "recommendation": "Blazing afternoon UV peak! Switch to sun parasol", "icon": "sun"},
    {"hour": "+5 hr", "umbrellaRisk": 30, "recommendation": "Pleasant evening breeze", "icon": "fair"},
    {"hour": "+6 hr", "umbrellaRisk": 20, "recommendation": "Safe to head home without worry", "icon": "fair"}
  ]
}`;

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini timeout")), 3000));
        const genPromise = client.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });

        const response: any = await Promise.race([genPromise, timeoutPromise]);
        if (response?.text) {
          return res.json(JSON.parse(response.text));
        }
      }
    } catch (err: any) {
      console.warn("[Gemini Hourly Analysis Fallback]:", err?.message);
    }

    res.json(fallbackHourly);
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
