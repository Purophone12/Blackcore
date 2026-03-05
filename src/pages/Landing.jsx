import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark text-white font-body px-6 text-center mesh-gradient relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-[-10%] left-[-10%] size-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] size-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl w-full space-y-12 z-10">
        <div className="space-y-4">
          <div className="inline-block p-1 rounded-[2.5rem] bg-gradient-to-b from-primary/30 to-transparent mb-6 animate-float">
            <div className="bg-background-dark/80 backdrop-blur-xl p-4 rounded-[2.2rem] shadow-2xl">
              <img src="/logo.png" alt="Blackcore Logo" className="size-24 object-contain shadow-glow-primary rounded-2xl" />
            </div>
          </div>
          <h1 className="text-7xl font-extrabold tracking-tighter leading-tight font-display">
            Connect <span className="text-primary italic">Privately.</span><br />
            Communicate <span className="text-primary underline decoration-primary/30">Securely.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Blackcore is the next-gen decentralized messaging platform for high-performance teams.
            <span className="text-primary/80"> E2EE by default. </span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => navigate('/signup')}
            className="w-full sm:w-auto px-12 py-5 bg-primary rounded-2xl font-bold text-lg hover:bg-primary/80 transition-all shadow-[0_20px_50px_rgba(138,44,226,0.3)] flex items-center justify-center gap-2 group"
          >
            Get Started
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-12 py-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl font-bold text-lg hover:bg-white/10 hover:border-primary/50 transition-all flex items-center justify-center gap-2"
          >
            Login
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
          <div className="glass-panel p-8 rounded-3xl text-left hover:border-primary/40 transition-all group">
            <span className="material-symbols-outlined text-primary text-3xl mb-4 block group-hover:scale-110 transition-transform">lock</span>
            <h3 className="font-bold text-xl mb-2 font-display">Military Grade E2EE</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Your data never leaves your device unencrypted. AES-GCM 256-bit encryption for every bit.</p>
          </div>
          <div className="glass-panel p-8 rounded-3xl text-left hover:border-primary/40 transition-all group">
            <span className="material-symbols-outlined text-primary text-3xl mb-4 block group-hover:scale-110 transition-transform">group</span>
            <h3 className="font-bold text-xl mb-2 font-display">Team Centric</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Organize your collective missions with specialized modules for high-performance collaboration.</p>
          </div>
          <div className="glass-panel p-8 rounded-3xl text-left hover:border-primary/40 transition-all group">
            <span className="material-symbols-outlined text-primary text-3xl mb-4 block group-hover:scale-110 transition-transform">terminal</span>
            <h3 className="font-bold text-xl mb-2 font-display">Dev First</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Built with a modular architecture for maximum performance and unlimited scalability.</p>
          </div>
        </div>

        <footer className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.4em] pt-12 pb-8">
          Powered by Blackcore Systems • v1.1.0-alpha
        </footer>
      </div>
    </div>
  );
};

export default Landing;
