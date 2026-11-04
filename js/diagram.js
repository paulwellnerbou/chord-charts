// Fretboard diagrams as SVG strings, plus the color palettes.

import { spellNote, formatAccidentals } from './theory.js';
import { LELAND } from './glyphs.js';

const EXPORT_HEADING_FONT = "Georgia, 'Times New Roman', serif";
const NICE_COLORS = {
  ink:'#292621', dotFill:'#554f49', dotStroke:'#37332f',
  cardBg:'#fffcf7', cardBorder:'#ddd3c5', heading:'#a44737', rootColor:'#a44737',
  blueNoteFill:'#3f6592', blueNoteStroke:'#2d4a6d', litColor:'#a44737',
  lineOpacity:0.55, markerOpacity:0.3, exportHeadingFont:EXPORT_HEADING_FONT
};
// The blue note keeps its blue even here — it is the one color with meaning.
const BW_COLORS = {
  ink:'#000000', dotFill:'#000000', dotStroke:'#000000',
  cardBg:'#ffffff', cardBorder:'#000000', heading:'#000000', rootColor:'#000000',
  blueNoteFill:'#1e4fa3', blueNoteStroke:'#12356f', litColor:'#000000',
  lineOpacity:1, markerOpacity:0.25, exportHeadingFont:EXPORT_HEADING_FONT
};
// Aquila Kids educational set: green/red/yellow/blue from 4th to 1st string
// (G C E A on a GCEA ukulele); applied by string position on every tuning.
const AQUILA_KIDS_STRING_COLORS = ['#2f9e44','#d0342c','#e6b400','#2b6bd8'];

const XS = [30,70,110,150];
const NUT_Y = 37, FRET_H = 34;
const FRET_MARKERS = [3,5,7,10,12,15];
function rowCenter(fret){ return NUT_Y + (fret-0.5)*FRET_H; }
function boardBottomY(numFrets, startFret){
  return NUT_Y + Math.max(3, numFrets - (startFret||0))*FRET_H;
}

