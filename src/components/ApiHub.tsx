import React, { useState } from 'react';
import { ApiEndpointSpec } from '../types';
import { playTerminalBeep, playUmbrellaPop, playThunderRumble } from '../utils/audio';
import { 
  Terminal, 
  Send, 
  CheckCircle, 
  ExternalLink, 
  Sparkles, 
  Layers, 
  RefreshCw,
  Database,
  Sliders,
  Car,
  Wind,
  Sun,
  CloudRain,
  ShieldCheck,
  Zap,
  Copy,
  Check
} from 'lucide-react';

const API_CATALOG: ApiEndpointSpec[] = [
  // 1. Weather & environment (v2 host, wrapped responses)
  {
    id: 'forecast-2hr',
    name: '2-Hour Weather Forecast',
    category: 'v2-weather',
    method: 'GET',
    endpoint: '/api/weather/2hr-forecast',
    govUrl: 'https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast',
    version: 'v2 (wrapped)',
    description: 'Real-time localized 2-hr forecasts across all 47 Singapore areas (v2 wrapped schema).',
  },
  {
    id: 'forecast-24hr',
    name: '24-Hour Weather Forecast',
    category: 'v2-weather',
    method: 'GET',
    endpoint: '/api/weather/24hr-forecast',
    govUrl: 'https://api-open.data.gov.sg/v2/real-time/api/twenty-four-hr-forecast',
    version: 'v2 (wrapped)',
    description: 'Islandwide & 5-region (North, South, East, West, Central) 24-hour weather forecast periods.',
  },
  {
    id: 'forecast-4day',
    name: '4-Day Weather Outlook',
    category: 'v2-weather',
    method: 'GET',
    endpoint: '/api/weather/4day-outlook',
    govUrl: 'https://api-open.data.gov.sg/v2/real-time/api/four-day-outlook',
    version: 'v2 (wrapped)',
    description: 'Extended 4-day forecast for long-range planning of monsoon thunderstorms and showers.',
  },
  {
    id: 'air-temperature',
    name: 'Air Temperature Telemetry',
    category: 'v2-weather',
    method: 'GET',
    endpoint: '/api/weather/temperature',
    govUrl: 'https://api-open.data.gov.sg/v2/real-time/api/air-temperature',
    version: 'v2 (wrapped)',
    description: 'Real-time Celsius air temperature readings across official meteorological stations in SG.',
  },
  {
    id: 'rainfall',
    name: '5-Minute Station Rainfall',
    category: 'v2-weather',
    method: 'GET',
    endpoint: '/api/weather/rainfall',
    govUrl: 'https://api-open.data.gov.sg/v2/real-time/api/rainfall',
    version: 'v2 (wrapped)',
    description: 'Real-time rainfall telemetry readings from 60+ weather stations across Singapore.',
  },
  {
    id: 'psi',
    name: 'Pollutant Standards Index (PSI)',
    category: 'v2-weather',
    method: 'GET',
    endpoint: '/api/weather/psi',
    govUrl: 'https://api-open.data.gov.sg/v2/real-time/api/psi',
    version: 'v2 (wrapped)',
    description: '24-hour PSI readings across North, South, East, West, and Central Singapore regions.',
  },
  {
    id: 'pm25',
    name: '1-Hour PM2.5 Telemetry',
    category: 'v2-weather',
    method: 'GET',
    endpoint: '/api/weather/pm25',
    govUrl: 'https://api-open.data.gov.sg/v2/real-time/api/pm25',
    version: 'v2 (wrapped)',
    description: 'Real-time 1-hour particulate matter (PM2.5) concentrations across all SG zones.',
  },
  {
    id: 'uv-index',
    name: 'Ultraviolet Index (UVI)',
    category: 'v2-weather',
    method: 'GET',
    endpoint: '/api/weather/uv-index',
    govUrl: 'https://api-open.data.gov.sg/v2/real-time/api/uv',
    version: 'v2 (wrapped)',
    description: 'Hourly solar UV radiation index to compute sun umbrella & UV-blocking needs.',
  },
  {
    id: 'relative-humidity',
    name: 'Relative Humidity',
    category: 'v2-weather',
    method: 'GET',
    endpoint: '/api/weather/humidity',
    govUrl: 'https://api-open.data.gov.sg/v2/real-time/api/relative-humidity',
    version: 'v2 (wrapped)',
    description: 'Islandwide relative humidity percentages for tropical evaporation dynamics.',
  },
  {
    id: 'wind-speed',
    name: 'Wind Speed & Direction',
    category: 'v2-weather',
    method: 'GET',
    endpoint: '/api/weather/wind-speed',
    govUrl: 'https://api-open.data.gov.sg/v2/real-time/api/wind-speed',
    version: 'v2 (wrapped)',
    description: 'Real-time wind speeds in knots across Singapore stations to assess umbrella inversion risks.',
  },

  // 2. Carparks & taxis (v1 host ONLY - never migrated to v2, bare responses)
  {
    id: 'carpark-availability',
    name: 'HDB / URA Carpark Availability',
    category: 'v1-transport',
    method: 'GET',
    endpoint: '/api/transport/carpark-availability',
    govUrl: 'https://api.data.gov.sg/v1/transport/carpark-availability',
    version: 'v1 (bare)',
    description: 'Real-time parking lot availability across 2,000+ carparks in Singapore (v1 bare format).',
  },
  {
    id: 'taxi-availability',
    name: 'Live Taxi Fleet Availability',
    category: 'v1-transport',
    method: 'GET',
    endpoint: '/api/transport/taxi-availability',
    govUrl: 'https://api.data.gov.sg/v1/transport/taxi-availability',
    version: 'v1 (bare)',
    description: 'GeoJSON coordinates and count of currently available taxis across Singapore for wet-weather rushes.',
  },

  // 3. Composite & AI Intelligence Endpoints
  {
    id: 'live-aggregator',
    name: 'Master Live Weather & Transport Aggregator',
    category: 'composite',
    method: 'GET',
    endpoint: '/api/weather/live?area=Jurong%20West',
    govUrl: 'https://api-open.data.gov.sg/v2/real-time/api/',
    version: 'internal',
    description: 'Multi-source real-time umbrella index combining 2hr forecast, rainfall, UV, wind, PSI, and taxi counts.',
  },
  {
    id: 'radar-stations',
    name: 'Geospatial Radar Stations',
    category: 'composite',
    method: 'GET',
    endpoint: '/api/weather/radar-stations',
    govUrl: 'https://api-open.data.gov.sg/v2/real-time/api/rainfall',
    version: 'internal',
    description: 'Lat/long coordinate matrix with active precipitation detection and temperature overlays.',
  },
  {
    id: 'calculate-index',
    name: 'Dynamic Index Calculator',
    category: 'composite',
    method: 'POST',
    endpoint: '/api/weather/calculate-index',
    govUrl: 'https://api-open.data.gov.sg/v2/real-time/api/',
    version: 'internal',
    description: 'Parametric simulation engine calculating Umbrella Scores for custom weather scenarios.',
    sampleBody: {
      forecast: 'Heavy Thundery Showers',
      rainfallMm: 14.5,
      uvIndex: 9.5,
      windSpeed: 16,
      humidity: 88,
    },
  },
  {
    id: 'gemini-hot-take',
    name: 'Gemini AI Singlish Weather Take & Boss Excuse',
    category: 'gemini-ai',
    method: 'POST',
    endpoint: '/api/gemini/hot-take',
    govUrl: 'https://ai.google.dev/',
    version: 'internal',
    description: 'Gemini 3.7 Flash Singlish weather commentary and emergency boss excuses for rainy delays.',
    sampleBody: {
      area: 'Jurong West',
      forecast: 'Thundery Showers',
      rainfallMm: 8.4,
      uvIndex: 8.5,
      temperature: 32,
      umbrellaScore: 82,
    },
  },
  {
    id: 'gemini-sheltered-route',
    name: 'Gemini AI Sheltered Walkway Route',
    category: 'gemini-ai',
    method: 'POST',
    endpoint: '/api/gemini/sheltered-route',
    govUrl: 'https://ai.google.dev/',
    version: 'internal',
    description: 'Tactical routing using covered linkways, HDB void decks, and shopping mall underpasses.',
    sampleBody: {
      origin: 'Jurong East MRT',
      destination: 'Westgate & Jem Mall',
      rainIntensity: 'Heavy Thundery Showers',
    },
  },
  {
    id: 'gemini-hourly-analysis',
    name: 'Gemini AI 6-Hour Umbrella Risk Outlook',
    category: 'gemini-ai',
    method: 'POST',
    endpoint: '/api/gemini/hourly-analysis',
    govUrl: 'https://ai.google.dev/',
    version: 'internal',
    description: '6-hour forward-looking umbrella probability timeline with meteorological advice.',
    sampleBody: {
      area: 'Jurong West',
      currentScore: 75,
    },
  },
];

