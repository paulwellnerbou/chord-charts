import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUNINGS } from '../js/theory.js';
import { NICE_COLORS, BW_COLORS, AQUILA_KIDS_STRING_COLORS, escapeXML, chordSVG, exportTileSVG, scaleSVG, exportScaleTileSVG } from '../js/diagram.js';
import { parseScale, scalePositions, scaleNoteNames } from '../js/scales.js';

const UKE = TUNINGS[0];

test('escapeXML escapes markup-significant characters', () => {
  assert.equal(escapeXML('<C&"G">'), '&lt;C&amp;&quot;G&quot;&gt;');
  assert.equal(escapeXML(7), '7');
});

test('chordSVG draws labels, dots and an accessible name', () => {
  const svg = chordSVG('Am7', [0, 0, 0, 0], 3, UKE.labels, NICE_COLORS, UKE.openPCs, 9, false, UKE.openAbs, 0);
  assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'));
  assert.match(svg, /aria-label="Am7 chord diagram"/);
  for (const label of UKE.labels) assert.ok(svg.includes(`>${label}</text>`));
  // playable dots carry their MIDI note for the click-to-play handler
  assert.equal((svg.match(/class="note-dot"/g) || []).length, 4);
  assert.ok(svg.includes(`data-abs="${UKE.openAbs[0]}"`));
});

test('chordSVG numbers frets from the crop window start', () => {
  const cropped = chordSVG('C', [5, 5, 5, 5], 5, UKE.labels, NICE_COLORS, UKE.openPCs, 0, false, undefined, 3);
  assert.match(cropped, />4<\/text>/);
  assert.ok(!/>1<\/text>/.test(cropped), 'nut-side frets are cropped away');
});

test('chordSVG marks muted strings without a playable dot', () => {
  const svg = chordSVG('C5', [null, 0, 3, 3], 3, UKE.labels, NICE_COLORS, UKE.openPCs, 0, false, UKE.openAbs, 0);
  assert.equal((svg.match(/class="note-dot"/g) || []).length, 3);
});

test('chordSVG omits note names by default and adds them only for fretted strings when requested', () => {
  const plain = chordSVG('C5', [null, 0, 3, 3], 3, UKE.labels, NICE_COLORS, UKE.openPCs, 0, false, UKE.openAbs, 0);
  assert.ok(!plain.includes('class="note-name"'), 'no note-name labels without the toggle');

  // open strings already show their name in the tuning label above the nut, so
  // only the two fretted notes (C and G) get one — the muted string gets none
  const named = chordSVG('C5', [null, 0, 3, 3], 3, UKE.labels, NICE_COLORS, UKE.openPCs, 0, false, UKE.openAbs, 0, true);
  assert.equal((named.match(/class="note-name"/g) || []).length, 2);
  assert.match(named, /class="note-name"[^>]*>C<\/text>/);
  assert.match(named, /class="note-name"[^>]*>G<\/text>/);
});

test('string colors override the plain string lines when provided', () => {
  const colors = Object.assign({}, BW_COLORS, { stringColors: AQUILA_KIDS_STRING_COLORS });
  const svg = chordSVG('C', [0, 0, 0, 3], 3, UKE.labels, colors, UKE.openPCs, 0, false, undefined, 0);
  for (const c of AQUILA_KIDS_STRING_COLORS) assert.ok(svg.includes(`stroke="${c}"`));
});

test('exportTileSVG renders border, omitted footer and source metadata on demand', () => {
  const full = exportTileSVG('C9', [0, 0, 0, 1], 3, UKE.labels, NICE_COLORS, true, UKE.openPCs, 0, true, 0,
    { label: '5th', note: 'G' }, 'https://chords.example/?chords=C9');
  assert.match(full, /<metadata>Chord diagram from https:\/\/chords\.example\/\?chords=C9<\/metadata>/);
  assert.match(full, /5th \(G\) omitted/);
  assert.match(full, /stroke="#ddd3c5"/);
  assert.ok(!full.includes('class="note-name"'), 'no note-name labels without the toggle');

  const bare = exportTileSVG('C', [0, 0, 0, 3], 3, UKE.labels, NICE_COLORS, false, UKE.openPCs, 0, false, 0, null);
  assert.ok(!bare.includes('<metadata>'));
  assert.ok(!bare.includes('omitted'));
  assert.match(bare, /stroke="none"/);

  const named = exportTileSVG('C9', [0, 0, 0, 1], 3, UKE.labels, NICE_COLORS, true, UKE.openPCs, 0, true, 0,
    { label: '5th', note: 'G' }, 'https://chords.example/?chords=C9', true);
  assert.equal((named.match(/class="note-name"/g) || []).length, 1);
  // the accidental renders as a smaller tspan raised beside its letter
  assert.match(named, /class="note-name"[^>]*>B<tspan font-size="6"[^>]*>♭<\/tspan><\/text>/);
});

