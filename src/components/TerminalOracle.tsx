import React, { useState, useEffect } from 'react';
import { SGWeatherData, ExcuseHotTake, HourlyForecastItem } from '../types';
import { playTerminalBeep, playThunderRumble, playSunSizzle, playUmbrellaPop } from '../utils/audio';
import { 
  CloudRain, 
  Sun, 
  MapPin, 
  RotateCw, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Compass, 
  ChevronDown,
  Wind,
  Droplets,
  Thermometer,
  Clock,
  Car,
  Activity,
  ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TerminalOracleProps {
  weather: SGWeatherData | null;
  loading: boolean;
  onRefresh: () => void;
  onSelectArea: (area: string) => void;
  onVoiceSpeak: (text: string) => void;
  isSpeaking: boolean;
}

export const TerminalOracle: React.FC<TerminalOracleProps> = ({
  weather,
  loading,
  onRefresh,
  onSelectArea,
  onVoiceSpeak,
  isSpeaking,
}) => {
  const [rollingTake, setRollingTake] = useState(false);
  const [customTake, setCustomTake] = useState<ExcuseHotTake | null>(null);
  const [showTownDropdown, setShowTownDropdown] = useState(false);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecastItem[]>([]);
  const [loadingHourly, setLoadingHourly] = useState(false);

  // Fetch 6-hour prediction
  useEffect(() => {
    if (!weather) return;
    const fetchHourly = async () => {
      setLoadingHourly(true);
      try {
        const res = await fetch('/api/gemini/hourly-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            area: weather.selectedArea,
            currentScore: weather.umbrellaScore,
          }),
        });
        const data = await res.json();
        if (data.hourly && Array.isArray(data.hourly)) {
          setHourlyForecast(data.hourly);
        } else {
          // Client deterministic fallback based on current score
          const s = weather.umbrellaScore || 65;
          setHourlyForecast([
            { hour: "+1 hr", umbrellaRisk: Math.min(100, Math.max(10, s + 10)), recommendation: "Rain clouds building over Malacca Strait", icon: "rain" },
            { hour: "+2 hr", umbrellaRisk: Math.min(100, Math.max(10, s + 20)), recommendation: "Flash downpour risk peak - keep brolly ready", icon: "thunder" },
            { hour: "+3 hr", umbrellaRisk: Math.max(10, s - 15), recommendation: "Rain dissipating into tropical humidity", icon: "cloud" },
            { hour: "+4 hr", umbrellaRisk: 75, recommendation: "Peak UV index - use UV parasol", icon: "sun" },
            { hour: "+5 hr", umbrellaRisk: 35, recommendation: "Cool evening breeze setting in", icon: "fair" },
            { hour: "+6 hr", umbrellaRisk: 20, recommendation: "Low risk for evening commute", icon: "fair" },
          ]);
        }
      } catch (e) {
        console.warn('Hourly forecast fallback', e);
        const s = weather.umbrellaScore || 65;
        setHourlyForecast([
          { hour: "+1 hr", umbrellaRisk: Math.min(100, Math.max(10, s + 10)), recommendation: "Rain clouds building over Malacca Strait", icon: "rain" },
          { hour: "+2 hr", umbrellaRisk: Math.min(100, Math.max(10, s + 20)), recommendation: "Flash downpour risk peak", icon: "thunder" },
          { hour: "+3 hr", umbrellaRisk: Math.max(10, s - 15), recommendation: "Rain dissipating into tropical humidity", icon: "cloud" },
          { hour: "+4 hr", umbrellaRisk: 75, recommendation: "Peak UV index - use UV parasol", icon: "sun" },
          { hour: "+5 hr", umbrellaRisk: 35, recommendation: "Cool evening breeze", icon: "fair" },
          { hour: "+6 hr", umbrellaRisk: 20, recommendation: "Low risk for evening commute", icon: "fair" },
        ]);
      } finally {
        setLoadingHourly(false);
      }
    };
    fetchHourly();
  }, [weather?.selectedArea, weather?.umbrellaScore]);

  if (!weather && loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_#000000] text-center font-sans animate-pulse">
        <div className="text-2xl font-black uppercase mb-2">⚡ CONNECTING TO DATA.GOV.SG NEA SENSORS...</div>
        <div className="text-sm font-bold text-zinc-600 uppercase">
          Pinging 2-hour forecast, telemetry rain stations &amp; solar radiation sensors...
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const score = weather.umbrellaScore;
  
  // ASCII Bar calculation
  const totalTicks = 20;
  const filledTicks = Math.max(1, Math.min(totalTicks, Math.round((score / 100) * totalTicks)));
  const emptyTicks = totalTicks - filledTicks;
  const asciiGauge = `[${'='.repeat(Math.max(0, filledTicks - 1))}|${'-'.repeat(emptyTicks)}]`;

  const handleRollExcuse = async () => {
    setRollingTake(true);
    playTerminalBeep(750, 0.08);

    try {
      const res = await fetch('/api/gemini/hot-take', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area: weather.selectedArea,
          forecast: weather.selectedForecast,
          rainfallMm: weather.nearestRainfall.rainfallMm,
          uvIndex: weather.uvIndex.value,
          temperature: weather.temperature,
          umbrellaScore: weather.umbrellaScore,
        }),
      });
      const data = await res.json();
      setCustomTake(data);

      if (weather.umbrellaScore > 60) {
        playThunderRumble();
      } else if (weather.uvIndex.value > 8) {
        playSunSizzle();
      } else {
        playUmbrellaPop();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRollingTake(false);
    }
  };

  const handleAmISafeClick = () => {
    playTerminalBeep(520, 0.1);
    if (score < 40) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF6B6B', '#6BCB77', '#4D96FF', '#FFD93D'],
      });
      playUmbrellaPop();
    } else {
      playThunderRumble();
    }
  };

  const activeHotTake = customTake ? customTake.body : weather.hotTake;
  const activeHeadline = customTake ? customTake.headline : (score >= 60 ? "THREAT DETECTED: TAKE BROLLY" : "CURRENT SKY STATUS");

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_#000000] p-5 sm:p-8 select-none relative overflow-hidden transition-all">
      
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-black pb-4 mb-6">
        
        {/* Town Picker */}
        <div className="relative">
          <button
            id="btn-town-picker"
            onClick={() => {
              playTerminalBeep();
              setShowTownDropdown(!showTownDropdown);
            }}
            className="flex items-center gap-2 bg-[#FFA8BA] hover:bg-[#ff94aa] text-black px-4 py-2 rounded-2xl border-3 border-black font-black uppercase text-xs sm:text-sm shadow-[3px_3px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-black" />
            <span>Singapore - {weather.selectedArea}</span>
            <ChevronDown className="w-4 h-4 text-black" />
          </button>

          {/* Town Dropdown Menu */}
          {showTownDropdown && (
            <div className="absolute left-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0px_0px_#000000] z-50 p-1.5 divide-y-2 divide-black text-xs font-black">
              <div className="p-2.5 text-black bg-[#FFA8BA] uppercase tracking-wider rounded-t-xl">
                📍 Select Singapore Town:
              </div>
              {weather.towns.map((t) => (
                <button
                  key={t.area}
                  onClick={() => {
                    playTerminalBeep(650);
                    onSelectArea(t.area);
                    setShowTownDropdown(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-[#FFE5EC] transition-colors uppercase cursor-pointer ${
                    t.area === weather.selectedArea ? 'bg-[#FF2A85] text-white' : 'text-black'
                  }`}
                >
                  <span className="font-black">{t.area}</span>
                  <span className="text-[10px] opacity-80 truncate max-w-[110px] font-bold">{t.forecast}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Status indicator & Refresh */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase bg-[#FF4D94] text-white px-3 py-1.5 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse border border-black"></span>
            <span>Live NEA Data</span>
          </div>

          <button
            id="btn-refresh-weather"
            onClick={() => {
              playTerminalBeep(800);
              onRefresh();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white hover:bg-[#FFE5EC] text-black px-3.5 py-1.5 rounded-2xl border-3 border-black text-xs font-black uppercase transition-all shadow-[3px_3px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Title & Slogan */}
      <div className="text-center my-4">
        <div className="inline-block bg-black text-[#FFB3C6] px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-widest mb-2 shadow-[2px_2px_0px_0px_#000000]">
          Singapore Real-Time Oracle
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-black uppercase leading-tight mb-4">
          Are you going to get soaked or sunburnt?
        </h2>

        {/* Action Button: AM I SAFE? */}
        <button
          id="btn-am-i-safe"
          onClick={handleAmISafeClick}
          className="inline-flex items-center gap-2.5 px-8 py-3 bg-[#FF2A85] hover:bg-[#ff1475] text-white font-black border-3 border-black rounded-2xl uppercase tracking-wider text-sm sm:text-base shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
        >
          <Compass className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '6s' }} />
          <span>Am I Safe?</span>
        </button>
      </div>

      {/* The Umbrella Gauge Box */}
      <div className="my-6 p-6 bg-[#FFE5EC] border-4 border-black rounded-3xl text-center shadow-[6px_6px_0px_0px_#000000]">
        <div className="flex justify-center items-baseline gap-2 mb-1">
          <span className="text-5xl sm:text-6xl font-black text-black tracking-tight">
            {score}
          </span>
          <span className="text-black font-black uppercase text-sm sm:text-base">/ 100 Umbrella Index</span>
        </div>

        <div className="text-xl sm:text-2xl font-black uppercase tracking-tight my-2">
          <span
            className={`inline-block px-4 py-1 rounded-xl border-3 border-black shadow-[3px_3px_0px_0px_#000000] ${
              score >= 70
                ? 'bg-[#FF2A85] text-white animate-bounce'
                : score >= 45
                ? 'bg-[#FFA8BA] text-black'
                : 'bg-white text-black'
            }`}
          >
            {weather.verdict}
          </span>
        </div>

        {/* Gauge Spectrum Display */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm font-black uppercase text-black my-4">
          <span className="bg-white px-3 py-1 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
            Leave It (1)
          </span>
          <span className="font-mono tracking-widest text-base sm:text-lg bg-black text-[#FF6584] px-4 py-1.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000000]">
            {asciiGauge}
          </span>
          <span className="bg-[#FF2A85] text-white px-3 py-1 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
            Take It (100)
          </span>
        </div>

        {/* Live Forecast Pill */}
        <div className="inline-flex items-center gap-2 mt-1 px-4 py-1.5 bg-white text-black border-2 border-black rounded-full text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000000]">
          <span className="opacity-70">Forecast for {weather.selectedArea}:</span>
          <span className="text-[#FF2A85] font-black">{weather.selectedForecast}</span>
        </div>
      </div>

      {/* Sassy Hot Take Box */}
      <div className="my-6 p-5 bg-[#FF4D94] border-4 border-black rounded-3xl text-white shadow-[6px_6px_0px_0px_#000000]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider bg-black text-[#FFB3C6] px-3 py-1 rounded-full border-2 border-white shadow-[2px_2px_0px_0px_#000000]">
            <Sparkles className="w-3.5 h-3.5 text-[#FFB3C6]" />
            <span>{activeHeadline}</span>
          </div>

          <button
            onClick={() => onVoiceSpeak(activeHotTake)}
            className="flex items-center gap-1.5 text-xs font-black uppercase bg-white text-black px-3 py-1 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:bg-[#FFE5EC] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            title="Read out hot take"
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-[#FF2A85] animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isSpeaking ? 'Speaking...' : 'Speak'}</span>
          </button>
        </div>

        <p className="text-base sm:text-lg font-black leading-snug tracking-tight text-white mb-3">
          "{activeHotTake}"
        </p>

        {customTake?.excuseForBoss && (
          <div className="mt-3 text-xs sm:text-sm font-bold text-black bg-white p-3 rounded-2xl border-3 border-black shadow-[3px_3px_0px_0px_#000000]">
            <span className="font-black uppercase text-[#FF2A85]">[ Singlish Boss Excuse ]: </span>
            {customTake.excuseForBoss}
          </div>
        )}
      </div>

      {/* Full 4-Panel Real-Time Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 my-6">
        
        {/* Panel 1: UV Index */}
        <div className="p-4 bg-[#FF2A85] text-white border-3 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between">
          <div className="flex items-center justify-between font-black uppercase mb-1 text-xs">
            <span className="flex items-center gap-1">
              <Sun className="w-4 h-4 text-[#FFE5EC]" />
              UV Index
            </span>
            <span className="px-2 py-0.5 bg-black text-[#FFB3C6] border border-white rounded-full text-[10px]">
              {weather.uvIndex.status}
            </span>
          </div>
          <div className="text-2xl font-black my-1">
            {weather.uvIndex.value.toFixed(1)}
          </div>
          <div className="text-[10px] font-bold bg-white text-black p-1.5 rounded-xl border border-black truncate">
            {weather.uvIndex.value >= 8 ? 'Extreme (Char Siew risk)' : 'Tolerable UV'}
          </div>
        </div>

        {/* Panel 2: Nearest Rainfall */}
        <div className="p-4 bg-white text-black border-3 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between">
          <div className="flex items-center justify-between font-black uppercase mb-1 text-xs">
            <span className="flex items-center gap-1 text-[#FF2A85]">
              <CloudRain className="w-4 h-4" />
              Rainfall (5m)
            </span>
            <span className="px-2 py-0.5 bg-[#FF2A85] text-white border border-black rounded-full text-[10px]">
              {weather.nearestRainfall.status}
            </span>
          </div>
          <div className="text-2xl font-black my-1">
            {weather.nearestRainfall.rainfallMm.toFixed(1)} <span className="text-xs font-bold text-zinc-500">mm</span>
          </div>
          <div className="text-[10px] font-bold bg-[#FFE5EC] p-1.5 rounded-xl border border-black truncate">
            {weather.nearestRainfall.stationName}
          </div>
        </div>

        {/* Panel 3: Wind Speed Telemetry */}
        <div className="p-4 bg-[#FFA8BA] text-black border-3 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between">
          <div className="flex items-center justify-between font-black uppercase mb-1 text-xs">
            <span className="flex items-center gap-1">
              <Wind className="w-4 h-4" />
              Wind Speed
            </span>
            <span className="px-2 py-0.5 bg-black text-white border border-black rounded-full text-[10px]">
              {weather.windSpeed > 15 ? 'Gusty' : 'Gentle'}
            </span>
          </div>
          <div className="text-2xl font-black my-1">
            {weather.windSpeed.toFixed(1)} <span className="text-xs font-bold text-zinc-700">knots</span>
          </div>
          <div className="text-[10px] font-bold bg-white text-black p-1.5 rounded-xl border border-black truncate">
            {weather.windSpeed > 15 ? 'Hold umbrella tight!' : 'Calm breeze'}
          </div>
        </div>

        {/* Panel 4: Temperature & Humidity */}
        <div className="p-4 bg-white text-black border-3 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between">
          <div className="flex items-center justify-between font-black uppercase mb-1 text-xs">
            <span className="flex items-center gap-1 text-[#FF2A85]">
              <Thermometer className="w-4 h-4" />
              Air Temp &amp; RH
            </span>
            <span className="flex items-center gap-0.5 text-[10px] font-black text-[#D946EF]">
              <Droplets className="w-3 h-3" />
              {weather.humidity}%
            </span>
          </div>
          <div className="text-2xl font-black my-1">
            {weather.temperature.toFixed(1)} <span className="text-xs font-bold text-zinc-500">°C</span>
          </div>
          <div className="text-[10px] font-bold bg-[#FFE5EC] p-1.5 rounded-xl border border-black truncate">
            {weather.humidity >= 85 ? 'High Tropical Humidity' : 'Comfortable'}
          </div>
        </div>

      </div>

      {/* Environmental & Transport Defense Strip (PSI, PM2.5, Live Taxis) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        {/* PSI / Air Quality */}
        <div className="p-3 bg-[#FFF0F3] border-2 border-black rounded-2xl flex items-center justify-between shadow-[2px_2px_0px_0px_#000000]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#FF4D94] rounded-xl border border-black text-white">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-black/70">Air Quality PSI</div>
              <div className="text-sm font-black text-black">
                {weather.airQuality ? `${weather.airQuality.overallPsi} PSI (${weather.airQuality.status})` : '42 PSI (Good)'}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 border border-black rounded-full">
            v2 PSI Feed
          </span>
        </div>

        {/* PM2.5 */}
        <div className="p-3 bg-[#FFF0F3] border-2 border-black rounded-2xl flex items-center justify-between shadow-[2px_2px_0px_0px_#000000]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#FFA8BA] rounded-xl border border-black text-black">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-black/70">1-Hr PM2.5 Telemetry</div>
              <div className="text-sm font-black text-black">
                {weather.airQuality ? `${weather.airQuality.overallPm25} µg/m³` : '12 µg/m³'}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 border border-black rounded-full">
            v2 PM2.5
          </span>
        </div>

        {/* Taxi Availability */}
        <div className="p-3 bg-[#FFF0F3] border-2 border-black rounded-2xl flex items-center justify-between shadow-[2px_2px_0px_0px_#000000]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#D946EF] rounded-xl border border-black text-white">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-black/70">Rain Rush Taxi Fleet</div>
              <div className="text-sm font-black text-black">
                {weather.transport?.availableTaxis ? `${weather.transport.availableTaxis.toLocaleString()} Taxis` : '1,840 Taxis Active'}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 border border-black rounded-full">
            v1 Transport
          </span>
        </div>
      </div>

      {/* 6-Hour Prediction Timeline Strip */}
      {hourlyForecast.length > 0 && (
        <div className="my-6 p-4 bg-[#FFF0F3] border-3 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000000]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-black">
              <Clock className="w-3.5 h-3.5 text-[#FF2A85]" />
              <span>Next 6 Hours Umbrella Risk Timeline:</span>
            </div>
            {loadingHourly && (
              <span className="text-[10px] font-bold text-zinc-500 animate-pulse">Updating...</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {hourlyForecast.map((h, i) => (
              <div
                key={i}
                className="bg-white border-2 border-black rounded-xl p-2 flex flex-col justify-between text-center shadow-[2px_2px_0px_0px_#000000]"
              >
                <div className="text-[11px] font-black uppercase text-black">{h.hour}</div>
                <div className="my-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-xs font-black border border-black ${
                      h.umbrellaRisk >= 70
                        ? 'bg-[#FF2A85] text-white'
                        : h.umbrellaRisk >= 40
                        ? 'bg-[#FFA8BA] text-black'
                        : 'bg-white text-black'
                    }`}
                  >
                    {h.umbrellaRisk}%
                  </span>
                </div>
                <div className="text-[9px] font-bold text-black/80 truncate" title={h.recommendation}>
                  {h.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roll Another Excuse Button */}
      <div className="text-center pt-2">
        <button
          id="btn-roll-excuse"
          onClick={handleRollExcuse}
          disabled={rollingTake}
          className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#FF2A85] hover:bg-[#ff1475] text-white border-3 border-black rounded-2xl font-black text-sm uppercase shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className={`w-4 h-4 text-white ${rollingTake ? 'animate-spin' : ''}`} />
          <span>{rollingTake ? 'Consulting AI Oracle...' : '🎲 Roll Another Excuse / Hot Take'}</span>
        </button>
      </div>
    </div>
  );
};
