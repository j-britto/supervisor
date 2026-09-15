import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import {
  Search,
  Eye,
  FileText,
  Mail,
  Phone,
  Building,
  Trash2,
  UserPlus,
  Edit,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Save,
  AlertCircle
} from 'lucide-react';

export default function Students() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [fileUploads, setFileUploads] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('ALL');

  // Edit / Details Modal State
  const [editingStudent, setEditingStudent] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    roll_number: '',
    register_number: '',
    phone: '',
    email: '',
    department: 'CSE',
    class: 'A',
    batch_number: '',
    mentor_roll_number: ''
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  // Add Student Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    roll_number: '',
    register_number: '',
    phone: '',
    email: '',
    department: 'CSE',
    class: 'A',
    batch_number: 38,
    mentor_roll_number: 'MNT-401'
  });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState(null);

  // Document Viewer Modal State
  const [viewDoc, setViewDoc] = useState(null); // { title, url, batchNumber, projectTitle }

  // Delete Confirm Dialog
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Clear All Data Dialog
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      const res = await api.clearAllStudentData();
      if (res && res.success) {
        alert('All student data cleared successfully.');
        await fetchData();
      } else {
        alert(res?.error || 'Failed to clear student data');
      }
    } catch (err) {
      console.error('Clear all data error:', err);
      alert(err.message || 'Failed to clear student data');
    } finally {
      setIsClearing(false);
      setIsClearAllDialogOpen(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, mRes, pRes, fuRes] = await Promise.all([
        api.getStudents(),
        api.getMentors(),
        api.getProjects(),
        api.getFileUploads()
      ]);
      if (Array.isArray(sRes)) setStudents(sRes);
      if (Array.isArray(mRes)) setMentors(mRes);
      if (Array.isArray(pRes)) setProjects(pRes);
      if (Array.isArray(fuRes)) setFileUploads(fuRes);
    } catch (err) {
      console.error('Failed to load students registry data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditStudent = (student) => {
    setEditingStudent(student);
    setEditFormData({
      name: student.name || '',
      roll_number: student.roll_number || '',
      register_number: student.register_number || '',
      phone: student.phone || '',
      email: student.email || '',
      department: student.department || 'CSE',
      class: student.class || 'A',
      batch_number: student.batch_number || 35,
      mentor_roll_number: student.mentor_roll_number || 'MNT-401',
      photo: student.photo || ''
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveStudentEdit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditSaving(true);
    setEditError(null);

    try {
      const res = await api.updateStudent(editingStudent.id, {
        ...editFormData,
        register_number: parseInt(editFormData.register_number, 10),
        batch_number: parseInt(editFormData.batch_number, 10)
      });

      if (res.error) {
        setEditError(res.error);
      } else {
        setIsEditModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to update student:', err);
      setEditError(err.message || 'Failed to save student details');
    } finally {
      setEditSaving(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setAddError(null);

    const phoneDigits = String(addFormData.phone || '').trim().replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setAddError('Phone number must be exactly 10 digits.');
      return;
    }

    setAddSaving(true);
    try {
      const res = await api.createStudent({
        ...addFormData,
        phone: phoneDigits,
        register_number: parseInt(addFormData.register_number, 10),
        batch_number: parseInt(addFormData.batch_number, 10)
      });

      if (res && res.error) {
        setAddError(res.error);
      } else {
        setIsAddModalOpen(false);
        setAddFormData({
          name: '',
          roll_number: '',
          register_number: '',
          phone: '',
          email: '',
          department: 'CSE',
          class: 'A',
          batch_number: 38,
          mentor_roll_number: mentors[0]?.mentor_roll_number || 'MNT-401'
        });
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to create student:', err);
      setAddError(err.message || 'Failed to register student');
    } finally {
      setAddSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    try {
      setStudents(prev => prev.filter(s => s.id !== deleteTarget.id));
      setIsConfirmOpen(false);
      await api.deleteStudent(deleteTarget.id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete student:', err);
      fetchData();
    }
  };

  // Group students by Batch Number (1 Batch = 1 Project Team)
  const batchMap = new Map();

  students.forEach(student => {
    const bNum = parseInt(student.batch_number, 10) || student.batch_number;
    if (!batchMap.has(bNum)) {
      batchMap.set(bNum, {
        batchNumber: bNum,
        students: []
      });
    }
    batchMap.get(bNum).students.push(student);
  });

  const batchList = Array.from(batchMap.values()).sort((a, b) => Number(a.batchNumber) - Number(b.batchNumber));

  // Unique batches for filter dropdown
  const uniqueBatches = Array.from(new Set(students.map(s => String(s.batch_number || '35'))))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Filter batches based on search query and batch filter
  const filteredBatches = batchList.filter(team => {
    if (batchFilter !== 'ALL' && String(team.batchNumber) !== batchFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchBatch = String(team.batchNumber).includes(q) || `batch ${team.batchNumber}`.includes(q);
      const matchStudents = team.students.some(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.register_number && String(s.register_number).includes(q)) ||
        (s.roll_number && s.roll_number.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
      );

      const project = projects.find(p => String(p.batch_number) === String(team.batchNumber));
      const matchProject = project && project.project_title?.toLowerCase().includes(q);

      if (!matchBatch && !matchStudents && !matchProject) return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto space-y-4 overflow-hidden">
      
      {/* Search & Batch Dropdown */}
      <div className="shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, batch, reg no..."
              className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Filter Batch:</span>
            <select
              value={batchFilter || 'ALL'}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer"
            >
              <option value="ALL">All Batches</option>
              {uniqueBatches.map(b => (
                <option key={b} value={b}>Batch {b}</option>
              ))}
            </select>

            <button
              onClick={fetchData}
              className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer ml-1"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              id="btn-clear-all-data-students"
              type="button"
              onClick={() => setIsClearAllDialogOpen(true)}
              disabled={isClearing || loading}
              className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold ml-1 shadow-xs disabled:opacity-50"
              title="Clear all student records for new academic cycle"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isClearing ? 'animate-spin' : 'text-rose-600 dark:text-rose-400'}`} />
              <span>{isClearing ? 'Clearing...' : 'Clear All Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* NEW COLUMN STRUCTURE (1. Batch Number, 2. Student Name, 3. Student Details, 4. Project Report, Final Report) */}
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead className="bg-slate-100/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-800 font-display text-slate-800 dark:text-slate-200 uppercase tracking-wider font-bold text-xs sticky top-0 backdrop-blur z-10">
              <tr>
                <th className="px-5 py-3.5 w-28">1. Batch Number</th>
                <th className="px-5 py-3.5 w-72">2. Student Name</th>
                <th className="px-5 py-3.5 w-64">3. Student Details</th>
                <th className="px-5 py-3.5 text-center w-44">4. Project Report</th>
                <th className="px-5 py-3.5 text-center w-40">Final Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 bg-white/70 dark:bg-slate-900/60">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium text-sm">
                    No student batch records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredBatches.map(team => {
                  const project = projects.find(p => String(p.batch_number) === String(team.batchNumber));
                  const fileUpload = fileUploads.find(fu => String(fu.batchNumber) === String(team.batchNumber));

                  const reportUrl = fileUpload?.reportUrl || project?.report_url;
                  const isReportUploaded = Boolean(fileUpload?.reportUploaded || project?.report_uploaded || (reportUrl && reportUrl.trim() !== ''));

                  return (
                    <tr key={team.batchNumber} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* 1. Batch Number */}
                      <td className="px-5 py-4 align-top">
                        <div className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-[#1E3FA6] dark:text-cyan-300 font-mono font-black text-sm shadow-xs">
                          Batch {team.batchNumber}
                        </div>
                        {project && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1.5 max-w-[140px] truncate" title={project.project_title}>
                            {project.project_title}
                          </p>
                        )}
                      </td>

                      {/* 2. Student Name (Grouped Team Members) */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-2.5">
                          {team.students.map((student, idx) => (
                            <div key={student.id || student.register_number} className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                                    S{idx + 1}
                                  </span>
                                  <p className="font-bold text-slate-900 dark:text-white text-xs leading-tight truncate">
                                    {student.name}
                                  </p>
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Reg: {student.register_number} • Roll: {student.roll_number}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* 3. Student Details (Editable Action Button) */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-2">
                          {team.students.map((student, idx) => (
                            <div key={student.id || student.register_number} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                              <div className="min-w-0 text-[11px]">
                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {student.name} ({student.department || 'CSE'})
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {student.email}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleOpenEditStudent(student)}
                                  className="px-2.5 py-1 text-xs font-bold rounded-lg text-[#1E3FA6] dark:text-cyan-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                  title={`Edit student details for ${student.name}`}
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Edit Student</span>
                                </button>
                                
                                <button
                                  onClick={() => {
                                    setDeleteTarget({ id: student.id, name: student.name, batch: student.batch_number });
                                    setIsConfirmOpen(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  title="Delete Student"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* 4. Project Report (View Report or Not Uploaded) */}
                      <td className="px-5 py-4 align-middle text-center">
                        {isReportUploaded ? (
                          <div className="inline-flex flex-col items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 shadow-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Uploaded</span>
                            </span>

                            <button
                              onClick={() => setViewDoc({
                                title: `Batch ${team.batchNumber} Project Report`,
                                url: reportUrl || `https://studypulse.edu/reports/batch_${team.batchNumber}_report.pdf`,
                                batchNumber: team.batchNumber,
                                projectTitle: project?.project_title || `Batch ${team.batchNumber} Final Report`
                              })}
                              className="px-3 py-1 text-xs font-bold rounded-lg text-white bg-[#1E3FA6] hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                              title="Access verified project report document"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Report</span>
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900 shadow-xs">
                              <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              <span>Not Uploaded</span>
                            </span>
                            <span className="text-[10px] text-slate-400 italic">No report submitted</span>
                          </div>
                        )}
                      </td>

                      {/* 5. Final Report Column */}
                      <td className="px-5 py-4 align-middle text-center">
                        <button
                          onClick={() => navigate(`/final-report/batch/${team.batchNumber}`)}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-xl text-white royal-gradient hover:opacity-95 shadow-md shadow-[#1E3FA6]/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
                          title={`View Final Report for Batch ${team.batchNumber}`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Final Report</span>
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

      {/* Edit Student Details Modal */}
      {isEditModalOpen && editingStudent && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`✏️ Edit Student Details — ${editingStudent.name}`}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveStudentEdit} className="space-y-4 text-xs">
            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Registration Number *
                </label>
                <input
                  type="number"
                  required
                  value={editFormData.register_number ?? ''}
                  onChange={(e) => setEditFormData({ ...editFormData, register_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Roll Number *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.roll_number || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, roll_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Batch Number *
                </label>
                <input
                  type="number"
                  required
                  value={editFormData.batch_number ?? ''}
                  onChange={(e) => setEditFormData({ ...editFormData, batch_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.phone || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={editFormData.department || 'CSE'}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer"
                >
                  <option value="CSE">Computer Science & Engineering (CSE)</option>
                  <option value="ECE">Electronics & Communication (ECE)</option>
                  <option value="EEE">Electrical & Electronics (EEE)</option>
                  <option value="IT">Information Technology (IT)</option>
                  <option value="MECH">Mechanical Engineering (MECH)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Supervisor
                </label>
                <select
                  value={editFormData.mentor_roll_number || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, mentor_roll_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer"
                >
                  {mentors.map(m => (
                    <option key={m.id || m.mentor_roll_number} value={m.mentor_roll_number}>
                      {m.name} ({m.mentor_roll_number})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={editSaving}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#1E3FA6] hover:bg-blue-700 text-white shadow-md shadow-[#1E3FA6]/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {editSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="👨‍🎓 Register New Student"
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleAddStudent} className="space-y-4 text-xs">
            {addError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{addError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Student Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh K."
                  value={addFormData.name || ''}
                  onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Registration Number *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 4088"
                  value={addFormData.register_number ?? ''}
                  onChange={(e) => setAddFormData({ ...addFormData, register_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Roll Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 21CS099"
                  value={addFormData.roll_number || ''}
                  onChange={(e) => setAddFormData({ ...addFormData, roll_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Batch Number *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 35"
                  value={addFormData.batch_number ?? ''}
                  onChange={(e) => setAddFormData({ ...addFormData, batch_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="student@studypulse.edu"
                  value={addFormData.email || ''}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="9876543210"
                  value={addFormData.phone || ''}
                  onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Supervisor
                </label>
                <select
                  value={addFormData.mentor_roll_number || ''}
                  onChange={(e) => setAddFormData({ ...addFormData, mentor_roll_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer"
                >
                  {mentors.map(m => (
                    <option key={m.id || m.mentor_roll_number} value={m.mentor_roll_number}>
                      {m.name} ({m.mentor_roll_number})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={addSaving}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#1E3FA6] hover:bg-blue-700 text-white shadow-md shadow-[#1E3FA6]/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {addSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register Student</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Document Viewer Modal */}
      {viewDoc && (
        <Modal
          isOpen={!!viewDoc}
          onClose={() => setViewDoc(null)}
          title={`📄 ${viewDoc.title}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 mx-auto flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                {viewDoc.projectTitle}
              </h4>
              <p className="font-mono text-xs text-blue-600 dark:text-cyan-400 break-all">
                {viewDoc.url}
              </p>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Project Report Verified by Project Coordinator.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <a
                href={viewDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#1E3FA6] hover:bg-blue-700 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Document Viewer</span>
              </a>
              <button
                onClick={() => setViewDoc(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteConfirmed}
        title="Remove Student Record?"
        message={`Are you sure you want to remove ${deleteTarget?.name} from Batch ${deleteTarget?.batch}? Associated reviews and project records will be updated.`}
        confirmText="Confirm Delete"
      />

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
