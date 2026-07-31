import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCALE_TYPES, scaleDisplayName, parseScale, scaleCompletions, transposeScaleText,
  spellScale, scaleNoteNames,
  windowSize, scalePositions, positionPlaybackMidis,
} from '../js/scales.js';
import { TUNINGS } from '../js/theory.js';

const UKE = TUNINGS[0]; // high-G GCEA
const MANDOLIN = TUNINGS.find(t => t.id === 'mandolin');

test('parseScale reads root and type through aliases, case and unicode accidentals', () => {
  const am = parseScale('A minor pentatonic');
  assert.equal(am.rootPC, 9);
  assert.equal(am.rootName, 'A');
  assert.equal(am.label, 'A Minor Pentatonic');
  assert.deepEqual(am.pcs, [9, 0, 2, 4, 7]);
  assert.equal(am.hadRoot, true);

  assert.equal(parseScale('f# DORIAN').rootName, 'F#');
  assert.equal(parseScale('F♯ dorian').rootPC, 6);
  assert.equal(parseScale('G blues scale').label, 'G Blues');
  assert.equal(parseScale('Eb pentatonic minor').label, 'Eb Minor Pentatonic');
  // a bare root is the major scale
  assert.equal(parseScale('Bb').label, 'Bb Major');
});

test('parseScale marks the blue note of the blues scales and nothing else', () => {
  assert.equal(parseScale('A blues').blueNotePC, 3);       // the b5, Eb
  assert.equal(parseScale('C major blues').blueNotePC, 3); // the b3, Eb
  assert.equal(parseScale('A minor pentatonic').blueNotePC, null);
  assert.equal(parseScale('C major').blueNotePC, null);
});

test('parseScale defaults bare mode names to a C root instead of misreading the initial as one', () => {
  const dorian = parseScale('Dorian');
  assert.equal(dorian.rootPC, 0);
  assert.equal(dorian.hadRoot, false);
  assert.equal(dorian.label, 'C Dorian');
  assert.equal(parseScale('aeolian').rootPC, 0);
});

test('parseScale rejects what is not a scale', () => {
  assert.equal(parseScale('Cmaj7'), null);
  assert.equal(parseScale('H major'), null);
  assert.equal(parseScale('C major, D minor'), null);
  assert.equal(parseScale(''), null);
});

test('transposeScaleText shifts the root and keeps the rest of the text as typed', () => {
  assert.equal(transposeScaleText('C major pentatonic', 2), 'D major pentatonic');
  assert.equal(transposeScaleText('A minor', -1), 'G# minor');
  assert.equal(transposeScaleText('G blues scale', 5), 'C blues scale');
  // accidental family and letter case follow the typed root
  assert.equal(transposeScaleText('Bb blues', 2), 'C blues');
  assert.equal(transposeScaleText('Eb dorian', 1), 'E dorian');
  assert.equal(transposeScaleText('Ab MINOR', -2), 'Gb MINOR');
  assert.equal(transposeScaleText('c# lydian', -1), 'c lydian');
  assert.equal(transposeScaleText('F♯ dorian', 1), 'G dorian');
});

test('transposeScaleText spells out the implied C root of a bare mode name', () => {
  assert.equal(transposeScaleText('Dorian', 2), 'D Dorian');
  assert.equal(transposeScaleText('aeolian', -3), 'A aeolian');
});

test('transposeScaleText leaves what is not a scale untouched', () => {
  assert.equal(transposeScaleText('Cmaj7', 3), 'Cmaj7');
  assert.equal(transposeScaleText('C major, D minor', 3), 'C major, D minor');
  assert.equal(transposeScaleText('', 3), '');
});

test('transposeScaleText round-trips through the parser at the shifted root', () => {
  for(const delta of [-11, -5, 1, 6, 11]){
    const parsed = parseScale(transposeScaleText('F# minor pentatonic', delta));
    assert.equal(parsed.rootPC, ((6 + delta) % 12 + 12) % 12);
    assert.equal(parsed.type, 'minor pentatonic');
  }
});

test('every completion in the catalogue parses back as a scale', () => {
  for(const { text } of scaleCompletions('C')){
    assert.notEqual(parseScale(text), null, `"${text}" must parse`);
  }
  assert.ok(scaleCompletions('C').length >= 20, 'catalogue must survive its self-validation');
});

test('scaleCompletions needs a root, ranks matches and keeps the typed spelling', () => {
  assert.deepEqual(scaleCompletions('penta'), []);
  const bare = scaleCompletions('G');
  assert.equal(bare[0].text, 'G Major');

  const pent = scaleCompletions('A pent');
  assert.ok(pent.length >= 2);
  assert.ok(pent.slice(0, 2).every(c => /Pentatonic/.test(c.text)));

  assert.ok(scaleCompletions('f# dor').some(c => c.text === 'F# Dorian'));
  assert.ok(scaleCompletions('gb ma').every(c => c.text.startsWith('Gb')));
});

