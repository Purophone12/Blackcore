import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  const handleDemoMode = () => {
    localStorage.setItem('blackcore_demo', 'true');
    localStorage.setItem('blackcore_user_demo', JSON.stringify({
      uid: 'demo-user-id',
      displayName: 'Demo Agent',
      email: 'demo@blackcore.io'
    }));
    navigate('/groups');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark text-white font-display px-6 text-center">
      <div className="max-w-4xl w-full space-y-12">
        <div className="space-y-4">
          <div className="inline-block p-4 rounded-3xl bg-primary/20 neon-glow mb-6 animate-bounce">
            <span className="material-symbols-outlined text-6xl text-primary">hub</span>
          </div>
          <h1 className="text-7xl font-bold tracking-tighter leading-tight">
            Connect <span className="text-primary italic">Privately.</span><br />
            Communicate <span className="text-primary underline decoration-primary/30">Securely.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Blackcore is the next-gen decentralized messaging platform for high-performance teams.
            E2EE as standard, not an option.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => navigate('/signup')}
            className="w-full sm:w-auto px-12 py-5 bg-primary rounded-2xl font-bold text-lg hover:bg-primary/80 transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-2 group"
          >
            Get Started
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-12 py-5 bg-card-dark border border-primary/20 rounded-2xl font-bold text-lg hover:border-primary transition-all flex items-center justify-center gap-2"
          >
            Login
          </button>
          <button
            onClick={handleDemoMode}
            className="w-full sm:w-auto px-12 py-5 bg-card-dark border border-primary/20 border-dashed rounded-2xl font-bold text-lg hover:border-primary transition-all flex items-center justify-center gap-2 group"
          >
            Try Demo
            <span className="material-symbols-outlined text-primary group-hover:rotate-12 transition-transform">bolt</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
          <div className="bg-card-dark/50 p-6 rounded-2xl border border-primary/5 text-left hover:border-primary/20 transition-colors group">
            <span className="material-symbols-outlined text-primary text-3xl mb-4 block group-hover:scale-110 transition-transform">lock</span>
            <h3 className="font-bold text-xl mb-2">Military Grade E2EE</h3>
            <p className="text-slate-500 text-sm">Your data never leaves your device unencrypted. We use industry-standard AES-GCM 256-bit encryption.</p>
          </div>
          <div className="bg-card-dark/50 p-6 rounded-2xl border border-primary/5 text-left hover:border-primary/20 transition-colors group">
            <span className="material-symbols-outlined text-primary text-3xl mb-4 block group-hover:scale-110 transition-transform">group</span>
            <h3 className="font-bold text-xl mb-2">Team Centric</h3>
            <p className="text-slate-500 text-sm">Create spaces, manage members, and organize your missions with high-performance low-latency modules.</p>
          </div>
          <div className="bg-card-dark/50 p-6 rounded-2xl border border-primary/5 text-left hover:border-primary/20 transition-colors group">
            <span className="material-symbols-outlined text-primary text-3xl mb-4 block group-hover:scale-110 transition-transform">terminal</span>
            <h3 className="font-bold text-xl mb-2">Dev First</h3>
            <p className="text-slate-500 text-sm">Built by developers for developers. Modular architecture designed for high performance and scalability.</p>
          </div>
        </div>

        <footer className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em] py-8">
          Powered by Blackcore Systems • v1.0.0
        </footer>
      </div>
    </div>
  );
};

export default Landing;
