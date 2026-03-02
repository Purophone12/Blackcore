import React from 'react';

const QuickAction = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 group"
  >
    <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-card-dark flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
      <span className="material-symbols-outlined">{icon}</span>
    </div>
    <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
  </button>
);

const QuickActions = ({ isMuted, onMuteToggle }) => {
  return (
    <div className="grid grid-cols-4 gap-4 px-6 py-6">
      <QuickAction
        icon={isMuted ? "notifications" : "notifications_off"}
        label={isMuted ? "Unmute" : "Mute"}
        onClick={onMuteToggle}
      />
      <QuickAction icon="palette" label="Color" />
      <QuickAction icon="person_add" label="Add" />
      <QuickAction icon="search" label="Search" />
    </div>
  );
};

export default QuickActions;
