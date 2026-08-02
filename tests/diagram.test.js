import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUNINGS } from '../js/theory.js';
import { NICE_COLORS, BW_COLORS, AQUILA_KIDS_STRING_COLORS, escapeXML, chordSVG, exportTileSVG, scaleSVG, exportScaleTileSVG, neckSVG, exportNeckTileSVG } from '../js/diagram.js';
import { parseScale, scalePositions, scaleNeck, scaleNoteNames } from '../js/scales.js';

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
  const full = exportTileSVG('C9', null, [0, 0, 0, 1], 3, UKE.labels, NICE_COLORS, true, UKE.openPCs, 0, true, 0,
    { label: '5th', note: 'G' }, 'https://chords.example/?chords=C9');
  assert.match(full, /<metadata>Chord diagram from https:\/\/chords\.example\/\?chords=C9<\/metadata>/);
  assert.match(full, /5th \(G\) omitted/);
  assert.match(full, /stroke="#ddd3c5"/);
  assert.ok(!full.includes('class="note-name"'), 'no note-name labels without the toggle');

  const bare = exportTileSVG('C', null, [0, 0, 0, 3], 3, UKE.labels, NICE_COLORS, false, UKE.openPCs, 0, false, 0, null);
  assert.ok(!bare.includes('<metadata>'));
  assert.ok(!bare.includes('omitted'));
  assert.match(bare, /stroke="none"/);

  const named = exportTileSVG('C9', null, [0, 0, 0, 1], 3, UKE.labels, NICE_COLORS, true, UKE.openPCs, 0, true, 0,
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
  const tile = exportScaleTileSVG('F♯ Major', null, pos.strings, pos.endFret, UKE.labels, NICE_COLORS, false, UKE.openPCs, parsed.rootPC, false, 0, null);
  assert.match(tile, /<tspan font-size="13"[^>]*>♯<\/tspan><tspan dy="[\d.]+"> Major<\/tspan>/);
  // the glyph stands off its letter rather than tucking under it
  assert.match(svg, /class="note-name"[^>]*>E<tspan font-size="6" dx="0\.[\d]+"/);
});

