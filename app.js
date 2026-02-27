// =========================
// Schumann Resonance Lab – Extended & Synced Version (v2.6.0)
//
// This script powers the Explore and Meditate views. It provides:
//  - A basic tone generator mapped to the selected Schumann band.
//  - Soundscape mixers: ocean (low‑passed noise), rain (high‑passed noise),
//    birds (discrete singing chirps), and waves (slow 7‑wave sets with a pause).
//  - High‑quality soundscape support: the audio engine can now load
//    48 kHz/24‑bit stereo loops for ocean/rain/birds/waves.  Provide your
//    own files in the assets folder and the app will use them when available.
//  - A breathing visual whose cycle is quantised to multiples of the band period
//    and which displays sync info (band, multiplier and phase).
//  - Autosweep functionality to sweep the interaural phase slider across 0–360°
//    over a user‑defined duration.
//  - Best‑phase marking per band, reused for meditation sessions.
//  - Duplicate soundscape and breathing controls in the Meditate view that stay
//    in sync with the Explore controls.
//  - Simple master volume, carrier pitch and modulation depth sliders.
//
// Version history
// 2.6.0 (February 2026):
//  - Added robust chord/IR asset workflows, externalized UI styles, and
//    meditation-weighted chord recommendations with user preferences.
//
// 2.0.5 (December 2025):
//  - Added a guided scan progress indicator showing tier, step and countdown during the
//    two‑tier phase exploration.  At the end of the scan the app displays a summary
//    listing the top phases and the optimum saved for the current band.
//  - Fixed UI state so the Mark button returns to normal size at the end of a scan
//    and countdown timers are cleared.  Updated documentation accordingly.
//
// 2.0.4 (December 2025):
//  - Added two‑tier phase exploration workflow with coarse and fine scans.
//    The Explore Start button now initiates an automatic discrete search
//    through seven equally spaced phase values (3 s dwell, 1 s fade) and then
//    refines between the two most frequently marked phases using another
//    seven‑segment scan (5 s dwell, 3 s fade).  At the end a fine‑tune
//    sweep can be started to further hone the optimum.  Users tap the Mark
//    button to indicate when a phase feels strongest.  Each mark triggers a
//    short vibration and a pleasant chime.
//  - Implemented persistent storage for best phase history.  The best phase
//    and mark count per Schumann band are now saved in localStorage and
//    automatically restored on load.  The Journal tab now displays the
//    history and provides buttons to export it as JSON or clear it.
//  - Added handlers for the Export history (JSON) and Clear all history
//    buttons in the Journal view.  Export creates a JSON file containing
//    the per‑band phase information.  Clearing history resets the stored
//    data and UI.
//  - Added haptic feedback and audio chime when marking strongest phase.
//  - Updated build and cache versions to v2.0.4.
console.log("app.js loaded");
// ---- Core audio state ----
let audioCtx = null;
let baseOsc = null;
let baseGain = null;
let masterGain = null;
// Noise sources for ocean, rain and waves
let noiseBuffer = null;
let oceanSource = null;
let oceanGain = null;
let rainSource = null;
let rainGain = null;
let wavesSource = null;
let wavesGain = null;
// Optional high‑quality streaming sources for large soundscapes (birds/waves)
let birdsSource = null;
let birdsGain = null;
let birdsStreamEl = null;
let birdsIsSample = false;
let wavesStreamEl = null;
let wavesIsSample = false;
// Birds pattern timer
let birdsPatternTimer = null;
// Waves pattern timer
let wavesPatternTimer = null;

// High‑quality audio buffers for soundscapes (e.g., ocean)
// These will be loaded asynchronously. If they remain null, fallback to noise-based patterns.
let oceanSampleBuffer = null;
let rainSampleBuffer = null;
let birdsSampleBuffer = null;
let wavesSampleBuffer = null;
// Analyser for scope visualisation
let analyser = null;
let scopeData = null;
let scopeCtx = null;
let scopeAnimId = null;

// Stimulation mode.  Defaults to iso (amplitude modulation).  Valid values: 'am', 'binaural', 'both'
let stimulationMode = 'am';

// Additional oscillators and nodes created by the current mode.  These will be
// stored here so they can be stopped/cleaned up when stopping or restarting.
let extraNodes = [];

// Chord progression instrument.  When set to something other than 'none'
// the Lab will play a slow evolving chord progression using the selected
// waveform.  Valid values: 'none', 'piano', 'harp', 'synth', 'guitar'.
let chordInstrument = 'none';

// Manifest‑driven chord loops
// chordManifest holds the parsed JSON mapping instruments to arrays of loop descriptors.
// Each descriptor must have a `file` property and may have a `name` property.
let chordManifest = null;
// Optional recommendation preferences loaded from assets/chords/preferences.json.
// This lets you prioritize specific favorite chord names/keywords.
let chordPreferences = null;
// Name of the currently selected loop file (if any) for the chosen instrument.
let selectedChordLoop = null;
// BufferSource for the currently playing chord loop.  When a loop is active
// this node is stored here so it can be stopped on restart.
let chordBufferSource = null;
// Cache of decoded chord loop buffers by instrument and file name.
const chordBufferCache = {};

// iOS Safari can interrupt AudioContext when the page is backgrounded.
// On return to foreground we attempt a safe resume so users don't need to
// manually refresh the page after app switching.
function resumeAudioContextIfInterrupted() {
  if (!audioCtx) return;
  const state = audioCtx.state;
  if (state === 'suspended' || state === 'interrupted') {
    audioCtx.resume().catch(() => {});
  }
}

// ----- Band‑driven stereo motion (v2.5.0) -----
// To provide a gentle spatial movement of the soundscapes and chord layers
// at the selected Schumann band rate we introduce a global low‑frequency
// oscillator (LFO) whose output modulates the pan parameter of a set of
// StereoPanner nodes.  The carrier tone is deliberately excluded from
// this modulation to preserve the accuracy of the binaural beat or
// isochronic pulses.  The motionLfo and motionGainNode are created
// whenever the audio graph is started and cleaned up on stop.  Each
// soundscape or chord output is routed through its own StereoPanner
// instance whose pan parameter is controlled by the shared motionLfo.
let motionLfo = null;
let motionGainNode = null;
// Collection of panners receiving motion modulation.  Cleared on restart.
let motionPanners = [];

// Impulse response reverb
// Name of the currently selected IR ('none', 'forest', 'temple').
let selectedIR = 'none';
// Cache of decoded impulse responses by name.
const irBuffers = {};

// Current chord oscillators and timer for cycling between chords.  When
// active, chordTimer holds the interval ID and chordOscs stores the
// oscillators so they can be stopped when restarting audio.
let chordOscs = [];
let chordTimer = null;
let chordIndex = 0;

/**
 * Start the chord progression based on the current audible frequency and
 * selected instrument.  This function first stops any existing
 * progression, then schedules a repeating sequence of chords.  Each
 * chord plays for 30 seconds and consists of three notes forming a
 * major-like triad.  The exact waveforms vary by instrument:
 *  - piano → sine
 *  - harp  → triangle
 *  - synth → sawtooth
 *  - guitar→ square
 */
function startChordProgression(audibleHz) {
  // Always clear any existing progression or loop
  stopChordProgression();
  // Stop any pre‑rendered loop
  stopChordBuffer();
  if (!audioCtx || chordInstrument === 'none') return;
  // If a manifest provides loops for this instrument and a loop is selected,
  // attempt to load and play the loop.  Fallback to oscillator triads if
  // loading fails or no loop is selected.
  const loops = chordManifest && chordManifest[chordInstrument];
  if (loops && selectedChordLoop) {
    // Launch the pre‑rendered chord loop
    startChordLoop();
    return;
  }
  // Otherwise synthesise a simple triad progression
  const waveformMap = {
    piano: 'sine',
    harp: 'triangle',
    synth: 'sawtooth',
    guitar: 'square'
  };
  const chordGainMap = {
    piano: 0.10,
    harp: 0.10,
    synth: 0.09,
    guitar: 0.16
  };
  const waveform = waveformMap[chordInstrument] || 'sine';
  const chordGainValue = chordGainMap[chordInstrument] || 0.10;
  // Define a basic chord progression: major triads and related chords
  const chords = [
    [1, 5 / 4, 3 / 2],    // Major triad
    [9 / 8, 11 / 8, 5 / 3],// Suspended/maj7 style
    [4 / 3, 5 / 3, 2]     // Subdominant triad
  ];
  chordIndex = 0;
  const playChord = () => {
    // Stop previous oscillators
    chordOscs.forEach((node) => {
      try { node.stop(); } catch {}
      try { node.disconnect(); } catch {}
    });
    chordOscs = [];
    const multipliers = chords[chordIndex % chords.length];
    // Create a single panner for the entire chord so that all three notes
    // share the same spatial motion.  Modulate its pan with the global
    // motion LFO.  Register this panner for cleanup.
    const chordPan = audioCtx.createStereoPanner();
    if (motionGainNode) {
      motionGainNode.connect(chordPan.pan);
    }
    motionPanners.push(chordPan);
    extraNodes.push(chordPan);
    multipliers.forEach((mult) => {
      const osc = audioCtx.createOscillator();
      osc.type = waveform;
      osc.frequency.value = audibleHz * mult;
      const g = audioCtx.createGain();
      g.gain.value = chordGainValue;
      // Route each note into the shared panner instead of directly to the master
      osc.connect(g).connect(chordPan).connect(masterGain);
      osc.start();
      chordOscs.push(osc, g);
    });
    chordIndex++;
  };
  playChord();
  chordTimer = setInterval(playChord, 30000);
}

/**
 * Stop the current chord progression by clearing the timer and stopping
 * all chord oscillators.
 */
function stopChordProgression() {
  if (chordTimer) {
    clearInterval(chordTimer);
    chordTimer = null;
  }
  chordOscs.forEach((node) => {
    try { node.stop(); } catch {}
    try { node.disconnect(); } catch {}
  });
  chordOscs = [];

  // Also stop any pre‑rendered loop
  stopChordBuffer();
}

/**
 * Stop any currently playing pre‑rendered chord loop.  If a BufferSource has
 * been created to play a loop, this stops and disconnects it.
 */
function stopChordBuffer() {
  if (chordBufferSource) {
    try { chordBufferSource.stop(); } catch {}
    try { chordBufferSource.disconnect(); } catch {}
    chordBufferSource = null;
  }
}

/**
 * Load a chord manifest from assets/chords/manifest.json.  The manifest maps
 * instrument names to arrays of loop descriptors.  Called once on
 * initialisation.  Errors are silently ignored; manifest remains null if
 * the file cannot be loaded.
 */
async function loadChordManifest() {
  try {
    const response = await fetch('assets/chords/manifest.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Failed to fetch manifest');
    const json = await response.json();
    chordManifest = json || null;
  } catch (e) {
    chordManifest = null;
  }
}

/**
 * Load optional chord recommendation preferences.
 * Expected file: assets/chords/preferences.json
 * Example keys:
 *  - favoriteKeywords: ["Cm", "Cmin", "Csus2"]
 *  - meditationKeywords: ["sus", "add9", "maj7", "drone", "pad"]
 *  - bpmRange: [110, 140]
 *  - avoidKeywords: ["stacc", "pluck", "drum", "perc", "arp"]
 */
async function loadChordPreferences() {
  try {
    const response = await fetch('assets/chords/preferences.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Failed to fetch preferences');
    const json = await response.json();
    chordPreferences = json || null;
  } catch (e) {
    chordPreferences = null;
  }
}

