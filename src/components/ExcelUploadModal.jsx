import React, { useState } from 'react';
import Modal from './Modal.jsx';
import * as XLSX from 'xlsx';
import { api } from '../services/api.js';
import { FileSpreadsheet, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';

export default function ExcelUploadModal({ isOpen, onClose, onRefresh }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          setParsedData(data);
          setStatusMsg({ type: 'success', text: `Loaded ${data.length} records from Excel file.` });
        } catch (err) {
          setStatusMsg({ type: 'error', text: 'Failed to parse Excel file. Please upload a valid .xlsx or .xls file.' });
        }
      };
      reader.readAsBinaryString(selected);
    }
  };

  const handleImport = async () => {
    if (!parsedData.length) return;
    setLoading(true);
    let successCount = 0;

    for (const row of parsedData) {
      try {
        if (row['Student Name'] || row['Student']) {
          await api.createStudent({
            name: row['Student Name'] || row['Student'],
            roll_number: row['Roll No'] || row['Roll Number'] || '21CS999',
            register_number: parseInt(row['Reg No'] || row['Registration Number'] || Math.floor(1000 + Math.random() * 8000), 10),
            phone: String(row['Phone'] || '9876543210'),
            class: row['Class'] || 'A',
            year: row['Year'] || 'IV',
            department: row['Department'] || 'CSE',
            email: row['Email'] || 'student@college.edu',
            mentor_roll_number: row['Mentor Roll No'] || 'MNT-401',
            batch_number: parseInt(row['Batch'] || row['Batch Number'] || 35, 10)
          });
          successCount++;
        }
      } catch (err) {
        console.error('Row import failed:', err);
      }
    }

    setLoading(false);
    setStatusMsg({ type: 'success', text: `Successfully imported ${successCount} records into the system!` });
    if (onRefresh) onRefresh();
  };

  const handleExportAll = async () => {
    try {
      const students = await api.getStudents();
      const projects = await api.getProjects();
      const reviews = await api.getReviews();

      const wsStudents = XLSX.utils.json_to_sheet(students);
      const wsProjects = XLSX.utils.json_to_sheet(projects);
      const wsReviews = XLSX.utils.json_to_sheet(reviews);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsStudents, 'Students');
      XLSX.utils.book_append_sheet(wb, wsProjects, 'Projects');
      XLSX.utils.book_append_sheet(wb, wsReviews, 'Reviews');

      XLSX.writeFile(wb, `PSMS_Project_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📊 Excel Data Import & Export" maxWidth="max-w-xl">
      <div className="space-y-6">
        {/* Export Section */}
        <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Export Full Database</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Download Students, Projects, and Review data as an Excel workbook.</p>
          </div>
          <button
            onClick={handleExportAll}
            className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>

        {/* Upload Section */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-900 dark:text-white">
            Upload Excel File (.xlsx / .xls)
          </label>
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-950/50">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center gap-2">
              <FileSpreadsheet className="w-10 h-10 text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {file ? file.name : 'Click to select Excel file or drag and drop'}
              </span>
              <span className="text-[11px] text-slate-400">
                Supports columns: Batch, Student Name, Reg No, Roll No, Department, Email, Phone
              </span>
            </label>
          </div>
        </div>

        {statusMsg && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            Close
          </button>
          <button
            onClick={handleImport}
            disabled={!parsedData.length || loading}
            className="px-4 py-2 text-xs font-semibold royal-gradient hover:opacity-95 text-white rounded-lg transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            {loading ? 'Importing...' : 'Confirm Import'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
