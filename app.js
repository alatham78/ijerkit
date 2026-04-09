'use strict';

// ============================================================
// Config
// ============================================================

const THRESHOLD   = 15;    // m/s² — minimum Y acceleration for a jerk count
const DEBOUNCE_MS = 300;   // minimum ms between counts (~3 jerks/sec max)
const GRAVITY_α   = 0.8;   // low-pass filter coefficient for gravity estimation

// ============================================================
// State
// ============================================================

let selectedDuration    = 10;
let score               = 0;
let lastCountTime       = 0;
let gravity             = { x: 0, y: 0, z: 0 };
let roundTimer          = null;
let tickInterval        = null;
let countdownAborted    = false;
let audioCtx            = null;
let currentLbTab        = 10;

// ============================================================
// Screen Navigation
// ============================================================

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
}

// ============================================================
// Audio — synthesised via Web Audio API, no external files
// ============================================================

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq, durationSec, type, vol, startDelaySec) {
  if (!audioCtx) return;
  const t   = audioCtx.currentTime + (startDelaySec || 0);
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type            = type || 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol || 0.55, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + durationSec);
  osc.start(t);
  osc.stop(t + durationSec + 0.05);
}

// Short mid-tone beep for 3, 2, 1
function playCountdownBeep() {
  playTone(440, 0.12, 'sine', 0.55);
}

// Two quick ascending tones — clearly different from countdown
function playGoBeep() {
  playTone(660, 0.12, 'sine', 0.55, 0);
  playTone(880, 0.22, 'sine', 0.6,  0.09);
}

// Descending stab sequence — round over
function playEndSound() {
  playTone(660, 0.14, 'sawtooth', 0.38, 0);
  playTone(550, 0.14, 'sawtooth', 0.38, 0.15);
  playTone(440, 0.14, 'sawtooth', 0.38, 0.30);
  playTone(330, 0.40, 'sawtooth', 0.33, 0.45);
}

// ============================================================
// Motion Detection
// ============================================================

function getLinearAccelY(event) {
  // Prefer acceleration (browser-provided gravity removal)
  const a = event.acceleration;
  if (a && a.y !== null && a.y !== undefined) {
    return a.y;
  }

  // Fallback: manual gravity removal via low-pass filter
  const raw = event.accelerationIncludingGravity;
  if (!raw) return 0;
  gravity.x = GRAVITY_α * gravity.x + (1 - GRAVITY_α) * (raw.x || 0);
  gravity.y = GRAVITY_α * gravity.y + (1 - GRAVITY_α) * (raw.y || 0);
  gravity.z = GRAVITY_α * gravity.z + (1 - GRAVITY_α) * (raw.z || 0);
  return (raw.y || 0) - gravity.y;
}

function handleMotion(event) {
  const ay  = getLinearAccelY(event);
  const now = Date.now();

  // Count only positive-Y peaks (upstroke).
  // One full up+down motion = one peak crossing THRESHOLD.
  // DEBOUNCE_MS prevents one shake from counting more than once.
  if (ay > THRESHOLD && (now - lastCountTime) > DEBOUNCE_MS) {
    score++;
    lastCountTime = now;

    const el = document.getElementById('score-display');
    el.textContent = score;
    // Restart flash animation
    el.classList.remove('score-flash');
    void el.offsetWidth; // force reflow
    el.classList.add('score-flash');
  }
}

// ============================================================
// iOS 13+ Motion Permission
// ============================================================

async function requestMotionPermission() {
  if (typeof DeviceMotionEvent === 'undefined') {
    // No motion API at all (some desktop browsers) — allow through
    return true;
  }
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const result = await DeviceMotionEvent.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }
  // Android / desktop Chrome — no permission prompt needed
  return true;
}