function scoreChordLoop(loop) {
  const text = `${loop.name || ''} ${loop.file || ''}`.toLowerCase();
  let score = 0;

  const bpmMatch = text.match(/(^|[^0-9])(\d{2,3})([^0-9]|$)/);
  const bpm = bpmMatch ? parseInt(bpmMatch[2], 10) : null;
  const range = Array.isArray(chordPreferences && chordPreferences.bpmRange)
    ? chordPreferences.bpmRange
    : [110, 140];
  if (Number.isFinite(bpm)) {
    if (bpm >= range[0] && bpm <= range[1]) score += 12;
    if (bpm > 155) score -= 8;
  }

  // Mild default meditation weighting.
  const basePos = ['minor', 'min', 'm_', 'sus', 'maj7', 'add9', 'pad', 'drone', 'soft', 'warm'];
  basePos.forEach((k) => {
    if (text.includes(k)) score += 6;
  });
  const baseNeg = ['drum', 'perc', 'stacc', 'pluck', 'arp', 'lead'];
  baseNeg.forEach((k) => {
    if (text.includes(k)) score -= 8;
  });

  // User-specific preference overrides from preferences.json.
  const favorites = Array.isArray(chordPreferences && chordPreferences.favoriteKeywords)
    ? chordPreferences.favoriteKeywords
    : [];
  favorites.forEach((k) => {
    if (k && text.includes(String(k).toLowerCase())) score += 45;
  });
  const medKeys = Array.isArray(chordPreferences && chordPreferences.meditationKeywords)
    ? chordPreferences.meditationKeywords
    : [];
  medKeys.forEach((k) => {
    if (k && text.includes(String(k).toLowerCase())) score += 14;
  });
  const avoidKeys = Array.isArray(chordPreferences && chordPreferences.avoidKeywords)
    ? chordPreferences.avoidKeywords
    : [];
  avoidKeys.forEach((k) => {
    if (k && text.includes(String(k).toLowerCase())) score -= 18;
  });

  return score;
}

function sortChordLoops(loops) {
  const withScore = loops.map((loop) => ({ loop, score: scoreChordLoop(loop) }));
  withScore.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(a.loop.name || a.loop.file).localeCompare(String(b.loop.name || b.loop.file));
  });
  return withScore;
}

function getLoopCategory(entry) {
  const file = String((entry && entry.file) || '').toLowerCase();
  if (file.includes('user_reference__')) return 'Reference / Favorites';
  if (file.includes('mammoth_synth_chords__')) return 'Mammoth Synth Chords';
  if (file.includes('schumann_app_audio_samples__')) return 'Schumann App Audio Samples';
  if (file.includes('ck2_')) return 'Cool Keys';
  return 'Other';
}

/**
 * Ensure that an AudioBuffer for the requested instrument and file is
 * available in the cache.  If not already cached, fetches the WAV file
 * from assets/chords, decodes it and caches the resulting buffer.  Returns
 * the decoded AudioBuffer or null on failure.
 * @param {string} instrument
 * @param {string} fileName
 */
async function ensureChordBuffer(instrument, fileName) {
  if (!audioCtx) return null;
  if (!chordBufferCache[instrument]) chordBufferCache[instrument] = {};
  if (chordBufferCache[instrument][fileName]) {
    return chordBufferCache[instrument][fileName];
  }
  try {
    const resp = await fetch(`assets/chords/${fileName}`, { cache: 'no-cache' });
    if (!resp.ok) throw new Error('failed');
    const arrayBuf = await resp.arrayBuffer();
    const buffer = await audioCtx.decodeAudioData(arrayBuf);
    chordBufferCache[instrument][fileName] = buffer;
    return buffer;
  } catch (e) {
    return null;
  }
}

/**
 * Begin playing the selected pre‑rendered chord loop.  Stops any existing
 * loop first.  If the buffer cannot be loaded, this function silently
 * returns and the caller will fall back to synthesised chords.
 */
async function startChordLoop() {
  stopChordBuffer();
  if (!audioCtx || !chordInstrument || chordInstrument === 'none' || !selectedChordLoop) return;
  const buffer = await ensureChordBuffer(chordInstrument, selectedChordLoop);
  if (!buffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const g = audioCtx.createGain();
  // Play loops quietly relative to other elements.  Adjust as needed.
  g.gain.value = 0.3;
  // Route the loop through a panner modulated by the band LFO
  const loopPan = audioCtx.createStereoPanner();
  if (motionGainNode) {
    motionGainNode.connect(loopPan.pan);
  }
  motionPanners.push(loopPan);
  extraNodes.push(loopPan);
  src.connect(g).connect(loopPan).connect(masterGain);
  src.start();
  chordBufferSource = src;
}

function getAudioBufferRms(buffer) {
  if (!buffer) return 0;
  const channels = buffer.numberOfChannels || 0;
  if (!channels) return 0;
  let sum = 0;
  let count = 0;
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      sum += v * v;
      count++;
    }
  }
  return count ? Math.sqrt(sum / count) : 0;
}

function getCompensatedIrWetGain(name, buffer) {
  // Start with mode-specific defaults.
  const baseWet = name === 'temple' ? 0.42 : 0.58;
  const rms = getAudioBufferRms(buffer);
  if (!Number.isFinite(rms) || rms <= 0) return baseWet;
  // Normalize wildly different IR loudness profiles to a comparable wet level.
  const targetRms = 0.12;
  const comp = Math.max(0.05, Math.min(1.5, targetRms / rms));
  return Math.max(0.03, Math.min(0.95, baseWet * comp));
}

/**
 * Load an impulse response buffer for the given name. Caches the result to
 * avoid repeated decodes. Returns a promise that resolves with the
 * AudioBuffer or null if loading fails.
 * @param {string} name
 */
async function loadIRBuffer(name) {
  if (!audioCtx || !name || name === 'none') return null;
  if (irBuffers[name]) return irBuffers[name];

  const keywordMap = {
    forest: ['forest', 'wheldrake', 'wood'],
    temple: ['temple', 'minster', 'church', 'cathedral', 'hall']
  };
  const candidateNames = {
    forest: ['forest.wav', 'Forest.wav', 'forest-ir.wav', 'forest_ir.wav'],
    temple: ['temple.wav', 'Temple.wav', 'temple-ir.wav', 'york-minster.wav', 'minster.wav']
  };

  const urls = (candidateNames[name] || [`${name}.wav`]).map((f) => `assets/ir/${f}`);
  const files = await listFilesInDir('assets/ir/');
  const discovered = pickBestMatch(files, (keywordMap[name] && keywordMap[name][0]) || name);
  if (discovered) {
    urls.unshift(`assets/ir/${discovered}`);
  }

  for (const url of urls) {
    try {
      const resp = await fetch(url, { cache: 'no-cache' });
      if (!resp.ok) continue;
      const arrayBuf = await resp.arrayBuffer();
      const buf = await audioCtx.decodeAudioData(arrayBuf);
      const rms = getAudioBufferRms(buf);
      console.info(`[IR] loaded ${name}: ${buf.duration.toFixed(2)}s, rms=${rms.toFixed(5)}`);
      irBuffers[name] = buf;
      return buf;
    } catch (e) {
      // Continue trying candidates.
    }
  }
  return null;
}

/**
 * Update the chord loop UI whenever the instrument or manifest changes.  If
 * the manifest has not been loaded or the selected instrument has no
 * entries the loop selector is hidden.  Otherwise the selector is
 * populated with options and made visible.  The first option becomes
 * selected by default.
 */
function updateChordLoopUI() {
  if (!chordLoopRow || !chordLoopSelect) return;
  // Hide by default
  // Always hide by default
  chordLoopRow.hidden = true;
  chordLoopRow.style.display = 'none';
  chordLoopSelect.disabled = false;
  selectedChordLoop = null;
  // Only show loops when there is a manifest and an instrument other than none
  if (!chordManifest || !chordInstrument || chordInstrument === 'none') {
    return;
  }
  const loops = chordManifest[chordInstrument];
  if (!Array.isArray(loops) || loops.length === 0) {
    if (chordInstrument === 'guitar') {
      chordLoopSelect.innerHTML = '';
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No guitar loops installed (using synth fallback)';
      chordLoopSelect.appendChild(opt);
      chordLoopSelect.disabled = true;
      chordLoopRow.hidden = false;
      chordLoopRow.style.display = '';
    }
    return;
  }
  chordLoopSelect.disabled = false;
  const rankedLoops = sortChordLoops(loops);
  const previousSelection = selectedChordLoop;
  // Populate selector with categories to keep large libraries navigable.
  chordLoopSelect.innerHTML = '';

  // Top recommendations (small, immediately accessible set).
  const topRecommended = rankedLoops.slice(0, Math.min(8, rankedLoops.length));
  const recommendedGroup = document.createElement('optgroup');
  recommendedGroup.label = 'Recommended';
  topRecommended.forEach(({ loop: entry }, idx) => {
    const opt = document.createElement('option');
    opt.value = entry.file;
    opt.textContent = idx === 0 ? `Top pick: ${entry.name || entry.file}` : (entry.name || entry.file);
    recommendedGroup.appendChild(opt);
  });
  chordLoopSelect.appendChild(recommendedGroup);

  // Remaining loops grouped by source/category.
  const topSet = new Set(topRecommended.map(({ loop }) => loop.file));
  const groupOrder = ['Reference / Favorites', 'Mammoth Synth Chords', 'Schumann App Audio Samples', 'Cool Keys', 'Other'];
  const grouped = new Map(groupOrder.map((name) => [name, []]));
  rankedLoops.forEach(({ loop }) => {
    if (topSet.has(loop.file)) return;
    const category = getLoopCategory(loop);
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(loop);
  });
  groupOrder.forEach((category) => {
    const entries = grouped.get(category) || [];
    if (!entries.length) return;
    const group = document.createElement('optgroup');
    group.label = category;
    entries.forEach((entry) => {
      const opt = document.createElement('option');
      opt.value = entry.file;
      opt.textContent = entry.name || entry.file;
      group.appendChild(opt);
    });
    chordLoopSelect.appendChild(group);
  });

  // Restore previous selection when possible.
  if (previousSelection) {
    const hasPrev = Array.from(chordLoopSelect.options).some((o) => o.value === previousSelection);
    if (hasPrev) chordLoopSelect.value = previousSelection;
  }
  selectedChordLoop = chordLoopSelect.value;
  chordLoopRow.hidden = false;
  chordLoopRow.style.display = '';
}

// Autosweep state
let sweepIsRunning = false;
let sweepAnimId = null;

// Best‑phase memory per band (key = frequency string)
const bestPhaseByBand = {};

// ---- Persistent best‑phase storage & history UI ----
/**
 * Load previously saved best phase history from localStorage.
 * Returns an object mapping band frequency strings to {phase, count}.
 */
