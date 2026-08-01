// Web Audio playback (plucked-string synthesis) and play-button feedback.

const PLAYING_ICON = `<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" class="play-icon-bars"><rect x="4" y="4" width="3" height="16" rx="1"/><rect x="10.5" y="4" width="3" height="16" rx="1"/><rect x="17" y="4" width="3" height="16" rx="1"/></svg>`;

let audioCtx = null;

function getAudioCtx(){
  if(!audioCtx){
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
    // iOS routes Web Audio through the "ambient" audio session, which the
    // ring/silent hardware switch mutes — so playback is silent on iPhones in
    // silent mode even though the same code sounds fine on Android. Reclassify
    // the session as "playback" (like music apps) so the switch doesn't apply.
    try{
      if(navigator.audioSession) navigator.audioSession.type = 'playback';
    }catch(e){ /* keep playback working even if the session can't be reclassified */ }
  }
  return audioCtx;
}

function midiToFreq(midi){ return 440 * Math.pow(2, (midi-69)/12); }

// Below C4 both the ear and any small speaker lose a note's fundamental fast —
// at the bass low E, 41 Hz, it sits some 25 dB under a ukulele's G fed the same
// signal. Harmonics are what carry those notes, so the voice leans on them the
// lower it goes. 0 from C4 up, where the plain triangle voice already carries.
const LOW_TOP = 261.6, LOW_BOTTOM = 41.2;
function lowness(freq){
  return Math.min(1, Math.max(0, Math.log2(LOW_TOP/freq) / Math.log2(LOW_TOP/LOW_BOTTOM)));
}

// While a run is being recorded, every note is fed here as well as to the
// speakers, so the video carries the same sound the player hears.
let captureNode = null;

function startCapture(){
  captureNode = getAudioCtx().createMediaStreamDestination();
  return captureNode.stream;
}

function stopCapture(){ captureNode = null; }

// Gets the context running before it is needed. A suspended context resumes
// asynchronously with its clock frozen, and that delay would otherwise land
// between a recording's first frame and its first note.
function primeAudio(){
  const ctx = getAudioCtx();
  return ctx.state === 'running' ? Promise.resolve() : ctx.resume().catch(()=>{});
}

let resumePromise = null;

// resolves once the note has actually been scheduled — immediately when the
// context is already running, or after any in-flight resume() completes
function playNote(midi, opts){
  const ctx = getAudioCtx();
  // resume() covers both 'suspended' and iOS's 'interrupted' state (after a
  // call/Siri). It's async and the clock is frozen until it completes, so
  // schedule the note only once the context is actually running. A chord
  // fires several notes at once — share one in-flight resume() between them.
  if(ctx.state !== 'running'){
    if(!resumePromise) resumePromise = ctx.resume().finally(()=>{ resumePromise = null; });
    return resumePromise.then(()=> scheduleNote(ctx, midi, opts)).catch(()=>{});
  }
  scheduleNote(ctx, midi, opts);
  return Promise.resolve();
}

function scheduleNote(ctx, midi, opts){
  const delay = (opts && opts.delay) || 0;
  const peak = (opts && opts.gain) || 0.22;
  const t0 = ctx.currentTime + delay;
  const freq = midiToFreq(midi);
  const low = lowness(freq);

  // lowpass sweep gives the wave a plucked-string character; its resting point
  // lifts with `low` so the harmonics the note depends on survive the sweep
  const floor = 200 + low*900;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.6;
  filter.frequency.setValueAtTime(Math.max(freq*8, floor*2.8), t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(freq*1.2, floor), t0+0.5);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak*(1 + low*0.25), t0+0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0+1.4);
  filter.connect(gain);
  gain.connect(ctx.destination);
  if(captureNode) gain.connect(captureNode);

  // triangle up top, crossfading to sawtooth down low for its far richer
  // harmonics — 1/n against the triangle's 1/n²
  for(const [type, amp] of [['triangle', 1-low], ['sawtooth', low]]){
    if(amp <= 0.001) continue;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    const mix = ctx.createGain();
    mix.gain.value = amp;
    osc.connect(mix).connect(filter);
    osc.start(t0);
    osc.stop(t0+1.5);
  }
}

// per-note stagger in seconds: a quick strum, or a broken chord slow enough
// that each note registers on its own
const STRUM_GAP = 0.025, ARPEGGIO_GAP = 0.25;

function noteGap(opts){
  return (opts && opts.arpeggio) ? ARPEGGIO_GAP : STRUM_GAP;
}

// resolves once every note has actually been scheduled (see playNote)
function playChord(midiNotes, opts){
  const gap = noteGap(opts);
  return Promise.all(midiNotes.map((m,i)=> playNote(m, { delay:i*gap, gain:0.18 })));
}

// matches scheduleNote's envelope: the last-triggered note starts after
// (n-1) gaps and rings for 1.5s before its oscillator stops
function chordPlayDuration(midiNotes, opts){
  return midiNotes.length ? (midiNotes.length-1)*noteGap(opts)*1000 + 1500 : 0;
}

// How long a note is worth showing as "sounding". Far short of the 1.5s tail:
// the envelope is already some 14 dB down by the time the next note of a broken
// chord arrives, so holding a note lit for its whole ring-out would light a
// scale run end to end instead of one note at a time.
const NOTE_LIT_MS = 560;

// When each note of a strum or broken chord sounds, in ms from the moment
// playChord's promise resolves — so the UI can light a note as it arrives
// without restating the stagger.
function chordNoteTimings(midiNotes, opts){
  const gap = noteGap(opts)*1000;
  return midiNotes.map((midi,i)=> ({ midi, at:Math.round(i*gap), ms:NOTE_LIT_MS }));
}

// swaps a play button's icon to a "now playing" indicator while the sound
// rings, then restores it — purely visual, playback itself can't be stopped.
// `started` is the promise returned by playChord/playNote
function flashPlayButton(btn, started, durationMs){
  if(!btn) return;
  if(!btn._playIconOriginal) btn._playIconOriginal = btn.innerHTML;
  clearTimeout(btn._playIconTimer);
  btn.innerHTML = PLAYING_ICON;
  // ties the revert to this click specifically, so a rapid re-click (which
  // resets the icon and starts its own timer) can't be stepped on by a
  // still-pending resume() from the previous click
  const token = btn._playIconToken = {};
  started.then(()=>{
    if(btn._playIconToken !== token) return;
    btn._playIconTimer = setTimeout(()=>{
      btn.innerHTML = btn._playIconOriginal;
      btn._playIconTimer = null;
    }, durationMs);
  });
}

function playChordAndFlash(btn, midiNotes, opts){
  flashPlayButton(btn, playChord(midiNotes, opts), chordPlayDuration(midiNotes, opts));
}

export {
  playNote, playChord, chordPlayDuration, chordNoteTimings,
  primeAudio, startCapture, stopCapture,
  flashPlayButton, playChordAndFlash,
};
