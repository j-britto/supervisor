import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import Modal from './Modal.jsx';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Bug,
  Lock,
  Radio,
  Send,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Activity
} from 'lucide-react';

export default function SecurityShieldModal({ isOpen, onClose }) {
  const [securityData, setSecurityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testPayload, setTestPayload] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getSecurityStatus();
      if (data && data.success) {
        setSecurityData(data.firewall);
      }
    } catch (err) {
      console.error('Error fetching security status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunScan = async (presetText = null) => {
    const textToScan = presetText !== null ? presetText : testPayload;
    if (!textToScan) return;

    setScanning(true);
    setScanResult(null);
    try {
      const res = await api.runSecurityScan(textToScan, 'Security Shield Inspector');
      if (res && res.success) {
        setScanResult(res.scanResult);
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleTriggerTestAlert = async () => {
    setAlerting(true);
    setAlertMsg(null);
    try {
      const res = await api.triggerTestSecurityAlert();
      if (res && res.success) {
        setAlertMsg({
          type: 'success',
          text: `✅ Emergency Alert Email dispatched successfully to: ${res.recipients?.join(', ') || 'Administrators'}`
        });
        fetchStatus();
      } else {
        setAlertMsg({
          type: 'error',
          text: res?.error || 'Failed to dispatch test security alert.'
        });
      }
    } catch (err) {
      setAlertMsg({
        type: 'error',
        text: err.message || 'Error triggering alert email.'
      });
    } finally {
      setAlerting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="4-Layer Firewall & Antivirus Protection Engine"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        
        {/* Top Status Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-md shadow-emerald-700/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide">ACTIVE DEFENSE</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/40 text-[10px] font-mono font-bold uppercase">
                  Helmet + 4 Layers
                </span>
              </div>
              <p className="text-emerald-100 text-[11px]">
                Real-time WAF, anti-DDoS, virus/malware signatures &amp; emergency email dispatch active.
              </p>
            </div>
          </div>

          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors cursor-pointer text-white"
            title="Refresh Security Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {alertMsg && (
          <div className={`p-3 rounded-xl border font-semibold flex items-center justify-between ${
            alertMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
          }`}>
            <span>{alertMsg.text}</span>
            <button onClick={() => setAlertMsg(null)} className="font-bold underline ml-2 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* The 4 Firewall Layers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          
          {/* Layer 1 */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                Layer 1: Network &amp; Anti-DDoS
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              General: 300 req/min • Auth: 25 req/5min
            </p>
            <p className="text-[10px] font-mono text-slate-400">
              Blocked Floods: <strong className="text-blue-600">{securityData?.layers?.layer1?.blockedAttacks || 0}</strong>
            </p>
          </div>

          {/* Layer 2 */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-500" />
                Layer 2: Helmet Armor
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              NoSniff, XSS-Filter, HidePoweredBy, Cross-Origin
            </p>
            <p className="text-[10px] font-mono text-slate-400">
              Sanitized: <strong className="text-indigo-600">{securityData?.layers?.layer2?.sanitizedRequests || 0}</strong>
            </p>
          </div>

          {/* Layer 3 */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Bug className="w-3.5 h-3.5 text-emerald-500" />
                Layer 3: WAF &amp; Antivirus
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Malware &amp; Webshell Scanner • SQLi/XSS/NoSQL WAF
            </p>
            <p className="text-[10px] font-mono text-slate-400">
              Viruses Blocked: <strong className="text-emerald-600">{securityData?.layers?.layer3?.virusesBlocked || 0}</strong> • Exploits: <strong className="text-emerald-600">{securityData?.layers?.layer3?.blockedExploits || 0}</strong>
            </p>
          </div>

          {/* Layer 4 */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-purple-500" />
                Layer 4: Incident Mailer
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              DB Cut • Crash • Shutdown • Attack Alert Dispatch
            </p>
            <p className="text-[10px] font-mono text-slate-400">
              Alert Admin Recipients: <strong className="text-purple-600">{securityData?.layers?.layer4?.alertRecipients || 2}</strong>
            </p>
          </div>

        </div>

        {/* Antivirus Live Scanner & Payload Test Section */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-600" />
              Live Antivirus &amp; Threat Signature Inspector
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {securityData?.antivirusSignatures?.length || 8} Signatures Loaded
            </span>
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              value={testPayload || ''}
              onChange={(e) => setTestPayload(e.target.value)}
              placeholder="Enter text, string, or payload to test virus scanner..."
              className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
            />
            <button
              onClick={() => handleRunScan()}
              disabled={scanning || !testPayload}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
            >
              {scanning ? 'Scanning...' : 'Scan'}
            </button>
          </div>

          {/* Preset Test Triggers */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] font-bold text-slate-400">Test Presets:</span>
            <button
              onClick={() => {
                const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
                setTestPayload(eicar);
                handleRunScan(eicar);
              }}
              className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-mono text-[10px] hover:opacity-80 cursor-pointer"
            >
              + Test EICAR Virus
            </button>

            <button
              onClick={() => {
                const webshell = 'eval(base64_decode($_POST["cmd"]));';
                setTestPayload(webshell);
                handleRunScan(webshell);
              }}
              className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono text-[10px] hover:opacity-80 cursor-pointer"
            >
              + Test Webshell Pattern
            </button>

            <button
              onClick={() => {
                const clean = 'Student project title: AI Evaluation System';
                setTestPayload(clean);
                handleRunScan(clean);
              }}
              className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] hover:opacity-80 cursor-pointer"
            >
              + Test Clean Payload
            </button>
          </div>

          {/* Scan Result Box */}
          {scanResult && (
            <div className={`p-2.5 rounded-xl border text-[11px] ${
              scanResult.isClean
                ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/70 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {scanResult.isClean ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Clean — No Virus / Threat Signatures Detected</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Threat Blocked: {scanResult.threatName} ({scanResult.severity})</span>
                  </>
                )}
              </div>
              {!scanResult.isClean && (
                <p className="mt-1 font-mono text-[10px] opacity-90">
                  Signature ID: {scanResult.signatureId} • Context: {scanResult.context}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Emergency Admin Mail Dispatcher Test */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-blue-600" />
              Emergency Admin Alert Mail Test
            </p>
            <p className="text-[11px] text-slate-500">
              Triggers instant high-urgency diagnostic email to all registered administrators.
            </p>
          </div>

          <button
            onClick={handleTriggerTestAlert}
            disabled={alerting}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer transition-colors shadow-sm disabled:opacity-50 shrink-0"
          >
            {alerting ? 'Sending Alert...' : 'Send Test Alert'}
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </Modal>
  );
}
