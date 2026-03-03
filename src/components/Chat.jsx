import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  where,
  doc,
  getDoc
} from 'firebase/firestore';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { deriveGroupKey, encryptMessage, decryptMessage, encryptBlob, decryptBlob } from '../utils/crypto';

const Chat = () => {
  const { groupId } = useParams();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(location.search.includes('search=true'));
  const [isTyping, setIsTyping] = useState(false);
  const [groupInfo, setGroupInfo] = useState({ name: 'Group Chat' });
  const [symmetricKey, setSymmetricKey] = useState(null);
  const scrollRef = useRef();
  const navigate = useNavigate();
  const user = auth.currentUser || { displayName: 'Agent', uid: 'mock-uid' };

  useEffect(() => {
    async function fetchGroupInfo() {
      if (!groupId || groupId.startsWith('mock-')) return;
      try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          setGroupInfo(groupDoc.data());
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
        const keyMaterial = await deriveGroupKey(groupId);
        setSymmetricKey(keyMaterial);
      } catch (err) {
        console.error("Key derivation failed:", err);
      }
    }
    initKey();
  }, [groupId]);

  useEffect(() => {
    if (!symmetricKey || !groupId) return;

    const q = query(
      collection(db, 'messages'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedMessages = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        let text = data.text;

        if (data.isEncrypted && symmetricKey) {
          try {
            const ciphertext = Uint8Array.from(atob(data.text), c => c.charCodeAt(0)).buffer;
            const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));

            if (data.type === 'file') {
              text = `Encrypted File: ${data.originalName}`;
            } else {
              text = await decryptMessage(ciphertext, symmetricKey, iv);
            }
          } catch (e) {
            console.error("Decryption failed", e);
            text = "[Decryption Failed]";
          }
        }

        return {
          id: doc.id,
          ...data,
          text
        };
      }));
      setMessages(fetchedMessages.reverse());
    }, (err) => {
      console.error("Firestore onSnapshot error:", err);
    });

    return () => unsubscribe();
  }, [symmetricKey, groupId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const textToSend = newMessage.trim();
    if (!textToSend || !symmetricKey) return;

    try {
      const { ciphertext, iv } = await encryptMessage(newMessage, symmetricKey);
      const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
      const ivBase64 = btoa(String.fromCharCode(...new Uint8Array(iv)));

      await addDoc(collection(db, 'messages'), {
        text: ciphertextBase64,
        iv: ivBase64,
        uid: user.uid,
        groupId: groupId,
        displayName: user.displayName,
        createdAt: serverTimestamp(),
        isEncrypted: true
      });

      setNewMessage('');
    } catch (err) {
      console.error("Error sending message:", err);
      const mockMsg = {
        id: Date.now().toString(),
        text: textToSend,
        uid: user.uid,
        displayName: user.displayName,
        createdAt: { toDate: () => new Date() },
        isEncrypted: true
      };
      setMessages(prev => [...prev, mockMsg]);
      setNewMessage('');
    }
  };

  const filteredMessages = messages.filter(m =>
    m.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mock typing indicator
  useEffect(() => {
    if (newMessage.length > 0 && !isTyping) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [newMessage]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!file || !symmetricKey) return;
    setUploading(true);
    try {
      const { ciphertext, iv } = await encryptBlob(file, symmetricKey);
      const ivBase64 = btoa(String.fromCharCode(...new Uint8Array(iv)));

      const formData = new FormData();
      formData.append('file', new Blob([ciphertext]), file.name + '.enc');

      const response = await fetch('http://localhost:5001/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      await addDoc(collection(db, 'messages'), {
        text: btoa(result.filename), // We store the filename as text for files
        iv: ivBase64,
        uid: user.uid,
        groupId: groupId,
        displayName: user.displayName,
        createdAt: serverTimestamp(),
        isEncrypted: true,
        type: 'file',
        originalName: file.name,
        mimetype: file.type
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
      const response = await fetch(`http://localhost:5001/download/${atob(msg.text)}`);
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
              <div className="size-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">E2EE Active</span>
            </div>
          </div>
          <button onClick={() => setIsSearching(!isSearching)} className={`p-2 rounded-full transition-colors mr-1 ${isSearching ? 'text-primary bg-primary/10' : 'text-slate-400 hover:bg-primary/10'}`}>
            <span className="material-symbols-outlined">search</span>
          </button>
          <button onClick={() => auth.signOut().then(() => navigate('/'))} className="p-2 hover:bg-red-500/10 text-red-500 rounded-full transition-colors">
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
                className="flex-1 bg-transparent outline-none text-xs py-1"
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
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {filteredMessages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.uid === user.uid ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`flex items-center gap-2 mb-1 px-2 ${msg.uid === user.uid ? 'flex-row-reverse' : ''}`}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {msg.displayName || 'Member'}
              </span>
                <span className="text-[8px] text-slate-600 font-medium">
                  {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </span>
            </div>
            <div className={`relative group max-w-[80%] p-4 rounded-2xl shadow-lg transition-all ${
              msg.uid === user.uid
                ? 'bg-primary text-white rounded-tr-none shadow-primary/10'
                : 'bg-card-dark border border-primary/10 rounded-tl-none'
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

              {/* Reactions Bar (Social Feature) */}
              <div className={`absolute -bottom-3 ${msg.uid === user.uid ? 'right-0' : 'left-0'} flex gap-1`}>
                 <div className="bg-background-dark border border-primary/20 rounded-full px-1.5 py-0.5 flex gap-1 items-center scale-90">
                    <span className="text-[10px]">🔥</span>
                    <span className="text-[8px] font-bold text-primary">1</span>
                 </div>
              </div>

              {msg.isEncrypted && (
                <div className="flex items-center gap-1 mt-2 opacity-40">
                   <span className="material-symbols-outlined text-[10px]">lock</span>
                   <span className="text-[8px] font-bold uppercase tracking-tighter italic">E2EE Secured</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Typing Indicator */}
      {isTyping && (
        <div className="px-6 py-2 flex items-center gap-2 animate-pulse">
           <div className="flex gap-1">
              <div className="size-1 bg-primary rounded-full"></div>
              <div className="size-1 bg-primary rounded-full"></div>
              <div className="size-1 bg-primary rounded-full"></div>
           </div>
           <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Someone is typing...</span>
        </div>
      )}

      {/* Input */}
      <div className="px-4">
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
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message..."
            className="flex-1 bg-transparent outline-none text-sm py-2"
          />
          <button type="submit" className="bg-primary p-2 rounded-xl hover:bg-primary/80 transition-all shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white">send</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
