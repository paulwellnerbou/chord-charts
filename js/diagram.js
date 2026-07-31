// Fretboard diagrams as SVG strings, plus the color palettes.

import { spellNote, formatAccidentals } from './theory.js';

const EXPORT_HEADING_FONT = "Georgia, 'Times New Roman', serif";
const NICE_COLORS = {
  ink:'#292621', dotFill:'#554f49', dotStroke:'#37332f',
  cardBg:'#fffcf7', cardBorder:'#ddd3c5', heading:'#a44737', rootColor:'#a44737',
  lineOpacity:0.55, markerOpacity:0.3, exportHeadingFont:EXPORT_HEADING_FONT
};
const BW_COLORS = {
  ink:'#000000', dotFill:'#000000', dotStroke:'#000000',
  cardBg:'#ffffff', cardBorder:'#000000', heading:'#000000', rootColor:'#000000',
  lineOpacity:1, markerOpacity:0.25, exportHeadingFont:EXPORT_HEADING_FONT
};
// Aquila Kids educational set: green/red/yellow/blue from 4th to 1st string
// (G C E A on a GCEA ukulele); applied by string position on every tuning.
const AQUILA_KIDS_STRING_COLORS = ['#2f9e44','#d0342c','#e6b400','#2b6bd8'];

const XS = [30,70,110,150];
const NUT_Y = 37, FRET_H = 34;
const FRET_MARKERS = [3,5,7,10,12];
function rowCenter(fret){ return NUT_Y + (fret-0.5)*FRET_H; }
function boardBottomY(numFrets, startFret){
  return NUT_Y + Math.max(3, numFrets - (startFret||0))*FRET_H;
}

