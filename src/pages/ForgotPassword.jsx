import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { Mail, KeyRound, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { loginWithAdminData } = useAuth();

  const [step, setStep] = useState(1); // 1 = Email, 2 = OTP
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [demoCode, setDemoCode] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [registeredAdmins, setRegisteredAdmins] = useState([]);

  useEffect(() => {
    // Load registered admins to assist quick selection if desired
    api.getAdmins().then(res => {
      if (res && res.admins) {
        setRegisteredAdmins(res.admins);
      }
    }).catch(err => console.warn('Could not load admins list', err));
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid administrator email address.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.forgotPasswordSendOtp(email.trim());
      setLoading(false);
      if (res.success) {
        setDemoCode(res.demoCode);
        setSuccessMsg(`Verification code sent to ${email.trim()}`);
        setStep(2);
        setResendCooldown(60);
      } else {
        setErrorMsg(res.error || 'Failed to dispatch verification OTP.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg('Network error connecting to authentication server.');
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.forgotPasswordVerifyOtp(email.trim(), otp.trim(), newPassword.trim() || null);
      setLoading(false);
      if (res.success && res.admin) {
        setSuccessMsg('OTP verified successfully! Redirecting directly to Dashboard...');
        loginWithAdminData(res.admin);
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      } else {
        setErrorMsg(res.error || 'Invalid or expired OTP code.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg('Verification failed. Please check the OTP and try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F9F4EE] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100">
      <div className="max-w-md w-full glass-panel p-8 rounded-3xl bg-white/90 dark:bg-slate-900/90 shadow-2xl border border-slate-200/80 dark:border-slate-800 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 royal-gradient rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-600/30">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            Admin Password Recovery
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {step === 1 
              ? 'Enter your registered administrator email to receive a 6-digit verification OTP.' 
              : `Enter the 6-digit OTP code dispatched to ${email}.`}
          </p>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-900/80 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: Email Input */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Registered Administrator Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email || ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@studypulse.edu"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                />
              </div>
            </div>

            {/* Quick Demo Selector for Registered Admins */}
            {registeredAdmins.length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Registered Admin Account:
                </p>
                <div className="flex flex-col gap-1.5">
                  {registeredAdmins.map((adm) => (
                    <button
                      key={adm.id}
                      type="button"
                      onClick={() => setEmail(adm.email)}
                      className={`text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer border ${
                        email === adm.email 
                          ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold' 
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <span className="font-bold">{adm.username}</span>
                        <span className="text-[11px] text-slate-500 ml-2">({adm.email})</span>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {adm.userId || 'Admin'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 royal-gradient hover:opacity-95 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Sending OTP Code...</span>
              ) : (
                <>
                  <span>SEND VERIFICATION OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP Entry & Dashboard Navigation */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {demoCode && (
              <div className="p-3 bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-blue-800 dark:text-blue-200">Demo Code: </span>
                  <span className="font-mono text-sm font-bold text-blue-600 dark:text-cyan-400">{demoCode}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOtp(demoCode)}
                  className="px-2.5 py-1 text-[10px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  Auto-Fill OTP
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                6-Digit Security OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp || ''}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full px-4 py-3 text-center tracking-[0.5em] text-lg font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                New Password (Optional)
              </label>
              <input
                type="password"
                value={newPassword || ''}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep existing password"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Email</span>
              </button>

              <button
                type="button"
                disabled={resendCooldown > 0 || loading}
                onClick={handleSendOtp}
                className="text-blue-600 dark:text-cyan-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:no-underline"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 royal-gradient hover:opacity-95 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span>Verifying & Authenticating...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>VERIFY OTP & ACCESS DASHBOARD</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Bottom Navigation */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
          <Link
            to="/login"
            className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 transition-colors"
          >
            ← Back to Sign In
          </Link>
          <Link
            to="/signup"
            className="text-blue-600 dark:text-cyan-400 hover:underline"
          >
            Admin Registration
          </Link>
        </div>

      </div>
    </div>
  );
}
