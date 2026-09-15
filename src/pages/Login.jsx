import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('admin_vasanthi');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(username, password);
    setLoading(false);

    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.error || 'Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-atmosphere-light dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl shadow-2xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl royal-gradient flex items-center justify-center text-white font-black font-display text-2xl shadow-xl shadow-blue-600/30">
            PS
          </div>
          <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
            Administrator Sign In
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            StudyPulse AI — Project Supervision System
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Username / Coordinator ID
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={username || ''}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] text-blue-600 dark:text-cyan-400 hover:underline font-semibold"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password || ''}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 royal-gradient hover:opacity-95 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'LOGIN'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-indigo-950/40 border border-blue-200/80 dark:border-indigo-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-900 dark:text-white">Demo Credentials Loaded:</p>
            <p>Username: <code className="font-mono text-blue-600 dark:text-cyan-400">admin</code> | Password: <code className="font-mono text-blue-600 dark:text-cyan-400">password123</code></p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
          Don't have an admin account?{' '}
          <Link to="/signup" className="font-bold text-blue-600 dark:text-cyan-400 hover:underline">
            Sign Up
          </Link>
        </p>

      </div>
    </div>
  );
}
