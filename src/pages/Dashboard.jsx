import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import mockContractsData from '../data/mockContracts'
import { analyzeContract, subscribeActivity, getActivityLog, getConnectionState, subscribeConnection } from '../services/openclawBridge'

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

function ActivityLog() {
  const [log, setLog] = useState(getActivityLog())
  useEffect(() => {
    const unsub = subscribeActivity(setLog)
    return unsub
  }, [])

  if (log.length === 0) return null

  const getIcon = (entry) => {
    if (entry.type === 'connection' && entry.status === 'mock') return '\uD83E\uDDEA'
    if (entry.type === 'connection' && entry.status === 'success') return '\uD83D\uDD17'
    if (entry.type === 'connection' && entry.status === 'error') return '\u274C'
    if (entry.type === 'skill' && entry.status === 'running') return '\u2699\uFE0F'
    if (entry.type === 'skill' && entry.status === 'success') return '\u2705'
    if (entry.type === 'skill' && entry.status === 'error') return '\u26A0\uFE0F'
    return '\uD83D\uDCE1'
  }

  const getStatusClass = (entry) => {
    if (entry.status === 'success') return 'activity-status-success'
    if (entry.status === 'error') return 'activity-status-error'
    if (entry.status === 'running') return 'activity-status-running'
    if (entry.status === 'mock') return 'activity-status-mock'
    return ''
  }

  return (
    <div className="activity-section">
      <div className="section-header">
        <h3>{'\uD83D\uDCE1'} OpenClaw Activity</h3>
        <span className="activity-mode-badge">
          {getConnectionState().status === 'mock' ? '\uD83E\uDDEA Mock Mode' : '\u26A1 Live'}
        </span>
      </div>
      <div className="activity-list">
        {log.map(entry => (
          <div key={entry.id} className={`activity-item ${getStatusClass(entry)}`}>
            <span className="activity-icon">{getIcon(entry)}</span>
            <div className="activity-content">
              <div className="activity-action">{entry.action}</div>
              <div className="activity-detail">{entry.detail}</div>
            </div>
            <div className="activity-time">
              {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [contracts, setContracts] = useState(mockContractsData)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()
  const navigate = useNavigate()

  const analyzed = contracts.filter(c => c.status === 'analyzed')
  const totalTcv = analyzed.reduce((sum, c) => sum + (c.financials?.tcv?.value || 0), 0)
  const totalFlags = analyzed.reduce((sum, c) => sum + (c.redFlags?.length || 0), 0)
  const avgConfidence = analyzed.length > 0
    ? Math.round(analyzed.reduce((sum, c) => sum + (c.financials?.tcv?.confidence || 0), 0) / analyzed.length)
    : 0

  const handleFile = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) return
    setUploading(true)
    try {
      const result = await analyzeContract(file)
      setContracts(prev => [result, ...prev])
    } catch (e) {
      console.error('Analysis failed:', e)
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const getBadgeClass = (rec) => {
    if (!rec) return 'badge-pending'
    return `badge-${rec}`
  }

  const getRiskLevel = (flags) => {
    if (!flags || flags.length === 0) return null
    if (flags.some(f => f.severity === 'critical')) return 'critical'
    if (flags.some(f => f.severity === 'high')) return 'high'
    if (flags.some(f => f.severity === 'medium')) return 'medium'
    return 'low'
  }

  const formatMoney = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`
    return `$${val}`
  }

  const daysUntil = (dateStr) => {
    if (!dateStr) return null
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const [connState, setConnState] = useState(getConnectionState())
  useEffect(() => { const unsub = subscribeConnection(setConnState); return unsub }, [])
  const modeLabel = connState.status === 'mock' ? 'Mock Mode' : connState.status === 'connected' ? 'Live Gateway' : 'Offline'

  return (
    <>
      <div className="page-header">
        <h2>Renewal Command Center</h2>
        <p>AI-powered contract analysis by OpenClaw <span className={`inline-badge inline-badge-${connState.status}`}>{modeLabel}</span></p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-icon">{'\uD83D\uDCC4'}</span>
          <div className="kpi-label">Active Renewals</div>
          <div className="kpi-value amber">{contracts.length}</div>
          <div className="kpi-detail">{contracts.filter(c => c.status === 'pending').length} pending analysis</div>
        </div>
        <div className="kpi-card">
          <span className="kpi-icon">{'\uD83D\uDCB0'}</span>
          <div className="kpi-label">Total TCV at Risk</div>
          <div className="kpi-value red">{formatMoney(totalTcv)}</div>
          <div className="kpi-detail">across {analyzed.length} analyzed contracts</div>
        </div>
        <div className="kpi-card">
          <span className="kpi-icon">{'\uD83D\uDEA9'}</span>
          <div className="kpi-label">Red Flags Detected</div>
          <div className="kpi-value red">{totalFlags}</div>
          <div className="kpi-detail">{analyzed.filter(c => c.redFlags?.some(f => f.severity === 'critical')).length} critical issues</div>
        </div>
        <div className="kpi-card">
          <span className="kpi-icon">{'\uD83C\uDFAF'}</span>
          <div className="kpi-label">Avg. Confidence</div>
          <div className="kpi-value green">{avgConfidence}%</div>
          <div className="kpi-detail">{analyzed.filter(c => c.needsHumanReview).length} need manual review</div>
        </div>
      </div>

      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        style={{ marginBottom: 'var(--space-8)' }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {uploading ? (
          <div className="upload-processing">
            <div className="processing-spinner" />
            <div className="processing-text">
              {connState.status === 'mock'
                ? '\uD83E\uDDEA OpenClaw (Mock) is analyzing the contract...'
                : '\u26A1 OpenClaw is analyzing the contract...'}
            </div>
            <div className="processing-subtext">
              Skill: contract-analyzer &middot; Extracting financial terms and scanning for risk clauses
            </div>
          </div>
        ) : (
          <>
            <span className="upload-icon">{'\uD83D\uDCE4'}</span>
            <div className="upload-title">Drop a contract PDF here</div>
            <div className="upload-desc">or click to browse &mdash; OpenClaw will analyze it automatically</div>
          </>
        )}
      </div>

      <div className="contracts-section" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="section-header">
          <h3>Contract Pipeline</h3>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            {contracts.length} contracts
          </span>
        </div>
        <div className="table-wrapper">
          <table className="contracts-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>TCV</th>
                <th>Renewal</th>
                <th>Risk</th>
                <th>Confidence</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => {
                const riskLevel = getRiskLevel(c.redFlags)
                const daysLeft = daysUntil(c.financials?.renewalDate?.value)
                return (
                  <tr key={c.id} onClick={() => c.status === 'analyzed' && navigate(`/contracts/${c.id}`)}>
                    <td>
                      <div className="vendor-cell">
                        <div className="vendor-icon">{c.vendorLogo}</div>
                        <div className="vendor-info">
                          <div className="vendor-name">{c.vendorName}</div>
                          <div className="vendor-email">{c.sourceEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="money">
                        {c.financials ? formatMoney(c.financials.tcv.value) : ''}
                      </span>
                    </td>
                    <td>
                      {c.financials?.renewalDate?.value ? (
                        <span style={{ color: daysLeft <= 30 ? 'var(--color-escalate)' : 'var(--text-secondary)' }}>
                          {daysLeft}d left
                        </span>
                      ) : ''}
                    </td>
                    <td>
                      {riskLevel ? (
                        <span className={`badge badge-risk-${riskLevel}`}>
                          {c.redFlags.length} {riskLevel}
                        </span>
                      ) : c.status === 'analyzed' ? (
                        <span className="badge badge-approve">Clean</span>
                      ) : ''}
                    </td>
                    <td>
                      {c.financials ? (
                        <ConfidenceMeter value={c.financials.tcv.confidence} />
                      ) : ''}
                    </td>
                    <td>
                      <span className={`badge ${getBadgeClass(c.recommendation)}`}>
                        {c.recommendation || c.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ActivityLog />
    </>
  )
}