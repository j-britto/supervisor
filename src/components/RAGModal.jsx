import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal.jsx';
import { api } from '../services/api.js';
import { Sparkles, Send, Bot, User, Database, Loader2, Download, FileText } from 'lucide-react';

export default function RAGModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your StudyPulse RAG AI Assistant. Ask me anything about student reviews, project completion, publication statuses, or mentor workloads across your database.',
      source: 'PSMS Intelligent RAG Engine'
    }
  ]);

  const messagesEndRef = useRef(null);

  const quickQuestions = [
    'Which students have not completed Review 4?',
    'Show all projects below 50% completion.',
    'Which projects have been published?',
    'Export Batch 35 project information.'
  ];

  // Auto scroll to bottom of chat history
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, loading, isOpen]);

  const handleSend = async (textToSend) => {
    const q = textToSend || query;
    if (!q.trim() || loading) return;

    const userMsg = { sender: 'user', text: q };
    setChatHistory(prev => [...prev, userMsg]);
    if (!textToSend) setQuery('');
    setLoading(true);

    try {
      const res = await api.queryRAG(q);
      const aiMsg = {
        sender: 'ai',
        text: res.answer || 'No response generated.',
        source: res.source || 'StudyPulse Database',
        exportFile: res.exportFile || null
      };
      setChatHistory(prev => [...prev, aiMsg]);
    } catch (err) {
      setChatHistory(prev => [...prev, {
        sender: 'ai',
        text: 'An error occurred while querying the RAG system: ' + err.message,
        source: 'System Error'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (fileObj) => {
    if (!fileObj) return;
    const blob = new Blob([fileObj.content], { type: fileObj.type || 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileObj.filename || 'StudyPulse_Export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderFormattedMessage = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    const elements = [];
    let tableRows = [];
    let inTable = false;

    const flushTable = (key) => {
      if (tableRows.length === 0) return;
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(1).filter(r => !r.every(cell => cell.match(/^[-:]+$/)));

      elements.push(
        <div key={`table-${key}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm max-w-full">
          <table className="w-full text-left border-collapse text-xs">
            {headerRow && (
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider">
                <tr>
                  {headerRow.map((cell, i) => (
                    <th key={i} className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-700 font-bold whitespace-nowrap">{cell.trim()}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap">{cell.trim()}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        const cells = trimmed.slice(1, -1).split('|');
        tableRows.push(cells);
      } else {
        if (inTable) {
          flushTable(idx);
          inTable = false;
        }
        if (trimmed === '') {
          elements.push(<div key={idx} className="h-1.5" />);
        } else if (trimmed.startsWith('#') || trimmed.startsWith('•') || trimmed.startsWith('-')) {
          const cleanText = trimmed.replace(/^[#•\-\*]+\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1');
          elements.push(
            <div key={idx} className="flex items-start gap-2 my-1">
              <span className="text-blue-600 dark:text-cyan-400 font-bold mt-0.5">•</span>
              <span className="leading-relaxed">{cleanText}</span>
            </div>
          );
        } else {
          const cleaned = trimmed.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
          elements.push(
            <p key={idx} className="my-1 leading-relaxed">{cleaned}</p>
          );
        }
      }
    });

    if (inTable) {
      flushTable('end');
    }

    return <div className="space-y-1 text-xs sm:text-sm">{elements}</div>;
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="🤖 StudyPulse AI RAG Assistant" 
      maxWidth="max-w-3xl"
      bodyClassName="p-4 sm:p-5 flex flex-col flex-1 min-h-0 overflow-hidden text-slate-700 dark:text-slate-300"
    >
      <div className="flex flex-col h-[65vh] sm:h-[520px] min-h-0 overflow-hidden">
        {/* Scrollable Chat History */}
        <div className="flex-1 overflow-y-auto space-y-4 p-2 pr-3 scrollbar-thin min-h-0">
          {chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              }`}>
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 rounded-tl-none'
              }`}>
                {renderFormattedMessage(msg.text)}

                {msg.exportFile && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>{msg.exportFile.filename}</span>
                    </div>
                    <button
                      onClick={() => downloadFile(msg.exportFile)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Export</span>
                    </button>
                  </div>
                )}

                {msg.source && (
                  <div className="mt-2 text-[10px] opacity-75 flex items-center gap-1 border-t border-slate-200/40 dark:border-slate-700/40 pt-1.5">
                    <Database className="w-3 h-3" />
                    <span>Source: {msg.source}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span>Querying database context & generating structured response...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Stationary Quick Suggestion Pills */}
        <div className="shrink-0 pt-3 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          {quickQuestions.map((qq, i) => (
            <button
              key={i}
              onClick={() => handleSend(qq)}
              disabled={loading}
              className="text-[11px] font-medium whitespace-nowrap px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
            >
              {qq}
            </button>
          ))}
        </div>

        {/* Stationary Search / Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="shrink-0 flex items-center gap-2 pt-2 pb-1 bg-white/50 dark:bg-slate-900/50"
        >
          <input
            type="text"
            value={query || ''}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about students, reviews, projects, or request exports..."
            className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </form>
      </div>
    </Modal>
  );
}
