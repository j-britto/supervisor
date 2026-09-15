import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { api } from '../services/api.js';
import NotificationInbox from './NotificationInbox.jsx';
import SecurityShieldModal from './SecurityShieldModal.jsx';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Bot,
  User,
  FolderGit2,
  X,
  ShieldCheck
} from 'lucide-react';

export default function Navbar({ onOpenRAG, isSidebarOpen, onToggleSidebar }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const prevRouteRef = useRef('/dashboard');

  useEffect(() => {
    if (location.pathname !== '/profile-settings') {
      prevRouteRef.current = location.pathname;
    }
  }, [location.pathname]);

  const handleToggleAdminProfile = () => {
    if (location.pathname === '/profile-settings') {
      navigate(prevRouteRef.current || '/dashboard');
    } else {
      navigate('/profile-settings');
    }
  };

  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ students: [], projects: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [allStudents, setAllStudents] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    // Fetch students and projects for global search
    Promise.all([api.getStudents(), api.getProjects()])
      .then(([sList, pList]) => {
        if (Array.isArray(sList)) setAllStudents(sList);
        if (Array.isArray(pList)) setAllProjects(pList);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ students: [], projects: [] });
      setIsSearchOpen(false);
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const matchedStudents = allStudents.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      String(s.register_number).includes(q) ||
      s.department?.toLowerCase().includes(q) ||
      s.batch_number?.toString().includes(q)
    ).slice(0, 4);

    const matchedProjects = allProjects.filter(p =>
      p.project_title?.toLowerCase().includes(q) ||
      p.tech_stack?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    ).slice(0, 4);

    setSearchResults({ students: matchedStudents, projects: matchedProjects });
    setIsSearchOpen(true);
  }, [searchQuery, allStudents, allProjects]);

  // Click outside listener to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="navbar sticky top-0 z-40 w-full rounded-none glass-panel border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl" style={{ borderRadius: 0 }}>
      <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">

        {/* Left: Functional Global Search */}
        <div ref={searchRef} className="relative flex-1 max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setIsSearchOpen(true)}
              placeholder="Search student, reg no, project title, tech stack..."
              className="w-full sm:w-60 md:w-72 lg:w-80 pl-10 pr-10 py-2.5 text-xs font-semibold bg-slate-100/90 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Functional Search Overlay Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50 space-y-3 max-h-96 overflow-y-auto">
              {searchResults.students.length === 0 && searchResults.projects.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No matching records found for "{searchQuery}"</p>
              ) : (
                <>
                  {searchResults.students.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">Students</p>
                      {searchResults.students.map(s => (
                        <div
                          key={s.id}
                          onClick={() => {
                            navigate(`/final-report/${s.register_number}`);
                            setIsSearchOpen(false);
                          }}
                          className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-blue-600" />
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{s.name}</p>
                              <p className="text-[10px] text-slate-500">Reg: {s.register_number} • Dept: {s.department}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-blue-600">Report →</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.projects.length > 0 && (
                    <div className="space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">Projects</p>
                      {searchResults.projects.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            navigate('/projects');
                            setIsSearchOpen(false);
                          }}
                          className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <FolderGit2 className="w-3.5 h-3.5 text-indigo-600" />
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{p.project_title}</p>
                              <p className="text-[10px] text-slate-500">{p.tech_stack}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600">Projects →</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Controls: RAG, Theme, Notifications, Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* RAG AI Assistant Button */}
          <button
            onClick={onOpenRAG}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white royal-gradient hover:opacity-95 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">RAG AI</span>
          </button>

          {/* Security Shield & 4-Layer Firewall Trigger */}
          <button
            onClick={() => setIsSecurityModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
            title="4-Layer Firewall & Antivirus Active"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline font-mono text-[11px]">Shield Active</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Admin Profile Avatar (Toggle Admin Page / Profile) */}
          <button
            onClick={handleToggleAdminProfile}
            className={`flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 transition-all cursor-pointer group text-left px-2 py-1 rounded-xl ${
              location.pathname === '/profile-settings'
                ? 'bg-blue-50 dark:bg-blue-950/70 ring-2 ring-blue-500/50'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={location.pathname === '/profile-settings' ? 'Close Admin Page (Return)' : 'Open Admin Page & Profile Settings'}
            aria-label="Toggle Admin Page"
          >
            <img
              src={user?.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={user?.username || 'Admin'}
              className="w-8 h-8 rounded-full object-cover border-2 border-blue-500/50 shadow-sm group-hover:border-blue-600 transition-colors"
            />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                {user?.username || 'Admin'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                Project Coordinator
              </p>
            </div>
          </button>

        </div>

      </div>

      {/* 4-Layer Firewall & Antivirus Telemetry Modal */}
      <SecurityShieldModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
    </header>
  );
}
