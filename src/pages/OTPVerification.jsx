import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { ShieldCheck, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

export default function OTPVerification() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || 'admin@studypulse.edu';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timer

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value[0];
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter complete 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp(email, fullOtp);
      if (res.success) {
        setSuccess('OTP verified successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 1200);
      } else {
        setError(res.error || 'Invalid or expired OTP.');
      }
    } catch (err) {
      setError('Server verification error.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await api.sendOtp(email);
      setTimeLeft(300);
      setSuccess(`New OTP generated. (Demo Code: ${res.demoCode})`);
    } catch (err) {
      setError('Failed to resend OTP.');
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-atmosphere-light dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl shadow-2xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl space-y-6 text-center">
        
        <div className="w-16 h-16 mx-auto rounded-2xl royal-gradient flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white">
            OTP VERIFICATION
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            We sent a 6-digit verification code to <span className="font-semibold text-slate-800 dark:text-slate-200">{email}</span>
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
            {success}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center gap-2">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-input-${idx}`}
                type="text"
                maxLength={1}
                value={digit || ''}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-13 text-center font-display text-xl font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white focus:outline-none"
              />
            ))}
          </div>

          <div className="text-xs font-medium text-slate-500">
            {timeLeft > 0 ? (
              <span>OTP Expires in <strong className="text-blue-600 dark:text-cyan-400 font-mono">{formatTime(timeLeft)}</strong></span>
            ) : (
              <span className="text-rose-500 font-semibold">OTP Expired</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 royal-gradient hover:opacity-95 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{loading ? 'Verifying...' : 'VERIFY OTP'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
          <button
            onClick={handleResend}
            className="font-semibold text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Resend OTP
          </button>
          <Link to="/login" className="hover:underline">
            Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
}
