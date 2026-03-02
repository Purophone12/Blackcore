import React, { useState } from 'react';
import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isLogin) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: username });
        // In a real app, we'd also initialize E2EE keys here
      }
      navigate('/groups');
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-background-dark text-white font-display">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-block p-4 rounded-2xl bg-primary/20 neon-glow mb-4">
            <span className="material-symbols-outlined text-4xl text-primary">lock</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tighter">Blackcore</h2>

          <div className="flex bg-card-dark p-1 rounded-xl mt-8 mb-4 border border-primary/10">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${isLogin ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${!isLogin ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Sign Up
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 ml-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-4 rounded-xl bg-card-dark border border-primary/10 focus:border-primary outline-none transition-all"
                placeholder="Agent Zero"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 rounded-xl bg-card-dark border border-primary/10 focus:border-primary outline-none transition-all"
              placeholder="name@blackcore.io"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-xl bg-card-dark border border-primary/10 focus:border-primary outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {!isLogin && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 ml-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-4 rounded-xl bg-card-dark border border-primary/10 focus:border-primary outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          {error && <p className="text-red-500 text-xs font-medium px-1">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full p-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/80 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Auth;
