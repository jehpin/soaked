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
  Sliders
} from 'lucide-react';

const API_CATALOG: ApiEndpointSpec[] = [
  {
    id: 'live-aggregator',
    name: 'Master Live Aggregator',
    method: 'GET',
    endpoint: '/api/weather/live?area=Jurong%20West',
    description: 'Composite real-time umbrella index, combining 2hr forecast, rainfall, UV, wind, and humidity.',
    govUrl: 'https://data.gov.sg/datasets?formats=API',
  },
  {
    id: 'forecast-2hr',
    name: '2-Hour Weather Forecast',
    method: 'GET',
    endpoint: '/api/weather/2hr-forecast',
    datasetId: 'd_6580738cdd7db79374ed3152159fbd69',
    description: 'NEA 2-hour localized weather forecast across all 47 Singapore towns.',
    govUrl: 'https://data.gov.sg/datasets/d_6580738cdd7db79374ed3152159fbd69/view',
  },
  {
    id: 'rainfall',
    name: '5-Minute Station Rainfall',
    method: 'GET',
    endpoint: '/api/weather/rainfall',
    datasetId: 'd_1b676cd174a9af4704fdb3f9aa58ff5e',
    description: 'Real-time rainfall telemetry readings from 60+ weather stations across the island.',
    govUrl: 'https://data.gov.sg/datasets/d_1b676cd174a9af4704fdb3f9aa58ff5e/view',
  },
  {
    id: 'uv-index',
    name: 'Ultraviolet Index (UVI)',
    method: 'GET',
    endpoint: '/api/weather/uv-index',
    description: 'Live UV solar radiation indices to calculate sun protection & parasol needs.',
    govUrl: 'https://api.data.gov.sg/v1/environment/uv-index',
  },
  {
    id: 'temperature',
    name: 'Air Temperature Telemetry',
    method: 'GET',
    endpoint: '/api/weather/temperature',
    description: 'Real-time Celsius air temperature readings from NEA meteorological stations.',
    govUrl: 'https://api.data.gov.sg/v1/environment/air-temperature',
  },
  {
    id: 'humidity',
    name: 'Relative Humidity',
    method: 'GET',
    endpoint: '/api/weather/humidity',
    description: 'Islandwide relative humidity percentages for tropical evaporation & rain likelihood.',
    govUrl: 'https://api.data.gov.sg/v1/environment/relative-humidity',
  },
  {
    id: 'wind-speed',
    name: 'Wind Speed & Direction',
    method: 'GET',
    endpoint: '/api/weather/wind-speed',
    description: 'Real-time wind speeds in knots and compass directions across Singapore stations.',
    govUrl: 'https://api.data.gov.sg/v1/environment/wind-speed',
  },
  {
    id: 'forecast-24hr',
    name: '24-Hour Regional Forecast',
    method: 'GET',
    endpoint: '/api/weather/24hr-forecast',
    description: 'North, South, East, West, Central 24-hour weather forecast segments.',
    govUrl: 'https://api.data.gov.sg/v1/environment/24-hour-weather-forecast',
  },
  {
    id: 'forecast-4day',
    name: '4-Day Extended Outlook',
    method: 'GET',
    endpoint: '/api/weather/4day-outlook',
    description: 'Extended 4-day monsoon and thunderstorm outlook for long-range umbrella planning.',
    govUrl: 'https://api.data.gov.sg/v1/environment/4-day-weather-forecast',
  },
  {
    id: 'radar-stations',
    name: 'Geospatial Radar Stations',
    method: 'GET',
    endpoint: '/api/weather/radar-stations',
    description: 'Geospatial lat/long station matrix with active precipitation detection.',
  },
  {
    id: 'calculate-index',
    name: 'Dynamic Index Calculator',
    method: 'POST',
    endpoint: '/api/weather/calculate-index',
    description: 'Calculate customized Umbrella Need Scores given arbitrary forecast parameters.',
    sampleBody: {
      forecast: 'Heavy Thundery Showers',
      rainfallMm: 12.5,
      uvIndex: 9.5,
      windSpeed: 14,
      humidity: 88,
    },
  },
  {
    id: 'gemini-hot-take',
    name: 'AI Singlish Excuse & Hot Take',
    method: 'POST',
    endpoint: '/api/gemini/hot-take',
    description: 'Gemini AI witty weather commentary and emergency Singlish boss excuses.',
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
    name: 'AI Sheltered Walkway Route',
    method: 'POST',
    endpoint: '/api/gemini/sheltered-route',
    description: 'Gemini AI tactical covered walkway, void deck, and MRT underground advisor.',
    sampleBody: {
      origin: 'Jurong East MRT',
      destination: 'Westgate & Jem Mall',
      rainIntensity: 'Heavy Thundery Showers',
    },
  },
];

