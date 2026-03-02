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
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: username });
        // In a real app, we'd also initialize E2EE keys here
      }
      navigate('/chat');
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message);
      // For development/demo purposes if Firebase is not configured or API key is invalid
      if (err.message.includes('YOUR_API_KEY') || err.message.includes('api-key-not-valid')) {
         console.warn("Firebase not configured correctly, proceeding with mock user for demo");
         navigate('/chat');
      }
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
          <p className="text-slate-400 mt-2">{isLogin ? 'Welcome back, operative.' : 'Initialize your secure account.'}</p>
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

          {error && <p className="text-red-500 text-xs font-medium px-1">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full p-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/80 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-slate-400 hover:text-primary transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
