import React from 'react';
import * as Switch from '@radix-ui/react-switch';

const SettingToggle = ({ icon, title, description, checked, onCheckedChange }) => (
  <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-card-dark rounded-xl border border-transparent dark:border-primary/5">
    <div className="flex items-center gap-4">
      <div className="text-primary flex items-center justify-center bg-primary/10 size-10 rounded-lg">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="relative flex h-6 w-11 cursor-pointer items-center rounded-full bg-slate-300 dark:bg-slate-800 transition-colors data-[state=checked]:bg-primary outline-none"
    >
      <Switch.Thumb className="block h-4 w-4 rounded-full bg-white transition-all translate-x-1 data-[state=checked]:translate-x-6" />
    </Switch.Root>
  </div>
);

const SettingItem = ({ icon, title, description, value }) => (
  <button className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-card-dark rounded-xl border border-transparent dark:border-primary/5 hover:border-primary/30 transition-all group text-left">
    <div className="flex items-center gap-4">
      <div className="text-primary flex items-center justify-center bg-primary/10 size-10 rounded-lg">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-slate-500">{value}</p>
      </div>
    </div>
    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">chevron_right</span>
  </button>
);

const Settings = ({ notifications, onNotificationsChange, appearance }) => {
  return (
    <div className="px-6 space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-4 px-1">Settings</h3>
      <SettingToggle
        icon="notifications"
        title="Notifications"
        description="Mute all channel alerts"
        checked={notifications}
        onCheckedChange={onNotificationsChange}
      />
      <SettingItem
        icon="format_paint"
        title="Appearance"
        value={appearance}
      />
    </div>
  );
};

export default Settings;
