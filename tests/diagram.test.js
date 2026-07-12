import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUNINGS } from '../js/theory.js';
import { NICE_COLORS, BW_COLORS, AQUILA_KIDS_STRING_COLORS, escapeXML, chordSVG, exportTileSVG } from '../js/diagram.js';

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

  const bare = exportTileSVG('C', [0, 0, 0, 3], 3, UKE.labels, NICE_COLORS, false, UKE.openPCs, 0, false, 0, null);
  assert.ok(!bare.includes('<metadata>'));
  assert.ok(!bare.includes('omitted'));
  assert.match(bare, /stroke="none"/);
});
