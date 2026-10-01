/* ── State ── */
let currentFile = null;
let liveInterval = null;
let liveAnim = null;
let liveCtx = null;
let phase = 0;
let callEnded = false;
let chunkCount = 0;
let alertCount = 0;
let probSum = 0;
let audioCtx = null;
let lastRisk = null;

/* ── Tab switching ── */
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
}

/* ── Audio synthesis (Web Audio API) ── */
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function beep(type) {
  try {
    const ctx = getAudioCtx();
    if (type === 'safe') {
      // Two-tone rising chime
      [880, 1100].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.28);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.28);
      });
    } else if (type === 'warn') {
      // Double pulse square wave
      [0, 0.55].forEach(t => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime + t);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.4);
      });
    } else if (type === 'danger') {
      // Triple descending siren
      [0, 0.38, 0.76].forEach(t => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, ctx.currentTime + t);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + t + 0.32);
        gain.gain.setValueAtTime(0.28, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.32);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.32);
      });
    }
  } catch (e) {
    console.warn('Audio playback unavailable:', e);
  }
}

/* ── Upload panel ── */
function handleFile(input) {
  if (!input.files[0]) return;
  currentFile = input.files[0];
  document.getElementById('file-label').textContent = currentFile.name;
  document.getElementById('analyse-btn').disabled = false;
  drawStaticWave('upload-wave');
  document.getElementById('upload-wave').style.display = 'block';
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('dropzone').classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('audio/')) {
    currentFile = f;
    document.getElementById('file-label').textContent = f.name;
    document.getElementById('analyse-btn').disabled = false;
    drawStaticWave('upload-wave');
    document.getElementById('upload-wave').style.display = 'block';
  }
}

