import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import {
  FolderGit2,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  Award,
  Layers,
  FileCheck,
  BookOpen,
  Eye,
  Trash2
} from 'lucide-react';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProjectDetails, setSelectedProjectDetails] = useState(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [formData, setFormData] = useState({
    project_title: '',
    description: '',
    objective: '',
    tech_stack: '',
    batch_number: 35,
    mentor_roll_number: 'MNT-401',
    student1_register_number: 4065,
    student2_register_number: 4099,
    project_status: 'In Progress',
    publication_status: 'Submitted',
    external_event_submitted: false,
    accepted_project: false,
    external_demo_or_paper: false,
    published: false,
    patent_granted: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, mRes, sRes] = await Promise.all([
        api.getProjects(),
        api.getMentors(),
        api.getStudents()
      ]);
      if (Array.isArray(pRes)) setProjects(pRes);
      if (Array.isArray(mRes)) setMentors(mRes);
      if (Array.isArray(sRes)) setStudents(sRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [statusMsg, setStatusMsg] = useState(null);

  const handleOpenAdd = () => {
    setEditingProject(null);
    setStatusMsg(null);
    setFormData({
      project_title: '',
      description: '',
      objective: '',
      tech_stack: 'React, Express, MongoDB, Gemini AI',
      batch_number: 35,
      mentor_roll_number: mentors[0]?.mentor_roll_number || 'MNT-401',
      student1_register_number: students[0]?.register_number || 4065,
      student2_register_number: students[1]?.register_number || 4099,
      project_status: 'In Progress',
      publication_status: 'Submitted',
      external_event_submitted: false,
      accepted_project: false,
      external_demo_or_paper: false,
      published: false,
      patent_granted: false
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (proj) => {
    setEditingProject(proj);
    setStatusMsg(null);
    setFormData({
      ...proj,
      batch_number: proj.batch_number ?? '',
      mentor_roll_number: proj.mentor_roll_number || 'MNT-401',
      student1_register_number: proj.student1_register_number ?? '',
      student2_register_number: proj.student2_register_number ?? '',
      project_title: proj.project_title || '',
      description: proj.description || '',
      objective: proj.objective || '',
      tech_stack: proj.tech_stack || '',
      project_status: proj.project_status || 'In Progress',
      publication_status: proj.publication_status || 'Submitted',
    });
    setIsAddModalOpen(true);
  };

  const handleInlineStatusChange = async (projId, field, newValue) => {
    try {
      const proj = projects.find(p => p.id === projId);
      if (!proj) return;
      const updated = { ...proj, [field]: newValue };
      setProjects(prev => prev.map(p => p.id === projId ? updated : p));
      await api.updateProject(projId, { [field]: newValue });
    } catch (err) {
      console.error('Failed inline status update:', err);
      fetchData();
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg(null);

    // Frontend Batch Uniqueness Check
    const enteredBatchStr = String(formData.batch_number || '').trim();
    if (!enteredBatchStr) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid Batch Number.' });
      return;
    }

    const duplicateBatchProj = projects.find(p =>
      p.id !== (editingProject ? editingProject.id : null) &&
      String(p.batch_number).trim().toLowerCase() === enteredBatchStr.toLowerCase()
    );

    if (duplicateBatchProj) {
      const errorText = `Batch number ${formData.batch_number} already exists. Please use a unique batch number.`;
      setStatusMsg({ type: 'error', text: errorText });
      return;
    }

    try {
      let res;
      if (editingProject) {
        res = await api.updateProject(editingProject.id, formData);
      } else {
        res = await api.createProject(formData);
      }

      if (res && res.error) {
        setStatusMsg({ type: 'error', text: res.error });
        return;
      }

      setIsAddModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'An unexpected error occurred while saving the project.' });
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return;
    try {
      setProjects(prev => prev.filter(p => p.id !== deleteTargetId));
      setIsConfirmOpen(false);
      await api.deleteProject(deleteTargetId);
      fetchData();
    } catch (err) {
      console.error('Delete project failed:', err);
      fetchData();
    }
  };

  // Filtered projects
  const filteredProjects = projects.filter(p => {
    const q = searchQuery.toLowerCase();
    const titleMatch = p.project_title.toLowerCase().includes(q);
    const s1 = students.find(s => s.register_number === p.student1_register_number);
    const s2 = students.find(s => s.register_number === p.student2_register_number);
    const sMatch = (s1 && s1.name.toLowerCase().includes(q)) || (s2 && s2.name.toLowerCase().includes(q));
    const regMatch = String(p.student1_register_number).includes(q) || String(p.student2_register_number).includes(q);

    const matchesSearch = titleMatch || sMatch || regMatch;
    const matchesStatus = statusFilter === 'ALL' || p.project_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto space-y-4 overflow-hidden">
      
      {/* STATIONARY TOP SECTION */}
      <div className="shrink-0">
        {/* Filter, Search and Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search project / student / registration no..."
              className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 shrink-0">Filter Status:</span>
            <select
              value={statusFilter || 'ALL'}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer"
            >
              <option value="ALL">All Projects Status</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 text-xs font-bold royal-gradient text-white border border-blue-500 rounded-xl shadow-md shadow-blue-600/20 hover:border-blue-400 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ ADD PROJECT</span>
            </button>
          </div>
        </div>
      </div>

      {/* SCROLLABLE PROJECTS TABLE AREA */}
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left min-w-[900px] border-collapse">
            <thead className="bg-slate-100/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-800 font-display text-slate-800 dark:text-slate-200 uppercase tracking-wider font-bold text-xs sticky top-0 backdrop-blur z-10">
              <tr>
                <th className="px-4 py-3.5 w-24">Batch</th>
                <th className="px-4 py-3.5 min-w-[200px]">Students & Reg Nos</th>
                <th className="px-4 py-3.5 min-w-[220px]">Project Title</th>
                <th className="px-4 py-3.5 min-w-[130px]">Project Status</th>
                <th className="px-4 py-3.5 min-w-[140px]">Publication Status</th>
                <th className="px-4 py-3.5 min-w-[140px]">Supervisor</th>
                <th className="px-4 py-3.5 text-right min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white/70 dark:bg-slate-900/60">
              {filteredProjects.map(proj => {
                const s1 = students.find(s => s.register_number === proj.student1_register_number);
                const s2 = students.find(s => s.register_number === proj.student2_register_number);
                const mentor = mentors.find(m => m.mentor_roll_number === proj.mentor_roll_number);

                return (
                  <tr
                    key={proj.id}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Batch */}
                    <td className="px-4 py-4 align-top font-mono font-bold text-blue-600 dark:text-cyan-400 text-xs">
                      Batch {proj.batch_number}
                    </td>

                    {/* Students & Reg Nos */}
                    <td className="px-4 py-4 align-top">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 dark:text-white text-xs">
                          {s1 ? s1.name : 'Student 1'} <span className="text-[11px] text-slate-400 font-mono">({proj.student1_register_number})</span>
                        </p>
                        {proj.student2_register_number > 0 ? (
                          <p className="font-bold text-slate-900 dark:text-white text-xs">
                            {s2 ? s2.name : 'Student 2'} <span className="text-[11px] text-slate-400 font-mono">({proj.student2_register_number})</span>
                          </p>
                        ) : (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                            + Slot Available (1 student)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Project Title */}
                    <td className="px-4 py-4 align-top">
                      <button
                        onClick={() => setSelectedProjectDetails(proj)}
                        className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-cyan-400 text-left text-sm leading-snug line-clamp-2 transition-colors cursor-pointer block"
                      >
                        {proj.project_title}
                      </button>
                      <span className="text-xs text-slate-400 mt-1 block">
                        {proj.tech_stack || 'Standard Stack'}
                      </span>
                    </td>

                    {/* Project Status */}
                    <td className="px-4 py-4 align-top">
                      <select
                        value={proj.project_status || 'In Progress'}
                        onChange={(e) => handleInlineStatusChange(proj.id, 'project_status', e.target.value)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                          proj.project_status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                            : proj.project_status === 'In Progress'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>

                    {/* Publication Status */}
                    <td className="px-4 py-4 align-top">
                      <select
                        value={proj.publication_status || 'Submitted'}
                        onChange={(e) => handleInlineStatusChange(proj.id, 'publication_status', e.target.value)}
                        className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Published">Published</option>
                        <option value="Patent Filed">Patent Filed</option>
                        <option value="Patent Granted">Patent Granted</option>
                      </select>
                    </td>

                    {/* Supervisor / Mentor */}
                    <td className="px-4 py-4 align-top font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{mentor ? mentor.name : proj.mentor_roll_number}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{proj.mentor_roll_number}</p>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 align-top text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedProjectDetails(proj)}
                          className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(proj)}
                          className="px-3 py-1.5 text-xs font-bold royal-gradient text-white rounded-lg shadow-sm hover:opacity-95 flex items-center gap-1 cursor-pointer transition-all"
                          title="Edit Project"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTargetId(proj.id);
                            setIsConfirmOpen(true);
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Project Form Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingProject ? '✏ Edit Project Information' : '+ Add New Final Year Project'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {statusMsg && (
            <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300'
            }`}>
              <span>{statusMsg.text}</span>
              <button type="button" onClick={() => setStatusMsg(null)} className="text-xs font-bold cursor-pointer opacity-70 hover:opacity-100">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Batch Number (Unique)</label>
              <input
                type="text"
                required
                value={formData.batch_number ?? ''}
                onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                placeholder="e.g. B001 or 35"
                className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Mentor</label>
              <select
                value={formData.mentor_roll_number || ''}
                onChange={(e) => setFormData({ ...formData, mentor_roll_number: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
              >
                {mentors.map(m => (
                  <option key={m.id} value={m.mentor_roll_number}>
                    {m.name} ({m.mentor_roll_number})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Student 1 Registration No.</label>
              <input
                type="number"
                required
                value={formData.student1_register_number ?? ''}
                onChange={(e) => setFormData({ ...formData, student1_register_number: parseInt(e.target.value, 10) || '' })}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Student 2 Registration No.</label>
              <input
                type="number"
                value={formData.student2_register_number ?? ''}
                onChange={(e) => setFormData({ ...formData, student2_register_number: parseInt(e.target.value, 10) || '' })}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Project Title</label>
            <input
              type="text"
              required
              value={formData.project_title || ''}
              onChange={(e) => setFormData({ ...formData, project_title: e.target.value })}
              placeholder="GrowOn — AI Agricultural Soil Health Analyzer"
              className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Project Description</label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief overview of project methodology and architecture..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Objective & Tech Stack</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Objective..."
                value={formData.objective || ''}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white"
              />
              <input
                type="text"
                placeholder="Tech Stack (React, Node, Python...)"
                value={formData.tech_stack || ''}
                onChange={(e) => setFormData({ ...formData, tech_stack: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white"
              />
            </div>
          </div>

          {/* Status Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Project Status</label>
              <select
                value={formData.project_status || 'In Progress'}
                onChange={(e) => setFormData({ ...formData, project_status: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Publication Status</label>
              <select
                value={formData.publication_status || 'Submitted'}
                onChange={(e) => setFormData({ ...formData, publication_status: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
              >
                <option value="Not Started">Not Started</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Accepted">Accepted</option>
                <option value="Published">Published</option>
                <option value="Patent Filed">Patent Filed</option>
                <option value="Patent Granted">Patent Granted</option>
              </select>
            </div>
          </div>

          {/* Project Milestones Checkboxes */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <p className="text-xs font-bold text-slate-900 dark:text-white mb-2">Project Milestones Checklist:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.external_event_submitted}
                  onChange={(e) => setFormData({ ...formData, external_event_submitted: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>1. Project Submitted to External Events</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.accepted_project}
                  onChange={(e) => setFormData({ ...formData, accepted_project: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>2. Accepted Project</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.external_demo_or_paper}
                  onChange={(e) => setFormData({ ...formData, external_demo_or_paper: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>3. External Demo / Peer-Reviewed Paper</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>4. Published Paper</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.patent_granted}
                  onChange={(e) => setFormData({ ...formData, patent_granted: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>5. Granted Patent</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold royal-gradient text-white rounded-lg hover:opacity-95 shadow-md shadow-blue-600/20"
            >
              SAVE PROJECT
            </button>
          </div>
        </form>
      </Modal>

      {/* Project Details Modal View */}
      {selectedProjectDetails && (
        <Modal
          isOpen={!!selectedProjectDetails}
          onClose={() => setSelectedProjectDetails(null)}
          title={`📌 Project Details — ${selectedProjectDetails.project_title}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-indigo-950/40 border border-blue-200 dark:border-indigo-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-600 dark:text-cyan-400">Batch Number: {selectedProjectDetails.batch_number}</span>
                <StatusBadge status={selectedProjectDetails.project_status} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedProjectDetails.project_title}
              </h3>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-900 dark:text-white">Description:</p>
              <p className="text-slate-600 dark:text-slate-300">{selectedProjectDetails.description || 'No description provided.'}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Objective:</p>
                <p className="text-slate-600 dark:text-slate-300">{selectedProjectDetails.objective || 'N/A'}</p>
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Technology Stack:</p>
                <p className="text-slate-600 dark:text-slate-300 font-mono">{selectedProjectDetails.tech_stack || 'N/A'}</p>
              </div>
            </div>

            {/* Milestones status list */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="font-bold text-slate-900 dark:text-white">Milestones Progress:</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>1. Submitted to External Events</span>
                  {selectedProjectDetails.external_event_submitted ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex items-center justify-between">
                  <span>2. Accepted Project</span>
                  {selectedProjectDetails.accepted_project ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex items-center justify-between">
                  <span>3. External Demo / Peer-Reviewed Paper</span>
                  {selectedProjectDetails.external_demo_or_paper ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex items-center justify-between">
                  <span>4. Published</span>
                  {selectedProjectDetails.published ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex items-center justify-between">
                  <span>5. Granted Patent</span>
                  {selectedProjectDetails.patent_granted ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedProjectDetails(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteConfirmed}
        title="Delete Project?"
        message="Are you sure you want to delete this project record from the database?"
        confirmText="Delete"
        variant="danger"
      />

    </div>
  );
}
