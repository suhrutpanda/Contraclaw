import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import mockContracts from '../data/mockContracts'

function ConfidenceMeter({ value }) {
  const level = value >= 90 ? 'high' : value >= 85 ? 'medium' : 'low'
  return (
    <div className="confidence-meter">
      <div className="confidence-bar-track">
        <div className={`confidence-bar-fill ${level}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`confidence-value ${level}`}>{value}%</span>
    </div>
  )
}

function ApproveModal({ contract, onClose }) {
  const [step, setStep] = useState('confirm')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{step === 'confirm' ? 'Approve & Route to Sign' : 'Contract Routed'}</h3>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        {step === 'confirm' ? (
          <>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
                This will route the <strong>{contract.vendorName}</strong> renewal contract to your e-signature platform for execution.
              </p>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Contract Value</span>
                  <strong>${contract.financials.tcv.value.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Term</span>
                  <span>{contract.financials.termLength.value}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Red Flags</span>
                  <span>{contract.redFlags.length === 0 ? 'None' : contract.redFlags.length}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-approve" onClick={() => setStep('success')}>Confirm & Send to DocuSign</button>
            </div>
          </>
        ) : (
          <div className="success-state">
            <span className="success-icon"></span>
            <div className="success-title">Contract Routed for Signature</div>
            <div className="success-desc">
              The {contract.vendorName} renewal has been sent to DocuSign. You will be notified when all parties have signed.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function NegotiateModal({ contract, onClose }) {
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [step, setStep] = useState('select')
  const slots = [
    { id: 1, date: 'Mon, Mar 31', time: '10:00 AM - 10:30 AM' },
    { id: 2, date: 'Tue, Apr 1', time: '2:00 PM - 2:30 PM' },
    { id: 3, date: 'Thu, Apr 3', time: '11:00 AM - 11:30 AM' },
  ]
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{step === 'select' ? 'Schedule Negotiation' : 'Meeting Scheduled'}</h3>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        {step === 'select' ? (
          <>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
                Select a time slot to propose to <strong>{contract.vendorName}</strong> for a 30-minute review meeting.
              </p>
              <div className="calendar-slots">
                {slots.map(s => (
                  <div
                    key={s.id}
                    className={`calendar-slot ${selectedSlot === s.id ? 'selected' : ''}`}
                    onClick={() => setSelectedSlot(s.id)}
                  >
                    <span className="slot-icon"></span>
                    <span className="slot-date">{s.date}</span>
                    <span className="slot-time">{s.time}</span>
                  </div>
                ))}
              </div>
              {contract.talkingPoints.length > 0 && (
                <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Private Talking Points (CIO Only)
                  </div>
                  {contract.talkingPoints.map((tp, i) => (
                    <div key={i} className="talking-point">{tp}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-negotiate" disabled={!selectedSlot} onClick={() => setStep('success')}>
                Send Meeting Invite
              </button>
            </div>
          </>
        ) : (
          <div className="success-state">
            <span className="success-icon"></span>
            <div className="success-title">Meeting Invite Sent</div>
            <div className="success-desc">
              A calendar invite has been sent to {contract.vendorName} with your talking points attached as a private addendum.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ContractDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showApprove, setShowApprove] = useState(false)
  const [showNegotiate, setShowNegotiate] = useState(false)

  const contract = mockContracts.find(c => c.id === id)
  if (!contract || !contract.financials) {
    return (
      <div>
        <div className="back-link" onClick={() => navigate('/')}> Back to Dashboard</div>
        <p style={{ color: 'var(--text-muted)' }}>Contract not found or pending analysis.</p>
      </div>
    )
  }

  const f = contract.financials
  const formatMoney = (val) => `$${val.toLocaleString()}`

  return (
    <>
      <div className="back-link" onClick={() => navigate('/')}> Back to Dashboard</div>

      <div className="detail-header">
        <div className="detail-vendor">
          <div className="detail-vendor-icon">{contract.vendorLogo}</div>
          <div className="detail-vendor-info">
            <h2>{contract.vendorName}</h2>
            <div className="detail-vendor-meta">
              <span>Source: {contract.sourceEmail}</span>
              <span>Analyzed: {new Date(contract.analyzedAt).toLocaleDateString()}</span>
              <span className={`badge badge-${contract.recommendation}`}>{contract.recommendation}</span>
            </div>
          </div>
        </div>
      </div>

      {contract.needsHumanReview && (
        <div className="review-banner">
          <span className="review-banner-icon"></span>
          <div className="review-banner-content">
            <div className="review-banner-title">Manual Review Recommended</div>
            <ul className="review-reasons">
              {contract.reviewReasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="detail-grid">
        <div className="detail-panel">
          <div className="panel-title">Financial Terms</div>
          <div className="financial-grid">
            <div className="financial-item">
              <span className="financial-label">ARR</span>
              <span className="financial-value">{formatMoney(f.arr.value)}</span>
              <div className="financial-confidence"><ConfidenceMeter value={f.arr.confidence} /></div>
            </div>
            <div className="financial-item">
              <span className="financial-label">Total Contract Value</span>
              <span className="financial-value">{formatMoney(f.tcv.value)}</span>
              <div className="financial-confidence"><ConfidenceMeter value={f.tcv.confidence} /></div>
            </div>
            <div className="financial-item">
              <span className="financial-label">Term Length</span>
              <span className="financial-value">{f.termLength.value}</span>
              <div className="financial-confidence"><ConfidenceMeter value={f.termLength.confidence} /></div>
            </div>
            <div className="financial-item">
              <span className="financial-label">Billing</span>
              <span className="financial-value">{f.billingFrequency.value}</span>
              <div className="financial-confidence"><ConfidenceMeter value={f.billingFrequency.confidence} /></div>
            </div>
            <div className="financial-item">
              <span className="financial-label">Escalator</span>
              <span className="financial-value" style={{ color: f.escalator.value !== 'None' ? 'var(--color-escalate)' : 'inherit' }}>{f.escalator.value}</span>
              <div className="financial-confidence"><ConfidenceMeter value={f.escalator.confidence} /></div>
            </div>
            <div className="financial-item">
              <span className="financial-label">Credits</span>
              <span className="financial-value" style={{ fontSize: 'var(--font-size-base)' }}>{f.credits.value}</span>
              <div className="financial-confidence"><ConfidenceMeter value={f.credits.confidence} /></div>
            </div>
          </div>
        </div>

        <div className="detail-panel">
          <div className="panel-title">Red Flags ({contract.redFlags.length})</div>
          {contract.redFlags.length === 0 ? (
            <div className="no-flags">No risk clauses detected  contract terms are standard.</div>
          ) : (
            <div className="red-flag-list">
              {contract.redFlags.map((flag, i) => (
                <div key={i} className={`red-flag-item severity-${flag.severity}`}>
                  <div className="red-flag-header">
                    <span className="red-flag-clause">{flag.clause}</span>
                    <span className={`badge badge-risk-${flag.severity}`}>{flag.severity}</span>
                  </div>
                  <div className="red-flag-desc">{flag.description}</div>
                  <div className="red-flag-rec"> {flag.recommendation}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="detail-panel full-width">
          <div className="panel-title">AI Executive Briefing</div>
          <div className="executive-briefing">{contract.executiveSummary}</div>
          {contract.talkingPoints.length > 0 && (
            <div className="talking-points">
              <h4>Negotiation Talking Points</h4>
              {contract.talkingPoints.map((tp, i) => (
                <div key={i} className="talking-point">{tp}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="action-row">
        <button className="btn btn-approve" onClick={() => setShowApprove(true)}>
           Approve & Route to Sign
        </button>
        <button className="btn btn-negotiate" onClick={() => setShowNegotiate(true)}>
           Schedule Negotiation
        </button>
      </div>

      {showApprove && <ApproveModal contract={contract} onClose={() => setShowApprove(false)} />}
      {showNegotiate && <NegotiateModal contract={contract} onClose={() => setShowNegotiate(false)} />}
    </>
  )
}