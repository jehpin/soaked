import React, { useState } from 'react';
import { ShelteredRouteAdvice } from '../types';
import { playTerminalBeep, playUmbrellaPop } from '../utils/audio';
import { ShieldCheck, Footprints, Sparkles, Umbrella, ArrowRight } from 'lucide-react';

const PRESET_POPULAR_ROUTES = [
  { origin: 'Jurong East MRT', destination: 'Jem / Westgate / IMM' },
  { origin: 'Raffles Place MRT', destination: 'Marina Bay Financial Centre' },
  { origin: 'Tampines MRT', destination: 'Our Tampines Hub' },
  { origin: 'Orchard MRT', destination: 'Takashimaya / Ngee Ann City' },
  { origin: 'Bishan MRT', destination: 'Junction 8 & HDB Void Deck' },
  { origin: 'Bugis MRT', destination: 'Bugis Junction & Bras Basah' },
];

export const ShelteredRouteFinder: React.FC = () => {
  const [origin, setOrigin] = useState('Jurong East MRT');
  const [destination, setDestination] = useState('Jem & Westgate');
  const [loading, setLoading] = useState(false);
  const [routeAdvice, setRouteAdvice] = useState<ShelteredRouteAdvice | null>({
    origin: 'Jurong East MRT',
    destination: 'Jem & Westgate',
    shelterRating: 98,
    quirkyTip: 'Use the J-Walk elevated sheltered canopy. You can cross 4 shopping malls and 2 hospitals without a single raindrop touching your fringe.',
    landmarks: [
      'Exit MRT Station directly into J-Walk link bridge (100% sheltered)',
      'Traverse through Westgate Level 2 aircon corridor (100% sheltered)',
      'Cross J-Link skyway to Jem shopping mall (100% sheltered)',
      'Take escalator down to street level under glass atrium'
    ],
    singlishVerdict: '100% DRY LEVEL: GOD TIER'
  });

  const handleCalculateRoute = async (customOrig?: string, customDest?: string) => {
    const orig = customOrig || origin;
    const dest = customDest || destination;

    setLoading(true);
    playTerminalBeep(600);

    try {
      const res = await fetch('/api/gemini/sheltered-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: orig,
          destination: dest,
          rainIntensity: 'High rain cloud detected & UV 8+',
        }),
      });
      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        console.warn('Sheltered route response not JSON', rawText.slice(0, 50));
      }
      setRouteAdvice({
        origin: orig,
        destination: dest,
        shelterRating: data.shelterRating || 92,
        quirkyTip: data.quirkyTip || "Walk strictly along the HDB block void deck edge and draft behind an auntie with a giant floral umbrella.",
        landmarks: data.landmarks || [
          `Cut through ${orig} MRT underpass (100% dry)`,
          "Enter connected shopping mall to enjoy free aircon & shelter (100% dry)",
          "Follow the LTA covered walkway linkway towards HDB cluster (95% dry)",
          `Perform the classic 5-second Singaporean sprint to reach ${dest}`
        ],
        singlishVerdict: data.singlishVerdict || "AUNTIE-APPROVED 90%+ DRY ROUTE",
      });
      playUmbrellaPop();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border-4 border-black rounded-3xl p-5 sm:p-8 shadow-[8px_8px_0px_0px_#000000] text-black font-sans animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-black pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#D946EF] text-white rounded-2xl border-3 border-black shadow-[3px_3px_0px_0px_#000000]">
            <Footprints className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-xl sm:text-2xl uppercase tracking-tight flex items-center gap-2">
              Sheltered Walking Route Advisor
            </h3>
            <p className="text-xs sm:text-sm font-bold text-black/70 uppercase">
              Navigate Singapore dry &amp; shaded via void decks, undergrounds &amp; linkways.
            </p>
          </div>
        </div>

        <div className="bg-[#FF4D94] text-white px-3.5 py-1.5 border-2 border-black rounded-full text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000000]">
          Void Deck Mode
        </div>
      </div>

      {/* Preset Quick Chips */}
      <div className="mb-6">
        <div className="text-xs font-black uppercase text-black mb-2">
          ⚡ Popular Singapore Sheltered Corridors:
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_POPULAR_ROUTES.map((route, idx) => (
            <button
              key={idx}
              onClick={() => {
                setOrigin(route.origin);
                setDestination(route.destination);
                handleCalculateRoute(route.origin, route.destination);
              }}
              className="text-xs font-black uppercase px-3 py-1.5 bg-[#FFE5EC] hover:bg-[#FFCCD5] active:translate-x-0.5 active:translate-y-0.5 text-black rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000000] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>{route.origin}</span>
              <ArrowRight className="w-3.5 h-3.5 text-black" />
              <span>{route.destination}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs font-black uppercase text-black mb-1.5">
            Starting Point (MRT / HDB Block):
          </label>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-full bg-white border-3 border-black rounded-2xl px-4 py-2.5 text-sm font-bold text-black focus:outline-none focus:bg-[#FFE5EC] shadow-[3px_3px_0px_0px_#000000]"
            placeholder="e.g. Jurong West Blk 502"
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-black mb-1.5">
            Destination (Hawker / Mall / Office):
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full bg-white border-3 border-black rounded-2xl px-4 py-2.5 text-sm font-bold text-black focus:outline-none focus:bg-[#FFE5EC] shadow-[3px_3px_0px_0px_#000000]"
            placeholder="e.g. Boon Lay Market"
          />
        </div>
      </div>

      <button
        id="btn-find-sheltered-route"
        onClick={() => handleCalculateRoute()}
        disabled={loading}
        className="w-full py-3.5 bg-[#FF2A85] hover:bg-[#ff1475] active:translate-x-1 active:translate-y-1 active:shadow-none text-white font-black uppercase rounded-2xl border-3 border-black shadow-[4px_4px_0px_0px_#000000] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm sm:text-base mb-6"
      >
        <Sparkles className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        <span>{loading ? 'Analyzing Singapore Covered Walkway Mesh...' : 'Calculate 100% Sheltered Route'}</span>
      </button>

      {/* Route Result Display */}
      {routeAdvice && (
        <div className="p-6 bg-[#D946EF] text-white border-4 border-black rounded-3xl space-y-4 shadow-[6px_6px_0px_0px_#000000]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-white/40 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#FFE5EC]" />
              <span className="font-black text-base sm:text-lg uppercase">
                {routeAdvice.origin} ➔ {routeAdvice.destination}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 bg-black text-[#FFB3C6] font-black border-2 border-white rounded-full text-xs uppercase shadow-[2px_2px_0px_0px_#ffffff]">
                {routeAdvice.shelterRating}% Sheltered
              </span>
            </div>
          </div>

          {/* Singlish Verdict */}
          <div className="text-xs sm:text-sm font-black text-black bg-[#FFE5EC] p-3 rounded-2xl border-3 border-black shadow-[3px_3px_0px_0px_#000000] flex items-center gap-2 uppercase">
            <Umbrella className="w-5 h-5 text-[#FF2A85] shrink-0" />
            <span>{routeAdvice.singlishVerdict}</span>
          </div>

          {/* Landmarks / Steps */}
          <div>
            <div className="text-xs font-black uppercase text-white/90 mb-2">
              Tactical Walking Steps:
            </div>
            <div className="space-y-2">
              {routeAdvice.landmarks.map((step, index) => (
                <div key={index} className="flex items-start gap-3 bg-white text-black p-3 rounded-2xl border-3 border-black shadow-[3px_3px_0px_0px_#000000]">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FF2A85] text-white border-2 border-black flex items-center justify-center text-xs font-black">
                    {index + 1}
                  </span>
                  <span className="font-bold text-xs sm:text-sm">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quirky Tip */}
          <div className="p-4 bg-white text-black rounded-2xl border-3 border-black shadow-[3px_3px_0px_0px_#000000]">
            <span className="font-black text-[#FF2A85] uppercase">💡 SG Urban Survival Tip: </span>
            <span className="font-bold text-xs sm:text-sm">{routeAdvice.quirkyTip}</span>
          </div>
        </div>
      )}
    </div>
  );
};
