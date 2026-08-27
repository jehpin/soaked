import React, { useState } from 'react';
import { TownForecast } from '../types';
import { playTerminalBeep } from '../utils/audio';
import { Radar, CloudRain, Sun, Cloud, Search } from 'lucide-react';

interface RadarScannerProps {
  towns: TownForecast[];
  selectedArea: string;
  onSelectArea: (area: string) => void;
  rainfallMm: number;
}

export const RadarScanner: React.FC<RadarScannerProps> = ({
  towns,
  selectedArea,
  onSelectArea,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'rain' | 'fair'>('all');

  const filteredTowns = towns.filter((t) => {
    const matchesSearch = t.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.forecast.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const f = t.forecast.toLowerCase();
    if (filterType === 'rain') return f.includes('rain') || f.includes('shower') || f.includes('thunder');
    if (filterType === 'fair') return f.includes('fair') || f.includes('cloudy') || f.includes('partly');
    return true;
  });

  const getForecastIcon = (forecast: string) => {
    const f = forecast.toLowerCase();
    if (f.includes('thunder') || f.includes('heavy')) {
      return <CloudRain className="w-5 h-5 text-[#FF2A85] animate-bounce" />;
    }
    if (f.includes('rain') || f.includes('shower')) {
      return <CloudRain className="w-5 h-5 text-[#D946EF]" />;
    }
    if (f.includes('fair') || f.includes('sunny')) {
      return <Sun className="w-5 h-5 text-[#FF6584] animate-spin" style={{ animationDuration: '10s' }} />;
    }
    return <Cloud className="w-5 h-5 text-zinc-600" />;
  };

  const getBadgeStyle = (forecast: string) => {
    const f = forecast.toLowerCase();
    if (f.includes('thunder') || f.includes('heavy')) return 'bg-[#FFE5EC] text-black border-2 border-black';
    if (f.includes('rain') || f.includes('shower')) return 'bg-[#FFCCD5] text-black border-2 border-black';
    if (f.includes('fair')) return 'bg-[#FFF0F3] text-black border-2 border-black';
    return 'bg-zinc-100 text-black border-2 border-black';
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border-4 border-black rounded-3xl p-5 sm:p-8 shadow-[8px_8px_0px_0px_#000000] text-black font-sans animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-black pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#FF4D94] text-white rounded-2xl border-3 border-black shadow-[3px_3px_0px_0px_#000000]">
            <Radar className="w-6 h-6 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div>
            <h3 className="font-black text-xl sm:text-2xl uppercase tracking-tight flex items-center gap-2">
              All-Island Weather Radar &amp; Town Forecast
            </h3>
            <p className="text-xs sm:text-sm font-bold text-black/70 uppercase">
              Live meteorological scan across 47 Singapore towns. Click to inspect town.
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => {
              playTerminalBeep();
              setFilterType('all');
            }}
            className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase transition-all shadow-[2px_2px_0px_0px_#000000] cursor-pointer ${
              filterType === 'all'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-[#FFE5EC]'
            }`}
          >
            All (47)
          </button>
          <button
            onClick={() => {
              playTerminalBeep();
              setFilterType('rain');
            }}
            className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase transition-all shadow-[2px_2px_0px_0px_#000000] cursor-pointer ${
              filterType === 'rain'
                ? 'bg-[#FF2A85] text-white'
                : 'bg-white text-black hover:bg-[#FFE5EC]'
            }`}
          >
            🌧️ Rain Zones
          </button>
          <button
            onClick={() => {
              playTerminalBeep();
              setFilterType('fair');
            }}
            className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase transition-all shadow-[2px_2px_0px_0px_#000000] cursor-pointer ${
              filterType === 'fair'
                ? 'bg-[#FFA8BA] text-black'
                : 'bg-white text-black hover:bg-[#FFE5EC]'
            }`}
          >
            ☀️ Clear / Dry
          </button>
        </div>
      </div>

      {/* Search Box */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-black/50" />
        <input
          type="text"
          placeholder="Filter town (e.g. Jurong, Tampines, Orchard, Woodlands, Bishan)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border-3 border-black rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-black focus:outline-none focus:bg-[#FFE5EC] shadow-[3px_3px_0px_0px_#000000]"
        />
      </div>

      {/* Towns Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
        {filteredTowns.map((town) => {
          const isSelected = town.area.toLowerCase() === selectedArea.toLowerCase();
          return (
            <button
              key={town.area}
              onClick={() => {
                playTerminalBeep(700);
                onSelectArea(town.area);
              }}
              className={`p-3.5 rounded-2xl text-left flex flex-col justify-between transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#FF2A85] text-white border-3 border-black shadow-[4px_4px_0px_0px_#000000] scale-[1.02]'
                  : `${getBadgeStyle(town.forecast)} shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5`
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-black text-xs sm:text-sm uppercase truncate max-w-[110px] ${isSelected ? 'text-white' : 'text-black'}`}>
                  {town.area}
                </span>
                {getForecastIcon(town.forecast)}
              </div>
              <div className={`text-[11px] font-bold uppercase truncate ${isSelected ? 'text-white/90' : 'text-black/80'}`}>
                {town.forecast}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