function escapeXML(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// None of the faces here carry ♭ or ♯, so both arrive from whatever font the
// system falls back to — and that font draws them on a full em square with far
// more side bearing than ink, a flat worst of all. Left as it comes, a double
// flat reads as two loose glyphs standing a letter's width off their note. Each
// accidental is therefore pulled back by the bearing between it and whatever
// precedes it, leaving ACC_GAP of air. Side bearings are fractions of the
// glyph's own em; the defaults are what Apple platforms fall back to, and
// setAccidentalBearings replaces them with what the browser really renders.
const ACC_GAP = 0.06;
const ACC_BEARINGS = {
  '♭': { left:0.351, right:0.267 },
  '♯': { left:0.023, right:0.022 },
};

function setAccidentalBearings(measured){
  for(const glyph of Object.keys(ACC_BEARINGS)){
    const m = measured && measured[glyph];
    if(m && Number.isFinite(m.left) && Number.isFinite(m.right)){
      ACC_BEARINGS[glyph] = { left:m.left, right:m.right };
    }
  }
}

// Accidental glyphs draw smaller, raised and tucked against their note letter,
// engraving-style — the SVG twin of the HTML .acc treatment. dy shifts are
// cumulative in SVG, so any text after the accidental drops back down in a
// compensating tspan. Input must already be escaped.
function accTspans(escaped, size){
  const raise = size*0.18;
  const parts = String(escaped).split(/([♭♯])/);
  let out = '', prev = null;
  for(const part of parts){
    if(part === '♭' || part === '♯'){
      // the letter before an accidental keeps its own (slim) right bearing —
      // only a glyph from the wide fallback font is worth measuring away
      const tuck = ACC_GAP - ACC_BEARINGS[part].left - (prev ? ACC_BEARINGS[prev].right : 0);
      // a second glyph in a run keeps the same baseline — the dy that raised
      // the first one still applies
      out += `<tspan font-size="${size}" dx="${+(size*tuck).toFixed(3)}"${prev ? '' : ` dy="${-raise}"`}>${part}</tspan>`;
      prev = part;
    } else if(part){
      out += prev ? `<tspan dy="${raise}">${part}</tspan>` : part;
      prev = null;
    }
  }
  return out;
}

function boardInner(numFrets, startFret, labels, colors){
  const numRows = Math.max(3, numFrets - startFret);
  const bottomY = NUT_Y + numRows*FRET_H;
  let s = '';
  labels.forEach((lab,i)=>{
    // tuning labels are stored ASCII (F#, Bb), so they need the glyph swap first
    s += `<text x="${XS[i]}" y="12" text-anchor="middle" font-size="13" fill="${colors.ink}" font-family="Arial,sans-serif" font-weight="700">${accTspans(escapeXML(formatAccidentals(lab)), 8.5)}</text>`;
  });
  const topLineWidth = startFret === 0 ? 3 : 1;
  const topLineOpacity = startFret === 0 ? 1 : colors.lineOpacity;
  s += `<line x1="20" y1="${NUT_Y}" x2="160" y2="${NUT_Y}" stroke="${colors.ink}" stroke-width="${topLineWidth}" opacity="${topLineOpacity}"/>`;
  for(let i=1;i<=numRows;i++){
    const y = NUT_Y + i*FRET_H;
    s += `<line x1="20" y1="${y}" x2="160" y2="${y}" stroke="${colors.ink}" stroke-width="1" opacity="${colors.lineOpacity}"/>`;
    s += `<text class="fret-num" x="167" y="${rowCenter(i)+4}" font-size="14" fill="${colors.ink}" opacity="${colors.lineOpacity}" font-family="Arial,sans-serif">${startFret+i}</text>`;
  }
  XS.forEach((x,i)=>{
    const stringColor = colors.stringColors && colors.stringColors[i];
    s += stringColor
      ? `<line x1="${x}" y1="${NUT_Y}" x2="${x}" y2="${bottomY}" stroke="${stringColor}" stroke-width="3"/>`
      : `<line x1="${x}" y1="${NUT_Y}" x2="${x}" y2="${bottomY}" stroke="${colors.ink}" stroke-width="1" opacity="${colors.lineOpacity}"/>`;
  });
  const markerX = (XS[1]+XS[2])/2;
  FRET_MARKERS.forEach(f=>{
    if(f>startFret && f<=startFret+numRows){
      s += `<circle cx="${markerX}" cy="${rowCenter(f-startFret)}" r="3" fill="${colors.ink}" opacity="${colors.markerOpacity}"/>`;
    }
  });
  return s;
}

// --- An exported diagram that plays its own run ----------------------------
// A lit note is drawn as its own disc over the dot rather than by recolouring
// the dot, so one set of keyframes serves every dot whatever colour it rests
// at — and a pitch that sounds twice gets a second disc instead of one merged
// animation. The whole run is a single repeating cycle and each disc is placed
// in it by a negative delay, which is also how a frame grabber seeks it: shift
// every delay by the same amount and pause.
//
// `run` is { totalMs, litMs, onsets, seekMs?, paused? }, where onsets maps
// "<string>:<fret>" to the times that dot sounds. Positions rather than
// pitches, so this module needs to know nothing about tuning.
const LIT_RISE = 0.14;   // of the lit window: struck, not faded in
const LIT_SCALE = 1.17, LIT_GLOW = 5;

function pct(n){ return +n.toFixed(3); }

function litCSS(run, colors){
  const rest = `opacity:0;transform:scale(1);filter:drop-shadow(0 0 ${LIT_GLOW}px transparent)`;
  return '<style>'
    + '@keyframes note-lit{'
    + `0%{${rest}}`
    + `${pct(LIT_RISE*run.litMs/run.totalMs*100)}%{opacity:1;transform:scale(${LIT_SCALE});`
      + `filter:drop-shadow(0 0 ${LIT_GLOW}px ${colors.litColor})}`
    + `${pct(run.litMs/run.totalMs*100)}%{${rest}}`
    + `100%{${rest}}}`
    + '.note-lit{transform-box:fill-box;transform-origin:center;'
    + `animation:note-lit ${run.totalMs}ms linear infinite`
    // a paused animation still sits at the position its delay names, so a
    // grabbed frame is exact rather than however late the raster ran
    + (run.paused ? ';animation-play-state:paused' : '')
    + '}</style>';
}

// Where a disc's flash has got to at the moment a frozen frame holds, as a
// position in the loop: 0 is the strike, litMs the end of it.
function litPhase(run, at){
  return (run.totalMs - at + (run.seekMs||0)) % run.totalMs;
}

function litDiscs(cx, cy, r, colors, run, i, fret){
  let times = run && run.onsets[`${i}:${fret}`];
  if(!times) return '';
  // A frozen frame keeps only the discs actually alight in it — the flash is
  // at zero opacity at both ends of its window, so neither end counts. The
  // rest draw the same either way, but each one still costs the rasteriser a
  // blur, and enough of them make a frame take longer than the frame it is
  // meant to be.
  if(run.paused) times = times.filter(at=>{
    const phase = litPhase(run, at);
    return phase > 0 && phase < run.litMs;
  });
  return times.map(at=>
    `<circle class="note-lit" cx="${cx}" cy="${cy}" r="${r}" fill="${colors.litColor}" opacity="0"`
    + ` style="animation-delay:-${Math.round(run.totalMs - at + (run.seekMs||0))}ms"/>`
  ).join('');
}

// Dot sizes per board: the position box draws small dots in a narrow tile, the
// whole neck larger ones across a wide one. `open` sizes are for the hollow
// ring an open string gets off the board.
const BOX_DOTS = { r:9, ring:12, name:8, acc:6, openR:6, openRing:9 };
const NECK_DOTS = { r:11, ring:14.5, name:10, acc:7.5, openR:8, openRing:11.5 };

// One note, wherever it sits: the filled dot carrying its name, or — for an
// open string, drawn off the board before the nut — the hollow ring. `abs`
// makes it playable; `name` must already be escaped. The lit disc goes over the
// dot but under its name, so the letter stays readable while the note sounds.
function noteDot(cx, cy, dots, labels, i, fret, colors, isRoot, abs, name, isBlue, run){
  const blueSuffix = isBlue ? ' (blue note)' : '';
  const blueTitle = isBlue ? '<title>Blue note</title>' : '';
  const noteAttrs = abs!==null ? ` class="note-dot" data-abs="${abs}" tabindex="0" role="button" aria-label="Play ${escapeXML(labels[i])} string, ${escapeXML(String(fret))}${fret===0?' open':''}${blueSuffix}"` : '';
  let s = '';
  if(fret===0){
    s += `<circle cx="${cx}" cy="${cy}" r="${dots.openR}" fill="${colors.cardBg}" stroke="${isBlue ? colors.blueNoteFill : colors.ink}" stroke-width="1.5"${noteAttrs}>${blueTitle}</circle>`;
    s += litDiscs(cx, cy, dots.openR, colors, run, i, fret);
    if(isRoot){
      s += `<circle cx="${cx}" cy="${cy}" r="${dots.openRing}" fill="none" stroke="${colors.rootColor}" stroke-width="1.5" pointer-events="none"/>`;
    }
  } else {
    s += `<circle cx="${cx}" cy="${cy}" r="${dots.r}" fill="${isBlue ? colors.blueNoteFill : colors.dotFill}" stroke="${isBlue ? colors.blueNoteStroke : colors.dotStroke}" stroke-width="1"${noteAttrs}>${blueTitle}</circle>`;
    s += litDiscs(cx, cy, dots.r, colors, run, i, fret);
    if(name) s += `<text class="note-name" x="${cx}" y="${cy+dots.name*0.375}" text-anchor="middle" font-size="${dots.name}" font-weight="700" fill="${colors.cardBg}" font-family="Arial,sans-serif" pointer-events="none">${accTspans(name, dots.acc)}</text>`;
    if(isRoot){
      s += `<circle cx="${cx}" cy="${cy}" r="${dots.ring}" fill="none" stroke="${colors.rootColor}" stroke-width="1.5" pointer-events="none"/>`;
    }
  }
  return s;
}

function dotSVG(i, fret, startFret, labels, colors, isRoot, abs, name, isBlue, run){
  const y = fret===0 ? 24 : rowCenter(fret-startFret);
  return noteDot(XS[i], y, BOX_DOTS, labels, i, fret, colors, isRoot, abs, name, isBlue, run);
}

function diagramInner(frets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, openAbs, startFret, showNoteNames, run){
  startFret = startFret || 0;
  let s = boardInner(numFrets, startFret, labels, colors);
  frets.forEach((fret,i)=>{
    if(fret===null){
      const x = XS[i];
      s += `<line x1="${x-6}" y1="18" x2="${x+6}" y2="30" stroke="${colors.ink}" stroke-width="1.5"/>`;
      s += `<line x1="${x-6}" y1="30" x2="${x+6}" y2="18" stroke="${colors.ink}" stroke-width="1.5"/>`;
      return;
    }
    const pc = (openPCs[i]+fret)%12;
    const isRoot = highlightRoot && pc===rootPC;
    const abs = openAbs ? openAbs[i]+fret : null;
    // open strings sound their name already, in the tuning label above the nut
    const name = (showNoteNames && fret>0) ? escapeXML(formatAccidentals(spellNote(pc))) : null;
    s += dotSVG(i, fret, startFret, labels, colors, isRoot, abs, name, false, run);
  });
  return s;
}

// Scale-position variant of diagramInner: several notes per string, spelled
// through the scale's own pc → name map (F# major reads E#, not F).
function scaleInner(stringFrets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, openAbs, startFret, showNoteNames, noteNames, blueNotePC, run){
  startFret = startFret || 0;
  let s = boardInner(numFrets, startFret, labels, colors);
  stringFrets.forEach((frets,i)=>{
    frets.forEach(fret=>{
      const pc = (openPCs[i]+fret)%12;
      const isRoot = highlightRoot && pc===rootPC;
      const abs = openAbs ? openAbs[i]+fret : null;
      const spelled = (noteNames && noteNames[pc]) || spellNote(pc);
      const name = (showNoteNames && fret>0) ? escapeXML(formatAccidentals(spelled)) : null;
      s += dotSVG(i, fret, startFret, labels, colors, isRoot, abs, name, blueNotePC!=null && pc===blueNotePC, run);
    });
  });
  return s;
}

// --- The whole neck: the same fretboard laid on its side, nut at the left and
// every fret out to the end of the neck. Its own geometry rather than a rotated
// copy of the board above — note names and fret numbers have to stay upright,
// and a span this wide wants tighter frets in a much wider picture. Strings run
// as they would if you tipped the vertical board anticlockwise: string 0, the
// leftmost there, is the bottom line here.
const NECK_FRET_W = 30, NECK_STRING_GAP = 30;
const NECK_TOP = 18, NECK_NUT_X = 48, NECK_OPEN_X = 32, NECK_LABEL_X = 11;
// the numbers hang clear of the root ring around a note on the bottom string,
// not just of the string line itself
const NECK_NUM_DY = NECK_DOTS.ring + 12.5, NECK_PAD_RIGHT = 12, NECK_PAD_BOTTOM = 8;

function neckStringY(i, count){ return NECK_TOP + (count-1-i)*NECK_STRING_GAP; }
function neckFretX(fret){ return NECK_NUT_X + (fret-0.5)*NECK_FRET_W; }
function neckWidth(numFrets){ return NECK_NUT_X + numFrets*NECK_FRET_W + NECK_PAD_RIGHT; }
function neckHeight(count){ return neckStringY(0, count) + NECK_NUM_DY + NECK_PAD_BOTTOM; }

function neckBoard(numFrets, labels, colors){
  const count = labels.length;
  const topY = neckStringY(count-1, count);
  const bottomY = neckStringY(0, count);
  const rightX = NECK_NUT_X + numFrets*NECK_FRET_W;
  let s = `<line x1="${NECK_NUT_X}" y1="${topY}" x2="${NECK_NUT_X}" y2="${bottomY}" stroke="${colors.ink}" stroke-width="3"/>`;
  for(let f=1; f<=numFrets; f++){
    const x = NECK_NUT_X + f*NECK_FRET_W;
    s += `<line x1="${x}" y1="${topY}" x2="${x}" y2="${bottomY}" stroke="${colors.ink}" stroke-width="1" opacity="${colors.lineOpacity}"/>`;
    s += `<text class="fret-num" x="${neckFretX(f)}" y="${bottomY+NECK_NUM_DY}" text-anchor="middle" font-size="12" fill="${colors.ink}" opacity="${colors.lineOpacity}" font-family="Arial,sans-serif">${f}</text>`;
  }
  // the position markers of the real instrument, between the middle strings
  const markerY = (topY+bottomY)/2;
  FRET_MARKERS.forEach(f=>{
    if(f<=numFrets){
      s += `<circle cx="${neckFretX(f)}" cy="${markerY}" r="4" fill="${colors.ink}" opacity="${colors.markerOpacity}"/>`;
    }
  });
  labels.forEach((lab,i)=>{
    const y = neckStringY(i, count);
    const stringColor = colors.stringColors && colors.stringColors[i];
    s += stringColor
      ? `<line x1="${NECK_NUT_X}" y1="${y}" x2="${rightX}" y2="${y}" stroke="${stringColor}" stroke-width="3"/>`
      : `<line x1="${NECK_NUT_X}" y1="${y}" x2="${rightX}" y2="${y}" stroke="${colors.ink}" stroke-width="1" opacity="${colors.lineOpacity}"/>`;
    // tuning labels are stored ASCII (F#, Bb), so they need the glyph swap first
    s += `<text x="${NECK_LABEL_X}" y="${y+4.5}" text-anchor="middle" font-size="13" fill="${colors.ink}" font-family="Arial,sans-serif" font-weight="700">${accTspans(escapeXML(formatAccidentals(lab)), 8.5)}</text>`;
  });
  return s;
}

function neckInner(stringFrets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, openAbs, showNoteNames, noteNames, blueNotePC, run){
  const count = labels.length;
  let s = neckBoard(numFrets, labels, colors);
  stringFrets.forEach((frets,i)=>{
    const y = neckStringY(i, count);
    frets.forEach(fret=>{
      const pc = (openPCs[i]+fret)%12;
      const isRoot = highlightRoot && pc===rootPC;
      const abs = openAbs ? openAbs[i]+fret : null;
      const spelled = (noteNames && noteNames[pc]) || spellNote(pc);
      // open strings sound their name already, in the label beside the nut
      const name = (showNoteNames && fret>0) ? escapeXML(formatAccidentals(spelled)) : null;
      const x = fret===0 ? NECK_OPEN_X : neckFretX(fret);
      s += noteDot(x, y, NECK_DOTS, labels, i, fret, colors, isRoot, abs, name, blueNotePC!=null && pc===blueNotePC, run);
    });
  });
  return s;
}

function chordSVG(name, frets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, openAbs, startFret, showNoteNames){
  const bottomY = boardBottomY(numFrets, startFret);
  let s = `<svg viewBox="0 0 188 ${bottomY+12}" width="164" role="img" aria-label="${escapeXML(name)} chord diagram">`;
  s += diagramInner(frets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, openAbs, startFret, showNoteNames);
  s += '</svg>';
  return s;
}

function scaleSVG(name, stringFrets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, openAbs, startFret, showNoteNames, noteNames, blueNotePC){
  const bottomY = boardBottomY(numFrets, startFret);
  let s = `<svg viewBox="0 0 188 ${bottomY+12}" width="328" role="img" aria-label="${escapeXML(name)} scale position diagram">`;
  s += scaleInner(stringFrets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, openAbs, startFret, showNoteNames, noteNames, blueNotePC);
  s += '</svg>';
  return s;
}

function neckSVG(name, stringFrets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, openAbs, showNoteNames, noteNames, blueNotePC){
  const w = neckWidth(numFrets), h = neckHeight(labels.length);
  let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" role="img" aria-label="${escapeXML(name)} scale neck diagram">`;
  s += neckInner(stringFrets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, openAbs, showNoteNames, noteNames, blueNotePC);
  s += '</svg>';
  return s;
}

// The instrument line under the heading, small caps: an exported tile travels
// on its own, and "Am" says nothing about which neck it was drawn for. Long
// names shrink onto the line rather than run off it — Arial caps average about
// SUB_EM of the em, close enough for a line this short.
const SUB_SIZE = 9.5, SUB_TRACK = 0.12, SUB_EM = 0.62;

function subLine(text, cx, y, maxW, colors){
  const caps = escapeXML(String(text).toUpperCase());
  const est = caps.length * SUB_SIZE * (SUB_EM + SUB_TRACK);
  const size = est > maxW ? SUB_SIZE*maxW/est : SUB_SIZE;
  return `<text x="${cx}" y="${y}" text-anchor="middle" font-size="${+size.toFixed(2)}"`
    + ` letter-spacing="${+(size*SUB_TRACK).toFixed(2)}" font-weight="700" fill="${colors.ink}"`
    + ` opacity="${colors.lineOpacity}" font-family="Arial,sans-serif">${accTspans(caps, +(size*0.68).toFixed(2))}</text>`;
}

// Card chrome around a diagram for standalone export: rounded paper, heading,
// optional instrument line, optional italic footer line, optional <metadata>
// source note. The diagram's own size comes in, since a position box and a
// whole neck share this frame.
function exportFrame(label, instrument, innerSVG, diagW, diagH, colors, showBorder, footerText, metadataText, run){
  const PAD = 14, titleH = 32, subH = instrument ? 13 : 0;
  const headerH = titleH + subH;
  const footerH = footerText ? 16 : 0;
  const tileW = diagW + PAD*2;
  const tileH = PAD + headerH + diagH + footerH + PAD;
  const strokeAttr = showBorder ? `stroke="${colors.cardBorder}" stroke-width="2"` : `stroke="none"`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tileW} ${tileH}" width="${tileW}" height="${tileH}">`;
  if(metadataText) s += `<metadata>${escapeXML(metadataText)}</metadata>`;
  if(run) s += litCSS(run, colors);
  s += `<rect x="1" y="1" width="${tileW-2}" height="${tileH-2}" rx="12" fill="${colors.cardBg}" ${strokeAttr}/>`;
  s += `<text x="${tileW/2}" y="${PAD+titleH*0.7}" text-anchor="middle" font-size="21" font-weight="700" fill="${colors.heading}" font-family="${colors.exportHeadingFont}">${accTspans(escapeXML(label), 13)}</text>`;
  if(instrument) s += subLine(instrument, tileW/2, PAD+titleH*0.7+11.5, diagW, colors);
  s += `<g transform="translate(${PAD},${PAD+headerH})">${innerSVG}</g>`;
  if(footerText){
    s += `<text x="${tileW/2}" y="${PAD+headerH+diagH+11}" text-anchor="middle" font-size="9" font-style="italic" fill="${colors.ink}" opacity="${colors.lineOpacity}" font-family="Arial,sans-serif">${accTspans(escapeXML(footerText), 6.5)}</text>`;
  }
  s += '</svg>';
  return s;
}

