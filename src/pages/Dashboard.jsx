import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ExcelUploadModal from '../components/ExcelUploadModal.jsx';
import {
  GraduationCap,
  FolderGit2,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  Plus,
  Search,
  FileCheck2,
  FileText,
  UserPlus,
  UserCheck,
  TrendingUp,
  FileSpreadsheet,
  Award,
  AlertCircle,
  RefreshCw,
  Save
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

export default function Dashboard({ onOpenRAG }) {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projectStatusFilter, setProjectStatusFilter] = useState('ALL');
  const [uncompletedReviewFilter, setUncompletedReviewFilter] = useState('ALL');

  // Modals
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddMentorOpen, setIsAddMentorOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Student Form State
  const [studentForm, setStudentForm] = useState({
    name: '',
    register_number: '',
    roll_number: '',
    batch_number: '',
    email: '',
    phone: '',
    department: 'CSE',
    mentor_roll_number: 'MNT-401',
    year: '4th Year',
    section: 'A',
    class: 'A',
    teammate_name: ''
  });
  const [studentFormError, setStudentFormError] = useState(null);
  const [studentFormSaving, setStudentFormSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Mentor Form State
  const [mentorForm, setMentorForm] = useState({
    name: '',
    phone: '',
    email: '',
    mentor_roll_number: '',
    department: 'CSE'
  });
  const [mentorFormError, setMentorFormError] = useState(null);
  const [mentorFormSaving, setMentorFormSaving] = useState(false);

  const [confirmMsg, setConfirmMsg] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sRes, pRes, mRes, rRes] = await Promise.all([
        api.getStudents(),
        api.getProjects(),
        api.getMentors(),
        api.getReviews()
      ]);
      if (Array.isArray(sRes)) setStudents(sRes);
      if (Array.isArray(pRes)) setProjects(pRes);
      if (Array.isArray(mRes)) setMentors(mRes);
      if (Array.isArray(rRes)) setReviews(rRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const totalStudents = students.length;
  const totalProjects = projects.length;
  const completedProjectsCount = projects.filter(p => p.project_status === 'Completed').length;
  const pendingProjectsCount = totalProjects - completedProjectsCount;

  const completedReviewsCount = reviews.filter(r => r.review_status === 'Completed').length;
  const pendingReviewsCount = reviews.filter(r => r.review_status !== 'Completed').length;

  const chartData = [
    { review: 'Rev 1', completed: reviews.filter(r => r.review_number === 1 && r.review_status === 'Completed').length, pending: reviews.filter(r => r.review_number === 1 && r.review_status !== 'Completed').length },
    { review: 'Rev 2', completed: reviews.filter(r => r.review_number === 2 && r.review_status === 'Completed').length, pending: reviews.filter(r => r.review_number === 2 && r.review_status !== 'Completed').length },
    { review: 'Rev 3', completed: reviews.filter(r => r.review_number === 3 && r.review_status === 'Completed').length, pending: reviews.filter(r => r.review_number === 3 && r.review_status !== 'Completed').length },
    { review: 'Rev 4', completed: reviews.filter(r => r.review_number === 4 && r.review_status === 'Completed').length, pending: reviews.filter(r => r.review_number === 4 && r.review_status !== 'Completed').length },
    { review: 'Rev 5', completed: reviews.filter(r => r.review_number === 5 && r.review_status === 'Completed').length, pending: reviews.filter(r => r.review_number === 5 && r.review_status !== 'Completed').length },
    { review: 'Rev 6', completed: reviews.filter(r => r.review_number === 6 && r.review_status === 'Completed').length, pending: reviews.filter(r => r.review_number === 6 && r.review_status !== 'Completed').length }
  ];

  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    setStudentFormError(null);

    // 1. Check required fields
    if (!studentForm.name.trim()) {
      setStudentFormError('Full Name is required.');
      return;
    }
    if (!String(studentForm.register_number).trim()) {
      setStudentFormError('Registration Number is required.');
      return;
    }
    if (!studentForm.roll_number.trim()) {
      setStudentFormError('Roll Number is required.');
      return;
    }
    if (!String(studentForm.batch_number).trim()) {
      setStudentFormError('Batch Number is required.');
      return;
    }
    if (!studentForm.email.trim()) {
      setStudentFormError('Email Address is required.');
      return;
    }
    if (!studentForm.phone.trim()) {
      setStudentFormError('Phone Number is required.');
      return;
    }
    if (!studentForm.department) {
      setStudentFormError('Department is required.');
      return;
    }
    if (!studentForm.mentor_roll_number) {
      setStudentFormError('Assigned Supervisor is required.');
      return;
    }
    if (!studentForm.year) {
      setStudentFormError('Year is required.');
      return;
    }
    if (!studentForm.section) {
      setStudentFormError('Section is required.');
      return;
    }

    // 2. Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentForm.email.trim())) {
      setStudentFormError('Please enter a valid email address (e.g. student@example.com).');
      return;
    }

    // 3. Check phone format
    const phoneDigits = String(studentForm.phone || '').trim().replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setStudentFormError('Please enter a valid phone number (at least 10 digits).');
      return;
    }

    // 4. Duplicate registration number check against existing students
    const regTrimmed = String(studentForm.register_number).trim();
    const existingStudent = students.find(s => String(s.register_number).trim() === regTrimmed);
    if (existingStudent) {
      setStudentFormError('A student with this registration number already exists.');
      return;
    }

    setStudentFormSaving(true);
    try {
      const res = await api.createStudent({
        name: studentForm.name.trim(),
        roll_number: studentForm.roll_number.trim(),
        register_number: parseInt(regTrimmed, 10),
        batch_number: parseInt(studentForm.batch_number, 10),
        email: studentForm.email.trim(),
        phone: phoneDigits,
        department: studentForm.department,
        mentor_roll_number: studentForm.mentor_roll_number,
        year: studentForm.year,
        section: studentForm.section,
        class: studentForm.section,
        teammate_name: (studentForm.teammate_name || '').trim()
      });

      if (res && res.error) {
        setStudentFormError(res.error);
      } else {
        setIsAddStudentOpen(false);
        setStatusMsg({
          type: 'success',
          text: `Student "${studentForm.name.trim()}" added successfully to Batch ${studentForm.batch_number}!`
        });
        setStudentForm({
          name: '',
          register_number: '',
          roll_number: '',
          batch_number: '',
          email: '',
          phone: '',
          department: 'CSE',
          mentor_roll_number: mentors[0]?.mentor_roll_number || 'MNT-401',
          year: '4th Year',
          section: 'A',
          class: 'A',
          teammate_name: ''
        });
        await fetchDashboardData();
      }
    } catch (err) {
      setStudentFormError(err.message || 'Error creating student.');
    } finally {
      setStudentFormSaving(false);
    }
  };

  const handleAddMentorSubmit = async (e) => {
    e.preventDefault();
    setMentorFormError(null);
    setMentorFormSaving(true);
    try {
      const res = await api.createMentor(mentorForm);
      if (res && res.error) {
        setMentorFormError(res.error);
      } else {
        setIsAddMentorOpen(false);
        setMentorForm({
          name: '',
          phone: '',
          email: '',
          mentor_roll_number: '',
          department: 'CSE'
        });
        await fetchDashboardData();
      }
    } catch (err) {
      setMentorFormError(err.message || 'Error creating mentor.');
    } finally {
      setMentorFormSaving(false);
    }
  };

  // Search and Filter
  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    const nameMatch = s.name.toLowerCase().includes(q);
    const regMatch = String(s.register_number).includes(q);
    const rollMatch = s.roll_number.toLowerCase().includes(q);
    const batchMatch = String(s.batch_number).includes(q);

    const matchesSearch = nameMatch || regMatch || rollMatch || batchMatch;
    const matchesBatch = batchFilter === 'ALL' || String(s.batch_number) === batchFilter;

    const proj = projects.find(p => p.student1_register_number === s.register_number || p.student2_register_number === s.register_number);
    const projStatus = proj ? proj.project_status : 'In Progress';
    const matchesProjectStatus = projectStatusFilter === 'ALL' || projStatus === projectStatusFilter;

    return matchesSearch && matchesBatch && matchesProjectStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Context-aware Headline Goal Header */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border border-slate-200/80 dark:border-slate-800 w-full overflow-hidden">
        <div className="flex flex-col gap-1.5 w-full lg:w-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 uppercase tracking-wider">
              Headline Goal
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Academic Year 2025–2026</span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink max-w-full">
          <button
            onClick={() => navigate('/students')}
            className="px-3.5 py-2 text-xs font-bold royal-gradient text-white border border-blue-500 rounded-xl shadow-md shadow-blue-600/20 hover:border-blue-400 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            title="Navigate to Students"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>STUDENT</span>
          </button>

          <button
            onClick={() => {
              setStudentForm({
                name: '',
                register_number: '',
                roll_number: '',
                batch_number: '',
                email: '',
                phone: '',
                department: 'CSE',
                mentor_roll_number: 'MNT-401',
                year: '4th Year',
                section: 'A',
                class: 'A',
                teammate_name: ''
              });
              setStudentFormError(null);
              setIsAddStudentOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl hover:border-blue-400 hover:shadow-[0_0_10px_rgba(37,99,235,0.25)] flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            title="Open Add Student Form"
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
            <span>ADD STUDENT</span>
          </button>

          <button
            onClick={() => setIsAddMentorOpen(true)}
            className="px-3.5 py-2 text-xs font-bold bg-slate-100/90 dark:bg-slate-800 text-blue-600 dark:text-cyan-400 border border-blue-300 dark:border-slate-700 rounded-xl hover:border-blue-500 hover:shadow-[0_0_12px_rgba(37,99,235,0.25)] flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>+ ADD SUPERVISOR</span>
          </button>

          <button
            onClick={() => navigate('/review-report')}
            className="px-3.5 py-2 text-xs font-bold bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 hover:shadow-[0_0_12px_rgba(37,99,235,0.25)] flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>REVIEW REPORT</span>
          </button>

          <button
            onClick={() => navigate('/final-report/4065')}
            className="px-3.5 py-2 text-xs font-bold bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 hover:shadow-[0_0_12px_rgba(37,99,235,0.25)] flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>FINAL REPORT</span>
          </button>

          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 rounded-xl hover:border-emerald-400 hover:shadow-[0_0_10px_rgba(16,185,129,0.25)] flex items-center gap-1.5 cursor-pointer transition-all max-w-full shrink-0"
            title="Import or Export Excel Data"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">Excel Sheet</span>
          </button>
        </div>
      </div>

      {/* Success / Status Notification Toast */}
      {statusMsg && (
        <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 border transition-all ${
          statusMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Summary Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* TOTAL STUDENTS */}
        <div className="glass-panel p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">TOTAL STUDENTS</span>
            <GraduationCap className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
          </div>
          <p className="text-2xl font-bold font-display text-slate-900 dark:text-white">
            {totalStudents}
          </p>
          <p className="text-[10px] text-slate-500">Batches 35 & 36</p>
        </div>

        {/* TOTAL PROJECTS */}
        <div className="glass-panel p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">TOTAL PROJECTS</span>
            <FolderGit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-2xl font-bold font-display text-slate-900 dark:text-white">
            {totalProjects}
          </p>
          <p className="text-[10px] text-slate-500">Registered Teams</p>
        </div>

        {/* COMPLETED PROJECTS */}
        <div className="glass-panel p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">COMPLETED PROJECTS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-display text-slate-900 dark:text-white">
            {completedProjectsCount}
          </p>
          <p className="text-[10px] text-emerald-600 font-medium">Final Stage Ready</p>
        </div>

        {/* PENDING PROJECTS */}
        <div className="glass-panel p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">PENDING PROJECTS</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-display text-slate-900 dark:text-white">
            {pendingProjectsCount}
          </p>
          <p className="text-[10px] text-amber-600 font-medium">Under Execution</p>
        </div>

        {/* COMPLETED REVIEWS */}
        <div className="glass-panel p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">COMPLETED REVIEWS</span>
            <ClipboardCheck className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
          </div>
          <p className="text-2xl font-bold font-display text-slate-900 dark:text-white">
            {completedReviewsCount}
          </p>
          <p className="text-[10px] text-blue-600 font-medium">Evaluated & Recorded</p>
        </div>

        {/* PENDING REVIEWS */}
        <div className="glass-panel p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">PENDING REVIEWS</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold font-display text-slate-900 dark:text-white">
            {pendingReviewsCount}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Scheduled Reviews</p>
        </div>

      </div>

      {/* Review Not Completed Students Dynamic List */}
      <div className="glass-panel p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Review Not Completed Students
              </h3>
              <p className="text-xs text-slate-500">Students with pending, incomplete, or unexecuted review evaluations</p>
            </div>

            <select
              value={uncompletedReviewFilter || 'ALL'}
              onChange={(e) => setUncompletedReviewFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white cursor-pointer"
            >
              <option value="ALL">All Pending Reviews</option>
              <option value="1">Review 1 Pending</option>
              <option value="2">Review 2 Pending</option>
              <option value="3">Review 3 Pending</option>
              <option value="4">Review 4 Pending</option>
              <option value="5">Review 5 Pending</option>
              <option value="6">Review 6 Pending</option>
            </select>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-xl border border-slate-200/60 dark:border-slate-800">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-100/95 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-bold text-xs sticky top-0 backdrop-blur z-10">
                <tr>
                  <th className="px-3.5 py-3">Student</th>
                  <th className="px-3.5 py-3">Batch</th>
                  <th className="px-3.5 py-3">Project Title</th>
                  <th className="px-3.5 py-3">Review Status</th>
                  <th className="px-3.5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white/70 dark:bg-slate-900/60">
                {(() => {
                  const uncompletedRows = students.map(s => {
                    const studentRevs = reviews.filter(r => r.student_register_number === s.register_number);
                    const uncompleted = studentRevs.filter(r => r.review_status !== 'Completed');

                    if (uncompletedReviewFilter !== 'ALL') {
                      const targetRevNum = parseInt(uncompletedReviewFilter, 10);
                      const hasTarget = uncompleted.some(r => r.review_number === targetRevNum);
                      if (!hasTarget) return null;
                    } else if (uncompleted.length === 0) {
                      return null;
                    }

                    const proj = projects.find(p => p.student1_register_number === s.register_number || p.student2_register_number === s.register_number);
                    const projTitle = proj ? proj.project_title : (studentRevs[0]?.project_title || 'N/A');

                    let reviewStatusText = 'Pending';
                    if (uncompletedReviewFilter !== 'ALL') {
                      const targetRev = studentRevs.find(r => r.review_number === parseInt(uncompletedReviewFilter, 10));
                      reviewStatusText = targetRev ? (targetRev.review_status || 'Pending') : 'Pending';
                    } else {
                      reviewStatusText = uncompleted.map(u => `Rev ${u.review_number}: ${u.review_status || 'Pending'}`).join(', ');
                    }

                    return {
                      student: s,
                      projectTitle: projTitle,
                      reviewStatus: reviewStatusText
                    };
                  }).filter(Boolean);

                  if (uncompletedRows.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-medium text-sm">
                          🎉 All student review evaluations are completed!
                        </td>
                      </tr>
                    );
                  }

                  return uncompletedRows.map(row => (
                    <tr key={row.student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3.5 py-3">
                        <p className="font-bold text-slate-900 dark:text-white text-xs">{row.student.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">Reg: {row.student.register_number}</p>
                      </td>
                      <td className="px-3.5 py-3 font-mono font-bold text-blue-600 dark:text-cyan-400 text-xs">
                        Batch {row.student.batch_number}
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-slate-700 dark:text-slate-300 text-xs max-w-xs truncate" title={row.projectTitle}>
                        {row.projectTitle}
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 inline-block">
                          {row.reviewStatus}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <button
                          onClick={() => navigate('/reviews')}
                          className="px-3 py-1.5 text-xs font-bold royal-gradient text-white rounded-lg hover:opacity-95 cursor-pointer shrink-0 shadow-sm"
                        >
                          EVALUATE
                        </button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

      {/* Global Search & Student List Section */}
      <div className="glass-panel p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
              Student Project Supervision Registry
            </h3>
            <p className="text-xs text-slate-500">Global search & quick filters</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, reg no, roll no..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>

            <select
              value={batchFilter || 'ALL'}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white cursor-pointer"
            >
              <option value="ALL">All Batches</option>
              <option value="35">Batch 35</option>
              <option value="36">Batch 36</option>
            </select>

            <select
              value={projectStatusFilter || 'ALL'}
              onChange={(e) => setProjectStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white cursor-pointer"
            >
              <option value="ALL">All Project Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px] border-collapse">
            <thead className="bg-slate-100/95 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 font-display text-slate-800 dark:text-slate-200 uppercase tracking-wider font-bold text-xs">
              <tr>
                <th className="px-4 py-3.5">Batch</th>
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Reg. No</th>
                <th className="px-4 py-3.5">Roll No</th>
                <th className="px-4 py-3.5">Project Title</th>
                <th className="px-4 py-3.5">Supervisor</th>
                <th className="px-4 py-3.5 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white/70 dark:bg-slate-900/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-medium text-sm">
                    No students match the search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const project = projects.find(p => p.student1_register_number === student.register_number || p.student2_register_number === student.register_number);
                  const mentor = mentors.find(m => m.mentor_roll_number === student.mentor_roll_number || (project && m.mentor_roll_number === project.mentor_roll_number));

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-cyan-400 text-xs">
                        Batch {student.batch_number}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white text-xs">{student.name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300 text-xs font-semibold">
                        {student.register_number}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300 text-xs">
                        {student.roll_number}
                      </td>

                      <td className="px-4 py-3.5">
                        {project ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs line-clamp-2" title={project.project_title}>
                              {project.project_title}
                            </p>
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${
                              project.project_status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                            }`}>
                              {project.project_status || 'In Progress'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No Project</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {mentor ? (
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-xs">{mentor.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{mentor.mentor_roll_number}</p>
                          </div>
                        ) : (
                          student.department || 'CSE'
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => navigate(`/final-report/${student.register_number}`)}
                          className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors cursor-pointer"
                        >
                          View Final Report
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddStudentOpen}
        onClose={() => {
          setIsAddStudentOpen(false);
          setStudentFormError(null);
        }}
        title="Add Student"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleAddStudentSubmit} className="space-y-4">
          {studentFormError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{studentFormError}</span>
            </div>
          )}

          {/* Full Name & Registration Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={studentForm.name || ''}
                onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                placeholder="e.g. Govind M."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Registration Number *
              </label>
              <input
                type="text"
                required
                value={studentForm.register_number || ''}
                onChange={(e) => setStudentForm({ ...studentForm, register_number: e.target.value })}
                placeholder="e.g. 4065"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Roll Number & Batch Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Roll Number *
              </label>
              <input
                type="text"
                required
                value={studentForm.roll_number || ''}
                onChange={(e) => setStudentForm({ ...studentForm, roll_number: e.target.value })}
                placeholder="e.g. 21CS045"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Batch Number *
              </label>
              <input
                type="text"
                required
                value={studentForm.batch_number || ''}
                onChange={(e) => setStudentForm({ ...studentForm, batch_number: e.target.value })}
                placeholder="e.g. 38"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Email Address & Phone Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={studentForm.email || ''}
                onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                placeholder="student@example.com"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={studentForm.phone || ''}
                onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Department & Assigned Supervisor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Department *
              </label>
              <select
                required
                value={studentForm.department || 'CSE'}
                onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="CSE">Computer Science & Engineering (CSE)</option>
                <option value="ECE">Electronics & Communication (ECE)</option>
                <option value="EEE">Electrical & Electronics (EEE)</option>
                <option value="IT">Information Technology (IT)</option>
                <option value="MECH">Mechanical Engineering (MECH)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Supervisor *
              </label>
              <select
                required
                value={studentForm.mentor_roll_number || 'MNT-401'}
                onChange={(e) => setStudentForm({ ...studentForm, mentor_roll_number: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="MNT-401">Dr. Vasanthi R. (MNT-401)</option>
                <option value="MNT-402">Prof. Rajesh Kumar (MNT-402)</option>
                <option value="MNT-403">Dr. Anita Sharma (MNT-403)</option>
                {mentors
                  .filter(m => !['MNT-401', 'MNT-402', 'MNT-403'].includes(m.mentor_roll_number))
                  .map(m => (
                    <option key={m.id || m.mentor_roll_number} value={m.mentor_roll_number}>
                      {m.name} ({m.mentor_roll_number})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Year & Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Year *
              </label>
              <select
                required
                value={studentForm.year || '4th Year'}
                onChange={(e) => setStudentForm({ ...studentForm, year: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="4th Year">4th Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="1st Year">1st Year</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Section *
              </label>
              <select
                required
                value={studentForm.section || 'A'}
                onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value, class: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
          </div>

          {/* Team Mate Name (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Team Mate Name
            </label>
            <input
              type="text"
              value={studentForm.teammate_name || ''}
              onChange={(e) => setStudentForm({ ...studentForm, teammate_name: e.target.value })}
              placeholder="e.g. Joel Britto (Optional)"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Optional. Used to pair students in academic batches for team evaluation & Final Report.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsAddStudentOpen(false);
                setStudentFormError(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={studentFormSaving}
              className="px-5 py-2.5 text-xs font-bold royal-gradient text-white rounded-xl shadow-md shadow-blue-600/20 hover:opacity-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {studentFormSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding Student...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Student</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Supervisor Modal */}
      <Modal isOpen={isAddMentorOpen} onClose={() => { setIsAddMentorOpen(false); setMentorFormError(null); }} title="+ Add New Faculty Supervisor" maxWidth="max-w-md">
        <form onSubmit={handleAddMentorSubmit} className="space-y-4">
          {mentorFormError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{mentorFormError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Supervisor Name *</label>
            <input
              type="text"
              required
              value={mentorForm.name || ''}
              onChange={(e) => setMentorForm({ ...mentorForm, name: e.target.value })}
              placeholder="Enter Supervisor Name"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Supervisor Staff ID / Roll Number *</label>
            <input
              type="text"
              required
              value={mentorForm.mentor_roll_number || ''}
              onChange={(e) => setMentorForm({ ...mentorForm, mentor_roll_number: e.target.value })}
              placeholder="Enter Supervisor Staff ID / Roll Number"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number (10 Digits) *</label>
            <input
              type="text"
              required
              maxLength={10}
              value={mentorForm.phone || ''}
              onChange={(e) => setMentorForm({ ...mentorForm, phone: e.target.value })}
              placeholder="Enter Phone Number (10 Digits)"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email *</label>
            <input
              type="email"
              required
              value={mentorForm.email || ''}
              onChange={(e) => setMentorForm({ ...mentorForm, email: e.target.value })}
              placeholder="Enter Email"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => { setIsAddMentorOpen(false); setMentorFormError(null); }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mentorFormSaving}
              className="px-5 py-2 text-xs font-bold royal-gradient text-white rounded-lg hover:opacity-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {mentorFormSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>SAVE MENTOR</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Excel Data Modal */}
      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onRefresh={fetchDashboardData}
      />

    </div>
  );
}