function loadPhaseHistory() {
  try {
    const data = localStorage.getItem('bestPhaseHistory');
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/** Save current bestPhaseByBand object to localStorage. */
function savePhaseHistory() {
  try {
    localStorage.setItem('bestPhaseHistory', JSON.stringify(bestPhaseByBand));
  } catch {}
}

/** Render best phase history list into the Journal history container. */
function renderPhaseHistory() {
  if (!historyContainer) return;
  historyContainer.innerHTML = '';
  const keys = Object.keys(bestPhaseByBand);
  if (!keys.length) {
    historyContainer.innerHTML = '<p class="small">No history yet.</p>';
    return;
  }
  const frag = document.createDocumentFragment();
  keys.sort().forEach((key) => {
    const info = bestPhaseByBand[key];
    const div = document.createElement('div');
    div.className = 'history-entry';
    const label = freqSelect ? freqSelect.querySelector(`option[value="${key}"]`) : null;
    const bandLabel = label ? label.textContent : `${key}\u00A0Hz`;
    div.innerHTML = `<strong>${bandLabel}:</strong> ${info.phase.toFixed(0)}° (marks: ${info.count})`;
    frag.appendChild(div);
  });
  historyContainer.appendChild(frag);
}

// ---- Two-tier phase exploration state ----
let scanning = false;
let scanTier = 0;
let scanPhases = [];
let scanCounts = [];
let scanIndex = 0;
let scanTimeoutId = null;

// ---- UI helper ----
const $ = (id) => document.getElementById(id);

// Tabs / views
const tabs  = Array.from(document.querySelectorAll('.tab'));
const views = Array.from(document.querySelectorAll('.view'));

// Explore / Meditate controls
const freqSelect    = $('freqSelect');
const medFreqSelect = $('medFreqSelect');

const explorePlay = $('explorePlay');
const exploreStop = $('exploreStop');
const medPlay     = $('medPlay');
const medStop     = $('medStop');

// Session timer
const sessionMinutes  = $('sessionMinutes');
const sessionLabel    = $('sessionLabel');
const medTimerDisplay = $('medTimerDisplay');
let medTimerId  = null;
let medEndTime  = null;

// Phase sweep & best‑phase controls
const phaseRange      = $('phaseRange');
const phaseLabel      = $('phaseLabel');
const sweepSeconds    = $('sweepSeconds');
const sweepLabel      = $('sweepLabel');
const sweepToggle     = $('sweepToggle');
const markStrongest   = $('markStrongest');
const bestPhaseDisplay= $('bestPhaseDisplay');
const clearBestPhase  = $('clearBestPhase');
const medPhaseLabel   = $('medPhaseLabel');

// Scan progress & summary elements
const scanProgress   = $('scanProgress');
const scanSummary    = $('scanSummary');
let scanTierElem     = null;
let scanStepElem     = null;
let scanCountdownElem= null;
if (scanProgress) {
  scanTierElem      = scanProgress.querySelector('.scan-tier');
  scanStepElem      = scanProgress.querySelector('.scan-step');
  scanCountdownElem = scanProgress.querySelector('.scan-countdown');
}
let countdownInterval = null;

/**
 * Start a countdown display for the current scan dwell period.
 * Duration is provided in milliseconds. The countdown updates once per second.
 */
function startCountdown(duration) {
  if (!scanCountdownElem) return;
  clearInterval(countdownInterval);
  let remaining = Math.ceil(duration / 1000);
  scanCountdownElem.textContent = `${remaining}s`;
  countdownInterval = setInterval(() => {
    remaining--;
    if (remaining < 0) remaining = 0;
    scanCountdownElem.textContent = `${remaining}s`;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
    }
  }, 1000);
}

// Carrier / depth / volume sliders
const carrierRange = $('carrierRange');
const carrierLabel = $('carrierLabel');
const depthRange   = $('depthRange');
const depthLabel   = $('depthLabel');
const volumeRange  = $('volumeRange');
const volumeLabel  = $('volumeLabel');
const toneMixRange = $('toneMixRange');
const toneMixLabel = $('toneMixLabel');

// Soundscape controls (Explore)
const oceanRange = $('oceanRange');
const oceanLabel = $('oceanLabel');
const rainRange  = $('rainRange');
const rainLabel  = $('rainLabel');
const birdsRange = $('birdsRange');
const birdsLabel = $('birdsLabel');
const wavesRange = $('wavesRange');
const wavesLabel = $('wavesLabel');

// Soundscape controls (Meditate)
const medOceanRange = $('medOceanRange');
const medOceanLabel = $('medOceanLabel');
const medRainRange  = $('medRainRange');
const medRainLabel  = $('medRainLabel');
const medBirdsRange = $('medBirdsRange');
const medBirdsLabel = $('medBirdsLabel');
const medWavesRange = $('medWavesRange');
const medWavesLabel = $('medWavesLabel');

// Breathing controls (Explore)
const breathSeconds   = $('breathSeconds');
const breathLabel     = $('breathLabel');
const breathOrb       = $('breathOrb');
const breathSyncLabel = $('breathSyncLabel');

// Breathing controls (Meditate)
const medBreathSeconds   = $('medBreathSeconds');
const medBreathLabel     = $('medBreathLabel');
const medBreathOrb       = $('medBreathOrb');
const medBreathSyncLabel = $('medBreathSyncLabel');

// Journal controls (Med tab)
const journalNote      = $('journalNote');
const saveNoteBtn      = $('saveNote');
const saveNoteStatus   = $('saveNoteStatus');
const historyContainer = $('historyContainer');
const exportHistoryBtn = $('exportHistory');
const clearHistoryBtn  = $('clearHistory');

// Journal entry controls (Journal tab)
const intentionNote     = $('intentionNote');
const thoughtsNote      = $('thoughtsNote');
const gratitudeNote     = $('gratitudeNote');
const integrationNote   = $('integrationNote');
const saveJournalEntryBtn = $('saveJournalEntry');
const saveJournalStatus   = $('saveJournalStatus');
const journalEntriesContainer = $('journalEntriesContainer');
const exportJournalBtn   = $('exportJournal');
const clearJournalBtn    = $('clearJournal');
// New buttons for clearing inputs and hiding entries in UI
const clearJournalFieldsBtn = $('clearJournalFields');
const hideJournalEntriesBtn = $('hideJournalEntries');

// New button to export journal entries via the Web Share API (e.g. to iOS Notes)
const exportJournalToNotesBtn = $('exportJournalToNotes');

// Helper to load journal entries from localStorage
function loadJournalEntries() {
  try {
    const data = localStorage.getItem('journalEntries');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Helper to save journal entries to localStorage
function saveJournalEntries(list) {
  try {
    localStorage.setItem('journalEntries', JSON.stringify(list));
  } catch {}
}

// Render journal entries list into the UI
function renderJournalEntries() {
  if (!journalEntriesContainer) return;
  const entries = loadJournalEntries();
  journalEntriesContainer.innerHTML = '';
  if (!entries.length) {
    journalEntriesContainer.innerHTML = '<p class="small">No journal entries yet.</p>';
    return;
  }
  // Create a document fragment for efficiency
  const frag = document.createDocumentFragment();
  entries.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'journal-entry';
    const dt = new Date(entry.timestamp || 0);
    const timeStr = dt.toLocaleString();
    let html = `<p class="small"><strong>${timeStr}</strong></p>`;
    if (entry.intention) {
      html += `<p><em>Intention:</em> ${entry.intention}</p>`;
    }
    if (entry.thoughts) {
      html += `<p><em>Thoughts:</em> ${entry.thoughts}</p>`;
    }
    if (entry.gratitude) {
      html += `<p><em>Gratitude:</em> ${entry.gratitude}</p>`;
    }
    if (entry.integration) {
      html += `<p><em>Integration:</em> ${entry.integration}</p>`;
    }
    card.innerHTML = html;
    frag.appendChild(card);
  });
  journalEntriesContainer.appendChild(frag);
}

// Save a new journal entry
function handleSaveJournalEntry() {
  if (!intentionNote || !thoughtsNote || !gratitudeNote || !integrationNote || !saveJournalStatus) return;
  const intention = intentionNote.value.trim();
  const thoughts  = thoughtsNote.value.trim();
  const gratitude = gratitudeNote.value.trim();
  const integration = integrationNote.value.trim();
  if (!intention && !thoughts && !gratitude && !integration) {
    saveJournalStatus.textContent = 'Please enter at least one field.';
    return;
  }
  const entries = loadJournalEntries();
  entries.push({
    timestamp: Date.now(),
    intention,
    thoughts,
    gratitude,
    integration
  });
  saveJournalEntries(entries);
  // Clear inputs
  intentionNote.value = '';
  thoughtsNote.value = '';
  gratitudeNote.value = '';
  integrationNote.value = '';
  saveJournalStatus.textContent = 'Journal entry saved.';
  renderJournalEntries();
}

// Export journal entries to a plain text file and share/copy if possible
function handleExportJournal() {
  const entries = loadJournalEntries();
  if (!entries.length) {
    alert('No journal entries to export.');
    return;
  }
  let content = '';
  entries.forEach((entry, index) => {
    const dt = new Date(entry.timestamp || 0);
    content += `Entry ${index + 1} - ${dt.toLocaleString()}\n`;
    if (entry.intention) content += `Intention: ${entry.intention}\n`;
    if (entry.thoughts)  content += `Thoughts: ${entry.thoughts}\n`;
    if (entry.gratitude) content += `Gratitude: ${entry.gratitude}\n`;
    if (entry.integration) content += `Integration: ${entry.integration}\n`;
    content += '\n';
  });
  // Create a blob and temporary link for download
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'schumann_journal.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export journal entries using the Web Share API (e.g. to iOS Notes).
// If sharing isn't supported or fails, fall back to a plain text download.
function handleExportJournalToNotes() {
  const entries = loadJournalEntries();
  if (!entries.length) {
    alert('No journal entries to export.');
    return;
  }
  let content = '';
  entries.forEach((entry, index) => {
    const dt = new Date(entry.timestamp || 0);
    content += `Entry ${index + 1} - ${dt.toLocaleString()}\n`;
    if (entry.intention) content += `Intention: ${entry.intention}\n`;
    if (entry.thoughts)  content += `Thoughts: ${entry.thoughts}\n`;
    if (entry.gratitude) content += `Gratitude: ${entry.gratitude}\n`;
    if (entry.integration) content += `Integration: ${entry.integration}\n`;
    content += '\n';
  });
  // Attempt to share using the Web Share API
  if (navigator.share) {
    navigator.share({
      title: 'Schumann Journal',
      text: content.trim()
    }).catch((err) => {
      // If share is cancelled or fails, fall back to file download
      console.warn('Share failed or was cancelled:', err);
      handleExportJournal();
    });
  } else {
    // Fallback to file download if Web Share API not available
    handleExportJournal();
  }
}

// Clear all journal entries
function handleClearJournal() {
  if (!confirm('Clear all journal entries? This cannot be undone.')) return;
  saveJournalEntries([]);
  renderJournalEntries();
}

// Export best‑phase history to a JSON file for download
function handleExportHistory() {
  const keys = Object.keys(bestPhaseByBand);
  if (!keys.length) {
    alert('No history to export.');
    return;
  }
  const blob = new Blob([JSON.stringify(bestPhaseByBand, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'schumann_history.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Clear all saved best‑phase history
function handleClearHistory() {
  if (!confirm('Clear all phase history? This will remove all saved best phases.')) {
    return;
  }
  for (const k in bestPhaseByBand) {
    if (Object.prototype.hasOwnProperty.call(bestPhaseByBand, k)) {
      delete bestPhaseByBand[k];
    }
  }
  try {
    localStorage.removeItem('bestPhaseHistory');
  } catch {}
  updateBestPhaseDisplay();
  updateMedPhaseLabel();
  renderPhaseHistory();
}

// Clear only the input fields in the new journal entry form
function handleClearJournalFields() {
  if (intentionNote) intentionNote.value = '';
  if (thoughtsNote)  thoughtsNote.value = '';
  if (gratitudeNote) gratitudeNote.value = '';
  if (integrationNote) integrationNote.value = '';
  if (saveJournalStatus) saveJournalStatus.textContent = '';
}

// Hide the journal entries list from the UI without deleting storage
function handleHideJournalEntries() {
  if (!journalEntriesContainer) return;
  // Simply clear the container; the data in localStorage remains intact
  journalEntriesContainer.innerHTML = '<p class="small">Journal entries hidden.</p>';
}

// List of multipliers for breathing (multiples of Schumann period)
// Breath cycle multipliers: lowest value ~2s for fundamental (16×T) up to ~16s (128×T)
const BREATH_MULTIPLIERS = [16, 24, 32, 40, 48, 64, 80, 96, 112, 128];

// ---- Audio initialisation helpers ----
function ensureAudio() {
  // Ensure we have a single AudioContext. Use a higher sample rate (96 kHz) to
  // support mixing of high‑quality soundscapes (e.g., 48 kHz 24‑bit files) and avoid
  // unwanted aliasing when combining binaural tones and ambient audio. If the
  // device cannot support 96 kHz, the browser will silently fall back to the
  // system’s preferred sample rate.
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 96000 });
    } catch (err) {
      // Fallback to default if sample rate specification is not supported
      console.warn('96 kHz sample rate not supported, using default:', err);
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
}

// Attempt to load a high‑quality ocean sound sample. This should be a 48 kHz, 24‑bit
// recording stored alongside the app files (e.g., ocean-wave-1.wav). The function
// caches the decoded AudioBuffer for subsequent use. If it fails, the app will
// continue to use noise-based ocean sounds.
// --- Soundscape asset resolution helpers (v2.5.2) ---------------------------
// On Windows + simple static servers, missing/renamed files can cause 404s.
// To make soundscapes robust, we try multiple candidate filenames and, if the
// server exposes a directory listing (http-server does by default), we can
// auto-discover the best match by keyword.
async function listFilesInDir(dirUrl) {
  try {
    const res = await fetch(dirUrl, { cache: 'no-store' });
    if (!res.ok) return [];
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const txt = await res.text();
    // Directory listing is usually HTML; manifest could be JSON.
    if (ct.includes('application/json')) {
      const data = JSON.parse(txt);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.files)) return data.files;
      return [];
    }
    const files = [];
    const re = /href="([^"]+)"/g;
    let m;
    while ((m = re.exec(txt)) !== null) {
      const href = m[1];
      if (!href) continue;
      if (href.startsWith('?')) continue;
      if (href.includes('..')) continue;
      // Normalize to basename
      const base = href.split('/').filter(Boolean).pop();
      if (base) files.push(base);
    }
    return Array.from(new Set(files));
  } catch (e) {
    return [];
  }
}