function exportTileSVG(label, instrument, frets, numFrets, labels, colors, showBorder, openPCs, rootPC, highlightRoot, startFret, omitted, sourceURL, showNoteNames, run){
  const inner = diagramInner(frets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, undefined, startFret, showNoteNames, run);
  return exportFrame(label, instrument, inner, 188, boardBottomY(numFrets, startFret) + 12, colors, showBorder,
    omitted ? `${omitted.label} (${omitted.note}) omitted` : null,
    sourceURL ? `Chord diagram from ${sourceURL}` : null, run);
}

function exportScaleTileSVG(label, instrument, stringFrets, numFrets, labels, colors, showBorder, openPCs, rootPC, highlightRoot, startFret, notesLine, sourceURL, showNoteNames, noteNames, blueNotePC, run){
  const inner = scaleInner(stringFrets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, undefined, startFret, showNoteNames, noteNames, blueNotePC, run);
  return exportFrame(label, instrument, inner, 188, boardBottomY(numFrets, startFret) + 12, colors, showBorder,
    notesLine || null,
    sourceURL ? `Scale diagram from ${sourceURL}` : null, run);
}

function exportNeckTileSVG(label, instrument, stringFrets, numFrets, labels, colors, showBorder, openPCs, rootPC, highlightRoot, notesLine, sourceURL, showNoteNames, noteNames, blueNotePC, run){
  const inner = neckInner(stringFrets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, undefined, showNoteNames, noteNames, blueNotePC, run);
  return exportFrame(label, instrument, inner, neckWidth(numFrets), neckHeight(labels.length), colors, showBorder,
    notesLine || null,
    sourceURL ? `Scale diagram from ${sourceURL}` : null, run);
}

