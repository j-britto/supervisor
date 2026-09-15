import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard,
  FolderGit2,
  ClipboardList,
  GraduationCap,
  FileCheck2,
  FileText,
  UploadCloud,
  MessageSquareCode,
  LogOut
} from 'lucide-react';

export default function Sidebar({ isOpen = true, onToggleSidebar }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Students', path: '/students', icon: GraduationCap },
    { label: 'Projects', path: '/projects', icon: FolderGit2 },
    { label: 'Reviews (1–6)', path: '/reviews', icon: ClipboardList },
    { label: 'Review Report', path: '/review-report', icon: FileCheck2 },
    { label: 'Final Report', path: '/final-report/4065', icon: FileText },
    { label: 'File Uploaded', path: '/file-uploaded', icon: UploadCloud },
    { label: 'Message Settings', path: '/message-settings', icon: MessageSquareCode }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${isOpen ? 'w-64' : 'w-20'} shrink-0 flex flex-col h-screen sticky top-0 z-50 rounded-none glass-panel border-r border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-3 sm:p-4 justify-between overflow-y-auto transition-all duration-300`} style={{ borderRadius: 0 }}>
      <div className="space-y-6">
        
        {/* Brand Logo Header & Expand/Collapse Toggle on Logo Click */}
        <div className={`flex items-center ${isOpen ? 'justify-between' : 'justify-center'} px-1 py-1`}>
          <div 
            onClick={onToggleSidebar}
            className="flex items-center gap-3 cursor-pointer group"
            title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <div className="w-10 h-10 rounded-xl royal-gradient flex items-center justify-center text-white font-black font-display text-lg shadow-lg shadow-blue-600/30 shrink-0 group-hover:scale-105 transition-transform">
              PS
            </div>
            {isOpen && (
              <div>
                <h1 className="text-base font-bold font-display tracking-tight text-slate-900 dark:text-white leading-tight">
                  StudyPulse <span className="text-blue-600 dark:text-cyan-400">AI</span>
                </h1>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Project Coordinator
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1.5">
          {isOpen && (
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Main Navigation
            </p>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={!isOpen ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center ${isOpen ? 'gap-3 px-3.5 py-2.5' : 'justify-center p-3'} rounded-xl text-xs font-semibold transition-all duration-200 group ${
                    isActive
                      ? 'bg-[#1E3FA6] dark:bg-indigo-600 text-white shadow-md shadow-[#1E3FA6]/20 font-bold'
                      : 'text-black dark:text-slate-400 hover:bg-[#F1F4FC] dark:hover:bg-slate-800/60 hover:text-black dark:hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                {isOpen && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

      </div>

      {/* Footer / Logout */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
        <button
          onClick={handleLogout}
          title={!isOpen ? "Sign Out" : undefined}
          className={`w-full flex items-center ${isOpen ? 'gap-3 px-3.5 py-2.5' : 'justify-center p-3'} rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {isOpen && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

