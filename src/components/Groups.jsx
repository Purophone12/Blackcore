import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const location = useLocation();
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('blackcore_user')) || { username: 'User', id: 'mock-uid' };
  const token = localStorage.getItem('blackcore_token');

  const fetchGroups = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5001/api/groups', {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  };

  useEffect(() => {
    setNewDisplayName(user.username);
    fetchGroups();

    // Handle Invite Link
    const params = new URLSearchParams(location.search);
    const inviteId = params.get('invite');
    if (inviteId && user.id !== 'mock-uid' && token) {
      const handleInvite = async () => {
        try {
          const res = await fetch(`http://localhost:5001/api/groups/${inviteId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          const group = await res.json();
          if (group && !group.members.includes(user.id)) {
            await fetch(`http://localhost:5001/api/groups/${inviteId}`, {
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ members: [...group.members, user.id] })
            });
          }
          navigate(`/chat/${inviteId}`);
        } catch (err) {
          console.error("Invite processing failed:", err);
        }
      };
      handleInvite();
    }
  }, [location.search]);

  const createGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !token) return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/groups', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newGroupName,
          description: 'A new community space.',
          owner: user.id,
          members: [user.id]
        })
      });
      const newGroup = await response.json();
      setNewGroupName('');
      navigate(`/chat/${newGroup.id}`);
    } catch (err) {
      console.error("Error creating group:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = () => {
    const updatedUser = { ...user, username: newDisplayName };
    localStorage.setItem('blackcore_user', JSON.stringify(updatedUser));
    setIsEditingProfile(false);
    // Note: This only updates local display name, not server-side.
    // For a real app, you'd add an /api/users/profile endpoint.
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.removeItem('blackcore_user');
    localStorage.removeItem('blackcore_token');
    navigate('/');
  };

  return (
    <div className="flex flex-col h-full bg-background-dark text-white font-display p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full space-y-12">
        <header className="flex justify-between items-start">
          <div className="flex items-center gap-4">
             <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-purple-900 p-0.5 shadow-lg shadow-primary/20">
                <div className="w-full h-full rounded-lg bg-card-dark flex items-center justify-center text-primary font-bold">
                   {user.username?.charAt(0) || 'U'}
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
                      <h1 className="text-xl font-bold tracking-tight">{user.username || 'User'}</h1>
                      <span className="material-symbols-outlined text-sm text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                   </div>
                )}
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Online</p>
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
          {groups.filter(g => !g.isDM && g.members.includes(user.id)).map((group) => (
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

        <div className="space-y-3 pt-4 border-t border-primary/5">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 px-1">Discover</h3>
          {groups.filter(g => !g.isDM && !g.members.includes(user.id)).map((group) => (
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
                   await fetch(`http://localhost:5001/api/groups/${group.id}`, {
                      method: 'PUT',
                      headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ members: [...group.members, user.id] })
                   });
                   fetchGroups();
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
              >
                Join
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Groups;
