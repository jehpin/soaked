import React, { useState, useEffect, useCallback } from 'react';
import { SGWeatherData } from './types';
import { TerminalOracle } from './components/TerminalOracle';
import { ShelteredRouteFinder } from './components/ShelteredRouteFinder';
import { NotificationSimulator } from './components/NotificationSimulator';
import { RadarScanner } from './components/RadarScanner';
import { SurvivalKit } from './components/SurvivalKit';
import { ApiHub } from './components/ApiHub';
import { toggleMute, getMuteState, playTerminalBeep } from './utils/audio';
import { 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Info,
  Footprints,
  BellRing,
  Radar,
  PackageCheck,
  Database,
  Code
} from 'lucide-react';

export default function App() {
  const [weather, setWeather] = useState<SGWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState('Jurong West');
  const [activeTab, setActiveTab] = useState<'oracle' | 'shelter' | 'radar' | 'notifications' | 'gear' | 'apihub'>('oracle');
  const [isMuted, setIsMuted] = useState(getMuteState());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-SG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' SGT'
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchWeatherData = useCallback(async (area = selectedArea) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather/live?area=${encodeURIComponent(area)}`);
      if (!res.ok) throw new Error('Failed to load weather data');
      const data = await res.json();
      setWeather(data);
    } catch (err: any) {
      console.error(err);
      setError('Could not connect to live NEA Singapore weather feed. Using backup sensor data.');
    } finally {
      setLoading(false);
    }
  }, [selectedArea]);

  useEffect(() => {
    fetchWeatherData(selectedArea);
    const interval = setInterval(() => {
      fetchWeatherData(selectedArea);
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedArea, fetchWeatherData]);

  const handleSelectArea = (area: string) => {
    setSelectedArea(area);
    fetchWeatherData(area);
  };

  const handleToggleSound = () => {
    const nextMute = toggleMute();
    setIsMuted(nextMute);
    if (!nextMute) playTerminalBeep(700, 0.08);
  };

  const handleSpeak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.1;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.includes('en-SG') || v.lang.includes('en-GB') || v.lang.includes('en-AU') || v.lang.includes('en-US')
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-[#FFB3C6] text-black flex flex-col font-sans p-3 sm:p-6 bg-[radial-gradient(#00000015_2px,transparent_2px)] [background-size:24px_24px]">
      <div className="max-w-6xl w-full mx-auto flex flex-col gap-5 sm:gap-6">
        
        {/* Header - Vibrant Neo-Brutalist Card */}
        <header className="bg-white border-4 border-black p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-[6px_6px_0px_0px_#000000] sm:shadow-[8px_8px_0px_0px_#000000] flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#FF2A85] text-white border-3 border-black rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-[3px_3px_0px_0px_#000000] transform -rotate-3 hover:rotate-0 transition-transform">
              🌂
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-3xl font-black tracking-tight uppercase leading-none">
                  Soaked or Sunburnt?
                </h1>
              </div>
              <p className="text-xs sm:text-sm font-black uppercase text-black/70 mt-1 tracking-wider">
                Singapore Live Umbrella &amp; UV Oracle
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Live API Badge */}
            <div 
              onClick={() => { playTerminalBeep(); setActiveTab('apihub'); }}
              className="bg-[#FF4D94] hover:bg-[#ff3385] text-white px-3.5 py-1.5 border-2 border-black rounded-full font-black uppercase text-xs flex items-center gap-2 shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
              title="Click to view Live API Explorer"
            >
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse border border-black"></span>
              <span>13 APIs Live</span>
            </div>

            {/* Clock Badge */}
            <div className="bg-[#FFE5EC] px-3 py-1.5 border-2 border-black rounded-full font-black uppercase text-xs font-mono shadow-[2px_2px_0px_0px_#000000]">
              {currentTime || '12:00:00 SGT'}
            </div>

            {/* Sound FX Toggle */}
            <button
              onClick={handleToggleSound}
              className={`p-2 border-2 border-black rounded-xl font-bold transition-all shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer ${
                isMuted ? 'bg-zinc-200 text-zinc-600' : 'bg-[#FF2A85] text-white'
              }`}
              title={isMuted ? 'Unmute Quirky SFX' : 'Mute SFX'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Navigation Tabs - Chunky Pop Pink Pills */}
        <nav className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1">
          <button
            onClick={() => {
              playTerminalBeep();
              setActiveTab('oracle');
            }}
            className={`px-4 py-2.5 border-3 border-black rounded-2xl font-black uppercase text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'oracle'
                ? 'bg-[#FF2A85] text-white shadow-[4px_4px_0px_0px_#000000] -translate-y-0.5'
                : 'bg-white text-black hover:bg-[#FFE5EC] shadow-[3px_3px_0px_0px_#000000]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Terminal Oracle</span>
          </button>

          <button
            onClick={() => {
              playTerminalBeep();
              setActiveTab('shelter');
            }}
            className={`px-4 py-2.5 border-3 border-black rounded-2xl font-black uppercase text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'shelter'
                ? 'bg-[#D946EF] text-white shadow-[4px_4px_0px_0px_#000000] -translate-y-0.5'
                : 'bg-white text-black hover:bg-[#FFE5EC] shadow-[3px_3px_0px_0px_#000000]'
            }`}
          >
            <Footprints className="w-4 h-4" />
            <span>Sheltered Routes</span>
          </button>

          <button
            onClick={() => {
              playTerminalBeep();
              setActiveTab('radar');
            }}
            className={`px-4 py-2.5 border-3 border-black rounded-2xl font-black uppercase text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'radar'
                ? 'bg-[#FF6584] text-white shadow-[4px_4px_0px_0px_#000000] -translate-y-0.5'
                : 'bg-white text-black hover:bg-[#FFE5EC] shadow-[3px_3px_0px_0px_#000000]'
            }`}
          >
            <Radar className="w-4 h-4" />
            <span>47-Town Radar</span>
          </button>

          <button
            onClick={() => {
              playTerminalBeep();
              setActiveTab('notifications');
            }}
            className={`px-4 py-2.5 border-3 border-black rounded-2xl font-black uppercase text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'bg-[#FFA8BA] text-black shadow-[4px_4px_0px_0px_#000000] -translate-y-0.5'
                : 'bg-white text-black hover:bg-[#FFE5EC] shadow-[3px_3px_0px_0px_#000000]'
            }`}
          >
            <BellRing className="w-4 h-4" />
            <span>Push Notifier (&gt;50%)</span>
          </button>

          <button
            onClick={() => {
              playTerminalBeep();
              setActiveTab('gear');
            }}
            className={`px-4 py-2.5 border-3 border-black rounded-2xl font-black uppercase text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'gear'
                ? 'bg-[#FB7185] text-white shadow-[4px_4px_0px_0px_#000000] -translate-y-0.5'
                : 'bg-white text-black hover:bg-[#FFE5EC] shadow-[3px_3px_0px_0px_#000000]'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Survival Gear</span>
          </button>

          <button
            onClick={() => {
              playTerminalBeep();
              setActiveTab('apihub');
            }}
            className={`px-4 py-2.5 border-3 border-black rounded-2xl font-black uppercase text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'apihub'
                ? 'bg-black text-[#FF70A6] shadow-[4px_4px_0px_0px_#000000] -translate-y-0.5'
                : 'bg-white text-black hover:bg-[#FFE5EC] shadow-[3px_3px_0px_0px_#000000]'
            }`}
          >
            <Database className="w-4 h-4 text-[#FF70A6]" />
            <span>Live API Hub</span>
          </button>
        </nav>

        {/* Error Notification */}
        {error && (
          <div className="bg-[#FF2A85] border-4 border-black p-3.5 rounded-2xl text-white font-bold flex items-center gap-3 shadow-[4px_4px_0px_0px_#000000]">
            <Info className="w-5 h-5 shrink-0" />
            <span className="text-xs sm:text-sm">{error}</span>
          </div>
        )}

        {/* Main Content Area */}
        <main className="w-full">
          {activeTab === 'oracle' && (
            <div className="space-y-6 animate-fadeIn">
              <TerminalOracle
                weather={weather}
                loading={loading}
                onRefresh={() => fetchWeatherData(selectedArea)}
                onSelectArea={handleSelectArea}
                onVoiceSpeak={handleSpeak}
                isSpeaking={isSpeaking}
              />

              {/* 4-Column Vibrant Pink Feature Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                
                {/* Card 1: Sheltered Routes */}
                <div 
                  onClick={() => { playTerminalBeep(); setActiveTab('shelter'); }}
                  className="bg-[#D946EF] border-4 border-black rounded-3xl p-5 shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1 transition-all cursor-pointer text-white flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 bg-white border-2 border-black rounded-xl flex items-center justify-center text-black mb-3 shadow-[2px_2px_0px_0px_#000000]">
                      <Footprints className="w-5 h-5 text-[#D946EF]" />
                    </div>
                    <h3 className="font-black text-base uppercase tracking-tight mb-1">
                      Sheltered Routes
                    </h3>
                    <p className="text-xs font-bold text-white/90 leading-snug">
                      Cut through void decks, covered linkways and shopping malls to dodge 100% of rain.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t-2 border-white/30 flex justify-between items-center text-xs font-black uppercase">
                    <span>Explore Route Finder</span>
                    <span>➔</span>
                  </div>
                </div>

                {/* Card 2: 47 Towns Radar */}
                <div 
                  onClick={() => { playTerminalBeep(); setActiveTab('radar'); }}
                  className="bg-[#FF529A] border-4 border-black rounded-3xl p-5 shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1 transition-all cursor-pointer text-white flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 bg-white border-2 border-black rounded-xl flex items-center justify-center text-black mb-3 shadow-[2px_2px_0px_0px_#000000]">
                      <Radar className="w-5 h-5 text-[#FF2A85]" />
                    </div>
                    <h3 className="font-black text-base uppercase tracking-tight mb-1">
                      47 Towns Radar
                    </h3>
                    <p className="text-xs font-bold text-white/90 leading-snug">
                      Real-time live scan from NEA weather stations across Jurong, Tampines, Orchard &amp; more.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t-2 border-white/30 flex justify-between items-center text-xs font-black uppercase">
                    <span>Inspect Rain Zones</span>
                    <span>➔</span>
                  </div>
                </div>

                {/* Card 3: Auto Push */}
                <div 
                  onClick={() => { playTerminalBeep(); setActiveTab('notifications'); }}
                  className="bg-white border-4 border-black rounded-3xl p-5 shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1 transition-all cursor-pointer text-black flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 bg-[#FFB3C6] border-2 border-black rounded-xl flex items-center justify-center text-black mb-3 shadow-[2px_2px_0px_0px_#000000]">
                      <BellRing className="w-5 h-5 text-[#FF2A85]" />
                    </div>
                    <h3 className="font-black text-base uppercase tracking-tight mb-1">
                      Push Notifier (&gt;50%)
                    </h3>
                    <p className="text-xs font-bold text-black/70 leading-snug">
                      Auto-dispatch mobile alerts when umbrella risk exceeds 50%.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t-2 border-black/20 flex justify-between items-center text-xs font-black uppercase">
                    <span>Set Alert Threshold</span>
                    <span>➔</span>
                  </div>
                </div>

                {/* Card 4: Live API Explorer */}
                <div 
                  onClick={() => { playTerminalBeep(); setActiveTab('apihub'); }}
                  className="bg-black border-4 border-black rounded-3xl p-5 shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1 transition-all cursor-pointer text-white flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 bg-[#FF4D94] border-2 border-white rounded-xl flex items-center justify-center text-white mb-3 shadow-[2px_2px_0px_0px_#ffffff]">
                      <Code className="w-5 h-5" />
                    </div>
                    <h3 className="font-black text-base uppercase tracking-tight mb-1 text-[#FF70A6]">
                      Live API Hub
                    </h3>
                    <p className="text-xs font-bold text-zinc-300 leading-snug">
                      Inspect and trigger all 13 data.gov.sg &amp; Gemini weather endpoints live.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t-2 border-zinc-700 flex justify-between items-center text-xs font-black uppercase text-[#FFB3C6]">
                    <span>Inspect Endpoints</span>
                    <span>➔</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'shelter' && <ShelteredRouteFinder />}
          {activeTab === 'radar' && (
            <RadarScanner
              towns={weather?.towns || []}
              selectedArea={selectedArea}
              onSelectArea={handleSelectArea}
              rainfallMm={weather?.nearestRainfall.rainfallMm || 0}
            />
          )}
          {activeTab === 'notifications' && (
            <NotificationSimulator
              umbrellaScore={weather?.umbrellaScore || 65}
              currentArea={weather?.selectedArea || selectedArea}
              verdict={weather?.verdict || 'TAKE IT!'}
            />
          )}
          {activeTab === 'gear' && (
            <SurvivalKit
              uvValue={weather?.uvIndex.value || 7}
              umbrellaScore={weather?.umbrellaScore || 65}
            />
          )}
          {activeTab === 'apihub' && <ApiHub />}
        </main>

        {/* Footer - Vibrant Neo-Brutalist Pill */}
        <footer className="bg-white border-4 border-black p-4 rounded-2xl shadow-[6px_6px_0px_0px_#000000] flex flex-wrap justify-between items-center gap-2 text-xs font-black uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[#FF4D94] border border-black rounded-full"></span>
            <span>Data: data.gov.sg &amp; NEA Singapore Real-Time APIs (d_6580738c, d_1b676cd1)</span>
          </div>
          <div className="bg-[#FFA8BA] px-3 py-1 border-2 border-black rounded-full font-bold">
            Singapore Weather Survival Oracle 🇸🇬 🌂
          </div>
        </footer>

      </div>
    </div>
  );
}