export const ApiHub: React.FC = () => {
  const [selectedApi, setSelectedApi] = useState<ApiEndpointSpec>(API_CATALOG[0]);
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState<any>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [customRequestBody, setCustomRequestBody] = useState<string>(
    JSON.stringify(API_CATALOG[0].sampleBody || {}, null, 2)
  );

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
          <div className="p-3 bg-[#6BCB77] text-black rounded-2xl border-3 border-black shadow-[3px_3px_0px_0px_#000000]">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-xl sm:text-2xl uppercase tracking-tight flex items-center gap-2">
              Live API Hub &amp; Telemetry Explorer
            </h3>
            <p className="text-xs sm:text-sm font-bold text-black/70 uppercase">
              Official data.gov.sg datasets &amp; AI endpoints powering the Singapore Umbrella Index.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-[#FFD93D] px-3 py-1.5 border-2 border-black rounded-full text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000000]">
            13 APIs Connected
          </div>
        </div>
      </div>

      {/* Main Grid: API Catalog on Left, Runner on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: API List */}
        <div className="lg:col-span-5 flex flex-col gap-2 max-h-[540px] overflow-y-auto pr-1">
          <div className="text-xs font-black uppercase text-black mb-1 flex items-center justify-between">
            <span>Available Weather Endpoints</span>
            <span className="text-[10px] opacity-60">Click to Inspect</span>
          </div>

          {API_CATALOG.map((api) => {
            const isSelected = selectedApi.id === api.id;
            return (
              <button
                key={api.id}
                onClick={() => handleSelectApi(api)}
                className={`w-full text-left p-3 rounded-2xl border-3 border-black transition-all cursor-pointer flex flex-col gap-1 shadow-[2px_2px_0px_0px_#000000] ${
                  isSelected
                    ? 'bg-[#FF6B6B] text-white shadow-[4px_4px_0px_0px_#000000] scale-[1.01]'
                    : 'bg-white hover:bg-zinc-100 text-black'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase truncate max-w-[190px]">
                    {api.name}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase border border-black ${
                      api.method === 'GET'
                        ? isSelected
                          ? 'bg-black text-[#6BCB77]'
                          : 'bg-[#6BCB77] text-black'
                        : isSelected
                        ? 'bg-black text-[#FFD93D]'
                        : 'bg-[#FFD93D] text-black'
                    }`}
                  >
                    {api.method}
                  </span>
                </div>

                <div className="font-mono text-[10px] truncate opacity-85">
                  {api.endpoint}
                </div>

                {api.datasetId && (
                  <div className="text-[9px] font-black uppercase mt-0.5">
                    Dataset ID: <span className="underline">{api.datasetId}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Column: Interactive Tester & Payload Inspector */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Active API Details Card */}
          <div className="bg-[#4D96FF] text-white border-4 border-black rounded-3xl p-5 shadow-[5px_5px_0px_0px_#000000] flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-white/30 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="bg-black text-[#6BCB77] font-mono text-xs px-2.5 py-1 rounded-md border border-white font-black">
                  {selectedApi.method}
                </span>
                <h4 className="font-black text-base uppercase">{selectedApi.name}</h4>
              </div>

              {selectedApi.govUrl && (
                <a
                  href={selectedApi.govUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-black uppercase bg-white text-black px-2.5 py-1 rounded-xl border-2 border-black flex items-center gap-1 shadow-[2px_2px_0px_0px_#000000] hover:bg-yellow-200 cursor-pointer"
                >
                  <span>Gov Spec</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <p className="text-xs font-bold text-white/95 leading-relaxed">
              {selectedApi.description}
            </p>

            <div className="bg-black text-[#6BCB77] font-mono text-xs p-2.5 rounded-xl border-2 border-white break-all select-all">
              {selectedApi.endpoint}
            </div>

            {/* Request Body Editor for POST */}
            {selectedApi.method === 'POST' && (
              <div>
                <label className="block text-xs font-black uppercase text-white mb-1">
                  JSON Request Payload:
                </label>
                <textarea
                  rows={4}
                  value={customRequestBody}
                  onChange={(e) => setCustomRequestBody(e.target.value)}
                  className="w-full bg-black text-[#FFD93D] font-mono text-xs p-3 rounded-2xl border-2 border-white focus:outline-none focus:border-[#6BCB77]"
                />
              </div>
            )}

            {/* Run Button */}
            <button
              onClick={handleExecuteRequest}
              disabled={loading}
              className="py-3 bg-[#6BCB77] hover:bg-[#5bb867] text-black font-black uppercase rounded-2xl border-3 border-black shadow-[4px_4px_0px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
              ) : (
                <Send className="w-4 h-4 text-black" />
              )}
              <span>{loading ? 'Pinging Real-Time Feed...' : 'Execute Live API Request'}</span>
            </button>
          </div>

          {/* Response Payload Box */}
          <div className="bg-black text-[#6BCB77] border-4 border-black rounded-3xl p-4 shadow-[5px_5px_0px_0px_#000000] flex flex-col gap-2 min-h-[220px]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-white">
                <Terminal className="w-4 h-4 text-[#6BCB77]" />
                <span className="font-bold uppercase tracking-wider">Response Payload Inspector</span>
              </div>
              <div className="flex items-center gap-3">
                {statusCode !== null && (
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      statusCode >= 200 && statusCode < 300
                        ? 'bg-[#6BCB77] text-black'
                        : 'bg-[#FF6B6B] text-white'
                    }`}
                  >
                    STATUS {statusCode}
                  </span>
                )}
                {responseTime !== null && (
                  <span className="text-zinc-400 text-[10px]">{responseTime} ms</span>
                )}
              </div>
            </div>

            <pre className="font-mono text-xs overflow-x-auto overflow-y-auto max-h-64 p-2 text-[#6BCB77] leading-tight">
              {responseData
                ? JSON.stringify(responseData, null, 2)
                : '// Click "Execute Live API Request" above to stream live payload directly from data.gov.sg & NEA endpoints.'}
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
};
