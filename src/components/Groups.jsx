import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, addDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { updateProfile } from 'firebase/auth';
import { useDemo } from '../context/DemoContext';
import { DEMO_GROUPS } from '../mockData';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const location = useLocation();
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const navigate = useNavigate();
  const [firebaseUser] = useAuthState(auth);
  const { isDemoMode, demoUser, exitDemoMode } = useDemo();

  const user = isDemoMode ? demoUser : firebaseUser;

  useEffect(() => {
    if (isDemoMode) {
      setGroups(DEMO_GROUPS);
      setNewDisplayName(demoUser.displayName);
      return;
    }

    if (!user) return;
    setNewDisplayName(user.displayName || user.email.split('@')[0]);

    const q = query(collection(db, 'groups'), where('isDM', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(gData);
    }, (err) => {
      console.error(err);
      const q2 = query(collection(db, 'groups'));
      onSnapshot(q2, (snapshot) => {
        const gData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(g => !g.isDM);
        setGroups(gData);
      });
    });

    const params = new URLSearchParams(location.search);
    const inviteId = params.get('invite');
    if (inviteId) {
      const handleInvite = async () => {
        try {
          const docRef = doc(db, 'groups', inviteId);
          const groupSnap = await getDoc(docRef);
          if (groupSnap.exists()) {
            const data = groupSnap.data();
            if (!data.members.includes(user.uid)) {
              await updateDoc(docRef, { members: arrayUnion(user.uid) });
            }
            navigate(`/chat/${inviteId}`);
          }
        } catch (err) { console.error(err); }
      };
      handleInvite();
    }
    return () => unsubscribe();
  }, [user, location.search, isDemoMode]);

  const createGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;
    if (isDemoMode) { navigate(`/chat/demo-group-general`); return; }
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'groups'), {
        name: newGroupName, description: 'A new community space.', owner: user.uid, members: [user.uid], isDM: false, createdAt: new Date().toISOString()
      });
      setNewGroupName('');
      navigate(`/chat/${docRef.id}`);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleUpdateProfile = async () => {
    if (isDemoMode) { setIsEditingProfile(false); return; }
    if (!user) return;
    try {
      await updateProfile(user, { displayName: newDisplayName });
      setIsEditingProfile(false);
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    if (isDemoMode) { exitDemoMode(); } else { auth.signOut(); }
    navigate('/');
  };

  const myGroups = groups.filter(g => !g.isDM && g.members?.includes(user?.uid));
  const otherGroups = groups.filter(g => !g.isDM && !g.members?.includes(user?.uid));

  return (
    <div className="flex flex-col h-full bg-transparent text-white font-body p-10 overflow-y-auto scrollbar-hide">
      <div className="max-w-3xl mx-auto w-full space-y-12">
        {/* Profile Header */}
        <header className="glass-panel p-6 rounded-[2rem] flex justify-between items-center shadow-2xl border-white/5">
          <div className="flex items-center gap-5">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-purple-900 p-0.5 shadow-glow-primary">
              <div className="w-full h-full rounded-[0.9rem] bg-background-dark/80 backdrop-blur-xl flex items-center justify-center text-primary font-bold text-xl uppercase font-display">
                {user?.displayName?.charAt(0) || 'U'}
              </div>
            </div>
            <div>
              {isEditingProfile ? (
                <div className="flex gap-2 items-center">
                  <input
                    className="bg-black/40 border border-primary/40 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-primary text-white shadow-inner"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    autoFocus
                  />
                  <button onClick={handleUpdateProfile} className="size-8 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all">
                    <span className="material-symbols-outlined text-sm">check</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingProfile(true)}>
                  <h1 className="text-2xl font-black tracking-tighter font-display">{user?.displayName || 'Agent'}</h1>
                  <span className="material-symbols-outlined text-sm text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 pt-1">
                <div className={`size-1.5 rounded-full ${isDemoMode ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`}></div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDemoMode ? 'text-amber-400' : 'text-slate-500'}`}>
                  {isDemoMode ? 'Temporary Vision' : 'Authenticated Node'}
                </p>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="p-3 bg-white/5 hover:bg-red-500/10 text-slate-600 hover:text-red-500 rounded-2xl transition-all border border-white/5">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </header>

        {/* Create Group Section */}
        <div className="space-y-6">
          <div className="flex flex-col">
            <h2 className="text-4xl font-black tracking-tighter font-display">Mission Hub</h2>
            <p className="text-slate-500 font-medium tracking-tight">Active sectors and communication channels.</p>
          </div>

          {!isDemoMode && (
            <form onSubmit={createGroup} className="flex gap-3 bg-white/5 p-3 rounded-[2rem] border border-white/5 focus-within:border-primary/50 transition-all shadow-xl group">
              <div className="p-3 text-slate-600 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined">add_circle</span>
              </div>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Initialize new sector..."
                className="flex-1 bg-transparent outline-none text-sm py-2 px-1 text-white placeholder:text-slate-700"
              />
              <button type="submit" disabled={loading} className="bg-primary px-8 rounded-2xl hover:bg-primary/80 transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95">
                {loading ? '...' : 'Deploy'}
              </button>
            </form>
          )}

          {isDemoMode && (
            <div className="p-6 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-slate-600">
              <span className="material-symbols-outlined text-4xl opacity-20">cloud_off</span>
              <p className="text-xs font-bold uppercase tracking-widest italic opacity-40">Creation disabled in terminal preview</p>
            </div>
          )}
        </div>

        {/* Group List */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 px-2">Authorized Sectors</h3>
          <div className="grid grid-cols-1 gap-4">
            {myGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => navigate(`/chat/${group.id}`)}
                className="w-full flex items-center justify-between p-6 glass-panel rounded-[2.5rem] border-white/5 hover:border-primary/40 hover:bg-white/10 transition-all group shadow-xl"
              >
                <div className="flex items-center gap-6">
                  <div className="size-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500">
                    <span className="material-symbols-outlined text-2xl font-bold">
                      {group.icon || 'hub'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="font-extrabold text-xl font-display tracking-tight group-hover:text-primary transition-colors">{group.name}</p>
                    <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-1">{group.description}</p>
                  </div>
                </div>
                <div className="size-12 rounded-full border border-white/5 flex items-center justify-center text-slate-700 group-hover:text-primary group-hover:border-primary/20 transition-all">
                  <span className="material-symbols-outlined">chevron_right</span>
                </div>
              </button>
            ))}
            {myGroups.length === 0 && <p className="text-sm text-slate-600 px-2 italic opacity-50">No active sectors detected.</p>}
          </div>
        </div>

        {/* Other Groups */}
        {!isDemoMode && otherGroups.length > 0 && (
          <div className="space-y-4 pt-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 px-2 italic">Public Observables</h3>
            <div className="grid grid-cols-1 gap-3">
              {otherGroups.map((group) => (
                <div
                  key={group.id}
                  className="w-full flex items-center justify-between p-5 bg-white/2 rounded-[2rem] border border-white/5 transition-all group"
                >
                  <div className="flex items-center gap-5">
                    <div className="size-12 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-600 opacity-50">
                      <span className="material-symbols-outlined">public</span>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm text-slate-400">{group.name}</p>
                      <p className="text-[10px] text-slate-600 line-clamp-1">{group.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await updateDoc(doc(db, 'groups', group.id), { members: arrayUnion(user.uid) });
                    }}
                    className="px-6 py-2 rounded-xl bg-white/5 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all border border-primary/20 shadow-glow"
                  >
                    Join Sector
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;
