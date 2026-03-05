import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDemo } from '../context/DemoContext';
import { DEMO_GROUPS, DEMO_CONTACTS } from '../mockData';

const Sidebar = () => {
  const [groups, setGroups] = useState([]);
  const [discoveredUsers, setDiscoveredUsers] = useState([]);
  const navigate = useNavigate();
  const { groupId: currentGroupId } = useParams();
  const [firebaseUser] = useAuthState(auth);
  const { isDemoMode, demoUser, exitDemoMode } = useDemo();

  const user = isDemoMode ? demoUser : firebaseUser;

  useEffect(() => {
    if (isDemoMode) {
      setGroups(DEMO_GROUPS);
      setDiscoveredUsers(DEMO_CONTACTS);
      return;
    }

    if (!user) return;

    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribeGroups = onSnapshot(groupsQuery, (snapshot) => {
      const gData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(gData);

      const userMap = new Map();
      gData.forEach(g => {
        if (g.members) {
          g.members.forEach(mid => {
            if (mid !== user.uid) {
              if (g.isDM) {
                const otherName = g.name.split('&')[1]?.trim() || mid;
                userMap.set(mid, { id: mid, username: otherName });
              } else {
                if (!userMap.has(mid)) {
                  userMap.set(mid, { id: mid, username: `Member ${mid.slice(0, 4)}` });
                }
              }
            }
          });
        }
      });
      setDiscoveredUsers(Array.from(userMap.values()));
    });

    return () => unsubscribeGroups();
  }, [user, isDemoMode]);

  const handleLogout = () => {
    if (isDemoMode) {
      exitDemoMode();
    } else {
      auth.signOut();
    }
    navigate('/');
  };

  const startDM = async (otherUser) => {
    if (isDemoMode) {
      const dmGroup = DEMO_GROUPS.find(g => g.isDM);
      if (dmGroup) navigate(`/chat/${dmGroup.id}`);
      return;
    }

    const dmId = user.uid < otherUser.id ? `${user.uid}_${otherUser.id}` : `${otherUser.id}_${user.uid}`;
    const existingDM = groups.find(g => g.id === dmId);
    if (existingDM) {
      navigate(`/chat/${existingDM.id}`);
      return;
    }

    try {
      await setDoc(doc(db, 'groups', dmId), {
        name: `DM: ${user.displayName || 'Me'} & ${otherUser.username}`,
        description: `Direct message`,
        owner: user.uid,
        members: [user.uid, otherUser.id],
        isDM: true,
        createdAt: new Date().toISOString()
      });
      navigate(`/chat/${dmId}`);
    } catch (err) {
      console.error("Error creating DM:", err);
    }
  };

  return (
    <div className="w-80 glass-panel border-r border-white/5 flex flex-col h-screen overflow-hidden z-20">
      {/* Header / Brand */}
      <header className="p-6 border-b border-white/5 flex flex-col gap-4">
        <div onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer group">
          <img src="/logo.png" alt="Logo" className="size-8 object-contain shadow-glow-primary group-hover:scale-110 transition-transform" />
          <span className="font-display font-extrabold text-xl tracking-tighter">BLACKCORE</span>
        </div>

        <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shadow-glow">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs tracking-tight text-slate-200 truncate max-w-[100px]">
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active</span>
            </div>
          </div>
          <button onClick={() => navigate('/groups')} className="p-2 text-slate-500 hover:text-primary transition-colors rounded-xl hover:bg-primary/10">
            <span className="material-symbols-outlined text-sm">settings</span>
          </button>
        </div>
      </header>

      {/* Demo Mode Badge */}
      {isDemoMode && (
        <div className="mx-4 mt-4 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 animate-pulse">
          <span className="material-symbols-outlined text-amber-400 text-sm">visibility</span>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Visibility Demo Access</span>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600 mb-1">Navigation</h3>
          <button
            onClick={() => navigate('/groups')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${!currentGroupId ? 'bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5' : 'text-slate-500 hover:bg-white/5 hover:text-slate-200 border border-transparent'}`}
          >
            <span className="material-symbols-outlined text-lg">explore</span>
            <span className="text-sm font-bold font-display uppercase tracking-widest">Discover</span>
          </button>
        </div>

        <div>
          <h3 className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600 mb-1">Known Contacts</h3>
          <div className="space-y-1">
            {discoveredUsers.map(u => (
              <button
                key={u.id}
                onClick={() => startDM(u)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-slate-500 hover:bg-white/5 hover:text-slate-200 transition-all group border border-transparent hover:border-white/5"
              >
                <div className="size-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-[10px] font-bold group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  {u.username.charAt(0)}
                </div>
                <span className="text-sm font-bold truncate">{u.username}</span>
              </button>
            ))}
            {discoveredUsers.length === 0 && (
              <p className="px-4 py-2 text-[10px] text-slate-600 italic">No contacts found.</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600 mb-1">Group Chats</h3>
          {groups.filter(g => !g.isDM).map((group) => (
            <button
              key={group.id}
              onClick={() => navigate(`/chat/${group.id}`)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group border ${currentGroupId === group.id ? 'bg-primary text-white border-primary shadow-[0_10px_30px_rgba(138,44,226,0.3)]' : 'text-slate-500 hover:bg-white/5 hover:text-slate-200 border-transparent hover:border-white/5'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`size-8 rounded-xl flex items-center justify-center border transition-all ${currentGroupId === group.id ? 'bg-white/20 border-white/20' : 'bg-white/5 border-white/5 group-hover:border-primary/20'}`}>
                  <span className="material-symbols-outlined text-lg">
                    {group.icon || 'group'}
                  </span>
                </div>
                <span className="text-sm font-bold truncate max-w-[160px]">{group.name}</span>
              </div>
            </button>
          ))}
          {!isDemoMode && (
            <button
              onClick={() => navigate('/groups')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-primary/60 hover:text-primary hover:bg-primary/5 transition-all mt-4 border border-dashed border-primary/20 group"
            >
              <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform">add_circle</span>
              <span className="text-sm font-bold italic">New Space</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer / Status */}
      <footer className="p-6 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="size-2.5 bg-green-500 rounded-full"></div>
              <div className="absolute inset-0 size-2.5 bg-green-500 rounded-full animate-ping opacity-75"></div>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Encrypted Connection</span>
          </div>
          <button onClick={handleLogout} className="text-slate-600 hover:text-red-500 transition-colors p-2 hover:bg-red-500/10 rounded-xl">
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Sidebar;