// C major pentatonic, nut box on the high-G uke — the C string's fret-4 E
// (the open E refingered) is dropped: [[0,2],[0,2],[0,3],[0,3]]
const PENTA_POS = scalePositions(parseScale('C major pentatonic').pcs, UKE)[0];

test('scaleSVG draws one playable dot per note of the position', () => {
  const svg = scaleSVG('C Major Pentatonic', PENTA_POS.strings, PENTA_POS.endFret, UKE.labels, NICE_COLORS, UKE.openPCs, 0, false, UKE.openAbs, 0);
  assert.match(svg, /aria-label="C Major Pentatonic scale position diagram"/);
  assert.match(svg, /width="328"/);
  assert.equal((svg.match(/class="note-dot"/g) || []).length, 8);
  // the four open strings render as circles above the nut
  assert.equal((svg.match(/cy="24" r="6"/g) || []).length, 4);
  // the C string's fret-2 dot carries its MIDI note (D4)
  assert.ok(svg.includes(`data-abs="${UKE.openAbs[1] + 2}"`));
});

test('scaleSVG crops boxes above the nut with fret numbers and no open circles', () => {
  const second = scalePositions(parseScale('C major pentatonic').pcs, UKE)[1];
  const svg = scaleSVG('C Major Pentatonic', second.strings, second.endFret, UKE.labels, NICE_COLORS, UKE.openPCs, 0, false, UKE.openAbs, second.startFret - 1);
  assert.ok(!svg.includes('cy="24"'), 'no open-string circles above the nut');
  assert.match(svg, />2<\/text>/);
  assert.ok(!/>1<\/text>/.test(svg), 'frets below the window are cropped away');
});

test('scaleSVG rings every occurrence of the root when highlighting is on', () => {
  const svg = scaleSVG('C Major Pentatonic', PENTA_POS.strings, PENTA_POS.endFret, UKE.labels, NICE_COLORS, UKE.openPCs, 0, true, UKE.openAbs, 0);
  // open C string and the A string's fret-3 C — two roots in the nut box
  assert.equal((svg.match(new RegExp(`fill="none" stroke="${NICE_COLORS.rootColor}"`, 'g')) || []).length, 2);
});

test('scaleSVG spells dot names through the scale map, not the chord-root table', () => {
  const parsed = parseScale('F# major');
  const pos = scalePositions(parsed.pcs, UKE)[0];
  const svg = scaleSVG(parsed.label, pos.strings, pos.endFret, UKE.labels, NICE_COLORS, UKE.openPCs, parsed.rootPC, false, UKE.openAbs, 0, true, scaleNoteNames(parsed.rootName, parsed.type));
  assert.match(svg, /class="note-name"[^>]*>E<tspan font-size="6"[^>]*>♯<\/tspan><\/text>/);
  assert.ok(!/class="note-name"[^>]*>F<\/text>/.test(svg), 'pc 5 must not read as a bare F');
  // heading-style text after an accidental drops back to the baseline
  const tile = exportScaleTileSVG('F♯ Major', pos.strings, pos.endFret, UKE.labels, NICE_COLORS, false, UKE.openPCs, parsed.rootPC, false, 0, null);
  assert.match(tile, /<tspan font-size="13"[^>]*>♯<\/tspan><tspan dy="[\d.]+"> Major<\/tspan>/);
  // the glyph stands off its letter rather than tucking under it
  assert.match(svg, /class="note-name"[^>]*>E<tspan font-size="6" dx="0\.[\d]+"/);
});

