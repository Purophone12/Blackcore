import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  query,
  onSnapshot
} from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';

const Sidebar = () => {
  const [groups, setGroups] = useState([]);
  const navigate = useNavigate();
  const { groupId: currentGroupId } = useParams();
  const user = auth.currentUser || { displayName: 'User', uid: 'mock-uid' };

  useEffect(() => {
    const q = query(collection(db, 'groups'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGroups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(fetchedGroups);
    }, (err) => {
      console.error("Sidebar groups fetch error:", err);
      if (groups.length === 0) {
        setGroups([
          { id: 'dev-team', name: 'General Chat', icon: 'forum' },
          { id: 'ops', name: 'Project Updates', icon: 'rocket_launch' }
        ]);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-72 bg-background-dark border-r border-primary/10 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="p-4 border-b border-primary/5 flex items-center justify-between bg-card-dark/30">
        <div className="flex items-center gap-3">
           <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shadow-glow">
              {user.displayName?.charAt(0) || 'U'}
           </div>
           <span className="font-bold text-sm tracking-tight text-slate-200 truncate max-w-[120px]">{user.displayName || 'User'}</span>
        </div>
        <button onClick={() => navigate('/groups')} className="p-1.5 text-slate-500 hover:text-primary transition-colors rounded-lg hover:bg-primary/5">
           <span className="material-symbols-outlined text-sm">settings</span>
        </button>
      </header>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        <div>
          <h3 className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Navigation</h3>
          <button
            onClick={() => navigate('/groups')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all group ${!currentGroupId ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-primary/5 hover:text-slate-200'}`}
          >
            <span className="material-symbols-outlined text-lg">explore</span>
            <span className="text-sm font-bold">Discover</span>
          </button>
        </div>

        <div>
          <h3 className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Direct Messages</h3>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:bg-primary/5 hover:text-slate-200 transition-all opacity-50 cursor-not-allowed">
            <span className="material-symbols-outlined text-lg">person</span>
            <span className="text-sm font-bold">Friends (Locked)</span>
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Group Chats</h3>
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => navigate(`/chat/${group.id}`)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${currentGroupId === group.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-primary/5 hover:text-slate-200'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`size-8 rounded-lg flex items-center justify-center border transition-colors ${currentGroupId === group.id ? 'bg-white/20 border-white/20' : 'bg-card-dark border-primary/5 group-hover:border-primary/20'}`}>
                  <span className="material-symbols-outlined text-lg">
                    {group.icon || 'group'}
                  </span>
                </div>
                <span className="text-sm font-bold truncate max-w-[140px]">{group.name}</span>
              </div>
            </button>
          ))}
          <button
            onClick={() => navigate('/groups')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-primary/60 hover:text-primary hover:bg-primary/5 transition-all mt-2 border border-dashed border-primary/10"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span className="text-sm font-bold italic">New Space</span>
          </button>
        </div>
      </div>

      {/* Footer / Status */}
      <footer className="p-4 bg-card-dark/50 border-t border-primary/5">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="size-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Status</span>
            </div>
            <button onClick={() => auth.signOut()} className="text-slate-600 hover:text-red-500 transition-colors">
               <span className="material-symbols-outlined text-lg">logout</span>
            </button>
         </div>
      </footer>
    </div>
  );
};

export default Sidebar;