export const ApiHub: React.FC = () => {
  const [selectedApi, setSelectedApi] = useState<ApiEndpointSpec>(API_CATALOG[0]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'v2-weather' | 'v1-transport' | 'composite' | 'gemini-ai'>('all');
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState<any>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [customRequestBody, setCustomRequestBody] = useState<string>(
    JSON.stringify(API_CATALOG[0].sampleBody || {}, null, 2)
  );

  const filteredApis = activeCategory === 'all' 
    ? API_CATALOG 
    : API_CATALOG.filter(a => a.category === activeCategory);

  const handleSelectApi = (api: ApiEndpointSpec) => {
    playTerminalBeep(700);
    setSelectedApi(api);
    setResponseData(null);
    setStatusCode(null);
    setResponseTime(null);
    if (api.sampleBody) {
      setCustomRequestBody(JSON.stringify(api.sampleBody, null, 2));
    }
  };

  const handleCopyGovUrl = () => {
    navigator.clipboard.writeText(selectedApi.govUrl);
    setCopiedUrl(true);
    playTerminalBeep(900, 0.05);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleExecuteRequest = async () => {
    setLoading(true);
    playTerminalBeep(850, 0.06);
    const startTime = performance.now();

    try {
      let res: Response;
      if (selectedApi.method === 'POST') {
        let bodyParsed = {};
        try {
          bodyParsed = JSON.parse(customRequestBody);
        } catch {
          bodyParsed = selectedApi.sampleBody || {};
        }
        res = await fetch(selectedApi.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyParsed),
        });
      } else {
        res = await fetch(selectedApi.endpoint);
      }

      const elapsed = Math.round(performance.now() - startTime);
      setResponseTime(elapsed);
      setStatusCode(res.status);

      const json = await res.json();
      setResponseData(json);
      playUmbrellaPop();
    } catch (err: any) {
      console.error(err);
      setStatusCode(500);
      setResponseData({ error: err.message || 'Failed to call API' });
      playThunderRumble();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white border-4 border-black rounded-3xl p-5 sm:p-8 shadow-[8px_8px_0px_0px_#000000] text-black font-sans animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-black pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#FF2A85] text-white rounded-2xl border-3 border-black shadow-[3px_3px_0px_0px_#000000]">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-xl sm:text-2xl uppercase tracking-tight flex items-center gap-2">
              Live API Hub &amp; Data.gov.sg Telemetry
            </h3>
            <p className="text-xs sm:text-sm font-bold text-black/70 uppercase">
              Real-time v2 Weather, v1 Transport APIs, and Gemini AI endpoints.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-[#FF4D94] text-white px-3 py-1 border-2 border-black rounded-full text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000000]">
            10 v2 Weather
          </span>
          <span className="bg-[#FFA8BA] text-black px-3 py-1 border-2 border-black rounded-full text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000000]">
            2 v1 Transport
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'all', label: 'All 18 Endpoints', icon: Layers },
          { id: 'v2-weather', label: 'v2 Weather & Env (10)', icon: CloudRain },
          { id: 'v1-transport', label: 'v1 Transport & Taxis (2)', icon: Car },
          { id: 'composite', label: 'Composite Engine (3)', icon: Zap },
          { id: 'gemini-ai', label: 'Gemini AI (3)', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                playTerminalBeep(650);
                setActiveCategory(tab.id as any);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase border-2 border-black flex items-center gap-1.5 transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000000] ${
                isActive
                  ? 'bg-black text-white translate-y-0.5 shadow-none'
                  : 'bg-white hover:bg-[#FFE5EC] text-black'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Grid: API Catalog on Left, Runner on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: API List */}
        <div className="lg:col-span-5 flex flex-col gap-2 max-h-[580px] overflow-y-auto pr-1">
          <div className="text-xs font-black uppercase text-black mb-1 flex items-center justify-between">
            <span>Endpoints ({filteredApis.length})</span>
            <span className="text-[10px] opacity-60">Click to Select</span>
          </div>

          {filteredApis.map((api) => {
            const isSelected = selectedApi.id === api.id;
            return (
              <button
                key={api.id}
                onClick={() => handleSelectApi(api)}
                className={`w-full text-left p-3 rounded-2xl border-3 border-black transition-all cursor-pointer flex flex-col gap-1 shadow-[2px_2px_0px_0px_#000000] ${
                  isSelected
                    ? 'bg-[#FF2A85] text-white shadow-[4px_4px_0px_0px_#000000] scale-[1.01]'
                    : 'bg-white hover:bg-[#FFE5EC] text-black'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded border border-black uppercase ${
                        api.method === 'POST' ? 'bg-[#FFA8BA] text-black' : 'bg-[#FFE5EC] text-black'
                      }`}
                    >
                      {api.method}
                    </span>
                    <span className="font-black text-xs uppercase tracking-tight line-clamp-1">
                      {api.name}
                    </span>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-1 rounded ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-black/10 text-black'
                  }`}>
                    {api.version}
                  </span>
                </div>
                <p
                  className={`text-[11px] line-clamp-1 font-medium ${
                    isSelected ? 'text-white/90' : 'text-black/70'
                  }`}
                >
                  {api.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right Column: Interactive Tester & Payload Inspector */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-[#FFF0F3] border-3 border-black rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_0px_#000000] flex flex-col gap-4">
            
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-black uppercase px-2 py-0.5 bg-[#FF4D94] text-white rounded border border-black">
                  {selectedApi.version} Host Endpoint
                </span>
                {statusCode && (
                  <span
                    className={`text-xs font-mono font-black px-2 py-0.5 rounded border-2 border-black flex items-center gap-1 ${
                      statusCode >= 200 && statusCode < 300
                        ? 'bg-[#FF2A85] text-white'
                        : 'bg-black text-[#FFB3C6]'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> {statusCode} OK ({responseTime}ms)
                  </span>
                )}
              </div>

              <h4 className="text-lg font-black uppercase tracking-tight">{selectedApi.name}</h4>
              <p className="text-xs text-black/70 font-medium mt-0.5">{selectedApi.description}</p>
            </div>

            {/* URL Display */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase text-black/80">
                <span>Official Live Source URL:</span>
                <button
                  onClick={handleCopyGovUrl}
                  className="flex items-center gap-1 text-[10px] font-black bg-white hover:bg-[#FFE5EC] px-2 py-0.5 rounded border border-black cursor-pointer shadow-[1px_1px_0px_0px_#000000]"
                >
                  {copiedUrl ? <Check className="w-3 h-3 text-[#FF2A85]" /> : <Copy className="w-3 h-3" />}
                  {copiedUrl ? 'Copied' : 'Copy URL'}
                </button>
              </div>
              <div className="flex items-center gap-2 bg-zinc-900 text-pink-300 font-mono text-xs p-2.5 rounded-xl border-2 border-black overflow-x-auto">
                <span className="text-[#FFB3C6] font-bold">{selectedApi.method}</span>
                <span className="truncate">{selectedApi.govUrl}</span>
                <a
                  href={selectedApi.govUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-zinc-400 hover:text-white"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* App Internal Route */}
            <div className="flex items-center gap-2 bg-white font-mono text-xs px-3 py-2 rounded-xl border-2 border-black text-black/80">
              <span className="text-[10px] font-black bg-[#FFE5EC] px-1.5 py-0.5 rounded uppercase">App Proxy</span>
              <span className="font-bold">{selectedApi.endpoint}</span>
            </div>

            {/* If POST, Request Payload Editor */}
            {selectedApi.method === 'POST' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5" /> Request Body (JSON)
                </label>
                <textarea
                  value={customRequestBody}
                  onChange={(e) => setCustomRequestBody(e.target.value)}
                  rows={4}
                  className="w-full bg-zinc-900 text-pink-200 font-mono text-xs p-3 rounded-xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-black resize-none"
                />
              </div>
            )}

            {/* Run Button */}
            <button
              onClick={handleExecuteRequest}
              disabled={loading}
              className="w-full py-3 bg-[#FF2A85] hover:bg-[#ff1475] active:translate-y-1 font-black text-sm uppercase tracking-wider rounded-xl border-3 border-black text-white shadow-[4px_4px_0px_0px_#000000] flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Fetching Live Telemetry...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Live API Request
                </>
              )}
            </button>
          </div>

          {/* JSON Result Viewer */}
          <div className="bg-zinc-950 border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_#000000] flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2 text-zinc-300 font-mono text-xs font-bold">
                <Terminal className="w-4 h-4 text-[#FF4D94]" />
                <span>Response Payload (JSON)</span>
              </div>
              {responseData && (
                <span className="text-[10px] text-zinc-400 font-mono">
                  {JSON.stringify(responseData).length} bytes
                </span>
              )}
            </div>

            <div className="max-h-60 overflow-auto text-xs font-mono p-1">
              {loading ? (
                <div className="text-zinc-500 italic py-6 text-center animate-pulse">
                  Connecting to {selectedApi.version} live endpoint...
                </div>
              ) : responseData ? (
                <pre className="text-pink-300 whitespace-pre-wrap word-break">
                  {JSON.stringify(responseData, null, 2)}
                </pre>
              ) : (
                <div className="text-zinc-600 italic py-6 text-center">
                  Click "Send Live API Request" above to execute this official Singapore government feed.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
