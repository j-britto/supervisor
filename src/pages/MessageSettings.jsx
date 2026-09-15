import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Modal from '../components/Modal.jsx';
import {
  MessageSquareCode,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Copy,
  Sparkles,
  Mail,
  Send,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';

export default function MessageSettings() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [formType, setFormType] = useState('student');
  const [formTitle, setFormTitle] = useState('');
  const [formTemplate, setFormTemplate] = useState('');

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Test Email System State
  const [testTo, setTestTo] = useState('joelbritto350@gmail.com');
  const [testSubject, setTestSubject] = useState('StudyPulse AI — Project Review Notification');
  const [testMessage, setTestMessage] = useState(
    'Dear Student,\nYour Review 3 for project "StudyPulse AI — Project Supervision System" status is Completed.\nSupervisor: Prof. Rajesh Kumar\nTotal Progress: 85%.\nKeep up the great work!'
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // { type: 'success' | 'error', message: string, messageId?: string }
  const [smtpStatus, setSmtpStatus] = useState({ checking: false, ready: false, message: '' });

  useEffect(() => {
    fetchTemplates();
    checkSmtpConnection();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await api.getMessageTemplates();
      if (Array.isArray(data)) setTemplates(data);
    } catch (err) {
      console.error('Failed to load message templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkSmtpConnection = async () => {
    setSmtpStatus(prev => ({ ...prev, checking: true }));
    try {
      const res = await api.getEmailStatus();
      setSmtpStatus({
        checking: false,
        ready: Boolean(res && res.success),
        message: res ? res.message : 'Unknown status'
      });
    } catch (err) {
      setSmtpStatus({
        checking: false,
        ready: false,
        message: err.message || 'Could not verify SMTP transporter'
      });
    }
  };

  const handleOpenAddModal = () => {
    setEditingTemplate(null);
    setFormType('student');
    setFormTitle('');
    setFormTemplate('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tpl) => {
    setEditingTemplate(tpl);
    setFormType(tpl.type);
    setFormTitle(tpl.title);
    setFormTemplate(tpl.template);
    setIsModalOpen(true);
  };

  const handleUseTemplateInTest = (tpl) => {
    setTestSubject(`StudyPulse AI — ${tpl.title}`);
    // Populate sample student data in template
    const samplePopulated = tpl.template
      .replace(/{{studentName}}/g, 'Govind M.')
      .replace(/{{mentorName}}/g, 'Dr. Vasanthi R.')
      .replace(/{{supervisorName}}/g, 'Dr. Vasanthi R.')
      .replace(/{{reviewNumber}}/g, '4')
      .replace(/{{reviewStatus}}/g, 'Completed')
      .replace(/{{projectTitle}}/g, 'GrowOn — AI Agricultural Soil Health Analyzer')
      .replace(/{{date}}/g, new Date().toISOString().split('T')[0])
      .replace(/{{completionPercentage}}/g, '85')
      .replace(/{{batchNumber}}/g, '35')
      .replace(/{{studentList}}/g, 'Govind M. (4065), Joel Britto (4099)');
    setTestMessage(samplePopulated);
    setTestStatus(null);
  };

  const handleConfirmSave = async () => {
    try {
      if (editingTemplate) {
        await api.updateMessageTemplate(editingTemplate.id, {
          type: formType,
          title: formTitle,
          template: formTemplate
        });
        setStatusMsg({ type: 'success', text: 'Message template updated successfully.' });
      } else {
        await api.createMessageTemplate({
          type: formType,
          title: formTitle,
          template: formTemplate
        });
        setStatusMsg({ type: 'success', text: 'New message template created.' });
      }
      setIsModalOpen(false);
      fetchTemplates();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to save message template.' });
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return;
    try {
      await api.deleteMessageTemplate(deleteTargetId);
      setStatusMsg({ type: 'success', text: 'Template deleted.' });
      fetchTemplates();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to delete template.' });
    }
  };

  // Real Email Dispatch Test Handler
  const handleSendTestEmail = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // 18. PREVENT DUPLICATE EMAIL SENDS: If already sending, reject immediately
    if (isSendingTest) {
      return;
    }

    // Step 1: Validate Email on frontend
    const trimmedTo = (testTo || '').trim();
    if (!trimmedTo) {
      setTestStatus({
        type: 'error',
        message: 'Recipient email address is required.'
      });
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedTo)) {
      setTestStatus({
        type: 'error',
        message: 'Invalid email address. Please enter a valid recipient address (e.g., student@domain.edu).'
      });
      return;
    }

    if (!testSubject.trim()) {
      setTestStatus({
        type: 'error',
        message: 'Email subject is required.'
      });
      return;
    }

    if (!testMessage.trim()) {
      setTestStatus({
        type: 'error',
        message: 'Message content is required.'
      });
      return;
    }

    // Step 2: Set sending state & disable button
    setIsSendingTest(true);
    setTestStatus(null);

    try {
      // Step 3 & 4: Call backend and wait for real Nodemailer response
      const response = await api.sendEmail({
        to: trimmedTo,
        subject: testSubject.trim(),
        text: testMessage.trim()
      });

      // Step 5: Show verified success message
      setTestStatus({
        type: 'success',
        message: 'Email sent successfully via Nodemailer SMTP.',
        messageId: response.messageId
      });
    } catch (error) {
      // Step 6: Show real error message
      setTestStatus({
        type: 'error',
        message: error.message || 'Failed to send email. Please check SMTP credentials.'
      });
    } finally {
      // Step 7: Re-enable Send button
      setIsSendingTest(false);
    }
  };

  const insertPlaceholder = (ph) => {
    setFormTemplate(prev => prev + ` ${ph} `);
  };

  const availablePlaceholders = [
    '{{studentName}}',
    '{{reviewNumber}}',
    '{{reviewStatus}}',
    '{{projectTitle}}',
    '{{supervisorName}}',
    '{{mentorName}}',
    '{{date}}',
    '{{completionPercentage}}',
    '{{projectStatus}}',
    '{{batchNumber}}'
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
            Automated Message Settings &amp; Email Gateway
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={checkSmtpConnection}
            disabled={smtpStatus.checking}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Check SMTP Transporter Connection"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${smtpStatus.checking ? 'animate-spin text-blue-600' : ''}`} />
            <span>Check SMTP</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 text-xs font-bold royal-gradient text-white rounded-xl shadow-md hover:opacity-95 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Template</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 border ${
          statusMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* SMTP Server Live Status Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
        smtpStatus.ready
          ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
          : 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${
            smtpStatus.ready
              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
          }`}>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold">Nodemailer SMTP Transporter:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                smtpStatus.ready
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
              }`}>
                {smtpStatus.ready ? 'Connected & Ready' : (smtpStatus.checking ? 'Checking...' : 'Pending Verification')}
              </span>
            </div>
            <p className="text-[11px] opacity-80 mt-0.5">
              {smtpStatus.message || 'Transporter configured with Gmail SMTP engine & App Password authentication.'}
            </p>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 self-start sm:self-center">
          Backend: Express /api/email/send
        </div>
      </div>

      {/* Real Test Email Dispatcher Card (Requirement 11) */}
      <div className="glass-panel p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
                Live Test Email Dispatcher
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dispatches an authentic email through Node.js, Express, and Nodemailer directly to the recipient inbox.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Real SMTP Sending
          </span>
        </div>

        {/* Feedback alert for Test Email */}
        {testStatus && (
          <div className={`p-4 rounded-xl text-xs font-semibold flex items-start gap-3 border transition-all ${
            testStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
          }`}>
            {testStatus.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold">{testStatus.message}</p>
              {testStatus.messageId && (
                <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 opacity-90">
                  Message ID: {testStatus.messageId}
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSendTestEmail} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Recipient Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={testTo || ''}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="recipient@example.com"
                disabled={isSendingTest}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-60"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Sends a live StudyPulse AI branded email to this inbox.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={testSubject || ''}
                onChange={(e) => setTestSubject(e.target.value)}
                placeholder="StudyPulse AI — Project Supervision Update"
                disabled={isSendingTest}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Message Content <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Formatted with StudyPulse AI HTML template</span>
            </div>
            <textarea
              rows={4}
              required
              value={testMessage || ''}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Enter message body..."
              disabled={isSendingTest}
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white leading-relaxed disabled:opacity-60"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Authenticates server-side via Gmail App Password. Credentials never exposed to client.</span>
            </div>

            <button
              type="submit"
              disabled={isSendingTest}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                isSendingTest
                  ? 'bg-slate-400 cursor-not-allowed opacity-80'
                  : 'royal-gradient hover:opacity-95 shadow-blue-600/20 active:scale-95'
              }`}
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Test Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Templates Section Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
            Configured Notification Templates
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Templates automatically sent to students and mentors upon review milestones.
          </p>
        </div>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map(tpl => (
          <div key={tpl.id} className="glass-panel p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 space-y-4 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  tpl.type === 'student'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300'
                }`}>
                  {tpl.type === 'student' ? 'Student Template' : 'Mentor Template'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUseTemplateInTest(tpl)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                    title="Load into Test Email Dispatcher"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(tpl)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Template"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTargetId(tpl.id);
                      setIsConfirmOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
                {tpl.title}
              </h3>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-200/60 dark:border-slate-800">
                {tpl.template}
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>Status: <strong className="text-emerald-600 dark:text-emerald-400">Active</strong></span>
              <button
                onClick={() => handleUseTemplateInTest(tpl)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>Test this template</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? 'Edit Message Template' : 'Add New Message Template'}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Recipient Category
            </label>
            <select
              value={formType || 'student'}
              onChange={(e) => setFormType(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="student">Student Message Template</option>
              <option value="mentor">Mentor Message Template</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Template Title
            </label>
            <input
              type="text"
              value={formTitle || ''}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Student Review Completion Notice"
              className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Dynamic Message Body &amp; Placeholders
            </label>
            <textarea
              rows={5}
              value={formTemplate || ''}
              onChange={(e) => setFormTemplate(e.target.value)}
              placeholder="Your Review {{reviewNumber}} for {{projectTitle}} is {{reviewStatus}}..."
              className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            ></textarea>
          </div>

          {/* Placeholders Quick Insert */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Click placeholder to insert into template:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availablePlaceholders.map(ph => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => insertPlaceholder(ph)}
                  className="px-2 py-0.5 text-[10px] font-mono bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded cursor-pointer transition-colors"
                >
                  {ph}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSave}
              className="px-5 py-2 text-xs font-bold royal-gradient text-white rounded-lg hover:opacity-95 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              SAVE MESSAGE
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteConfirmed}
        title="Delete Message Template?"
        message="Are you sure you want to delete this automated message template?"
        confirmText="Delete"
        variant="danger"
      />

    </div>
  );
}
