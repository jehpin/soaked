import { Router, Request, Response } from "express";
import {
  fetchWithCache,
  calculateUmbrellaScore,
  FALLBACK_TOWNS,
  QUIRKY_HOT_TAKES_BANK,
} from "./weather";
import {
  getGeminiApiKey,
  generateHotTake,
  generateShelteredRoute,
  generateHourlyAnalysis,
} from "./gemini";

export const apiRouter = Router();

// Health check
apiRouter.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ==========================================
// 1. API: 5-Minute Station Rainfall (v2 host, wrapped responses)
// https://api-open.data.gov.sg/v2/real-time/api/rainfall
// ==========================================
apiRouter.get("/weather/rainfall", async (req: Request, res: Response) => {
  try {
    const data = await fetchWithCache<any>(
      "rainfall-v2",
      "https://api-open.data.gov.sg/v2/real-time/api/rainfall"
    );
    if (data && data.data) {
      const payload = data.data;
      const readings = payload.readings?.[0]?.data || [];
      return res.json({
        success: true,
        version: "v2",
        apiEndpoint: "https://api-open.data.gov.sg/v2/real-time/api/rainfall",
        code: data.code ?? 0,
        data: payload,
        stations: payload.stations || [],
        readings: readings,
        timestamp: payload.readings?.[0]?.timestamp || new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("rainfall v2 fallback triggered", e);
  }
  res.json({
    success: true,
    version: "v2-fallback",
    stations: [{ id: "S218", name: "Bukit Batok Street 34", location: { latitude: 1.3649, longitude: 103.7506 } }],
    readings: [{ stationId: "S218", value: 0.0 }],
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 2. API: UV Index (v2 host, wrapped responses)
// https://api-open.data.gov.sg/v2/real-time/api/uv
// ==========================================
apiRouter.get("/weather/uv-index", async (req: Request, res: Response) => {
  try {
    const data = await fetchWithCache<any>(
      "uv-v2",
      "https://api-open.data.gov.sg/v2/real-time/api/uv"
    );
    if (data && data.data) {
      const payload = data.data;
      const records = payload.records?.[0]?.index || [];
      const latest = records[0] || { value: 6, hour: new Date().toISOString() };
      return res.json({
        success: true,
        version: "v2",
        apiEndpoint: "https://api-open.data.gov.sg/v2/real-time/api/uv",
        code: data.code ?? 0,
        data: payload,
        latestUV: latest.value,
        timestamp: latest.hour,
        records: records,
      });
    }
  } catch (e) {
    console.warn("uv v2 fallback triggered", e);
  }
  const hour = new Date().getHours();
  const mockUV = hour >= 11 && hour <= 15 ? 9.0 : hour >= 8 && hour <= 17 ? 5.5 : 0;
  res.json({
    success: true,
    version: "v2-fallback",
    latestUV: mockUV,
    timestamp: new Date().toISOString(),
    records: [{ value: mockUV, hour: new Date().toISOString() }],
  });
});

// ==========================================
// 3. API: 2-Hour Weather Forecast (v2 host)
// https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast
// ==========================================
apiRouter.get("/weather/2hr-forecast", async (req: Request, res: Response) => {
  try {
    const data = await fetchWithCache<any>(
      "forecast-2hr-v2",
      "https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast"
    );
    if (data && data.data) {
      const payload = data.data;
      const forecasts = payload.items?.[0]?.forecasts || FALLBACK_TOWNS;
      return res.json({
        success: true,
        version: "v2",
        apiEndpoint: "https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast",
        code: data.code ?? 0,
        data: payload,
        area_metadata: payload.area_metadata || [],
        valid_period: payload.items?.[0]?.valid_period,
        forecasts: forecasts,
      });
    }
  } catch (e) {
    console.warn("2hr-forecast v2 fallback triggered", e);
  }
  res.json({
    success: true,
    version: "v2-fallback",
    apiEndpoint: "https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast",
    forecasts: FALLBACK_TOWNS,
    area_metadata: [],
  });
});

// ==========================================
// 4. API: 24-Hour Weather Forecast (v2 host)
// https://api-open.data.gov.sg/v2/real-time/api/twenty-four-hr-forecast
// ==========================================
apiRouter.get("/weather/24hr-forecast", async (req: Request, res: Response) => {
  try {
    const data = await fetchWithCache<any>(
      "forecast-24hr-v2",
      "https://api-open.data.gov.sg/v2/real-time/api/twenty-four-hr-forecast"
    );
    if (data && data.data) {
      const payload = data.data;
      const record = payload.records?.[0];
      return res.json({
        success: true,
        version: "v2",
        apiEndpoint: "https://api-open.data.gov.sg/v2/real-time/api/twenty-four-hr-forecast",
        code: data.code ?? 0,
        data: payload,
        general: record?.general,
        periods: record?.periods || [],
      });
    }
  } catch (e) {
    console.warn("24hr-forecast v2 fallback triggered", e);
  }
  res.json({
    success: true,
    version: "v2-fallback",
    general: {
      forecast: { text: "Partly Cloudy (Day)", code: "PC" },
      relativeHumidity: { low: 65, high: 95 },
      temperature: { low: 25, high: 34 },
      wind: { speed: { low: 10, high: 25 }, direction: "SSE" },
    },
    periods: [],
  });
});

// ==========================================
// 5. API: 4-Day Weather Outlook (v2 host)
// https://api-open.data.gov.sg/v2/real-time/api/four-day-outlook
// ==========================================
apiRouter.get("/weather/4day-outlook", async (req: Request, res: Response) => {
  try {
    const data = await fetchWithCache<any>(
      "forecast-4day-v2",
      "https://api-open.data.gov.sg/v2/real-time/api/four-day-outlook"
    );
    if (data && data.data) {
      const payload = data.data;
      const forecasts = payload.records?.[0]?.forecasts || [];
      return res.json({
        success: true,
        version: "v2",
        apiEndpoint: "https://api-open.data.gov.sg/v2/real-time/api/four-day-outlook",
        code: data.code ?? 0,
        data: payload,
        forecasts: forecasts,
      });
    }
  } catch (e) {
    console.warn("4day-outlook v2 fallback triggered", e);
  }
  res.json({
    success: true,
    version: "v2-fallback",
    forecasts: [
      { day: "Friday", forecast: { text: "Thundery Showers", code: "TL" }, temperature: { low: 25, high: 33 } },
      { day: "Saturday", forecast: { text: "Moderate Rain", code: "RA" }, temperature: { low: 25, high: 32 } },
      { day: "Sunday", forecast: { text: "Passing Showers", code: "SH" }, temperature: { low: 24, high: 32 } },
      { day: "Monday", forecast: { text: "Partly Cloudy (Day)", code: "PC" }, temperature: { low: 26, high: 34 } },
    ],
  });
});

// ==========================================
// 6. API: Air Temperature (v2 host)
// https://api-open.data.gov.sg/v2/real-time/api/air-temperature
// ==========================================
apiRouter.get("/weather/temperature", async (req: Request, res: Response) => {
  try {
    const data = await fetchWithCache<any>(
      "temperature-v2",
      "https://api-open.data.gov.sg/v2/real-time/api/air-temperature"
    );
    if (data && data.data) {
      const payload = data.data;
      const readings = payload.readings?.[0]?.data || [];
      return res.json({
        success: true,
        version: "v2",
        apiEndpoint: "https://api-open.data.gov.sg/v2/real-time/api/air-temperature",
        code: data.code ?? 0,
        data: payload,
        stations: payload.stations || [],
        readings: readings,
        timestamp: payload.readings?.[0]?.timestamp || new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("temperature v2 fallback triggered", e);
  }
  res.json({
    success: true,
    version: "v2-fallback",
    stations: [{ id: "S109", name: "Ang Mo Kio Avenue 5", location: { latitude: 1.3793, longitude: 103.85 } }],
    readings: [{ stationId: "S109", value: 31.9 }],
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 7. API: PSI (v2 host)
// https://api-open.data.gov.sg/v2/real-time/api/psi
// ==========================================
apiRouter.get("/weather/psi", async (req: Request, res: Response) => {
  try {
    const data = await fetchWithCache<any>(
      "psi-v2",
      "https://api-open.data.gov.sg/v2/real-time/api/psi"
    );
    if (data && data.data) {
      const payload = data.data;
      const item = payload.items?.[0];
      return res.json({
        success: true,
        version: "v2",
        apiEndpoint: "https://api-open.data.gov.sg/v2/real-time/api/psi",
        code: data.code ?? 0,
        data: payload,
        regionMetadata: payload.regionMetadata || [],
        readings: item?.readings || {},
        psiTwentyFourHourly: item?.readings?.psi_twenty_four_hourly || { west: 65, east: 64, central: 68, north: 59, south: 61, national: 68 },
        timestamp: item?.timestamp || new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("psi v2 fallback triggered", e);
  }
  res.json({
    success: true,
    version: "v2-fallback",
    psiTwentyFourHourly: { west: 65, east: 64, central: 68, north: 59, south: 61, national: 68 },
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 8. API: PM2.5 (v2 host)
// https://api-open.data.gov.sg/v2/real-time/api/pm25
// ==========================================
apiRouter.get("/weather/pm25", async (req: Request, res: Response) => {
  try {
    const data = await fetchWithCache<any>(
      "pm25-v2",
      "https://api-open.data.gov.sg/v2/real-time/api/pm25"
    );
    if (data && data.data) {
      const payload = data.data;
      const item = payload.items?.[0];
      return res.json({
        success: true,
        version: "v2",
        apiEndpoint: "https://api-open.data.gov.sg/v2/real-time/api/pm25",
        code: data.code ?? 0,
        data: payload,
        regionMetadata: payload.regionMetadata || [],
        pm25OneHourly: item?.readings?.pm25_one_hourly || { north: 30, east: 36, central: 46, west: 28, south: 24 },
        timestamp: item?.timestamp || new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("pm25 v2 fallback triggered", e);
  }
  res.json({
    success: true,
    version: "v2-fallback",
    pm25OneHourly: { north: 30, east: 36, central: 46, west: 28, south: 24 },
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 9. API: Relative Humidity (v2 host)
// https://api-open.data.gov.sg/v2/real-time/api/relative-humidity
// ==========================================
apiRouter.get("/weather/humidity", async (req: Request, res: Response) => {
  try {
    const data = await fetchWithCache<any>(
      "humidity-v2",
      "https://api-open.data.gov.sg/v2/real-time/api/relative-humidity"
    );
    if (data && data.data) {
      const payload = data.data;
      const readings = payload.readings?.[0]?.data || [];
      return res.json({
        success: true,
        version: "v2",
        apiEndpoint: "https://api-open.data.gov.sg/v2/real-time/api/relative-humidity",
        code: data.code ?? 0,
        data: payload,
        stations: payload.stations || [],
        readings: readings,
        timestamp: payload.readings?.[0]?.timestamp || new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("humidity v2 fallback triggered", e);
  }
  res.json({
    success: true,
    version: "v2-fallback",
    readings: [{ stationId: "S109", value: 78 }],
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 10. API: Wind Speed (v2 host)
// https://api-open.data.gov.sg/v2/real-time/api/wind-speed
// ==========================================
apiRouter.get("/weather/wind-speed", async (req: Request, res: Response) => {
  try {
    const data = await fetchWithCache<any>(
      "wind-speed-v2",
      "https://api-open.data.gov.sg/v2/real-time/api/wind-speed"
    );
    if (data && data.data) {
      const payload = data.data;
      const readings = payload.readings?.[0]?.data || [];
      return res.json({
        success: true,
        version: "v2",
        apiEndpoint: "https://api-open.data.gov.sg/v2/real-time/api/wind-speed",
        code: data.code ?? 0,
        data: payload,
        stations: payload.stations || [],
        speedReadings: readings,
        timestamp: payload.readings?.[0]?.timestamp || new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("wind-speed v2 fallback triggered", e);
  }
  res.json({
    success: true,
    version: "v2-fallback",
    speedReadings: [{ stationId: "S109", value: 7.5 }],
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 11. API: Carpark Availability (v1 host ONLY - bare response)
// https://api.data.gov.sg/v1/transport/carpark-availability
// ==========================================
apiRouter.get("/transport/carpark-availability", async (req: Request, res: Response) => {
  try {
    const data = await fetchWithCache<any>(
      "carpark-v1",
      "https://api.data.gov.sg/v1/transport/carpark-availability"
    );
    if (data && data.items && data.items[0]) {
      const carparkList = data.items[0].carpark_data || [];
      let totalLots = 0;
      let availableLots = 0;
      for (const cp of carparkList) {
        if (Array.isArray(cp.carpark_info)) {
          for (const info of cp.carpark_info) {
            totalLots += parseInt(info.total_lots || "0", 10) || 0;
            availableLots += parseInt(info.lots_available || "0", 10) || 0;
          }
        }
      }
      return res.json({
        success: true,
        version: "v1",
        apiEndpoint: "https://api.data.gov.sg/v1/transport/carpark-availability",
        totalCarparks: carparkList.length,
        totalLotsIslandwide: totalLots,
        availableLotsIslandwide: availableLots,
        timestamp: data.items[0].timestamp || new Date().toISOString(),
        sampleCarparks: carparkList.slice(0, 50),
        carpark_data: carparkList,
      });
    }
  } catch (e) {
    console.warn("carpark v1 fallback triggered", e);
  }
  res.json({
    success: true,
    version: "v1-fallback",
    totalCarparks: 2020,
    totalLotsIslandwide: 450000,
    availableLotsIslandwide: 165000,
    timestamp: new Date().toISOString(),
    sampleCarparks: [],
  });
});

// ==========================================
// 12. API: Taxi Availability (v1 host ONLY - GeoJSON FeatureCollection)
// https://api.data.gov.sg/v1/transport/taxi-availability
// ==========================================
apiRouter.get("/transport/taxi-availability", async (req: Request, res: Response) => {
  try {
    const data = await fetchWithCache<any>(
      "taxi-v1",
      "https://api.data.gov.sg/v1/transport/taxi-availability"
    );
    if (data && data.features && data.features[0]) {
      const feat = data.features[0];
      const coordinates = feat.geometry?.coordinates || [];
      const taxiCount = feat.properties?.taxi_count || coordinates.length;
      const timestamp = feat.properties?.timestamp || new Date().toISOString();
      return res.json({
        success: true,
        version: "v1",
        apiEndpoint: "https://api.data.gov.sg/v1/transport/taxi-availability",
        taxiCount,
        timestamp,
        sampleLocations: coordinates.slice(0, 30).map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng })),
        type: data.type,
        features: data.features,
      });
    }
  } catch (e) {
    console.warn("taxi v1 fallback triggered", e);
  }
  res.json({
    success: true,
    version: "v1-fallback",
    taxiCount: 1950,
    timestamp: new Date().toISOString(),
    sampleLocations: [],
  });
});

// ==========================================
// 13. API: Geospatial Radar & Rainfall Stations Map
// ==========================================
apiRouter.get("/weather/radar-stations", async (req: Request, res: Response) => {
  try {
    const rainfallData = await fetchWithCache<any>(
      "rainfall-v2",
      "https://api-open.data.gov.sg/v2/real-time/api/rainfall"
    );
    const tempData = await fetchWithCache<any>(
      "temperature-v2",
      "https://api-open.data.gov.sg/v2/real-time/api/air-temperature"
    );

    const stations = rainfallData?.data?.stations || [];
    const readings = rainfallData?.data?.readings?.[0]?.data || [];
    const tempReadings = tempData?.data?.readings?.[0]?.data || [];

    const mergedStations = (stations.length > 0 ? stations : [
      { id: "S109", name: "Ang Mo Kio Avenue 5", location: { latitude: 1.3793, longitude: 103.85 } },
      { id: "S117", name: "Banyan Road", location: { latitude: 1.2542, longitude: 103.6741 } },
      { id: "S107", name: "East Coast Parkway", location: { latitude: 1.3133, longitude: 103.962 } },
      { id: "S218", name: "Bukit Batok Street 34", location: { latitude: 1.3649, longitude: 103.7506 } },
      { id: "S216", name: "Ang Mo Kio Avenue 10", location: { latitude: 1.3601, longitude: 103.8533 } },
    ]).map((s: any) => {
      const r = readings.find((item: any) => item.stationId === s.id);
      const t = tempReadings.find((item: any) => item.stationId === s.id);
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
      timestamp: rainfallData?.data?.readings?.[0]?.timestamp || new Date().toISOString(),
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
        { id: "S109", name: "Ang Mo Kio Avenue 5", latitude: 1.3793, longitude: 103.85, rainfallMm: 0, temperature: 31.9, hasRain: false },
        { id: "S218", name: "Bukit Batok Street 34", latitude: 1.3649, longitude: 103.7506, rainfallMm: 0, temperature: 31.5, hasRain: false },
      ],
    });
  }
});

// ==========================================
// 14. Master Aggregated Live Singapore Weather API
// ==========================================
apiRouter.get("/weather/live", async (req: Request, res: Response) => {
  try {
    const requestedArea = (req.query.area as string) || "Jurong West";

    // Parallel fetch all real-time feeds safely (v2 weather + v1 transport + v2 air quality)
    const [forecastData, rainfallData, uvData, tempData, windData, humidityData, psiData, pm25Data, taxiData] =
      await Promise.all([
        fetchWithCache<any>("forecast-2hr-v2", "https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast"),
        fetchWithCache<any>("rainfall-v2", "https://api-open.data.gov.sg/v2/real-time/api/rainfall"),
        fetchWithCache<any>("uv-v2", "https://api-open.data.gov.sg/v2/real-time/api/uv"),
        fetchWithCache<any>("temperature-v2", "https://api-open.data.gov.sg/v2/real-time/api/air-temperature"),
        fetchWithCache<any>("wind-speed-v2", "https://api-open.data.gov.sg/v2/real-time/api/wind-speed"),
        fetchWithCache<any>("humidity-v2", "https://api-open.data.gov.sg/v2/real-time/api/relative-humidity"),
        fetchWithCache<any>("psi-v2", "https://api-open.data.gov.sg/v2/real-time/api/psi"),
        fetchWithCache<any>("pm25-v2", "https://api-open.data.gov.sg/v2/real-time/api/pm25"),
        fetchWithCache<any>("taxi-v1", "https://api.data.gov.sg/v1/transport/taxi-availability"),
      ]);

    // Process Towns Forecast (v2 format)
    let towns: { area: string; forecast: string }[] = FALLBACK_TOWNS;
    let timestamp = new Date().toISOString();
    let updateTime = "Just now";

    if (forecastData && forecastData.data && forecastData.data.items && forecastData.data.items[0]) {
      const item = forecastData.data.items[0];
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
      towns[0] || { area: requestedArea, forecast: "Partly Cloudy (Day)" };

    // Process UV (v2 format: records[0].index[0].value)
    let uvValue = 6;
    let uvTimestamp = new Date().toISOString();
    if (
      uvData &&
      uvData.data &&
      uvData.data.records &&
      uvData.data.records[0] &&
      Array.isArray(uvData.data.records[0].index) &&
      uvData.data.records[0].index.length > 0
    ) {
      const latestUV = uvData.data.records[0].index[0];
      uvValue = latestUV.value ?? 6;
      uvTimestamp = latestUV.hour || uvTimestamp;
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

    // Process Rainfall (v2 format: readings[0].data -> [{ stationId, value }])
    let rainfallMm = 0;
    let stationName = "Bukit Batok Telemetry";
    if (rainfallData && rainfallData.data && rainfallData.data.readings && rainfallData.data.readings[0]) {
      const readings = rainfallData.data.readings[0].data || [];
      const stationsMeta = rainfallData.data.stations || [];
      
      const activeReading = readings.find((r: any) => r.value > 0) || readings[0];
      if (activeReading) {
        rainfallMm = activeReading.value || 0;
        const meta = stationsMeta.find((s: any) => s.id === activeReading.stationId);
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

    // Process Temperature (v2 format)
    let temperature = 31.9;
    if (tempData?.data?.readings?.[0]?.data?.[0]) {
      temperature = tempData.data.readings[0].data[0].value || 31.9;
    }

    // Process Wind (v2 format)
    let windSpeed = 7.5;
    if (windData?.data?.readings?.[0]?.data?.[0]) {
      windSpeed = windData.data.readings[0].data[0].value || 7.5;
    }

    // Process Humidity (v2 format)
    let humidity = 78;
    if (humidityData?.data?.readings?.[0]?.data?.[0]) {
      humidity = humidityData.data.readings[0].data[0].value || 78;
    }

    // Process PSI & PM2.5 (v2 format)
    const psiValues = psiData?.data?.items?.[0]?.readings?.psi_twenty_four_hourly || { west: 65, east: 64, central: 68, north: 59, south: 61, national: 68 };
    const pm25Values = pm25Data?.data?.items?.[0]?.readings?.pm25_one_hourly || { north: 30, east: 36, central: 46, west: 28, south: 24 };

    // Process Taxi Availability (v1 format)
    const availableTaxis = taxiData?.features?.[0]?.properties?.taxi_count || taxiData?.features?.[0]?.geometry?.coordinates?.length || 1937;

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
      airQuality: {
        psi24Hr: psiValues,
        pm25_1Hr: pm25Values,
        overallPsi: psiValues.national || psiValues.central || 65,
        overallPm25: pm25Values.central || 35,
        status: (psiValues.national || 65) <= 50 ? "Good" : (psiValues.national || 65) <= 100 ? "Moderate" : "Unhealthy",
      },
      transport: {
        availableTaxis,
        rainRushStatus: rainfallMm > 0 ? "High Taxi Demand (Wet Rush)" : "Normal Taxi Availability",
      },
      umbrellaScore,
      sunscreenScore,
      verdict,
      hotTake: randomHotTake,
      source: forecastData ? "live_data_gov_sg_v2" : "fallback",
      endpoints: {
        v2_rainfall: "https://api-open.data.gov.sg/v2/real-time/api/rainfall",
        v2_uv: "https://api-open.data.gov.sg/v2/real-time/api/uv",
        v2_forecast_2hr: "https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast",
        v2_forecast_24hr: "https://api-open.data.gov.sg/v2/real-time/api/twenty-four-hr-forecast",
        v2_outlook_4day: "https://api-open.data.gov.sg/v2/real-time/api/four-day-outlook",
        v2_temperature: "https://api-open.data.gov.sg/v2/real-time/api/air-temperature",
        v2_psi: "https://api-open.data.gov.sg/v2/real-time/api/psi",
        v2_pm25: "https://api-open.data.gov.sg/v2/real-time/api/pm25",
        v2_humidity: "https://api-open.data.gov.sg/v2/real-time/api/relative-humidity",
        v2_wind_speed: "https://api-open.data.gov.sg/v2/real-time/api/wind-speed",
        v1_carpark: "https://api.data.gov.sg/v1/transport/carpark-availability",
        v1_taxi: "https://api.data.gov.sg/v1/transport/taxi-availability",
      },
    });
  } catch (err: any) {
    console.warn("[Weather Live Aggregator Fallback]:", err);
    const fallbackResult = calculateUmbrellaScore("Partly Cloudy", 0, 6, 8, 78);
    res.json({
      timestamp: new Date().toISOString(),
      updateTime: "Just now",
      selectedArea: "Jurong West",
      selectedForecast: "Partly Cloudy (Day)",
      towns: FALLBACK_TOWNS,
      uvIndex: { value: 6, timestamp: new Date().toISOString(), status: "Moderate" },
      nearestRainfall: { stationName: "Bukit Batok Telemetry", rainfallMm: 0, status: "Bone Dry" },
      temperature: 31.9,
      humidity: 78,
      windSpeed: 7.5,
      airQuality: {
        psi24Hr: { west: 65, east: 64, central: 68, north: 59, south: 61, national: 68 },
        pm25_1Hr: { north: 30, east: 36, central: 46, west: 28, south: 24 },
        overallPsi: 65,
        overallPm25: 35,
        status: "Moderate",
      },
      transport: {
        availableTaxis: 1937,
        rainRushStatus: "Normal Taxi Availability",
      },
      umbrellaScore: fallbackResult.score,
      sunscreenScore: 57,
      verdict: fallbackResult.verdict,
      hotTake: QUIRKY_HOT_TAKES_BANK[0],
      source: "fallback",
    });
  }
});

// ==========================================
// 15. API: Umbrella Score Calculation Simulator
// ==========================================
apiRouter.post("/weather/calculate-index", (req: Request, res: Response) => {
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
// 16. API: Gemini AI Quirky Hot Take & Excuse Generator
// Guardrail: If credential is missing at runtime, return HTTP 500 {"error":"credential not configured"}
// ==========================================
apiRouter.post("/gemini/hot-take", async (req: Request, res: Response) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: "credential not configured" });
  }

  try {
    const data = await generateHotTake(req.body || {});
    return res.json(data);
  } catch (err: any) {
    if (err?.message === "CREDENTIAL_NOT_CONFIGURED") {
      return res.status(500).json({ error: "credential not configured" });
    }
    console.warn("[Gemini Hot Take Error]:", err?.message);
    // Fallback response for transient timeouts
    return res.json({
      headline: "Crispy Roasted Human Alert!",
      body: `UV is high! If you walk under direct sunlight without umbrella, you will become medium-rare char siew.`,
      singlishVerdict: "TAKE UV BROLLY LAH",
      excuseForBoss: "Boss, UV index exceeded my skin's warranty, had to seek emergency shelter.",
    });
  }
});

// ==========================================
// 17. API: Sheltered Route Advisor
// Guardrail: If credential is missing at runtime, return HTTP 500 {"error":"credential not configured"}
// ==========================================
apiRouter.post("/gemini/sheltered-route", async (req: Request, res: Response) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: "credential not configured" });
  }

  try {
    const data = await generateShelteredRoute(req.body || {});
    return res.json(data);
  } catch (err: any) {
    if (err?.message === "CREDENTIAL_NOT_CONFIGURED") {
      return res.status(500).json({ error: "credential not configured" });
    }
    console.warn("[Gemini Sheltered Route Error]:", err?.message);
    const { origin = "Jurong East MRT", destination = "Jem & Westgate" } = req.body || {};
    return res.json({
      shelterRating: 92,
      quirkyTip: "Walk strictly along the HDB block void deck edge and draft behind an auntie with a giant floral umbrella.",
      landmarks: [
        `Cut through ${origin} MRT underpass (100% dry)`,
        "Enter connected shopping mall to enjoy free aircon & shelter (100% dry)",
        "Follow the LTA covered walkway linkway towards HDB cluster (95% dry)",
        `Perform the classic 5-second Singaporean sprint to reach ${destination}`
      ],
      singlishVerdict: "AUNTIE-APPROVED 90%+ DRY ROUTE",
    });
  }
});

// ==========================================
// 18. API: Hourly Breakdown Analysis
// Guardrail: If credential is missing at runtime, return HTTP 500 {"error":"credential not configured"}
// ==========================================
apiRouter.post("/gemini/hourly-analysis", async (req: Request, res: Response) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: "credential not configured" });
  }

  try {
    const data = await generateHourlyAnalysis(req.body || {});
    return res.json(data);
  } catch (err: any) {
    if (err?.message === "CREDENTIAL_NOT_CONFIGURED") {
      return res.status(500).json({ error: "credential not configured" });
    }
    console.warn("[Gemini Hourly Analysis Error]:", err?.message);
    const currentScore = Number(req.body?.currentScore || 65);
    return res.json({
      hourly: [
        { hour: "+1 hr", umbrellaRisk: Math.min(100, Math.max(10, currentScore + 10)), recommendation: "Rain clouds building up over Western reservoir", icon: "rain" },
        { hour: "+2 hr", umbrellaRisk: Math.min(100, Math.max(10, currentScore + 20)), recommendation: "Peak rain risk! Carry brolly without fail", icon: "thunder" },
        { hour: "+3 hr", umbrellaRisk: Math.max(10, currentScore - 15), recommendation: "Shower dissipating into tropical steam", icon: "cloud" },
        { hour: "+4 hr", umbrellaRisk: 75, recommendation: "Blazing UV 9+! Sun umbrella required", icon: "sun" },
        { hour: "+5 hr", umbrellaRisk: 35, recommendation: "Cool evening breeze setting in", icon: "fair" },
        { hour: "+6 hr", umbrellaRisk: 20, recommendation: "Low rain risk for dinner run", icon: "fair" },
      ],
    });
  }
});
