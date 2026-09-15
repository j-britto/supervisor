import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import {
  UploadCloud,
  FileCheck2,
  FileText,
  Presentation,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Mail,
  Send,
  ShieldCheck,
  AlertCircle,
  Clock,
  UserCheck,
  BookOpen,
  Eye,
  Download,
  Check,
  AlertTriangle,
  RotateCcw,
  Building2,
  Copy,
  Link2,
  Share2,
  Layers,
  Trash2
} from 'lucide-react';

const PUBLICATION_OPTIONS = [
  'Not Submitted',
  'Submitted',
  'Under Review',
  'Accepted',
  'Published'
];

export default function FileUploads() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL'); // ALL, VERIFIED, PENDING, NOT_UPLOADED

  // Clear All Data State
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Upload Modal State (Direct manual upload by coordinator)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTargetBatch, setUploadTargetBatch] = useState(null);
  const [selectedFileType, setSelectedFileType] = useState('REPORT'); // 'REPORT' or 'PPT'
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [conflictPrompt, setConflictPrompt] = useState(null);

  // Email Notification State
  const [notifyingBatch, setNotifyingBatch] = useState(null);
  const [sendingLinkBatch, setSendingLinkBatch] = useState(null);
  const [verifyingBatch, setVerifyingBatch] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Document Viewer Modal State
  const [viewDoc, setViewDoc] = useState(null);

  useEffect(() => {
    fetchUploads();
  }, []);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const data = await api.getFileUploads();
      if (Array.isArray(data)) {
        setUploads(data);
      }
    } catch (error) {
      console.error('Failed to fetch file uploads:', error);
      showToast('Error loading file upload registry', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Master Administrative Clear All Student Data
  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      const res = await api.clearAllStudentData();
      if (res && res.success) {
        showToast('All student data cleared successfully.', 'success');
        await fetchUploads();
      } else {
        showToast(res?.error || 'Failed to clear student data', 'error');
      }
    } catch (err) {
      console.error('Clear all data error:', err);
      showToast(err.message || 'Failed to clear student data', 'error');
    } finally {
      setIsClearing(false);
      setIsClearAllDialogOpen(false);
    }
  };

  // Copy Student Upload Link
  const handleCopyUploadLink = (url) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('Student upload link copied to clipboard!');
    } else {
      showToast('Link: ' + url, 'info');
    }
  };

  // Send Student Upload Link to Students (Event 1)
  const handleSendUploadLink = async (item, forceResend = false) => {
    setSendingLinkBatch(item.batchNumber);
    try {
      const res = await api.sendStudentUploadLink(item.batchNumber, forceResend);
      showToast(res.message || `Student upload link emailed to Batch ${item.batchNumber} students.`);
      await fetchUploads();
    } catch (err) {
      console.error('Failed to send upload link:', err);
      showToast(err.message || 'Failed to dispatch upload link email', 'error');
    } finally {
      setSendingLinkBatch(null);
    }
  };

  // Open Upload Modal
  const handleOpenUploadModal = (item, preferredType = 'REPORT') => {
    setUploadTargetBatch(item);
    setSelectedFileType(preferredType);
    setSelectedFile(null);
    setUploadError(null);
    setConflictPrompt(null);
    setIsUploadModalOpen(true);
  };

  // Handle File Input Change
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (selectedFileType === 'REPORT' && ext !== '.pdf') {
      setUploadError('Invalid file type: Project Report must be a PDF document (.pdf).');
      setSelectedFile(null);
      return;
    }
    if (selectedFileType === 'PPT' && ext !== '.ppt' && ext !== '.pptx') {
      setUploadError('Invalid file type: Presentation must be PowerPoint format (.ppt, .pptx).');
      setSelectedFile(null);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size exceeds the 50MB limit.');
      setSelectedFile(null);
      return;
    }

    setUploadError(null);
    setConflictPrompt(null);
    setSelectedFile(file);
  };

  // Submit Direct Coordinator File Upload to MySQL BLOB
  const handleUploadSubmit = async (confirmedReplace = false) => {
    if (!selectedFile || !uploadTargetBatch) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('batchNumber', uploadTargetBatch.batchNumber);
      formData.append('fileType', selectedFileType);
      if (confirmedReplace) {
        formData.append('replace', 'true');
      }

      const res = await api.uploadFile(formData);

      if (res.conflict) {
        setConflictPrompt({
          message: res.message || 'File already uploaded. Replace existing file?',
          existingFile: res.existingFile
        });
        setUploading(false);
        return;
      }

      if (res.success) {
        showToast(res.message || 'File successfully uploaded and stored in MySQL!');
        setIsUploadModalOpen(false);
        await fetchUploads();
      } else {
        setUploadError(res.error || 'Failed to upload file.');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Network error during file upload.');
    } finally {
      setUploading(false);
    }
  };

  // Handle Verify Action by Project Coordinator
  const handleVerify = async (item) => {
    setVerifyingBatch(item.batchNumber);
    try {
      const res = await api.verifyFileUpload({
        batchNumber: item.batchNumber,
        fileType: 'ALL',
        publicationStatus: item.publicationStatus || 'Submitted',
        verifiedBy: 'Project Coordinator'
      });

      if (res.success) {
        showToast(`Batch ${item.batchNumber} files verified successfully.`);
        await fetchUploads();
      } else {
        showToast(res.error || 'Verification failed', 'error');
      }
    } catch (err) {
      console.error('Verification error:', err);
      showToast(err.message || 'Failed to verify files', 'error');
    } finally {
      setVerifyingBatch(null);
    }
  };

  // Handle Notification Dispatch to Supervisor & Students (Event 2 - Verified File Link)
  const handleNotify = async (item, forceResend = false) => {
    setNotifyingBatch(item.batchNumber);
    try {
      const res = await api.notifyFileVerification({
        batchNumber: item.batchNumber,
        forceResend
      });

      if (res.success) {
        showToast(`Verified file notification dispatched to Supervisor (${item.supervisor?.name || 'Supervisor'}) and batch students.`);
        await fetchUploads();
      } else {
        showToast(res.message || 'Notification failed', 'error');
      }
    } catch (err) {
      console.error('Notification error:', err);
      showToast(err.message || 'Failed to send notification email', 'error');
    } finally {
      setNotifyingBatch(null);
    }
  };

  // Handle Inline Publication Status Change
  const handlePublicationChange = async (batchNumber, newStatus) => {
    try {
      setUploads(prev => prev.map(u => 
        Number(u.batchNumber) === Number(batchNumber) ? { ...u, publicationStatus: newStatus } : u
      ));
      await api.updatePublicationStatus(batchNumber, newStatus);
      showToast(`Batch ${batchNumber} publication status updated to "${newStatus}".`);
    } catch (err) {
      console.error('Failed to update publication status:', err);
      fetchUploads();
    }
  };

  // Unique Batches for Filter
  const uniqueBatches = Array.from(new Set(uploads.map(u => String(u.batchNumber))))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Filtered Uploads
  const filteredUploads = uploads.filter(item => {
    if (batchFilter !== 'ALL' && String(item.batchNumber) !== batchFilter) {
      return false;
    }

    if (verificationFilter === 'VERIFIED' && item.verificationStatus !== 'Verified') return false;
    if (verificationFilter === 'PENDING' && item.verificationStatus !== 'Pending Verification') return false;
    if (verificationFilter === 'NOT_UPLOADED' && item.verificationStatus !== 'Not Uploaded') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const bNum = String(item.batchNumber);
      const projTitle = (item.projectTitle || '').toLowerCase();
      const studentNames = (item.students || []).map(s => s.name.toLowerCase()).join(' ');
      const regNums = (item.students || []).map(s => (s.register_number || '').toLowerCase()).join(' ');
      const supName = (item.supervisor?.name || '').toLowerCase();

      return bNum.includes(q) || projTitle.includes(q) || studentNames.includes(q) || regNums.includes(q) || supName.includes(q);
    }

    return true;
  });

  const totalBatches = uploads.length;
  const verifiedCount = uploads.filter(u => u.verificationStatus === 'Verified').length;
  const pendingCount = uploads.filter(u => u.verificationStatus === 'Pending Verification').length;
  const notUploadedCount = uploads.filter(u => u.verificationStatus === 'Not Uploaded').length;

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div 
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-200'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-200'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          <span className="text-xs font-bold leading-relaxed">{toastMessage.message}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            File Uploads
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            id="btn-sync-mysql"
            type="button"
            onClick={fetchUploads}
            disabled={loading || isClearing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 transition-colors shadow-xs cursor-pointer flex items-center gap-2 text-xs font-bold"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#1e3fa6]' : ''}`} />
            <span>Sync MySQL</span>
          </button>

          <button
            id="btn-clear-all-data"
            type="button"
            onClick={() => setIsClearAllDialogOpen(true)}
            disabled={isClearing || loading}
            className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 transition-colors shadow-xs cursor-pointer flex items-center gap-2 text-xs font-bold disabled:opacity-50"
            title="Administrative Clear: Remove previous batch and student data for new academic cycle"
          >
            <Trash2 className={`w-4 h-4 ${isClearing ? 'animate-spin' : 'text-rose-600 dark:text-rose-400'}`} />
            <span>{isClearing ? 'Clearing...' : 'Clear All Data'}</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Total Teams</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalBatches}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Verified</p>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{verifiedCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 shadow-xs">
          <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">Pending Verification</p>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">{pendingCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/50 shadow-xs">
          <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase">Not Uploaded</p>
          <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">{notUploadedCount}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Batch, Student, Project..."
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3fa6] text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={verificationFilter || 'ALL'}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3fa6] text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="ALL">All Verification States</option>
              <option value="VERIFIED">Verified ✓</option>
              <option value="PENDING">Pending Verification</option>
              <option value="NOT_UPLOADED">Not Uploaded</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <select
              value={batchFilter || 'ALL'}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3fa6] text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="ALL">All Batches</option>
              {uniqueBatches.map(b => (
                <option key={b} value={b}>Batch {b}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main File Uploaded Table (7 Columns) */}
      <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-lg flex flex-col">
        <div className="overflow-x-auto">
          <table id="file-uploaded-table" className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-extrabold text-[11px] sticky top-0 backdrop-blur z-10">
              <tr>
                <th className="px-4 py-3.5 w-24">1. Batch No</th>
                <th className="px-4 py-3.5 w-64">2. Student Name</th>
                <th className="px-4 py-3.5 text-center w-36">3. Report PDF</th>
                <th className="px-4 py-3.5 text-center w-36">4. PPT</th>
                <th className="px-4 py-3.5 w-80">5. Student Upload & Verified Links</th>
                <th className="px-4 py-3.5 text-center w-36">6. Verification</th>
                <th className="px-4 py-3.5 text-right w-60">7. Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 bg-white dark:bg-slate-900">
              {filteredUploads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-slate-400 font-medium text-sm">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#1e3fa6]" />
                        <span>Loading file registry...</span>
                      </div>
                    ) : (
                      <span>No file upload records match your search criteria.</span>
                    )}
                  </td>
                </tr>
              ) : (
                filteredUploads.map(item => {
                  const studentNamesString = item.students?.map(s => s.name).join(', ') || 'No students assigned';

                  return (
                    <tr 
                      key={item.batchNumber} 
                      id={`row-batch-${item.batchNumber}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 1. Batch No */}
                      <td className="px-4 py-4 align-top">
                        <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-[#1e3fa6] dark:text-cyan-300 font-mono font-black text-sm shadow-xs">
                          {item.batchNumber}
                        </div>
                      </td>

                      {/* 2. Student Name */}
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1.5">
                          <p className="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                            {studentNamesString}
                          </p>

                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {item.students?.map(s => (
                              <span key={s.id || s.register_number} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                {s.register_number || s.roll_number}
                              </span>
                            ))}
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1" title={item.projectTitle}>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Project:</span> {item.projectTitle}
                          </p>

                          {item.supervisor && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <span className="font-bold text-slate-700 dark:text-slate-300">Supervisor:</span>
                              <span>{item.supervisor.name}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 3. Report PDF */}
                      <td className="px-4 py-4 align-middle text-center">
                        {item.reportUploaded ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 shadow-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Uploaded</span>
                            </span>
                            {item.reportFile?.fileName && (
                              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]" title={item.reportFile.fileName}>
                                {item.reportFile.fileName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900 shadow-xs">
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>Not Uploaded</span>
                          </span>
                        )}
                      </td>

                      {/* 4. PPT */}
                      <td className="px-4 py-4 align-middle text-center">
                        {item.pptUploaded ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 shadow-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Uploaded</span>
                            </span>
                            {item.pptFile?.fileName && (
                              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]" title={item.pptFile.fileName}>
                                {item.pptFile.fileName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900 shadow-xs">
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>Not Uploaded</span>
                          </span>
                        )}
                      </td>

                      {/* 5. Uploaded Link & Student Link (Distinguished per Extension Requirements) */}
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-2 text-xs">
                          {/* Part A: Student Upload Link */}
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                                <Link2 className="w-3 h-3 text-[#1e3fa6]" /> Student Upload Link:
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleCopyUploadLink(item.studentUploadUrl)}
                                  className="p-1 text-slate-500 hover:text-[#1e3fa6] dark:hover:text-cyan-400 transition-colors cursor-pointer"
                                  title="Copy secure student upload link"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <a
                                  href={item.studentUploadPath}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 text-slate-500 hover:text-[#1e3fa6] dark:hover:text-cyan-400 transition-colors cursor-pointer"
                                  title="Open student upload page in new tab"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                            <div className="font-mono text-[11px] text-[#1e3fa6] dark:text-cyan-300 font-bold truncate" title={item.studentUploadUrl}>
                              /upload/{item.batchNumber}/{item.studentUploadToken ? item.studentUploadToken.substring(0, 12) + '...' : ''}
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-1 text-[10px]">
                              <span className={item.uploadLinkSent ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}>
                                {item.uploadLinkSent ? '✓ Emailed to Team' : 'Link Not Emailed Yet'}
                              </span>
                            </div>
                          </div>

                          {/* Part B: Verified File Link (ONLY when verified!) */}
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                              Verified File Link:
                            </span>
                            {item.uploadVerified && item.reportUploaded ? (
                              <button
                                id={`link-view-report-${item.batchNumber}`}
                                onClick={() => setViewDoc({
                                  title: `Batch ${item.batchNumber} Project Report PDF`,
                                  url: `/api/files/report/${item.batchNumber}`,
                                  type: 'pdf',
                                  projectTitle: item.projectTitle
                                })}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg hover:border-emerald-500 transition-all cursor-pointer group"
                                title="Click to view verified project report PDF"
                              >
                                <span>{item.uploadedLink || `projectreport.${item.batchNumber}`}</span>
                                <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            ) : item.reportUploaded || item.pptUploaded ? (
                              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 italic flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Pending Verification</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-slate-400 italic">
                                Deliverables not submitted
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 7. Verification */}
                      <td className="px-4 py-4 align-middle text-center">
                        {item.verificationStatus === 'Verified' ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700 shadow-xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Verified ✓</span>
                            </span>
                            {item.verifiedAt && (
                              <span className="text-[10px] text-slate-400">
                                {new Date(item.verifiedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : item.verificationStatus === 'Pending Verification' ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800 shadow-xs">
                              <Clock className="w-3.5 h-3.5 text-blue-500" />
                              <span>Pending Verification</span>
                            </span>
                            <span className="text-[10px] text-slate-400">Awaiting review</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 shadow-xs">
                            <span>Not Uploaded</span>
                          </span>
                        )}
                      </td>

                      {/* 7. Actions */}
                      <td className="px-4 py-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          
                          {/* Send / Resend Student Upload Link Button */}
                          <button
                            id={`btn-send-link-${item.batchNumber}`}
                            onClick={() => handleSendUploadLink(item, item.uploadLinkSent)}
                            disabled={sendingLinkBatch === item.batchNumber}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1 border ${
                              item.uploadLinkSent
                                ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#1e3fa6]'
                                : 'bg-[#1e3fa6] text-white hover:bg-blue-800 border-transparent'
                            }`}
                            title="Email student upload portal link to batch team members"
                          >
                            <Mail className={`w-3.5 h-3.5 ${sendingLinkBatch === item.batchNumber ? 'animate-spin' : ''}`} />
                            <span>
                              {sendingLinkBatch === item.batchNumber
                                ? 'Sending...'
                                : item.uploadLinkSent
                                ? 'Resend Upload Link'
                                : 'Send Upload Link'}
                            </span>
                          </button>

                          {/* Verify Action Button (when files uploaded and pending verification) */}
                          {item.verificationStatus === 'Pending Verification' && (
                            <button
                              id={`btn-verify-${item.batchNumber}`}
                              onClick={() => handleVerify(item)}
                              disabled={verifyingBatch === item.batchNumber}
                              className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              title="Verify Submitted Deliverables"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{verifyingBatch === item.batchNumber ? 'Verifying...' : 'Verify Files'}</span>
                            </button>
                          )}

                          {/* Notify Supervisor & Students Button (Event 2 - Only when verified!) */}
                          {item.verificationStatus === 'Verified' && (
                            item.notificationSent ? (
                              <button
                                id={`btn-resend-notify-${item.batchNumber}`}
                                onClick={() => handleNotify(item, true)}
                                disabled={notifyingBatch === item.batchNumber}
                                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:border-slate-400 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                title="Resend verified file link to Supervisor and Students"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Verified Notification Sent ✓</span>
                              </button>
                            ) : (
                              <button
                                id={`btn-notify-${item.batchNumber}`}
                                onClick={() => handleNotify(item, false)}
                                disabled={notifyingBatch === item.batchNumber}
                                className="px-3 py-1 text-xs font-bold text-white bg-[#1e3fa6] hover:bg-blue-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                title="Send verified file link notification to Supervisor and Students"
                              >
                                <Send className={`w-3.5 h-3.5 ${notifyingBatch === item.batchNumber ? 'animate-bounce' : ''}`} />
                                <span>{notifyingBatch === item.batchNumber ? 'Dispatching...' : 'Notify Supervisor & Students'}</span>
                              </button>
                            )
                          )}

                          {/* View Report button (if uploaded) */}
                          {item.reportUploaded && (
                            <button
                              id={`btn-view-report-${item.batchNumber}`}
                              onClick={() => setViewDoc({
                                title: `Batch ${item.batchNumber} Project Report PDF`,
                                url: `/api/files/report/${item.batchNumber}`,
                                type: 'pdf',
                                projectTitle: item.projectTitle
                              })}
                              className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#1e3fa6] hover:text-[#1e3fa6] rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1"
                              title="View Project Report PDF"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Report</span>
                            </button>
                          )}

                          {/* View / Download PPT button (if uploaded) */}
                          {item.pptUploaded && (
                            <a
                              id={`btn-view-ppt-${item.batchNumber}`}
                              href={`/api/files/ppt/${item.batchNumber}`}
                              download
                              className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-600 hover:text-amber-600 rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1"
                              title="Download Presentation Slides"
                            >
                              <Presentation className="w-3.5 h-3.5" />
                              <span>View PPT</span>
                            </a>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coordinator Direct Upload File Modal */}
      {isUploadModalOpen && uploadTargetBatch && (
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => !uploading && setIsUploadModalOpen(false)}
          title={`Coordinator Manual File Upload — Batch ${uploadTargetBatch.batchNumber}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            {/* Team Summary */}
            <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700">
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                {uploadTargetBatch.projectTitle}
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">
                Batch: <strong className="text-[#1e3fa6] dark:text-cyan-400">Batch {uploadTargetBatch.batchNumber}</strong> • Students: {uploadTargetBatch.students?.map(s => s.name).join(', ') || 'Team Students'}
              </p>
            </div>

            {/* Error banner */}
            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-900 flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Duplicate Replacement Confirmation Prompt */}
            {conflictPrompt ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">
                      {selectedFileType === 'REPORT' ? 'Report' : 'Presentation'} already uploaded!
                    </h4>
                    <p className="text-xs mt-1 leading-relaxed">
                      Batch {uploadTargetBatch.batchNumber} already has an active {selectedFileType.toLowerCase()} ({conflictPrompt.existingFile?.fileName}).
                      <br />
                      <strong>Replace existing {selectedFileType.toLowerCase()}?</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                  <button
                    onClick={() => setConflictPrompt(null)}
                    className="px-3 py-1.5 font-bold rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUploadSubmit(true)}
                    disabled={uploading}
                    className="px-4 py-1.5 font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{uploading ? 'Replacing...' : 'Yes, Replace File'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* File Selection Form */
              <div className="space-y-3.5">
                {/* File Type Toggle */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Deliverable Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFileType('REPORT');
                        setSelectedFile(null);
                        setUploadError(null);
                      }}
                      className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        selectedFileType === 'REPORT'
                          ? 'bg-blue-50/80 border-[#1e3fa6] text-[#1e3fa6] dark:bg-indigo-950/60 dark:border-indigo-400 dark:text-indigo-300 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Project Report (.pdf)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFileType('PPT');
                        setSelectedFile(null);
                        setUploadError(null);
                      }}
                      className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        selectedFileType === 'PPT'
                          ? 'bg-amber-50/80 border-amber-600 text-amber-700 dark:bg-amber-950/60 dark:border-amber-400 dark:text-amber-300 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Presentation className="w-4 h-4" />
                      <span>Presentation (.ppt/.pptx)</span>
                    </button>
                  </div>
                </div>

                {/* File Dropzone / Input */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Choose File to Upload
                  </label>
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#1e3fa6] dark:hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-50 dark:bg-slate-950 transition-colors">
                    <input
                      id="modal-file-input"
                      type="file"
                      accept={selectedFileType === 'REPORT' ? '.pdf,application/pdf' : '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="modal-file-input"
                      className="cursor-pointer flex flex-col items-center justify-center gap-2"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950 text-[#1e3fa6] dark:text-cyan-400 flex items-center justify-center">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">
                        {selectedFile ? selectedFile.name : `Click to choose ${selectedFileType === 'REPORT' ? 'PDF Report' : 'PowerPoint Slides'}`}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Max allowed size: 50MB. Stored directly as BLOB in MySQL.'}
                      </p>
                    </label>
                  </div>
                </div>

                {/* Modal Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    disabled={uploading}
                    className="px-4 py-2 font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUploadSubmit(false)}
                    disabled={!selectedFile || uploading}
                    className="px-5 py-2 font-bold rounded-xl bg-[#1e3fa6] hover:bg-blue-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <FileUp className="w-4 h-4" />
                    <span>{uploading ? 'Storing in MySQL...' : 'Upload & Store BLOB'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* In-App PDF Document Viewer Modal */}
      {viewDoc && (
        <Modal
          isOpen={Boolean(viewDoc)}
          onClose={() => setViewDoc(null)}
          title={viewDoc.title}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                {viewDoc.projectTitle}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={viewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded-lg bg-[#1e3fa6] text-white font-bold text-xs flex items-center gap-1 shadow-xs hover:bg-blue-800 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in New Tab</span>
                </a>
                <a
                  href={viewDoc.url}
                  download
                  className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1 hover:bg-slate-300 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            </div>

            {/* Embedded PDF iframe */}
            <div className="w-full h-[65vh] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <iframe
                src={viewDoc.url}
                title={viewDoc.title}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Clear All Student Data Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isClearAllDialogOpen}
        onClose={() => !isClearing && setIsClearAllDialogOpen(false)}
        onConfirm={handleClearAllData}
        title="Clear All Student Data?"
        message="This will permanently remove the current students, teams/projects, uploaded reports, PPT files, and related submission data. This action cannot be undone."
        confirmText={isClearing ? 'Clearing...' : 'Clear All Data'}
        cancelText="Cancel"
        variant="danger"
      />

    </div>
  );
}
