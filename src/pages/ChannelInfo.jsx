import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ChannelHeader from '../components/ChannelHeader';
import QuickActions from '../components/QuickActions';
import Settings from '../components/Settings';
import MemberList from '../components/MemberList';
import { deriveGroupKey, encryptMessage, decryptMessage } from '../utils/crypto';

function ChannelInfo() {
  const { groupId } = useParams();
  const [groupData, setGroupData] = useState(null);
  const [notifications, setNotifications] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [appearance, setAppearance] = useState("Neon Violet");
  const [cryptoStatus, setCryptoStatus] = useState("Initializing E2EE...");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('blackcore_user'));
  const token = localStorage.getItem('blackcore_token');

  const fetchGroupData = async () => {
    if (!groupId || !token) return;
    try {
      const response = await fetch(`http://localhost:5001/api/groups/${groupId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data && !data.error) {
        setEditName(data.name);
        setEditDesc(data.description);

        // Fetch users to get names for member IDs
        const uRes = await fetch('http://localhost:5001/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const allUsers = await uRes.json();

        const memberDetails = (data.members || []).map(mid => {
           const memberUser = allUsers.find(u => u.id === mid);
           return {
             id: mid,
             name: memberUser ? (mid === user.id ? `${memberUser.username} (You)` : memberUser.username) : `Member ${mid.slice(0, 4)}`,
             status: "Active",
             isOnline: true,
             isOwner: mid === data.owner,
             avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBr6cXaIISu6oPFGXYA6zbIOctFvv_imd1hyXauGLnB3A-gsys1bLjvKxRZfNEmTtGKhh8o-fQISlep7RyXNx0qQ-XM5u5VZXj1TixBa6FgqA71rCf4E4keZAO2YL_H1W98nc0RL167WHBihBPvjinBhtY7YU3QL_s-c4TqJFnp2R7iUa5gYNo3XpTmrssARQeRUaVI0XDdd0Ks7RNQaD3V_uO0P0AbBpMQOyIIFoTizjM1eBv8ZW2G8YNXcZr3RAhvJu8ia7QIuMw"
           };
        });

        setGroupData({ ...data, memberDetails });
      }
    } catch (err) {
      console.error("Error fetching group data:", err);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  useEffect(() => {
    async function initCrypto() {
      if (!groupId) return;
      try {
        const key = await deriveGroupKey(groupId);
        setCryptoStatus("E2EE Verified & Active");
      } catch (e) {
        setCryptoStatus("E2EE Initialization Failed");
      }
    }
    initCrypto();
  }, [groupId]);

  const leaveGroup = async () => {
    if (!groupId || !user) return;
    try {
      const updatedMembers = groupData.members.filter(m => m !== user.id);
      await fetch(`http://localhost:5001/api/groups/${groupId}`, {
          method: 'PUT',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ members: updatedMembers })
      });
      navigate('/groups');
    } catch (err) {
      console.error("Error leaving group:", err);
      navigate('/groups');
    }
  };

  const handleUpdateGroup = async () => {
    try {
      await fetch(`http://localhost:5001/api/groups/${groupId}`, {
          method: 'PUT',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name: editName, description: editDesc })
      });
      setIsEditing(false);
      fetchGroupData();
    } catch (err) {
      console.error("Error updating group:", err);
    }
  };

  const addMember = async () => {
    if (!newMemberId.trim()) return;
    try {
      const updatedMembers = [...groupData.members, newMemberId.trim()];
      await fetch(`http://localhost:5001/api/groups/${groupId}`, {
          method: 'PUT',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ members: updatedMembers })
      });
      setNewMemberId('');
      setShowAddMember(false);
      fetchGroupData();
    } catch (err) {
      console.error("Error adding member:", err);
    }
  };

  if (!groupData) return <div className="min-h-screen bg-background-dark flex items-center justify-center text-primary">Synchronizing...</div>;

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display transition-colors overflow-y-auto pb-12">
      <div className="flex items-center p-6 justify-between">
        <button onClick={() => navigate(`/chat/${groupId}`)} className="text-slate-900 dark:text-slate-100 p-2 hover:bg-primary/10 rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold tracking-tight">Channel Info</h1>
          <span className="text-[8px] text-green-500 font-bold uppercase tracking-widest">{cryptoStatus}</span>
        </div>
        <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-full transition-colors ${isEditing ? 'text-primary bg-primary/10' : 'text-slate-400 hover:bg-primary/10'}`}>
          <span className="material-symbols-outlined">edit</span>
        </button>
      </div>

      {isEditing ? (
        <div className="px-6 py-4 space-y-4 animate-in fade-in slide-in-from-top-4">
          <input
            className="w-full bg-card-dark border border-primary/20 rounded-xl p-3 text-sm focus:border-primary outline-none text-white"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Channel Name"
          />
          <textarea
            className="w-full bg-card-dark border border-primary/20 rounded-xl p-3 text-sm focus:border-primary outline-none h-24 resize-none text-white"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Channel Description"
          />
          <div className="flex gap-2">
            <button onClick={handleUpdateGroup} className="flex-1 bg-primary p-3 rounded-xl font-bold text-xs uppercase tracking-widest">Save Changes</button>
            <button onClick={() => setIsEditing(false)} className="bg-slate-800 p-3 rounded-xl font-bold text-xs uppercase tracking-widest px-6">Cancel</button>
          </div>
        </div>
      ) : (
        <ChannelHeader
          name={groupData.name}
          membersCount={groupData.members?.length || 0}
          type={groupData.isDM ? "Private DM" : "Public Channel"}
          description={groupData.description}
          avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuBWKEaapNrVIeemjUKVc0P9LzaEuIeBFPQn_Mg86k1IArk57K1p8MPcOP1AcFNnh4A5D2CBv1ABY-UAXbT_HpCWQz_zuE0a4D3-k0CECOyYjt9C6TZ2GZqd4hGGTLLM0tHvgd-o10DzWa4_Axb0BD9wrEBf1u68o9Al5hOK-5ziUr2GNnH5sKyM64a2OBzc9xDuPPBkwML0RBfZQnicXF7eXcvMnrU2nMtFXjI7GNP1Jw28Zu2kCENmt9Ik1nh_atRr1M7AequlOI8"
        />
      )}

      {!groupData.isDM && (
        <div className="px-6 mb-4">
          <button
            onClick={() => {
              const url = window.location.origin + `/groups?invite=${groupId}`;
              navigator.clipboard.writeText(url);
              alert("Invite link copied to clipboard!");
            }}
            className="w-full flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/20 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="text-primary flex items-center justify-center bg-primary/20 size-10 rounded-lg">
                <span className="material-symbols-outlined">link</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-primary">Invite Members</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Copy unique invitation link</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity">content_copy</span>
          </button>
        </div>
      )}

      <QuickActions
        isMuted={isMuted}
        onMuteToggle={() => setIsMuted(!isMuted)}
        onAddMember={() => setShowAddMember(true)}
        onColorClick={() => {
            const settingsEl = document.getElementById('settings-section');
            settingsEl?.scrollIntoView({ behavior: 'smooth' });
        }}
        onSearchClick={() => navigate(`/chat/${groupId}?search=true`)}
      />

      {showAddMember && (
        <div className="px-6 mb-4 animate-in zoom-in-95 duration-200">
           <div className="bg-card-dark border border-primary/20 rounded-xl p-4 flex flex-col gap-3 shadow-2xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Invite New Member</p>
              <input
                className="bg-background-dark border border-primary/10 rounded-lg p-2 text-xs outline-none focus:border-primary text-white"
                placeholder="Enter Member ID..."
                value={newMemberId}
                onChange={(e) => setNewMemberId(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={addMember} className="flex-1 bg-primary/20 text-primary py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Add</button>
                <button onClick={() => setShowAddMember(false)} className="px-4 py-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">Cancel</button>
              </div>
           </div>
        </div>
      )}

      <div id="settings-section">
        <Settings
          notifications={notifications}
          onNotificationsChange={setNotifications}
          appearance={appearance}
        />
      </div>

      <MemberList
        members={groupData.memberDetails || []}
        onRemoveMember={async (memberId) => {
            if (memberId === user.id) return;
            const updatedMembers = groupData.members.filter(m => m !== memberId);
            await fetch(`http://localhost:5001/api/groups/${groupId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ members: updatedMembers })
            });
            fetchGroupData();
        }}
      />

      <div className="px-6 pb-12 mt-auto">
        <button onClick={leaveGroup} className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-bold group">
          <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">logout</span>
          Leave Group
        </button>
      </div>
    </div>
  );
}

export default ChannelInfo;
