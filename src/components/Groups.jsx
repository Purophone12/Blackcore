import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, addDoc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { updateProfile } from 'firebase/auth';
import { wrapOnSnapshot, wrapAddDoc, wrapGetDoc, wrapUpdateDoc, wrapSetDoc, getDemoUser } from '../utils/firebaseMock';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const location = useLocation();
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const navigate = useNavigate();
  const [fbUser] = useAuthState(auth);
  const isDemo = localStorage.getItem('blackcore_demo') === 'true';
  const user = isDemo ? getDemoUser() : fbUser;

  useEffect(() => {
    if (!user) return;
    setNewDisplayName(user.displayName || user.email.split('@')[0]);

    // Listen for all public groups (non-DM)
    // Note: To use 'isDM', '==', false, you might need a composite index.
    // Using 'isDM', '!=', true is usually okay but can be tricky with composite queries.
    const q = query(collection(db, 'groups'), where('isDM', '==', false));
    const unsubscribe = wrapOnSnapshot(onSnapshot, q, (snapshot) => {
      const gData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(gData);
    }, (err) => {
      console.error("Firestore groups query error:", err);
      // Fallback if index is missing
      const q2 = query(collection(db, 'groups'));
      onSnapshot(q2, (snapshot) => {
         const gData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(g => !g.isDM);
         setGroups(gData);
      });
    });

    // Handle Invite Link
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
              await updateDoc(docRef, {
                members: arrayUnion(user.uid)
              });
            }
            navigate(`/chat/${inviteId}`);
          }
        } catch (err) {
          console.error("Invite processing failed:", err);
        }
      };
      handleInvite();
    }

    return () => unsubscribe();
  }, [user, location.search]);

  const createGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;
    setLoading(true);
    try {
      const docRef = await wrapAddDoc(addDoc, collection(db, 'groups'), {
        name: newGroupName,
        description: 'A new community space.',
        owner: user.uid,
        members: [user.uid],
        isDM: false,
        createdAt: new Date().toISOString()
      });
      setNewGroupName('');
      navigate(`/chat/${docRef.id}`);
    } catch (err) {
      console.error("Error creating group:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      await updateProfile(user, { displayName: newDisplayName });
      // Sync with "users" collection for DM discovery
      await wrapSetDoc(setDoc, doc(db, 'users', user.uid), {
        username: newDisplayName,
        email: user.email,
        uid: user.uid,
        lastActive: new Date().toISOString()
      }, { merge: true });
      setIsEditingProfile(false);
    } catch (err) {
      console.error("Profile update failed:", err);
    }
  };

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  const myGroups = groups.filter(g => g.members?.includes(user?.uid));
  const otherGroups = groups.filter(g => !g.members?.includes(user?.uid));

  return (
    <div className="flex flex-col h-full bg-background-dark text-white font-display p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full space-y-12">
        <header className="flex justify-between items-start">
          <div className="flex items-center gap-4">
             <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-purple-900 p-0.5 shadow-lg shadow-primary/20">
                <div className="w-full h-full rounded-lg bg-card-dark flex items-center justify-center text-primary font-bold">
                   {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
             </div>
             <div>
                {isEditingProfile ? (
                   <div className="flex gap-2 items-center">
                      <input
                        className="bg-card-dark border border-primary/20 rounded-lg px-2 py-1 text-sm outline-none focus:border-primary text-white"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        autoFocus
                      />
                      <button onClick={handleUpdateProfile} className="text-primary hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-sm">check</span>
                      </button>
                   </div>
                ) : (
                   <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingProfile(true)}>
                      <h1 className="text-xl font-bold tracking-tight">{user?.displayName || user?.email?.split('@')[0] || 'User'}</h1>
                      <span className="material-symbols-outlined text-sm text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                   </div>
                )}
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Online</p>
             </div>
          </div>
          <div className="flex flex-col items-end gap-2">
             <div className="bg-card-dark p-3 rounded-xl border border-primary/10 flex flex-col gap-1">
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">My Agent ID</p>
                <div className="flex items-center gap-2">
                   <code className="text-[10px] text-primary bg-primary/5 px-2 py-1 rounded">{user?.uid}</code>
                   <button
                     onClick={() => {
                        navigator.clipboard.writeText(user?.uid);
                        alert("Agent ID copied to clipboard!");
                     }}
                     className="text-slate-500 hover:text-primary transition-colors"
                   >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                   </button>
                </div>
             </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-500 transition-colors">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </header>

        <div>
          <h2 className="text-3xl font-bold tracking-tighter mb-1">Group Chats</h2>
          <p className="text-slate-400 text-sm">Connect with your community.</p>
        </div>

        <form onSubmit={createGroup} className="flex gap-2 bg-card-dark p-2 rounded-2xl border border-primary/10 focus-within:border-primary transition-all">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="New group name..."
            className="flex-1 bg-transparent outline-none text-sm py-2 px-3 text-white"
          />
          <button type="submit" disabled={loading} className="bg-primary px-4 py-2 rounded-xl hover:bg-primary/80 transition-all font-bold text-xs uppercase tracking-widest">
            {loading ? '...' : 'Create'}
          </button>
        </form>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 px-1">Your Chats</h3>
          {myGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => navigate(`/chat/${group.id}`)}
              className="w-full flex items-center justify-between p-4 bg-card-dark rounded-xl border border-transparent hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-purple-900/20 flex items-center justify-center text-primary border border-primary/10 group-hover:border-primary/30">
                  <span className="material-symbols-outlined">hub</span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">{group.name}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-1">{group.description}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-600 group-hover:text-primary transition-colors">chevron_right</span>
            </button>
          ))}
          {myGroups.length === 0 && <p className="text-xs text-slate-600 px-1 italic">You haven't joined any groups yet.</p>}
        </div>

        <div className="space-y-3 pt-4 border-t border-primary/5">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 px-1">Discover</h3>
          {otherGroups.map((group) => (
            <div
              key={group.id}
              className="w-full flex items-center justify-between p-4 bg-card-dark/40 rounded-xl border border-transparent transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-600 border border-white/5">
                  <span className="material-symbols-outlined">public</span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-slate-400">{group.name}</p>
                  <p className="text-[10px] text-slate-600 line-clamp-1">{group.description}</p>
                </div>
              </div>
              <button
                onClick={async () => {
                   try {
                     await updateDoc(doc(db, 'groups', group.id), {
                        members: arrayUnion(user.uid)
                     });
                     navigate(`/chat/${group.id}`);
                   } catch (err) {
                     console.error("Error joining group:", err);
                   }
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
              >
                Join
              </button>
            </div>
          ))}
          {otherGroups.length === 0 && <p className="text-xs text-slate-600 px-1 italic">No other groups to discover.</p>}
        </div>
      </div>
    </div>
  );
};

export default Groups;
