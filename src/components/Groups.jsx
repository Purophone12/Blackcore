import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const navigate = useNavigate();
  const user = auth.currentUser || { displayName: 'User', uid: 'mock-uid' };

  useEffect(() => {
    setNewDisplayName(user.displayName || 'User');
    const q = query(collection(db, 'groups'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGroups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(fetchedGroups);
    }, (err) => {
      console.error("Error fetching groups:", err);
      if (groups.length === 0) {
        setGroups([
          { id: 'dev-team', name: 'General Chat', description: 'Hang out and talk about anything.' },
          { id: 'ops', name: 'Project Updates', description: 'Keep up with the latest news.' }
        ]);
      }
    });

    return () => unsubscribe();
  }, [user.displayName]);

  const createGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'groups'), {
        name: newGroupName,
        description: 'A new community space.',
        owner: user.uid,
        createdAt: serverTimestamp(),
        members: [user.uid]
      });
      setNewGroupName('');
      navigate(`/chat/${docRef.id}`);
    } catch (err) {
      console.error("Error creating group:", err);
      navigate(`/chat/mock-group-${Date.now()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: newDisplayName });
      }
      setIsEditingProfile(false);
    } catch (err) {
      console.error("Profile update failed", err);
      setIsEditingProfile(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background-dark text-white font-display p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full space-y-12">
        <header className="flex justify-between items-start">
          <div className="flex items-center gap-4">
             <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-purple-900 p-0.5 shadow-lg shadow-primary/20">
                <div className="w-full h-full rounded-lg bg-card-dark flex items-center justify-center text-primary font-bold">
                   {user.displayName?.charAt(0) || 'U'}
                </div>
             </div>
             <div>
                {isEditingProfile ? (
                   <div className="flex gap-2 items-center">
                      <input
                        className="bg-card-dark border border-primary/20 rounded-lg px-2 py-1 text-sm outline-none focus:border-primary"
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
                      <h1 className="text-xl font-bold tracking-tight">{user.displayName || 'User'}</h1>
                      <span className="material-symbols-outlined text-sm text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                   </div>
                )}
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Online</p>
             </div>
          </div>
          <button onClick={() => auth.signOut()} className="p-2 text-slate-500 hover:text-red-500 transition-colors">
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
            className="flex-1 bg-transparent outline-none text-sm py-2 px-3"
          />
          <button type="submit" disabled={loading} className="bg-primary px-4 py-2 rounded-xl hover:bg-primary/80 transition-all font-bold text-xs uppercase tracking-widest">
            {loading ? '...' : 'Create'}
          </button>
        </form>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 px-1">Your Chats</h3>
          {groups.map((group) => (
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
        </div>
      </div>
    </div>
  );
};

export default Groups;
