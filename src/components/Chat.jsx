import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { deriveGroupKey, encryptMessage, decryptMessage, encryptBlob, decryptBlob } from '../utils/crypto';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove, orderBy, limit, deleteField, setDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import { wrapOnSnapshot, wrapAddDoc, wrapGetDoc, wrapUpdateDoc, wrapSetDoc, wrapDeleteDoc, wrapGetDocs, getDemoUser } from '../utils/firebaseMock';
import EmojiPicker from 'emoji-picker-react';
import VoiceCall from './VoiceCall';

const Chat = () => {
  const { groupId } = useParams();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(location.search.includes('search=true'));
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [groupInfo, setGroupInfo] = useState({ name: 'Group Chat' });
  const [symmetricKey, setSymmetricKey] = useState(null);
  const [activeCall, setActiveCall] = useState(null); // { otherUser, offer, callId }
  const scrollRef = useRef();
  const navigate = useNavigate();
  const [fbUser] = useAuthState(auth);
  const isDemo = localStorage.getItem('blackcore_demo') === 'true';
  const user = isDemo ? getDemoUser() : fbUser;

  // --- Signaling State for Voice Call (Move to group subcollection) ---
  useEffect(() => {
    if (!user || !groupId) return;

    // Listen for incoming calls in Firestore group subcollection
    const callsQuery = query(
      collection(db, 'groups', groupId, 'calls'),
      where('to', '==', user.uid),
      where('status', '==', 'ringing'),
      limit(1)
    );

    const unsubscribeCalls = wrapOnSnapshot(onSnapshot, callsQuery, async (snapshot) => {
      if (!snapshot.empty) {
        const callDoc = snapshot.docs[0];
        const callData = callDoc.data();

        // Use placeholder for caller username if we don't have a users collection
        const callerName = `Member ${callData.from.slice(0, 4)}`;

        setActiveCall({
          otherUser: { id: callData.from, username: callerName },
          offer: callData.offer,
          callId: callDoc.id
        });
      }
    });

    return () => unsubscribeCalls();
  }, [user, groupId]);

  useEffect(() => {
    async function fetchGroupInfo() {
      if (!groupId) return;
      try {
        const docSnap = await wrapGetDoc(getDoc, doc(db, 'groups', groupId));
        if (docSnap.exists()) {
          setGroupInfo({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error("Error fetching group info:", err);
      }
    }
    fetchGroupInfo();
  }, [groupId]);

  useEffect(() => {
    async function initKey() {
      if (!groupId) return;
      try {
        setSymmetricKey(null); // Reset while deriving
        const keyMaterial = await deriveGroupKey(groupId);
        setSymmetricKey(keyMaterial);
        console.log(`E2EE Key derived for group: ${groupId}`);
      } catch (err) {
        console.error("Key derivation failed:", err);
        alert("E2EE Initialization failed. Secure messaging may be unavailable.");
      }
    }
    initKey();
  }, [groupId]);

  useEffect(() => {
    if (!symmetricKey || !groupId) return;

    // We first try with ordering, if it fails (due to missing index), we fallback to client-side sorting
    const qWithOrder = query(
      collection(db, 'messages'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'asc')
    );

    let unsubscribeFallback;
    const processSnapshot = async (snapshot) => {
      if (!snapshot.docs) return;
      try {
        const decryptedMessages = await Promise.all(snapshot.docs.map(async (doc) => {
          const msg = doc.data();
          let text = msg.text;
          if (msg.isEncrypted && symmetricKey) {
            try {
              const ciphertext = Uint8Array.from(atob(msg.text), c => c.charCodeAt(0)).buffer;
              const iv = Uint8Array.from(atob(msg.iv), c => c.charCodeAt(0));
              if (msg.type === 'file') {
                text = `Encrypted File: ${msg.originalName}`;
              } else {
                text = await decryptMessage(ciphertext, symmetricKey, iv);
              }
            } catch (e) {
              text = "[Decryption Failed]";
            }
          }
          return { id: doc.id, ...msg, text };
        }));

        // Secondary safety sort in case Firestore didn't sort it (or fallback)
        // Handle null timestamps for local pending writes
        setMessages(decryptedMessages.sort((a, b) => {
            const getT = (m) => {
                if (m.createdAt?.toMillis) return m.createdAt.toMillis();
                if (m.createdAt instanceof Date) return m.createdAt.getTime();
                if (typeof m.createdAt === 'string') return new Date(m.createdAt).getTime();
                return Date.now(); // Fallback for pending writes
            };
            return getT(a) - getT(b);
        }));
      } catch (err) {
        console.error("Error processing messages snapshot:", err);
      }
    };

    const unsubscribe = wrapOnSnapshot(onSnapshot, qWithOrder, processSnapshot, (error) => {
      console.warn("Messages query with orderBy failed, falling back to unordered query:", error);
      const qFallback = query(
        collection(db, 'messages'),
        where('groupId', '==', groupId)
      );
      unsubscribeFallback = onSnapshot(qFallback, processSnapshot, (err) => {
         console.error("Critical: Messages listener failed even with fallback:", err);
      });
    });

    return () => {
      unsubscribe();
      if (unsubscribeFallback) unsubscribeFallback();
    };
  }, [symmetricKey, groupId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    const textToSend = newMessage.trim();
    if (!textToSend || !symmetricKey || !user) return;

    try {
      const { ciphertext, iv } = await encryptMessage(textToSend, symmetricKey);
      const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
      const ivBase64 = btoa(String.fromCharCode(...new Uint8Array(iv)));

      await wrapAddDoc(addDoc, collection(db, 'messages'), {
        text: ciphertextBase64,
        iv: ivBase64,
        uid: user.uid,
        groupId: groupId,
        displayName: user.displayName || user.email.split('@')[0],
        isEncrypted: true,
        createdAt: serverTimestamp()
      });

      setNewMessage('');
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const filteredMessages = messages.filter(m =>
    m.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleReaction = async (messageId, emoji) => {
    if (!user) return;
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    const reactions = msg.reactions || {};
    const usersWhoReacted = reactions[emoji] || [];

    let updatedUsers;
    if (usersWhoReacted.includes(user.uid)) {
      updatedUsers = usersWhoReacted.filter(id => id !== user.uid);
    } else {
      updatedUsers = [...usersWhoReacted, user.uid];
    }

    const docRef = doc(db, 'messages', messageId);
    if (updatedUsers.length === 0) {
       // Ideally we'd remove the key, but setting to empty array is easier
       await wrapUpdateDoc(updateDoc, docRef, {
         [`reactions.${emoji}`]: deleteField()
       });
    } else {
       await wrapUpdateDoc(updateDoc, docRef, {
         [`reactions.${emoji}`]: updatedUsers
       });
    }
  };

  const onEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    // Keep focus or close? Usually keep open for multiple emojis
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!file || !symmetricKey || !user) return;
    setUploading(true);
    try {
      const { ciphertext, iv } = await encryptBlob(file, symmetricKey);
      const ivBase64 = btoa(String.fromCharCode(...new Uint8Array(iv)));

      const fileRef = ref(storage, `uploads/${Date.now()}-${file.name}.enc`);
      await uploadBytes(fileRef, new Blob([ciphertext]));
      const downloadURL = await getDownloadURL(fileRef);

      await addDoc(collection(db, 'messages'), {
        text: btoa(downloadURL),
        iv: ivBase64,
        uid: user.uid,
        groupId: groupId,
        displayName: user.displayName || user.email.split('@')[0],
        isEncrypted: true,
        type: 'file',
        originalName: file.name,
        mimetype: file.type,
        createdAt: serverTimestamp()
      });

      setFile(null);
    } catch (err) {
      console.error("File upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = async (msg) => {
    try {
      const downloadURL = atob(msg.text);
      const response = await fetch(downloadURL);
      const ciphertext = await response.arrayBuffer();
      const iv = Uint8Array.from(atob(msg.iv), c => c.charCodeAt(0));

      const decryptedBlob = await decryptBlob(ciphertext, symmetricKey, iv, msg.mimetype);
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = msg.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("File download failed:", err);
    }
  };

  // --- Synced Typing Indicator (Debounced) ---
  useEffect(() => {
    if (!user || !groupId) return;

    const myId = user.uid;
    const typingDocRef = doc(db, 'groups', groupId, 'typing', myId);

    if (newMessage.length > 0) {
      const timeoutId = setTimeout(() => {
        wrapSetDoc(setDoc, typingDocRef, {
          username: user.displayName || user.email.split('@')[0],
          timestamp: serverTimestamp()
        }).catch(e => console.warn("Typing setDoc failed:", e));
      }, 500); // 500ms debounce

      const cleanupId = setTimeout(() => {
        wrapDeleteDoc(deleteDoc, typingDocRef).catch(() => {});
      }, 5000);

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(cleanupId);
      };
    } else {
      wrapDeleteDoc(deleteDoc, typingDocRef).catch(() => {});
    }
  }, [newMessage, user, groupId]);

  useEffect(() => {
    if (!groupId) return;
    const q = query(collection(db, 'groups', groupId, 'typing'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.id !== user?.uid);
      setTypingUsers(users);
    }, (err) => {
      console.warn("Typing listener failed:", err);
      setTypingUsers([]);
    });
    return () => unsubscribe();
  }, [groupId, user]);

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  return (
    <div className="flex flex-col h-screen bg-background-dark text-white font-display overflow-hidden">
      {/* Header */}
      <div className="flex flex-col border-b border-primary/10 bg-card-dark/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center p-4">
          <button onClick={() => navigate('/groups')} className="p-2 hover:bg-primary/10 rounded-full transition-colors mr-2">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div onClick={() => navigate(`/info/${groupId}`)} className="flex-1 text-left group cursor-pointer">
            <h2 className="font-bold tracking-tight group-hover:text-primary transition-colors">{groupInfo.name}</h2>
            <div className="flex items-center gap-1">
              <div className={`size-1.5 ${symmetricKey ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'} rounded-full`}></div>
              <span className={`text-[10px] ${symmetricKey ? 'text-green-500' : 'text-yellow-500'} font-bold uppercase tracking-widest`}>
                {symmetricKey ? 'E2EE Active' : 'Initializing Secure Link...'}
              </span>
            </div>
          </div>
          <button onClick={() => setIsSearching(!isSearching)} className={`p-2 rounded-full transition-colors mr-1 ${isSearching ? 'text-primary bg-primary/10' : 'text-slate-400 hover:bg-primary/10'}`}>
            <span className="material-symbols-outlined">search</span>
          </button>
          {groupInfo.members && groupInfo.members.length > 1 && (
             <button
               onClick={async () => {
                  const otherUserId = groupInfo.members.find(m => m !== user.uid);
                  let otherUserName = `Member ${otherUserId.slice(0, 4)}`;
                  if (groupInfo.isDM) {
                    otherUserName = groupInfo.name.split('&')[1]?.trim() || otherUserName;
                  }
                  setActiveCall({ otherUser: { id: otherUserId, username: otherUserName } });
               }}
               className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors mr-1"
             >
                <span className="material-symbols-outlined">call</span>
             </button>
          )}
          <button onClick={handleLogout} className="p-2 hover:bg-red-500/10 text-red-500 rounded-full transition-colors">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>

        {isSearching && (
          <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 bg-background-dark p-2 rounded-xl border border-primary/30">
              <span className="material-symbols-outlined text-sm text-slate-500 ml-2">search</span>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="flex-1 bg-transparent outline-none text-xs py-1 text-white"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 text-slate-500 hover:text-white">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {typingUsers.length > 0 && (
          <div className="px-6 py-2 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 sticky top-0 z-20 bg-background-dark/50 backdrop-blur rounded-full w-fit mx-auto border border-primary/10 mb-4">
             <div className="flex gap-1">
                <div className="size-1 bg-primary rounded-full animate-bounce"></div>
                <div className="size-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="size-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
             </div>
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
               {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
             </span>
          </div>
        )}
        {filteredMessages.map((msg) => (
          <div
            key={msg.id}
            onMouseEnter={() => setHoveredMessageId(msg.id)}
            onMouseLeave={() => setHoveredMessageId(null)}
            className={`flex flex-col ${msg.uid === user?.uid ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 group/msg`}
          >
            <div className={`flex items-center gap-2 mb-1 px-2 ${msg.uid === user?.uid ? 'flex-row-reverse' : ''}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {msg.displayName || 'Member'}
              </span>
                <span className="text-[8px] text-slate-500 font-medium">
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </span>
            </div>

            <div className="relative max-w-[85%] flex items-center gap-2">
              {/* Quick Reactions Hover Menu */}
              {hoveredMessageId === msg.id && (
                <div className={`absolute -top-10 z-20 flex gap-1 bg-card-dark border border-primary/20 p-1 rounded-full shadow-2xl animate-in zoom-in-95 duration-150 ${msg.uid === user?.uid ? 'right-0' : 'left-0'}`}>
                   {['🔥', '👍', '❤️', '😂', '😮', '😢'].map(emoji => (
                     <button
                       key={emoji}
                       onClick={() => toggleReaction(msg.id, emoji)}
                       className="hover:scale-125 transition-transform p-1 text-sm"
                     >
                       {emoji}
                     </button>
                   ))}
                </div>
              )}

              <div className={`relative p-4 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-[1.01] ${
                msg.uid === user?.uid
                  ? 'bg-primary/90 text-slate-100 rounded-tr-none shadow-primary/20'
                  : 'bg-card-dark border border-primary/10 rounded-tl-none text-slate-200'
              }`}>
              {msg.type === 'file' ? (
                <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                  <span className="material-symbols-outlined text-3xl">description</span>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold truncate">{msg.originalName}</p>
                    <p className="text-[8px] opacity-50 uppercase font-bold tracking-widest">{msg.mimetype}</p>
                  </div>
                  <button
                    onClick={() => downloadFile(msg)}
                    className="size-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                  </button>
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{msg.text}</p>
              )}

              {msg.isEncrypted && (
                <div className="flex items-center gap-1 mt-2 opacity-30">
                   <span className="material-symbols-outlined text-[10px]">lock</span>
                   <span className="text-[8px] font-bold uppercase tracking-tighter italic">E2EE Secured</span>
                </div>
              )}

              {/* Reactions Display */}
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className={`absolute -bottom-4 flex flex-wrap gap-1 ${msg.uid === user?.uid ? 'right-0' : 'left-0'}`}>
                   {Object.entries(msg.reactions).map(([emoji, uids]) => (
                     <button
                       key={emoji}
                       onClick={() => toggleReaction(msg.id, emoji)}
                       className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-all border ${
                         uids.includes(user?.uid)
                           ? 'bg-primary border-primary/50 text-white'
                           : 'bg-background-dark border-primary/20 text-slate-400 hover:border-primary/50'
                       }`}
                     >
                       <span>{emoji}</span>
                       <span>{uids.length}</span>
                     </button>
                   ))}
                </div>
              )}
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="px-4 relative">
        {showEmojiPicker && (
          <div className="absolute bottom-full left-4 mb-4 z-50">
            <EmojiPicker
              theme="dark"
              onEmojiClick={onEmojiClick}
              autoFocusSearch={false}
            />
          </div>
        )}

        {file && (
          <div className="bg-card-dark p-2 rounded-t-xl border-t border-x border-primary/20 flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">attach_file</span>
              <span className="text-xs font-bold truncate max-w-[200px]">{file.name}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={uploadFile} disabled={uploading} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline disabled:opacity-50">
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button onClick={() => setFile(null)} className="text-slate-500 hover:text-white">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={sendMessage} className={`p-4 bg-card-dark border-t border-primary/10 ${file ? 'rounded-b-none' : ''}`}>
        <div className="flex items-center gap-2 bg-background-dark p-2 rounded-2xl border border-primary/10 focus-within:border-primary transition-all">
          <label className="p-2 text-slate-500 hover:text-primary transition-colors cursor-pointer">
            <input type="file" className="hidden" onChange={handleFileChange} />
            <span className="material-symbols-outlined">add_circle</span>
          </label>

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 transition-colors ${showEmojiPicker ? 'text-primary' : 'text-slate-500 hover:text-primary'}`}
          >
            <span className="material-symbols-outlined">sentiment_satisfied</span>
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onFocus={() => setShowEmojiPicker(false)}
            placeholder="Message..."
            className="flex-1 bg-transparent outline-none text-sm py-2 text-white"
          />
          <button type="submit" className="bg-primary p-2 rounded-xl hover:bg-primary/80 transition-all shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white">send</span>
          </button>
        </div>
      </form>

      {activeCall && (
        <VoiceCall
          user={user}
          otherUser={activeCall.otherUser}
          incomingOffer={activeCall.offer}
          callId={activeCall.callId}
          groupId={groupId}
          onEndCall={() => setActiveCall(null)}
        />
      )}
    </div>
  );
};

export default Chat;