test('board labels engrave their accidentals, ASCII tuning tables notwithstanding', () => {
  const dTuning = TUNINGS.find(t => t.id === 'uke_d_tuning'); // A D F# B, stored ASCII
  const svg = chordSVG('D', [2, 2, 2, 0], 3, dTuning.labels, NICE_COLORS, dTuning.openPCs, 2, false, dTuning.openAbs, 0);
  assert.match(svg, />F<tspan font-size="8\.5"[^>]*>♯<\/tspan><\/text>/);
  assert.ok(!svg.includes('>F#<'), 'no full-size ASCII sharp on the board');
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

// C major pentatonic across the whole 15-fret neck of the high-G uke
const PENTA_NECK = scaleNeck(parseScale('C major pentatonic').pcs, UKE);

test('neckSVG draws a board wider than it is tall, numbered fret by fret', () => {
  const svg = neckSVG('C Major Pentatonic', PENTA_NECK.strings, PENTA_NECK.endFret, UKE.labels, NICE_COLORS, UKE.openPCs, 0, false, UKE.openAbs);
  assert.match(svg, /aria-label="C Major Pentatonic scale neck diagram"/);
  const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
  assert.ok(w > h * 2, 'the neck lies on its side');
  // every fret to the 15th is numbered, and the markers sit where the neck has them
  for(let f = 1; f <= 15; f++) assert.match(svg, new RegExp(`class="fret-num"[^>]*>${f}</text>`));
  assert.equal((svg.match(/opacity="0\.3"/g) || []).length, 6); // position markers: 3, 5, 7, 10, 12, 15
});

test('neckSVG lays the strings out low-to-high from the bottom, open notes before the nut', () => {
  const svg = neckSVG('C Major Pentatonic', PENTA_NECK.strings, PENTA_NECK.endFret, UKE.labels, NICE_COLORS, UKE.openPCs, 0, false, UKE.openAbs);
  const ys = UKE.labels.map(lab => Number(svg.match(new RegExp(`<text x="11" y="([\\d.]+)"[^>]*>${lab}</text>`))[1]));
  // string 0 is leftmost on the vertical board, so it is the bottom line here
  assert.ok(ys[0] > ys[1] && ys[1] > ys[2] && ys[2] > ys[3]);
  // the four open strings are hollow circles left of the nut, all playable
  assert.equal((svg.match(/<circle cx="32" cy="[\d.]+" r="8"/g) || []).length, 4);
  assert.equal((svg.match(/class="note-dot"/g) || []).length, PENTA_NECK.strings.flat().length);
  assert.ok(svg.includes(`data-abs="${UKE.openAbs[1] + 14}"`), 'the C string\'s 14th-fret D is on the board');
});

test('neckSVG rings roots, tints blue notes and spells names through the scale map', () => {
  const parsed = parseScale('F# major');
  const neck = scaleNeck(parsed.pcs, UKE, 5);
  const svg = neckSVG(parsed.label, neck.strings, neck.endFret, UKE.labels, NICE_COLORS, UKE.openPCs, parsed.rootPC, true, UKE.openAbs, true, scaleNoteNames(parsed.rootName, parsed.type));
  assert.match(svg, /class="note-name"[^>]*>E<tspan font-size="7\.5"[^>]*>♯<\/tspan><\/text>/);
  assert.ok(!/class="note-name"[^>]*>F<\/text>/.test(svg), 'pc 5 must not read as a bare F');
  const roots = neck.strings.flatMap((frets, i) => frets.filter(f => (UKE.openPCs[i] + f) % 12 === parsed.rootPC));
  assert.equal((svg.match(new RegExp(`fill="none" stroke="${NICE_COLORS.rootColor}"`, 'g')) || []).length, roots.length);

  const blues = parseScale('A major blues');
  const blueNeck = scaleNeck(blues.pcs, UKE, 5);
  const blueSVG = neckSVG(blues.label, blueNeck.strings, blueNeck.endFret, UKE.labels, NICE_COLORS, UKE.openPCs, blues.rootPC, false, UKE.openAbs, false, null, blues.blueNotePC);
  assert.ok(blueSVG.includes(`fill="${NICE_COLORS.blueNoteFill}"`));
  assert.match(blueSVG, /<title>Blue note<\/title>/);
});

test('neckSVG passes string colors through to the board', () => {
  const colors = Object.assign({}, BW_COLORS, { stringColors: AQUILA_KIDS_STRING_COLORS });
  const svg = neckSVG('C Major Pentatonic', PENTA_NECK.strings, PENTA_NECK.endFret, UKE.labels, colors, UKE.openPCs, 0, false, undefined);
  for (const c of AQUILA_KIDS_STRING_COLORS) assert.ok(svg.includes(`stroke="${c}"`));
  assert.ok(!svg.includes('class="note-dot"'), 'no playable dots without open pitches');
});

test('exportNeckTileSVG frames the neck at its own width', () => {
  const svg = exportNeckTileSVG('C Major Pentatonic', null, PENTA_NECK.strings, PENTA_NECK.endFret, UKE.labels, NICE_COLORS, true, UKE.openPCs, 0, true,
    'C · D · E · G · A', 'https://chords.example/?scale=C+major+pentatonic&view=neck');
  assert.match(svg, /<metadata>Scale diagram from https:\/\/chords\.example\/\?scale=C\+major\+pentatonic&amp;view=neck<\/metadata>/);
  assert.match(svg, /C · D · E · G · A/);
  assert.match(svg, /stroke="#ddd3c5"/);
  // the tile is the neck plus the frame's padding, not the position box's width
  const tileW = Number(svg.match(/viewBox="0 0 ([\d.]+) /)[1]);
  const neckW = Number(neckSVG('x', PENTA_NECK.strings, PENTA_NECK.endFret, UKE.labels, NICE_COLORS, UKE.openPCs, 0, false).match(/viewBox="0 0 ([\d.]+) /)[1]);
  assert.equal(tileW, neckW + 28);

  const bare = exportNeckTileSVG('C Major', null, PENTA_NECK.strings, PENTA_NECK.endFret, UKE.labels, NICE_COLORS, false, UKE.openPCs, 0, false, null);
  assert.ok(!bare.includes('<metadata>'));
  assert.match(bare, /stroke="none"/);
});

test('exportScaleTileSVG renders heading, notes footer and source metadata', () => {
  const svg = exportScaleTileSVG('C Major Pentatonic', null, PENTA_POS.strings, PENTA_POS.endFret, UKE.labels, NICE_COLORS, true, UKE.openPCs, 0, true, 0,
    'C · D · E · G · A', 'https://chords.example/?scale=C+major+pentatonic');
  assert.match(svg, /<metadata>Scale diagram from https:\/\/chords\.example\/\?scale=C\+major\+pentatonic<\/metadata>/);
  assert.match(svg, /C · D · E · G · A/);
  assert.match(svg, /stroke="#ddd3c5"/);

  const bare = exportScaleTileSVG('C Major', null, PENTA_POS.strings, PENTA_POS.endFret, UKE.labels, NICE_COLORS, false, UKE.openPCs, 0, false, 0, null);
  assert.ok(!bare.includes('<metadata>'));
  assert.match(bare, /stroke="none"/);
});

test('the instrument line rides under the heading, in caps, and grows the tile', () => {
  const bare = exportTileSVG('C', null, [0, 0, 0, 3], 3, UKE.labels, NICE_COLORS, false, UKE.openPCs, 0, false, 0, null);
  const named = exportTileSVG('C', 'Ukulele (low G) · GCEA', [0, 0, 0, 3], 3, UKE.labels, NICE_COLORS, false, UKE.openPCs, 0, false, 0, null);
  assert.match(named, /UKULELE \(LOW G\) · GCEA/);
  assert.ok(!bare.includes('UKULELE'));

  const box = svg=> svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).slice(1).map(Number);
  assert.equal(box(named)[1], box(bare)[1] + 13);
  assert.equal(box(named)[0], box(bare)[0], 'the line rides inside the tile, it does not widen it');

  // it sits between the heading and the board, and the board moves down with it
  const headY = Number(named.match(/y="([\d.]+)" text-anchor="middle" font-size="21"/)[1]);
  const subY = Number(named.match(/y="([\d.]+)" text-anchor="middle" font-size="9.5"/)[1]);
  const boardY = Number(named.match(/<g transform="translate\(14,([\d.]+)\)"/)[1]);
  assert.ok(headY < subY && subY < boardY, `expected ${headY} < ${subY} < ${boardY}`);
  assert.equal(boardY - Number(bare.match(/<g transform="translate\(14,([\d.]+)\)"/)[1]), 13);
});

test('a long instrument name shrinks onto its line rather than off the tile', () => {
  const tile = name=> exportScaleTileSVG('C Major', name, PENTA_POS.strings, PENTA_POS.endFret, UKE.labels,
    NICE_COLORS, false, UKE.openPCs, 0, false, 0, null);
  const size = svg=> Number(svg.match(/text-anchor="middle" font-size="([\d.]+)" letter-spacing/)[1]);
  const track = svg=> Number(svg.match(/letter-spacing="([\d.]+)"/)[1]);

  assert.equal(size(tile('Mandolin · GDAE')), 9.5, 'a name that fits keeps the full size');
  const long = tile('Cavaquinho (Portugal) · CGAD tuning, re-entrant');
  assert.ok(size(long) < 9.5, 'a name too wide for the tile is shrunk');
  // tracking is part of the width, so it has to shrink with the glyphs
  assert.ok(track(long) < track(tile('Mandolin · GDAE')));
  // the estimate the shrink works from must land the line inside the diagram width
  assert.ok('CAVAQUINHO (PORTUGAL) · CGAD TUNING, RE-ENTRANT'.length * (size(long)*0.62 + track(long)) <= 188.5);
});

// --- the animated export ---

// A run over PENTA_POS ([[0,2],[0,2],[0,3],[0,3]]). On the high-G uke that box
// holds its G twice — open on string 0 and at fret 3 on string 2 — so one
// sounding of that pitch lights two dots, and the run coming back down through
// it lights both a second time.
const RUN = {
  litMs: 560,
  totalMs: 4000,
  onsets: { '1:0': [0], '0:0': [500, 2500], '2:3': [500, 2500] },
};

test('a still export carries no animation', () => {
  const svg = exportScaleTileSVG('C Major Pentatonic', null, PENTA_POS.strings, PENTA_POS.endFret, UKE.labels, NICE_COLORS, true, UKE.openPCs, 0, true, 0,
    null, null);
  assert.ok(!svg.includes('<style>'), 'no stylesheet without a run');
  assert.ok(!svg.includes('note-lit'), 'no lit discs without a run');
});

test('an animated export loops the whole run once per cycle', () => {
  const svg = exportScaleTileSVG('C Major Pentatonic', null, PENTA_POS.strings, PENTA_POS.endFret, UKE.labels, NICE_COLORS, true, UKE.openPCs, 0, true, 0,
    null, null, false, null, null, RUN);
  assert.match(svg, /animation:note-lit 4000ms linear infinite/);
  // the flash occupies its lit window at the head of the cycle: struck at 14%
  // of it, out by the end of it — 1.96% and 14% of a 4s loop
  assert.match(svg, /@keyframes note-lit\{0%\{[^}]*\}1\.96%\{opacity:1[^}]*#a44737\)\}14%\{/);
  assert.ok(!svg.includes('animation-play-state'), 'a downloaded animation runs');
});

test('each sounding of a note gets its own disc, placed by a negative delay', () => {
  const svg = exportScaleTileSVG('C Major Pentatonic', null, PENTA_POS.strings, PENTA_POS.endFret, UKE.labels, NICE_COLORS, true, UKE.openPCs, 0, true, 0,
    null, null, false, null, null, RUN);
  // five soundings over three dots: a pitch heard twice gets a second disc
  // rather than one animation carrying both flashes
  assert.equal((svg.match(/class="note-lit"/g) || []).length, 5);
  // a note at 500ms sits 500ms into the 4000ms cycle — and both dots holding
  // that pitch are placed there, so they light together
  assert.equal((svg.match(/animation-delay:-3500ms/g) || []).length, 2);
  assert.equal((svg.match(/animation-delay:-1500ms/g) || []).length, 2);   // and again on the way down
  assert.equal((svg.match(/animation-delay:-4000ms/g) || []).length, 1);   // the note at 0ms
});

test('a seeked run is frozen at that moment, for grabbing frames', () => {
  const frame = exportScaleTileSVG('C Major Pentatonic', null, PENTA_POS.strings, PENTA_POS.endFret, UKE.labels, NICE_COLORS, true, UKE.openPCs, 0, true, 0,
    null, null, false, null, null, { ...RUN, seekMs: 700, paused: true });
  assert.match(frame, /animation-play-state:paused/);
  // 700ms in, only the pair struck at 500ms is still alight — 200ms into their
  // 560ms flash. The note struck at 0ms is long out and is left out of the frame
  assert.equal((frame.match(/class="note-lit"/g) || []).length, 2);
  assert.equal((frame.match(/animation-delay:-4200ms/g) || []).length, 2);
  assert.ok(!frame.includes('animation-delay:-4700ms'), 'a note no longer sounding costs the frame nothing');

  // and a moment with nothing sounding draws no discs at all
  const quiet = exportScaleTileSVG('C Major Pentatonic', null, PENTA_POS.strings, PENTA_POS.endFret, UKE.labels, NICE_COLORS, true, UKE.openPCs, 0, true, 0,
    null, null, false, null, null, { ...RUN, seekMs: 3500, paused: true });
  assert.ok(!quiet.includes('class="note-lit"'));
});

test('a frozen frame drops the discs sitting on either end of their flash', () => {
  const frame = (seekMs)=> exportScaleTileSVG('C Major Pentatonic', null, PENTA_POS.strings, PENTA_POS.endFret, UKE.labels, NICE_COLORS, true, UKE.openPCs, 0, true, 0,
    null, null, false, null, null, { ...RUN, seekMs, paused: true });

  // 1060ms is exactly 560ms — one lit window — after the pair struck at 500ms,
  // where the flash is back to zero opacity. Nothing else is alight either, so
  // the frame draws no discs rather than two that would only cost it a blur.
  assert.ok(!frame(1060).includes('class="note-lit"'), 'the far end of a flash is out');

  // and the near end: at 500ms that same pair is struck but still at zero,
  // while the note from 0ms is 500ms into its window and genuinely alight
  assert.equal((frame(500).match(/class="note-lit"/g) || []).length, 1);
  // its delay carries the seek too — a cycle, less its onset, plus 500ms
  assert.match(frame(500), /animation-delay:-4500ms/);
});

test('the neck and chord exports animate on the same terms', () => {
  const neck = exportNeckTileSVG('C Major Pentatonic', null, PENTA_NECK.strings, PENTA_NECK.endFret, UKE.labels, NICE_COLORS, true, UKE.openPCs, 0, true,
    null, null, false, null, null, RUN);
  assert.match(neck, /@keyframes note-lit/);
  assert.ok(neck.includes('class="note-lit"'));

  const chord = exportTileSVG('C', null, [0, 0, 0, 3], 3, UKE.labels, NICE_COLORS, true, UKE.openPCs, 0, true, 0, null, null, false,
    { litMs: 560, totalMs: 1500, onsets: { '3:3': [75] } });
  assert.match(chord, /@keyframes note-lit/);
  assert.equal((chord.match(/class="note-lit"/g) || []).length, 1);
  assert.match(chord, /animation-delay:-1425ms/);
});

test('the b&w export flashes in its own ink', () => {
  const svg = exportScaleTileSVG('C Major Pentatonic', null, PENTA_POS.strings, PENTA_POS.endFret, UKE.labels, BW_COLORS, true, UKE.openPCs, 0, true, 0,
    null, null, false, null, null, RUN);
  assert.match(svg, /drop-shadow\(0 0 5px #000000\)/);
  assert.ok(!svg.includes('#a44737'), 'no colour leaks into the photocopy');
});
