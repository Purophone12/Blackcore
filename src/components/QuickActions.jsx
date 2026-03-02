import React from 'react';

const QuickAction = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 group"
  >
    <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-card-dark flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-lg shadow-primary/5">
      <span className="material-symbols-outlined">{icon}</span>
    </div>
    <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
  </button>
);

const QuickActions = ({ isMuted, onMuteToggle, onAddMember, onColorClick, onSearchClick }) => {
  return (
    <div className="grid grid-cols-4 gap-4 px-6 py-6">
      <QuickAction
        icon={isMuted ? "notifications_off" : "notifications"}
        label={isMuted ? "Muted" : "Mute"}
        onClick={onMuteToggle}
      />
      <QuickAction icon="palette" label="Color" onClick={onColorClick} />
      <QuickAction icon="person_add" label="Add" onClick={onAddMember} />
      <QuickAction icon="search" label="Search" onClick={onSearchClick} />
    </div>
  );
};

export default QuickActions;