function pickBestMatch(files, keyword) {
  const k = (keyword || '').toLowerCase();
  const audioFiles = files.filter(f => /\.(wav|mp3|ogg)$/i.test(f));
  // Prefer keyword-containing, then .wav over others.
  const scored = audioFiles.map(f => {
    const lower = f.toLowerCase();
    let score = 0;
    if (lower.includes(k)) score += 100;
    if (lower.endsWith('.wav')) score += 10;
    if (lower.includes('48k')) score += 2;
    if (lower.includes('24')) score += 1;
    return { f, score };
  }).sort((a,b)=>b.score-a.score);
  return scored.length ? scored[0].f : null;
}

async function fetchFirstDecodedAudioBuffer(urls) {
  ensureAudio();
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      const decoded = await audioCtx.decodeAudioData(buf);
      console.info('[soundscape] loaded:', url);
      return decoded;
    } catch (e) {
      // try next
    }
  }
  return null;
}

function createMediaLoopSource(url) {
  ensureAudio();
  const el = new Audio(url);
  el.loop = true;
  el.preload = 'auto';
  el.crossOrigin = 'anonymous';
  const src = audioCtx.createMediaElementSource(el);
  return { el, src };
}

async function resolveSoundscapeBuffer(kind) {
  // kind: 'ocean' | 'rain' | 'birds' | 'waves'
  const baseDir = 'assets/audio/soundscapes/';
  const k = (kind || '').toLowerCase();
  const candidateNames = {
    ocean: ['ocean.wav','ocean.mp3','Ocean.wav','Ocean.mp3','ocean-wave-1.wav','ocean_wave.wav','ocean-waves.wav','oceanwaves.wav'],
    rain:  ['rain.wav','rain.mp3','Rain.wav','Rain.mp3','rain-1.wav','rain_loop.wav','rainloop.wav'],
    birds: ['birds.wav','birds.mp3','Birds.wav','Birds.mp3','bird.wav','birdsong.wav','bird-song.wav','birds_loop.wav','birdsloop.wav'],
    waves: ['waves.wav','waves.mp3','Waves.wav','Waves.mp3','wave.wav','wave_loop.wav','waveloop.wav']
  };
  const urls = (candidateNames[k] || []).map(n => baseDir + n);

  // If directory listing is available, try to discover a best match by keyword.
  const files = await listFilesInDir(baseDir);
  const discovered = pickBestMatch(files, k);
  if (discovered) urls.unshift(baseDir + discovered);

  return await fetchFirstDecodedAudioBuffer(urls);
}
// ---------------------------------------------------------------------------

async function loadOceanSample() {
  if (oceanSampleBuffer || typeof fetch === 'undefined') return oceanSampleBuffer;
  ensureAudio();
  try {
    oceanSampleBuffer = await resolveSoundscapeBuffer('ocean');
    return oceanSampleBuffer;
  } catch (err) {
    console.warn('Failed to load ocean sample:', err);
    return null;
  }
}

// Attempt to load a high‑quality rain sound sample.  This should be a seamless 48 kHz,
// 24‑bit stereo loop stored alongside the app files (e.g., rain.wav).  If loading
// fails or no file is present, rainSampleBuffer will remain null and the app
// will continue to use the high‑passed noise-based rain sound.
async function loadRainSample() {
  if (rainSampleBuffer || typeof fetch === 'undefined') return rainSampleBuffer;
  ensureAudio();
  try {
    rainSampleBuffer = await resolveSoundscapeBuffer('rain');
    return rainSampleBuffer;
  } catch (err) {
    console.warn('Failed to load rain sample:', err);
    return null;
  }
}

// Attempt to load a high‑quality birds sound sample.  Provide your own file
// (e.g., birds.wav) for a lifelike birdsong loop.  If the file cannot be loaded,
// the existing tonal chirp pattern will continue to play.
async function loadBirdsSample() {
  if (birdsSampleBuffer || typeof fetch === 'undefined') return birdsSampleBuffer;
  ensureAudio();
  try {
    birdsSampleBuffer = await resolveSoundscapeBuffer('birds');
    return birdsSampleBuffer;
  } catch (err) {
    console.warn('Failed to load birds sample:', err);
    return null;
  }
}

// Attempt to load a high‑quality waves sound sample.  Provide your own file
// (e.g., waves.wav) recorded at 48 kHz, 24‑bit with natural rhythm.  If loading fails,
// the app falls back to the slow seven‑wave pattern using noise.
async function loadWavesSample() {
  if (wavesSampleBuffer || typeof fetch === 'undefined') return wavesSampleBuffer;
  ensureAudio();
  try {
    wavesSampleBuffer = await resolveSoundscapeBuffer('waves');
    return wavesSampleBuffer;
  } catch (err) {
    console.warn('Failed to load waves sample:', err);
    return null;
  }
}

function createNoiseBuffer(ctx) {
  if (noiseBuffer) return noiseBuffer;
  const duration   = 2;
  const bufferSize = ctx.sampleRate * duration;
  const buffer     = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data       = buffer.getChannelData(0);
  // Generate simple pinkish noise
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.997 * b0 + white * 0.029591;
    b1 = 0.985 * b1 + white * 0.032534;
    b2 = 0.950 * b2 + white * 0.048056;
    data[i] = (b0 + b1 + b2) * 0.3;
  }
  noiseBuffer = buffer;
  return buffer;
}

// Map Schumann band frequency to an audible carrier frequency (simple linear mapping)
function mapBandToAudible(freqHz) {
  return 200 + freqHz * 3;
}

function getCurrentBandHz() {
  const val = freqSelect ? parseFloat(freqSelect.value) : 7.83;
  return Number.isFinite(val) ? val : 7.83;
}

function getToneMix() {
  const val = toneMixRange ? parseFloat(toneMixRange.value) : 1;
  if (!Number.isFinite(val)) return 1;
  return Math.max(0, Math.min(1, val));
}

// ---- Soundscape patterns ----
function startBirdsPattern(level) {
  // Stop previous timer
  if (birdsPatternTimer) {
    clearInterval(birdsPatternTimer);
    birdsPatternTimer = null;
  }
  // Do nothing if no audio or zero level
  if (!audioCtx || !masterGain || level <= 0) {
    return;
  }
  // Each pattern schedules 1–2 phrases of 2–4 tonal chirps
  const runPattern = () => {
    if (!audioCtx || !masterGain) return;
    const base = level;
    const amp  = base * 0.35;
    if (amp <= 0) return;
    const now = audioCtx.currentTime;
    const phrases = 1 + Math.floor(Math.random() * 2);
    for (let p = 0; p < phrases; p++) {
      const phraseOffset = p * 1.2;
      const chirps = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < chirps; i++) {
        const t0 = now + phraseOffset + i * 0.35;
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        const baseFreqs = [2800, 3200, 3600, 4200, 4800];
        const f0 = baseFreqs[Math.floor(Math.random() * baseFreqs.length)];
        osc.frequency.setValueAtTime(f0, t0);
        osc.frequency.linearRampToValueAtTime(f0 * 1.2, t0 + 0.25);
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(amp, t0 + 0.06);
        g.gain.linearRampToValueAtTime(0, t0 + 0.32);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(t0);
        osc.stop(t0 + 0.4);
      }
    }
  };
  runPattern();
  birdsPatternTimer = setInterval(runPattern, 4000);
}

function startWavesPattern(level) {
  // Stop previous timer
  if (wavesPatternTimer) {
    clearInterval(wavesPatternTimer);
    wavesPatternTimer = null;
  }
  if (!audioCtx || !wavesGain || level <= 0) {
    if (wavesGain) wavesGain.gain.value = 0;
    return;
  }
  const waveGap = 7.0;  // seconds between individual waves
  const setGap  = 49.0; // seconds between sets
  const patternDuration = waveGap * 6 + setGap;
  const runPattern = () => {
    if (!audioCtx || !wavesGain) return;
    const amp = level * 0.9;
    if (amp <= 0) return;
    const now = audioCtx.currentTime;
    for (let i = 0; i < 7; i++) {
      const t0 = now + i * waveGap;
      wavesGain.gain.cancelScheduledValues(t0);
      wavesGain.gain.setValueAtTime(0, t0);
      const peak = t0 + 2.0;
      const end  = t0 + 4.5;
      wavesGain.gain.linearRampToValueAtTime(amp, peak);
      wavesGain.gain.linearRampToValueAtTime(0, end);
    }
  };
  runPattern();
  wavesPatternTimer = setInterval(runPattern, patternDuration * 1000);
}

function updateSoundscapeLabels() {
  // Compute values from primary (explore) sliders; fallback to med sliders if absent
  const oceanVal = oceanRange ? parseFloat(oceanRange.value) : (medOceanRange ? parseFloat(medOceanRange.value) : 0);
  const rainVal  = rainRange  ? parseFloat(rainRange.value)  : (medRainRange  ? parseFloat(medRainRange.value)  : 0);
  const birdsVal = birdsRange ? parseFloat(birdsRange.value) : (medBirdsRange ? parseFloat(medBirdsRange.value) : 0);
  const wavesVal = wavesRange ? parseFloat(wavesRange.value) : (medWavesRange ? parseFloat(medWavesRange.value) : 0);
  if (oceanLabel) oceanLabel.textContent = `${Math.round(oceanVal * 100)}%`;
  if (rainLabel)  rainLabel.textContent  = `${Math.round(rainVal * 100)}%`;
  if (birdsLabel) birdsLabel.textContent = `${Math.round(birdsVal * 100)}%`;
  if (wavesLabel) wavesLabel.textContent = `${Math.round(wavesVal * 100)}%`;
  if (medOceanLabel) medOceanLabel.textContent = `${Math.round(oceanVal * 100)}%`;
  if (medRainLabel)  medRainLabel.textContent  = `${Math.round(rainVal * 100)}%`;
  if (medBirdsLabel) medBirdsLabel.textContent = `${Math.round(birdsVal * 100)}%`;
  if (medWavesLabel) medWavesLabel.textContent = `${Math.round(wavesVal * 100)}%`;
}

function updateSoundscapes() {
  // Determine latest values (use explore sliders if available)
  const oceanVal = oceanRange ? parseFloat(oceanRange.value) : (medOceanRange ? parseFloat(medOceanRange.value) : 0);
  const rainVal  = rainRange  ? parseFloat(rainRange.value)  : (medRainRange ? parseFloat(medRainRange.value) : 0);
  const birdsVal = birdsRange ? parseFloat(birdsRange.value) : (medBirdsRange ? parseFloat(medBirdsRange.value) : 0);
  const wavesVal = wavesRange ? parseFloat(wavesRange.value) : (medWavesRange ? parseFloat(medWavesRange.value) : 0);

  if (oceanGain) oceanGain.gain.value = oceanVal * 0.6;
  if (rainGain)  rainGain.gain.value  = rainVal  * 0.6;

  // Birds: use sample (decoded or streaming) when available; otherwise use chirp pattern.
  if (birdsGain && birdsIsSample) {
    birdsGain.gain.value = birdsVal * 0.6;
    if (birdsPatternTimer) {
      clearInterval(birdsPatternTimer);
      birdsPatternTimer = null;
    }
  } else {
    startBirdsPattern(birdsVal);
  }

  // Waves: use sample (decoded or streaming) when available; otherwise use synthetic 7‑wave pattern.
  if (wavesGain && wavesIsSample) {
    wavesGain.gain.value = wavesVal * 0.6;
    if (wavesPatternTimer) {
      clearInterval(wavesPatternTimer);
      wavesPatternTimer = null;
    }
  } else {
    if (wavesGain) wavesGain.gain.value = 0;
    startWavesPattern(wavesVal);
  }
}

