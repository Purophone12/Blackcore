import React, { useState } from 'react';

const MemberItem = ({ name, id, status, avatarUrl, isOwner, isOnline, onRemove }) => {
  const [showId, setShowId] = useState(false);

  return (
    <div
      className="flex items-center justify-between p-3 bg-slate-100 dark:bg-card-dark/50 rounded-xl group transition-all hover:bg-slate-200 dark:hover:bg-card-dark cursor-pointer"
      onClick={() => setShowId(!showId)}
    >
      <div className="flex items-center gap-3">
        <div className={`relative ${!isOnline ? 'grayscale' : ''}`}>
          <div
            className="size-10 rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url('${avatarUrl}')` }}
          ></div>
          <div className={`absolute -bottom-1 -right-1 size-3 border-2 border-background-dark rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`}></div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className={`text-sm font-bold ${!isOnline ? 'text-slate-500' : ''}`}>{name}</p>
            {isOwner && (
              <span className="text-[8px] font-bold py-0.5 px-1 bg-primary/20 text-primary rounded-sm uppercase tracking-tighter">Owner</span>
            )}
          </div>
          <p className={`text-[10px] font-medium ${isOnline ? 'text-green-500' : 'text-slate-500'}`}>
            {showId ? `User ID: ${id || 'N/A'}` : status}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="text-slate-500 hover:text-primary transition-colors p-1"
          onClick={(e) => { e.stopPropagation(); /* Start chat logic */ }}
        >
          <span className="material-symbols-outlined text-lg">chat</span>
        </button>
        {!isOwner && onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(id); }}
            className="text-slate-500 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
          >
            <span className="material-symbols-outlined text-lg">person_remove</span>
          </button>
        )}
      </div>
    </div>
  );
};

const MemberList = ({ members, onRemoveMember }) => {
  const [showAll, setShowAll] = useState(false);
  const displayedMembers = showAll ? members : members.slice(0, 5);

  return (
    <div className="px-6 mt-8 mb-8 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Members ({members.length})</h3>
        {members.length > 5 && (
           <button onClick={(e) => { e.stopPropagation(); setShowAll(!showAll); }} className="text-primary text-xs font-bold hover:underline">
             {showAll ? "Show Less" : "See All"}
           </button>
        )}
      </div>
      <div className="space-y-3">
        {displayedMembers.map((member, index) => (
          <MemberItem key={member.id || index} {...member} onRemove={onRemoveMember} />
        ))}
      </div>
    </div>
  );
};

export default MemberList;
