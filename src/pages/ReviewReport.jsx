import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ExcelUploadModal from '../components/ExcelUploadModal.jsx';
import {
  FileCheck2,
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function ReviewReport() {
  const [students, setStudents] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [projects, setProjects] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [mentorFilter, setMentorFilter] = useState('ALL');

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [sRes, rRes, pRes, mRes] = await Promise.all([
        api.getStudents(),
        api.getReviews(),
        api.getProjects(),
        api.getMentors()
      ]);
      if (Array.isArray(sRes)) setStudents(sRes);
      if (Array.isArray(rRes)) setReviews(rRes);
      if (Array.isArray(pRes)) setProjects(pRes);
      if (Array.isArray(mRes)) setMentors(mRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    let csv = 'Batch,Project Title,Team Members,Mentor,Rev 1,Rev 2,Rev 3,Rev 4,Rev 5,Rev 6,Total Marks (Out of 10),Completion Status\n';
    
    groupedTeams.forEach(team => {
      const memberNames = team.students.map(s => `${s.name} (${s.register_number})`).join(' & ');
      const sRevs = reviews.filter(r => team.students.some(s => s.register_number === r.student_register_number));
      
      const getStatus = (num) => {
        const rev = sRevs.find(r => r.review_number === num);
        return rev ? rev.review_status : 'Pending';
      };

      const totalSum = sRevs.reduce((acc, r) => acc + (Number(r.mark) || Number(r.marks) || 0), 0);
      const totalPossible = Math.max(1, sRevs.length * 10);
      const scaled10 = Math.min(10, Math.max(0, (totalSum / totalPossible) * 10)).toFixed(1);

      const mentor = mentors.find(m => m.mentor_roll_number === team.mentor_roll_number)?.name || team.mentor_roll_number;

      csv += `"${team.batch_number}","${team.project_title}","${memberNames}","${mentor}","${getStatus(1)}","${getStatus(2)}","${getStatus(3)}","${getStatus(4)}","${getStatus(5)}","${getStatus(6)}","${scaled10} / 10","${team.project_status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'StudyPulse_Team_Review_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleProjectStatusChange = async (projectId, newStatus) => {
    try {
      const res = await api.updateProject(projectId, { project_status: newStatus });
      if (res.success) {
        setStatusMsg({ type: 'success', text: `Project completion status updated to "${newStatus}".` });
        fetchReportData();
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Failed to update project status.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Error saving status change.' });
    }
  };

  // Group Students into Teams by (Batch Number + Project Title)
  // Max 2 students per team
  const teamsMap = new Map();

  students.forEach(s => {
    const proj = projects.find(p => p.student1_register_number === s.register_number || p.student2_register_number === s.register_number);
    const projTitle = proj ? proj.project_title : 'Unassigned Project';
    const batchNum = s.batch_number || 35;
    const key = `${batchNum}_${projTitle.toLowerCase().trim()}`;

    if (!teamsMap.has(key)) {
      teamsMap.set(key, {
        id: proj ? proj.id : `team_${key}`,
        projectId: proj ? proj.id : null,
        batch_number: batchNum,
        project_title: projTitle,
        project_status: proj ? (proj.project_status || 'In Progress') : 'In Progress',
        mentor_roll_number: s.mentor_roll_number,
        students: []
      });
    }

    const teamObj = teamsMap.get(key);
    // Enforce max 2 students per team grouping
    if (teamObj.students.length < 2 && !teamObj.students.some(st => st.id === s.id)) {
      teamObj.students.push(s);
    }
  });

  const allTeams = Array.from(teamsMap.values());

  // Filter grouped teams
  const groupedTeams = allTeams.filter(team => {
    const q = searchQuery.toLowerCase();
    const titleMatch = team.project_title.toLowerCase().includes(q);
    const memberMatch = team.students.some(s =>
      s.name.toLowerCase().includes(q) || String(s.register_number).includes(q)
    );

    const matchesSearch = titleMatch || memberMatch;
    const matchesBatch = batchFilter === 'ALL' || String(team.batch_number) === batchFilter;
    const matchesMentor = mentorFilter === 'ALL' || team.students.some(s => s.mentor_roll_number === mentorFilter);

    return matchesSearch && matchesBatch && matchesMentor;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto space-y-4 overflow-hidden print:h-auto print:overflow-visible print:block">
      
      {/* STATIONARY TOP SECTION */}
      <div className="shrink-0 space-y-3 print:hidden">
        {/* Export Control Bar */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 glass-panel p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              <span>EXPORT CSV</span>
            </button>

            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>EXCEL DATA</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT REPORT</span>
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-between">
            <span>{statusMsg.text}</span>
            <button onClick={() => setStatusMsg(null)} className="text-xs">✕</button>
          </div>
        )}

        {/* Multi-Parameter Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 glass-panel p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team member, project title, reg no..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          <div>
            <select
              value={batchFilter || 'ALL'}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white cursor-pointer"
            >
              <option value="ALL">All Batches</option>
              <option value="35">Batch 35</option>
              <option value="36">Batch 36</option>
            </select>
          </div>

          <div>
            <select
              value={mentorFilter || 'ALL'}
              onChange={(e) => setMentorFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white cursor-pointer"
            >
              <option value="ALL">All Faculty Mentors</option>
              {mentors.map(m => (
                <option key={m.id} value={m.mentor_roll_number}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SCROLLABLE TEAM MATRIX TABLE */}
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xl print:shadow-none print:border-none flex flex-col min-h-0 print:block">
        <div className="overflow-x-auto overflow-y-auto flex-1 print:overflow-visible">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 font-display text-slate-700 dark:text-slate-300 uppercase tracking-wider font-bold sticky top-0 backdrop-blur z-10 print:static">
              <tr>
                <th className="px-3 py-3">Batch</th>
                <th className="px-3 py-3">Project Title</th>
                <th className="px-3 py-3">Team Members</th>
                <th className="px-3 py-3 text-center">Rev 1</th>
                <th className="px-3 py-3 text-center">Rev 2</th>
                <th className="px-3 py-3 text-center">Rev 3</th>
                <th className="px-3 py-3 text-center">Rev 4</th>
                <th className="px-3 py-3 text-center">Rev 5</th>
                <th className="px-3 py-3 text-center">Rev 6</th>
                <th className="px-3 py-3 text-center">Total Marks</th>
                <th className="px-3 py-3 text-center">Completion Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {groupedTeams.map(team => {
                const teamStudentRegs = team.students.map(s => s.register_number);
                const teamRevs = reviews.filter(r => teamStudentRegs.includes(r.student_register_number));
                
                const getRevStatus = (num) => {
                  const revsForNum = teamRevs.filter(r => r.review_number === num);
                  if (revsForNum.some(r => r.review_status === 'Completed')) return 'Completed';
                  if (revsForNum.some(r => r.review_status === 'Incomplete')) return 'Incomplete';
                  return 'Pending';
                };

                // Calculate total marks as sum of all 6 reviews (out of 60)
                let totalSum60 = 0;
                for (let num = 1; num <= 6; num++) {
                  const revsForNum = teamRevs.filter(r => r.review_number === num);
                  if (revsForNum.length > 0) {
                    const marksForNum = revsForNum.map(r => {
                      const val = (r.mark !== undefined && r.mark !== null && !isNaN(Number(r.mark)))
                        ? Number(r.mark)
                        : (Number(r.marks) || 0);
                      return Math.min(10, Math.max(0, val));
                    });
                    const avgForNum = marksForNum.reduce((a, b) => a + b, 0) / marksForNum.length;
                    totalSum60 += avgForNum;
                  }
                }

                const formattedTotalMark = Number.isInteger(totalSum60)
                  ? totalSum60
                  : totalSum60.toFixed(1);

                return (
                  <tr key={team.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-4 font-mono font-bold text-blue-600 dark:text-cyan-400">
                      B-{team.batch_number}
                    </td>

                    <td className="px-3 py-4 font-bold text-slate-900 dark:text-white text-xs max-w-xs break-words">
                      {team.project_title}
                    </td>

                    <td className="px-3 py-4">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                        {team.students.map(s => (
                          <span key={s.id} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium inline-block">
                            • {s.name} <span className="font-mono text-[10px] text-slate-400">({s.register_number})</span>
                          </span>
                        ))}
                      </div>
                    </td>

                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <td key={num} className="px-3 py-4 text-center">
                        <StatusBadge status={getRevStatus(num)} />
                      </td>
                    ))}

                    {/* Total Marks Obtained — Out of 60 Sum */}
                    <td className="px-3 py-4 text-center font-mono font-bold">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                        {formattedTotalMark} / 60
                      </span>
                    </td>

                    {/* Completion Column — Fully Editable Dropdown */}
                    <td className="px-3 py-4 text-center font-bold">
                      {team.projectId ? (
                        <select
                          value={team.project_status || 'Not Started'}
                          onChange={(e) => handleProjectStatusChange(team.projectId, e.target.value)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                            team.project_status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800'
                              : team.project_status === 'In Progress'
                              ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800'
                              : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <option value="Not Started">Not Started</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-normal">Pending Project</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Excel Upload / Download Modal */}
      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onRefresh={fetchReportData}
      />

    </div>
  );
}
