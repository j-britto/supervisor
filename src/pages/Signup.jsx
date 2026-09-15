import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { User, Phone, Mail, Lock, ShieldCheck, ArrowRight, CheckCircle, Users, AlertTriangle } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    phoneNumber: '',
    email: '',
    id: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await api.getAdmins();
      if (res && res.admins) {
        setAdminList(res.admins);
      }
    } catch (err) {
      console.error('Failed to fetch admin list:', err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (adminList.length >= 2) {
      setError('System Registration Limit: Exactly 2 administrators are permitted in StudyPulse AI. Admin slots are currently full (2/2).');
      return;
    }

    // Phone validation
    if (!/^\d{10}$/.test(formData.phoneNumber.trim())) {
      setError('Phone Number must be exactly 10 numeric digits.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.signup(formData);
      if (res.success) {
        // Send OTP to email or phone
        await api.sendOtp(formData.email);
        navigate('/verify-otp', { state: { email: formData.email, phone: formData.phoneNumber } });
      } else {
        setError(res.error || 'Registration failed.');
      }
    } catch (err) {
      setError('Server error during registration.');
    } finally {
      setLoading(false);
    }
  };

  const isCapacityFull = adminList.length >= 2;

  return (
    <div className="min-h-screen bg-[#F9F4EE] dark:bg-slate-950 flex flex-col items-center justify-center p-4 py-8 font-sans">
      <div className="w-full max-w-xl space-y-6">
        
        {/* Main Card */}
        <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl royal-gradient flex items-center justify-center text-white font-bold font-display text-xl shadow-lg shadow-blue-600/30">
              PS
            </div>
            <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white">
              Administrator Registration
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Project Supervision & Monitoring System (PSMS) • Max 2 Administrators
            </p>
          </div>

          {/* Admin Slot Indicator Banner */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
            isCapacityFull 
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200' 
              : 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
          }`}>
            <Users className="w-5 h-5 shrink-0 mt-0.5 text-blue-600 dark:text-cyan-400" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>Admin Capacity Status</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-700">
                  {adminList.length} / 2 Registered
                </span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {isCapacityFull
                  ? 'Both administrator slots (2 of 2) are occupied. New registrations are locked to preserve institutional governance. You can sign in using an existing account.'
                  : `There is currently ${2 - adminList.length} slot available for administrator onboarding.`}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="username"
                  required
                  disabled={isCapacityFull}
                  value={formData.username || ''}
                  onChange={handleChange}
                  placeholder="admin_vasanthi"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number (10 Digits)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="phoneNumber"
                    required
                    maxLength={10}
                    disabled={isCapacityFull}
                    value={formData.phoneNumber || ''}
                    onChange={handleChange}
                    placeholder="9876543210"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  User ID / Staff Roll
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="id"
                    required
                    disabled={isCapacityFull}
                    value={formData.id || ''}
                    onChange={handleChange}
                    placeholder="STF-VAS-01"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  required
                  disabled={isCapacityFull}
                  value={formData.email || ''}
                  onChange={handleChange}
                  placeholder="vasanthi@studypulse.edu"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    required
                    disabled={isCapacityFull}
                    value={formData.password || ''}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    disabled={isCapacityFull}
                    value={formData.confirmPassword || ''}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isCapacityFull}
              className="w-full py-3 royal-gradient hover:opacity-95 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Processing...' : isCapacityFull ? 'ADMIN CAPACITY REACHED (2/2)' : 'SEND OTP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">
              Already registered?{' '}
              <Link to="/login" className="font-bold text-blue-600 dark:text-cyan-400 hover:underline">
                Sign In
              </Link>
            </span>
            <Link to="/forgot-password" className="text-blue-600 dark:text-cyan-400 font-semibold hover:underline">
              Forgot Password?
            </Link>
          </div>

        </div>

        {/* Admin Table (Registered Administrators Table) */}
        <div className="glass-panel p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 shadow-xl border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white">
                  System Administrators Table
                </h3>
                <p className="text-[11px] text-slate-500">
                  Total Active Administrators ({adminList.length} of 2 Maximum)
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-mono">
              Limit: 2 Admins
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 min-w-[140px]">Admin Name</th>
                  <th className="px-4 py-3 min-w-[120px]">Phone Number</th>
                  <th className="px-4 py-3 min-w-[120px]">Staff Roll / ID</th>
                  <th className="px-4 py-3 min-w-[180px]">Email Address</th>
                  <th className="px-4 py-3 min-w-[100px] text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white/60 dark:bg-slate-900/60">
                {adminList.map((adm, idx) => (
                  <tr key={adm.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600/10 dark:bg-cyan-500/20 text-blue-700 dark:text-cyan-300 flex items-center justify-center font-bold text-xs">
                        {adm.username ? adm.username.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <span>{adm.username}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700 dark:text-slate-300 font-medium">
                      {adm.phone || 'N/A'}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700 dark:text-slate-300 font-medium">
                      {adm.userId || 'N/A'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                      {adm.email}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 inline-block">
                        Active Admin {idx + 1}
                      </span>
                    </td>
                  </tr>
                ))}
                {adminList.length < 2 && (
                  <tr className="bg-slate-50/40 dark:bg-slate-950/40 text-slate-400 italic">
                    <td className="px-4 py-3" colSpan={5}>
                      + Slot 2 Available for registration above
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
