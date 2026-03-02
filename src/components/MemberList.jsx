import React from 'react';

const MemberItem = ({ name, status, avatarUrl, isOwner, isOnline }) => (
  <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-card-dark/50 rounded-xl">
    <div className="flex items-center gap-3">
      <div className={`relative ${!isOnline ? 'grayscale' : ''}`}>
        <div
          className="size-10 rounded-lg bg-cover bg-center"
          style={{ backgroundImage: `url('${avatarUrl}')` }}
        ></div>
        <div className={`absolute -bottom-1 -right-1 size-3 border-2 border-background-dark rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`}></div>
      </div>
      <div>
        <p className={`text-sm font-bold ${!isOnline ? 'text-slate-500' : ''}`}>{name}</p>
        <p className={`text-[10px] font-medium ${isOnline ? 'text-green-500' : 'text-slate-500'}`}>{status}</p>
      </div>
    </div>
    {isOwner ? (
      <span className="text-[10px] font-bold py-1 px-2 bg-primary/20 text-primary rounded-md">Owner</span>
    ) : (
      <button className="text-slate-400 hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-lg">chat</span>
      </button>
    )}
  </div>
);

const MemberList = ({ members }) => {
  return (
    <div className="px-6 mt-8 mb-8 space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Members ({members.length})</h3>
        <button className="text-primary text-xs font-bold">See All</button>
      </div>
      <div className="space-y-3">
        {members.map((member, index) => (
          <MemberItem key={index} {...member} />
        ))}
      </div>
    </div>
  );
};

export default MemberList;