// ---- Breathing visual ----
function updateBreathAnimation() {
  // Determine the current index from primary slider; fallback to med slider
  let idx = 5;
  if (breathSeconds) {
    idx = parseInt(breathSeconds.value, 10);
  } else if (medBreathSeconds) {
    idx = parseInt(medBreathSeconds.value, 10);
  }
  if (!Number.isFinite(idx)) idx = 5;
  idx = Math.max(0, Math.min(BREATH_MULTIPLIERS.length - 1, idx));
  // Propagate value to both sliders
  if (breathSeconds && breathSeconds.value != String(idx)) {
    breathSeconds.value = String(idx);
  }
  if (medBreathSeconds && medBreathSeconds.value != String(idx)) {
    medBreathSeconds.value = String(idx);
  }
  const multiplier = BREATH_MULTIPLIERS[idx];
  const bandHz = getCurrentBandHz();
  const period = bandHz > 0 ? 1 / bandHz : 0;
  const sec = period * multiplier;
  const durationText = `${sec.toFixed(2)} s (${multiplier}×T)`;
  // Update labels
  if (breathLabel) breathLabel.textContent = durationText;
  if (medBreathLabel) medBreathLabel.textContent = durationText;
  // Update orb animation durations and restart to apply changes
  [breathOrb, medBreathOrb].forEach((orb) => {
    if (orb) {
      orb.style.animationDuration = `${sec}s`;
      orb.style.webkitAnimationDuration = `${sec}s`;
      void orb.offsetWidth; // trigger reflow for Safari
    }
  });
  // Update sync labels showing band, multiplier and phase
  const phaseDeg = phaseRange ? parseFloat(phaseRange.value) : 0;
  const phaseMs  = bandHz > 0 ? (phaseDeg / 360) * (1000 / bandHz) : 0;
  const syncText = `Synced to ${bandHz.toFixed(2)} Hz · ${multiplier}×T · Phase ${phaseDeg.toFixed(0)}° (${phaseMs.toFixed(0)} ms)`;
  if (breathSyncLabel) breathSyncLabel.textContent = syncText;
  if (medBreathSyncLabel) medBreathSyncLabel.textContent = syncText;
}

