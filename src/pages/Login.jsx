import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('blackcore_user', JSON.stringify(data.user));
      localStorage.setItem('blackcore_token', data.token);
      navigate('/groups');
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-background-dark text-white font-display">
      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center">
          <div onClick={() => navigate('/')} className="inline-block p-4 rounded-2xl bg-primary/20 neon-glow mb-4 cursor-pointer hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-4xl text-primary">lock</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tighter">Welcome Back</h2>
          <p className="text-slate-500 mt-2 font-medium">Continue your mission securely.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 rounded-xl bg-card-dark border border-primary/10 focus:border-primary outline-none transition-all shadow-lg shadow-primary/5"
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
              className="w-full p-4 rounded-xl bg-card-dark border border-primary/10 focus:border-primary outline-none transition-all shadow-lg shadow-primary/5"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest px-1 animate-pulse">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full p-5 rounded-xl bg-primary text-white font-bold text-sm uppercase tracking-[0.2em] hover:bg-primary/80 transition-all shadow-2xl shadow-primary/20 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Login'}
          </button>
        </form>

        <div className="text-center pt-4">
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
