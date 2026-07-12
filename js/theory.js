// Music theory: note/chord tables, tunings, chord parsing, voicing search,
// transposition. Pure functions and data — no DOM.

const NOTE_PC = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};

const MAX_FRET_MIN = 5, MAX_FRET_MAX = 24, MAX_FRET_DEFAULT = 15;

const MAX_SPAN_MIN = 2, MAX_SPAN_MAX = 12, MAX_SPAN_DEFAULT = 7;

const MAX_VOICINGS = 15;

const CHORD_TONES = {
  major:[0,4,7], minor:[0,3,7], five:[0,7],
  dom7:[0,4,7,10], min7:[0,3,7,10], maj7:[0,4,7,11],
  dim:[0,3,6], dim7:[0,3,6,9], m7b5:[0,3,6,10],
  aug:[0,4,8], sus2:[0,2,7], sus4:[0,5,7],
  six:[0,4,7,9], m6:[0,3,7,9],
  add9:[0,2,4,7], madd9:[0,2,3,7],
  // 5-tone extended chords don't fit 4 strings; drop the 5th, the standard shell voicing.
  dom9:[0,4,10,2], six9:[0,4,9,2], maj9:[0,4,11,2],
};
// Interval (from root) omitted for each shell-voiced quality above, so the UI can disclose it.
const OMITTED_TONE = {
  dom9:{ interval:7, label:'5th' }, six9:{ interval:7, label:'5th' }, maj9:{ interval:7, label:'5th' },
};
const NOTE_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
function pcName(pc, preferFlat){
  return (preferFlat ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP)[((pc%12)+12)%12];
}

const TUNINGS = [
  { id:'uke_high_g',  name:'Ukulele (high G)',    tuningLabel:'GCEA', labels:['G','C','E','A'], openAbs:[67,60,64,69], icon:'ukulele' },
  { id:'uke_low_g',   name:'Ukulele (low G)',     tuningLabel:'GCEA', labels:['G','C','E','A'], openAbs:[55,60,64,69], icon:'ukulele' },
  { id:'uke_d_tuning', name:'Ukulele (D-tuning)', tuningLabel:'ADF#B', labels:['A','D','F#','B'], openAbs:[69,62,66,71], icon:'ukulele' },
  { id:'uke_low_e',   name:'Ukulele (low E)',     tuningLabel:'EAC#F#', labels:['E','A','C#','F#'], openAbs:[52,57,61,66], icon:'ukulele' },
  { id:'bari_uke',    name:'Baritone ukulele',    tuningLabel:'DGBE', labels:['D','G','B','E'], openAbs:[50,55,59,64], icon:'ukulele' },
  { id:'mandolin',    name:'Mandolin',            tuningLabel:'GDAE', labels:['G','D','A','E'], openAbs:[55,62,69,76], icon:'mandolin' },
  { id:'mandola',     name:'Mandola',             tuningLabel:'CGDA', labels:['C','G','D','A'], openAbs:[48,55,62,69], icon:'mandolin' },
  { id:'tenor_banjo', name:'Tenor banjo',         tuningLabel:'CGDA', labels:['C','G','D','A'], openAbs:[48,55,62,69], icon:'banjo' },
  { id:'plectrum_banjo', name:'Plectrum banjo',   tuningLabel:'CGBD', labels:['C','G','B','D'], openAbs:[48,55,59,62], icon:'banjo' },
];
TUNINGS.forEach(t => t.openPCs = t.openAbs.map(a => ((a%12)+12)%12));

function noteToPC(letter, acc){
  let pc = NOTE_PC[letter.toUpperCase()];
  if(acc === '#') pc = (pc+1)%12;
  else if(acc === 'b') pc = (pc+11)%12;
  return pc;
}

function resolveQuality(raw){
  if(raw === 'M7') return 'maj7';
  const q = raw.toLowerCase().trim();
  const map = {
    '':'major', 'maj':'major',
    'm':'minor', 'min':'minor', '-':'minor',
    '5':'five', 'no3':'five', '(no3)':'five',
    '7':'dom7',
    'm7':'min7', 'min7':'min7', '-7':'min7',
    'maj7':'maj7', 'ma7':'maj7',
    'dim':'dim', '°':'dim', 'o':'dim',
    'dim7':'dim7', '°7':'dim7', 'o7':'dim7',
    'm7b5':'m7b5', 'm7-5':'m7b5', 'ø':'m7b5', 'ø7':'m7b5', 'halfdim':'m7b5', 'halfdim7':'m7b5',
    'aug':'aug', '+':'aug',
    'sus2':'sus2',
    'sus4':'sus4', 'sus':'sus4',
    '6':'six',
    'm6':'m6', 'min6':'m6',
    'add9':'add9',
    'madd9':'madd9', 'minadd9':'madd9', 'm(add9)':'madd9',
    '7add9':'dom9', '9':'dom9', 'dom9':'dom9',
    '6add9':'six9', '6/9':'six9', '69':'six9',
    'maj7add9':'maj9', 'maj9':'maj9', 'ma9':'maj9',
  };
  return map.hasOwnProperty(q) ? map[q] : null;
}

