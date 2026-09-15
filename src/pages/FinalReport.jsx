import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import {
  FileText,
  Printer,
  ArrowLeft,
  GraduationCap,
  FolderGit2,
  Users,
  Award,
  Calendar,
  Building,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

export default function FinalReport() {
  const { registerNumber, batchId } = useParams();
  const navigate = useNavigate();

  const [allStudents, setAllStudents] = useState([]);
  const [teamStudents, setTeamStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [project, setProject] = useState(null);
  const [mentor, setMentor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [registerNumber, batchId]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [sList, pList, mList, rList] = await Promise.all([
        api.getStudents(),
        api.getProjects(),
        api.getMentors(),
        api.getReviews()
      ]);

      setAllStudents(sList || []);

      // Extract unique batch numbers
      const batchNumbers = Array.from(new Set(sList.map(s => s.batch_number))).sort((a, b) => a - b);
      setAllBatches(batchNumbers);

      // Identify target batch from batchId or registerNumber
      const paramVal = batchId || registerNumber;
      let targetBatch = null;

      if (paramVal) {
        // First check if paramVal directly matches a batch_number
        const batchMatch = sList.find(s => String(s.batch_number) === String(paramVal));
        if (batchMatch) {
          targetBatch = batchMatch.batch_number;
        } else {
          // Check if paramVal matches a student's register_number
          const studentMatch = sList.find(s => String(s.register_number) === String(paramVal));
          if (studentMatch) {
            targetBatch = studentMatch.batch_number;
          }
        }
      }

      if (!targetBatch && sList.length > 0) {
        targetBatch = sList[0].batch_number;
      }

      if (targetBatch) {
        setSelectedBatch(targetBatch);
        loadBatchDetails(targetBatch, sList, pList, mList, rList);
      }
    } catch (err) {
      console.error('Failed to load final report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBatchDetails = (batch, sList, pList, mList, rList) => {
    const studentsInBatch = sList.filter(s => String(s.batch_number) === String(batch));
    setTeamStudents(studentsInBatch);

    const regNumbers = studentsInBatch.map(s => s.register_number);
    const foundProject = pList.find(p =>
      regNumbers.includes(p.student1_register_number) ||
      regNumbers.includes(p.student2_register_number)
    );
    setProject(foundProject);

    const mentorId = (foundProject && foundProject.mentor_roll_number) ||
      (studentsInBatch[0] && studentsInBatch[0].mentor_roll_number);
    const foundMentor = mList.find(m => m.mentor_roll_number === mentorId);
    setMentor(foundMentor);

    // Get reviews for all students in this batch
    const batchReviews = rList.filter(r => regNumbers.includes(r.student_register_number));
    setReviews(batchReviews);
  };

  const handleBatchChange = async (batch) => {
    setSelectedBatch(batch);
    try {
      const [sList, pList, mList, rList] = await Promise.all([
        api.getStudents(),
        api.getProjects(),
        api.getMentors(),
        api.getReviews()
      ]);
      loadBatchDetails(batch, sList, pList, mList, rList);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !teamStudents.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold text-sm">
        Loading Official Final Project Team Report...
      </div>
    );
  }

  // Calculate review completion
  const uniqueCompletedReviews = new Set(
    reviews.filter(r => r.review_status === 'Completed').map(r => r.review_number)
  );
  const completedCount = uniqueCompletedReviews.size;
  const completionPercentage = Math.round((completedCount / 6) * 100);

  // Average marks calculation across review stages
  const stageMarks = [1, 2, 3, 4, 5, 6].map(num => {
    const stageRevs = reviews.filter(r => r.review_number === num);
    if (!stageRevs.length) return 0;
    const total = stageRevs.reduce((acc, r) => acc + (Number(r.mark !== undefined ? r.mark : r.marks) || 0), 0);
    return total / stageRevs.length;
  });
  const overallAvgMark = (stageMarks.reduce((a, b) => a + b, 0) / 6).toFixed(1);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 print:p-0">
      
      {/* Non-printable Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 print:hidden shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Batch Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Select Batch:</span>
            <select
              value={selectedBatch || ''}
              onChange={(e) => handleBatchChange(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer shadow-xs"
            >
              {allBatches.map(b => (
                <option key={b} value={b}>Batch {b}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-bold royal-gradient text-white rounded-xl shadow-md hover:opacity-95 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>PRINT OFFICIAL REPORT</span>
          </button>
        </div>
      </div>

      {/* Official Printable Document Frame */}
      <div className="glass-panel p-8 sm:p-12 rounded-3xl bg-white text-slate-900 border border-slate-200/80 shadow-2xl print:shadow-none print:border-none print:p-0 space-y-8">
        
        {/* Document Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
              Final Project Team Evaluation Report
            </span>
            <p className="text-[11px] text-slate-500">Academic Year 2025–2026 • Final Assessment</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              Batch {selectedBatch}
            </span>
            <p className="text-[10px] font-mono text-slate-400 mt-1">
              Doc ID: REPORT-BATCH-{selectedBatch}-2026
            </p>
          </div>
        </div>

        {/* Section 1: Team & Academic Profile (All Team Members) */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold font-display uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-1 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            I. Team Members & Academic Profiles
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamStudents.map((student, idx) => (
              <div
                key={student.id || student.register_number}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono font-bold text-[10px]">
                      Team Member {idx + 1}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">{student.name}</h3>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    Reg: {student.register_number}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Roll Number:</span>
                    <strong className="text-slate-800 font-mono">{student.roll_number}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Department:</span>
                    <strong className="text-slate-800">{student.department || 'CSE'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Class & Year:</span>
                    <strong className="text-slate-800">Class {student.class || 'A'}, Year {student.year || 'IV'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Batch Number:</span>
                    <strong className="text-slate-800 font-mono">Batch {student.batch_number}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Email:</span>
                    <span className="text-slate-700 font-medium">{student.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Phone:</span>
                    <span className="text-slate-700 font-medium">{student.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Mentor Assigned:</span>
                    <span className="text-slate-700 font-medium">{mentor ? mentor.name : (student.mentor_roll_number || 'N/A')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Project Specifications */}
        {project && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-1 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-blue-600" />
              II. Project Title & Publication Milestones
            </h2>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">{project.project_title}</h3>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  project.project_status === 'Completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {project.project_status}
                </span>
              </div>

              <p className="text-slate-600 leading-relaxed">{project.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <p className="font-bold text-slate-700">Technology Stack:</p>
                  <p className="font-mono text-slate-900">{project.tech_stack}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-700">Publication Status:</p>
                  <p className="font-semibold text-indigo-700">{project.publication_status}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Reviews 1 through 6 Matrix */}
        <div className="space-y-4 royal-gradient p-6 rounded-2xl text-white shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/20 pb-3 gap-2">
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-200" />
              III. Reviews 1–6 Evaluation Matrix
            </h2>
            <span className="text-xs font-bold text-white bg-white/20 px-3 py-1 rounded-full border border-white/30 backdrop-blur-md">
              Average Score: <strong className="text-yellow-300 font-mono text-sm">{overallAvgMark} / 10</strong> ({completionPercentage}% Complete)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-white/20 rounded-xl overflow-hidden">
              <thead className="bg-black/20 font-bold uppercase text-white border-b border-white/20">
                <tr>
                  <th className="p-3 border-r border-white/20 text-white">Review Stage</th>
                  <th className="p-3 border-r border-white/20 text-white">Evaluation Date</th>
                  <th className="p-3 border-r border-white/20 text-white">Status</th>
                  <th className="p-3 border-r border-white/20 text-center text-white">Score (/10)</th>
                  <th className="p-3 text-white">Faculty Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white">
                {[1, 2, 3, 4, 5, 6].map(num => {
                  const stageRevs = reviews.filter(rev => rev.review_number === num);
                  const firstRev = stageRevs[0];
                  const status = stageRevs.some(r => r.review_status === 'Completed') ? 'Completed' : (firstRev ? firstRev.review_status : 'Pending');
                  
                  const avgMark = stageRevs.length > 0
                    ? (stageRevs.reduce((acc, r) => acc + (Number(r.mark !== undefined ? r.mark : r.marks) || 0), 0) / stageRevs.length).toFixed(1)
                    : '0';

                  const comments = stageRevs.map(r => r.comments || r.remarks).filter(Boolean).join(' | ') || (firstRev ? 'Satisfactory' : 'Not Conducted');

                  return (
                    <tr key={num} className="bg-white/5 hover:bg-white/10 transition-colors">
                      <td className="p-3 font-bold border-r border-white/20 text-white">
                        Review {num}
                      </td>
                      <td className="p-3 font-mono border-r border-white/20 text-slate-100">
                        {firstRev ? firstRev.date : '—'}
                      </td>
                      <td className="p-3 border-r border-white/20 text-white">
                        <StatusBadge status={status} />
                      </td>
                      <td className="p-3 font-mono font-bold text-center border-r border-white/20 text-yellow-300 text-sm">
                        {avgMark} / 10
                      </td>
                      <td className="p-3 text-slate-100">
                        {comments}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Academic Signatures */}
        <div className="pt-12 grid grid-cols-3 gap-8 text-center text-xs">
          <div className="border-t border-slate-400 pt-2 space-y-1">
            <p className="font-bold text-slate-900">Project Coordinator</p>
            <p className="text-[10px] text-slate-400 font-mono">Sign & Stamp</p>
          </div>
          <div className="border-t border-slate-400 pt-2 space-y-1">
            <p className="font-bold text-slate-900">Department HOD</p>
            <p className="text-[10px] text-slate-400 font-mono">Sign & Stamp</p>
          </div>
          <div className="border-t border-slate-400 pt-2 space-y-1">
            <p className="font-bold text-slate-900">Principal / Director</p>
            <p className="text-[10px] text-slate-400 font-mono">Sign & Stamp</p>
          </div>
        </div>

      </div>

    </div>
  );
}
