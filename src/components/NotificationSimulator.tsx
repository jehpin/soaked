import React, { useState, useEffect } from 'react';
import { playTerminalBeep, playThunderRumble } from '../utils/audio';
import { Bell, BellRing, AlertOctagon, Sparkles } from 'lucide-react';

interface NotificationSimulatorProps {
  umbrellaScore: number;
  currentArea: string;
  verdict: string;
}

export const NotificationSimulator: React.FC<NotificationSimulatorProps> = ({
  umbrellaScore,
  currentArea,
  verdict,
}) => {
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [threshold, setThreshold] = useState(50);
  const [lastNotification, setLastNotification] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      playTerminalBeep();
    }
  };

  const triggerTestPush = () => {
    playThunderRumble();
    const message = `🚨 URGENT SG WEATHER PUSH: Umbrella chance is ${umbrellaScore}% in ${currentArea}! ${verdict}. Don't get soaked!`;
    setLastNotification(message);
    setNotificationCount((c) => c + 1);

    if (browserPermission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        new Notification('🌂 Singapore Umbrella Alert (>50%)', {
          body: message,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.warn('Native notification failed:', e);
      }
    }
  };

  const isTriggered = umbrellaScore >= threshold;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border-4 border-black rounded-3xl p-5 sm:p-8 shadow-[8px_8px_0px_0px_#000000] text-black font-sans animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-black pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#FF4D94] text-white rounded-2xl border-3 border-black shadow-[3px_3px_0px_0px_#000000]">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-xl sm:text-2xl uppercase tracking-tight flex items-center gap-2">
              Automatic Push Notifier
            </h3>
            <p className="text-xs sm:text-sm font-bold text-black/70 uppercase">
              Auto-dispatch emergency alerts when Umbrella Need &gt; 50%.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playTerminalBeep();
              setNotificationEnabled(!notificationEnabled);
            }}
            className={`text-xs sm:text-sm px-4 py-2 rounded-2xl border-3 border-black font-black uppercase flex items-center gap-2 cursor-pointer transition-all shadow-[3px_3px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
              notificationEnabled
                ? 'bg-[#FF2A85] text-white'
                : 'bg-zinc-200 text-zinc-600'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>{notificationEnabled ? 'Armed (Monitoring)' : 'Paused'}</span>
          </button>
        </div>
      </div>

      {/* Threshold Slider & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="p-5 bg-[#FFE5EC] rounded-3xl border-4 border-black shadow-[4px_4px_0px_0px_#000000]">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-black uppercase text-black">Alert Trigger Threshold:</span>
            <span className="text-sm font-black bg-black text-[#FFB3C6] px-3 py-1 rounded-full border border-black">
              {threshold}% Chance
            </span>
          </div>
          <input
            type="range"
            min="20"
            max="90"
            step="5"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-[#FF2A85] h-3 bg-white border-2 border-black rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-black uppercase text-black/80 mt-2">
            <span>20% (Paranoid)</span>
            <span>50% (Standard)</span>
            <span>90% (Brave Soul)</span>
          </div>
        </div>

        <div className="p-5 bg-[#D946EF] text-white rounded-3xl border-4 border-black shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase">Current Threat vs Threshold:</span>
            <span
              className={`text-xs font-black uppercase px-3 py-1 rounded-full border-2 border-black ${
                isTriggered ? 'bg-[#FF2A85] text-white' : 'bg-white text-black'
              }`}
            >
              {isTriggered ? 'Criteria Met (>50%)' : 'Below Threshold'}
            </span>
          </div>
          <div className="text-xs sm:text-sm font-bold bg-white text-black p-3 rounded-2xl border-2 border-black mt-2">
            {isTriggered
              ? `⚡ Score (${umbrellaScore}%) >= Threshold (${threshold}%). Push alert ready!`
              : `☀️ Score (${umbrellaScore}%) < Threshold (${threshold}%). Safe to roam.`}
          </div>
        </div>
      </div>

      {/* Trigger & Test Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          id="btn-trigger-notification-test"
          onClick={triggerTestPush}
          className="flex-1 py-3.5 bg-[#FF2A85] hover:bg-[#ff1475] active:translate-x-1 active:translate-y-1 active:shadow-none text-white font-black uppercase rounded-2xl border-3 border-black transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#000000] cursor-pointer text-xs sm:text-sm"
        >
          <Sparkles className="w-5 h-5 text-white" />
          <span>Simulate Instant Weather Push Alert</span>
        </button>

        {browserPermission !== 'granted' && (
          <button
            onClick={requestBrowserPermission}
            className="px-5 py-3.5 bg-[#FFA8BA] hover:bg-[#ff94aa] text-black text-xs sm:text-sm rounded-2xl border-3 border-black font-black uppercase shadow-[3px_3px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <span>Enable System Notifications</span>
          </button>
        )}
      </div>

      {/* Last Notification Banner */}
      {lastNotification && (
        <div className="mt-5 p-4 bg-[#FF2A85] text-white border-4 border-black rounded-3xl shadow-[6px_6px_0px_0px_#000000] flex items-start gap-3 animate-bounce">
          <AlertOctagon className="w-6 h-6 text-white shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <div className="font-black uppercase tracking-wider mb-1">
              [ Push Dispatched #{notificationCount} ]
            </div>
            <div className="font-bold">{lastNotification}</div>
          </div>
        </div>
      )}
    </div>
  );
};
