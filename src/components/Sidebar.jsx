import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, addDoc, getDocs } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { wrapOnSnapshot, getDemoUser, wrapGetDocs } from '../utils/firebaseMock';

const Sidebar = () => {
  const [groups, setGroups] = useState([]);
  const [discoveredUsers, setDiscoveredUsers] = useState([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const navigate = useNavigate();
  const { groupId: currentGroupId } = useParams();
  const [fbUser] = useAuthState(auth);
  const isDemo = localStorage.getItem('blackcore_demo') === 'true';
  const user = isDemo ? getDemoUser() : fbUser;

  useEffect(() => {
    if (!user) return;

    // Listen for groups where user is a member
    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribeGroups = wrapOnSnapshot(onSnapshot, groupsQuery, (snapshot) => {
      const gData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(gData);

      // Discover users from member lists of shared groups
      const userMap = new Map();
      gData.forEach(g => {
         if (g.members) {
            g.members.forEach(mid => {
               if (mid !== user.uid) {
                  // In a real app, you'd need a way to resolve mid to a name
                  // without a global users collection.
                  // For now, we use a placeholder or the DM name if available.
                  if (g.isDM) {
                     // Extract other user's name from DM title: "DM: Me & Other"
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
  }, [user]);

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  const startDM = async (otherUser) => {
    const dmId = user.uid < otherUser.id ? `${user.uid}_${otherUser.id}` : `${otherUser.id}_${user.uid}`;

    const existingDM = groups.find(g => g.id === dmId);
    if (existingDM) {
      navigate(`/chat/${existingDM.id}`);
      return;
    }

    try {
      await wrapSetDoc(setDoc, doc(db, 'groups', dmId), {
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

  const handleSearchUser = async (e) => {
    e.preventDefault();
    setSearchError('');
    if (!searchUsername.trim()) return;

    try {
      const q = query(collection(db, 'users'), where('username', '==', searchUsername.trim()));
      const querySnapshot = await wrapGetDocs(getDocs, q);

      if (querySnapshot.empty) {
        setSearchError('Agent not found.');
        return;
      }

      const foundUser = querySnapshot.docs[0].data();
      if (foundUser.uid === user.uid) {
        setSearchError("That's you, Agent.");
        return;
      }

      startDM({ id: foundUser.uid, username: foundUser.username });
      setIsSearching(false);
      setSearchUsername('');
    } catch (err) {
      console.error("Search error:", err);
      setSearchError('Search failed.');
    }
  };

  return (
    <div className="w-72 bg-background-dark border-r border-primary/10 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="p-4 border-b border-primary/5 flex items-center justify-between bg-card-dark/30">
        <div className="flex items-center gap-3">
           <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shadow-glow">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
           </div>
           <span className="font-bold text-sm tracking-tight text-slate-200 truncate max-w-[120px]">
             {user?.displayName || user?.email?.split('@')[0] || 'User'}
           </span>
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
          <div className="flex items-center justify-between px-3 py-2">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Known Contacts</h3>
            <button
              data-testid="person-add-btn"
              onClick={() => setIsSearching(!isSearching)}
              className="text-primary hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-sm">{isSearching ? 'close' : 'person_add'}</span>
            </button>
          </div>

          {isSearching && (
            <form onSubmit={handleSearchUser} className="px-3 pb-2 animate-in fade-in slide-in-from-top-1 duration-200">
               <div className="flex flex-col gap-2">
                  <input
                    autoFocus
                    className="w-full bg-card-dark border border-primary/20 rounded-lg p-2 text-xs outline-none focus:border-primary text-white"
                    placeholder="Search Username..."
                    value={searchUsername}
                    onChange={(e) => setSearchUsername(e.target.value)}
                  />
                  {searchError && <p className="text-[8px] text-red-500 font-bold uppercase tracking-widest">{searchError}</p>}
               </div>
            </form>
          )}

          <div className="space-y-1">
            {discoveredUsers.map(u => (
              <button
                key={u.id}
                onClick={() => startDM(u)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:bg-primary/5 hover:text-slate-200 transition-all group"
              >
                <div className="size-8 rounded-lg bg-card-dark border border-primary/5 flex items-center justify-center text-[10px] font-bold">
                   {u.username.charAt(0)}
                </div>
                <span className="text-sm font-bold truncate">{u.username}</span>
              </button>
            ))}
            {discoveredUsers.length === 0 && (
              <p className="px-3 py-2 text-[10px] text-slate-600 italic">No contacts found. Join a group to find people.</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Group Chats</h3>
          {groups.filter(g => !g.isDM).map((group) => (
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
            <button onClick={handleLogout} className="text-slate-600 hover:text-red-500 transition-colors">
               <span className="material-symbols-outlined text-lg">logout</span>
            </button>
         </div>
      </footer>
    </div>
  );
};

export default Sidebar;