test('spellScale gives every heptatonic degree its own letter', () => {
  assert.deepEqual(spellScale('C', 'major'), ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  assert.deepEqual(spellScale('F#', 'major'), ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']);
  assert.deepEqual(spellScale('Gb', 'major'), ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F']);
  assert.deepEqual(spellScale('F', 'major'), ['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
  assert.deepEqual(spellScale('C', 'harmonic minor'), ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'B']);
});

test('spellScale skips the missing letters of pentatonic scales and borrows for blue notes', () => {
  assert.deepEqual(spellScale('A', 'minor pentatonic'), ['A', 'C', 'D', 'E', 'G']);
  assert.deepEqual(spellScale('C', 'major pentatonic'), ['C', 'D', 'E', 'G', 'A']);
  // the b5 shares the 5th's letter, the major-blues b3 the 3rd's
  assert.deepEqual(spellScale('A', 'blues'), ['A', 'C', 'D', 'Eb', 'E', 'G']);
  assert.deepEqual(spellScale('C', 'major blues'), ['C', 'D', 'Eb', 'E', 'G', 'A']);
});

test('spellScale falls back to the root accidental family where letters run out', () => {
  assert.deepEqual(spellScale('Db', 'whole tone'), ['Db', 'Eb', 'F', 'G', 'A', 'B']);
  assert.deepEqual(spellScale('C#', 'whole tone'), ['C#', 'D#', 'F', 'G', 'A', 'B']);
  assert.equal(spellScale('C major', 'major'), null);
  assert.equal(spellScale('H', 'major'), null);
});

test('spellScale can trade the letter-per-degree rule for names without double accidentals', () => {
  assert.deepEqual(spellScale('Gb', 'blues'), ['Gb', 'Bbb', 'Cb', 'Dbb', 'Db', 'Fb']);
  assert.deepEqual(spellScale('Gb', 'blues', true), ['Gb', 'A', 'Cb', 'C', 'Db', 'Fb']);
  // sharp keys simplify their own way: A# major's F## and G## become G and A
  assert.deepEqual(spellScale('A#', 'major', true), ['A#', 'B#', 'D', 'D#', 'E#', 'G', 'A']);
  // scales that never reach a double accidental are untouched
  assert.deepEqual(spellScale('A', 'blues', true), spellScale('A', 'blues'));
  assert.deepEqual(spellScale('F#', 'major', true), spellScale('F#', 'major'));
  assert.equal(spellScale('H', 'major', true), null);
});

test('scaleNoteNames carries the simplification through to the dot labels', () => {
  assert.equal(scaleNoteNames('Gb', 'blues')[9], 'Bbb');
  assert.equal(scaleNoteNames('Gb', 'blues', true)[9], 'A');
});

test('scaleNoteNames maps pitch classes to the spelled names', () => {
  const names = scaleNoteNames('F#', 'major');
  assert.equal(names[5], 'E#');
  assert.equal(names[6], 'F#');
  assert.equal(scaleNoteNames('C', 'minor')[3], 'Eb');
});

test('windowSize gives 5-fret boxes on ukulele-family tunings and 7 on fifths tunings', () => {
  assert.equal(windowSize(UKE), 5);
  assert.equal(windowSize(TUNINGS.find(t => t.id === 'bass')), 5);
  assert.equal(windowSize(TUNINGS.find(t => t.id === 'cavaquinho_pt')), 5);
  assert.equal(windowSize(MANDOLIN), 7);
  assert.equal(windowSize(TUNINGS.find(t => t.id === 'tenor_banjo')), 7);
});

test('scalePositions finds the five classic pentatonic boxes on a high-G ukulele', () => {
  const positions = scalePositions(parseScale('C major pentatonic').pcs, UKE);
  assert.equal(positions.length, 5);
  assert.deepEqual(positions.map(p => p.startFret), [0, 2, 4, 7, 9]);
  // the C string's fret-4 E is the open E string refingered — dropped; the
  // re-entrant G string's doubled notes are part of the shape and stay
  const first = positions[0];
  assert.equal(first.endFret, 4);
  assert.deepEqual(first.strings, [[0, 2], [0, 2], [0, 3], [0, 3]]);
  assert.deepEqual(first.midis, [60, 62, 64, 67, 69, 72]);
});

test('scalePositions anchors on the lowest-pitched string of a re-entrant tuning', () => {
  // Db major pentatonic: anchored on the uke's C string (its lowest), the boxes
  // start at [1,3,5,8,10]; anchored on the higher re-entrant G string they would
  // start at fret 6 instead of 5.
  const positions = scalePositions(parseScale('Db major pentatonic').pcs, UKE);
  assert.deepEqual(positions.map(p => p.startFret), [1, 3, 5, 8, 10]);
});

test('scalePositions covers every scale tone in every box for every tuning', () => {
  for(const [type, intervals] of Object.entries(SCALE_TYPES)){
    const pcs = intervals.map(iv => iv % 12);
    for(const tuning of TUNINGS){
      const positions = scalePositions(pcs, tuning);
      assert.ok(positions.length > 0, `${type} on ${tuning.id} must have positions`);
      for(const pos of positions){
        const sounded = new Set(pos.strings.flatMap((frets, i) => frets.map(f => (tuning.openPCs[i] + f) % 12)));
        for(const pc of pcs) assert.ok(sounded.has(pc), `${type} on ${tuning.id} box at ${pos.startFret} misses pc ${pc}`);
        pos.strings.forEach(frets => frets.forEach(f => {
          assert.ok(f >= pos.startFret && f <= pos.endFret);
        }));
        assert.ok(pos.endFret <= 15);
      }
    }
  }
});

test('scalePositions orders boxes ascending and never repeats a shape', () => {
  const positions = scalePositions(parseScale('chromatic').pcs, UKE);
  const starts = positions.map(p => p.startFret);
  assert.deepEqual(starts, [...starts].sort((a, b) => a - b));
  const shapes = new Set(positions.map(p => JSON.stringify(p.strings)));
  assert.equal(shapes.size, positions.length);
});

test('scalePositions admits open strings only in the nut box', () => {
  for(const type of ['major', 'minor pentatonic', 'blues']){
    for(const pos of scalePositions(parseScale(type).pcs, UKE)){
      if(pos.startFret > 0){
        assert.ok(pos.strings.every(frets => frets.every(f => f > 0)));
      }
    }
  }
});

test('scalePositions counts one box per scale degree that fits the neck', () => {
  assert.equal(scalePositions(parseScale('C major').pcs, UKE).length, 7);
  // the mandolin's 7-fret boxes push the top anchor past fret 15
  assert.equal(scalePositions(parseScale('C major').pcs, MANDOLIN).length, 6);
  assert.ok(scalePositions(parseScale('C major').pcs, MANDOLIN).every(p => p.endFret === p.startFret + 6));
});

test('scalePositions drops a pitch refingered on the neighbouring string but keeps re-entrant doublings', () => {
  // A minor pentatonic, nut box: the full classic shape — the G string's G and
  // A double notes of the E and A strings, but from across the neck, so they
  // stay; only the C string's fret-4 E (= the open E string beside it) goes.
  const am = scalePositions(parseScale('A minor pentatonic').pcs, UKE)[0];
  assert.deepEqual(am.strings, [[0, 2], [0, 2], [0, 3], [0, 3]]);

  // no box on any tuning fingers the same pitch on two adjacent strings, and
  // playback midis stay unique whatever is doubled across the neck
  for(const type of ['major', 'minor pentatonic', 'blues', 'chromatic']){
    for(const tuning of TUNINGS){
      for(const pos of scalePositions(parseScale(type).pcs, tuning)){
        for(let i = 0; i + 1 < pos.strings.length; i++){
          const a = new Set(pos.strings[i].map(f => tuning.openAbs[i] + f));
          for(const f of pos.strings[i + 1]){
            assert.ok(!a.has(tuning.openAbs[i + 1] + f),
              `${type} on ${tuning.id} at ${pos.startFret}: adjacent duplicate`);
          }
        }
        assert.equal(new Set(pos.midis).size, pos.midis.length);
      }
    }
  }
});

test('scalePositions with a rootPC builds boxes that start and end on the root', () => {
  const parsed = parseScale('A blues');
  const anchorString = UKE.openAbs.indexOf(Math.min(...UKE.openAbs));
  const positions = scalePositions(parsed.pcs, UKE, undefined, parsed.rootPC);
  assert.ok(positions.length >= 1);
  for(const pos of positions){
    assert.equal((UKE.openPCs[anchorString] + pos.startFret) % 12, parsed.rootPC, 'box anchored at the root');
    assert.equal(pos.midis[0] % 12, parsed.rootPC, 'run starts on the root');
    assert.equal(pos.midis[pos.midis.length - 1] % 12, parsed.rootPC, 'run ends on the root');
    assert.ok(pos.midis[pos.midis.length - 1] - pos.midis[0] >= 12, 'spans at least an octave');
  }
  // far fewer boxes than the every-scale-tone anchoring
  assert.ok(positions.length < scalePositions(parsed.pcs, UKE).length);
});

test('positionPlaybackMidis runs up the box and back down without repeating the top', () => {
  const midis = [60, 62, 64, 67];
  assert.deepEqual(
    positionPlaybackMidis({ midis }),
    [60, 62, 64, 67, 64, 62, 60],
  );
});

test('scaleDisplayName collapses aliases and title-cases the rest', () => {
  assert.equal(scaleDisplayName('pentatonic'), 'Minor Pentatonic');
  assert.equal(scaleDisplayName('m blues'), 'Blues');
  assert.equal(scaleDisplayName('super locrian'), 'Altered');
  assert.equal(scaleDisplayName('phrygian dominant'), 'Phrygian Dominant');
});