// ---- Scope visualisation ----
function initScope() {
  const canvas = document.getElementById('scopeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  scopeCtx = ctx;
  if (!analyser || !scopeData) return;
  if (scopeAnimId) cancelAnimationFrame(scopeAnimId);
  scopeAnimId = requestAnimationFrame(drawScope);
}

function drawScope() {
  if (!scopeCtx || !analyser || !scopeData) return;
  analyser.getByteTimeDomainData(scopeData);
  const canvas = scopeCtx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  scopeCtx.clearRect(0, 0, w, h);
  scopeCtx.fillStyle = '#020617';
  scopeCtx.fillRect(0, 0, w, h);
  const mid = h / 2;
  const slice = w / scopeData.length;
  scopeCtx.beginPath();
  for (let i = 0; i < scopeData.length; i++) {
    const v = (scopeData[i] - 128) / 128; // -1..1
    const x = i * slice;
    const y = mid + v * (h * 0.4);
    if (i === 0) scopeCtx.moveTo(x, y);
    else scopeCtx.lineTo(x, y);
  }
  scopeCtx.strokeStyle = 'rgba(56,189,248,0.9)';
  scopeCtx.lineWidth = 2;
  scopeCtx.stroke();
  scopeAnimId = requestAnimationFrame(drawScope);
}

// ---- Audio graph construction ----
function stopCurrentAudio() {
  // Stop and disconnect all running nodes
  const safeStop = (node) => {
    if (node) {
      try { node.stop(); } catch {}
      try { node.disconnect(); } catch {}
    }
  };
  safeStop(baseOsc);
  safeStop(oceanSource);
  safeStop(rainSource);
  safeStop(wavesSource);
  // Stop any additional nodes created by the current stimulation mode
  if (extraNodes && extraNodes.length) {
    extraNodes.forEach((node) => {
      try { node.stop(); } catch {}
      try { node.disconnect(); } catch {}
    });
    extraNodes = [];
  }
  // Stop the global stereo motion LFO and gain.  Disconnect any motion panners.
  safeStop(motionLfo);
  safeStop(motionGainNode);
  motionLfo = null;
  motionGainNode = null;
  if (motionPanners && motionPanners.length) {
    motionPanners.forEach((p) => {
      try { p.disconnect(); } catch {}
    });
    motionPanners = [];
  }
  // Stop any chord progression
  stopChordProgression();
  // Cancel patterns
  if (birdsPatternTimer) {
    clearInterval(birdsPatternTimer);
    birdsPatternTimer = null;
  }
  if (wavesPatternTimer) {
    clearInterval(wavesPatternTimer);
    wavesPatternTimer = null;
  }
  if (scopeAnimId) {
    cancelAnimationFrame(scopeAnimId);
    scopeAnimId = null;
  }
  analyser = null;
  scopeData = null;
  scopeCtx = null;
  baseOsc = null;
  baseGain = null;
  masterGain = null;
  oceanSource = null;
  oceanGain = null;
  rainSource = null;
  rainGain = null;
  wavesSource = null;
  wavesGain = null;
}

/**
 * Create a stereo echo cluster where left/right frequency offsets always sum
 * to the selected Schumann band (delta f = band).  The centre tone stays at
 * the original carrier and can be set to a subtle level for reduced fatigue.
 */
function createBandSplitEchoCluster(audibleHz, freqHz, depthVal, options = {}) {
  if (!audioCtx || !masterGain || !baseGain || !baseOsc) return;
  const {
    centerGainScale = 0.21,  // ~ -9 dB vs the default 0.6 gain path
    echoGainScale = 0.26,
    leftDelaySec = 0.11,
    rightDelaySec = 0.14,
    toneMix = 1,
    splitMin = 0.35,
    splitMax = 0.65
  } = options;

  // Keep left/right split constrained to avoid hard-fatiguing extremes.
  const randFrac = splitMin + Math.random() * (splitMax - splitMin);
  const leftDiff = freqHz * randFrac;
  const rightDiff = freqHz * (1 - randFrac);

  baseGain.gain.value = depthVal * centerGainScale * toneMix;

  const leftEchoOsc  = audioCtx.createOscillator();
  const rightEchoOsc = audioCtx.createOscillator();
  leftEchoOsc.type = 'sine';
  rightEchoOsc.type = 'sine';
  leftEchoOsc.frequency.value = audibleHz + leftDiff;
  rightEchoOsc.frequency.value = audibleHz - rightDiff;

  const leftDelay = audioCtx.createDelay();
  const rightDelay = audioCtx.createDelay();
  leftDelay.delayTime.value = leftDelaySec;
  rightDelay.delayTime.value = rightDelaySec;

  const leftGain = audioCtx.createGain();
  const rightGain = audioCtx.createGain();
  leftGain.gain.value = depthVal * echoGainScale * toneMix;
  rightGain.gain.value = depthVal * echoGainScale * toneMix;

  const leftPan = audioCtx.createStereoPanner();
  const rightPan = audioCtx.createStereoPanner();
  leftPan.pan.value = -1;
  rightPan.pan.value = 1;

  leftEchoOsc.connect(leftDelay).connect(leftGain).connect(leftPan).connect(masterGain);
  rightEchoOsc.connect(rightDelay).connect(rightGain).connect(rightPan).connect(masterGain);
  leftEchoOsc.start();
  rightEchoOsc.start();

  extraNodes.push(
    leftEchoOsc,
    rightEchoOsc,
    leftDelay,
    rightDelay,
    leftGain,
    rightGain,
    leftPan,
    rightPan
  );
}

function startGraph(freqHz) {
  stopCurrentAudio();
  ensureAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const audibleHz = mapBandToAudible(freqHz);
  // Create master and analyser
  masterGain = audioCtx.createGain();
  const volVal = volumeRange ? parseFloat(volumeRange.value) : 0.5;
  masterGain.gain.value = volVal;
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  scopeData = new Uint8Array(analyser.fftSize);
  masterGain.connect(analyser);
  analyser.connect(audioCtx.destination);

  // If a reverb space is selected, set up a convolver in parallel with the dry path.
  // Because this taps the master bus, ALL sources routed to masterGain (tone,
  // soundscapes, chords, and echo layers) receive the selected IR.
  if (selectedIR && selectedIR !== 'none') {
    const conv = audioCtx.createConvolver();
    const wetGain = audioCtx.createGain();
    // Set to 0 until buffer loads; then apply IR-compensated wet gain.
    wetGain.gain.value = 0;
    // Connect a copy of the master output into the convolver and then to the wet gain
    masterGain.connect(conv);
    conv.connect(wetGain).connect(audioCtx.destination);
    // Asynchronously load the IR buffer if necessary and assign it
    loadIRBuffer(selectedIR).then((buf) => {
      if (buf) {
        conv.buffer = buf;
        const wet = getCompensatedIrWetGain(selectedIR, buf);
        wetGain.gain.value = wet;
        console.info(`[IR] active ${selectedIR}: wetGain=${wet.toFixed(3)}`);
      }
    }).catch(() => {
      // Ignore errors: if the file cannot be loaded the convolver will simply
      // output silence.
    });
    extraNodes.push(conv, wetGain);
  }

  // When restarting the graph we also clear any existing motion panners
  if (motionPanners && motionPanners.length) {
    motionPanners.forEach((p) => {
      try { p.disconnect(); } catch {}
    });
    motionPanners = [];
  }
  // Create a band‑driven LFO and gain for stereo motion of ambience and chords.
  // We create these after clearing the old ones so that each startGraph
  // instance owns its own modulator.  The LFO outputs a sine wave at
  // the current band frequency.  The gain scales the modulation depth.
  motionLfo = audioCtx.createOscillator();
  motionLfo.type = 'sine';
  // For headphones, panning at the Schumann band rate can feel like intense tremolo.
  // Use a much slower motion rate (seconds-long drift) while keeping band-locked
  // *relationships* elsewhere in the engine.
  const motionHz = Math.max(0.03, Math.min(0.12, freqHz / 128));
  motionLfo.frequency.value = motionHz;
  motionGainNode = audioCtx.createGain();
  // Gentle depth: keep pan within roughly ±0.35.
  motionGainNode.gain.value = 0.35;
  motionLfo.connect(motionGainNode);
  motionLfo.start();
  // Register the modulator for cleanup
  extraNodes.push(motionLfo, motionGainNode);
  // Tone: depending on the selected stimulation mode we configure the audio
  // graph differently.  We still create baseOsc/baseGain so that existing
  // functions (e.g. updateCarrierLabel) continue to work, but some modes
  // may silence this node and instead use separate oscillators.  The base
  // oscillator always produces a sine wave at audibleHz.
  baseOsc  = audioCtx.createOscillator();
  baseGain = audioCtx.createGain();
  baseOsc.type = 'sine';
  baseOsc.frequency.value = audibleHz;
  const depthVal = depthRange ? parseFloat(depthRange.value) : 0.7;
  const toneMix = getToneMix();
  // Set a default gain which may be modified below
  baseGain.gain.value = depthVal * 0.6 * toneMix;
  baseOsc.connect(baseGain);
  baseGain.connect(masterGain);
  // Create stimulation according to mode
  if (stimulationMode === 'am') {
    // Isochronic: amplitude modulation.  We create a low‑frequency
    // oscillator (modOsc) at the Schumann band frequency and connect
    // it to the gain parameter of baseGain.  To achieve amplitude
    // modulation around a positive offset, we use a gain of 0.3 and
    // connect the modulator scaled by 0.3 so the output varies between
    // 0 and ~0.6.  The baseGain.gain value above sets the overall depth.
    const modOsc = audioCtx.createOscillator();
    modOsc.type = 'sine';
    modOsc.frequency.value = freqHz;
    const modGain = audioCtx.createGain();
    modGain.gain.value = depthVal * 0.3 * toneMix;
    // Offset to keep the signal positive
    const offset = audioCtx.createConstantSource();
    offset.offset.value = depthVal * 0.3 * toneMix;
    // Connect modulator and offset to baseGain.gain
    modOsc.connect(modGain);
    modGain.connect(baseGain.gain);
    offset.connect(baseGain.gain);
    offset.start();
    modOsc.start();
    extraNodes.push(modOsc, modGain, offset);
  } else if (stimulationMode === 'binaural') {
    // Binaural: create two oscillators with frequencies offset by half
    // the band frequency.  We silence baseOsc and instead use left/right
    // oscillators feeding into stereo panners.
    baseGain.gain.value = 0;
    const halfDiff = freqHz / 2;
    const leftOsc  = audioCtx.createOscillator();
    const rightOsc = audioCtx.createOscillator();
    leftOsc.type  = 'sine';
    rightOsc.type = 'sine';
    leftOsc.frequency.value  = audibleHz + halfDiff;
    rightOsc.frequency.value = audibleHz - halfDiff;
    const leftGain  = audioCtx.createGain();
    const rightGain = audioCtx.createGain();
    leftGain.gain.value  = depthVal * 0.6 * toneMix;
    rightGain.gain.value = depthVal * 0.6 * toneMix;
    const leftPan  = audioCtx.createStereoPanner();
    const rightPan = audioCtx.createStereoPanner();
    leftPan.pan.value  = -1;
    rightPan.pan.value = 1;
    leftOsc.connect(leftGain).connect(leftPan).connect(masterGain);
    rightOsc.connect(rightGain).connect(rightPan).connect(masterGain);
    leftOsc.start();
    rightOsc.start();
    extraNodes.push(leftOsc, rightOsc, leftGain, rightGain, leftPan, rightPan);
  } else if (stimulationMode === 'ambient') {
    // Ambient Echo is tone-free: no carrier and no tonal L/R echo oscillators.
    // Only ambience layers (and optional chord layer) are heard.
    baseGain.gain.value = 0;
  } else {
    // Spatial Echo: same delta-f split principle, with a slightly stronger
    // centre than Ambient Echo and shorter delay taps.
    createBandSplitEchoCluster(audibleHz, freqHz, depthVal, {
      centerGainScale: 0.21,
      echoGainScale: 0.26,
      leftDelaySec: 0.11,
      rightDelaySec: 0.14,
      toneMix
    });
  }
  // Noise buffer (used when no high‑quality sample is available)
  const buffer = createNoiseBuffer(audioCtx);
  // Begin loading the high‑quality ocean sample asynchronously (if available). We
  // don't await this promise here; it will resolve in the background.
  loadOceanSample().catch(() => {});
  // Start loading other soundscape samples.  These promises resolve in the background.
  loadRainSample().catch(() => {});
  loadBirdsSample().catch(() => {});
  loadWavesSample().catch(() => {});
  // Ocean: prefer to use a high‑quality loop if loaded, otherwise fall back
  // to noise. We'll assign the buffer property based on whether
  // oceanSampleBuffer is available at the time startGraph executes.
  oceanSource = audioCtx.createBufferSource();
  if (oceanSampleBuffer) {
    oceanSource.buffer = oceanSampleBuffer;
  } else {
    oceanSource.buffer = buffer;
  }
  oceanSource.loop   = true;
  const oceanFilter = audioCtx.createBiquadFilter();
  oceanFilter.type = 'lowpass';
  oceanFilter.frequency.value = 600;
  oceanGain = audioCtx.createGain();
  oceanGain.gain.value = 0;
  oceanSource.connect(oceanFilter);
  oceanFilter.connect(oceanGain);
  // Route the ocean through a stereo panner whose pan is modulated
  // by the global motion LFO.  This creates left/right movement at
  // the band frequency while preserving the dry mix level.  Store
  // the panner for cleanup.
  const oceanPan = audioCtx.createStereoPanner();
  if (motionGainNode) {
    motionGainNode.connect(oceanPan.pan);
  }
  oceanGain.connect(oceanPan).connect(masterGain);
  motionPanners.push(oceanPan);
  extraNodes.push(oceanPan);
  // Rain: prefer a high‑quality rain loop if available; otherwise use noise.
  rainSource = audioCtx.createBufferSource();
  if (rainSampleBuffer) {
    rainSource.buffer = rainSampleBuffer;
  } else {
    rainSource.buffer = buffer;
  }
  rainSource.loop   = true;
  const rainFilter = audioCtx.createBiquadFilter();
  rainFilter.type = 'highpass';
  rainFilter.frequency.value = 2000;
  rainGain = audioCtx.createGain();
  rainGain.gain.value = 0;
  rainSource.connect(rainFilter);
  rainFilter.connect(rainGain);
  // Route the rain through a stereo panner for band‑driven motion
  const rainPan = audioCtx.createStereoPanner();
  if (motionGainNode) {
    motionGainNode.connect(rainPan.pan);
  }
  rainGain.connect(rainPan).connect(masterGain);
  motionPanners.push(rainPan);
  extraNodes.push(rainPan);

  // Birds: prefer a high‑quality birds loop if available; otherwise fall back to chirp pattern.
  // For large recordings, use streaming playback to avoid decodeAudioData failures.
  birdsGain = audioCtx.createGain();
  birdsGain.gain.value = 0;
  const birdsPan = audioCtx.createStereoPanner();
  if (motionGainNode) motionGainNode.connect(birdsPan.pan);
  birdsGain.connect(birdsPan).connect(masterGain);
  motionPanners.push(birdsPan);
  extraNodes.push(birdsPan);

  birdsIsSample = false;
  if (birdsSampleBuffer) {
    birdsIsSample = true;
    birdsSource = audioCtx.createBufferSource();
    birdsSource.buffer = birdsSampleBuffer;
    birdsSource.loop = true;
    birdsSource.connect(birdsGain);
  } else {
    // Try streaming canonical filename if present
    const birdsUrl = 'assets/audio/soundscapes/birds.wav';
    try {
      const obj = createMediaLoopSource(birdsUrl);
      birdsStreamEl = obj.el;
      const birdsMedia = obj.src;
      birdsMedia.connect(birdsGain);
      birdsIsSample = true;
    } catch (e) {
      birdsIsSample = false;
    }
  }
  // Waves: prefer a high‑quality waves loop if available; otherwise use noise.
// Large WAVs can fail decodeAudioData on some systems; for those we stream
// via <audio> to preserve full length/quality without massive memory use.
const wavesFilter = audioCtx.createBiquadFilter();
wavesFilter.type = 'lowpass';
wavesFilter.frequency.value = 450;
wavesGain = audioCtx.createGain();
wavesGain.gain.value = 0;

wavesIsSample = false;
if (wavesSampleBuffer) {
  wavesIsSample = true;
  wavesSource = audioCtx.createBufferSource();
  wavesSource.buffer = wavesSampleBuffer;
  wavesSource.loop = true;
  wavesSource.connect(wavesFilter);
} else {
  // Try streaming canonical filename if present
  const wavesUrl = 'assets/audio/soundscapes/waves.wav';
  try {
    const obj = createMediaLoopSource(wavesUrl);
    wavesStreamEl = obj.el;
    const wavesMedia = obj.src;
    wavesMedia.connect(wavesFilter);
    wavesIsSample = true;
  } catch (e) {
    wavesIsSample = false;
    wavesSource = audioCtx.createBufferSource();
    wavesSource.buffer = buffer;
    wavesSource.loop = true;
    wavesSource.connect(wavesFilter);
  }
}
wavesFilter.connect(wavesGain);
// Route the waves through a stereo panner for band‑driven motion
const wavesPan = audioCtx.createStereoPanner();
if (motionGainNode) {
  motionGainNode.connect(wavesPan.pan);
}
wavesGain.connect(wavesPan).connect(masterGain);
motionPanners.push(wavesPan);
extraNodes.push(wavesPan);

  // If ambient echo mode is selected, apply additional delayed ambience taps
  // to the soundscape layers for a wide, low-fatigue space.
  if (stimulationMode === 'ambient') {
    // Create delays and panners for left and right echoes
    const leftDelay  = audioCtx.createDelay();
    const rightDelay = audioCtx.createDelay();
    leftDelay.delayTime.value  = 0.20; // 200 ms echo
    rightDelay.delayTime.value = 0.25; // 250 ms echo
    const leftGain  = audioCtx.createGain();
    const rightGain = audioCtx.createGain();
    // Echoes are moderately quiet relative to the main ambience
    const ambDepth = depthRange ? parseFloat(depthRange.value) : 0.7;
    leftGain.gain.value  = ambDepth * 0.3;
    rightGain.gain.value = ambDepth * 0.3;
    const leftPan  = audioCtx.createStereoPanner();
    const rightPan = audioCtx.createStereoPanner();
    leftPan.pan.value  = -1;
    rightPan.pan.value = 1;
    // Route each ambience gain into both delays
    if (oceanGain) {
      oceanGain.connect(leftDelay);
      oceanGain.connect(rightDelay);
    }
    if (rainGain) {
      rainGain.connect(leftDelay);
      rainGain.connect(rightDelay);
    }
    if (birdsGain) {
      birdsGain.connect(leftDelay);
      birdsGain.connect(rightDelay);
    }
    if (wavesGain) {
      wavesGain.connect(leftDelay);
      wavesGain.connect(rightDelay);
    }
    // Connect delays through gains and panners into masterGain
    leftDelay.connect(leftGain).connect(leftPan).connect(masterGain);
    rightDelay.connect(rightGain).connect(rightPan).connect(masterGain);
    // Register these extra nodes for cleanup
    extraNodes.push(leftDelay, rightDelay, leftGain, rightGain, leftPan, rightPan);
  }
  // Start sources
  baseOsc.start();
  oceanSource.start();
  rainSource.start();
  if (wavesSource) wavesSource.start();
  if (birdsSource) birdsSource.start();
  if (wavesStreamEl) wavesStreamEl.play().catch(() => {});
  if (birdsStreamEl) birdsStreamEl.play().catch(() => {});
  // Apply current soundscape settings
  updateSoundscapeLabels();
  updateSoundscapes();
  // Start chord progression if selected.  Use the audibleHz as the root of
  // the chords.  Ambient mode may still include chords; in Isochronic
  // and binaural modes the chords blend with the tone or beats.
  startChordProgression(audibleHz);
  // Start scope visualisation
  initScope();
}

// ---- Phase and session helpers ----
function updatePhaseLabel() {
  if (!phaseRange || !phaseLabel) return;
  const phase = parseFloat(phaseRange.value) || 0;
  const freq  = getCurrentBandHz();
  const ms    = freq > 0 ? (phase / 360) * (1000 / freq) : 0;
  phaseLabel.textContent = `${phase.toFixed(0)}° / ${ms.toFixed(0)} ms`;
  // Keep breathing sync aligned
  updateBreathAnimation();
}

function updateSweepLabel() {
  if (!sweepSeconds || !sweepLabel) return;
  const sec = parseFloat(sweepSeconds.value) || 30;
  sweepLabel.textContent = `${sec.toFixed(0)} s / 360°`;
}

function updateCarrierLabel() {
  if (!carrierRange || !carrierLabel) return;
  const hz = parseFloat(carrierRange.value) || 230;
  carrierLabel.textContent = `${hz.toFixed(0)} Hz`;
  if (baseOsc && audioCtx) {
    baseOsc.frequency.setValueAtTime(hz, audioCtx.currentTime);
    // Restart the graph to update binaural/spatial echo frequencies
    const currentBand = getCurrentBandHz();
    startGraph(currentBand);
  }
}

function updateDepthLabel() {
  if (!depthRange || !depthLabel) return;
  const depth = parseFloat(depthRange.value) || 0.7;
  depthLabel.textContent = `${Math.round(depth * 100)}%`;
  // Depth influences mode-specific graph wiring; restart when running.
  if (baseOsc) {
    const currentBand = getCurrentBandHz();
    startGraph(currentBand);
  }
}

function updateVolumeLabel() {
  if (!volumeRange || !volumeLabel) return;
  const vol = parseFloat(volumeRange.value) || 0.5;
  volumeLabel.textContent = `${Math.round(vol * 100)}%`;
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(vol, audioCtx.currentTime);
  }
}

