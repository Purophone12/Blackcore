import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { deriveGroupKey, encryptMessage, decryptMessage, encryptBlob, decryptBlob } from '../utils/crypto';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import VoiceCall from './VoiceCall';
import { useDemo } from '../context/DemoContext';
import { DEMO_MESSAGES, DEMO_GROUPS } from '../mockData';

const Chat = () => {
  const { groupId } = useParams();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(location.search.includes('search=true'));
  const [groupInfo, setGroupInfo] = useState({ name: 'Group Chat' });
  const [symmetricKey, setSymmetricKey] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const scrollRef = useRef();
  const navigate = useNavigate();
  const [firebaseUser] = useAuthState(auth);
  const { isDemoMode, demoUser } = useDemo();

  const user = isDemoMode ? demoUser : firebaseUser;

  useEffect(() => {
    if (!isDemoMode) return;
    const group = DEMO_GROUPS.find(g => g.id === groupId);
    if (group) setGroupInfo(group);
    const mockMsgs = DEMO_MESSAGES[groupId] || [];
    setMessages(mockMsgs);
  }, [isDemoMode, groupId]);

  useEffect(() => {
    if (isDemoMode || !user || !groupId) return;
    const callsQuery = query(
      collection(db, 'groups', groupId, 'calls'),
      where('to', '==', user.uid),
      where('status', '==', 'ringing'),
      limit(1)
    );
    const unsubscribeCalls = onSnapshot(callsQuery, async (snapshot) => {
      if (!snapshot.empty) {
        const callDoc = snapshot.docs[0];
        const callData = callDoc.data();
        const callerName = `Member ${callData.from.slice(0, 4)}`;
        setActiveCall({
          otherUser: { id: callData.from, username: callerName },
          offer: callData.offer,
          callId: callDoc.id
        });
      }
    });
    return () => unsubscribeCalls();
  }, [user, groupId, isDemoMode]);

  useEffect(() => {
    if (isDemoMode || !groupId) return;
    async function fetchGroupInfo() {
      try {
        const docSnap = await getDoc(doc(db, 'groups', groupId));
        if (docSnap.exists()) {
          setGroupInfo({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) { console.error(err); }
    }
    fetchGroupInfo();
  }, [groupId, isDemoMode]);

  useEffect(() => {
    if (isDemoMode || !groupId) return;
    async function initKey() {
      try {
        const keyMaterial = await deriveGroupKey(groupId);
        setSymmetricKey(keyMaterial);
      } catch (err) { console.error(err); }
    }
    initKey();
  }, [groupId, isDemoMode]);

  useEffect(() => {
    if (isDemoMode || !symmetricKey || !groupId) return;
    const messagesQuery = query(collection(db, 'messages'), where('groupId', '==', groupId), orderBy('createdAt', 'asc'));
    const unsubscribeMessages = onSnapshot(messagesQuery, async (snapshot) => {
      const decryptedMessages = await Promise.all(snapshot.docs.map(async (doc) => {
        const msg = doc.data();
        let text = msg.text;
        if (msg.isEncrypted && symmetricKey) {
          try {
            const ciphertext = Uint8Array.from(atob(msg.text), c => c.charCodeAt(0)).buffer;
            const iv = Uint8Array.from(atob(msg.iv), c => c.charCodeAt(0));
            text = msg.type === 'file' ? `Encrypted File: ${msg.originalName}` : await decryptMessage(ciphertext, symmetricKey, iv);
          } catch (e) { text = "[Decryption Failed]"; }
        }
        return { id: doc.id, ...msg, text };
      }));
      setMessages(decryptedMessages);
    });
    return () => unsubscribeMessages();
  }, [symmetricKey, groupId, isDemoMode]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const textToSend = newMessage.trim();
    if (!textToSend || !user) return;

    if (isDemoMode) {
      const newMsg = { id: `demo-msg-${Date.now()}`, text: textToSend, uid: demoUser.uid, displayName: demoUser.displayName, groupId, isEncrypted: true, createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      return;
    }

    try {
      const { ciphertext, iv } = await encryptMessage(newMessage, symmetricKey);
      await addDoc(collection(db, 'messages'), {
        text: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
        iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
        uid: user.uid,
        groupId: groupId,
        displayName: user.displayName || user.email.split('@')[0],
        isEncrypted: true,
        createdAt: new Date().toISOString()
      });
      setNewMessage('');
    } catch (err) { console.error(err); }
  };

  const filteredMessages = messages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleFileChange = (e) => {
    if (isDemoMode) return;
    if (e.target.files[0]) setFile(e.target.files[0]);
  };

  const uploadFile = async () => {
    if (!file || !symmetricKey || !user) return;
    setUploading(true);
    try {
      const { ciphertext, iv } = await encryptBlob(file, symmetricKey);
      const fileRef = ref(storage, `uploads/${Date.now()}-${file.name}.enc`);
      await uploadBytes(fileRef, new Blob([ciphertext]));
      const downloadURL = await getDownloadURL(fileRef);
      await addDoc(collection(db, 'messages'), {
        text: btoa(downloadURL), iv: btoa(String.fromCharCode(...new Uint8Array(iv))), uid: user.uid, groupId, displayName: user.displayName || user.email.split('@')[0], isEncrypted: true, type: 'file', originalName: file.name, mimetype: file.type, createdAt: new Date().toISOString()
      });
      setFile(null);
    } catch (err) { console.error(err); } finally { setUploading(false); }
  };

  const downloadFile = async (msg) => {
    try {
      const response = await fetch(atob(msg.text));
      const decryptedBlob = await decryptBlob(await response.arrayBuffer(), symmetricKey, Uint8Array.from(atob(msg.iv), c => c.charCodeAt(0)), msg.mimetype);
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a'); a.href = url; a.download = msg.originalName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="flex flex-col h-screen bg-transparent text-white font-body overflow-hidden">
      {/* Header */}
      <div className="flex flex-col border-b border-white/5 bg-background-dark/40 backdrop-blur-xl sticky top-0 z-10 transition-all">
        <div className="flex items-center p-6 justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/groups')} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group">
              <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">arrow_back</span>
            </button>
            <div onClick={() => navigate(`/info/${groupId}`)} className="flex flex-col group cursor-pointer">
              <h2 className="font-extrabold font-display text-xl tracking-tight group-hover:text-primary transition-all">{groupInfo.name}</h2>
              <div className="flex items-center gap-1.5">
                <div className="size-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest italic">E2EE Secured Tunnel</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setIsSearching(!isSearching)} className={`p-3 rounded-2xl transition-all ${isSearching ? 'text-primary bg-primary/10 border-primary/30' : 'bg-white/5 border border-white/5 text-slate-400 hover:text-white'}`}>
              <span className="material-symbols-outlined text-lg font-bold">search</span>
            </button>
            {!isDemoMode && groupInfo.members?.length > 1 && (
              <button className="p-3 bg-white/5 border border-white/5 text-primary hover:bg-primary/10 rounded-2xl transition-all shadow-glow">
                <span className="material-symbols-outlined text-lg">call</span>
              </button>
            )}
          </div>
        </div>

        {isSearching && (
          <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3 bg-black/40 p-4 rounded-2xl border border-primary/20 shadow-inner group">
              <span className="material-symbols-outlined text-sm text-slate-600 group-focus-within:text-primary transition-colors">search</span>
              <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search encrypted messages..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-700" />
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-hide">
        {filteredMessages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.uid === user?.uid ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <div className={`flex items-center gap-3 mb-2 px-1 ${msg.uid === user?.uid ? 'flex-row-reverse' : ''}`}>
              <div className="size-6 rounded-lg bg-white/5 flex items-center justify-center text-[8px] font-bold text-slate-400">
                {msg.displayName?.charAt(0)}
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{msg.displayName}</span>
              <span className="text-[8px] text-slate-700 font-mono tracking-tighter">
                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>

            <div className={`relative group max-w-[75%] p-5 rounded-3xl transition-all shadow-2xl ${msg.uid === user?.uid
              ? 'bg-primary text-white rounded-tr-none shadow-primary/20'
              : 'bg-white/5 backdrop-blur-md border border-white/5 text-slate-200 rounded-tl-none hover:border-primary/20'
              }`}>
              {msg.type === 'file' ? (
                <div className="flex items-center gap-4 bg-black/30 p-4 rounded-2xl border border-white/5 group/file">
                  <div className="size-12 rounded-xl bg-white/5 flex items-center justify-center text-primary group-hover/file:bg-primary group-hover/file:text-white transition-all">
                    <span className="material-symbols-outlined text-2xl">description</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold truncate">{msg.originalName}</p>
                    <p className="text-[8px] opacity-40 uppercase font-bold tracking-[0.2em] mt-1">{msg.mimetype}</p>
                  </div>
                  <button onClick={() => downloadFile(msg)} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5">
                    <span className="material-symbols-outlined text-sm">download</span>
                  </button>
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              )}

              {msg.isEncrypted && (
                <div className={`flex items-center gap-1.5 mt-3 ${msg.uid === user?.uid ? 'opacity-50' : 'opacity-30'} group-hover:opacity-60 transition-opacity`}>
                  <span className="material-symbols-outlined text-[10px]">lock</span>
                  <span className="text-[8px] font-mono uppercase tracking-[0.1em] italic">Zero-Trust Secured</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="px-6 pb-6">
        <div className="glass-panel p-2 rounded-[2rem] shadow-2xl border-white/10 relative overflow-hidden group/input">
          {/* Animated Glow when focusing */}
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-focus-within/input:opacity-100 transition-opacity pointer-events-none"></div>

          <form onSubmit={sendMessage} className="relative z-10">
            <div className="flex items-center gap-2">
              {!isDemoMode && (
                <label className="p-4 text-slate-500 hover:text-primary transition-all cursor-pointer bg-white/5 rounded-2xl border border-white/5 ml-1">
                  <input type="file" className="hidden" onChange={handleFileChange} />
                  <span className="material-symbols-outlined font-bold">add_circle</span>
                </label>
              )}
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isDemoMode ? "Type encrypted message..." : "Direct communication terminal..."}
                className="flex-1 bg-transparent outline-none text-sm px-4 py-4 text-white placeholder:text-slate-600"
              />
              <button type="submit" className="bg-primary p-4 rounded-2xl hover:bg-primary/80 transition-all shadow-xl shadow-primary/20 mr-1 active:scale-95">
                <span className="material-symbols-outlined text-white font-bold">send</span>
              </button>
            </div>
          </form>

          {file && (
            <div className="mx-2 mb-2 mt-2 px-4 py-3 bg-black/40 rounded-2xl border border-primary/20 flex items-center justify-between border-dashed animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">priority_high</span>
                <span className="text-xs font-bold truncate max-w-[200px]">{file.name}</span>
              </div>
              <div className="flex gap-4">
                <button onClick={uploadFile} disabled={uploading} className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary hover:text-white transition-colors">
                  {uploading ? 'Encrypting...' : 'Upload Payload'}
                </button>
                <button onClick={() => setFile(null)} className="text-slate-600 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-sm font-bold">close</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