// ============================================================
// Countdown
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startCountdown() {
  showScreen('countdown');
  countdownAborted = false;
  const el = document.getElementById('countdown-number');
  el.className = 'countdown-number';

  for (let n = 3; n >= 1; n--) {
    if (countdownAborted) return;
    el.textContent = n;
    el.className = 'countdown-number countdown-ping';
    playCountdownBeep();
    await sleep(950);
  }

  if (countdownAborted) return;
  el.textContent = 'GO!';
  el.className = 'countdown-number countdown-go';
  playGoBeep();
  await sleep(500);

  if (!countdownAborted) startRound();
}

// ============================================================
// Round
// ============================================================

function startRound() {
  score         = 0;
  lastCountTime = 0;
  gravity       = { x: 0, y: 0, z: 0 };

  showScreen('game');

  // Reset score display
  const scoreEl = document.getElementById('score-display');
  scoreEl.textContent = '0';
  scoreEl.classList.remove('score-flash');

  // Timer display
  document.getElementById('game-timer').textContent = selectedDuration;

  // Timer bar: reset to full width, then animate to zero over the round duration
  const bar = document.getElementById('timer-bar');
  bar.style.transition = 'none';
  bar.style.width = '100%';
  bar.offsetWidth; // force reflow so the reset takes before we re-enable transition
  bar.style.transition = `width ${selectedDuration}s linear`;
  bar.style.width = '0%';

  // Tick the seconds display
  let remaining = selectedDuration;
  tickInterval = setInterval(() => {
    remaining--;
    if (remaining >= 0) {
      document.getElementById('game-timer').textContent = remaining;
    }
  }, 1000);

  // Begin listening for motion events
  window.addEventListener('devicemotion', handleMotion);

  // Schedule round end
  roundTimer = setTimeout(endRound, selectedDuration * 1000);
}

function endRound() {
  window.removeEventListener('devicemotion', handleMotion);
  clearTimeout(roundTimer);
  clearInterval(tickInterval);
  roundTimer   = null;
  tickInterval = null;

  playEndSound();
  if (navigator.vibrate) {
    navigator.vibrate([150, 80, 150, 80, 300]);
  }

  showResult();
}

// ============================================================
// Leaderboard Storage
// ============================================================

function getScores(duration) {
  try {
    return JSON.parse(localStorage.getItem(`ijerkit_${duration}`)) || [];
  } catch {
    return [];
  }
}

function saveScores(duration, scores) {
  localStorage.setItem(`ijerkit_${duration}`, JSON.stringify(scores));
}

function isTopTen(duration, s) {
  const scores = getScores(duration);
  return scores.length < 10 || s > scores[scores.length - 1].score;
}

function addScore(duration, initials, s) {
  const scores = getScores(duration);
  scores.push({ initials: initials.toUpperCase(), score: s });
  scores.sort((a, b) => b.score - a.score);
  if (scores.length > 10) scores.splice(10);
  saveScores(duration, scores);
}

function renderLeaderboard(duration) {
  const scores = getScores(duration);
  const list   = document.getElementById('leaderboard-list');

  if (scores.length === 0) {
    list.innerHTML = '<p class="lb-empty">No scores yet.<br>Start jerking!</p>';
    return;
  }

  list.innerHTML = scores.map((entry, i) => `
    <div class="lb-row${i === 0 ? ' lb-first' : ''}">
      <span class="lb-rank">${i + 1}</span>
      <span class="lb-initials">${entry.initials}</span>
      <span class="lb-score">${entry.score}</span>
    </div>
  `).join('');
}

function updateLbTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', parseInt(tab.dataset.tab) === currentLbTab);
  });
}

// ============================================================
// Result Screen
// ============================================================

function showResult() {
  showScreen('result');
  document.getElementById('result-score').textContent    = score;
  document.getElementById('result-duration').textContent = selectedDuration;

  const initialsSection = document.getElementById('initials-section');
  const noTopTen        = document.getElementById('no-top-ten');

  if (score > 0 && isTopTen(selectedDuration, score)) {
    initialsSection.style.display = 'flex';
    noTopTen.style.display        = 'none';
    document.querySelectorAll('.initial-input').forEach(i => (i.value = ''));
    document.querySelectorAll('.initial-input')[0].focus();
  } else {
    initialsSection.style.display = 'none';
    noTopTen.style.display        = 'block';
  }
}