function updateToneMixLabel() {
  if (!toneMixRange || !toneMixLabel) return;
  const mix = getToneMix();
  toneMixLabel.textContent = `${Math.round(mix * 100)}%`;
  // Tone mix affects mode-specific graph gains; restart when running.
  if (baseOsc) {
    const currentBand = getCurrentBandHz();
    startGraph(currentBand);
  }
}

function updateSessionLabel() {
  if (!sessionMinutes || !sessionLabel) return;
  sessionLabel.textContent = `${sessionMinutes.value} min`;
}

function getExploreBandKey() {
  return String(freqSelect ? freqSelect.value : '7.83');
}

function getMedBandKey() {
  return String(medFreqSelect ? medFreqSelect.value : '7.83');
}

function updateBestPhaseDisplay() {
  if (!bestPhaseDisplay) return;
  const key = getExploreBandKey();
  const info = bestPhaseByBand[key];
  if (!info || !info.count) {
    bestPhaseDisplay.textContent = 'Not set yet';
  } else {
    bestPhaseDisplay.textContent = `${info.phase.toFixed(0)}° (avg of ${info.count} marks)`;
  }
}

function updateMedPhaseLabel() {
  if (!medPhaseLabel) return;
  const key = getMedBandKey();
  const info = bestPhaseByBand[key];
  if (!info || !info.count) {
    medPhaseLabel.textContent = 'Best (if available), otherwise live slider';
  } else {
    medPhaseLabel.textContent = `Using best phase ${info.phase.toFixed(0)}° (${info.count} marks)`;
  }
}

function handleMarkStrongest() {
  if (!phaseRange) return;
  const phase = parseFloat(phaseRange.value) || 0;
  // Provide haptic feedback when available
  try {
    if (navigator.vibrate) navigator.vibrate(80);
  } catch {}
  // Play audio chime
  if (typeof playChime === 'function') {
    playChime();
  }
  // When scanning, record mark count for current scan index
  if (scanning && scanCounts) {
    scanCounts[scanIndex] = (scanCounts[scanIndex] || 0) + 1;
  }
  const key = getExploreBandKey();
  const current = bestPhaseByBand[key];
  if (!current) {
    bestPhaseByBand[key] = { phase, count: 1 };
  } else {
    const count = current.count + 1;
    const avg = current.phase + (phase - current.phase) / count;
    bestPhaseByBand[key] = { phase: avg, count };
  }
  savePhaseHistory();
  updateBestPhaseDisplay();
  updateMedPhaseLabel();
  renderPhaseHistory();
}

function clearBestPhaseForBand(key) {
  if (bestPhaseByBand[key]) {
    delete bestPhaseByBand[key];
  }
  updateBestPhaseDisplay();
  updateMedPhaseLabel();
}

// ---- Autosweep ----
function startAutosweep() {
  if (sweepIsRunning) return;
  const duration = parseFloat(sweepSeconds ? sweepSeconds.value : '30') || 30;
  if (duration <= 0) return;
  sweepIsRunning = true;
  if (sweepToggle) sweepToggle.textContent = 'Stop autosweep';
  const startTime = performance.now();
  const step = () => {
    if (!sweepIsRunning) return;
    const now = performance.now();
    const elapsed = (now - startTime) / 1000;
    const frac = (elapsed % duration) / duration;
    const deg = frac * 360;
    if (phaseRange) {
      phaseRange.value = deg.toFixed(0);
      updatePhaseLabel();
    }
    sweepAnimId = requestAnimationFrame(step);
  };
  step();
}

function stopAutosweep() {
  if (!sweepIsRunning) return;
  sweepIsRunning = false;
  if (sweepAnimId) {
    cancelAnimationFrame(sweepAnimId);
    sweepAnimId = null;
  }
  if (sweepToggle) sweepToggle.textContent = 'Start autosweep';
}

function toggleAutosweep() {
  if (sweepIsRunning) {
    stopAutosweep();
  } else {
    startAutosweep();
  }
}

// ---- Two-tier phase exploration & fine tune ----
/** Play a short sine wave chime for mark confirmation. */
function playChime() {
  ensureAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880;
  g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
  osc.connect(g);
  g.connect(masterGain || audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.25);
}

/**
 * Begin two‑tier scanning for optimum phase. This disables manual controls
 * and cycles through discrete phase values. When finished, updates bestPhaseByBand.
 */
function startTwoTierScan() {
  if (scanning) return;
  // ensure audio is running for exploration
  startExplore();
  scanning = true;
  scanTier = 1;
  scanIndex = 0;
  scanCounts = [];
  scanPhases = [];
  // enlarge Mark button for ease of tapping
  if (markStrongest) {
    markStrongest.classList.add('scanning-mark');
    markStrongest.disabled = false;
  }
  // disable autosweep and manual phase slider during scanning
  stopAutosweep();
  if (sweepToggle) sweepToggle.disabled = true;
  if (phaseRange) phaseRange.disabled = true;
  // hide fine tune button until scanning completes
  const fineBtnInit = document.getElementById('fineTune');
  if (fineBtnInit) fineBtnInit.hidden = true;

  // Show scan progress UI and reset summary
  if (scanProgress) {
    scanProgress.hidden = false;
    scanProgress.style.display = 'flex';
  }
  if (scanSummary) {
    scanSummary.hidden = true;
    scanSummary.innerHTML = '';
  }
  // initialise tier indicator
  if (scanTierElem) {
    scanTierElem.textContent = 'Tier 1 of 2';
  }

  runScanPhase();
}

function runScanPhase() {
  if (!scanning) return;
  // Determine dwell and fade durations based on tier (ms)
  const dwell = scanTier === 1 ? 3000 : 5000;
  const fade  = scanTier === 1 ? 1000 : 3000;

  // Update the progress UI with current tier
  if (scanTierElem) {
    scanTierElem.textContent = `Tier ${scanTier} of 2`;
  }
  // On first index of a tier, compute the phases to sweep
  if (scanIndex === 0 && scanPhases.length === 0) {
    if (scanTier === 1) {
      // Coarse: 7 equally spaced angles across 0–360
      scanPhases = [0, 60, 120, 180, 240, 300, 360];
    } else if (scanTier === 2) {
      // Fine: choose top two phases from previous tier
      const results = scanPhases.map((p, i) => ({ phase: p, count: scanCounts[i] || 0 }));
      results.sort((a, b) => b.count - a.count);
      let p1 = results[0] ? results[0].phase : 0;
      let p2 = results[1] ? results[1].phase : 360;
      // Ensure p1 <= p2 in circular sense
      if (p2 < p1) {
        const tmp = p1;
        p1 = p2;
        p2 = tmp;
      }
      // If both are same or no marks, default to a 120° span starting at p1
      if (p1 === p2) {
        p2 = (p1 + 120) % 360;
      }
      const span = (p2 - p1 + 360) % 360;
      const step = span / 6;
      scanPhases = [];
      for (let i = 0; i < 7; i++) {
        const val = (p1 + step * i + 360) % 360;
        scanPhases.push(val);
      }
    }
    // When starting a new tier with computed phases, update step info for the first phase
    if (scanStepElem) {
      scanStepElem.textContent = `Step 1 of ${scanPhases.length}`;
    }
    if (scanCountdownElem) {
      scanCountdownElem.textContent = '';
    }
  }
  // If finished scanning all phases in current tier
  if (scanIndex >= scanPhases.length) {
    if (scanTier === 1) {
      // Move to second tier
      scanTier = 2;
      scanIndex = 0;
      scanCounts = [];
      scanPhases = [];
      runScanPhase();
      return;
    } else {
      // Completed second tier: compute final best phase
      const results = scanPhases.map((p, i) => ({ phase: p, count: scanCounts[i] || 0 }));
      results.sort((a, b) => b.count - a.count);
      let best = results[0] ? results[0].phase : scanPhases[0];
      // Save and update UI
      const key = getExploreBandKey();
      const current = bestPhaseByBand[key];
      if (!current) {
        bestPhaseByBand[key] = { phase: best, count: 1 };
      } else {
        // Overwrite previous value with new measurement
        bestPhaseByBand[key] = { phase: best, count: current.count };
      }
      savePhaseHistory();
      updateBestPhaseDisplay();
      updateMedPhaseLabel();
      renderPhaseHistory();
      // Set slider to best for continuity
      if (phaseRange) {
        phaseRange.value = best.toFixed(0);
        updatePhaseLabel();
      }
      // Reset scanning state and re‑enable controls
      scanning = false;
      scanTier = 0;
      scanPhases = [];
      scanCounts = [];
      scanIndex = 0;
      if (markStrongest) markStrongest.classList.remove('scanning-mark');
      if (sweepToggle) sweepToggle.disabled = false;
      if (phaseRange) phaseRange.disabled = false;
      // Reveal fine tune button
      const fineBtn = document.getElementById('fineTune');
      if (fineBtn) fineBtn.hidden = false;
      // Hide progress UI and show summary
      if (scanProgress) {
        scanProgress.hidden = true;
        scanProgress.style.display = 'none';
      }
      clearInterval(countdownInterval);
      if (scanSummary) {
        // Build a summary message listing the top two phases and the chosen optimum
        let summaryHtml = '<strong>Scan complete!</strong><br/>';
        if (results.length > 0) {
          const topTwo = results.slice(0, 2);
          summaryHtml += 'Top phases: ' + topTwo.map(r => `${r.phase.toFixed(0)}° (marks: ${r.count})`).join(' · ') + '<br/>';
        }
        summaryHtml += `Best phase for this band: <strong>${best.toFixed(0)}°</strong> (saved)`;
        scanSummary.innerHTML = summaryHtml;
        scanSummary.hidden = false;
      }
      return;
    }
  }
  // Set phase for current scan index
  const target = scanPhases[scanIndex];
  if (phaseRange) {
    phaseRange.value = target.toFixed(0);
    updatePhaseLabel();
  }
  // Update progress step label and start dwell countdown
  if (scanStepElem) {
    scanStepElem.textContent = `Step ${scanIndex + 1} of ${scanPhases.length}`;
  }
  startCountdown(dwell);
  // Schedule next phase after dwell + fade durations
  const total = dwell + fade;
  scanTimeoutId = setTimeout(() => {
    scanIndex++;
    runScanPhase();
  }, total);
}

/**
 * Begin a continuous fine‑tune sweep around the current best phase. This utilises
 * the existing autosweep infrastructure to perform a slow sweep ±30° around
 * the recorded optimum.  Duration is fixed to 20 seconds.
 */
function startFineTuneSweep() {
  const key = getExploreBandKey();
  const info = bestPhaseByBand[key];
  if (!info) return;
  const basePhase = info.phase;
  stopAutosweep();
  sweepIsRunning = true;
  if (sweepToggle) sweepToggle.textContent = 'Stop autosweep';
  const startTime = performance.now();
  function step() {
    if (!sweepIsRunning) return;
    const now = performance.now();
    const elapsed = (now - startTime) / 1000;
    const t = (elapsed % 20) / 20; // 0..1 across 20s
    const deg = (basePhase - 30 + 60 * t + 360) % 360;
    if (phaseRange) {
      phaseRange.value = deg.toFixed(0);
      updatePhaseLabel();
    }
    sweepAnimId = requestAnimationFrame(step);
  }
  step();
}

