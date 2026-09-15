import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import { Bot } from 'lucide-react';

import DraggableRAGButton from './components/DraggableRAGButton.jsx';
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import RAGModal from './components/RAGModal.jsx';

import Signup from './pages/Signup.jsx';
import OTPVerification from './pages/OTPVerification.jsx';
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProfileSettings from './pages/ProfileSettings.jsx';
import MessageSettings from './pages/MessageSettings.jsx';
import Projects from './pages/Projects.jsx';
import Students from './pages/Students.jsx';
import Reviews from './pages/Reviews.jsx';
import ReviewReport from './pages/ReviewReport.jsx';
import FinalReport from './pages/FinalReport.jsx';
import FileUploads from './pages/FileUploads.jsx';
import StudentUpload from './pages/StudentUpload.jsx';

function ProtectedLayout({ children, onOpenRAG }) {
  const { user, loading } = useAuth();
  const {theme}=useTheme();

  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (loading) {
    return (
      <div className={`${(theme === 'dark') ? 'bg-slate-950 text-slate-400' : 'bg-[#F9F4EE] text-black'} min-h-screen flex items-center justify-center font-bold text-xs`}>
        Loading StudyPulse AI Session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className={`${(theme === 'dark') ? 'bg-slate-950 text-slate-100' : 'bg-[#F9F4EE] text-black'} h-screen overflow-hidden flex font-sans antialiased selection:bg-[#1E3FA6] selection:text-white relative`}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} 
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Navbar 
          onOpenRAG={onOpenRAG} 
          isSidebarOpen={isSidebarOpen} 
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} 
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto relative">
          {children}
        </main>
      </div>

      {/* Draggable Movable RAG AI Assistant Button */}
      <DraggableRAGButton onOpenRAG={onOpenRAG} />
    </div>
  );
}

export default function App() {
  const [isRAGOpen, setIsRAGOpen] = useState(false);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-otp" element={<OTPVerification />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedLayout onOpenRAG={() => setIsRAGOpen(true)}>
                  <Dashboard onOpenRAG={() => setIsRAGOpen(true)} />
                </ProtectedLayout>
              }
            />

            <Route
              path="/profile-settings"
              element={
                <ProtectedLayout onOpenRAG={() => setIsRAGOpen(true)}>
                  <ProfileSettings />
                </ProtectedLayout>
              }
            />

            <Route
              path="/message-settings"
              element={
                <ProtectedLayout onOpenRAG={() => setIsRAGOpen(true)}>
                  <MessageSettings />
                </ProtectedLayout>
              }
            />

            <Route
              path="/projects"
              element={
                <ProtectedLayout onOpenRAG={() => setIsRAGOpen(true)}>
                  <Projects />
                </ProtectedLayout>
              }
            />

            <Route
              path="/students"
              element={
                <ProtectedLayout onOpenRAG={() => setIsRAGOpen(true)}>
                  <Students />
                </ProtectedLayout>
              }
            />

            <Route
              path="/reviews"
              element={
                <ProtectedLayout onOpenRAG={() => setIsRAGOpen(true)}>
                  <Reviews />
                </ProtectedLayout>
              }
            />

            <Route
              path="/review-report"
              element={
                <ProtectedLayout onOpenRAG={() => setIsRAGOpen(true)}>
                  <ReviewReport />
                </ProtectedLayout>
              }
            />

            <Route
              path="/final-report"
              element={
                <ProtectedLayout onOpenRAG={() => setIsRAGOpen(true)}>
                  <FinalReport />
                </ProtectedLayout>
              }
            />

            <Route
              path="/final-report/:registerNumber"
              element={
                <ProtectedLayout onOpenRAG={() => setIsRAGOpen(true)}>
                  <FinalReport />
                </ProtectedLayout>
              }
            />

            <Route
              path="/final-report/batch/:batchId"
              element={
                <ProtectedLayout onOpenRAG={() => setIsRAGOpen(true)}>
                  <FinalReport />
                </ProtectedLayout>
              }
            />

            <Route
              path="/file-uploaded"
              element={
                <ProtectedLayout onOpenRAG={() => setIsRAGOpen(true)}>
                  <FileUploads />
                </ProtectedLayout>
              }
            />

            {/* Public Student-Specific File Upload Portal (authenticated via secure token) */}
            <Route path="/upload/:batchNumber/:token" element={<StudentUpload />} />

            {/* Default Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>

          {/* Global AI RAG Chat Assistant Drawer/Modal */}
          <RAGModal
            isOpen={isRAGOpen}
            onClose={() => setIsRAGOpen(false)}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
