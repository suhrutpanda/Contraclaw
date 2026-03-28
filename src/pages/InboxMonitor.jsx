import React, { useState, useEffect } from 'react';
import { analyzeContract, subscribeActivity } from '../services/openclawBridge';
import { useNavigate } from 'react-router-dom';

export default function InboxMonitor({ onContractAnalyzed }) {
  const [status, setStatus] = useState('checking');
  const [errorMsg, setErrorMsg] = useState(null);
  const [emails, setEmails] = useState([]);
  const [autoForward, setAutoForward] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const poll = async () => {
      try {
        const [statRes, inboxRes] = await Promise.all([
          fetch('/api/local/status'),
          fetch('/api/local/inbox')
        ]);
        const stat = await statRes.json();
        const inbox = await inboxRes.json();
        
        setStatus(stat.status);
        setErrorMsg(stat.error);
        setEmails(inbox || []);
      } catch (err) {
        setStatus('error');
        setErrorMsg('Backend server unreachable. Is `node server/server.js` running?');
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAnalyze = async (email, attachment) => {
    if (processingIds.has(attachment.filename)) return;
    setProcessingIds(prev => new Set(prev).add(attachment.filename));

    try {
      // Decode base64 to Blob, then to File to match the bridge expected input
      const res = await fetch(`data:${attachment.contentType};base64,${attachment.contentBase64}`);
      const blob = await res.blob();
      const file = new File([blob], attachment.filename, { type: attachment.contentType });

      const result = await analyzeContract(file);
      onContractAnalyzed?.(result);

      // Optional: Wait just a bit before directing user, or just stay here?
      // Since it's Inbox Monitor, maybe just show a success checkmark.
      setTimeout(() => {
        setProcessingIds(prev => {
          const next = new Set(prev);
          next.delete(attachment.filename);
          return next;
        });
      }, 3000);

    } catch (e) {
      console.error(e);
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(attachment.filename);
        return next;
      });
    }
  };

  // Automated flow
  useEffect(() => {
    if (!autoForward) return;
    emails.forEach(email => {
      email.attachments?.forEach(att => {
        if (!processingIds.has(att.filename) && !att._autoProcessed) {
           att._autoProcessed = true; // prevent re-triggering the same file immediately
           handleAnalyze(email, att);
        }
      });
    });
  }, [emails, autoForward]);

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h2>Inbox Monitor</h2>
          <p>hackathondev462@gmail.com</p>
        </div>
        
        <div className="connection-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#111822', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #1f2937' }}>
          <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Auto-Forward</span>
          <label className="toggle-switch">
             <input type="checkbox" checked={autoForward} onChange={(e) => setAutoForward(e.target.checked)} />
             <span className="slider round"></span>
          </label>
        </div>
      </div>

      {status === 'error' && (
        <div className="alert-box" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '1.5rem' }}>\u26A0\uFE0F</div>
          <div>
            <h4 style={{ color: '#fca5a5', margin: '0 0 0.25rem 0' }}>IMAP Connection Failed</h4>
            <p style={{ color: '#f87171', margin: 0, fontSize: '0.875rem' }}>{errorMsg}</p>
            <p style={{ color: '#94a3b8', margin: '0.5rem 0 0', fontSize: '0.75rem' }}>Google block or App Password required.</p>
          </div>
        </div>
      )}

      {status === 'connecting' && <p style={{ color: '#94a3b8' }}>Connecting to imap.gmail.com...</p>}

      <div className="email-feed" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {emails.length === 0 && status === 'connected' && (
          <div className="empty-state">No emails found in INBOX.</div>
        )}
        
        {emails.map(email => (
          <div key={email.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#f8fafc' }}>{email.subject}</h3>
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}><b>From:</b> {email.from} \u2022 {new Date(email.date).toLocaleString()}</div>
               </div>
            </div>
            
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              {email.snippet}
            </p>
            
            {email.attachments && email.attachments.length > 0 && (
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {email.attachments.map((att, idx) => {
                   const isProcessing = processingIds.has(att.filename);
                   return (
                     <div key={idx} style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '0.75rem 1rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                        <div style={{ fontSize: '1.5rem' }}>\uD83D\uDCC4</div>
                        <div style={{ flex: 1 }}>
                           <div style={{ color: '#38bdf8', fontWeight: 500, fontSize: '0.9rem' }}>{att.filename}</div>
                           <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{(att.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <button 
                           onClick={() => handleAnalyze(email, att)}
                           disabled={isProcessing || autoForward}
                           className="btn-primary" 
                           style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', opacity: (isProcessing || autoForward) ? 0.5 : 1 }}>
                           {isProcessing ? 'Analyzing...' : autoForward ? 'Auto-queued' : 'Analyze PDF'}
                        </button>
                     </div>
                   );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}