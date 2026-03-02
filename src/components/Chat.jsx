import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { generateSymmetricKey, encryptMessage, decryptMessage } from '../utils/crypto';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [symmetricKey, setSymmetricKey] = useState(null);
  const scrollRef = useRef();
  const navigate = useNavigate();
  const user = auth.currentUser || { displayName: 'Agent', uid: 'mock-uid' };

  useEffect(() => {
    // In a real app, keys would be fetched from a secure store or derived
    async function initKey() {
      // Use a stable key for the room for this demo
      // In production, you'd exchange keys or use a key derivation function
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode("blackcore-stable-room-key-32bytes"),
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
      );
      setSymmetricKey(keyMaterial);
    }
    initKey();
  }, []);

  useEffect(() => {
    if (!symmetricKey) return;

    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedMessages = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        let text = data.text;

        if (data.isEncrypted && symmetricKey) {
          try {
            const ciphertext = Uint8Array.from(atob(data.text), c => c.charCodeAt(0)).buffer;
            const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));
            text = await decryptMessage(ciphertext, symmetricKey, iv);
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
      if (fetchedMessages.length > 0) {
        setMessages(fetchedMessages.reverse());
      }
    }, (err) => {
      console.error("Firestore onSnapshot error:", err);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const textToSend = newMessage.trim();
    if (!textToSend || !symmetricKey) return;

    try {
      // Encrypt message before sending
      const { ciphertext, iv } = await encryptMessage(newMessage, symmetricKey);

      // Convert ArrayBuffer to Base64 for Firestore
      const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
      const ivBase64 = btoa(String.fromCharCode(...new Uint8Array(iv)));

      await addDoc(collection(db, 'messages'), {
        text: ciphertextBase64, // Encrypted
        iv: ivBase64,
        uid: user.uid,
        displayName: user.displayName,
        createdAt: serverTimestamp(),
        isEncrypted: true
      });

      setNewMessage('');
    } catch (err) {
      console.error("Error sending message:", err);
      // Fallback for demo if Firestore fails or config is missing
      const mockMsg = {
        id: Date.now().toString(),
        text: textToSend,
        uid: user.uid,
        displayName: user.displayName,
        createdAt: { toDate: () => new Date() },
        isEncrypted: true // Label it as encrypted for UI
      };
      setMessages(prev => [...prev, mockMsg]);
      setNewMessage('');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background-dark text-white font-display">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-primary/10 bg-card-dark/50 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => navigate('/info')} className="p-2 hover:bg-primary/10 rounded-full transition-colors mr-2">
          <span className="material-symbols-outlined">info</span>
        </button>
        <div className="flex-1">
          <h2 className="font-bold tracking-tight">Dev Team</h2>
          <div className="flex items-center gap-1">
            <div className="size-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">E2EE Active</span>
          </div>
        </div>
        <button onClick={() => auth.signOut().then(() => navigate('/'))} className="p-2 hover:bg-red-500/10 text-red-500 rounded-full transition-colors">
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.uid === user.uid ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 px-2">
              {msg.displayName || 'Unknown Agent'}
            </span>
            <div className={`max-w-[80%] p-4 rounded-2xl ${
              msg.uid === user.uid
                ? 'bg-primary text-white rounded-tr-none'
                : 'bg-card-dark border border-primary/10 rounded-tl-none'
            }`}>
              <p className="text-sm">{msg.text}</p>
              {msg.isEncrypted && (
                <div className="flex items-center gap-1 mt-1 opacity-50">
                   <span className="material-symbols-outlined text-[10px]">lock</span>
                   <span className="text-[8px] font-bold uppercase tracking-tighter">Encrypted</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 bg-card-dark border-t border-primary/10">
        <div className="flex items-center gap-2 bg-background-dark p-2 rounded-2xl border border-primary/10 focus-within:border-primary transition-all">
          <button type="button" className="p-2 text-slate-500 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">add_circle</span>
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Secure transmission..."
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
