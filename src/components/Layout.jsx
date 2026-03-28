import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { checkConnection, subscribeConnection, getConnectionState } from '../services/openclawBridge'

export default function Layout({ children }) {
  const [conn, setConn] = useState(getConnectionState())

  useEffect(() => {
    checkConnection()
    const unsub = subscribeConnection(setConn)
    // Re-check every 30s
    const interval = setInterval(() => checkConnection(), 30000)
    return () => { unsub(); clearInterval(interval) }
  }, [])

  const statusLabel = () => {
    if (conn.status === 'checking') return 'Checking gateway...'
    if (conn.status === 'mock') return 'Mock Mode'
    if (conn.status === 'connected') return 'Live Gateway Connected'
    if (conn.status === 'disconnected') return 'Gateway Offline'
    return 'Unknown'
  }

  const statusDotClass = () => {
    if (conn.status === 'checking') return 'status-dot status-dot-checking'
    if (conn.status === 'mock') return 'status-dot status-dot-mock'
    if (conn.status === 'connected') return 'status-dot status-dot-live'
    return 'status-dot status-dot-offline'
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Openclaw</h1>
          <span>SaaS Renewal Automator</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">{'\uD83D\uDCCA'}</span>
            Dashboard
          </NavLink>
          <NavLink to="/inbox" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">{'\uD83D\uDCE7'}</span>
            Inbox Monitor
          </NavLink>
          <NavLink to="/" className="nav-item" style={{ pointerEvents: 'none', opacity: 0.4 }}>
            <span className="nav-icon">{'\u2699\uFE0F'}</span>
            Settings
          </NavLink>
          <NavLink to="/" className="nav-item" style={{ pointerEvents: 'none', opacity: 0.4 }}>
            <span className="nav-icon">{'\uD83D\uDCCB'}</span>
            Audit Log
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="connection-panel">
            <div className="connection-row">
              <span className={statusDotClass()}></span>
              <span className="connection-label">{statusLabel()}</span>
            </div>
            {conn.status === 'mock' && (
              <div className="connection-detail">
                Simulated responses via openclawBridge.js. Set USE_MOCK=false to connect to a live gateway.
              </div>
            )}
            {conn.status === 'connected' && (
              <div className="connection-detail connection-detail-live">
                {conn.gateway} &middot; v{conn.version}
                {conn.skills?.length > 0 && (
                  <div className="connection-skills">
                    Skills: {conn.skills.map(s => (
                      <span key={s} className="skill-tag">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {conn.status === 'disconnected' && (
              <div className="connection-detail connection-detail-error">
                Cannot reach {conn.gateway}. {conn.error}
              </div>
            )}
            {conn.lastCheck && (
              <div className="connection-checked">
                Last check: {new Date(conn.lastCheck).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </aside>
      <div className="main-area">
        <div className="main-content">
          {children}
        </div>
      </div>
    </div>
  )
}