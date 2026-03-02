import React, { useContext } from 'react';
import { ThemeContext } from '../App';

const THEMES = [
  { name: "Neon Violet", color: "#8a2ce2" },
  { name: "Cyan Blast", color: "#00f3ff" },
  { name: "Emerald Cyber", color: "#00ff88" },
  { name: "Ruby Protocol", color: "#ff0044" }
];

const Settings = ({ notifications, onNotificationsChange, appearance }) => {
  const { themeColor, setThemeColor } = useContext(ThemeContext);

  return (
    <div className="px-6 space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-4 px-1">Settings</h3>

      {/* Mute Toggle */}
      <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-card-dark rounded-xl border border-transparent dark:border-primary/5 transition-all">
        <div className="flex items-center gap-4">
          <div className="text-primary flex items-center justify-center bg-primary/10 size-10 rounded-lg">
            <span className="material-symbols-outlined">notifications</span>
          </div>
          <div>
            <p className="font-semibold text-sm">Notifications</p>
            <p className="text-xs text-slate-500">Mute all channel alerts</p>
          </div>
        </div>
        <label className="relative flex h-6 w-11 cursor-pointer items-center rounded-full bg-slate-300 dark:bg-slate-800 transition-colors has-[:checked]:bg-primary">
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => onNotificationsChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="absolute left-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:left-6"></div>
        </label>
      </div>

      {/* Change Theme */}
      <div className="p-4 bg-slate-100 dark:bg-card-dark rounded-xl border border-transparent dark:border-primary/5 transition-all">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-primary flex items-center justify-center bg-primary/10 size-10 rounded-lg">
            <span className="material-symbols-outlined">palette</span>
          </div>
          <div>
            <p className="font-semibold text-sm">App Theme</p>
            <p className="text-xs text-slate-500">{THEMES.find(t => t.color === themeColor)?.name || "Custom"}</p>
          </div>
        </div>
        <div className="flex gap-2 px-1">
          {THEMES.map((theme) => (
            <button
              key={theme.color}
              onClick={() => setThemeColor(theme.color)}
              className={`size-8 rounded-full border-2 transition-all ${themeColor === theme.color ? 'border-white scale-110 shadow-lg shadow-primary/20' : 'border-transparent opacity-50 hover:opacity-100'}`}
              style={{ backgroundColor: theme.color }}
              title={theme.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
