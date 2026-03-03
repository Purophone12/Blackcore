import React, { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: username });
      navigate('/groups');
    } catch (err) {
      console.error("Signup error:", err);
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
            <span className="material-symbols-outlined text-4xl text-primary">hub</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tighter">Join the Mission</h2>
          <p className="text-slate-500 mt-2 font-medium">Create your secure identity.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-4 rounded-xl bg-card-dark border border-primary/10 focus:border-primary outline-none transition-all shadow-lg shadow-primary/5"
              placeholder="Agent Zero"
              required
            />
          </div>
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
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Processing...' : 'Create Account'}
          </button>
        </form>

        <div className="text-center pt-4">
          <Link
            to="/login"
            className="text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest"
          >
            Already have an account? Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