// ---- Session timer ----
function startMedTimer(mins) {
  if (!medTimerDisplay) return;
  if (!mins || mins <= 0) {
    medTimerDisplay.textContent = '∞';
    return;
  }
  medEndTime = Date.now() + mins * 60 * 1000;
  const tick = () => {
    const remaining = medEndTime - Date.now();
    if (remaining <= 0) {
      medTimerDisplay.textContent = '0:00';
      stopMeditation(true);
      return;
    }
    const totalSec = Math.floor(remaining / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    medTimerDisplay.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    medTimerId = setTimeout(tick, 1000);
  };
  tick();
}

function clearMedTimer() {
  if (medTimerId) clearTimeout(medTimerId);
  medTimerId = null;
  if (medTimerDisplay) medTimerDisplay.textContent = '∞';
}

// ---- Explore / Meditate flows ----
function startExplore() {
  const bandHz = parseFloat(freqSelect ? freqSelect.value : '7.83') || 7.83;
  startGraph(bandHz);
  if (explorePlay) explorePlay.disabled = true;
  if (exploreStop) exploreStop.disabled = false;
}

function stopExplore() {
  stopCurrentAudio();
  stopAutosweep();
  // If a guided scan is running, abort it and reset the UI
  if (scanning) {
    scanning = false;
    clearTimeout(scanTimeoutId);
    clearInterval(countdownInterval);
    scanTier = 0;
    scanPhases = [];
    scanCounts = [];
    scanIndex = 0;
    if (markStrongest) markStrongest.classList.remove('scanning-mark');
    if (phaseRange) phaseRange.disabled = false;
    if (sweepToggle) sweepToggle.disabled = false;
    // Hide progress and summary
    if (scanProgress) {
      scanProgress.hidden = true;
      scanProgress.style.display = 'none';
    }
    if (scanSummary) {
      scanSummary.hidden = true;
    }
  }
  if (explorePlay) explorePlay.disabled = false;
  if (exploreStop) exploreStop.disabled = true;
}

function startMeditation() {
  const bandHz = parseFloat(medFreqSelect ? medFreqSelect.value : '7.83') || 7.83;
  startGraph(bandHz);
  // Use best phase if available
  const key = getMedBandKey();
  const info = bestPhaseByBand[key];
  if (info && phaseRange) {
    phaseRange.value = info.phase.toFixed(0);
    updatePhaseLabel();
  }
  updateMedPhaseLabel();
  if (medPlay) medPlay.disabled = true;
  if (medStop) medStop.disabled = false;
  const mins = parseInt(sessionMinutes ? sessionMinutes.value : '20', 10) || 20;
  startMedTimer(mins);
}

function stopMeditation(fromTimer) {
  stopCurrentAudio();
  stopAutosweep();
  clearMedTimer();
  if (medPlay) medPlay.disabled = false;
  if (medStop) medStop.disabled = true;
  if (!fromTimer) {
    // Only mark end state if user stopped manually
  }
}

// ---- Event listeners ----
// Tabs switching
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const view = tab.dataset.view;
    tabs.forEach((t) => t.classList.toggle('active', t === tab));
    views.forEach((v) => {
      v.classList.toggle('active', v.classList.contains('view-' + view));
    });
  });
});

// Explore controls
if (explorePlay) explorePlay.addEventListener('click', () => {
  // Begin guided two‑tier phase exploration instead of a simple start.
  startTwoTierScan();
});
if (exploreStop) exploreStop.addEventListener('click', stopExplore);

// Stimulation mode pill buttons.  When one of the pills is clicked we
// update the global stimulationMode and restart the graph if audio is
// playing.  Each pill carries a data‑mode attribute ('am', 'binaural',
// 'both').  The active pill is given the 'active' class while others are
// cleared.
const modePills = document.querySelectorAll('.pill-row .pill');
modePills.forEach((btn) => {
  btn.addEventListener('click', () => {
    // Only update if this pill is not already active
    if (btn.classList.contains('active')) return;
    // Remove active state from all pills and set on clicked one
    modePills.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const newMode = btn.dataset.mode || 'am';
    stimulationMode = newMode;
    // If audio is currently running (baseOsc exists), restart the graph
    // with the current band.  This ensures the new mode takes effect.
    if (baseOsc) {
      const currentBand = getCurrentBandHz();
      startGraph(currentBand);
    }
  });
});

// Chord instrument selection.  When the user selects a chord instrument, we
// update the chordInstrument variable and restart the audio graph if
// currently running.  The select element has id "chordSelect".
const chordSelect = document.getElementById('chordSelect');
const chordLoopRow  = document.getElementById('chordLoopRow');
const chordLoopSelect = document.getElementById('chordLoopSelect');
if (chordSelect) {
  chordSelect.addEventListener('change', () => {
    chordInstrument = chordSelect.value || 'none';
    // Whenever the instrument changes, update the chord loop UI.  If the
    // manifest hasn’t loaded yet this will hide the loop selector.
    updateChordLoopUI();
    // Restart audio to apply new chord instrument settings if running
    if (baseOsc) {
      const currentBand = getCurrentBandHz();
      startGraph(currentBand);
    }
  });
}

// When a chord loop is changed, update the selected loop and restart audio.
if (chordLoopSelect) {
  chordLoopSelect.addEventListener('change', () => {
    selectedChordLoop = chordLoopSelect.value || null;
    if (baseOsc) {
      const currentBand = getCurrentBandHz();
      startGraph(currentBand);
    }
  });
}

// Reverb space selector
const irSelect = document.getElementById('irSelect');
if (irSelect) {
  irSelect.addEventListener('change', () => {
    selectedIR = irSelect.value || 'none';
    // Restart audio to apply new reverb settings if running
    if (baseOsc) {
      const currentBand = getCurrentBandHz();
      startGraph(currentBand);
    }
  });
}

// Meditate controls
if (medPlay) medPlay.addEventListener('click', startMeditation);
if (medStop) medStop.addEventListener('click', () => stopMeditation(false));

// Phase sweep controls
if (phaseRange) phaseRange.addEventListener('input', updatePhaseLabel);
if (sweepSeconds) sweepSeconds.addEventListener('input', updateSweepLabel);
if (sweepToggle) sweepToggle.addEventListener('click', toggleAutosweep);
if (markStrongest) markStrongest.addEventListener('click', handleMarkStrongest);
if (clearBestPhase) clearBestPhase.addEventListener('click', () => {
  clearBestPhaseForBand(getExploreBandKey());
});

// Carrier/depth/volume sliders
if (carrierRange) carrierRange.addEventListener('input', updateCarrierLabel);
if (depthRange)   depthRange.addEventListener('input', updateDepthLabel);
if (volumeRange)  volumeRange.addEventListener('input', updateVolumeLabel);
if (toneMixRange) toneMixRange.addEventListener('input', updateToneMixLabel);

// Soundscape sliders (Explore)
if (oceanRange) oceanRange.addEventListener('input', () => {
  // Sync med slider
  if (medOceanRange && medOceanRange.value !== oceanRange.value) {
    medOceanRange.value = oceanRange.value;
  }
  updateSoundscapeLabels();
  updateSoundscapes();
});
if (rainRange) rainRange.addEventListener('input', () => {
  if (medRainRange && medRainRange.value !== rainRange.value) {
    medRainRange.value = rainRange.value;
  }
  updateSoundscapeLabels();
  updateSoundscapes();
});
if (birdsRange) birdsRange.addEventListener('input', () => {
  if (medBirdsRange && medBirdsRange.value !== birdsRange.value) {
    medBirdsRange.value = birdsRange.value;
  }
  updateSoundscapeLabels();
  updateSoundscapes();
});
if (wavesRange) wavesRange.addEventListener('input', () => {
  if (medWavesRange && medWavesRange.value !== wavesRange.value) {
    medWavesRange.value = wavesRange.value;
  }
  updateSoundscapeLabels();
  updateSoundscapes();
});

// Soundscape sliders (Meditate) – propagate to Explore controls
if (medOceanRange) medOceanRange.addEventListener('input', () => {
  if (oceanRange && oceanRange.value !== medOceanRange.value) {
    oceanRange.value = medOceanRange.value;
  }
  updateSoundscapeLabels();
  updateSoundscapes();
});
if (medRainRange) medRainRange.addEventListener('input', () => {
  if (rainRange && rainRange.value !== medRainRange.value) {
    rainRange.value = medRainRange.value;
  }
  updateSoundscapeLabels();
  updateSoundscapes();
});
if (medBirdsRange) medBirdsRange.addEventListener('input', () => {
  if (birdsRange && birdsRange.value !== medBirdsRange.value) {
    birdsRange.value = medBirdsRange.value;
  }
  updateSoundscapeLabels();
  updateSoundscapes();
});
if (medWavesRange) medWavesRange.addEventListener('input', () => {
  if (wavesRange && wavesRange.value !== medWavesRange.value) {
    wavesRange.value = medWavesRange.value;
  }
  updateSoundscapeLabels();
  updateSoundscapes();
});

// Breathing slider (Explore)
if (breathSeconds) breathSeconds.addEventListener('input', () => {
  // Sync med slider value
  if (medBreathSeconds && medBreathSeconds.value !== breathSeconds.value) {
    medBreathSeconds.value = breathSeconds.value;
  }
  updateBreathAnimation();
});

// Breathing slider (Meditate)
if (medBreathSeconds) medBreathSeconds.addEventListener('input', () => {
  if (breathSeconds && breathSeconds.value !== medBreathSeconds.value) {
    breathSeconds.value = medBreathSeconds.value;
  }
  updateBreathAnimation();
});

// Session length slider
if (sessionMinutes) sessionMinutes.addEventListener('input', updateSessionLabel);

// Frequency selectors
if (freqSelect) freqSelect.addEventListener('change', () => {
  updatePhaseLabel();
  updateBreathAnimation();
  updateBestPhaseDisplay();
});
if (medFreqSelect) medFreqSelect.addEventListener('change', () => {
  updateMedPhaseLabel();
});

// Initial UI state setup
updatePhaseLabel();
updateSweepLabel();
updateCarrierLabel();
updateDepthLabel();
updateVolumeLabel();
updateToneMixLabel();
updateSessionLabel();
updateSoundscapeLabels();
updateBreathAnimation();
updateBestPhaseDisplay();
updateMedPhaseLabel();

// Ensure AudioContext exists and begin loading high-quality soundscape samples at startup.
ensureAudio();
loadOceanSample().catch(() => {});
loadRainSample().catch(() => {});
loadBirdsSample().catch(() => {});
loadWavesSample().catch(() => {});

// Journal entry buttons
if (saveJournalEntryBtn) saveJournalEntryBtn.addEventListener('click', handleSaveJournalEntry);
if (exportJournalBtn) exportJournalBtn.addEventListener('click', handleExportJournal);
if (exportJournalToNotesBtn) exportJournalToNotesBtn.addEventListener('click', handleExportJournalToNotes);
if (clearJournalBtn) clearJournalBtn.addEventListener('click', handleClearJournal);
if (clearJournalFieldsBtn) clearJournalFieldsBtn.addEventListener('click', handleClearJournalFields);
if (hideJournalEntriesBtn) hideJournalEntriesBtn.addEventListener('click', handleHideJournalEntries);
// History export and clear buttons
if (exportHistoryBtn) exportHistoryBtn.addEventListener('click', handleExportHistory);
if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', handleClearHistory);

// Fine‑tune sweep button
const fineTuneBtn = document.getElementById('fineTune');
if (fineTuneBtn) {
  fineTuneBtn.addEventListener('click', () => {
    fineTuneBtn.hidden = true;
    startFineTuneSweep();
  });
}

// Load persistent best phase history on startup
try {
  const loaded = loadPhaseHistory();
  Object.keys(loaded).forEach((k) => {
    bestPhaseByBand[k] = loaded[k];
  });
} catch {}
renderPhaseHistory();
updateBestPhaseDisplay();
updateMedPhaseLabel();

// Load chord data and optional recommendation preferences, then initialise
// the chord loop UI.
Promise.all([loadChordManifest(), loadChordPreferences()]).then(() => {
  updateChordLoopUI();
}).catch(() => {
  // Fail silently; app falls back to synthesised chords.
});

// Load existing journal entries at startup
renderJournalEntries();

// Attempt to recover audio when returning from background/app switching.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    resumeAudioContextIfInterrupted();
  }
});
window.addEventListener('pageshow', () => {
  resumeAudioContextIfInterrupted();
});
window.addEventListener('focus', () => {
  resumeAudioContextIfInterrupted();
});

// Clean up audio when leaving the page
window.addEventListener('beforeunload', () => {
  stopExplore();
  stopMeditation(false);
  stopCurrentAudio();
});