// ============================================================
// Initials Inputs — auto-advance focus, uppercase, backspace nav
// ============================================================

function setupInitialsInputs() {
  const inputs = Array.from(document.querySelectorAll('.initial-input'));
  inputs.forEach((input, idx) => {
    input.addEventListener('input', () => {
      // Sanitise: keep only letters, uppercase
      input.value = input.value.replace(/[^a-zA-Z]/, '').toUpperCase();
      if (input.value && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        inputs[idx - 1].focus();
        inputs[idx - 1].value = '';
      }
    });
  });
}

// ============================================================
// Toast
// ============================================================

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('toast-show');
  setTimeout(() => toast.classList.remove('toast-show'), 2500);
}

// ============================================================
// Duration Selection
// ============================================================

function selectDuration(dur) {
  selectedDuration = dur;
  document.querySelectorAll('.dur-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.duration) === dur);
  });
}

// ============================================================
// Init — wire up all events
// ============================================================

function init() {
  // Duration picker
  document.querySelectorAll('.dur-btn').forEach(btn => {
    btn.addEventListener('click', () => selectDuration(parseInt(btn.dataset.duration)));
  });

  // START button — entry point for permission + countdown
  document.getElementById('start-btn').addEventListener('click', async () => {
    ensureAudio();
    const granted = await requestMotionPermission();
    if (!granted) {
      showScreen('denied');
      return;
    }
    startCountdown();
  });

  // Menu → Leaderboard
  document.getElementById('leaderboard-btn').addEventListener('click', () => {
    currentLbTab = selectedDuration;
    updateLbTabs();
    renderLeaderboard(currentLbTab);
    showScreen('leaderboard');
  });

  // Menu → Settings
  document.getElementById('settings-btn').addEventListener('click', () => {
    showScreen('settings');
  });

  // Settings → Menu
  document.getElementById('settings-back-btn').addEventListener('click', () => {
    showScreen('menu');
  });

  // Reset scores
  document.getElementById('reset-scores-btn').addEventListener('click', () => {
    if (!confirm('Reset ALL leaderboard scores? This cannot be undone.')) return;
    ['10', '20', '30'].forEach(d => localStorage.removeItem(`ijerkit_${d}`));
    showToast('Scores cleared!');
  });

  // Leaderboard tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentLbTab = parseInt(tab.dataset.tab);
      updateLbTabs();
      renderLeaderboard(currentLbTab);
    });
  });

  // Leaderboard → Menu
  document.getElementById('lb-back-btn').addEventListener('click', () => {
    showScreen('menu');
  });

  // Result: submit initials → leaderboard
  document.getElementById('submit-initials-btn').addEventListener('click', () => {
    const inputs   = document.querySelectorAll('.initial-input');
    const initials = Array.from(inputs).map(i => (i.value || '_').toUpperCase()).join('');
    addScore(selectedDuration, initials, score);
    inputs.forEach(i => (i.value = ''));
    currentLbTab = selectedDuration;
    updateLbTabs();
    renderLeaderboard(currentLbTab);
    showScreen('leaderboard');
  });

  // Result: skip initials → leaderboard
  document.getElementById('result-leaderboard-btn').addEventListener('click', () => {
    currentLbTab = selectedDuration;
    updateLbTabs();
    renderLeaderboard(currentLbTab);
    showScreen('leaderboard');
  });

  // Result: play again → menu
  document.getElementById('play-again-btn').addEventListener('click', () => {
    showScreen('menu');
  });

  // Denied → menu
  document.getElementById('denied-back-btn').addEventListener('click', () => {
    showScreen('menu');
  });

  // Initials keyboard handling
  setupInitialsInputs();

  // Register service worker for PWA offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // SW registration failure is non-fatal; game still works online
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
