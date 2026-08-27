import React, { useState } from 'react';
import { playTerminalBeep } from '../utils/audio';
import { Check, PackageCheck } from 'lucide-react';

interface SurvivalKitProps {
  uvValue: number;
  umbrellaScore: number;
}

interface KitItem {
  id: string;
  name: string;
  singlishDesc: string;
  isPacked: boolean;
  urgency: 'Crucial' | 'High' | 'Optional';
  iconEmoji: string;
}

export const SurvivalKit: React.FC<SurvivalKitProps> = ({ uvValue, umbrellaScore }) => {
  const [items, setItems] = useState<KitItem[]>([
    {
      id: 'umbrella',
      name: 'Dual-Purpose UV + Rain Brolly',
      singlishDesc: 'Silver-coated inside for auntie-grade sun protection & heavy monsoon windproof ribs.',
      isPacked: umbrellaScore >= 50,
      urgency: umbrellaScore >= 60 ? 'Crucial' : 'High',
      iconEmoji: '🌂',
    },
    {
      id: 'sunscreen',
      name: 'SPF 50+ Broad Spectrum Sunscreen',
      singlishDesc: 'Prevent becoming charred char siew under blazing tropical equatorial UV radiation.',
      isPacked: uvValue >= 6,
      urgency: uvValue >= 8 ? 'Crucial' : 'High',
      iconEmoji: '🧴',
    },
    {
      id: 'tissue',
      name: 'Tissue Packet (Chope & Wipe)',
      singlishDesc: 'Dual role: chope hawker centre table or wipe sudden flash-flood splash.',
      isPacked: true,
      urgency: 'Crucial',
      iconEmoji: '🧻',
    },
    {
      id: 'fan',
      name: 'USB Rechargeable Neck Fan',
      singlishDesc: 'Fight 85% relative humidity before your work shirt permanently clings to skin.',
      isPacked: false,
      urgency: 'High',
      iconEmoji: '💨',
    },
    {
      id: 'slippers',
      name: 'Emergency Waterproof Slippers',
      singlishDesc: 'When monsoon rain puddle reaches ankle height outside the bus stop.',
      isPacked: umbrellaScore >= 70,
      urgency: umbrellaScore >= 75 ? 'Crucial' : 'Optional',
      iconEmoji: '🩴',
    },
  ]);

  const togglePacked = (id: string) => {
    playTerminalBeep(850, 0.05);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isPacked: !item.isPacked } : item
      )
    );
  };

  const packedCount = items.filter((i) => i.isPacked).length;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border-4 border-black rounded-3xl p-5 sm:p-8 shadow-[8px_8px_0px_0px_#000000] text-black font-sans animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-black pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#FF6B6B] text-white rounded-2xl border-3 border-black shadow-[3px_3px_0px_0px_#000000]">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-xl sm:text-2xl uppercase tracking-tight flex items-center gap-2">
              Tropical Survival Gear Checklist
            </h3>
            <p className="text-xs sm:text-sm font-bold text-black/70 uppercase">
              Quirky essentials for braving heat waves &amp; sudden afternoon downpours.
            </p>
          </div>
        </div>

        <div className="bg-[#FFD93D] px-4 py-1.5 border-2 border-black rounded-full text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000000]">
          {packedCount}/{items.length} Packed Ready
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => togglePacked(item.id)}
            className={`p-4 rounded-2xl border-3 border-black transition-all cursor-pointer flex items-start justify-between gap-3 shadow-[3px_3px_0px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
              item.isPacked
                ? 'bg-[#6BCB77]/25'
                : 'bg-white hover:bg-zinc-50'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <span className="text-3xl select-none">{item.iconEmoji}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm uppercase text-black">
                    {item.name}
                  </span>
                </div>
                <p className="text-xs font-bold text-black/70 mt-1 leading-snug">{item.singlishDesc}</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase border border-black ${
                      item.urgency === 'Crucial'
                        ? 'bg-[#FF6B6B] text-white'
                        : 'bg-[#FFD93D] text-black'
                    }`}
                  >
                    {item.urgency}
                  </span>
                  {item.isPacked && (
                    <span className="text-[10px] font-black uppercase text-emerald-800">
                      ✓ In Backpack
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`w-7 h-7 rounded-xl border-2 border-black flex items-center justify-center shrink-0 transition-colors shadow-[1px_1px_0px_0px_#000000] ${
                item.isPacked
                  ? 'bg-[#6BCB77] text-black'
                  : 'bg-white text-transparent'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
