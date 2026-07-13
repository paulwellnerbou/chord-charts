import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TUNINGS, MAX_VOICINGS,
  pcName, resolveQuality, parseChord, parseNoteList,
  findVoicings, fretsSpellChord, computeFretWindow, chordAbsNotes,
  transposeToken, transposeChordText,
} from '../js/theory.js';

const UKE = TUNINGS[0]; // high-G GCEA

test('pcName prefers sharps or flats and wraps out-of-range pitch classes', () => {
  assert.equal(pcName(10, false), 'A#');
  assert.equal(pcName(10, true), 'Bb');
  assert.equal(pcName(-2, false), 'A#');
  assert.equal(pcName(12, false), 'C');
});

test('resolveQuality maps aliases to canonical keys', () => {
  assert.equal(resolveQuality(''), 'major');
  assert.equal(resolveQuality('-'), 'minor');
  assert.equal(resolveQuality('M7'), 'maj7');
  assert.equal(resolveQuality('m7'), 'min7');
  assert.equal(resolveQuality('ø'), 'm7b5');
  assert.equal(resolveQuality('°7'), 'dim7');
  assert.equal(resolveQuality('+'), 'aug');
  assert.equal(resolveQuality('sus'), 'sus4');
  assert.equal(resolveQuality('6/9'), 'six9');
  assert.equal(resolveQuality('no3'), 'five');
  assert.equal(resolveQuality('maj13'), null);
});

test('parseChord reads root, quality, slash bass and the * suffix', () => {
  const c = parseChord('C');
  assert.deepEqual([...c.requiredPCs].sort((a, b) => a - b), [0, 4, 7]);
  assert.equal(c.rootPC, 0);
  assert.equal(c.bassPC, null);
  assert.equal(c.showAll, false);
  assert.equal(c.omitted, null);

  const slash = parseChord('D7/F#');
  assert.equal(slash.rootPC, 2);
  assert.equal(slash.bassPC, 6);

  const starred = parseChord('C*');
  assert.equal(starred.showAll, true);
  assert.equal(starred.label, 'C');

  assert.match(parseChord('H').error, /Could not parse/);
  assert.match(parseChord('Cmaj13').error, /Unknown chord quality/);
});

test('parseChord drops the 5th of extended chords and discloses it', () => {
  const c9 = parseChord('C9');
  assert.ok(!c9.requiredPCs.includes(7), '5th (G) must not be required');
  assert.equal(c9.omitted.label, '5th');
  assert.equal(c9.omitted.note, 'G');
});

test('parseChord drops the 5th when a foreign slash bass needs the string', () => {
  const e7a = parseChord('E7/A'); // E7 = E G# B D, bass A is a 5th note
  assert.ok(!e7a.requiredPCs.includes(11), '5th (B) must be dropped');
  assert.equal(e7a.omitted.label, '5th');
  assert.equal(e7a.omitted.note, 'B');
  assert.equal(e7a.bassPC, 9);
});

test('transposeToken shifts roots, keeps quality text and bass family', () => {
  assert.equal(transposeToken('C', 2), 'D');
  assert.equal(transposeToken('Bb', 1), 'B');
  assert.equal(transposeToken('Am7', 3), 'Cm7');
  // the unmarked bass follows the new root's accidental family: E/G#, not E/Ab
  assert.equal(transposeToken('F/A', -1), 'E/G#');
  // non-chords pass through untouched
  assert.equal(transposeToken('Chorus:', 2), 'Chorus:');
  assert.equal(transposeToken('Cmaj13', 2), 'Cmaj13');
});

test('transposeChordText preserves separators, whitespace and the * suffix', () => {
  assert.equal(transposeChordText('C, Am7, D7/F#, G/B', 2), 'D, Bm7, E7/G#, A/C#');
  assert.equal(transposeChordText('C,  Am\nF', 2), 'D,  Bm\nG');
  assert.equal(transposeChordText('C*, Chorus', 2), 'D*, Chorus');
  assert.equal(transposeChordText('Eb', -1), 'D');
});

