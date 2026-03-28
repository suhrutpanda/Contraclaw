const OPENCLAW_GATEWAY_URL = "";
const USE_MOCK = false;
const TOKEN = "6052fb203a7cb0607e9efe8299a18bed94b1b4ee0be0c455";

// Connection state  subscribers get notified on change
let _connectionState = { status: 'checking', mode: USE_MOCK ? 'mock' : 'live', version: null, error: null, lastCheck: null };
let _listeners = [];

export function getConnectionState() { return _connectionState; }

export function subscribeConnection(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

function _notify() { _listeners.forEach(fn => fn(_connectionState)); }

// Activity log  tracks every OpenClaw invocation
let _activityLog = [];
let _activityListeners = [];

export function getActivityLog() { return _activityLog; }

export function subscribeActivity(fn) {
  _activityListeners.push(fn);
  return () => { _activityListeners = _activityListeners.filter(l => l !== fn); };
}

function _logActivity(entry) {
  _activityLog = [{ ...entry, timestamp: new Date().toISOString(), id: Date.now() }, ..._activityLog].slice(0, 50);
  _activityListeners.forEach(fn => fn(_activityLog));
}

// Check connection to OpenClaw gateway
export async function checkConnection() {
  _connectionState = { ..._connectionState, status: 'checking' };
  _notify();

  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 400));
    _connectionState = {
      status: 'mock',
      mode: 'mock',
      version: '1.0.0-mock',
      error: null,
      lastCheck: new Date().toISOString(),
      gateway: null,
      skills: ['contract-analyzer'],
    };
    _logActivity({ type: 'connection', action: 'Gateway check', detail: 'Running in mock mode \u2014 simulated OpenClaw responses', status: 'mock' });
    _notify();
    return _connectionState;
  }

  try {
    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/status`, {
      headers: { "Authorization": `Bearer ${TOKEN}` },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const txt = await response.text();
    const data = { version: "Live" };
    _connectionState = {
      status: 'connected',
      mode: 'live',
      version: data.version || 'unknown',
      error: null,
      lastCheck: new Date().toISOString(),
      gateway: '172.20.10.7:18789',
      skills: data.skills || [],
    };
    _logActivity({ type: 'connection', action: 'Gateway connected', detail: `Live OpenClaw gateway (v${_connectionState.version})`, status: 'success' });
  } catch (err) {
    _connectionState = {
      status: 'disconnected',
      mode: 'live',
      version: null,
      error: err.message,
      lastCheck: new Date().toISOString(),
      gateway: '172.20.10.7:18789',
      skills: [],
    };
    _logActivity({ type: 'connection', action: 'Gateway unreachable', detail: `Could not reach OpenClaw gateway: ${err.message}`, status: 'error' });
  }
  _notify();
  return _connectionState;
}

function simulateAnalysisDelay() {
  return new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 2000));
}

function generateMockAnalysis(fileName) {
  const vendorName = fileName.replace(/\.pdf$/i, "").replace(/[_-]/g, " ");
  const arr = Math.floor(30000 + Math.random() * 200000);
  const termMonths = [12, 24, 36][Math.floor(Math.random() * 3)];
  const tcv = arr * (termMonths / 12);
  const possibleFlags = [
    { clause: "Auto-renewal (60-day notice)", severity: "high", description: "Contract auto-renews with 60-day advance notice required.", recommendation: "Negotiate 30-day notice window." },
    { clause: "No Termination for Convenience", severity: "critical", description: "Missing T4C clause creates significant lock-in risk.", recommendation: "Negotiate T4C with pro-rated refund." },
    { clause: "Liability Cap Below Standard", severity: "high", description: "Vendor liability capped below 1x annual fees.", recommendation: "Negotiate to minimum 1x annual fees." },
  ];
  const flagCount = Math.floor(Math.random() * 3);
  const selectedFlags = possibleFlags.slice(0, flagCount);
  const recommendation = flagCount === 0 ? "approve" : flagCount >= 2 ? "escalate" : "negotiate";
  return {
    id: `ctr-${Date.now()}`,
    vendorName: vendorName.charAt(0).toUpperCase() + vendorName.slice(1),
    vendorLogo: "\uD83D\uDCC4",
    status: "analyzed",
    ingestedAt: new Date().toISOString(),
    analyzedAt: new Date().toISOString(),
    sourceEmail: "upload@manual",
    financials: {
      arr: { value: arr, confidence: 90 + Math.floor(Math.random() * 10) },
      tcv: { value: tcv, confidence: 88 + Math.floor(Math.random() * 10) },
      termLength: { value: `${termMonths} months`, confidence: 95 + Math.floor(Math.random() * 5) },
      billingFrequency: { value: Math.random() > 0.5 ? "Annual" : "Monthly", confidence: 98 },
      escalator: { value: Math.random() > 0.4 ? `${3 + Math.floor(Math.random() * 6)}% annual uplift` : "None", confidence: 80 + Math.floor(Math.random() * 15) },
      credits: { value: "None", confidence: 95 },
      renewalDate: { value: "2026-06-30", confidence: 92 },
    },
    redFlags: selectedFlags,
    needsHumanReview: flagCount >= 2,
    reviewReasons: flagCount >= 2 ? ["Multiple risk factors detected"] : [],
    executiveSummary: `${vendorName} renewal at $${arr.toLocaleString()} ARR / $${Math.round(tcv).toLocaleString()} TCV over ${termMonths} months. ${flagCount === 0 ? "No significant risks detected. Safe to approve." : `${flagCount} risk factor(s) identified requiring attention.`}`,
    recommendation,
    talkingPoints: selectedFlags.map((f) => f.recommendation),
  };
}

export async function analyzeContract(file) {
  _logActivity({ type: 'skill', action: 'contract-analyzer invoked', detail: `Analyzing: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`, status: 'running' });

  if (USE_MOCK) {
    await simulateAnalysisDelay();
    const result = generateMockAnalysis(file.name);
    _logActivity({ type: 'skill', action: 'Analysis complete (mock)', detail: `${result.vendorName}: ${result.recommendation} \u2014 ${result.redFlags.length} flags, TCV $${result.financials.tcv.value.toLocaleString()}`, status: 'success' });
    return result;
  }

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("skill", "contract-analyzer");
    
    _logActivity({ type: 'skill', action: 'Sending to OpenClaw', detail: `POST /api/skills/invoke`, status: 'running' });

    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/skills/invoke`, { 
      method: "POST", 
      headers: { "Authorization": `Bearer ${TOKEN}` },
      body: formData 
    });
    
    if (!response.ok) {
        const txt = await response.text().catch(()=>'');
        throw new Error(`OpenClaw analysis failed: ${response.status} ${txt}`);
    }
    const result = await response.json();
    
    // Ensure all required fields exist
    result.id = result.id || `ctr-${Date.now()}`;
    result.vendorLogo = result.vendorLogo || "\uD83D\uDCC4";
    result.status = "analyzed";
    result.ingestedAt = result.ingestedAt || new Date().toISOString();
    result.analyzedAt = new Date().toISOString();
    result.sourceEmail = result.sourceEmail || "upload@manual";
    result.talkingPoints = result.talkingPoints || [];
    result.reviewReasons = result.reviewReasons || [];
    result.redFlags = result.redFlags || [];
    
    _logActivity({ type: 'skill', action: 'Analysis complete (live)', detail: `${result.vendorName}: ${result.recommendation}`, status: 'success' });
    return result;
  } catch (err) {
    _logActivity({ type: 'skill', action: 'Analysis failed', detail: err.message, status: 'error' });
    throw err;
  }
}

export async function getGatewayStatus() {
  if (USE_MOCK) return { status: "mock", version: "1.0.0-mock", skills: ["contract-analyzer"] };
  const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/status`, {
    headers: { "Authorization": `Bearer ${TOKEN}` }
  });
  return response.json();
}