test('scaleSVG draws a double flat as two glyphs on one raised baseline', () => {
  const parsed = parseScale('Gb blues'); // Gb Bbb Cb Dbb Db Fb
  const pos = scalePositions(parsed.pcs, UKE)[0];
  const svg = scaleSVG(parsed.label, pos.strings, pos.endFret, UKE.labels, NICE_COLORS, UKE.openPCs, parsed.rootPC, false, UKE.openAbs, 0, true, scaleNoteNames(parsed.rootName, parsed.type));
  assert.ok(!/class="note-name"[^>]*>[A-G]<tspan[^>]*>♭<\/tspan>b/.test(svg), 'no ASCII flat survives beside the glyph');
  // second glyph of the run carries no dy — SVG shifts are cumulative, so it
  // would otherwise climb a second time above its neighbour
  assert.match(svg, /class="note-name"[^>]*>B<tspan font-size="6" dx="0\.[\d]+" dy="-[\d.]+">♭<\/tspan><tspan font-size="6" dx="0\.[\d]+">♭<\/tspan><\/text>/);
});

test('scaleSVG passes string colors through to the board', () => {
  const colors = Object.assign({}, BW_COLORS, { stringColors: AQUILA_KIDS_STRING_COLORS });
  const svg = scaleSVG('C Major', PENTA_POS.strings, PENTA_POS.endFret, UKE.labels, colors, UKE.openPCs, 0, false, undefined, 0);
  for (const c of AQUILA_KIDS_STRING_COLORS) assert.ok(svg.includes(`stroke="${c}"`));
});

test('scaleSVG tints every occurrence of the blue note, fretted and open', () => {
  // A major blues on the high-G uke: the blue note C sits on the open C
  // string and on the A string's 3rd fret in the nut box
  const parsed = parseScale('A major blues');
  const pos = scalePositions(parsed.pcs, UKE)[0];
  const svg = scaleSVG(parsed.label, pos.strings, pos.endFret, UKE.labels, NICE_COLORS, UKE.openPCs, parsed.rootPC, false, UKE.openAbs, 0, false, null, parsed.blueNotePC);
  assert.equal((svg.match(new RegExp(`fill="${NICE_COLORS.blueNoteFill}"`, 'g')) || []).length, 1);
  assert.equal((svg.match(new RegExp(`stroke="${NICE_COLORS.blueNoteFill}"`, 'g')) || []).length, 1);
  // both blue dots carry the hover tooltip and say so to screen readers
  assert.equal((svg.match(/<title>Blue note<\/title>/g) || []).length, 2);
  assert.match(svg, /aria-label="Play C string, 0 open \(blue note\)"/);

  const plain = scaleSVG(parsed.label, pos.strings, pos.endFret, UKE.labels, NICE_COLORS, UKE.openPCs, parsed.rootPC, false, UKE.openAbs, 0);
  assert.ok(!plain.includes(NICE_COLORS.blueNoteFill), 'no tint without a blue note pc');
  assert.ok(!plain.includes('<title>'), 'no tooltip without a blue note pc');
});

test('exportScaleTileSVG renders heading, notes footer and source metadata', () => {
  const svg = exportScaleTileSVG('C Major Pentatonic', PENTA_POS.strings, PENTA_POS.endFret, UKE.labels, NICE_COLORS, true, UKE.openPCs, 0, true, 0,
    'C · D · E · G · A', 'https://chords.example/?scale=C+major+pentatonic');
  assert.match(svg, /<metadata>Scale diagram from https:\/\/chords\.example\/\?scale=C\+major\+pentatonic<\/metadata>/);
  assert.match(svg, /C · D · E · G · A/);
  assert.match(svg, /stroke="#ddd3c5"/);

  const bare = exportScaleTileSVG('C Major', PENTA_POS.strings, PENTA_POS.endFret, UKE.labels, NICE_COLORS, false, UKE.openPCs, 0, false, 0, null);
  assert.ok(!bare.includes('<metadata>'));
  assert.match(bare, /stroke="none"/);
});