// --- staff notation: a fingering's sounding notes as one stacked chord ---
// Engraved with Leland's outlines (glyphs.js) at SP px to the staff space, the
// SMuFL way: the clef sits on its line, a head or accidental is centred on the
// step it names. A step is one letter name up from the bottom line, half a
// space each.
const SP = 10, STAFF_W = 18.8, CLEF_X = 1, NOTE_X = 10.2;
const HEAD = LELAND.noteheadWhole;
const SECOND_SHIFT = HEAD.adv - 0.1;   // the upper note of a second, beside the lower
const STAFF_ACC_GAP = 0.22, STAFF_ACC_COL = 1.12;  // accidental to head, and column to column
const LINE_W = 0.11, LEDGER_W = 0.16, LEDGER_EXT = 0.35;
const STAFF_PAD = 0.5;                 // room beyond the clef and the outermost head
const NAME_SIZE = 1.55, NAME_SLOT = 2.5;  // the note names under the chord, each in a slot of its own
const STAFF_LETTERS = { C:0, D:1, E:2, F:3, G:4, A:5, B:6 };
// bottom: the bottom line as a letter index from C0 (seven per octave);
// line: the step of the line the clef marks
const STAFF_CLEFS = {
  treble: { bottom: 4*7+2, line:2, glyph:'gClef' },
  bass:   { bottom: 2*7+4, line:6, glyph:'fClef' },
};