function escapeXML(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function boardInner(numFrets, startFret, labels, colors){
  const numRows = Math.max(3, numFrets - startFret);
  const bottomY = NUT_Y + numRows*FRET_H;
  let s = '';
  labels.forEach((lab,i)=>{
    s += `<text x="${XS[i]}" y="12" text-anchor="middle" font-size="13" fill="${colors.ink}" font-family="Arial,sans-serif" font-weight="700">${escapeXML(lab)}</text>`;
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

function dotSVG(i, fret, startFret, labels, colors, isRoot, abs, name){
  const x = XS[i];
  const noteAttrs = abs!==null ? ` class="note-dot" data-abs="${abs}" tabindex="0" role="button" aria-label="Play ${escapeXML(labels[i])} string, ${escapeXML(String(fret))}${fret===0?' open':''}"` : '';
  let s = '';
  if(fret===0){
    s += `<circle cx="${x}" cy="24" r="6" fill="${colors.cardBg}" stroke="${colors.ink}" stroke-width="1.5"${noteAttrs}/>`;
    if(isRoot){
      s += `<circle cx="${x}" cy="24" r="9" fill="none" stroke="${colors.rootColor}" stroke-width="1.5" pointer-events="none"/>`;
    }
  } else {
    const y = rowCenter(fret-startFret);
    s += `<circle cx="${x}" cy="${y}" r="9" fill="${colors.dotFill}" stroke="${colors.dotStroke}" stroke-width="1"${noteAttrs}/>`;
    if(name) s += `<text class="note-name" x="${x}" y="${y+3}" text-anchor="middle" font-size="8" font-weight="700" fill="${colors.cardBg}" font-family="Arial,sans-serif" pointer-events="none">${name}</text>`;
    if(isRoot){
      s += `<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="${colors.rootColor}" stroke-width="1.5" pointer-events="none"/>`;
    }
  }
  return s;
}

function diagramInner(frets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, openAbs, startFret, showNoteNames){
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
    s += dotSVG(i, fret, startFret, labels, colors, isRoot, abs, name);
  });
  return s;
}

// Scale-position variant of diagramInner: several notes per string, spelled
// through the scale's own pc → name map (F# major reads E#, not F).
function scaleInner(stringFrets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, openAbs, startFret, showNoteNames, noteNames){
  startFret = startFret || 0;
  let s = boardInner(numFrets, startFret, labels, colors);
  stringFrets.forEach((frets,i)=>{
    frets.forEach(fret=>{
      const pc = (openPCs[i]+fret)%12;
      const isRoot = highlightRoot && pc===rootPC;
      const abs = openAbs ? openAbs[i]+fret : null;
      const spelled = (noteNames && noteNames[pc]) || spellNote(pc);
      const name = (showNoteNames && fret>0) ? escapeXML(formatAccidentals(spelled)) : null;
      s += dotSVG(i, fret, startFret, labels, colors, isRoot, abs, name);
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

function scaleSVG(name, stringFrets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, openAbs, startFret, showNoteNames, noteNames){
  const bottomY = boardBottomY(numFrets, startFret);
  let s = `<svg viewBox="0 0 188 ${bottomY+12}" width="328" role="img" aria-label="${escapeXML(name)} scale position diagram">`;
  s += scaleInner(stringFrets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, openAbs, startFret, showNoteNames, noteNames);
  s += '</svg>';
  return s;
}

// Card chrome around a diagram for standalone export: rounded paper, heading,
// optional italic footer line, optional <metadata> source note.
function exportFrame(label, innerSVG, numFrets, startFret, colors, showBorder, footerText, metadataText){
  const PAD = 14, headerH = 32;
  const diagW = 188;
  const diagH = boardBottomY(numFrets, startFret) + 12;
  const footerH = footerText ? 16 : 0;
  const tileW = diagW + PAD*2;
  const tileH = PAD + headerH + diagH + footerH + PAD;
  const strokeAttr = showBorder ? `stroke="${colors.cardBorder}" stroke-width="2"` : `stroke="none"`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tileW} ${tileH}" width="${tileW}" height="${tileH}">`;
  if(metadataText) s += `<metadata>${escapeXML(metadataText)}</metadata>`;
  s += `<rect x="1" y="1" width="${tileW-2}" height="${tileH-2}" rx="12" fill="${colors.cardBg}" ${strokeAttr}/>`;
  s += `<text x="${tileW/2}" y="${PAD+headerH*0.7}" text-anchor="middle" font-size="21" font-weight="700" fill="${colors.heading}" font-family="${colors.exportHeadingFont}">${escapeXML(label)}</text>`;
  s += `<g transform="translate(${PAD},${PAD+headerH})">${innerSVG}</g>`;
  if(footerText){
    s += `<text x="${tileW/2}" y="${PAD+headerH+diagH+11}" text-anchor="middle" font-size="9" font-style="italic" fill="${colors.ink}" opacity="${colors.lineOpacity}" font-family="Arial,sans-serif">${escapeXML(footerText)}</text>`;
  }
  s += '</svg>';
  return s;
}

function exportTileSVG(label, frets, numFrets, labels, colors, showBorder, openPCs, rootPC, highlightRoot, startFret, omitted, sourceURL, showNoteNames){
  const inner = diagramInner(frets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, undefined, startFret, showNoteNames);
  return exportFrame(label, inner, numFrets, startFret, colors, showBorder,
    omitted ? `${omitted.label} (${omitted.note}) omitted` : null,
    sourceURL ? `Chord diagram from ${sourceURL}` : null);
}

function exportScaleTileSVG(label, stringFrets, numFrets, labels, colors, showBorder, openPCs, rootPC, highlightRoot, startFret, notesLine, sourceURL, showNoteNames, noteNames){
  const inner = scaleInner(stringFrets, numFrets, labels, colors, openPCs, rootPC, highlightRoot, undefined, startFret, showNoteNames, noteNames);
  return exportFrame(label, inner, numFrets, startFret, colors, showBorder,
    notesLine || null,
    sourceURL ? `Scale diagram from ${sourceURL}` : null);
}

export {
  NICE_COLORS, BW_COLORS, AQUILA_KIDS_STRING_COLORS,
  escapeXML, chordSVG, exportTileSVG, scaleSVG, exportScaleTileSVG,
};
