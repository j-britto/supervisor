import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import Modal from '../components/Modal.jsx';
import { exportReviewsToPDF } from '../utils/pdfExport.js';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Award,
  Search,
  Check,
  Edit3,
  Sparkles,
  Save,
  Bell,
  Send,
  FileDown
} from 'lucide-react';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [students, setStudents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedReviewNum, setSelectedReviewNum] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');

  // Inline edit state per batch: { [batchNumber]: { project_status, review_status, date, team_mark, is_over, remarks } }
  const [batchEdits, setBatchEdits] = useState({});

  // Modal for detailed edits & comments
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formReviewData, setFormReviewData] = useState({
    review_number: 1,
    review_status: 'Completed',
    project_status: 'In Progress',
    date: new Date().toISOString().split('T')[0],
    team_mark: 8,
    remarks: '',
    sendNotification: true
  });

  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rRes, sRes, pRes] = await Promise.all([
        api.getReviews(),
        api.getStudents(),
        api.getProjects()
      ]);
      if (Array.isArray(rRes)) setReviews(rRes);
      if (Array.isArray(sRes)) setStudents(sRes);
      if (Array.isArray(pRes)) setProjects(pRes);
    } catch (err) {
      console.error('Failed to load reviews data:', err);
    }
  };

  // Inline batch field update handler
  const handleBatchFieldChange = (batchNumber, field, value) => {
    setBatchEdits(prev => ({
      ...prev,
      [batchNumber]: {
        ...(prev[batchNumber] || {}),
        [field]: value
      }
    }));
  };

  // Helper to extract current working data for a batch
  const getBatchData = (batch) => {
    const { batchNumber, student1, student2, project } = batch;
    const edits = batchEdits[batchNumber] || {};

    const s1Rev = student1 ? reviews.find(r => r.student_register_number === student1.register_number && r.review_number === selectedReviewNum) : null;
    const s2Rev = student2 ? reviews.find(r => r.student_register_number === student2.register_number && r.review_number === selectedReviewNum) : null;

    const projectStatus = edits.project_status !== undefined
      ? edits.project_status
      : (project && project.project_status ? project.project_status : 'In Progress');

    const reviewStatus = edits.review_status !== undefined
      ? edits.review_status
      : (s1Rev ? s1Rev.review_status : (s2Rev ? s2Rev.review_status : 'Pending'));

    const evalDate = edits.date !== undefined
      ? edits.date
      : (s1Rev && s1Rev.date ? s1Rev.date : (s2Rev && s2Rev.date ? s2Rev.date : new Date().toISOString().split('T')[0]));

    // Team mark (single mark for the team)
    const teamMark = edits.team_mark !== undefined
      ? edits.team_mark
      : (s1Rev && s1Rev.mark !== undefined ? s1Rev.mark : (s2Rev && s2Rev.mark !== undefined ? s2Rev.mark : 8));

    // Complete / Over flag - Strictly independent, defaults to false, never derived from reviewStatus
    const isOver = edits.is_over !== undefined
      ? Boolean(edits.is_over)
      : false;

    return {
      projectStatus,
      reviewStatus,
      evalDate,
      teamMark,
      isOver,
      s1Rev,
      s2Rev
    };
  };

  // Complete / Over Checkbox Action:
  // Saves review and triggers message event ONLY when manually checked (false -> true)
  // When unchecked (true -> false), message event is NOT activated
  const handleToggleCompleteOver = async (batch, shouldComplete) => {
    const { batchNumber, student1, student2, project } = batch;
    handleBatchFieldChange(batchNumber, 'is_over', shouldComplete);

    const { projectStatus, reviewStatus, evalDate, teamMark } = getBatchData(batch);
    const edits = batchEdits[batchNumber] || {};
    const remarks = edits.remarks || (shouldComplete ? `Review ${selectedReviewNum} completed successfully.` : 'Review marked pending.');

    // Optimistic local update
    setReviews(prev => {
      let next = [...prev];
      if (student1) {
        const idx1 = next.findIndex(r => r.student_register_number === student1.register_number && r.review_number === selectedReviewNum);
        const item1 = {
          student_register_number: student1.register_number,
          review_number: selectedReviewNum,
          review_status: reviewStatus,
          project_status: projectStatus,
          date: evalDate,
          mark: Number(teamMark) || 0,
          completed: shouldComplete,
          comments: remarks
        };
        if (idx1 >= 0) next[idx1] = { ...next[idx1], ...item1 };
        else next.push(item1);
      }
      if (student2) {
        const idx2 = next.findIndex(r => r.student_register_number === student2.register_number && r.review_number === selectedReviewNum);
        const item2 = {
          student_register_number: student2.register_number,
          review_number: selectedReviewNum,
          review_status: reviewStatus,
          project_status: projectStatus,
          date: evalDate,
          mark: Number(teamMark) || 0,
          completed: shouldComplete,
          comments: remarks
        };
        if (idx2 >= 0) next[idx2] = { ...next[idx2], ...item2 };
        else next.push(item2);
      }
      return next;
    });

    try {
      // CHECK -> TRIGGER MESSAGE EVENT; UNCHECK -> DO NOT TRIGGER MESSAGE EVENT
      const shouldTrigger = shouldComplete === true;

      const promises = [];
      if (student1) {
        promises.push(api.saveReview({
          student_register_number: student1.register_number,
          review_number: selectedReviewNum,
          review_status: reviewStatus,
          project_status: projectStatus,
          date: evalDate,
          marks: Number(teamMark) || 0,
          completed: shouldComplete,
          comments: remarks,
          sendNotification: shouldTrigger,
          triggerMessage: shouldTrigger
        }));
      }
      if (student2) {
        promises.push(api.saveReview({
          student_register_number: student2.register_number,
          review_number: selectedReviewNum,
          review_status: reviewStatus,
          project_status: projectStatus,
          date: evalDate,
          marks: Number(teamMark) || 0,
          completed: shouldComplete,
          comments: remarks,
          sendNotification: shouldTrigger,
          triggerMessage: shouldTrigger
        }));
      }
      if (project && project.id && project.project_status !== projectStatus) {
        promises.push(api.updateProject(project.id, {
          ...project,
          project_status: projectStatus
        }));
      }

      await Promise.all(promises);

      const studentNames = [student1?.name, student2?.name].filter(Boolean).join(' & ');
      setStatusMsg({
        type: 'success',
        text: shouldTrigger
          ? `Review ${selectedReviewNum} completed! Auto notifications sent to ${studentNames || 'students'} and Mentor.`
          : `Review ${selectedReviewNum} unchecked for Batch ${batchNumber}.`
      });
    } catch (err) {
      console.error('Error saving complete/over review:', err);
      fetchData();
    }
  };

  // Save batch review evaluation
  const handleSaveBatch = async (batch) => {
    const { batchNumber, student1, student2, project } = batch;
    const { projectStatus, reviewStatus, evalDate, teamMark, isOver } = getBatchData(batch);
    const edits = batchEdits[batchNumber] || {};
    const remarks = edits.remarks || 'Satisfactory progress.';

    // Optimistic update
    setReviews(prev => {
      let next = [...prev];
      if (student1) {
        const idx1 = next.findIndex(r => r.student_register_number === student1.register_number && r.review_number === selectedReviewNum);
        const item1 = {
          student_register_number: student1.register_number,
          review_number: selectedReviewNum,
          review_status: reviewStatus,
          project_status: projectStatus,
          date: evalDate,
          mark: Number(teamMark) || 0,
          completed: isOver,
          comments: remarks
        };
        if (idx1 >= 0) next[idx1] = { ...next[idx1], ...item1 };
        else next.push(item1);
      }
      if (student2) {
        const idx2 = next.findIndex(r => r.student_register_number === student2.register_number && r.review_number === selectedReviewNum);
        const item2 = {
          student_register_number: student2.register_number,
          review_number: selectedReviewNum,
          review_status: reviewStatus,
          project_status: projectStatus,
          date: evalDate,
          mark: Number(teamMark) || 0,
          completed: isOver,
          comments: remarks
        };
        if (idx2 >= 0) next[idx2] = { ...next[idx2], ...item2 };
        else next.push(item2);
      }
      return next;
    });

    try {
      const promises = [];
      if (student1) {
        promises.push(api.saveReview({
          student_register_number: student1.register_number,
          review_number: selectedReviewNum,
          review_status: reviewStatus,
          project_status: projectStatus,
          date: evalDate,
          marks: Number(teamMark) || 0,
          completed: isOver,
          comments: remarks,
          sendNotification: false
        }));
      }
      if (student2) {
        promises.push(api.saveReview({
          student_register_number: student2.register_number,
          review_number: selectedReviewNum,
          review_status: reviewStatus,
          project_status: projectStatus,
          date: evalDate,
          marks: Number(teamMark) || 0,
          completed: isOver,
          comments: remarks,
          sendNotification: false
        }));
      }
      if (project && project.id && project.project_status !== projectStatus) {
        promises.push(api.updateProject(project.id, {
          ...project,
          project_status: projectStatus
        }));
      }

      await Promise.all(promises);
      setStatusMsg({
        type: 'success',
        text: `Evaluation saved for Batch ${batchNumber} (Review ${selectedReviewNum}).`
      });
    } catch (err) {
      console.error('Save review error:', err);
      fetchData();
    }
  };

  // Open Edit Modal for remarks and details
  const handleOpenUpdateModal = (batch) => {
    const { projectStatus, reviewStatus, evalDate, teamMark } = getBatchData(batch);
    const edits = batchEdits[batch.batchNumber] || {};

    setEditingBatch(batch);
    setFormReviewData({
      review_number: selectedReviewNum,
      review_status: reviewStatus || 'Completed',
      project_status: projectStatus || 'In Progress',
      date: evalDate || new Date().toISOString().split('T')[0],
      team_mark: teamMark ?? 8,
      remarks: edits.remarks || 'Satisfactory progress.',
      sendNotification: false
    });
    setIsUpdateModalOpen(true);
  };

  const handleSaveModalConfirmed = async () => {
    if (!editingBatch) return;
    const { batchNumber, student1, student2, project } = editingBatch;
    const { review_status, project_status, date, team_mark, remarks } = formReviewData;

    handleBatchFieldChange(batchNumber, 'review_status', review_status);
    handleBatchFieldChange(batchNumber, 'project_status', project_status);
    handleBatchFieldChange(batchNumber, 'date', date);
    handleBatchFieldChange(batchNumber, 'team_mark', team_mark);
    handleBatchFieldChange(batchNumber, 'remarks', remarks);

    try {
      const promises = [];
      if (student1) {
        promises.push(api.saveReview({
          student_register_number: student1.register_number,
          review_number: selectedReviewNum,
          review_status,
          project_status,
          date,
          marks: Number(team_mark) || 0,
          comments: remarks,
          sendNotification: false
        }));
      }
      if (student2) {
        promises.push(api.saveReview({
          student_register_number: student2.register_number,
          review_number: selectedReviewNum,
          review_status,
          project_status,
          date,
          marks: Number(team_mark) || 0,
          comments: remarks,
          sendNotification: false
        }));
      }
      if (project && project.id && project.project_status !== project_status) {
        promises.push(api.updateProject(project.id, {
          ...project,
          project_status
        }));
      }

      await Promise.all(promises);
      setStatusMsg({
        type: 'success',
        text: `Review ${selectedReviewNum} updated for Batch ${batchNumber}.`
      });
      setIsUpdateModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Error updating review.');
    }
  };

  // Group students by batch so each row is a BATCH
  const batchMap = new Map();
  students.forEach(s => {
    const bKey = String(s.batch_number || '1');
    if (!batchMap.has(bKey)) batchMap.set(bKey, []);
    batchMap.get(bKey).push(s);
  });

  const sortedBatchKeys = Array.from(batchMap.keys()).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

  const filteredBatches = sortedBatchKeys.map(bNum => {
    const bStudents = batchMap.get(bNum).sort((a, b) => (a.register_number || 0) - (b.register_number || 0));
    const s1 = bStudents[0] || null;
    const s2 = bStudents[1] || null;
    const proj = projects.find(p =>
      String(p.batch_number) === String(bNum) ||
      (s1 && (p.student1_register_number === s1.register_number || p.student2_register_number === s1.register_number)) ||
      (s2 && (p.student1_register_number === s2.register_number || p.student2_register_number === s2.register_number))
    );

    return {
      batchNumber: bNum,
      student1: s1,
      student2: s2,
      project: proj
    };
  }).filter(b => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchBatch = `batch ${b.batchNumber}`.toLowerCase().includes(q) || String(b.batchNumber).includes(q);
      const matchS1 = b.student1 && b.student1.name.toLowerCase().includes(q);
      const matchS2 = b.student2 && b.student2.name.toLowerCase().includes(q);
      const matchProj = b.project && b.project.project_title && b.project.project_title.toLowerCase().includes(q);
      if (!matchBatch && !matchS1 && !matchS2 && !matchProj) return false;
    }

    if (batchFilter !== 'ALL' && String(b.batchNumber) !== batchFilter) {
      return false;
    }

    if (statusFilter !== 'ALL') {
      const { reviewStatus } = getBatchData(b);
      if (statusFilter === 'Completed' && reviewStatus !== 'Completed') return false;
      if (statusFilter === 'Pending' && reviewStatus !== 'Pending') return false;
      if (statusFilter === 'Incomplete' && reviewStatus !== 'Incomplete') return false;
      if (statusFilter === 'Attended' && !reviewStatus.includes('Attended')) return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto space-y-4 overflow-hidden">
      
      {/* STATIONARY TOP BAR */}
      <div className="shrink-0 space-y-3">
        <div className="glass-panel p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-blue-600 dark:text-cyan-400" />
              <span>Review Evaluation</span>
            </h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
              Academic Review Cycle
            </span>
          </div>

          {/* 6 Review Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
            {[1, 2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                onClick={() => setSelectedReviewNum(num)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold font-display flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  selectedReviewNum === num
                    ? 'royal-gradient text-white border border-blue-500 shadow-md shadow-blue-600/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                <span className="text-sm font-extrabold">Review {num}</span>
                <span className="text-[11px] font-medium opacity-85">
                  {num === 1 ? 'Title & Abstract' : num === 2 ? 'System Design' : num === 3 ? 'Implementation 50%' : num === 4 ? 'Testing & Demo' : num === 5 ? 'Publication' : 'Final Viva'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {statusMsg && (
          <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
          }`}>
            <span>{statusMsg.text}</span>
            <button onClick={() => setStatusMsg(null)} className="font-bold underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Search & Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search batch, student name..."
              className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500">Status:</span>
            {['ALL', 'Completed', 'Pending', 'Incomplete', 'Attended'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'royal-gradient text-white border-blue-500 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                {st}
              </button>
            ))}

            <select
              value={batchFilter || 'ALL'}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer ml-2"
            >
              <option value="ALL">All Batches</option>
              {sortedBatchKeys.map(b => (
                <option key={b} value={b}>Batch {b}</option>
              ))}
            </select>

            {/* Export PDF Button */}
            <button
              onClick={() => {
                const reviewNames = {
                  1: 'Title & Abstract',
                  2: 'System Design & Architecture',
                  3: 'Implementation 50%',
                  4: 'Testing & Prototype Demo',
                  5: 'Publication & Documentation',
                  6: 'Final Project Viva'
                };
                exportReviewsToPDF({
                  reviewNumber: selectedReviewNum,
                  reviewName: reviewNames[selectedReviewNum] || `Review ${selectedReviewNum}`,
                  batchList: filteredBatches,
                  getBatchData,
                  searchQuery,
                  statusFilter,
                  batchFilter
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer ml-2"
              title="Download beautifully styled PDF Batch Evaluation Report"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* BATCH-ARRANGED REVIEWS TABLE */}
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left min-w-[1050px] border-collapse">
            <thead className="bg-slate-100/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-800 font-display text-slate-800 dark:text-slate-200 uppercase tracking-wider font-bold text-xs sticky top-0 backdrop-blur z-10">
              <tr>
                <th className="px-4 py-3.5 w-24">Batch</th>
                <th className="px-4 py-3.5 min-w-[190px]">Students</th>
                <th className="px-4 py-3.5 min-w-[210px]">Project Title</th>
                <th className="px-4 py-3.5 w-36">Project Status</th>
                <th className="px-4 py-3.5 w-40">Review Status</th>
                <th className="px-4 py-3.5 w-36">Evaluate Date</th>
                <th className="px-4 py-3.5 w-36 text-center">Mark Input</th>
                <th className="px-4 py-3.5 w-36 text-center">Complete / Over</th>
                <th className="px-4 py-3.5 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white/70 dark:bg-slate-900/60">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 font-medium text-sm">
                    No batches match the criteria for Review {selectedReviewNum}.
                  </td>
                </tr>
              ) : (
                filteredBatches.map(batch => {
                  const { batchNumber, student1, student2, project } = batch;
                  const {
                    projectStatus,
                    reviewStatus,
                    evalDate,
                    teamMark,
                    isOver
                  } = getBatchData(batch);

                  return (
                    <tr key={batchNumber} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* Batch Column */}
                      <td className="px-4 py-4 align-top">
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs shadow-xs">
                          Batch {batchNumber}
                        </span>
                      </td>

                      {/* Students Column — SHOW ONLY STUDENT NAMES (No numbers, No Reg/Roll) */}
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1.5">
                          {student1 ? (
                            <p className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                              {student1.name}
                            </p>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No Student 1</span>
                          )}

                          {student2 ? (
                            <p className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                              {student2.name}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      {/* Project Title */}
                      <td className="px-4 py-4 align-top">
                        {project ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs leading-snug line-clamp-2" title={project.project_title}>
                              {project.project_title}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              PID: {project.id}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No Project Assigned</span>
                        )}
                      </td>

                      {/* Project Status as Select */}
                      <td className="px-4 py-4 align-top">
                        <select
                          value={projectStatus || 'In Progress'}
                          onChange={(e) => handleBatchFieldChange(batchNumber, 'project_status', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-white cursor-pointer"
                        >
                          <option value="Not Started">Not Started</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>

                      {/* Review Status Select Button */}
                      <td className="px-4 py-4 align-top">
                        <select
                          value={reviewStatus || 'Pending'}
                          onChange={(e) => handleBatchFieldChange(batchNumber, 'review_status', e.target.value)}
                          className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border cursor-pointer ${
                            reviewStatus === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                          }`}
                        >
                          <option value="Completed">Completed</option>
                          <option value="Pending">Pending</option>
                          <option value="Incomplete">Incomplete</option>
                          <option value="Attended but Not Executed">Attended</option>
                        </select>
                      </td>

                      {/* Evaluate Date as Edit */}
                      <td className="px-4 py-4 align-top">
                        <input
                          type="date"
                          value={evalDate || ''}
                          onChange={(e) => handleBatchFieldChange(batchNumber, 'date', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white"
                        />
                      </td>

                      {/* Single Team Mark Input for the Whole Batch */}
                      <td className="px-4 py-4 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={teamMark ?? ''}
                            onChange={(e) => handleBatchFieldChange(batchNumber, 'team_mark', e.target.value)}
                            className="w-16 px-2 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-center focus:ring-2 focus:ring-blue-500 shadow-xs"
                          />
                          <span className="text-xs font-mono text-slate-400 font-bold">/ 10</span>
                        </div>
                      </td>

                      {/* Complete Review / Over Checkbox — Saves & Auto Sends Messages */}
                      <td className="px-4 py-4 align-top text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <input
                            type="checkbox"
                            checked={isOver}
                            onChange={(e) => handleToggleCompleteOver(batch, e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded border-slate-300 dark:border-slate-700 cursor-pointer"
                            title="Check to save review and auto-send notification to both students and mentor"
                          />
                          <span className={`text-[10px] font-bold ${isOver ? 'text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5' : 'text-slate-400'}`}>
                            {isOver ? 'Over' : 'Pending'}
                          </span>
                        </div>
                      </td>

                      {/* Edit Pencil & Save Button */}
                      <td className="px-4 py-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSaveBatch(batch)}
                            className="px-2.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Save Batch Review and Dispatch Alerts"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>

                          <button
                            onClick={() => handleOpenUpdateModal(batch)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Remarks & Details (Pencil)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
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

      {/* Batch Detailed Review Update Modal */}
      {isUpdateModalOpen && editingBatch && (
        <Modal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          title={`Review ${selectedReviewNum} Evaluation — Batch ${editingBatch.batchNumber}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                Batch {editingBatch.batchNumber} Team Members
              </p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {editingBatch.student1?.name || 'Student 1'} {editingBatch.student2 ? `& ${editingBatch.student2.name}` : ''}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Team Marks (0-10)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={formReviewData.team_mark ?? ''}
                onChange={(e) => setFormReviewData({ ...formReviewData, team_mark: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Review Status
                </label>
                <select
                  value={formReviewData.review_status || 'Completed'}
                  onChange={(e) => setFormReviewData({ ...formReviewData, review_status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                >
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="Incomplete">Incomplete</option>
                  <option value="Attended but Not Executed">Attended</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Project Status
                </label>
                <select
                  value={formReviewData.project_status || 'In Progress'}
                  onChange={(e) => setFormReviewData({ ...formReviewData, project_status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Not Started">Not Started</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Evaluation Date
              </label>
              <input
                type="date"
                value={formReviewData.date || ''}
                onChange={(e) => setFormReviewData({ ...formReviewData, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Supervisor Remarks & Feedback
              </label>
              <textarea
                rows={3}
                value={formReviewData.remarks || ''}
                onChange={(e) => setFormReviewData({ ...formReviewData, remarks: e.target.value })}
                placeholder="Enter feedback for the batch..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <input
                type="checkbox"
                id="sendNotif"
                checked={formReviewData.sendNotification}
                onChange={(e) => setFormReviewData({ ...formReviewData, sendNotification: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
              />
              <label htmlFor="sendNotif" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-blue-500" />
                <span>Send notification email & in-app alert to both students and mentor</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModalConfirmed}
                className="px-4 py-2 text-xs font-bold royal-gradient text-white rounded-xl shadow-md cursor-pointer"
              >
                Save Evaluation
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
