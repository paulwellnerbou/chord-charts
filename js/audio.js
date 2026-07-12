// Web Audio playback (plucked-string synthesis) and play-button feedback.

const PLAYING_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" class="play-icon-bars"><rect x="4" y="4" width="3" height="16" rx="1"/><rect x="10.5" y="4" width="3" height="16" rx="1"/><rect x="17" y="4" width="3" height="16" rx="1"/></svg>`;

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

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, t0);

  // lowpass sweep gives the triangle wave a plucked-string character
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.6;
  filter.frequency.setValueAtTime(freq*8, t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(freq*1.2, 200), t0+0.5);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0+0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0+1.4);

  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0+1.5);
}

// resolves once every note has actually been scheduled (see playNote)
function playChord(midiNotes){
  return Promise.all(midiNotes.map((m,i)=> playNote(m, { delay:i*0.025, gain:0.18 })));
}

// matches scheduleNote's envelope: last-triggered note starts at (n-1)*25ms
// and rings for 1.5s before its oscillator stops
function chordPlayDuration(midiNotes){
  return midiNotes.length ? (midiNotes.length-1)*25 + 1500 : 0;
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

function playChordAndFlash(btn, midiNotes){
  flashPlayButton(btn, playChord(midiNotes), chordPlayDuration(midiNotes));
}

export { playNote, playChord, chordPlayDuration, flashPlayButton, playChordAndFlash };
