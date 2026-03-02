import React from 'react';

const ChannelHeader = ({ name, membersCount, type, description, avatarUrl }) => {
  return (
    <div className="flex flex-col items-center px-6 py-4">
      <div className="relative">
        <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-primary to-purple-900 p-1 neon-glow">
          <div
            className="w-full h-full rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url('${avatarUrl}')` }}
          ></div>
        </div>
        <div className="absolute -bottom-2 -right-2 bg-primary text-white p-1.5 rounded-lg border-4 border-background-dark">
          <span className="material-symbols-outlined text-sm block">edit</span>
        </div>
      </div>
      <div className="mt-6 text-center">
        <h2 className="text-3xl font-bold tracking-tighter text-slate-900 dark:text-white">{name}</h2>
        <p className="text-primary font-medium mt-1">{membersCount} Members • {type}</p>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-xs">{description}</p>
      </div>
    </div>
  );
};

export default ChannelHeader;
