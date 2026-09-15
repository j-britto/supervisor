import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  FileCheck2,
  Users,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FolderLock
} from 'lucide-react';
import { api } from '../services/api.js';
import { useTheme } from '../context/ThemeContext.jsx';

export default function StudentUpload() {
  const { batchNumber, token } = useParams();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);

  // Selected files
  const [reportFile, setReportFile] = useState(null);
  const [pptFile, setPptFile] = useState(null);

  // Uploading state & feedback
  const [submitting, setSubmitting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    fetchUploadInfo();
  }, [batchNumber, token]);

  const fetchUploadInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudentUploadInfo(batchNumber, token);
      setTeamInfo(data);
    } catch (err) {
      setError(err.message || 'Unable to authenticate this upload session.');
    } finally {
      setLoading(false);
    }
  };

  const handleReportChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError('Invalid format: Project Report must be a PDF document (.pdf).');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size exceeds maximum 50MB limit.');
      return;
    }

    setUploadError(null);
    setReportFile(file);
  };

  const handlePptChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.ppt') && !ext.endsWith('.pptx')) {
      setUploadError('Invalid format: Presentation must be a PowerPoint file (.ppt or .pptx).');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size exceeds maximum 50MB limit.');
      return;
    }

    setUploadError(null);
    setPptFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reportFile && !pptFile) {
      setUploadError('Please choose at least one file (Report PDF or PPT Slides) to upload.');
      return;
    }

    setSubmitting(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      if (reportFile) formData.append('report', reportFile);
      if (pptFile) formData.append('ppt', pptFile);

      const res = await api.submitStudentFiles(batchNumber, token, formData);
      setUploadSuccess(res.message || 'Files successfully uploaded! Your submission is now Pending Verification by the Project Coordinator.');
      setReportFile(null);
      setPptFile(null);
      // Refresh team info to reflect uploaded status
      await fetchUploadInfo();
    } catch (err) {
      setUploadError(err.message || 'Failed to submit files. Please try again or contact your supervisor.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-[#F9F4EE] text-slate-800'}`}>
        <div className="w-12 h-12 border-4 border-[#1E3FA6] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide">Authenticating Student Upload Session...</p>
        <p className="text-xs text-slate-500 mt-1">Verifying cryptographic token for Batch {batchNumber}</p>
      </div>
    );
  }

  if (error || !teamInfo) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-[#F9F4EE] text-slate-800'}`}>
        <div className={`max-w-md w-full p-8 rounded-2xl border text-center shadow-xl ${isDark ? 'bg-slate-900 border-red-900/50' : 'bg-white border-red-200'}`}>
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Invalid or Expired Link</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            {error || 'This upload link is unauthorized or the session has expired. Please verify the URL or ask your Project Coordinator to re-issue your student upload link.'}
          </p>
          <div className="space-y-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-left mb-6">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Security Requirement:</p>
            <p>• Student upload links are cryptographically bound to specific batch numbers.</p>
            <p>• Tampering with batch numbers or parameters in the URL is strictly rejected.</p>
          </div>
          <button
            onClick={fetchUploadInfo}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-[#1E3FA6] hover:bg-[#1E3FA6]/10 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#F9F4EE] text-slate-900'}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Header Banner */}
        <header className={`p-6 sm:p-8 rounded-2xl border shadow-sm ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/80'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1E3FA6] dark:text-blue-400 uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4" /> Academic Supervision Portal
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Student Project File Submission
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Final Year Project Documentation & Presentation Ingestion
              </p>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" /> Antivirus Protected Session
            </div>
          </div>

          {/* Secure Session Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50 border-slate-200/70'}`}>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                <FolderLock className="w-4 h-4 text-[#1E3FA6]" /> Target Batch
              </div>
              <p className="text-xl font-black text-[#1E3FA6] dark:text-blue-400">
                Batch {teamInfo.batchNumber}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Secure Token Authenticated</p>
            </div>

            <div className={`p-4 rounded-xl border md:col-span-2 ${isDark ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50 border-slate-200/70'}`}>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Project Title
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                {teamInfo.projectTitle}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                Domain: {teamInfo.domain}
              </p>
            </div>
          </div>
        </header>

        {/* Team Context (Read-Only) */}
        <section className={`p-6 rounded-2xl border shadow-sm ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/80'}`}>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[#1E3FA6]" /> Team Registry & Supervisor
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Students List */}
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                Enrolled Students ({teamInfo.students.length})
              </p>
              <div className="space-y-2">
                {teamInfo.students.map((student) => (
                  <div
                    key={student.id || student.register_number}
                    className={`p-3 rounded-lg border text-xs ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50/70 border-slate-200/60'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{student.name}</p>
                        <p className="text-slate-500 dark:text-slate-400">Reg: {student.register_number} | Roll: {student.roll_number}</p>
                      </div>
                      <span className="text-[11px] text-slate-400">{student.department}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Supervisor Info */}
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                Assigned Supervisor
              </p>
              {teamInfo.supervisor ? (
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50/70 border-slate-200/60'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1E3FA6]/10 text-[#1E3FA6] dark:text-blue-400 flex items-center justify-center font-bold">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{teamInfo.supervisor.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{teamInfo.supervisor.email}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{teamInfo.supervisor.department}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed text-xs text-slate-400">
                  Supervisor allocation pending coordinator sign-off.
                </div>
              )}

              {/* Current Submission State */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                  Current Submission State
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`p-2.5 rounded-lg border ${teamInfo.reportUploaded ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                    <span className="font-semibold block">Report PDF</span>
                    <span>{teamInfo.reportUploaded ? '✓ Uploaded' : 'Not Uploaded'}</span>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${teamInfo.pptUploaded ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                    <span className="font-semibold block">Presentation</span>
                    <span>{teamInfo.pptUploaded ? '✓ Uploaded' : 'Not Uploaded'}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Verification Status: <strong className="text-slate-800 dark:text-slate-200">{teamInfo.verificationStatus}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className={`p-6 sm:p-8 rounded-2xl border shadow-sm ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/80'}`}>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Upload Project Deliverables
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Submit your finalized project documentation and slide deck. Stored securely in Oracle MySQL with BLOB protection.
          </p>

          {/* Feedback messages */}
          {uploadSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-sm flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Submission Confirmed!</p>
                <p className="text-xs mt-1 leading-relaxed">{uploadSuccess}</p>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-200 text-sm flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Upload Notice</p>
                <p className="text-xs mt-1 leading-relaxed">{uploadError}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: Project Report (.pdf) */}
            <div className={`p-5 rounded-xl border-2 border-dashed transition-all ${
              reportFile 
                ? 'border-[#1E3FA6] bg-[#1E3FA6]/5' 
                : isDark ? 'border-slate-700 bg-slate-800/30 hover:border-slate-600' : 'border-slate-300 bg-slate-50/50 hover:border-slate-400'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-[#1E3FA6]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  1. Project Report PDF
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Full documentation according to university guidelines. (.pdf only, max 50MB)
              </p>

              {teamInfo.reportFileName && !reportFile && (
                <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                  <span className="truncate max-w-[200px]">Current: {teamInfo.reportFileName}</span>
                  <span className="font-semibold text-[10px] uppercase">On File</span>
                </div>
              )}

              {reportFile ? (
                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                  <div className="truncate pr-2">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{reportFile.name}</p>
                    <p className="text-slate-400 text-[11px]">{(reportFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportFile(null)}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block text-center py-6 px-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                  <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-[#1E3FA6] dark:text-blue-400">Choose PDF Document</span>
                  <p className="text-[11px] text-slate-400 mt-1">or drag and drop here</p>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleReportChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Box 2: Presentation Slides (.ppt, .pptx) */}
            <div className={`p-5 rounded-xl border-2 border-dashed transition-all ${
              pptFile 
                ? 'border-[#1E3FA6] bg-[#1E3FA6]/5' 
                : isDark ? 'border-slate-700 bg-slate-800/30 hover:border-slate-600' : 'border-slate-300 bg-slate-50/50 hover:border-slate-400'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <FileCheck2 className="w-5 h-5 text-[#1E3FA6]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  2. Presentation Deck
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Slide presentation for viva / review evaluation. (.ppt, .pptx only, max 50MB)
              </p>

              {teamInfo.pptFileName && !pptFile && (
                <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                  <span className="truncate max-w-[200px]">Current: {teamInfo.pptFileName}</span>
                  <span className="font-semibold text-[10px] uppercase">On File</span>
                </div>
              )}

              {pptFile ? (
                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                  <div className="truncate pr-2">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{pptFile.name}</p>
                    <p className="text-slate-400 text-[11px]">{(pptFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPptFile(null)}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block text-center py-6 px-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                  <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-[#1E3FA6] dark:text-blue-400">Choose PowerPoint File</span>
                  <p className="text-[11px] text-slate-400 mt-1">.ppt or .pptx formats</p>
                  <input
                    type="file"
                    accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    onChange={handlePptChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Guidelines and Disclaimer */}
          <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Important Submission Rules:
            </p>
            <p>1. Files submitted are ingested into MySQL and run through real-time heuristic antivirus scanning.</p>
            <p>2. Once submitted, your files will be tagged as <strong>Pending Verification</strong>. Only after Project Coordinator approval will verified access links be activated.</p>
            <p>3. Do not forward or publicize this upload URL. It is tied to your team's unique authentication record.</p>
          </div>

          {/* Submit Action */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-400">
              {reportFile || pptFile ? 'Deliverables staged for submission' : 'Select at least one file above'}
            </span>

            <button
              type="submit"
              disabled={submitting || (!reportFile && !pptFile)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1E3FA6] hover:bg-[#1E3FA6]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-md transition-all active:scale-95"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Deliverables...</span>
                </>
              ) : (
                <>
                  <span>Submit Files for Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