test('findVoicings ranks the classic C shape first on a high-G ukulele', () => {
  const { requiredPCs } = parseChord('C');
  const voicings = findVoicings(requiredPCs, null, UKE, 15, 7, MAX_VOICINGS, false);
  assert.deepEqual(voicings[0], [0, 0, 0, 3]);
  assert.ok(voicings.length <= MAX_VOICINGS);
});

test('every voicing spells the chord and respects maxFret and maxSpan', () => {
  const { requiredPCs } = parseChord('Am7');
  const maxFret = 5, maxSpan = 2;
  const voicings = findVoicings(requiredPCs, null, UKE, maxFret, maxSpan, MAX_VOICINGS, false);
  assert.ok(voicings.length > 0);
  for (const frets of voicings) {
    assert.ok(fretsSpellChord(frets, requiredPCs, null, UKE));
    const fretted = frets.filter(f => f !== null && f > 0);
    assert.ok(frets.every(f => f === null || f <= maxFret));
    if (fretted.length > 1) {
      assert.ok(Math.max(...fretted) - Math.min(...fretted) + 1 <= maxSpan);
    }
  }
});

test('findVoicings honors the slash bass as the lowest sounding note', () => {
  const { requiredPCs, bassPC } = parseChord('G/B');
  const voicings = findVoicings(requiredPCs, bassPC, UKE, 12, 7, MAX_VOICINGS, false);
  assert.ok(voicings.length > 0);
  for (const frets of voicings) {
    const abs = frets.map((f, i) => f === null ? null : UKE.openAbs[i] + f).filter(n => n !== null);
    assert.equal(Math.min(...abs) % 12, 11, `lowest note of ${frets} must be B`);
  }
});

test('muted strings stay a last resort unless allowed, and never win outright', () => {
  const { requiredPCs } = parseChord('C');
  const strict = findVoicings(requiredPCs, null, UKE, 15, 7, MAX_VOICINGS, false);
  assert.ok(strict.every(frets => frets.every(f => f !== null)),
    'C major has enough full voicings to fill the list without muting');
  const relaxed = findVoicings(requiredPCs, null, UKE, 15, 7, MAX_VOICINGS, true);
  assert.ok(relaxed[0].every(f => f !== null),
    'even allowed, a muted voicing must not beat the best full one');
});

test('fretsSpellChord validates coverage and the bass note', () => {
  const cMajor = [0, 4, 7];
  assert.ok(fretsSpellChord([0, 0, 0, 3], cMajor, null, UKE));
  assert.ok(fretsSpellChord([0, 0, 0, 0], cMajor, null, UKE), 'extra tones are allowed');
  assert.ok(fretsSpellChord([0, 0, 0, 3], cMajor, 0, UKE), 'lowest note is C');
  assert.ok(!fretsSpellChord([0, 0, 0, 3], cMajor, 4, UKE), 'lowest note is not E');
  assert.ok(!fretsSpellChord([null, null, null, null], cMajor, null, UKE));
});

test('computeFretWindow crops above the threshold, never below fret 3', () => {
  assert.deepEqual(computeFretWindow([0, 0, 0, 3], 5), { fretMax: 3, startFret: 0 });
  assert.deepEqual(computeFretWindow([5, 5, 5, 5], 5), { fretMax: 5, startFret: 0 });
  assert.deepEqual(computeFretWindow([5, 5, 5, 5], 4), { fretMax: 5, startFret: 3 });
  assert.deepEqual(computeFretWindow([null, null, 7, 8], 5), { fretMax: 8, startFret: 5 });
});

test('parseNoteList reads plain notes, dedupes, and rejects junk', () => {
  assert.deepEqual(parseNoteList('A, C#, Eb').requiredPCs, [9, 1, 3]);
  assert.deepEqual(parseNoteList('C, C').requiredPCs, [0]);
  assert.match(parseNoteList('').error, /at least one/);
  assert.match(parseNoteList('C, D, E, F, G').error, /at most 4/);
  assert.match(parseNoteList('Cm').error, /Could not parse "Cm"/);
});

test('chordAbsNotes maps frets to MIDI and drops muted strings', () => {
  assert.deepEqual(chordAbsNotes([0, 0, 0, 3], UKE.openAbs), [67, 60, 64, 72]);
  assert.deepEqual(chordAbsNotes([null, 0, null, 3], UKE.openAbs), [60, 72]);
});
