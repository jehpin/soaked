export interface TownForecast {
  area: string;
  forecast: string;
}

export interface RainfallStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  rainfallMm: number;
  temperature?: number | null;
  hasRain: boolean;
}

export interface UVData {
  value: number;
  timestamp: string;
  status: 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';
}

export interface TemperatureReading {
  stationId: string;
  stationName: string;
  value: number; // deg C
}

export interface WindReading {
  stationId: string;
  stationName: string;
  speedKnots: number;
}

export interface SGWeatherData {
  timestamp: string;
  updateTime: string;
  selectedArea: string;
  selectedForecast: string;
  towns: TownForecast[];
  uvIndex: UVData;
  nearestRainfall: {
    stationName: string;
    rainfallMm: number;
    status: 'Bone Dry' | 'Drizzle' | 'Moderate Rain' | 'Pouring Cats & Dogs' | 'Flash Flood Risk';
  };
  temperature: number;
  humidity: number;
  windSpeed: number;
  umbrellaScore: number; // 0 to 100
  sunscreenScore: number; // 0 to 100
  verdict: 'LEAVE IT' | 'PROBABLY OK' | 'CONSIDER BRINGING' | 'TAKE IT!' | 'EMERGENCY BROLLY DEFCON 1';
  hotTake: string;
  source: 'live_data_gov_sg' | 'fallback';
  datasets?: {
    forecast2hr: string;
    rainfall: string;
  };
}

export interface ShelteredRouteAdvice {
  origin: string;
  destination: string;
  shelterRating: number; // 1-100%
  quirkyTip: string;
  landmarks: string[];
  singlishVerdict: string;
}

export interface ExcuseHotTake {
  headline: string;
  body: string;
  singlishVerdict?: string;
  excuseForBoss?: string;
  mood?: 'sassy' | 'panicked' | 'sunny' | 'singlish' | 'dramatic';
  score?: number;
}

export interface HourlyForecastItem {
  hour: string;
  umbrellaRisk: number;
  recommendation: string;
  icon: 'rain' | 'thunder' | 'cloud' | 'sun' | 'fair';
}

export interface FourDayOutlookItem {
  day: string;
  forecast: string;
  temperature: {
    low: number;
    high: number;
  };
}

export interface ApiEndpointSpec {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  endpoint: string;
  datasetId?: string;
  description: string;
  govUrl?: string;
  sampleBody?: any;
}
