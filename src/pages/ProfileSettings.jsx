import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Smartphone,
  Key,
  Bot,
  Save,
  Edit2,
  X,
  Upload,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function ProfileSettings() {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const [adminData, setAdminData] = useState({
    username: '',
    email: '',
    phone: '',
    userId: '',
    profileImage: ''
  });
  const [adminsList, setAdminsList] = useState([]);

  const [settingsData, setSettingsData] = useState({
    smsEnabled: true,
    emailEnabled: true,
    ragEnabled: true,
    selectedSim: 'SIM 1',
    availableSims: ['SIM 1', 'SIM 2'],
    phoneNumber: '',
    emailId: '',
    emailAppId: '',
    aiApiKey: '',
    aiApiName: 'Gemini',
    aiModel: 'gemini-3.6-flash'
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const res = await api.getProfileSettings();
      if (res.admin) {
        setAdminData(prev => ({ ...prev, ...(res.admin || {}) }));
      }
      if (res.admins) {
        setAdminsList(res.admins);
      } else {
        const aRes = await api.getAdmins();
        if (aRes && aRes.admins) setAdminsList(aRes.admins);
      }
      if (res.settings) {
        setSettingsData(prev => ({ ...prev, ...(res.settings || {}) }));
      }
    } catch (err) {
      console.error('Failed to load profile settings:', err);
    }
  };

  const handleAdminChange = (e) => {
    setAdminData({ ...adminData, [e.target.name]: e.target.value });
  };

  const handleSettingsChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setSettingsData({ ...settingsData, [e.target.name]: value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdminData({ ...adminData, profileImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const phoneToTest = settingsData.phoneNumber || adminData.phone;
    if (!/^\d{10}$/.test(phoneToTest)) {
      setStatusMsg({ type: 'error', text: 'Phone Number must be exactly 10 digits without spaces or special characters.' });
      return false;
    }
    const emailToTest = settingsData.emailId || adminData.email;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToTest)) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid email address.' });
      return false;
    }
    return true;
  };

  const handleSaveConfirmed = async () => {
    if (!validate()) return;

    try {
      const res = await api.updateProfileSettings({
        admin: adminData,
        settings: settingsData
      });
      if (res.success) {
        setStatusMsg({ type: 'success', text: 'Profile settings saved successfully!' });
        setIsEditing(false);
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Failed to save settings.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Server error saving profile settings.' });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Header Bar with EDIT trigger */}
      <div className="flex items-center justify-between glass-panel p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
            Administrator Profile & System Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure notification gateways, SIM slots, AI RAG parameters, and account details.
          </p>
        </div>

        <div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-xs font-bold royal-gradient text-white rounded-xl shadow-md hover:opacity-95 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Edit2 className="w-4 h-4" />
              <span>EDIT</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>CANCEL</span>
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 border ${
          statusMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Details Card */}
        <div className="glass-panel p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 space-y-6 lg:col-span-1">
          <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Profile Image & Info
          </h3>

          <div className="flex flex-col items-center space-y-3">
            <div className="relative group">
              <img
                src={adminData.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt="Profile"
                className="w-24 h-24 rounded-2xl object-cover border-4 border-blue-500/30 shadow-lg"
              />
              {isEditing && (
                <label htmlFor="profile-upload" className="absolute inset-0 bg-slate-900/60 rounded-2xl flex items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-5 h-5" />
                </label>
              )}
              <input
                id="profile-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={!isEditing}
                className="hidden"
              />
            </div>

            {isEditing && (
              <span className="text-[10px] text-slate-400 font-medium">Click image to change photo</span>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Username</label>
              <input
                type="text"
                name="username"
                disabled={!isEditing}
                value={adminData.username || ''}
                onChange={handleAdminChange}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:opacity-75 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Email</label>
              <input
                type="email"
                name="email"
                disabled={!isEditing}
                value={adminData.email || ''}
                onChange={handleAdminChange}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:opacity-75 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Phone Number</label>
              <input
                type="text"
                name="phone"
                maxLength={10}
                disabled={!isEditing}
                value={adminData.phone || ''}
                onChange={handleAdminChange}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:opacity-75 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">User ID</label>
              <input
                type="text"
                name="userId"
                disabled={!isEditing}
                value={adminData.userId || ''}
                onChange={handleAdminChange}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:opacity-75 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Communication & SIM & AI Settings */}
        <div className="glass-panel p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 space-y-6 lg:col-span-2">
          
          {/* Communication Settings */}
          <div>
            <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 mb-4">
              <Phone className="w-4 h-4 text-blue-600" />
              Communication Toggles
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">SMS / Message</p>
                  <p className="text-[10px] text-slate-500">Auto review texts</p>
                </div>
                <input
                  type="checkbox"
                  name="smsEnabled"
                  disabled={!isEditing}
                  checked={Boolean(settingsData.smsEnabled)}
                  onChange={handleSettingsChange}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Email</p>
                  <p className="text-[10px] text-slate-500">Auto review emails</p>
                </div>
                <input
                  type="checkbox"
                  name="emailEnabled"
                  disabled={!isEditing}
                  checked={Boolean(settingsData.emailEnabled)}
                  onChange={handleSettingsChange}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">RAG Engine</p>
                  <p className="text-[10px] text-slate-500">AI search queries</p>
                </div>
                <input
                  type="checkbox"
                  name="ragEnabled"
                  disabled={!isEditing}
                  checked={Boolean(settingsData.ragEnabled)}
                  onChange={handleSettingsChange}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>


          {/* Email App ID Settings */}
          <div>
            <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-blue-600" />
              Email Gateway Credentials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  name="emailId"
                  disabled={!isEditing}
                  value={settingsData.emailId || adminData.email || ''}
                  onChange={handleSettingsChange}
                  className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:opacity-75 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Gmail App Password / SMTP Password
                </label>
                <input
                  type="password"
                  name="emailAppId"
                  disabled={!isEditing}
                  value={settingsData.emailAppId || ''}
                  onChange={handleSettingsChange}
                  placeholder="16-character App Password (e.g. abcd efgh ijkl mnop)"
                  className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:opacity-75 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* AI / RAG Settings */}
          <div>
            <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 mb-4">
              <Bot className="w-4 h-4 text-indigo-600" />
              AI & RAG Model Settings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">AI API Key</label>
                <input
                  type="password"
                  name="aiApiKey"
                  disabled={!isEditing}
                  value={settingsData.aiApiKey || ''}
                  onChange={handleSettingsChange}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:opacity-75 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">API Provider Name</label>
                <input
                  type="text"
                  name="aiApiName"
                  disabled={!isEditing}
                  value={settingsData.aiApiName || ''}
                  onChange={handleSettingsChange}
                  placeholder="Gemini"
                  className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:opacity-75 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">AI Model Name</label>
                <input
                  type="text"
                  name="aiModel"
                  disabled={!isEditing}
                  value={settingsData.aiModel || ''}
                  onChange={handleSettingsChange}
                  placeholder="gemini-3.6-flash"
                  className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:opacity-75 dark:text-white"
                />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Save Action Buttons */}
      {isEditing && (
        <div className="flex items-center justify-end gap-3 glass-panel p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80">
          <button
            onClick={() => setIsEditing(false)}
            className="px-5 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={() => setIsConfirmOpen(true)}
            className="px-6 py-2.5 text-xs font-bold royal-gradient hover:opacity-95 text-white rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            <span>SAVE</span>
          </button>
        </div>
      )}

      {/* Save Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleSaveConfirmed}
        title="Save Profile Settings?"
        message="Are you sure you want to save these changes to your administrator profile and gateway configuration?"
        confirmText="OK"
      />

    </div>
  );
}
