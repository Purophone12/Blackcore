import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { enterDemoMode } = useDemo();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/groups');
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    enterDemoMode();
    navigate('/groups');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-background-dark text-white font-body mesh-gradient relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-[-10%] right-[-10%] size-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in-95 duration-500 z-10">
        <div className="text-center">
          <div onClick={() => navigate('/')} className="inline-block p-1 rounded-3xl bg-gradient-to-b from-primary/30 to-transparent mb-6 cursor-pointer hover:scale-105 transition-transform active:scale-95">
            <div className="bg-background-dark/80 backdrop-blur-xl p-3 rounded-2xl shadow-xl">
              <img src="/logo.png" alt="Blackcore Logo" className="size-16 object-contain" />
            </div>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tighter font-display">Welcome Back</h2>
          <p className="text-slate-500 mt-2 font-medium">Continue your mission securely.</p>
        </div>

        <div className="glass-panel p-8 rounded-[2.5rem] shadow-2xl space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 rounded-2xl bg-black/20 border border-white/5 focus:border-primary outline-none transition-all text-white placeholder:text-slate-700"
                placeholder="name@blackcore.io"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 rounded-2xl bg-black/20 border border-white/5 focus:border-primary outline-none transition-all text-white placeholder:text-slate-700"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest px-1 animate-pulse">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full p-5 rounded-2xl bg-primary text-white font-bold text-sm uppercase tracking-[0.2em] hover:bg-primary/80 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 mt-2"
            >
              {loading ? 'Processing...' : 'Login'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5"></div>
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/5"></div>
          </div>

          {/* Demo Access Button */}
          <button
            onClick={handleDemoAccess}
            className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/40 text-slate-300 font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 group hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-primary text-lg group-hover:rotate-12 transition-transform">visibility</span>
            Demo Access
          </button>
        </div>

        <div className="text-center pt-2">
          <Link
            to="/signup"
            className="text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest"
          >
            Don't have an account? Create One
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
