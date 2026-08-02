// Scale theory: scale tables, name parsing, per-key note spelling, completion
// ranking and position generation along the neck. Pure functions and data — no
// DOM. Scale tables and the parsing/completion approach are shared with the
// harmonica project (same author).

import { NOTE_PC, pcName, MAX_FRET_DEFAULT } from './theory.js';

// Intervals in semitones from the root, keyed by every accepted spelling.
const SCALE_TYPES = {
  'major': [0, 2, 4, 5, 7, 9, 11], 'ionian': [0, 2, 4, 5, 7, 9, 11],
  'minor': [0, 2, 3, 5, 7, 8, 10], 'natural minor': [0, 2, 3, 5, 7, 8, 10],
  'natural': [0, 2, 3, 5, 7, 8, 10], 'aeolian': [0, 2, 3, 5, 7, 8, 10],
  'm': [0, 2, 3, 5, 7, 8, 10], // "E m" style, rarely typed but harmless
  'harmonic minor': [0, 2, 3, 5, 7, 8, 11],
  'melodic minor': [0, 2, 3, 5, 7, 9, 11],
  'harmonic major': [0, 2, 4, 5, 7, 8, 11],
  'major pentatonic': [0, 2, 4, 7, 9], 'pentatonic major': [0, 2, 4, 7, 9], 'maj pentatonic': [0, 2, 4, 7, 9],
  'minor pentatonic': [0, 3, 5, 7, 10], 'pentatonic minor': [0, 3, 5, 7, 10],
  'pentatonic': [0, 3, 5, 7, 10], 'm pentatonic': [0, 3, 5, 7, 10], 'min pentatonic': [0, 3, 5, 7, 10],
  'blues': [0, 3, 5, 6, 7, 10], 'minor blues': [0, 3, 5, 6, 7, 10], 'm blues': [0, 3, 5, 6, 7, 10],
  'major blues': [0, 2, 3, 4, 7, 9],
  'dorian': [0, 2, 3, 5, 7, 9, 10],
  'phrygian': [0, 1, 3, 5, 7, 8, 10],
  'phrygian dominant': [0, 1, 4, 5, 7, 8, 10],
  'lydian': [0, 2, 4, 6, 7, 9, 11],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'locrian': [0, 1, 3, 5, 6, 8, 10],
  'whole tone': [0, 2, 4, 6, 8, 10], 'wholetone': [0, 2, 4, 6, 8, 10],
  'diminished': [0, 2, 3, 5, 6, 8, 9, 11], 'whole half diminished': [0, 2, 3, 5, 6, 8, 9, 11],
  'dominant diminished': [0, 1, 3, 4, 6, 7, 9, 10], 'half whole diminished': [0, 1, 3, 4, 6, 7, 9, 10],
  'altered': [0, 1, 3, 4, 6, 8, 10], 'super locrian': [0, 1, 3, 4, 6, 8, 10],
  'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

// Display names where plain title-casing of the typed alias wouldn't do —
// aliases collapse to one canonical label.
const SCALE_LABELS = {
  natural: 'Natural Minor', m: 'Minor',
  'pentatonic major': 'Major Pentatonic', 'maj pentatonic': 'Major Pentatonic',
  'pentatonic minor': 'Minor Pentatonic',
  pentatonic: 'Minor Pentatonic', 'm pentatonic': 'Minor Pentatonic', 'min pentatonic': 'Minor Pentatonic',
  'minor blues': 'Blues', 'm blues': 'Blues',
  'whole half diminished': 'Diminished', 'half whole diminished': 'Dominant Diminished',
  'super locrian': 'Altered',
};
function scaleDisplayName(type){
  return SCALE_LABELS[type] || type.replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeAccidentals(s){
  return s.replace(/♯/g, '#').replace(/♭/g, 'b').replace(/𝄪/g, '##');
}

// Parse a note name at the START of `str` (letter + a run of accidentals).
function parseNoteHead(str){
  const letter = str[0]?.toUpperCase();
  if(!(letter in NOTE_PC)) return null;
  let pc = NOTE_PC[letter];
  let len = 1;
  while(len < str.length && (str[len] === '#' || str[len] === 'b')){
    pc += str[len] === '#' ? 1 : -1;
    len++;
  }
  return { pc: ((pc % 12) + 12) % 12, len };
}

// The added chromatic tone that gives the blues scales their name — the b5 of
// the minor blues, the b3 of the major blues. Diagrams tint it blue.
const BLUE_NOTE_INTERVALS = { 'Blues': 6, 'Major Blues': 3 };

function makeScale(rootPC, rootText, type, hadRoot){
  const rootName = rootText[0].toUpperCase() + rootText.slice(1);
  const intervals = SCALE_TYPES[type];
  const blueIv = BLUE_NOTE_INTERVALS[scaleDisplayName(type)];
  return {
    rootPC, rootName, type, hadRoot,
    label: `${rootName} ${scaleDisplayName(type)}`,
    intervals,
    pcs: intervals.map(iv => (rootPC + iv) % 12),
    blueNotePC: blueIv === undefined ? null : (rootPC + blueIv) % 12,
  };
}

function parseScale(input){
  const trimmed = normalizeAccidentals(String(input).trim()).replace(/\s+scale\s*$/i, '');
  // Prefer "<root> <type>". Fall back to the whole string as a type with a
  // default C root, so mode names whose first letter is itself a note
  // ("Dorian" → D, "Aeolian" → A) aren't mis-read as the root.
  const head = parseNoteHead(trimmed);
  if(head){
    const rest = trimmed.slice(head.len).trim().toLowerCase();
    const type = rest === '' ? 'major' : rest;
    if(type in SCALE_TYPES) return makeScale(head.pc, trimmed.slice(0, head.len), type, true);
  }
  const whole = trimmed.toLowerCase();
  if(whole in SCALE_TYPES) return makeScale(0, 'C', whole, false);
  return null;
}

// Rewrites the root of a scale query, keeping everything after it as typed —
// the counterpart of theory.js's transposeChordText. Text that doesn't name a
// scale comes back unchanged; a rootless query ("dorian") gains an explicit
// root, since its implied C would otherwise shift invisibly.
function transposeScaleText(text, delta){
  const raw = String(text);
  const parsed = parseScale(raw);
  if(!parsed) return raw;
  const pc = ((parsed.rootPC + delta) % 12 + 12) % 12;
  const lead = raw.match(/^\s*/)[0];
  const rest = raw.slice(lead.length);
  // normalizeAccidentals is length-preserving, so head.len indexes `rest` too
  const head = parseNoteHead(normalizeAccidentals(rest));
  if(!head || !parsed.hadRoot) return `${lead}${pcName(pc, false)} ${rest}`;
  const preferFlat = normalizeAccidentals(rest).slice(1, head.len).includes('b');
  const name = pcName(pc, preferFlat);
  const root = rest[0] === rest[0].toLowerCase() ? name[0].toLowerCase() + name.slice(1) : name;
  return lead + root + rest.slice(head.len);
}

// --- Completions ------------------------------------------------------------
// What can follow a root note, roughly in the order a player wants it.
const COMPLETION_CATALOGUE = [
  [' Major', 'Major scale (Ionian)'],
  [' Minor', 'Natural minor scale (Aeolian)'],
  [' Blues', 'Blues scale'],
  [' Minor Pentatonic', 'Minor pentatonic scale'],
  [' Major Pentatonic', 'Major pentatonic scale'],
  [' Mixolydian', 'Mixolydian mode'],
  [' Dorian', 'Dorian mode'],
  [' Major Blues', 'Major blues scale'],
  [' Harmonic Minor', 'Harmonic minor scale'],
  [' Melodic Minor', 'Melodic minor scale'],
  [' Lydian', 'Lydian mode'],
  [' Phrygian', 'Phrygian mode'],
  [' Phrygian Dominant', 'Phrygian dominant scale'],
  [' Locrian', 'Locrian mode'],
  [' Ionian', 'Ionian mode, the major scale'],
  [' Aeolian', 'Aeolian mode, the natural minor'],
  [' Harmonic Major', 'Harmonic major scale'],
  [' Whole Tone', 'Whole tone scale'],
  [' Diminished', 'Whole-half diminished scale'],
  [' Dominant Diminished', 'Half-whole diminished scale'],
  [' Altered', 'Altered scale (super Locrian)'],
  [' Chromatic', 'Chromatic scale'],
];

// The catalogue is written by hand, so each entry has to prove it still parses —
// an entry that drifts from the table above is dropped rather than offered as a
// suggestion the app would then fail to read.
const COMPLETIONS = COMPLETION_CATALOGUE
  .map(([suffix, desc]) => ({ suffix, desc }))
  .filter(c => parseScale(`C${c.suffix}`) !== null);

// How well an entry answers what was typed after the root, best first, or null
// for no match: name prefix ("dor" → Dorian), then any word ("pent" → both
// pentatonics), then word-by-word for several typed words ("mel min").
function completionRank(typed, { suffix, desc }){
  if(!typed) return 0;
  const name = suffix.trim().toLowerCase();
  const description = desc.toLowerCase();
  if(name.startsWith(typed)) return 0;
  if(description.startsWith(typed)) return 1;
  const words = `${name} ${description}`.split(/[\s(),-]+/).filter(Boolean);
  if(words.some(w => w.startsWith(typed))) return 2;
  const tokens = typed.split(/\s+/);
  if(tokens.length > 1 && tokens.every(t => words.some(w => w.startsWith(t)))) return 3;
  return null;
}

// Completions for a partially typed query, as {text, desc} with `text` the full
// query to apply. Empty until a root note is typed, since every suggestion is
// built on one. The root keeps the user's own spelling so "F#" never comes back
// as "Gb". Array#sort is stable, so equal ranks stay in catalogue order.
function scaleCompletions(input){
  const s = normalizeAccidentals(String(input).trimStart());
  const head = parseNoteHead(s);
  if(!head) return [];
  const root = s[0].toUpperCase() + s.slice(1, head.len);
  const typed = s.slice(head.len).trim().toLowerCase();
  return COMPLETIONS
    .map(c => ({ text: root + c.suffix, desc: c.desc, rank: completionRank(typed, c) }))
    .filter(c => c.rank !== null)
    .sort((a, b) => a.rank - b.rank)
    .map(({ text, desc }) => ({ text, desc }));
}

// --- Spelling ---------------------------------------------------------------
// Which letter each scale degree takes, as offsets from the root's letter.
// Heptatonic scales use one letter per degree, which is what makes F# major
// spell E# rather than F. Pentatonic/blues subsets skip the letters their
// missing degrees would have used; the blues b5 borrows the 5th's letter
// (A blues has an Eb, not a D#), the major-blues b3 borrows the 3rd's.
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ACCIDENTAL_FOR = { 0: '', 1: '#', 2: '##', 10: 'bb', 11: 'b' };
const HEPTATONIC_OFFSETS = [0, 1, 2, 3, 4, 5, 6];
const LETTER_OFFSETS = {
  'Major Pentatonic': [0, 1, 2, 4, 5],
  'Minor Pentatonic': [0, 2, 3, 4, 6],
  'Blues': [0, 2, 3, 4, 4, 6],
  'Major Blues': [0, 1, 2, 2, 4, 5],
};

function fallbackSpelling(rootPC, intervals, preferFlat){
  return intervals.map(iv => pcName((rootPC + iv) % 12, preferFlat));
}

// Note names for a scale, aligned with its intervals, or null for input that
// doesn't name a scale. Scales without a letter-per-degree convention (whole
// tone, diminished, chromatic…) fall back to the root's accidental family, as
// does any spelling that would need a triple accidental.
// `simplifyDoubles` trades the letter-per-degree rule for legibility where it
// costs a double accidental: Gb blues reads Gb A Cb C Db Fb rather than
// Gb Bbb Cb Dbb Db Fb. Same pitches, simpler names on the dots.
function spellScale(rootName, type, simplifyDoubles){
  const intervals = SCALE_TYPES[type];
  if(!intervals) return null;
  const root = normalizeAccidentals(String(rootName).trim());
  const head = parseNoteHead(root);
  if(!head || head.len !== root.length) return null;
  const preferFlat = root.includes('b') || root.toUpperCase() === 'F';
  if(simplifyDoubles){
    const strict = spellScale(rootName, type);
    return strict.map((name, i) => name.length > 2 ? pcName((head.pc + intervals[i]) % 12, preferFlat) : name);
  }
  const offsets = intervals.length === 7 ? HEPTATONIC_OFFSETS : LETTER_OFFSETS[scaleDisplayName(type)];
  if(!offsets) return fallbackSpelling(head.pc, intervals, preferFlat);
  const rootLetterIdx = LETTERS.indexOf(root[0].toUpperCase());
  const names = [];
  for(let i = 0; i < intervals.length; i++){
    const letter = LETTERS[(rootLetterIdx + offsets[i]) % 7];
    const pc = (head.pc + intervals[i]) % 12;
    const acc = ACCIDENTAL_FOR[((pc - NOTE_PC[letter]) % 12 + 12) % 12];
    if(acc === undefined) return fallbackSpelling(head.pc, intervals, preferFlat);
    names.push(letter + acc);
  }
  return names;
}

// The first double accidental letter-per-degree spelling costs this scale, as
// { from, to } with the enharmonic name simplifying gives it — null where the
// scale never reaches one, which is also the only case where the choice is
// worth offering at all.
function doubleAccidentalExample(rootName, type){
  const strict = spellScale(rootName, type);
  if(!strict) return null;
  const i = strict.findIndex(name => name.length > 2);
  return i === -1 ? null : { from: strict[i], to: spellScale(rootName, type, true)[i] };
}

// pc → spelled name for a scale, for labelling diagram dots.
function scaleNoteNames(rootName, type, simplifyDoubles){
  const names = spellScale(rootName, type, simplifyDoubles);
  if(!names) return null;
  const head = parseNoteHead(normalizeAccidentals(String(rootName).trim()));
  const map = {};
  SCALE_TYPES[type].forEach((iv, i) => {
    const pc = (head.pc + iv) % 12;
    if(!(pc in map)) map[pc] = names[i];
  });
  return map;
}

// --- Positions --------------------------------------------------------------
// A position is a fret window in which every string offers its in-scale notes.
// Box width adapts to the tuning: wide enough that consecutive strings overlap
// (W ≥ the largest gap between adjacent open strings) and that every box spans
// a full chromatic octave — so every scale tone appears in every box. That
// gives the classic 5-fret boxes on ukulele-family tunings and the wider 7-fret
// positions mandolin players actually use.
function windowSize(tuning){
  const sorted = [...tuning.openAbs].sort((a, b) => a - b);
  let maxGap = 0;
  for(let i = 1; i < sorted.length; i++) maxGap = Math.max(maxGap, sorted[i] - sorted[i - 1]);
  return Math.max(5, maxGap);
}

// All positions of a scale along the neck, lowest first. Windows are anchored
// where the lowest-PITCHED string (not string 0 — tunings can be re-entrant)
// carries a scale tone, so the box's bottom fret is always playable and open
// strings belong to the nut box alone. Each position:
//   { startFret, endFret, strings: number[][] per string, midis: ascending }
// With a rootPC, a box is instead any window holding a root and the root above
// it, cut back to the pitches between them: the shape (and its practice run)
// starts and ends on the root, with every scale tone of the octave in between.
// Anchoring those windows on the lowest string's root would leave one box per
// twelve frets — one on a neck this short — so every window is tried, and each
// octave of the root keeps a single box, its tightest fingering.
function scalePositions(scalePCs, tuning, maxFret = MAX_FRET_DEFAULT, rootPC = null){
  const pcSet = new Set(scalePCs);
  const W = windowSize(tuning);
  const anchorString = tuning.openAbs.indexOf(Math.min(...tuning.openAbs));
  const positions = [];
  const runsSeen = new Map();
  for(let s = 0; s + W - 1 <= maxFret; s++){
    if(rootPC === null && !pcSet.has((tuning.openPCs[anchorString] + s) % 12)) continue;
    const strings = tuning.openPCs.map(openPC => {
      const frets = [];
      for(let f = s; f <= s + W - 1; f++){
        if(pcSet.has((openPC + f) % 12)) frets.push(f);
      }
      return frets;
    });
    // The same pitch within reach on two NEIGHBOURING strings is one note
    // refingered — a run switches strings rather than stretch after it (the
    // open E, not the C string's 4th fret), so it keeps the lower-fret spot.
    // The same pitch on non-adjacent strings — a re-entrant string doubling
    // the linear run — is a real part of the shape and stays.
    for(let i = 0; i + 1 < strings.length; i++){
      const nextFretByMidi = new Map(strings[i + 1].map(f => [tuning.openAbs[i + 1] + f, f]));
      for(const f of [...strings[i]]){
        const twin = nextFretByMidi.get(tuning.openAbs[i] + f);
        if(twin === undefined) continue;
        if(f < twin) strings[i + 1] = strings[i + 1].filter(x => x !== twin);
        else strings[i] = strings[i].filter(x => x !== f);
      }
    }
    let startFret = s, endFret = s + W - 1;
    if(rootPC !== null){
      const roots = strings
        .flatMap((frets, i) => frets.map(f => tuning.openAbs[i] + f))
        .filter(m => m % 12 === rootPC);
      const loRoot = Math.min(...roots), hiRoot = Math.max(...roots);
      // no root, or a lone one with nowhere to run: no root-to-root box here
      if(!(hiRoot > loRoot)) continue;
      strings.forEach((frets, i) => {
        strings[i] = frets.filter(f => tuning.openAbs[i] + f >= loRoot && tuning.openAbs[i] + f <= hiRoot);
      });
      // the trimmed shape rarely fills its window — the box is what is left
      const used = strings.flat();
      startFret = Math.min(...used);
      endFret = Math.max(...used);
    }
    // playback still sounds every pitch once, wherever it is doubled
    const midis = [...new Set(strings.flatMap((frets, i) => frets.map(f => tuning.openAbs[i] + f)))]
      .sort((a, b) => a - b);
    const box = { startFret, endFret, strings, midis };
    if(rootPC === null){ positions.push(box); continue; }
    // Neighbouring windows re-finger the same octave of the root over and over.
    // One octave is one box, in the narrowest fret span that plays it whole.
    const run = midis.join(',');
    const kept = runsSeen.get(run);
    if(!kept || endFret - startFret < kept.endFret - kept.startFret) runsSeen.set(run, box);
  }
  return rootPC === null
    ? positions
    : [...runsSeen.values()].sort((a, b) => a.startFret - b.startFret);
}

// The whole neck at once, shaped like a position ({strings, midis}) so the same
// diagram, playback and export paths take either. Every scale tone up to
// `maxFret` is kept, including the same pitch on two strings — a neck map is
// exactly where a player wants to see both places to play a note.
// With a rootPC the map is trimmed to the lowest and highest root on the neck,
// so the picture (and its run) still starts and ends on the root — and stays
// empty where the neck never reaches a second root to run to.
function scaleNeck(scalePCs, tuning, maxFret = MAX_FRET_DEFAULT, rootPC = null){
  const pcSet = new Set(scalePCs);
  let strings = tuning.openPCs.map(openPC => {
    const frets = [];
    for(let f = 0; f <= maxFret; f++){
      if(pcSet.has((openPC + f) % 12)) frets.push(f);
    }
    return frets;
  });
  if(rootPC !== null){
    const roots = strings
      .flatMap((frets, i) => frets.map(f => tuning.openAbs[i] + f))
      .filter(m => m % 12 === rootPC);
    // one root, or none, is no run: a map trimmed to a single pitch would draw
    // that one dot and call it the scale
    const lo = Math.min(...roots), hi = Math.max(...roots);
    strings = hi > lo
      ? strings.map((frets, i) => frets.filter(f => tuning.openAbs[i] + f >= lo && tuning.openAbs[i] + f <= hi))
      : strings.map(() => []);
  }
  const midis = [...new Set(strings.flatMap((frets, i) => frets.map(f => tuning.openAbs[i] + f)))]
    .sort((a, b) => a - b);
  return { startFret: 0, endFret: maxFret, strings, midis };
}

// The practice run for a position: up the box and back down, top note once.
function positionPlaybackMidis(position){
  return position.midis.concat(position.midis.slice(0, -1).reverse());
}

// Where a position's diagram starts: one context fret above the box, except at
// the nut, where the open-string row is the context.
function positionStartFret(position){
  return position.startFret === 0 ? 0 : position.startFret - 1;
}

export {
  SCALE_TYPES, scaleDisplayName, parseScale, scaleCompletions, transposeScaleText,
  spellScale, scaleNoteNames, doubleAccidentalExample,
  windowSize, scalePositions, scaleNeck, positionPlaybackMidis, positionStartFret,
};