function staffY(step){ return 4 - step/2; }
function accGlyph(acc){ return acc > 0 ? LELAND.accidentalSharp : LELAND.accidentalFlat; }

// The chord's notes placed on the staff, lowest first: step and accidental
// from the pitch's spelling, so C# sits on C's line; `right` for the upper
// note of a second, which can't share the column; accCol for how far left
// its accidental must stand to clear the others.
function staffLayout(absNotes, clef = 'treble', writtenOctave = 0){
  const c = STAFF_CLEFS[clef];
  const seen = new Set();
  const notes = [];
  absNotes.forEach(abs=>{
    const name = spellNote(abs);
    const acc = (name.match(/#/g)||[]).length - (name.match(/b/g)||[]).length;
    // the letter's own pitch: B#3 sounds as C4 but sits on B's line
    const natural = abs + writtenOctave*12 - acc;
    const step = (Math.floor(natural/12) - 1)*7 + STAFF_LETTERS[name[0]] - c.bottom;
    const key = `${step}/${acc}`;
    if(seen.has(key)) return;
    seen.add(key);
    notes.push({ step, acc, abs, right:false, accCol:0 });
  });
  notes.sort((a,b)=> a.step - b.step);
  notes.forEach((n,i)=>{
    const below = notes[i-1];
    n.right = !!below && n.step - below.step <= 1 && !below.right;
  });
  // accidentals from the top down, each in the first column whose last glyph
  // ends above where this one begins
  const colBottom = [];
  for(let i=notes.length-1; i>=0; i--){
    const n = notes[i];
    if(!n.acc) continue;
    const g = accGlyph(n.acc), y = staffY(n.step);
    let col = colBottom.findIndex(bottom => bottom <= y + g.y0 - 0.1);
    if(col < 0){ col = colBottom.length; colBottom.push(0); }
    colBottom[col] = y + g.y1;
    n.accCol = col;
  }
  return notes;
}

// ledger lines a head at this step needs: every other step below or above the staff
function ledgerSteps(step){
  const out = [];
  for(let st=-2; st>=step; st-=2) out.push(st);
  for(let st=10; st<=step; st+=2) out.push(st);
  return out;
}

// A glyph's outline moved to x,y (staff spaces) and scaled to px, baked into
// the path data: a transform attribute would be the sounding animation's to
// override on a head, and an exported file reads plainer without one.
function glyphPath(g, x, y){
  let isX = true;
  return g.d.replace(/[A-Za-z]|-?\d*\.?\d+/g, t=>{
    if(/[A-Za-z]/.test(t)){ isX = true; return t; }
    const v = pct((+t + (isX ? x : y))*SP);
    isX = !isX;
    return String(v);
  });
}

function noteName(n){ return formatAccidentals(spellNote(n.abs)); }

// The staff drawn into a box starting at 0,0 (as exportFrame places it): five
// lines, the clef (an 8vb one for a part written an octave above sounding, as
// bass parts are), ledger lines, heads and accidentals, and the heads' names
// in a row beneath. The box grows only for what reaches past the clef.
// `playable` hangs the card's note-dot behaviour on heads and names alike.
function staffInner(absNotes, clef, writtenOctave, colors, playable){
  const c = STAFF_CLEFS[clef];
  const clefGlyph = LELAND[c.glyph + (writtenOctave ? '8vb' : '')];
  const clefY = staffY(c.line);
  const notes = staffLayout(absNotes, clef, writtenOctave);
  const ys = notes.map(y=> staffY(y.step));
  const top = Math.min(clefY + clefGlyph.y0, ...ys.map(y=> y + HEAD.y0)) - STAFF_PAD;
  // the names hang under whatever reaches lowest on the chord's side, a head
  // on the bottom line at the least, so every chord within the staff shares
  // one box
  const namesY = notes.length ? Math.max(4 + HEAD.y1, ...ys.map(y=> y + HEAD.y1)) + NAME_SIZE*1.75 : 0;
  const bottom = Math.max(clefY + clefGlyph.y1, 4, namesY + NAME_SIZE*0.3) + STAFF_PAD;
  const P = v => pct(v*SP);
  const ink = `fill="${colors.ink}"`;
  const rule = `stroke="${colors.ink}" opacity="${colors.lineOpacity}"`;
  let s = `<g transform="translate(0,${P(-top)})">`;
  for(let l=0; l<5; l++){
    s += `<line class="staff-line" x1="0" y1="${P(l)}" x2="${P(STAFF_W)}" y2="${P(l)}" ${rule} stroke-width="${P(LINE_W)}"/>`;
  }
  s += `<path class="staff-clef" d="${glyphPath(clefGlyph, CLEF_X, clefY)}" ${ink}/>`;
  const xOf = n => NOTE_X + (n.right ? SECOND_SHIFT : 0);
  // each ledger line only as wide as the heads that sit on or beyond it
  const ledgers = new Map();
  notes.forEach(n=> ledgerSteps(n.step).forEach(st=>{
    const [lo, hi] = ledgers.get(st) || [xOf(n), xOf(n) + HEAD.adv];
    ledgers.set(st, [Math.min(lo, xOf(n)), Math.max(hi, xOf(n) + HEAD.adv)]);
  }));
  ledgers.forEach(([lo, hi], st)=>{
    s += `<line class="staff-ledger" x1="${P(lo-LEDGER_EXT)}" y1="${P(staffY(st))}" x2="${P(hi+LEDGER_EXT)}" y2="${P(staffY(st))}" ${rule} stroke-width="${P(LEDGER_W)}"/>`;
  });
  notes.forEach(n=>{
    const y = staffY(n.step), x = xOf(n);
    const head = glyphPath(HEAD, x, y);
    if(playable){
      // the group is the dot (its fill reaches the head), and the clear
      // ellipse over it catches a pointer in the head's hollow
      s += `<g class="note-dot" data-abs="${n.abs}" tabindex="0" role="button" aria-label="Play ${escapeXML(noteName(n))}" ${ink}>`
        + `<path class="staff-note" d="${head}"/>`
        + `<ellipse class="staff-hit" cx="${P(x + HEAD.adv/2)}" cy="${P(y)}" rx="${P(HEAD.adv/2 + 0.25)}" ry="${P(0.75)}" fill="transparent" stroke="none"/></g>`;
    } else {
      s += `<path class="staff-note" d="${head}" ${ink}/>`;
    }
    const g = accGlyph(n.acc);
    for(let k=0; k<Math.abs(n.acc); k++){
      s += `<path class="staff-acc" d="${glyphPath(g, NOTE_X - STAFF_ACC_GAP - g.adv - n.accCol*STAFF_ACC_COL - k*(g.adv+0.1), y)}" ${ink}/>`;
    }
  });
  // the names in equal slots centred under the chord, dots between them; a
  // playable name's clear rect makes its whole slot the finger's target
  if(notes.length){
    const cx = NOTE_X + HEAD.adv/2 + (notes.some(n=> n.right) ? SECOND_SHIFT/2 : 0);
    const x0 = cx - (notes.length-1)*NAME_SLOT/2;
    // stroke="none" keeps the sounding and hover marks, which stroke a head's
    // outline, from thickening the letters
    const textAttrs = `y="${P(namesY)}" text-anchor="middle" font-size="${P(NAME_SIZE)}" font-weight="700" font-family="Arial,sans-serif" stroke="none"`;
    notes.forEach((n,i)=>{
      const x = x0 + i*NAME_SLOT;
      if(i) s += `<text class="staff-name-sep" x="${P(x - NAME_SLOT/2)}" ${textAttrs} ${ink} opacity="${colors.lineOpacity}">·</text>`;
      const name = extra => `<text class="staff-name" x="${P(x)}" ${textAttrs}${extra}>${accTspans(escapeXML(noteName(n)), pct(NAME_SIZE*SP*0.68))}</text>`;
      s += playable
        ? `<g class="note-dot" data-abs="${n.abs}" ${ink}>${name('')}<rect class="staff-hit" x="${P(x - NAME_SLOT/2)}" y="${P(namesY - NAME_SIZE*1.15)}" width="${P(NAME_SLOT)}" height="${P(NAME_SIZE*1.6)}" fill="transparent" stroke="none"/></g>`
        : name(` ${ink}`);
    });
  }
  s += '</g>';
  return { svg:s, w: pct(STAFF_W*SP), h: pct((bottom-top)*SP) };
}

function staffSVG(absNotes, clef = 'treble', writtenOctave = 0, colors = NICE_COLORS, playable = false){
  const { svg, w, h } = staffInner(absNotes, clef, writtenOctave, colors, playable);
  return `<svg viewBox="0 0 ${w} ${h}" width="164" role="img" aria-label="Staff notation">${svg}</svg>`;
}

function exportStaffTileSVG(label, instrument, absNotes, clef, writtenOctave, colors, showBorder, sourceURL){
  const { svg, w, h } = staffInner(absNotes, clef, writtenOctave, colors, false);
  return exportFrame(label, instrument, svg, w, h, colors, showBorder, null,
    sourceURL ? `Staff notation from ${sourceURL}` : null, null);
}

export {
  NICE_COLORS, BW_COLORS, AQUILA_KIDS_STRING_COLORS,
  escapeXML, setAccidentalBearings, chordSVG, exportTileSVG, scaleSVG, exportScaleTileSVG,
  neckSVG, exportNeckTileSVG, staffLayout, staffSVG, exportStaffTileSVG,
};
