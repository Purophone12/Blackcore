import React, { useState, useEffect } from 'react';
import ChannelHeader from './components/ChannelHeader';
import QuickActions from './components/QuickActions';
import Settings from './components/Settings';
import MemberList from './components/MemberList';
import { generateSymmetricKey, encryptMessage, decryptMessage } from './utils/crypto';

const MOCK_MEMBERS = [
  {
    name: "Alex Rivera",
    status: "Online",
    isOnline: true,
    isOwner: true,
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBr6cXaIISu6oPFGXYA6zbIOctFvv_imd1hyXauGLnB3A-gsys1bLjvKxRZfNEmTtGKhh8o-fQISlep7RyXNx0qQ-XM5u5VZXj1TixBa6FgqA71rCf4E4keZAO2YL_H1W98nc0RL167WHBihBPvjinBhtY7YU3QL_s-c4TqJFnp2R7iUa5gYNo3XpTmrssARQeRUaVI0XDdd0Ks7RNQaD3V_uO0P0AbBpMQOyIIFoTizjM1eBv8ZW2G8YNXcZr3RAhvJu8ia7QIuMw"
  },
  {
    name: "Sarah Chen",
    status: "Offline",
    isOnline: false,
    isOwner: false,
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBHtmKGiR36cwFAixVmjaHz7au4jcdKyFptkYDn89C-k9v_MBese0bIcnvT71LwAPWv_98ihqDwj8svziwJAhs-wcmcAoUawdZRMWwo6ttuJ_-1xm3ypJW9_IRruiOzwbq1qYuUvOs0LYsQYa69cb9hHlWwz4ipJLtJbDnEuhJkeL-HrpM-CKFxN4LWyPzeqxj2FLShwDycHCmNahgPCqX0mfDZeylhXIyEE9Ba3iN8zM51i57oNzfB8h54atqcRDnxJC4iu-G6qRE"
  },
  {
    name: "Marcus V.",
    status: "Online",
    isOnline: true,
    isOwner: false,
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDTyThmEu95UnkIaifr74xgfQkpoU1j-PfDbXtxbljmxxeVaC4EZ_lzrkdmf1RbRzV0BXzYSMYwXlyS_F6Sgb54Gl1wRhYUa8wApDCkPpUkPdgQ7wJ_fRdNE28KKdrhjtjmGYzxyfTiQvTIHy9Eq6wcDeGwsRi5BfQaE8c1GY16Ls9kW3BTRBbyImOKQ3lzd8luT3E3cUWGeVYfdeUWI68jK9qD74HW2E_a8NXI871rvlY8K-tKnAAxYFKK_wUauNBxdQTBGBquQzo"
  }
];

function App() {
  const [notifications, setNotifications] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [appearance, setAppearance] = useState("Neon Violet");
  const [cryptoStatus, setCryptoStatus] = useState("Initializing E2EE...");

  useEffect(() => {
    async function initCrypto() {
      try {
        const key = await generateSymmetricKey();
        const msg = "E2EE Active";
        const encrypted = await encryptMessage(msg, key);
        const decrypted = await decryptMessage(encrypted.ciphertext, key, encrypted.iv);
        if (decrypted === msg) {
          setCryptoStatus("E2EE Verified & Active");
        }
      } catch (e) {
        setCryptoStatus("E2EE Initialization Failed");
      }
    }
    initCrypto();
  }, []);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Top Navigation */}
      <div className="flex items-center p-6 justify-between">
        <button className="text-slate-900 dark:text-slate-100 p-2 hover:bg-primary/10 rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold tracking-tight">Channel Info</h1>
          <span className="text-[8px] text-green-500 font-bold uppercase tracking-widest">{cryptoStatus}</span>
        </div>
        <button className="text-slate-900 dark:text-slate-100 p-2 hover:bg-primary/10 rounded-full transition-colors">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>

      <ChannelHeader
        name="Dev Team"
        membersCount={12}
        type="Public Channel"
        description="Building the future of Blackcore. High performance, low latency modules only."
        avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuBWKEaapNrVIeemjUKVc0P9LzaEuIeBFPQn_Mg86k1IArk57K1p8MPcOP1AcFNnh4A5D2CBv1ABY-UAXbT_HpCWQz_zuE0a4D3-k0CECOyYjt9C6TZ2GZqd4hGGTLLM0tHvgd-o10DzWa4_Axb0BD9wrEBf1u68o9Al5hOK-5ziUr2GNnH5sKyM64a2OBzc9xDuPPBkwML0RBfZQnicXF7eXcvMnrU2nMtFXjI7GNP1Jw28Zu2kCENmt9Ik1nh_atRr1M7AequlOI8"
      />

      <QuickActions
        isMuted={isMuted}
        onMuteToggle={() => setIsMuted(!isMuted)}
      />

      <Settings
        notifications={notifications}
        onNotificationsChange={setNotifications}
        appearance={appearance}
      />

      <MemberList members={MOCK_MEMBERS} />

      {/* Danger Zone */}
      <div className="px-6 pb-12 mt-auto">
        <button className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-bold group">
          <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">logout</span>
          Leave Group
        </button>
      </div>
    </div>
  );
}

export default App;