function parseChord(input){
  const raw = input.trim();
  // trailing "*" = show every voicing of this chord as its own tile
  const showAll = /\*$/.test(raw);
  const core = showAll ? raw.slice(0,-1).trim() : raw;
  const m = core.match(/^([A-Ga-g])(#|b)?(.*?)(?:\/([A-Ga-g])(#|b)?)?$/);
  if(!m) return { error:`Could not parse "${raw}"` };
  const rootPC = noteToPC(m[1], m[2]||'');
  const qualityKey = resolveQuality(m[3]||'');
  if(qualityKey===null) return { error:`Unknown chord quality in "${raw}"` };
  let requiredPCs = [...new Set(CHORD_TONES[qualityKey].map(iv => (rootPC+iv)%12))];
  let bassPC = null;
  if(m[4]) bassPC = noteToPC(m[4], m[5]||'');
  let omitInfo = OMITTED_TONE[qualityKey];
  // A slash bass outside the chord (e.g. E7/A) needs a 5th simultaneous note that no
  // 4-string instrument has a string for; drop the 5th to fit, same shell-voicing
  // trick already used for 7add9/6add9/maj7add9 above.
  if(bassPC!==null && !requiredPCs.includes(bassPC) && requiredPCs.length>3 && !omitInfo){
    const fifthIv = CHORD_TONES[qualityKey].find(iv => iv===6||iv===7||iv===8);
    if(fifthIv!==undefined){
      const fifthPC = (rootPC+fifthIv)%12;
      requiredPCs = requiredPCs.filter(pc => pc!==fifthPC);
      omitInfo = { interval:fifthIv, label: fifthIv===6 ? 'b5' : fifthIv===8 ? '#5' : '5th' };
    }
  }
  const omitted = omitInfo
    ? { label:omitInfo.label, note:pcName((rootPC+omitInfo.interval)%12, m[2]==='b') }
    : null;
  return { label: core, showAll, requiredPCs, bassPC, rootPC, omitted };
}

function findVoicings(requiredPCs, bassPC, tuning, maxFret, maxSpan, maxCount, allowMuted){
  const perString = tuning.openPCs.map((openPC,i)=>{
    const opts = [];
    for(let f=0; f<=maxFret; f++){
      opts.push({ fret:f, pc:(openPC+f)%12, abs: tuning.openAbs[i]+f });
    }
    opts.push({ fret:null, pc:null, abs:null });
    return opts;
  });

  const candidates = [];
  for(const o0 of perString[0]) for(const o1 of perString[1])
  for(const o2 of perString[2]) for(const o3 of perString[3]){
    const combo=[o0,o1,o2,o3];
    const active = combo.filter(o=>o.fret!==null);
    if(active.length===0) continue;
    const pcSet = new Set(active.map(o=>o.pc));
    if(!requiredPCs.every(pc=>pcSet.has(pc))) continue;
    if(bassPC!==null){
      const minAbs = Math.min(...active.map(o=>o.abs));
      const bassEntry = active.find(o=>o.abs===minAbs);
      if(bassEntry.pc !== bassPC) continue;
    }
    const mutedCount = 4-active.length;
    const extraCount = active.filter(o=>!requiredPCs.includes(o.pc)).length;
    const frettedNZ = active.filter(o=>o.fret>0).map(o=>o.fret);
    const maxFretUsed = frettedNZ.length ? Math.max(...frettedNZ) : 0;
    const minFret = frettedNZ.length ? Math.min(...frettedNZ) : 0;
    const span = frettedNZ.length>1 ? (maxFretUsed-minFret) : 0;
    // span is a difference; the fingering covers span+1 frets inclusive
    if(span + 1 > maxSpan) continue;
    const openCount = active.filter(o=>o.fret===0).length;
    const sumFrets = frettedNZ.reduce((a,b)=>a+b,0);
    // muted strings are a last-resort fallback unless allowed; even allowed, a
    // light penalty keeps full voicings ahead of equally easy muted ones
    const cost = mutedCount*(allowMuted ? 40 : 1000) + extraCount*300 + span*15 + maxFretUsed*5 - openCount*5 + sumFrets*1;
    candidates.push({ frets: combo.map(o=>o.fret), cost });
  }
  candidates.sort((a,b)=>a.cost-b.cost);
  return candidates.slice(0, maxCount).map(c=>c.frets);
}

// Validates a voicing that came from outside the current search (a chooser pick
// made with a higher max fret) so it can be kept across regenerations — and
// dropped when it stops spelling the chord (e.g. after a tuning change).
function fretsSpellChord(frets, requiredPCs, bassPC, tuning){
  const active = frets
    .map((f,i)=> f===null ? null : { pc:(tuning.openPCs[i]+f)%12, abs:tuning.openAbs[i]+f })
    .filter(Boolean);
  if(!active.length) return false;
  const pcSet = new Set(active.map(o=>o.pc));
  if(!requiredPCs.every(pc=> pcSet.has(pc))) return false;
  if(bassPC !== null){
    const minAbs = Math.min(...active.map(o=>o.abs));
    if(active.find(o=> o.abs === minAbs).pc !== bassPC) return false;
  }
  return true;
}

function chordAbsNotes(frets, openAbs){
  return frets.map((f,i)=> f===null ? null : openAbs[i]+f).filter(n=>n!==null);
}

function computeFretWindow(frets, shortenThreshold){
  let fretMax = 3;
  frets.forEach(f => { if(f && f>fretMax) fretMax = f; });
  const frettedNZ = frets.filter(f => f && f>0);
  const minFret = frettedNZ.length ? Math.min(...frettedNZ) : 0;
  const startFret = minFret > shortenThreshold ? minFret-2 : 0;
  return { fretMax, startFret };
}

function transposedNoteName(letter, acc, delta, inheritFlat){
  const pc = (((noteToPC(letter, acc) + delta) % 12) + 12) % 12;
  const name = pcName(pc, acc === 'b' || (!acc && inheritFlat));
  return letter === letter.toLowerCase() ? name.charAt(0).toLowerCase() + name.slice(1) : name;
}

function transposeToken(core, delta){
  const m = core.match(/^([A-Ga-g])(#|b)?(.*?)(?:\/([A-Ga-g])(#|b)?)?$/);
  // mirror parseChord's validation: a token it rejects ("Chorus:", "Cmaj13") is
  // not a chord here either and must not be rewritten; quality text passes through
  if(!m || resolveQuality(m[3]||'') === null) return core;
  const root = transposedNoteName(m[1], m[2]||'', delta, false);
  let out = root + (m[3]||'');
  if(m[4]){
    // an unmarked bass follows the new root's accidental family (E/G#, not E/Ab)
    out += '/' + transposedNoteName(m[4], m[5]||'', delta, root.length > 1 && root.endsWith('b'));
  }
  return out;
}

function transposeChordText(text, delta){
  const parts = text.split(/([,\n]+)/);
  for(let i=0; i<parts.length; i+=2){
    const trimmed = parts[i].trim();
    if(trimmed === '') continue;
    const starMatch = trimmed.match(/(\s*\*)$/);
    const core = starMatch ? trimmed.slice(0, -starMatch[1].length) : trimmed;
    const lead = parts[i].match(/^\s*/)[0];
    const trail = parts[i].match(/\s*$/)[0];
    parts[i] = lead + transposeToken(core, delta) + (starMatch ? starMatch[1] : '') + trail;
  }
  return parts.join('');
}

const CUSTOM_CHORD_MAX_NOTES = 4;

// Parses free-text note names ("A, C#, Eb") into pitch classes for findVoicings.
// Unlike parseChord there's no quality or slash-bass syntax — just note letters.
function parseNoteList(input){
  const tokens = input.split(',').map(t=>t.trim()).filter(Boolean);
  if(!tokens.length) return { error:'Enter at least one note.' };
  if(tokens.length > CUSTOM_CHORD_MAX_NOTES) return { error:`Enter at most ${CUSTOM_CHORD_MAX_NOTES} notes.` };
  const pcs = [];
  for(const tok of tokens){
    const m = tok.match(/^([A-Ga-g])(#|b)?$/);
    if(!m) return { error:`Could not parse "${tok}" as a note.` };
    pcs.push(noteToPC(m[1], m[2]||''));
  }
  return { tokens, requiredPCs:[...new Set(pcs)] };
}

// Live link to reopen this exact search — mirrors syncVoicingModalOpenAll,
// carried on top of whatever chart/tuning params are already in the URL.

export {
  NOTE_PC, CHORD_TONES, OMITTED_TONE, TUNINGS,
  MAX_FRET_MIN, MAX_FRET_MAX, MAX_FRET_DEFAULT,
  MAX_SPAN_MIN, MAX_SPAN_MAX, MAX_SPAN_DEFAULT,
  MAX_VOICINGS, CUSTOM_CHORD_MAX_NOTES,
  pcName, noteToPC, resolveQuality, parseChord, parseNoteList,
  findVoicings, fretsSpellChord, computeFretWindow, chordAbsNotes,
  transposedNoteName, transposeToken, transposeChordText,
};