function drawStaticWave(id) {
  const c = document.getElementById(id);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#388bfd';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x < c.width; x++) {
    const amp = (Math.random() * 26 + 6) * Math.abs(Math.sin(x * 0.018 + 0.5));
    const y = 40 + Math.sin(x * 0.06 + 1) * amp;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function resetUpload() {
  currentFile = null;
  document.getElementById('file-label').textContent = '';
  document.getElementById('analyse-btn').disabled = true;
  document.getElementById('upload-wave').style.display = 'none';
  document.getElementById('upload-result').innerHTML = '';
  document.getElementById('file-input').value = '';
  setStatusPill('idle');
}

function runAnalysis() {
  const btn = document.getElementById('analyse-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader spin"></i> Analysing…';
  setStatusPill('live', 'Analysing…');

  // Simulate analysis delay (replace with real model call)
  setTimeout(() => {
    const prob = Math.floor(Math.random() * 100);
    showUploadResult(prob);
    btn.innerHTML = '<i class="ti ti-scan"></i> Analyse audio';
    btn.disabled = false;
    const risk = prob >= 75 ? 'danger' : prob >= 40 ? 'warn' : 'safe';
    setStatusPill(risk === 'danger' ? 'live' : risk === 'warn' ? 'warn' : 'safe',
      risk === 'danger' ? 'High risk' : risk === 'warn' ? 'Medium risk' : 'Safe');
  }, 2400);
}

function showUploadResult(prob) {
  let cls, iconName, title, sub, badgeText, badgeCls;
  const barColor = prob >= 75 ? '#f85149' : prob >= 40 ? '#d29922' : '#3fb950';

  if (prob >= 75) {
    cls = 'danger'; iconName = 'ti-alert-triangle';
    title = 'Likely AI-generated voice';
    sub = 'High probability of voice cloning or synthesis detected.';
    badgeText = 'High risk'; badgeCls = 'red';
    beep('danger');
  } else if (prob >= 40) {
    cls = 'warn'; iconName = 'ti-alert-circle';
    title = 'Suspicious audio patterns';
    sub = 'Some artifacts consistent with AI generation found. Verify before sharing sensitive information.';
    badgeText = 'Medium risk'; badgeCls = 'amber';
    beep('warn');
  } else {
    cls = 'safe'; iconName = 'ti-circle-check';
    title = 'Authentic voice detected';
    sub = 'No significant AI generation artifacts found. Voice appears genuine.';
    badgeText = 'Safe'; badgeCls = 'green';
    beep('safe');
  }

  const features = [
    { label: 'Spectral flatness',      val: clamp(Math.floor(prob * 0.85 + Math.random() * 15)) },
    { label: 'MFCC anomaly score',     val: clamp(Math.floor(prob * 0.90 + Math.random() * 10)) },
    { label: 'Pitch regularity',       val: clamp(Math.floor(prob * 0.70 + Math.random() * 20)) },
    { label: 'Prosody deviation',      val: clamp(Math.floor(prob * 0.80 + Math.random() * 18)) },
    { label: 'Mel-spectrogram gaps',   val: clamp(Math.floor(prob * 0.95 + Math.random() * 5)) },
  ];

  const rows = features.map(f => `
    <div class="score-row">
      <div class="score-label">${f.label}</div>
      <div class="bar-bg" style="flex:1;height:5px;border-radius:99px;background:var(--surface3)">
        <div class="bar-fill" style="width:${f.val}%;background:${barColor};height:100%;border-radius:99px;transition:width 1s ease"></div>
      </div>
      <div class="score-pct">${f.val}%</div>
    </div>`).join('');

  document.getElementById('upload-result').innerHTML = `
    <div class="result-card ${cls}">
      <div class="result-header">
        <i class="ti ${iconName}"></i>
        <div>
          <div class="result-title">${title}</div>
          <div class="result-sub">${sub}</div>
        </div>
        <span class="badge ${badgeCls}" style="margin-left:auto;flex-shrink:0">${badgeText}</span>
      </div>
      <div class="prob-line">
        AI-generated probability: <span style="color:${barColor}">${prob}%</span>
      </div>
      <div class="divider"></div>
      <div class="section-label">Feature analysis</div>
      ${rows}
    </div>`;
}

/* ── Live detection ── */
function startLive() {
  callEnded = false;
  chunkCount = 0; alertCount = 0; probSum = 0; lastRisk = null;
  document.getElementById('start-btn').disabled = true;
  document.getElementById('stop-btn').disabled = false;
  document.getElementById('live-badge').style.display = 'flex';
  document.getElementById('live-stats').style.display = 'flex';
  document.getElementById('live-chunks').innerHTML = '';
  document.getElementById('live-notification').innerHTML = '';
  document.getElementById('call-ended-screen').innerHTML = '';
  updateLiveStats();
  setStatusPill('live', 'Live');
  startLiveWave();
  liveInterval = setInterval(processChunk, 2500);
}

function stopLive() {
  clearInterval(liveInterval);
  cancelAnimationFrame(liveAnim);
  document.getElementById('start-btn').disabled = false;
  document.getElementById('stop-btn').disabled = true;
  document.getElementById('live-badge').style.display = 'none';
  if (liveCtx) liveCtx.clearRect(0, 0, 800, 80);
  setStatusPill('idle');
}

function startLiveWave() {
  const c = document.getElementById('live-wave');
  liveCtx = c.getContext('2d');
  phase = 0;

  function draw() {
    liveCtx.clearRect(0, 0, c.width, c.height);
    liveCtx.strokeStyle = '#388bfd';
    liveCtx.lineWidth = 1.5;
    liveCtx.beginPath();
    for (let x = 0; x < c.width; x++) {
      const amp = 18 + 10 * Math.sin(x * 0.016 + phase * 0.4);
      const y = 40 + Math.sin(x * 0.048 + phase) * amp * Math.sin(x * 0.022 + phase * 0.5);
      x === 0 ? liveCtx.moveTo(x, y) : liveCtx.lineTo(x, y);
    }
    liveCtx.stroke();
    phase += 0.065;
    liveAnim = requestAnimationFrame(draw);
  }
  draw();
}

function processChunk() {
  if (callEnded) return;
  chunkCount++;

  // Simulate AI detection (replace with real model inference)
  const prob = Math.floor(Math.random() * 100);
  probSum += prob;

  const now = new Date();
  const ts = now.toTimeString().slice(0, 8);
  const barColor = prob >= 75 ? '#f85149' : prob >= 40 ? '#d29922' : '#3fb950';
  const badgeCls = prob >= 75 ? 'red' : prob >= 40 ? 'amber' : 'green';
  const badgeText = prob >= 75 ? 'AI likely' : prob >= 40 ? 'Suspicious' : 'Real';

  if (prob >= 40) alertCount++;

  const chunk = document.createElement('div');
  chunk.className = 'chunk';
  chunk.innerHTML = `
    <span class="chunk-time">${ts}</span>
    <div class="chunk-bar">
      <div class="bar-bg">
        <div class="bar-fill" style="width:${prob}%;background:${barColor}"></div>
      </div>
    </div>
    <span class="chunk-pct">${prob}%</span>
    <span class="chunk-badge"><span class="badge ${badgeCls}">${badgeText}</span></span>`;

  const container = document.getElementById('live-chunks');
  container.insertBefore(chunk, container.firstChild);
  if (container.children.length > 10) container.removeChild(container.lastChild);

  updateLiveStats();
  triggerNotification(prob);
}

function triggerNotification(prob) {
  const notifEl = document.getElementById('live-notification');

  if (prob < 40) {
    // LOW RISK — green safe notification
    if (lastRisk === 'safe') return; // don't spam if already showing safe
    lastRisk = 'safe';
    beep('safe');
    setStatusPill('safe', 'Safe');
    notifEl.innerHTML = `
      <div class="notif safe">
        <i class="ti ti-shield-check"></i>
        <div>
          <div class="notif-title">Voice verified — safe</div>
          <div class="notif-body">This segment shows no signs of AI generation. The caller's voice appears authentic (${prob}% AI probability).</div>
        </div>
      </div>`;
    setTimeout(() => {
      const el = notifEl.querySelector('.safe');
      if (el) notifEl.innerHTML = '';
    }, 5000);

  } else if (prob >= 40 && prob < 75) {
    // MEDIUM RISK — amber warning with sound
    lastRisk = 'warn';
    beep('warn');
    setStatusPill('live', 'Warning');
    notifEl.innerHTML = `
      <div class="notif warn">
        <i class="ti ti-alert-circle"></i>
        <div>
          <div class="notif-title">Risk detected — stay alert</div>
          <div class="notif-body">Suspicious voice patterns detected (${prob}% AI probability). Do not share sensitive or personal information until the caller's identity is verified through a secondary channel.</div>
        </div>
      </div>`;

  } else {
    // HIGH RISK — terminate call, red alert
    lastRisk = 'danger';
    beep('danger');
    clearInterval(liveInterval);
    cancelAnimationFrame(liveAnim);
    callEnded = true;
    if (liveCtx) liveCtx.clearRect(0, 0, 800, 80);

    document.getElementById('live-badge').style.display = 'none';
    document.getElementById('stop-btn').disabled = true;
    document.getElementById('start-btn').disabled = false;
    notifEl.innerHTML = '';
    setStatusPill('live', 'Call terminated');

    document.getElementById('call-ended-screen').innerHTML = `
      <div class="call-ended">
        <i class="ti ti-phone-x big"></i>
        <h3>Call terminated — voice impersonation detected</h3>
        <p>AI-generated probability reached <strong style="color:var(--red)">${prob}%</strong>. The call has been automatically disconnected to protect you from a potential voice cloning or impersonation attack.</p>
        <p style="margin-top:.6rem">Do not redial until you have verified the caller's identity through a separate trusted contact or official channel.</p>
        <button class="btn" onclick="restartLive()" style="margin-top:1.25rem">
          <i class="ti ti-refresh"></i> Start new session
        </button>
      </div>`;
  }
}

function restartLive() {
  document.getElementById('call-ended-screen').innerHTML = '';
  document.getElementById('live-notification').innerHTML = '';
  document.getElementById('live-chunks').innerHTML = '';
  document.getElementById('live-stats').style.display = 'none';
  callEnded = false;
  lastRisk = null;
  setStatusPill('idle');
}

function updateLiveStats() {
  document.getElementById('stat-chunks').textContent = chunkCount;
  document.getElementById('stat-alerts').textContent = alertCount;
  document.getElementById('stat-avg').textContent = chunkCount ? Math.round(probSum / chunkCount) + '%' : '—';
}

/* ── Status pill ── */
function setStatusPill(state, label) {
  const pill = document.getElementById('status-pill');
  pill.className = 'status-pill';
  if (state === 'live') pill.classList.add('live');
  if (state === 'safe') pill.classList.add('safe');
  pill.textContent = label || (state === 'idle' ? 'Idle' : state);
}

/* ── Utility ── */
function clamp(v) { return Math.min(Math.max(Math.round(v), 0), 100); }
