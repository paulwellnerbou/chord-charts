import {
  TUNINGS, MAX_FRET_MIN, MAX_FRET_MAX, MAX_FRET_DEFAULT, MAX_SPAN_MIN,
  MAX_SPAN_MAX, MAX_SPAN_DEFAULT, MAX_VOICINGS, parseChord, parseNoteList, suggestedChords,
  findVoicings, computeFretWindow, chordAbsNotes, transposeChordText,
  identifyChord, spellNote, formatAccidentals,
} from './theory.js';
import { NICE_COLORS, BW_COLORS, AQUILA_KIDS_STRING_COLORS, escapeXML, chordSVG, exportTileSVG, scaleSVG, exportScaleTileSVG, neckSVG, exportNeckTileSVG } from './diagram.js';
import { parseScale, scaleCompletions, transposeScaleText, spellScale, scaleNoteNames, scalePositions, scaleNeck, positionPlaybackMidis, positionStartFret } from './scales.js';
import {
  playNote, playChord, chordPlayDuration, chordNoteTimings,
  primeAudio, createCapture,
  flashPlayButton, playChordAndFlash,
} from './audio.js';
import {
  afterNextPaint, animateHeightSwap, playAnimation, flashButton, flashButtonText,
  createModal, createMenu, initStepper, bumpValue, setLabelText, setupInfoPopover,
} from './ui.js';

// Which palette the current view state calls for — lives here, not in
// diagram.js, so the rendering module stays DOM-free.
function currentColors(){
  const base = document.body.classList.contains('bw-mode') ? BW_COLORS : NICE_COLORS;
  // string colours also apply in b&w mode — matching the physical strings is the option's point
  return document.getElementById('aquilaToggle').checked
    ? Object.assign({}, base, { stringColors: AQUILA_KIDS_STRING_COLORS })
    : base;
}

let maxFretValue = MAX_FRET_DEFAULT;

let maxSpanValue = MAX_SPAN_DEFAULT;

const INSTRUMENT_ICONS = {
  mandolin: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.68" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 11.92 1.50 L 12.05 1.50 L 12.24 1.67 L 12.61 1.78 L 12.61 1.82 L 13.33 1.90 L 13.44 1.99 L 13.59 1.99 L 13.65 2.05 L 13.78 2.07 L 13.84 2.20 L 13.91 2.22 L 13.91 2.56 L 13.70 2.80 L 13.59 2.80 L 13.65 2.84 L 13.65 3.01 L 13.44 3.18 L 13.41 3.30 L 13.49 3.30 L 13.59 3.18 L 13.70 3.16 L 13.91 3.16 L 13.96 3.22 L 14.12 3.24 L 14.12 3.50 L 14.07 3.50 L 13.94 3.67 L 13.65 3.67 L 13.51 3.58 L 13.49 3.50 L 13.25 3.50 L 13.25 3.60 L 13.20 3.60 L 13.14 3.88 L 13.25 3.86 L 13.35 3.73 L 13.59 3.73 L 13.80 3.86 L 13.84 4.01 L 13.80 4.11 L 13.56 4.26 L 13.33 4.24 L 13.20 4.09 L 13.09 4.09 L 13.09 4.43 L 13.23 4.32 L 13.51 4.32 L 13.65 4.43 L 13.65 4.49 L 13.70 4.49 L 13.70 4.62 L 13.65 4.62 L 13.65 4.75 L 13.56 4.81 L 13.27 4.83 L 13.14 4.77 L 13.16 4.96 L 13.20 5.00 L 13.33 5.00 L 13.35 4.94 L 13.70 4.94 L 13.84 5.07 L 13.84 5.28 L 13.78 5.39 L 13.59 5.41 L 13.59 5.45 L 13.41 5.45 L 13.35 5.41 L 13.33 5.51 L 12.88 5.83 L 12.77 6.15 L 12.71 6.15 L 12.69 6.34 L 12.88 12.56 L 13.01 12.63 L 13.27 13.31 L 13.41 13.39 L 13.44 13.50 L 13.70 13.58 L 13.80 13.69 L 14.04 13.71 L 14.04 13.75 L 15.00 13.71 L 14.95 14.52 L 15.00 14.52 L 15.08 14.83 L 15.29 15.11 L 15.40 15.13 L 15.40 15.22 L 15.56 15.30 L 15.59 15.41 L 15.80 15.54 L 15.93 15.75 L 16.06 15.81 L 16.06 15.88 L 16.14 15.92 L 16.14 16.04 L 16.35 16.21 L 16.35 16.36 L 16.54 16.64 L 16.61 17.00 L 16.70 17.04 L 16.86 17.79 L 16.82 18.49 L 16.77 18.49 L 16.70 19.04 L 16.61 19.08 L 16.61 19.25 L 16.56 19.25 L 16.54 19.34 L 16.54 19.89 L 16.61 20.08 L 16.70 20.10 L 16.70 20.21 L 16.91 20.40 L 16.94 20.57 L 16.86 20.61 L 16.27 20.61 L 16.06 20.57 L 16.06 20.53 L 15.83 20.50 L 15.80 20.59 L 15.50 20.80 L 15.40 20.99 L 15.10 21.23 L 15.05 21.35 L 14.95 21.37 L 14.86 21.48 L 14.79 21.48 L 14.68 21.61 L 14.44 21.69 L 14.41 21.76 L 14.31 21.76 L 14.29 21.82 L 13.89 21.95 L 13.89 21.99 L 13.49 22.08 L 13.49 22.12 L 12.69 22.22 L 12.53 22.39 L 12.14 22.44 L 12.00 22.52 L 11.79 22.52 L 11.71 22.44 L 11.57 22.44 L 11.57 22.39 L 11.36 22.39 L 11.29 22.27 L 11.18 22.27 L 11.18 22.22 L 10.70 22.18 L 10.70 22.14 L 10.46 22.12 L 10.46 22.08 L 10.25 22.05 L 10.22 21.99 L 10.09 21.99 L 10.09 21.95 L 9.82 21.86 L 9.75 21.78 L 9.42 21.67 L 9.16 21.44 L 9.02 21.42 L 8.86 21.25 L 8.79 21.25 L 8.71 21.12 L 8.55 21.10 L 8.55 20.99 L 8.47 20.97 L 8.44 20.87 L 8.26 20.78 L 8.23 20.67 L 8.15 20.65 L 7.96 20.36 L 7.84 20.27 L 7.72 20.02 L 7.62 19.97 L 7.62 19.85 L 7.54 19.82 L 7.51 19.65 L 7.44 19.63 L 7.41 19.40 L 7.35 19.40 L 7.32 19.21 L 7.28 19.21 L 7.25 19.12 L 7.18 18.57 L 7.11 18.57 L 7.09 17.72 L 7.28 16.87 L 7.32 16.87 L 7.35 16.66 L 7.41 16.66 L 7.62 16.13 L 7.81 15.98 L 7.91 15.73 L 7.96 15.73 L 7.99 15.62 L 8.23 15.43 L 8.23 15.37 L 8.44 15.24 L 8.47 15.13 L 8.81 14.90 L 8.81 14.83 L 9.02 14.71 L 9.02 14.62 L 9.24 14.45 L 9.24 13.96 L 9.19 13.96 L 9.16 13.82 L 9.11 13.82 L 9.07 13.69 L 9.02 13.69 L 9.02 13.54 L 8.95 13.52 L 8.95 13.43 L 8.81 13.33 L 8.76 13.05 L 8.62 12.88 L 8.62 12.29 L 8.69 12.29 L 8.69 12.16 L 8.76 12.12 L 8.86 11.86 L 9.07 11.76 L 9.11 11.67 L 9.61 11.52 L 9.61 11.48 L 10.16 11.48 L 10.16 11.52 L 10.44 11.54 L 10.44 11.59 L 10.59 11.61 L 10.65 11.71 L 10.73 11.71 L 10.94 11.90 L 10.94 11.97 L 11.01 11.99 L 11.01 12.05 L 11.07 12.05 L 11.07 12.73 L 10.96 12.75 L 10.77 12.99 L 10.25 13.03 L 10.06 12.88 L 10.06 12.61 L 10.16 12.54 L 10.16 12.48 L 10.09 12.48 L 10.04 12.67 L 9.99 12.67 L 10.09 13.01 L 10.25 13.03 L 10.25 13.07 L 10.77 13.03 L 10.86 12.94 L 10.96 12.92 L 10.96 12.84 L 11.07 12.80 L 11.10 12.67 L 11.18 12.61 L 11.18 12.29 L 11.23 12.29 L 11.29 9.80 L 11.34 9.80 L 11.41 6.17 L 11.36 6.17 L 11.34 5.98 L 11.18 5.87 L 11.15 5.77 L 10.96 5.70 L 10.94 5.60 L 10.80 5.58 L 10.73 5.34 L 10.62 5.45 L 10.44 5.45 L 10.44 5.41 L 10.25 5.39 L 10.22 5.26 L 10.16 5.26 L 10.16 5.07 L 10.22 5.07 L 10.25 4.96 L 10.59 4.90 L 10.86 5.09 L 10.89 4.94 L 10.94 4.94 L 10.96 4.66 L 10.89 4.71 L 10.86 4.81 L 10.46 4.81 L 10.38 4.69 L 10.32 4.69 L 10.32 4.45 L 10.44 4.43 L 10.51 4.32 L 10.80 4.32 L 10.96 4.49 L 10.96 4.09 L 10.77 4.09 L 10.77 4.15 L 10.65 4.24 L 10.32 4.24 L 10.16 4.11 L 10.16 3.86 L 10.30 3.75 L 10.62 3.73 L 10.65 3.79 L 10.77 3.81 L 10.77 3.88 L 10.94 3.88 L 10.89 3.86 L 10.86 3.69 L 10.80 3.69 L 10.77 3.50 L 10.38 3.50 L 10.38 3.58 L 10.25 3.60 L 10.25 3.64 L 9.90 3.64 L 9.80 3.54 L 9.80 3.28 L 9.90 3.18 L 10.16 3.16 L 10.38 3.24 L 10.38 3.30 L 10.62 3.30 L 10.51 3.09 L 10.32 2.97 L 10.30 2.86 L 10.16 2.80 L 10.14 2.63 L 10.09 2.60 L 10.14 2.29 L 10.30 2.16 L 10.65 2.14 L 10.77 2.22 L 10.77 2.41 L 10.86 2.39 Z M 11.98 1.63 L 11.71 1.82 L 11.71 1.88 L 11.50 1.99 L 11.50 2.05 L 11.10 2.31 L 11.07 2.39 L 10.94 2.41 L 10.86 2.56 L 10.62 2.56 L 10.65 2.29 L 10.59 2.24 L 10.32 2.29 L 10.22 2.46 L 10.32 2.80 L 10.51 2.90 L 10.54 3.01 L 10.67 3.09 L 10.77 3.24 L 10.77 3.37 L 10.89 3.41 L 10.96 3.64 L 11.01 3.64 L 11.07 3.75 L 11.15 4.26 L 11.10 4.90 L 10.91 5.19 L 10.89 5.45 L 11.07 5.53 L 11.34 5.85 L 11.41 5.87 L 11.60 6.38 L 11.57 6.87 L 11.52 6.94 L 11.50 9.27 L 11.44 9.42 L 11.41 11.16 L 11.31 12.63 L 11.26 12.63 L 11.07 13.01 L 10.89 13.07 L 10.89 13.11 L 10.62 13.20 L 10.22 13.18 L 10.22 13.14 L 10.06 13.11 L 9.90 12.97 L 9.85 12.84 L 9.90 12.50 L 10.09 12.35 L 10.44 12.35 L 10.46 12.48 L 10.30 12.54 L 10.16 12.69 L 10.22 12.88 L 10.32 12.94 L 10.54 12.94 L 10.77 12.84 L 10.96 12.54 L 10.94 12.12 L 10.89 12.12 L 10.77 11.90 L 10.51 11.71 L 10.44 11.71 L 10.44 11.67 L 10.09 11.59 L 9.75 11.59 L 9.40 11.67 L 9.40 11.71 L 9.19 11.78 L 8.95 11.97 L 8.79 12.24 L 8.76 12.80 L 8.86 13.07 L 8.95 13.14 L 8.97 13.33 L 9.07 13.39 L 9.19 13.69 L 9.24 13.69 L 9.26 13.84 L 9.35 13.90 L 9.40 14.16 L 9.35 14.49 L 9.26 14.54 L 9.24 14.64 L 9.19 14.64 L 9.16 14.77 L 8.97 14.86 L 8.95 14.96 L 8.39 15.37 L 8.39 15.43 L 8.34 15.43 L 8.12 15.75 L 8.01 15.81 L 7.89 16.07 L 7.84 16.07 L 7.49 16.72 L 7.25 17.62 L 7.25 18.49 L 7.35 18.98 L 7.41 19.00 L 7.41 19.19 L 7.46 19.21 L 7.67 19.76 L 7.72 19.76 L 7.75 19.89 L 7.81 19.89 L 7.84 20.04 L 7.89 20.04 L 7.99 20.27 L 8.07 20.29 L 8.39 20.74 L 9.24 21.42 L 9.32 21.42 L 9.35 21.48 L 9.61 21.63 L 10.09 21.82 L 10.09 21.86 L 10.46 21.95 L 10.54 22.01 L 10.67 22.01 L 10.67 22.05 L 11.39 22.16 L 11.44 22.29 L 11.76 22.31 L 11.90 22.44 L 12.05 22.37 L 12.05 22.33 L 12.45 22.29 L 12.45 22.20 L 12.53 22.16 L 13.27 22.05 L 13.27 22.01 L 13.73 21.93 L 13.73 21.88 L 14.29 21.69 L 14.31 21.63 L 14.68 21.48 L 14.93 21.29 L 14.95 21.20 L 15.19 21.03 L 15.26 20.87 L 15.43 20.78 L 15.43 20.72 L 15.47 20.72 L 15.50 20.63 L 15.77 20.40 L 16.04 20.40 L 16.35 20.53 L 16.77 20.50 L 16.70 20.36 L 16.61 20.33 L 16.40 19.91 L 16.40 19.31 L 16.49 19.06 L 16.54 19.04 L 16.61 18.53 L 16.68 18.53 L 16.70 17.68 L 16.54 17.02 L 16.49 17.02 L 16.38 16.64 L 16.27 16.43 L 16.23 16.43 L 16.19 16.24 L 16.06 16.13 L 16.04 15.98 L 15.99 15.98 L 15.83 15.73 L 15.43 15.41 L 15.40 15.30 L 15.21 15.22 L 15.21 15.15 L 15.08 15.07 L 15.00 14.90 L 14.95 14.90 L 14.93 14.77 L 14.86 14.77 L 14.84 14.35 L 14.79 14.35 L 14.86 13.82 L 14.20 13.88 L 13.84 13.82 L 13.84 13.77 L 13.51 13.69 L 13.20 13.39 L 13.01 12.97 L 12.95 12.97 L 12.93 12.75 L 12.88 12.75 L 12.77 12.61 L 12.77 12.16 L 12.69 11.84 L 12.69 9.72 L 12.61 9.17 L 12.53 6.30 L 12.71 5.83 L 12.95 5.64 L 12.95 5.58 L 13.20 5.45 L 13.23 5.32 L 13.27 5.28 L 13.56 5.32 L 13.70 5.24 L 13.70 5.09 L 13.59 5.07 L 13.59 5.02 L 13.41 5.02 L 13.27 5.17 L 13.09 5.13 L 13.01 4.77 L 12.95 4.77 L 12.95 4.58 L 13.01 4.56 L 12.93 4.52 L 12.93 4.15 L 12.95 4.01 L 13.01 4.01 L 13.01 3.75 L 13.11 3.43 L 13.20 3.41 L 13.33 3.09 L 13.49 2.97 L 13.49 2.90 L 13.20 2.90 L 13.16 2.77 L 13.20 2.73 L 13.49 2.73 L 13.65 2.67 L 13.78 2.52 L 13.80 2.31 L 13.51 2.07 L 12.64 1.95 L 12.64 1.90 L 12.43 1.88 L 12.43 1.84 L 12.16 1.75 L 12.05 1.63 Z M 13.80 3.26 L 13.68 3.28 L 13.65 3.39 L 13.59 3.39 L 13.65 3.54 L 13.91 3.54 L 13.99 3.41 L 13.94 3.30 Z M 10.01 3.28 L 9.90 3.35 L 9.93 3.47 L 9.99 3.54 L 10.22 3.54 L 10.30 3.37 L 10.25 3.37 L 10.22 3.28 Z M 10.49 3.84 L 10.30 3.92 L 10.32 4.11 L 10.59 4.13 L 10.70 3.94 L 10.65 3.94 L 10.62 3.86 Z M 13.41 3.86 L 13.27 4.01 L 13.35 4.11 L 13.56 4.13 L 13.68 4.05 L 13.68 3.92 L 13.59 3.86 Z M 10.62 4.43 L 10.46 4.52 L 10.51 4.69 L 10.77 4.71 L 10.86 4.56 L 10.80 4.56 L 10.77 4.45 Z M 13.33 4.43 L 13.25 4.45 L 13.16 4.58 L 13.25 4.71 L 13.49 4.71 L 13.51 4.49 L 13.44 4.43 Z M 10.41 5.02 L 10.30 5.13 L 10.32 5.28 L 10.46 5.32 L 10.62 5.30 L 10.70 5.19 L 10.67 5.09 L 10.62 5.02 Z" fill="currentColor" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round"/>
    <path d="M 10.8 18.5 h 2.4"/>
    <path d="M 11.3 22.3 v -1.4 h 1.4 v 1.4"/>
  </svg>`,
  ukulele: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.68" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 11c-2.5 0-3.5 1-3.5 2.2 0 1 1 1.5 1 2.3 0 1-2 2-2 4 0 1.5 2 2.3 4.5 2.3s4.5-.8 4.5-2.3c0-2-2-3-2-4 0-.8 1-1.3 1-2.3 0-1.2-1-2.2-3.5-2.2z"/>
    <circle cx="12" cy="14" r="1.1"/>
    <path d="M9.5 18.5h5"/>
    <path d="M11 11V5h2v6"/>
    <path d="M10.5 5V2.2c0-.6.4-1 .9-1h1.2c.5 0 .9.4.9 1V5"/>
    <path d="M9.5 2.2v.6M9.5 3.6v.6M14.5 2.2v.6M14.5 3.6v.6 M10.5 2.5H9.5M10.5 3.9H9.5M13.5 2.5h1M13.5 3.9h1"/>
  </svg>`,
  banjo: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.68" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="16.0" r="5.2"/>
    <circle cx="12" cy="16.0" r="4.2"/>
    <path d="M11.2 10.8V4.5h1.6V10.8"/>
    <path d="M10.5 4.5V2.2c0-.6.4-1 .9-1h1.2c.5 0 .9.4.9 1v2.3"/>
    <path d="M9.5 2.2v.6M9.5 3.6v.6M14.5 2.2v.6M14.5 3.6v.6 M10.5 2.5H9.5M10.5 3.9H9.5M13.5 2.5h1M13.5 3.9h1"/>
    <path d="M10.6 17.0h2.8"/>
    <path d="M11.2 21.2v.6h1.6v-.6"/>
  </svg>`,
  cavaquinho: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.68" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 10.9c-2.3 0-3.3 1.1-3.3 2.3 0 1.1 1.3 1.6 1.3 2.6 0 1.2-2.3 2.1-2.3 4.1 0 1.6 2 2.4 4.3 2.4s4.3-.8 4.3-2.4c0-2-2.3-2.9-2.3-4.1 0-1 1.3-1.5 1.3-2.6 0-1.2-1-2.3-3.3-2.3z"/>
    <circle cx="12" cy="13.9" r="1.1"/>
    <path d="M9.7 18.7h4.6"/>
    <path d="M11.1 10.9V5h1.8v5.9"/>
    <path d="M10.3 5V2.1c0-.5.4-.9.9-.9h1.6c.5 0 .9.4.9.9V5"/>
    <path d="M11.3 2.1v2.2M12.7 2.1v2.2"/>
    <path d="M10.3 2.5h-.9M10.3 3.9h-.9M13.7 2.5h.9M13.7 3.9h.9"/>
  </svg>`,
  cuatro: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.68" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 10.6c-2.7 0-3.9 1.2-3.9 2.6 0 1.2 1.5 1.8 1.5 2.7 0 1.1-2.2 1.9-2.2 3.7 0 1.7 2.1 2.8 4.6 2.8s4.6-1.1 4.6-2.8c0-1.8-2.2-2.6-2.2-3.7 0-.9 1.5-1.5 1.5-2.7 0-1.4-1.2-2.6-3.9-2.6z"/>
    <circle cx="12" cy="13.7" r="1.2"/>
    <path d="M9.5 18.9h5"/>
    <path d="M11.1 10.6V5h1.8v5.6"/>
    <path d="M10.2 5V2.4c0-.7.5-1.2 1.2-1.2h1.2c.7 0 1.2.5 1.2 1.2V5"/>
    <path d="M10.2 3h-.8M10.2 4.2h-.8M13.8 3h.8M13.8 4.2h.8"/>
  </svg>`,
  bass: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.68" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11.2 13.6C10.6 12.4 9.6 11.5 8.6 11.6C7.4 11.7 6.8 13.0 7.0 14.7C7.2 16.0 6.8 16.8 6.8 17.9C6.8 20.3 8.4 21.5 12 21.5C15.6 21.5 17.2 20.3 17.2 17.9C17.2 16.8 16.8 16.0 17.0 14.7C17.2 13.0 16.6 11.7 15.4 11.6C14.4 11.5 13.4 12.4 12.8 13.6"/>
    <path d="M11.2 13.6V5h1.6v8.6"/>
    <path d="M10.4 5V2.4c0-.7.5-1.2 1.1-1.2h1c.6 0 1.1.5 1.1 1.2V5"/>
    <path d="M10.4 1.9h-1M10.4 2.7h-1M10.4 3.5h-1M10.4 4.3h-1"/>
    <path d="M9.8 16.4h4.4v1.3h-4.4z"/>
    <path d="M10.6 19.3h2.8"/>
  </svg>`,
};

const COPY_ICON = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const PLAY_ICON = `<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;

const CHEVRON_LEFT = `<svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 6 9 12 15 18"/></svg>`;
const CHEVRON_RIGHT = `<svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>`;
const DOTS_ICON = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;
const DOWNLOAD_ICON = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
const LINK_ICON = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
const EXTERNAL_LINK_ICON = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
const GRID_ICON = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`;

// Accidentals wrapped in a span so CSS can shrink them and tuck them against the
// note letter, engraving-style. HTML sink only — never assign to textContent.
function accidentalsHTML(name){
  return accGlyphsHTML(formatAccidentals(name));
}

// Same .acc wrapping for text that already carries ♭/♯ glyphs (formatAccidentals output).
function accGlyphsHTML(text){
  return escapeXML(text).replace(/[♭♯]/g, g=>`<span class="acc">${g}</span>`);
}

function chordTileSVGString(label, frets, numFrets, labels, openPCs, rootPC, startFret, omitted, run){
  const colors = currentColors();
  const sourceURL = new URL(chordPageURL(label, false), window.location.href).href;
  const showBorder = document.getElementById('borderToggle').checked;
  const highlightRoot = document.getElementById('rootToggle').checked;
  const showNoteNames = document.getElementById('noteNamesToggle').checked;
  return exportTileSVG(formatAccidentals(label), frets, numFrets, labels, colors, showBorder, openPCs, rootPC, highlightRoot, startFret, omitted, sourceURL, showNoteNames, run);
}

// --- an exported diagram that plays its own run ---

// Where each dot sits and what it sounds: the addresses diagram.js needs to
// hang the run's lights on, in the "<string>:<fret>" form it looks them up by.
function chordPlaces(frets, openAbs){
  return frets.map((fret,i)=> fret===null ? null : { i, fret, abs:openAbs[i]+fret }).filter(Boolean);
}

function positionPlaces(pos, openAbs){
  return pos.strings.flatMap((frets,i)=> frets.map(fret=> ({ i, fret, abs:openAbs[i]+fret })));
}

// The run the export animates, off the very schedule the sheet plays: every
// place a pitch sits lights at each time that pitch comes round.
//
// The loop lasts exactly as long as the sound does, which leaves the finished
// diagram sitting there while the last note rings out — a rest that reads as
// the end of a run, and the room a recording needs to catch that ring.
function playbackRun(places, midiNotes, opts){
  const timings = chordNoteTimings(midiNotes, opts);
  if(!timings.length) return null;
  const onsets = {};
  for(const { midi, at } of timings){
    for(const place of places){
      if(place.abs !== midi) continue;
      const key = `${place.i}:${place.fret}`;
      (onsets[key] || (onsets[key] = [])).push(at);
    }
  }
  return {
    onsets, midiNotes, opts,
    litMs: timings[0].ms,
    totalMs: Math.round(chordPlayDuration(midiNotes, opts)),
  };
}

// One moment of a run, held. A recording works from the run it was handed
// rather than reading the card afresh each frame: the card stays live while
// the recording plays out, and a position or voicing changed halfway through
// would swap the picture out from under sound already committed to the run.
function seekRun(run, seekMs){
  return { ...run, seekMs, paused:true };
}

async function svgToPNGBlob(svgStr){
  const scale = 3;
  const vbMatch = svgStr.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if(!vbMatch) throw new Error('export SVG is missing its viewBox');
  const w = parseFloat(vbMatch[1]), h = parseFloat(vbMatch[2]);

  const img = new Image();
  await new Promise((resolve,reject)=>{ img.onload=resolve; img.onerror=reject; img.src='data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr); });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w*scale); canvas.height = Math.round(h*scale);
  const ctx = canvas.getContext('2d');
  if(!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve,reject)=> canvas.toBlob(blob=> blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
}

// the video's extension isn't known until the browser picks a codec, so the
// stem is nameable on its own
function chordFileBase(label){ return label.replace(/[^\w#]/g,'_'); }
function chordFileName(label, ext){ return `${chordFileBase(label)}.${ext}`; }

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
}

// Tile-export actions shared by the chord and scale card menus — the caller
// supplies the rendered tile SVG and a filename, these own the clipboard /
// download / flash choreography.
async function copyTileImage(svgStr, filename, btnEl){
  try{
    const blob = await svgToPNGBlob(svgStr);
    try{
      if(!navigator.clipboard || !window.ClipboardItem) throw new Error('no-clipboard-api');
      await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
      flashButton(btnEl, 'Copied');
    }catch(clipErr){
      downloadBlob(blob, filename);
      flashButton(btnEl, 'Saved');
    }
  }catch(err){
    console.error(err);
    flashButton(btnEl, 'Failed');
  }
}

async function downloadTilePNG(svgStr, filename, btnEl){
  try{
    downloadBlob(await svgToPNGBlob(svgStr), filename);
    flashButton(btnEl, 'Saved');
  }catch(err){
    console.error(err);
    flashButton(btnEl, 'Failed');
  }
}

function downloadTileSVG(svgStr, filename, btnEl){
  try{
    downloadBlob(new Blob([svgStr], { type:'image/svg+xml' }), filename);
    flashButton(btnEl, 'Saved');
  }catch(err){
    console.error(err);
    flashButton(btnEl, 'Failed');
  }
}

// --- video of a run ---

// MP4 first: it is the one an editor, a phone or a chat window all take without
// asking. Chromium and Safari both record it; Firefox has no MP4 muxer and so
// falls back to WebM. The extension follows from whichever the browser takes,
// and the codec pairs come first so the run is recorded with its sound.
const VIDEO_TYPES = [
  { mime:'video/mp4;codecs=avc1,mp4a.40.2', ext:'mp4' },
  { mime:'video/mp4', ext:'mp4' },
  { mime:'video/webm;codecs=vp9,opus', ext:'webm' },
  { mime:'video/webm;codecs=vp8,opus', ext:'webm' },
  { mime:'video/webm', ext:'webm' },
];
const VIDEO_FPS = 25, VIDEO_SCALE = 2;

function pickVideoType(){
  if(typeof MediaRecorder === 'undefined') return null;
  return VIDEO_TYPES.find(t=> MediaRecorder.isTypeSupported(t.mime)) || null;
}

async function rasterizeFrame(svgStr, ctx, w, h){
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  await img.decode();
  ctx.drawImage(img, 0, 0, w, h);
}

// Records the run, picture and sound. Each frame is the export SVG seeked to
// that moment and paused, so what lands in the video is exactly what the
// animated SVG shows — no second animation to keep in step with the first. The
// sound is the real thing, played once through a capture node while the frames
// are taken, which is why the recording runs at the run's own pace.
async function recordRunVideo(frameSVG, run, type){
  const probe = frameSVG(seekRun(run, 0));
  const vb = probe.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if(!vb) throw new Error('export SVG is missing its viewBox');
  const w = Math.round(parseFloat(vb[1])*VIDEO_SCALE), h = Math.round(parseFloat(vb[2])*VIDEO_SCALE);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if(!ctx) throw new Error('canvas 2d context unavailable');
  await rasterizeFrame(probe, ctx, w, h);

  // primed first: a context that still has to resume would put its whole
  // start-up delay between the first frame and the first note
  await primeAudio();
  const stream = canvas.captureStream(VIDEO_FPS);
  try{
    const capture = createCapture();
    capture.stream.getAudioTracks().forEach(t=> stream.addTrack(t));

    const rec = new MediaRecorder(stream, { mimeType:type.mime, videoBitsPerSecond:6000000 });
    const chunks = [];
    rec.ondataavailable = e=>{ if(e.data.size) chunks.push(e.data); };
    const done = new Promise((resolve,reject)=>{
      rec.onstop = resolve;
      rec.onerror = ()=> reject(new Error('recording failed'));
    });

    rec.start();
    const started = performance.now();
    playChord(run.midiNotes, { ...run.opts, capture });

    // Frames are picked by the clock, not counted off: the recorder timestamps
    // what it samples in real time, so a moment that takes too long to draw has
    // to be skipped rather than queued. Slow rendering costs smoothness — and
    // never sync, since the notes are scheduled on the audio clock and don't
    // wait for the rasteriser. Running the frames in order would cost both.
    const frameMs = 1000/VIDEO_FPS;
    for(;;){
      const at = performance.now() - started;
      if(at >= run.totalMs) break;
      await rasterizeFrame(frameSVG(seekRun(run, Math.round(at))), ctx, w, h);
      const spare = frameMs - (performance.now() - started - at);
      if(spare > 0) await new Promise(r=> setTimeout(r, spare));
    }
    // the stream samples the canvas on its own clock, so the closing frames
    // need to still be up when it looks — stop on their heels and the run's
    // last rest is clipped, which a looping player shows as a jump
    await new Promise(r=> setTimeout(r, frameMs*3));
    rec.stop();
    await done;
    return new Blob(chunks, { type:type.mime });
  } finally {
    stream.getTracks().forEach(t=> t.stop());
  }
}

// Only the card being recorded has its menu button held disabled, so a second
// card can still start one — and two recordings would spend the run competing
// for the rasteriser, each dropping frames the other's pace never needed to
// lose. One at a time; the sound they capture is already their own.
let recordingRun = false;

async function downloadTileVideo(frameSVG, run, baseName, btnEl){
  const type = pickVideoType();
  if(!type || !run){ flashButton(btnEl, 'No video'); return; }
  if(recordingRun){ flashButton(btnEl, 'Busy'); return; }
  recordingRun = true;
  try{
    flashButton(btnEl, 'Recording', { hold:true });
    const blob = await recordRunVideo(frameSVG, run, type);
    downloadBlob(blob, `${baseName}.${type.ext}`);
    flashButton(btnEl, 'Saved');
  }catch(err){
    console.error(err);
    flashButton(btnEl, 'Failed');
  }finally{
    recordingRun = false;
  }
}

async function copyAllChordsAsImage(btnEl){
  const grid = document.getElementById('grid');
  const cardEls = [...grid.querySelectorAll('.card')];
  if(!cardEls.length) return;

  const tuning = currentTuning();
  const colors = currentColors();
  const showBorder = document.getElementById('borderToggle').checked;
  const highlightRoot = document.getElementById('rootToggle').checked;
  const showNoteNames = document.getElementById('noteNamesToggle').checked;
  const showOmitted = document.getElementById('omitToggle').checked;
  const scale = 3;

  try{
    const gridRect = grid.getBoundingClientRect();
    const items = cardEls.map(cardEl=>{
      const result = cardEl._chordResult;
      const frets = result.voicings[result.altIndex];
      const { fretMax, startFret } = computeFretWindow(frets, shortenThreshold);
      const svgStr = exportTileSVG(formatAccidentals(result.label), frets, fretMax, tuning.labels, colors, showBorder, tuning.openPCs, result.rootPC, highlightRoot, startFret, showOmitted ? result.omitted : null, new URL(chordPageURL(result.label, false), window.location.href).href, showNoteNames);
      const rect = cardEl.getBoundingClientRect();
      return { svgStr, x: rect.left-gridRect.left, y: rect.top-gridRect.top, w: rect.width, h: rect.height };
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(gridRect.width*scale);
    canvas.height = Math.round(gridRect.height*scale);
    const ctx = canvas.getContext('2d');
    if(!ctx) throw new Error('canvas 2d context unavailable');
    // the tiles' own paper (or bw white), never the themed stage behind them —
    // exports must match what prints
    ctx.fillStyle = colors.cardBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await Promise.all(items.map(item=> new Promise((resolve,reject)=>{
      const img = new Image();
      img.onload = ()=>{ ctx.drawImage(img, item.x*scale, item.y*scale, item.w*scale, item.h*scale); resolve(); };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(item.svgStr);
    })));

    const blob = await new Promise((resolve, reject)=> canvas.toBlob(b=> b ? resolve(b) : reject(new Error('PNG encoding failed')), 'image/png'));

    try{
      if(!navigator.clipboard || !window.ClipboardItem) throw new Error('no-clipboard-api');
      await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
      flashButtonText(btnEl, 'Copied');
    }catch(clipErr){
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chords.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 4000);
      flashButtonText(btnEl, 'Saved');
    }
  }catch(err){
    console.error(err);
    flashButtonText(btnEl, 'Failed');
  }
}

function copyTextFallback(text){
  const helper = document.createElement('textarea');
  const previousFocus = document.activeElement;
  helper.value = text;
  helper.setAttribute('readonly', '');
  helper.setAttribute('aria-hidden', 'true');
  helper.tabIndex = -1;
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  helper.style.pointerEvents = 'none';
  try{
    document.body.appendChild(helper);
    helper.select();
    helper.setSelectionRange(0, helper.value.length);
    return document.execCommand('copy');
  }catch(err){
    return false;
  }finally{
    helper.remove();
    if(previousFocus instanceof HTMLElement && previousFocus.isConnected){
      try{ previousFocus.focus({ preventScroll:true }); }
      catch(err){ try{ previousFocus.focus(); }catch(focusErr){} }
    }
  }
}

// resolves to the flash verdict for the share button
async function copyLinkText(link){
  try{
    if(!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('no-clipboard-api');
    await navigator.clipboard.writeText(link);
    return 'Copied';
  }catch(err){
    if(copyTextFallback(link)) return 'Copied';
    window.prompt('Copy this link:', link);
    return 'Shown';
  }
}

// Non-chart params (e.g. a songApi override) survive into per-chord links.
function chordPageURL(label, allVoicings){
  const params = new URLSearchParams(window.location.search);
  [...CHART_PARAMS, ...MODAL_PARAMS].forEach(p=>params.delete(p));
  params.set('chords', label + (allVoicings ? '*' : ''));
  params.set('tuning', selectedTuningId);
  return window.location.pathname + '?' + readableQuery(params);
}

async function copyChordLink(label, btnEl){
  const link = new URL(chordPageURL(label, false), window.location.href).href;
  try{
    if(!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('no-clipboard-api');
    await navigator.clipboard.writeText(link);
    flashButton(btnEl, 'Copied');
  }catch(err){
    if(copyTextFallback(link)){
      flashButton(btnEl, 'Copied');
    } else {
      window.prompt('Copy this chord link:', link);
      flashButton(btnEl, 'Shown');
    }
  }
}

let cardMenuEl = null;
let cardMenuState = null;

function ensureCardMenu(){
  if(cardMenuEl) return cardMenuEl;
  cardMenuEl = document.createElement('div');
  cardMenuEl.className = 'card-menu no-print';
  cardMenuEl.setAttribute('role', 'menu');
  cardMenuEl.hidden = true;
  document.body.appendChild(cardMenuEl);
  cardMenuEl.addEventListener('keydown', e=>{
    const items = [...cardMenuEl.querySelectorAll('.card-menu-item')];
    if(!items.length) return;
    const idx = Math.max(0, items.indexOf(document.activeElement));
    if(e.key === 'ArrowDown'){ e.preventDefault(); items[(idx+1)%items.length].focus(); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); items[(idx-1+items.length)%items.length].focus(); }
    else if(e.key === 'Home'){ e.preventDefault(); items[0].focus(); }
    else if(e.key === 'End'){ e.preventDefault(); items[items.length-1].focus(); }
    else if(e.key === 'Escape'){ e.preventDefault(); closeCardMenu({ restoreFocus:true }); }
    // per the menu-button pattern Tab leaves the menu from the trigger onwards
    else if(e.key === 'Tab'){ closeCardMenu({ restoreFocus:true }); }
    else if(e.key === ' ' && document.activeElement && document.activeElement.tagName === 'A'){ e.preventDefault(); document.activeElement.click(); }
  });
  return cardMenuEl;
}

function cardMenuItem(icon, text, href){
  const el = document.createElement(href ? 'a' : 'button');
  el.className = 'card-menu-item';
  el.setAttribute('role', 'menuitem');
  if(href){ el.href = href; el.target = '_blank'; el.rel = 'noopener'; }
  else { el.type = 'button'; }
  el.innerHTML = icon;
  el.appendChild(document.createTextNode(text));
  return el;
}

function addCardMenuAction(menu, icon, text, run){
  const item = cardMenuItem(icon, text);
  item.addEventListener('click', ()=>{ closeCardMenu({ restoreFocus:true }); run(); });
  menu.appendChild(item);
}

function closeCardMenu(opts){
  if(!cardMenuEl || cardMenuEl.hidden) return;
  cardMenuEl.hidden = true;
  const { btn, onPointerDown, onWindowChange } = cardMenuState;
  document.removeEventListener('pointerdown', onPointerDown, true);
  window.removeEventListener('scroll', onWindowChange, { capture:true });
  window.removeEventListener('resize', onWindowChange);
  btn.setAttribute('aria-expanded', 'false');
  if(opts && opts.restoreFocus){
    try{ btn.focus({ preventScroll:true }); }catch(err){ btn.focus(); }
  }
  cardMenuState = null;
}

function openCardMenu(card, btn){
  const menu = ensureCardMenu();
  closeCardMenu();
  const result = card._chordResult;
  menu.innerHTML = '';
  menu.setAttribute('aria-label', `Actions for ${result.label}`);

  // Everything a file is made of, settled at the click, so the menu can stay
  // prebuilt while the flash feedback lands on the card's own button. A
  // recording renders every frame from what this settled: the sheet stays live
  // while one plays out, and a voicing cycled halfway through would swap the
  // picture out from under sound already committed to the run.
  const settleTile = ()=>{
    const tuning = currentTuning();
    const frets = result.voicings[result.altIndex];
    const win = computeFretWindow(frets, shortenThreshold);
    const omitted = document.getElementById('omitToggle').checked ? result.omitted : null;
    return {
      svg: run=> chordTileSVGString(result.label, frets, win.fretMax, tuning.labels, tuning.openPCs, result.rootPC, win.startFret, omitted, run),
      run: playbackRun(chordPlaces(frets, tuning.openAbs), chordAbsNotes(frets, tuning.openAbs), chordPlayOpts(tuning)),
    };
  };
  const addAction = addCardMenuAction.bind(null, menu);

  addAction(COPY_ICON, 'Copy image', ()=> copyTileImage(settleTile().svg(), chordFileName(result.label, 'png'), btn));
  addAction(DOWNLOAD_ICON, 'Download PNG', ()=> downloadTilePNG(settleTile().svg(), chordFileName(result.label, 'png'), btn));
  addAction(DOWNLOAD_ICON, 'Download SVG', ()=> downloadTileSVG(settleTile().svg(), chordFileName(result.label, 'svg'), btn));
  menu.appendChild(Object.assign(document.createElement('hr'), { className:'card-menu-sep' }));
  addAction(DOWNLOAD_ICON, 'Download animated SVG', ()=>{
    const tile = settleTile();
    downloadTileSVG(tile.svg(tile.run), chordFileName(`${result.label} animated`, 'svg'), btn);
  });
  addAction(DOWNLOAD_ICON, 'Download video', ()=>{
    const tile = settleTile();
    downloadTileVideo(tile.svg, tile.run, chordFileBase(`${result.label} animated`), btn);
  });
  menu.appendChild(Object.assign(document.createElement('hr'), { className:'card-menu-sep' }));
  addAction(LINK_ICON, 'Copy link to this chord', ()=> copyChordLink(result.label, btn));
  const openItem = cardMenuItem(EXTERNAL_LINK_ICON, 'Open in new tab', chordPageURL(result.label, false));
  openItem.addEventListener('click', ()=> closeCardMenu());
  menu.appendChild(openItem);
  if(result.voicings.length > 1){
    const allItem = cardMenuItem(GRID_ICON, `All ${result.voicings.length} voicings in new tab`, chordPageURL(result.label, true));
    allItem.addEventListener('click', ()=> closeCardMenu());
    menu.appendChild(allItem);
  }

  presentCardMenu(menu, btn);
}

// Positioning, outside-click dismissal and initial focus, shared by the chord
// and scale card menus once their items are in place.
function presentCardMenu(menu, btn){
  btn.setAttribute('aria-expanded', 'true');
  menu.style.visibility = 'hidden';
  menu.hidden = false;
  const r = btn.getBoundingClientRect();
  const left = Math.max(8, Math.min(r.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8));
  let top = r.bottom + 6;
  if(top + menu.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - menu.offsetHeight - 6);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.visibility = '';

  const onPointerDown = e=>{
    if(!menu.contains(e.target) && !btn.contains(e.target)) closeCardMenu();
  };
  const onWindowChange = ()=> closeCardMenu();
  document.addEventListener('pointerdown', onPointerDown, true);
  // the menu is position:fixed, so any scroll would leave it floating detached
  window.addEventListener('scroll', onWindowChange, { capture:true, passive:true });
  window.addEventListener('resize', onWindowChange);
  cardMenuState = { btn, onPointerDown, onWindowChange };

  const first = menu.querySelector('.card-menu-item');
  if(first){
    try{ first.focus({ preventScroll:true }); }catch(err){ first.focus(); }
  }
}

function toggleCardMenu(card, btn){
  if(cardMenuState && cardMenuState.btn === btn){ closeCardMenu(); return; }
  card._scaleResult ? openScaleCardMenu(card, btn) : openCardMenu(card, btn);
}

// --- notes lighting up as they sound ---

// Lights one dot for as long as its note leads what you hear. A pitch comes
// round twice in an up-and-down run, and re-adding a class a dot already
// carries is no change as far as CSS is concerned — its animation would carry
// on mid-flight — so a dot that is still lit gets rewound instead.
function lightNoteDot(dot, ms){
  dot.style.setProperty('--lit-ms', `${ms}ms`);
  if(dot.classList.contains('is-sounding')){
    dot.getAnimations().forEach(a=>{ a.currentTime = 0; });
  } else {
    dot.classList.add('is-sounding');
  }
  clearTimeout(dot._litTimer);
  dot._litTimer = setTimeout(()=> dot.classList.remove('is-sounding'), ms);
}

// Lights the notes of a strum or a run as they sound, so a scale reads as one
// light travelling up the box. Matched on the exact pitch, never the note name:
// every string that can sound this very C lights with it, the C an octave up
// never does. The diagram is looked up when the note comes round rather than up
// front: one swapped mid-run simply stops lighting, nothing stale left behind.
function lightNotes(slot, midiNotes, opts, started){
  if(!slot) return;
  started.then(()=>{
    for(const { midi, at, ms } of chordNoteTimings(midiNotes, opts)){
      setTimeout(()=>{
        slot.querySelectorAll(`.note-dot[data-abs="${midi}"]`)
          .forEach(dot=>{ if(!dot.closest('.diagram-ghost')) lightNoteDot(dot, ms); });
      }, at);
    }
  });
}

// Play a card's own notes: its play button flashes and its diagram lights up.
function playCardNotes(card, midiNotes, opts){
  const started = playChord(midiNotes, opts);
  flashPlayButton(card.querySelector('.play-chord-btn'), started, chordPlayDuration(midiNotes, opts));
  lightNotes(card.querySelector('.diagram-slot'), midiNotes, opts, started);
}

function bindNoteDotHandlers(container){
  const card = container.closest('.card');
  const playBtn = card && card.querySelector('.play-chord-btn');
  // dots in an outgoing .diagram-ghost keep their old listeners — rebinding
  // them would stack duplicates
  [...container.querySelectorAll('.note-dot')].filter(dot=> !dot.closest('.diagram-ghost')).forEach(dot=>{
    const playThisNote = e=>{
      e.stopPropagation();
      const abs = parseFloat(dot.dataset.abs);
      const started = playNote(abs);
      flashPlayButton(playBtn, started, chordPlayDuration([abs]));
      lightNotes(container, [abs], null, started);
    };
    dot.addEventListener('click', playThisNote);
    dot.addEventListener('keydown', e=>{
      if(e.key==='Enter' || e.key===' '){ e.preventDefault(); playThisNote(e); }
    });
  });
}

function updateNavCount(card, result){
  const countEl = card.querySelector('.voicing-nav-count');
  if(countEl) countEl.textContent = `${result.altIndex+1} / ${result.voicings.length}`;
}

// Replace a card's diagram, sliding it in when dir is signed and motion is
// allowed, and rebind the per-note play dots.
function swapDiagramHTML(slot, html, slideDir){
  const curSVG = slot.querySelector('svg');
  const animate = slideDir && slot.animate && curSVG && curSVG.animate
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(animate){
    slideVoicingSwap(slot, html, slideDir);
  }else{
    if(slot._swapCleanup) slot._swapCleanup();
    slot.innerHTML = html;
  }
  bindNoteDotHandlers(slot);
}

function updateCardDiagram(card, result, tuning, colors, highlightRoot, slideDir, showNoteNames){
  const frets = result.voicings[result.altIndex];
  const { fretMax, startFret } = computeFretWindow(frets, shortenThreshold);
  const html = chordSVG(result.label, frets, fretMax, tuning.labels, colors, tuning.openPCs, result.rootPC, highlightRoot, tuning.openAbs, startFret, showNoteNames);
  swapDiagramHTML(card.querySelector('.diagram-slot'), html, slideDir);
  updateNavCount(card, result);
}

// Carousel swap: the old diagram (kept in an absolute ghost layer) slides out
// one side while the new one slides in from the other, and the slot height
// eases between the two diagrams' sizes. dir: 1 = next, -1 = previous.
function slideVoicingSwap(slot, newHTML, dir){
  const oldSVG = slot.querySelector('svg');
  // mid-flight interrupt (rapid taps): let the ghost take over from the
  // incoming diagram's current position instead of snapping to center
  const startTf = oldSVG ? getComputedStyle(oldSVG).transform : 'none';
  const oldH = slot.offsetHeight;
  if(slot._swapCleanup) slot._swapCleanup();

  slot.innerHTML = newHTML;
  const newSVG = slot.querySelector('svg');
  const newH = slot.offsetHeight;

  const ghost = document.createElement('div');
  ghost.className = 'diagram-ghost no-print';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.inert = true;
  if(oldSVG) ghost.appendChild(oldSVG);
  // inert already blocks focus; stripping tabindex covers browsers without it
  ghost.querySelectorAll('[tabindex]').forEach(el=> el.removeAttribute('tabindex'));
  slot.appendChild(ghost);
  slot.classList.add('voicing-anim');

  const dist = slot.clientWidth;
  const timing = { duration:240, easing:'cubic-bezier(.4,0,.2,1)', fill:'forwards' };
  const anims = [
    newSVG.animate([{ transform:`translateX(${dir*dist}px)` }, { transform:'translateX(0)' }], timing),
  ];
  if(oldSVG){
    anims.push(oldSVG.animate([
      { transform: startTf === 'none' ? 'translateX(0)' : startTf },
      { transform:`translateX(${-dir*dist}px)` },
    ], timing));
  }
  if(newH !== oldH) anims.push(slot.animate([{ height:`${oldH}px` }, { height:`${newH}px` }], timing));

  const cleanup = ()=>{
    slot._swapCleanup = null;
    anims.forEach(a=> a.cancel());
    ghost.remove();
    slot.classList.remove('voicing-anim');
  };
  slot._swapCleanup = cleanup;
  Promise.all(anims.map(a=> a.finished)).then(cleanup, ()=>{});
  // hidden tabs get no rendering frames, so `finished` can stall — sweep eventually
  setTimeout(()=>{ if(slot._swapCleanup === cleanup) cleanup(); }, 1000);
}

let selectedTuningId = TUNINGS[0].id;
function currentTuning(){
  return TUNINGS.find(t=>t.id===selectedTuningId) || TUNINGS[0];
}

// bass always plays broken chords (see TUNINGS); elsewhere it's the user's call
function chordPlayOpts(tuning){
  return { arpeggio: !!tuning.arpeggio || document.getElementById('arpeggioToggle').checked };
}

// --- chords/scales mode: two builders sharing one sheet ---
let currentMode = 'chords';

// The note-names toggle keeps one remembered state per mode: names clutter a
// chord sheet but are half the point of a scale box, so scales default on.
const noteNamesByMode = { chords: false, scales: true };

// Set by setMode until the rebuild it asked for has run, so that one — and no
// other regenerate() — arrives on the sheet as an animated swap.
let modeSwitchPending = false;

function setMode(mode, opts){
  // silent is the initial mode: a starting state, not a switch, so it neither
  // rebuilds the sheet (the first render does that) nor animates into place
  const silent = !!(opts && opts.silent);
  currentMode = mode;
  const scales = mode === 'scales';
  document.getElementById('noteNamesToggle').checked = noteNamesByMode[mode];
  document.body.classList.toggle('scales-mode', scales);
  const tabChords = document.getElementById('modeTabChords');
  const tabScales = document.getElementById('modeTabScales');
  tabChords.setAttribute('aria-selected', String(!scales));
  tabScales.setAttribute('aria-selected', String(scales));
  tabChords.tabIndex = scales ? -1 : 0;
  tabScales.tabIndex = scales ? 0 : -1;
  const panel = document.getElementById(scales ? 'scalesPanel' : 'chordsPanel');
  const swapPanels = ()=>{
    document.getElementById('chordsPanel').hidden = scales;
    document.getElementById('scalesPanel').hidden = !scales;
  };
  if(silent) swapPanels();
  else {
    animateHeightSwap(document.getElementById('builderPanels'), swapPanels, { clip:true, duration:300 });
    playAnimation(panel, 'switch-in');
  }
  document.getElementById('stage').setAttribute('aria-label', scales ? 'Scale sheet' : 'Chord chart sheet');
  if(silent) return;
  // The sheet is the other half of the switch — but rebuilding it is the slow
  // part, so it waits for the paint that starts the animations above.
  modeSwitchPending = true;
  scheduleGenerate();
}

// Everything that re-renders the sheet without being chord- or scale-specific
// (tuning, colors, options toggles) routes through this dispatch.
function regenerate(){
  const render = ()=>{
    if(currentMode === 'scales') generateScale();
    else generate();
  };
  if(!modeSwitchPending){ render(); return; }
  modeSwitchPending = false;
  const grid = document.getElementById('grid');
  animateHeightSwap(grid, render, { clip:true, duration:300 });
  playAnimation(document.querySelector('.stage-heading'), 'switch-in');
  playAnimation(grid, 'switch-in');
}

const COLUMNS_MIN = 1, COLUMNS_MAX = 8;
let columnsValue = 'auto';

const THRESHOLD_MIN = 1, THRESHOLD_MAX = 11;
let shortenThreshold = 5;

const SETTINGS_KEY = 'chordChartGenerator.settings';

function loadSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(err){ return {}; }
}

function saveSettings(){
  const settings = {
    mode: currentMode,
    tuningId: selectedTuningId,
    showBorder: document.getElementById('borderToggle').checked,
    showCardControls: document.getElementById('cardControlsToggle').checked,
    bwMode: document.getElementById('bwToggle').checked,
    highlightRoot: document.getElementById('rootToggle').checked,
    scaleView: scaleView,
    scaleRootRun: document.getElementById('rootRunToggle').checked,
    scaleSimplifyAccidentals: document.getElementById('simplifyAccidentalsToggle').checked,
    showNoteNames: noteNamesByMode.chords,
    scaleShowNoteNames: noteNamesByMode.scales,
    aquilaStrings: document.getElementById('aquilaToggle').checked,
    columns: columnsValue,
    masonry: document.getElementById('masonryToggle').checked,
    shortenThreshold: shortenThreshold,
    showOmitted: document.getElementById('omitToggle').checked,
    maxFret: maxFretValue,
    maxSpan: maxSpanValue,
    allowMuted: document.getElementById('voicingModalMuted').checked,
    chooserMasonry: document.getElementById('voicingModalMasonry').checked,
    customChordMasonry: document.getElementById('customChordModalMasonry').checked,
    customChordMaxFret: customChordMaxFretValue,
    customChordMaxSpan: customChordMaxSpanValue,
    customChordAllowMuted: document.getElementById('customChordModalMuted').checked,
    reverseAnyKey: document.getElementById('reverseAnyKey').checked,
    reverseAllowExtra: document.getElementById('reverseAllowExtra').checked,
    fretboardId: encodeFretboardState(fretboardIdState),
    fretboardIdNames: fretboardIdNamesToggleEl.checked,
  };
  // Only persist chordInput once the user has actually edited it — otherwise a
  // fresh visit would freeze in the built-in default forever instead of picking
  // up future default changes. While it is still default (or emptied for a
  // pending ?song= load) any previously stored chords are carried forward.
  if(!chordInputIsDefault){
    settings.chordInput = packChordInput(document.getElementById('chordInput').value);
  } else if(typeof savedSettings.chordInput === 'string'){
    settings.chordInput = packChordInput(savedSettings.chordInput);
  }
  // same default-gating for the scale input's showcase default
  if(!scaleInputIsDefault){
    settings.scaleInput = packScaleInput(document.getElementById('scaleInput').value);
  } else if(typeof savedSettings.scaleInput === 'string'){
    settings.scaleInput = packScaleInput(savedSettings.scaleInput);
  }
  try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }catch(err){}
}

// The chord list travels compact — separators only, no whitespace — through
// localStorage and share links, and comes back onto the page with a space
// after each comma. Newlines count as separators, so packing never glues two
// chords together.
function packChordInput(value){
  return value.split(/[,\n]+/).map(t=>t.trim()).filter(Boolean).join(',');
}
function formatChordInput(value){
  return value.split(/[,\n]+/).map(t=>t.trim()).filter(Boolean).join(', ');
}

// Every link the app writes or copies serializes its params through this:
// commas are legal in a query string, so unescaping them keeps links readable.
function readableQuery(params){
  return params.toString().replace(/%2C/gi, ',');
}

// What the sheet shows (one mode's worth at a time) vs. deep-links that open a
// dialog. Copy-link builders delete both lists and re-set their own, so no
// shared link carries two modes at once. The address-bar writers
// (updateURLParam/updateScaleURLParam) swap only the chart params — a dialog
// deep-link the page was loaded with stays in the bar, in both modes alike.
const CHART_PARAMS = ['chords','song','transpose','scale','view'];
const MODAL_PARAMS = ['notes','fretboard','findsongs'];

const MASONRY_GAP = 16, MASONRY_MIN_COL_WIDTH = 190;

// cards from the last generate(), in chord order — a resize re-layout can't
// recollect them from the DOM because masonry bin-packing scrambles DOM order
let currentCardEls = [];

// Undoes every mark layoutCards leaves on #grid — the scales pipeline renders
// its single card without layoutCards and needs the grid back in a known state.
function resetGridLayout(){
  currentCardEls = [];
  const grid = document.getElementById('grid');
  grid.classList.remove('masonry');
  grid.style.gridTemplateColumns = '';
}

// Native CSS column-count is a *maximum*: its balance algorithm often settles on
// fewer, evenly-divisible columns for a handful of same-height cards. Distributing
// cards into explicit column elements guarantees the chosen count is always used.
function layoutCards(cardEls){
  const grid = document.getElementById('grid');
  const cols = columnsValue;
  const masonry = document.getElementById('masonryToggle').checked;
  grid.classList.toggle('masonry', masonry);
  grid.innerHTML = '';

  // Fewer cards than columns would leave empty tracks that push the filled
  // ones off-center, so the count is capped at the card count in both layouts.
  if(!masonry){
    const requested = cols === 'auto' ? 'auto' : (window.innerWidth <= 600 ? Math.min(cols, 2) : cols);
    const visibleCols = requested === 'auto' ? 'auto' : Math.max(1, Math.min(requested, cardEls.length));
    grid.style.gridTemplateColumns = visibleCols === 'auto' ? '' : `repeat(${visibleCols}, minmax(0, 240px))`;
    cardEls.forEach(c => grid.appendChild(c));
    return;
  }

  grid.style.gridTemplateColumns = '';
  const colCount = Math.max(1, Math.min(cardEls.length, cols === 'auto'
    ? Math.floor((grid.clientWidth + MASONRY_GAP) / (MASONRY_MIN_COL_WIDTH + MASONRY_GAP))
    : cols));
  const columns = Array.from({length: colCount}, () => {
    const col = document.createElement('div');
    col.className = 'masonry-col';
    grid.appendChild(col);
    return col;
  });

  // Card height depends only on the chord's fret span (fixed SVG width), not column
  // width, so it's safe to measure once and then bin-pack by running column height.
  cardEls.forEach(c => columns[0].appendChild(c));
  const heights = cardEls.map(c => c.getBoundingClientRect().height);
  const colHeights = new Array(colCount).fill(0);
  cardEls.forEach((c, i) => {
    let target = 0;
    for(let j=1;j<colCount;j++){ if(colHeights[j] < colHeights[target]) target = j; }
    columns[target].appendChild(c);
    colHeights[target] += heights[i] + MASONRY_GAP;
  });
}

// Long names ("Cmaj7add9") overflow the space between the corner buttons on
// narrow cards; shrink each title just enough to fit. Runs after every render,
// on resize (card widths are fluid) and once webfonts land (metrics change).
const TITLE_FONT_MIN = 13;
function fitCardTitles(){
  const heads = Array.from(document.querySelectorAll('#grid .card h2'));
  if(!heads.length) return;
  heads.forEach(h2=>{ if(h2.style.fontSize) h2.style.fontSize = ''; });
  const range = document.createRange();
  const measure = h2=>{
    range.selectNodeContents(h2);
    return range.getBoundingClientRect().width;
  };
  // batch reads apart from writes so each pass costs one reflow
  let pending = heads.map(h2=>{
    const avail = h2.clientWidth;
    const needed = measure(h2);
    return (avail && needed - avail > 0.5)
      ? { h2, avail, needed, size: parseFloat(getComputedStyle(h2).fontSize) }
      : null;
  }).filter(Boolean);
  // Fraunces' optical sizing makes text width slightly nonlinear in font-size,
  // so one proportional step can leave a sliver of overflow — iterate.
  for(let i=0; i<4 && pending.length; i++){
    pending.forEach(job=>{
      job.size = Math.max(TITLE_FONT_MIN, job.size * job.avail / job.needed);
      job.h2.style.fontSize = job.size.toFixed(2) + 'px';
    });
    pending = pending.filter(job=>{
      if(job.size <= TITLE_FONT_MIN) return false;
      job.needed = measure(job.h2);
      return job.needed - job.avail > 0.5;
    });
  }
}

// generate() blocks the main thread long enough (voicing search × chords) that
// running it inside a click handler delays the control's own visual feedback —
// defer it to afterNextPaint. Callers coalesce rapid clicks and key-repeats
// into one rebuild via their pending flag.
let generatePending = false;
function scheduleGenerate(){
  if(generatePending) return;
  generatePending = true;
  afterNextPaint(()=>{
    if(!generatePending) return;
    generatePending = false;
    regenerate();
  });
}

function updateColumnsUI(animateLabel){
  const auto = columnsValue === 'auto';
  document.getElementById('autoColumnsToggle').checked = auto;
  setLabelText(document.getElementById('autoColumnsLabel'), auto ? 'Auto columns' : 'Columns:', animateLabel);
  document.getElementById('columnsReveal').classList.toggle('open', !auto);
  // in auto mode the stepper is collapsed — leave its last value in place so
  // the number doesn't blank out mid slide-away
  if(!auto) document.getElementById('columnsValue').textContent = String(columnsValue);
  document.getElementById('columnsMinus').disabled = auto || columnsValue === COLUMNS_MIN;
  document.getElementById('columnsPlus').disabled = auto || columnsValue === COLUMNS_MAX;
}

function stepColumns(delta){
  if(columnsValue === 'auto') return;
  columnsValue = Math.min(COLUMNS_MAX, Math.max(COLUMNS_MIN, columnsValue + delta));
  updateColumnsUI();
  bumpValue(document.getElementById('columnsValue'));
  scheduleGenerate();
}

// The column count the grid is showing right now. In masonry mode the columns
// are real elements; in even-rows mode the browser resolves the track list,
// so count its non-collapsed tracks. Must be read after layoutCards has run.
function renderedColumnCount(){
  const grid = document.getElementById('grid');
  return grid.classList.contains('masonry')
    ? grid.querySelectorAll('.masonry-col').length
    : getComputedStyle(grid).gridTemplateColumns.split(' ').filter(w => parseFloat(w) > 0).length;
}

// Seeds the stepper when auto columns is switched off, so nothing jumps at
// that moment; clamped to the stepper's range.
function currentRenderedColumns(){
  return Math.min(COLUMNS_MAX, Math.max(COLUMNS_MIN, renderedColumnCount() || COLUMNS_MIN));
}

// Masonry and even rows only differ when some column stacks two or more cards
// of varying height — with few cards or everything on one line the toggle
// would be a dead control, so it hides. Width-dependent: re-run on resize too.
function updateMasonryToggleVisibility(cardCount){
  document.getElementById('masonryWrap').hidden = cardCount < 3 || renderedColumnCount() >= cardCount;
}

function updateThresholdUI(){
  document.getElementById('thresholdValue').textContent = String(shortenThreshold);
  document.getElementById('thresholdMinus').disabled = shortenThreshold === THRESHOLD_MIN;
  document.getElementById('thresholdPlus').disabled = shortenThreshold === THRESHOLD_MAX;
}

function stepThreshold(delta){
  shortenThreshold = Math.min(THRESHOLD_MAX, Math.max(THRESHOLD_MIN, shortenThreshold + delta));
  updateThresholdUI();
  bumpValue(document.getElementById('thresholdValue'));
  scheduleGenerate();
}

function updateChordInputClearUI(){
  const hasValue = document.getElementById('chordInput').value.trim() !== '';
  document.getElementById('chordInputWrap').classList.toggle('has-value', hasValue);
}

// The suggestion pills under the input: a chart opens with a handful of chords,
// and these keep the rest of what it can draw one click away. Rooted on the
// chart's first chord (an empty input starts from C) and rebuilt on every
// generate, so they stay usable as typed. Chords already on the sheet are
// dropped — a pill that changes nothing is noise.
// The tail (diminished, augmented, altered) waits behind the "more" toggle,
// which stays open once opened.
let suggestionsExpanded = false;

function renderChordSuggestions(labels){
  const row = document.getElementById('chordSuggestions');
  const rootMatch = labels.length ? labels[0].match(/^([A-Ga-g])(#|b)?/) : null;
  // a root typed lower case ("eb, ab") still yields pills spelled the usual way
  const root = rootMatch ? rootMatch[1].toUpperCase() + (rootMatch[2] || '') : 'C';
  const present = new Set(labels.map(l => l.toLowerCase()));
  const pills = suggestedChords(root).filter(s => !present.has(s.chord.toLowerCase()));
  row.hidden = !pills.length;
  if(!pills.length){ row.innerHTML = ''; return; }
  const label = labels.length
    ? `More ${formatAccidentals(root)} chords:`
    : `Start with a ${formatAccidentals(root)} chord:`;
  row.classList.toggle('show-all', suggestionsExpanded);
  // pills in their own box: the toggle beyond it keeps the row's right edge
  // whatever the pills do, instead of being shoved along as they appear
  row.innerHTML = `<span class="chord-suggestions-label">${escapeXML(label)}</span>`
    + '<div class="chord-suggestions-pills">'
    + pills.map(s => {
        // the quality spelled out carries the pill for anyone who doesn't read the
        // shorthand, so it names the button rather than sitting in a tooltip alone
        const name = escapeXML(`Add ${s.chord} — ${s.hint}`);
        return `<button type="button" class="chord-suggestion" data-chord="${escapeXML(s.chord)}"`
          + ` title="${name}" aria-label="${name}">${accGlyphsHTML(formatAccidentals(s.chord))}</button>`;
      }).join('')
    + '</div>'
    + moreToggleHTML();
  fitChordSuggestions();
}

// However many pills sit on the first line is the collapsed set — measured with
// them all laid out, so the wrap does the arithmetic. A fixed count would leave
// the row half empty on a wide window and overflow a narrow one.
function fitChordSuggestions(){
  const row = document.getElementById('chordSuggestions');
  if(row.hidden) return;
  const pills = [...row.querySelectorAll('.chord-suggestion')];
  if(!pills.length) return;
  const toggle = row.querySelector('.chord-suggestions-more');
  // shown for the measurement whatever the last fit concluded, so the line it
  // shares with the pills always accounts for the room it takes
  toggle.hidden = false;
  row.classList.add('measuring');
  const firstTop = pills[0].offsetTop;
  // at least one, or a narrow window with a long root would show none at all
  const fits = Math.max(1, pills.filter(p => p.offsetTop === firstTop).length);
  row.classList.remove('measuring');
  pills.forEach((p,i)=>{
    p.classList.toggle('is-extra', i >= fits);
    // --i staggers the reveal, so the extras fan out instead of snapping in
    if(i >= fits) p.style.setProperty('--i', i - fits);
    else p.style.removeProperty('--i');
  });
  toggle.hidden = fits >= pills.length;
  paintMoreToggle(toggle, pills.length - fits);
}

// Painted in place rather than re-rendered: the button is the one the click
// landed on, and replacing it would drop the focus that came with the click.
// The count is the part a narrow screen drops — "more" alone still reads as a
// control, where a bare caret barely registers.
function paintMoreToggle(btn, hidden){
  const name = suggestionsExpanded ? 'Show fewer chord suggestions' : 'Show more chord suggestions';
  btn.setAttribute('aria-expanded', String(suggestionsExpanded));
  btn.setAttribute('aria-label', name);
  btn.title = name;
  btn.querySelector('.chord-suggestions-more-text').innerHTML = suggestionsExpanded
    ? '<span class="btn-text-long">Show </span>fewer'
    : `<span class="btn-text-long">${hidden} </span>more`;
}

function moreToggleHTML(){
  return '<button type="button" class="chord-suggestions-more">'
    + '<span class="chord-suggestions-more-text"></span>'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>'
    + '</button>';
}

function addSuggestedChord(chord){
  const input = document.getElementById('chordInput');
  const kept = input.value.replace(/[\s,]+$/, '');
  input.value = kept ? `${kept}, ${chord}` : chord;
  chordInputIsDefault = false;
  clearActiveSong();
  clearTimeout(chordInputDebounce);
  resizeChordInput();
  generate();
}

function resizeChordInput(){
  const input = document.getElementById('chordInput');
  const styles = getComputedStyle(input);
  const minHeight = parseFloat(styles.minHeight) || 66;
  const maxHeight = parseFloat(styles.maxHeight) || 150;
  input.style.height = 'auto';
  const nextHeight = Math.min(input.scrollHeight, maxHeight);
  input.style.height = `${Math.max(minHeight, nextHeight)}px`;
  input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

const TRANSPOSE_MIN = -11, TRANSPOSE_MAX = 11;
// Transpose rewrites the chord input itself, so the result round-trips through
// share links and localStorage like a hand-typed edit. baseText (the offset-0
// text) is kept so stepping back to 0 restores the original spelling exactly;
// lastValue detects outside edits, which start a fresh baseline.
let transposeState = null; // { baseText, offset, lastValue }

function currentTransposeOffset(){
  return (transposeState && transposeState.lastValue === document.getElementById('chordInput').value)
    ? transposeState.offset : 0;
}

function updateTransposeUI(){
  const offset = currentTransposeOffset();
  const valueEl = document.getElementById('transposeValue');
  valueEl.textContent = offset > 0 ? `+${offset}` : offset < 0 ? `−${-offset}` : '0';
  valueEl.disabled = offset === 0;
  valueEl.title = offset === 0 ? '' : 'Back to the original chords';
  valueEl.setAttribute('aria-label', offset === 0
    ? 'Not transposed'
    : `Transposed ${offset > 0 ? 'up' : 'down'} ${Math.abs(offset)} semitone${Math.abs(offset) === 1 ? '' : 's'} — restore the original chords`);
  const empty = document.getElementById('chordInput').value.trim() === '';
  document.getElementById('transposeMinus').disabled = empty || offset === TRANSPOSE_MIN;
  document.getElementById('transposePlus').disabled = empty || offset === TRANSPOSE_MAX;
}

// Announced via a separate always-enabled region: live updates on the disabled
// value button are unreliable in some screen readers. One region per stepper
// (chords and scales), so the timer lives on the element.
function announceTranspose(statusId, text){
  const statusEl = document.getElementById(statusId);
  statusEl.textContent = text;
  clearTimeout(statusEl._clearTimer);
  // emptying afterwards resets the region's change detection, so repeating the
  // same sentence later (after an edit re-baselined in between) still announces
  statusEl._clearTimer = setTimeout(()=>{ statusEl.textContent = ''; }, 1500);
}

function setTransposeOffset(offset){
  const input = document.getElementById('chordInput');
  if(input.value.trim() === '') return;
  if(!transposeState || transposeState.lastValue !== input.value){
    transposeState = { baseText: input.value, offset: 0, lastValue: input.value };
  }
  const clamped = Math.min(TRANSPOSE_MAX, Math.max(TRANSPOSE_MIN, offset));
  // arrow keys on the stepper bypass the disabled ± buttons at the ±11 bound;
  // a no-op must not re-announce or rebuild
  if(clamped === transposeState.offset) return;
  transposeState.offset = clamped;
  const next = transposeState.offset === 0
    ? transposeState.baseText
    : transposeChordText(transposeState.baseText, transposeState.offset);
  input.value = next;
  transposeState.lastValue = next;
  chordInputIsDefault = false;
  // badge, bump and text update before the deferred rebuild, like the other steppers
  updateTransposeUI();
  bumpValue(document.getElementById('transposeValue'));
  resizeChordInput();
  announceTranspose('transposeStatus', transposeState.offset === 0
    ? 'Restored the original chords'
    : `Transposed ${transposeState.offset > 0 ? 'up' : 'down'} ${Math.abs(transposeState.offset)} semitone${Math.abs(transposeState.offset) === 1 ? '' : 's'}`);
  // a pending debounced generate from typing would only duplicate this one
  clearTimeout(chordInputDebounce);
  scheduleGenerate();
}

function stepTranspose(delta){ setTransposeOffset(currentTransposeOffset() + delta); }

// The ⋯ corner button and the three play triggers (corner ▶, heading click,
// heading Enter/Space), shared by the chord and scale cards.
function appendCardMenuButton(card, label){
  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'card-menu-btn no-print';
  menuBtn.title = `Copy, download or share ${label}`;
  menuBtn.setAttribute('aria-label', `Copy, download or share ${label}`);
  menuBtn.setAttribute('aria-haspopup', 'menu');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.innerHTML = `<span class="card-menu-btn-icon">${DOTS_ICON}</span><span class="card-menu-btn-label"></span>`;
  menuBtn.addEventListener('click', ()=> toggleCardMenu(card, menuBtn));
  card.appendChild(menuBtn);
}

function bindCardPlayHandlers(card, play){
  const heading = card.querySelector('h2');
  heading.addEventListener('click', play);
  heading.addEventListener('keydown', e=>{
    if(e.key==='Enter' || e.key===' '){ e.preventDefault(); play(); }
  });
  card.querySelector('.play-chord-btn').addEventListener('click', e=>{ e.stopPropagation(); play(); });
}

function buildCard(result, ctx){
  const { tuning, colors, highlightRoot, showOmitted, showNoteNames } = ctx;
  const { fretMax, startFret } = computeFretWindow(result.voicings[result.altIndex], shortenThreshold);

  const omitHTML = (showOmitted && result.omitted) ? `<p class="omit-note">${escapeXML(result.omitted.label)} (${escapeXML(result.omitted.note)}) omitted</p>` : '';
  const card = document.createElement('div');
  card.className = 'card';
  card._chordResult = result;
  card.innerHTML = `<div class="chord-title-row"><button type="button" class="play-chord-btn no-print" title="Play ${escapeXML(result.label)} chord" aria-label="Play ${escapeXML(result.label)} chord">${PLAY_ICON}</button><h2 tabindex="0" role="button" aria-label="Play ${escapeXML(result.label)} chord">${accidentalsHTML(result.label)}</h2></div><div class="diagram-slot">${chordSVG(result.label, result.voicings[result.altIndex], fretMax, tuning.labels, colors, tuning.openPCs, result.rootPC, highlightRoot, tuning.openAbs, startFret, showNoteNames)}</div>${omitHTML}`;

  bindNoteDotHandlers(card.querySelector('.diagram-slot'));
  appendCardMenuButton(card, result.label);
  bindCardPlayHandlers(card, ()=> playCardNotes(card, chordAbsNotes(result.voicings[result.altIndex], tuning.openAbs), chordPlayOpts(tuning)));

  if(result.expanded){
    card.classList.add('has-alt-voicings');
    const nav = document.createElement('div');
    nav.className = 'voicing-nav voicing-nav-static';
    nav.innerHTML = `<span class="voicing-nav-count" title="Voicing ${result.altIndex+1} of ${result.voicings.length} for ${escapeXML(result.label)}">${result.altIndex+1} / ${result.voicings.length}</span>`;
    card.appendChild(nav);
  } else if(result.voicings.length > 1){
    card.classList.add('has-alt-voicings');
    const nav = document.createElement('div');
    nav.className = 'voicing-nav no-print';
    nav.innerHTML = `<button type="button" class="voicing-nav-btn voicing-prev" title="Previous voicing" aria-label="Previous voicing for ${escapeXML(result.label)}">${CHEVRON_LEFT}</button><button type="button" class="voicing-nav-count" title="See all voicings and pick one" aria-label="See all voicings of ${escapeXML(result.label)} and pick one"></button><button type="button" class="voicing-nav-btn voicing-next" title="Next voicing" aria-label="Next voicing for ${escapeXML(result.label)}">${CHEVRON_RIGHT}</button>`;
    card.appendChild(nav);
    const cycleVoicing = delta=>{
      const n = result.voicings.length;
      result.altIndex = (result.altIndex + delta + n) % n;
      updateCardDiagram(card, result, tuning, colors, highlightRoot, delta, showNoteNames);
    };
    nav.querySelector('.voicing-prev').addEventListener('click', ()=> cycleVoicing(-1));
    nav.querySelector('.voicing-next').addEventListener('click', ()=> cycleVoicing(1));
    const countBtn = nav.querySelector('.voicing-nav-count');
    countBtn.addEventListener('click', ()=> openVoicingChooser(card, result, countBtn));
    updateNavCount(card, result);
  }

  return card;
}

function generate(){
  updateChordInputClearUI();
  updateTransposeUI();
  // the chooser points at cards that are about to be replaced; re-bind it to the
  // rebuilt card afterwards so settings changed from inside it apply live
  const chooserLabel = voicingChooserState ? voicingChooserState.result.label : null;
  closeCardMenu();
  const tuning = currentTuning();
  document.getElementById('pageTitleMain').textContent = `${tuning.name} chords`;
  document.getElementById('pageTitleSub').innerHTML = accGlyphsHTML(`${formatAccidentals(tuning.tuningLabel)} tuning`);

  const raw = document.getElementById('chordInput').value;
  const tokens = raw.split(/[,\n]+/).map(t=>t.trim()).filter(Boolean);
  const errorBox = document.getElementById('errorBox');
  const errors = [];
  const results = [];
  const cardEls = [];

  // remember the voicing each chord currently shows, so regenerating (settings
  // changes, input edits) doesn't reset a selected alternative
  const prevShown = new Map();
  document.querySelectorAll('#grid .card').forEach(card=>{
    const r = card._chordResult;
    if(r && !r.expanded) prevShown.set(r.label, r.voicings[r.altIndex]);
  });

  const allowMuted = document.getElementById('voicingModalMuted').checked;
  tokens.forEach(tok=>{
    const parsed = parseChord(tok);
    if(parsed.error){ errors.push(parsed.error); return; }
    const voicings = findVoicings(parsed.requiredPCs, parsed.bassPC, tuning, maxFretValue, maxSpanValue, MAX_VOICINGS, allowMuted);
    if(!voicings.length){ errors.push(`No practical voicing found for "${tok}"`); return; }
    // re-select the same frets if they still exist in the new voicing list;
    // fall back to the best voicing when they don't (new tuning, lower max fret)
    const pref = prevShown.get(parsed.label);
    let altIndex = 0;
    if(pref){
      const idx = voicings.findIndex(v => v.every((f,i)=> f === pref[i]));
      if(idx >= 0) altIndex = idx;
    }
    results.push({ label: parsed.label, showAll: parsed.showAll, requiredPCs: parsed.requiredPCs, bassPC: parsed.bassPC, voicings, altIndex, rootPC: parsed.rootPC, omitted: parsed.omitted });
  });

  errorBox.textContent = errors.join('  ·  ');
  renderChordSuggestions(results.map(r => r.label));
  updateReverseSearchBtn(results.map(r => r.label));
  const countLabel = `${results.length} ${results.length === 1 ? 'chord' : 'chords'}`;
  document.getElementById('resultsCount').textContent = countLabel;
  document.getElementById('resultsContext').textContent = errors.length
    ? `${errors.length} ${errors.length === 1 ? 'entry needs' : 'entries need'} attention`
    : 'ready to hear, share or print';
  const colors = currentColors();
  const highlightRoot = document.getElementById('rootToggle').checked;
  const showNoteNames = document.getElementById('noteNamesToggle').checked;
  const showOmitted = document.getElementById('omitToggle').checked;

  // live example in the crop-above-fret popover, re-rendered here so it always
  // matches the current tuning and color scheme
  const exampleEl = document.getElementById('thresholdExample');
  if(exampleEl){
    const exFrets = [5,5,5,5];
    exampleEl.innerHTML =
      `<figure><figcaption>set to 5</figcaption>${chordSVG('Example: not cropped', exFrets, 5, tuning.labels, colors, tuning.openPCs, null, false, undefined, 0, showNoteNames)}</figure>` +
      `<figure><figcaption>set to 4</figcaption>${chordSVG('Example: cropped', exFrets, 5, tuning.labels, colors, tuning.openPCs, null, false, undefined, 3, showNoteNames)}</figure>`;
  }

  const ctx = { tuning, colors, highlightRoot, showOmitted, showNoteNames };
  results.forEach(result=>{
    if(result.showAll){
      // one tile per voicing; each clone carries its own altIndex so the
      // per-card actions (copy, play) reuse the single-voicing code unchanged
      result.voicings.forEach((_, i)=>{
        cardEls.push(buildCard(Object.assign({}, result, { altIndex:i, expanded:true }), ctx));
      });
    } else {
      cardEls.push(buildCard(result, ctx));
    }
  });

  currentCardEls = cardEls;
  layoutCards(cardEls);
  updateMasonryToggleVisibility(cardEls.length);
  fitCardTitles();
  if(!cardEls.length && !errors.length){
    document.getElementById('grid').innerHTML = '<p class="empty-hint">Enter chord names above to see charts.</p>';
  }
  // with a single chord on the sheet, point at the *-expansion of this page
  const singleTip = document.getElementById('singleChordTip');
  const only = (results.length === 1 && !results[0].showAll && results[0].voicings.length > 1) ? results[0] : null;
  singleTip.hidden = !only;
  singleTip.textContent = '';
  if(only){
    const link = document.createElement('a');
    link.href = chordPageURL(only.label, true);
    link.textContent = `Show all ${only.voicings.length} voicings of ${only.label} on this page`;
    link.addEventListener('click', e=>{
      e.preventDefault();
      setChordExpanded(only.label, true);
    });
    singleTip.appendChild(link);
  }
  if(chooserLabel){
    const newCard = cardEls.find(c => c._chordResult.label === chooserLabel && !c._chordResult.expanded);
    if(newCard) openVoicingChooser(newCard, newCard._chordResult, newCard.querySelector('button.voicing-nav-count'));
    else closeVoicingChooser({ restoreFocus:false });
  }
  saveSettings();
  updateURLParam(raw);
}

// Expanded/collapsed is expressed in the chord input itself (a trailing "*"),
// so the state round-trips through ?chords= links and localStorage for free.
function setChordExpanded(label, expanded){
  const input = document.getElementById('chordInput');
  const parts = input.value.split(/([,\n]+)/);
  for(let i=0; i<parts.length; i+=2){
    const trimmed = parts[i].trim();
    if(trimmed === '') continue;
    const hasStar = /\*$/.test(trimmed);
    const bare = hasStar ? trimmed.slice(0,-1).trim() : trimmed;
    if(bare !== label || hasStar === expanded) continue;
    const lead = parts[i].match(/^\s*/)[0];
    const trail = parts[i].match(/\s*$/)[0];
    parts[i] = lead + bare + (expanded ? '*' : '') + trail;
    input.value = parts.join('');
    chordInputIsDefault = false;
    generate();
    return;
  }
}

const voicingModalEl = document.getElementById('voicingModal');
const voicingModalTitleEl = document.getElementById('voicingModalTitle');
const voicingModalGridEl = document.getElementById('voicingModalGrid');
let voicingChooserState = null;
// The chooser's fret, stretch and muted controls ARE the sheet-wide voicing
// search settings — changing them regenerates the whole chart. Only the
// masonry toggle is the chooser's own (it arranges just this modal's tiles).

// shared by the voicing chooser (sheet-wide settings) and the custom-chord
// modal below (its own independent search settings)
function syncFretSpanControls(prefix, maxFretVal, maxSpanVal){
  [
    [prefix + 'MaxFret', maxFretVal, MAX_FRET_MIN, MAX_FRET_MAX],
    [prefix + 'MaxSpan', maxSpanVal, MAX_SPAN_MIN, MAX_SPAN_MAX],
  ].forEach(([base, value, min, max])=>{
    const valEl = document.getElementById(base + 'Value');
    const newText = String(value);
    if(valEl.textContent !== '' && valEl.textContent !== newText){
      valEl.textContent = newText;
      bumpValue(valEl);
    } else {
      valEl.textContent = newText;
    }
    document.getElementById(base + 'Minus').disabled = value === min;
    document.getElementById(base + 'Plus').disabled = value === max;
  });
}
function syncVoicingModalControls(){
  syncFretSpanControls('voicingModal', maxFretValue, maxSpanValue);
}

// same bin-packing as layoutCards; equal-width flex columns mean heights can
// be measured while everything still sits in the first column
function layoutMasonryTiles(gridEl, tiles){
  const GAP = 10, MIN_TILE_W = 124;
  const contentW = gridEl.clientWidth - 36;
  const colCount = Math.max(1, Math.floor((contentW + GAP) / (MIN_TILE_W + GAP)));
  const columns = Array.from({length: colCount}, ()=>{
    const col = document.createElement('div');
    col.className = 'masonry-col';
    gridEl.appendChild(col);
    return col;
  });
  tiles.forEach(t=> columns[0].appendChild(t));
  const heights = tiles.map(t=> t.getBoundingClientRect().height);
  const colHeights = new Array(colCount).fill(0);
  tiles.forEach((t, i)=>{
    let target = 0;
    for(let j=1; j<colCount; j++){ if(colHeights[j] < colHeights[target]) target = j; }
    columns[target].appendChild(t);
    colHeights[target] += heights[i] + GAP;
  });
}

function renderVoicingTiles(card, result){
  const tuning = currentTuning();
  const colors = currentColors();
  const highlightRoot = document.getElementById('rootToggle').checked;
  const showNoteNames = document.getElementById('noteNamesToggle').checked;
  const masonry = document.getElementById('voicingModalMasonry').checked;
  const allowMuted = document.getElementById('voicingModalMuted').checked;
  const voicings = findVoicings(result.requiredPCs, result.bassPC, tuning, maxFretValue, maxSpanValue, MAX_VOICINGS, allowMuted);
  voicingModalTitleEl.textContent = `${result.label} — ${voicings.length} voicing${voicings.length === 1 ? '' : 's'}`;
  const currentFrets = result.voicings[result.altIndex];
  const scrollTop = voicingModalGridEl.scrollTop;
  voicingModalGridEl.innerHTML = '';
  voicingModalGridEl.classList.toggle('masonry', masonry);

  if(!voicings.length){
    voicingModalGridEl.innerHTML = `<p class="empty-hint">No voicings found up to fret ${maxFretValue} — raise “Search up to fret” or “Max stretch” above.</p>`;
    return;
  }

  const tiles = voicings.map((frets, i)=>{
    const { fretMax, startFret } = computeFretWindow(frets, shortenThreshold);
    const isCurrent = frets.every((f,j)=> f === currentFrets[j]);
    // play button is a sibling of the tile button (nesting would be invalid),
    // overlaid on its corner via the wrapper
    const wrap = document.createElement('div');
    wrap.className = 'voicing-choice-wrap';
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'voicing-choice' + (isCurrent ? ' selected' : '');
    tile.setAttribute('aria-label', `Use voicing ${i+1} of ${voicings.length} for ${result.label}${isCurrent ? ' (current)' : ''}`);
    // no openAbs: per-note dots would nest interactive elements inside the button
    tile.innerHTML = `<span class="voicing-choice-index">${i+1}</span>` + chordSVG(result.label, frets, fretMax, tuning.labels, colors, tuning.openPCs, result.rootPC, highlightRoot, undefined, startFret, showNoteNames);
    tile.addEventListener('click', ()=>{
      const prevIndex = result.altIndex;
      // same search settings as the sheet, so the pick always exists in the card's list
      const idx = result.voicings.findIndex(v => v.every((f,j)=> f === frets[j]));
      if(idx >= 0) result.altIndex = idx;
      updateCardDiagram(card, result, tuning, colors, highlightRoot, Math.sign(result.altIndex - prevIndex), showNoteNames);
      playCardNotes(card, chordAbsNotes(frets, tuning.openAbs), chordPlayOpts(tuning));
      closeVoicingChooser();
    });
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'voicing-choice-play';
    playBtn.title = 'Play this voicing';
    playBtn.setAttribute('aria-label', `Play voicing ${i+1} of ${voicings.length} for ${result.label}`);
    playBtn.innerHTML = PLAY_ICON;
    playBtn.addEventListener('click', ()=> playChordAndFlash(playBtn, chordAbsNotes(frets, tuning.openAbs), chordPlayOpts(tuning)));
    wrap.appendChild(tile);
    wrap.appendChild(playBtn);
    return wrap;
  });

  if(!masonry){
    tiles.forEach(t=> voicingModalGridEl.appendChild(t));
  } else {
    layoutMasonryTiles(voicingModalGridEl, tiles);
  }
  voicingModalGridEl.scrollTop = scrollTop;
}

// The link opens a fresh sheet holding only this chord with the "*" suffix, so
// every voicing gets its own tile there; being a real <a> it can also be
// copied/shared via the browser's context menu.
function syncVoicingModalOpenAll(result){
  const starred = result.label + '*';
  const params = new URLSearchParams(window.location.search);
  params.set('chords', starred);
  params.set('tuning', selectedTuningId);
  const link = document.getElementById('voicingModalOpenAll');
  link.href = window.location.pathname + '?' + params.toString();
  link.title = `Lay out every voicing of ${result.label} as its own tile on a new sheet`;
  const labelEl = document.getElementById('voicingModalOpenAllLabel');
  labelEl.textContent = '';
  const code = document.createElement('code');
  code.textContent = starred;
  labelEl.append('Open ', code, ' in a new tab');
}

const voicingModal = createModal(voicingModalEl);

function openVoicingChooser(card, result, opener){
  voicingChooserState = { card, result };
  // opening first: tiles must be visible before masonry can measure heights
  const fresh = voicingModal.open(opener);
  syncVoicingModalControls();
  syncVoicingModalOpenAll(result);
  renderVoicingTiles(card, result);
  if(fresh){
    const focusTarget = voicingModalGridEl.querySelector('.voicing-choice.selected') || voicingModalGridEl.querySelector('.voicing-choice');
    if(focusTarget) focusTarget.focus();
  }
}

function closeVoicingChooser(opts){
  voicingChooserState = null;
  voicingModal.close(opts);
}
document.getElementById('voicingModalClose').addEventListener('click', ()=> closeVoicingChooser());
function updateChooserMasonryLabel(animate){
  setLabelText(document.getElementById('voicingModalMasonryLabel'),
    document.getElementById('voicingModalMasonry').checked ? 'Masonry layout' : 'Table layout', animate);
}
document.getElementById('voicingModalMasonry').addEventListener('change', ()=>{
  updateChooserMasonryLabel(true);
  // the two layouts pack the same tiles to different heights; ease the dialog
  // between them instead of letting it jump under the pointer
  if(voicingChooserState){
    animateHeightSwap(voicingModalGridEl, ()=>
      renderVoicingTiles(voicingChooserState.card, voicingChooserState.result));
  }
  saveSettings();
});
// sheet-wide settings: regenerate the chart, which re-opens the chooser on the
// rebuilt card (see generate()) and so re-renders the tiles too
document.getElementById('voicingModalMuted').addEventListener('change', generate);

function stepMaxFret(delta){
  maxFretValue = Math.min(MAX_FRET_MAX, Math.max(MAX_FRET_MIN, maxFretValue + delta));
  syncVoicingModalControls();
  scheduleGenerate();
}
function stepMaxSpan(delta){
  maxSpanValue = Math.min(MAX_SPAN_MAX, Math.max(MAX_SPAN_MIN, maxSpanValue + delta));
  syncVoicingModalControls();
  scheduleGenerate();
}
initStepper('voicingModalMaxFret', stepMaxFret);
initStepper('voicingModalMaxSpan', stepMaxSpan);

// --- Scales mode: one scale at a time, drawn as a position box up the neck.
// Mirrors the chord pipeline piece by piece: generateScale() is the render
// loop, the scale card wears the chord card's clothes, the position nav is the
// voicing nav, and the position chooser is the voicing chooser.
const scaleInputEl = document.getElementById('scaleInput');
const scaleSuggestMenuEl = document.getElementById('scaleSuggestMenu');
const positionModalGridEl = document.getElementById('positionModalGrid');
const positionModalTitleEl = document.getElementById('positionModalTitle');

// The shown position survives re-renders (options toggles, note names) while
// the scale and tuning stay the same — the chord cards' remembered voicings.
let scaleState = null;
let scaleInputDebounce = null;

// Which drawing of the scale the sheet carries: one position box up the neck,
// or the whole neck at once. The neck is a single picture, so it rides the
// position pipeline as a one-entry list — and leaves the remembered box index
// untouched, so switching views and back lands on the box you left.
let scaleView = 'position';
function isNeckView(){ return scaleView === 'neck'; }
function currentPosIndex(){ return isNeckView() ? 0 : scaleState.posIndex; }

function setScaleView(view, opts){
  scaleView = view === 'neck' ? 'neck' : 'position';
  document.body.classList.toggle('neck-view', isNeckView());
  [['scaleViewBox', 'position'], ['scaleViewNeck', 'neck']].forEach(([id, v])=>{
    const btn = document.getElementById(id);
    btn.setAttribute('aria-checked', String(scaleView === v));
    btn.tabIndex = scaleView === v ? 0 : -1;
  });
  if(opts && opts.silent) return;
  // A view is a switch too: the box and the neck are differently sized pictures
  // of the same scale, so the sheet eases between them instead of jumping.
  const grid = document.getElementById('grid');
  animateHeightSwap(grid, generateScale, { clip:true, duration:300 });
  playAnimation(grid, 'switch-in');
}

function updateScaleInputClearUI(){
  document.getElementById('scaleInputWrap').classList.toggle('has-value', scaleInputEl.value.trim() !== '');
}

// The chords transpose control's twin: rewrites the scale's root in the input,
// baselining and re-baselining the same way. Unlike chords — where non-chord
// tokens pass through — a text that doesn't parse as a scale has no root to
// shift, so the buttons disable instead.
let scaleTransposeState = null; // { baseText, offset, lastValue }

function currentScaleTransposeOffset(){
  return (scaleTransposeState && scaleTransposeState.lastValue === scaleInputEl.value)
    ? scaleTransposeState.offset : 0;
}

function updateScaleTransposeUI(){
  const offset = currentScaleTransposeOffset();
  const valueEl = document.getElementById('scaleTransposeValue');
  valueEl.textContent = offset > 0 ? `+${offset}` : offset < 0 ? `−${-offset}` : '0';
  valueEl.disabled = offset === 0;
  valueEl.title = offset === 0 ? '' : 'Back to the original scale';
  valueEl.setAttribute('aria-label', offset === 0
    ? 'Not transposed'
    : `Transposed ${offset > 0 ? 'up' : 'down'} ${Math.abs(offset)} semitone${Math.abs(offset) === 1 ? '' : 's'} — restore the original scale`);
  const unusable = !parseScale(scaleInputEl.value);
  document.getElementById('scaleTransposeMinus').disabled = unusable || offset === TRANSPOSE_MIN;
  document.getElementById('scaleTransposePlus').disabled = unusable || offset === TRANSPOSE_MAX;
}

function setScaleTransposeOffset(offset){
  if(!parseScale(scaleInputEl.value)) return;
  if(!scaleTransposeState || scaleTransposeState.lastValue !== scaleInputEl.value){
    scaleTransposeState = { baseText: scaleInputEl.value, offset: 0, lastValue: scaleInputEl.value };
  }
  const clamped = Math.min(TRANSPOSE_MAX, Math.max(TRANSPOSE_MIN, offset));
  // arrow keys on the stepper bypass the disabled ± buttons at the ±11 bound;
  // a no-op must not re-announce or rebuild
  if(clamped === scaleTransposeState.offset) return;
  scaleTransposeState.offset = clamped;
  const next = scaleTransposeState.offset === 0
    ? scaleTransposeState.baseText
    : transposeScaleText(scaleTransposeState.baseText, scaleTransposeState.offset);
  scaleInputEl.value = next;
  scaleTransposeState.lastValue = next;
  scaleInputIsDefault = false;
  updateScaleTransposeUI();
  bumpValue(document.getElementById('scaleTransposeValue'));
  announceTranspose('scaleTransposeStatus', scaleTransposeState.offset === 0
    ? 'Restored the original scale'
    : `Transposed ${scaleTransposeState.offset > 0 ? 'up' : 'down'} ${Math.abs(scaleTransposeState.offset)} semitone${Math.abs(scaleTransposeState.offset) === 1 ? '' : 's'}`);
  // a pending debounced generate from typing would only duplicate this one
  clearTimeout(scaleInputDebounce);
  generateScale();
}

function stepScaleTranspose(delta){ setScaleTransposeOffset(currentScaleTransposeOffset() + delta); }

function packScaleInput(value){
  return String(value).trim().replace(/\s+/g, ' ');
}

// The position box is the default drawing, so only the neck names itself in a
// link — and every scale link says which of the two it was copied from.
function applyScaleViewParam(params){
  if(isNeckView()) params.set('view', 'neck');
  else params.delete('view');
  return params;
}

function scalePageParams(){
  const params = new URLSearchParams(window.location.search);
  [...CHART_PARAMS, ...MODAL_PARAMS].forEach(p=>params.delete(p));
  params.set('scale', packScaleInput(scaleInputEl.value));
  params.set('tuning', selectedTuningId);
  return applyScaleViewParam(params);
}

function updateScaleURLParam(){
  const params = new URLSearchParams(window.location.search);
  CHART_PARAMS.forEach(p=>params.delete(p));
  const packed = packScaleInput(scaleInputEl.value);
  if(packed){ params.set('scale', packed); }
  applyScaleViewParam(params);
  params.set('tuning', selectedTuningId);
  const query = readableQuery(params);
  history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
}

function scaleDiagramHTML(parsed, pos, noteNames, tuning, colors, highlightRoot, showNoteNames, interactive){
  const openAbs = interactive ? tuning.openAbs : undefined;
  if(isNeckView()){
    return neckSVG(parsed.label, pos.strings, pos.endFret, tuning.labels, colors, tuning.openPCs, parsed.rootPC,
      highlightRoot, openAbs, showNoteNames, noteNames, parsed.blueNotePC);
  }
  return scaleSVG(parsed.label, pos.strings, pos.endFret, tuning.labels, colors, tuning.openPCs, parsed.rootPC,
    highlightRoot, openAbs, positionStartFret(pos), showNoteNames, noteNames, parsed.blueNotePC);
}

function positionCaption(pos){
  return pos.startFret === 0 ? 'Open position' : `Frets ${pos.startFret}–${pos.endFret}`;
}

function simplifyAccidentals(){
  return document.getElementById('simplifyAccidentalsToggle').checked;
}

function scaleNotesLine(parsed){
  const spelled = spellScale(parsed.rootName, parsed.type, simplifyAccidentals());
  return spelled ? spelled.map(formatAccidentals).join(' · ') : '';
}

function updateScaleNavCount(card){
  const countEl = card.querySelector('.voicing-nav-count');
  if(countEl) countEl.textContent = `${currentPosIndex()+1} / ${card._scaleResult.positions.length}`;
}

function updateScaleCardDiagram(card, slideDir){
  const { parsed, positions, noteNames } = card._scaleResult;
  const pos = positions[currentPosIndex()];
  const html = scaleDiagramHTML(parsed, pos, noteNames, currentTuning(), currentColors(),
    document.getElementById('rootToggle').checked, document.getElementById('noteNamesToggle').checked, true);
  swapDiagramHTML(card.querySelector('.diagram-slot'), html, slideDir);
  updateScaleNavCount(card);
}

function buildScaleCard(parsed, positions, noteNames){
  const card = document.createElement('div');
  card.className = 'card scale-card' + (isNeckView() ? ' neck-card' : '');
  card._scaleResult = { parsed, positions, noteNames };
  card.innerHTML = `<div class="chord-title-row"><button type="button" class="play-chord-btn no-print" title="Play the ${escapeXML(parsed.label)} scale up and down" aria-label="Play the ${escapeXML(parsed.label)} scale up and down">${PLAY_ICON}</button><h2 tabindex="0" role="button" aria-label="Play the ${escapeXML(parsed.label)} scale up and down">${accidentalsHTML(parsed.label)}</h2></div><div class="diagram-slot"></div><p class="scale-notes"></p>`;
  card.querySelector('.scale-notes').innerHTML = accGlyphsHTML(scaleNotesLine(parsed));

  appendCardMenuButton(card, parsed.label);
  // always the up-and-down practice run — a scale strummed at once says nothing
  bindCardPlayHandlers(card, ()=> playCardNotes(card, positionPlaybackMidis(positions[currentPosIndex()]), { arpeggio:true }));

  if(positions.length > 1){
    card.classList.add('has-alt-voicings');
    const nav = document.createElement('div');
    nav.className = 'voicing-nav no-print';
    nav.innerHTML = `<button type="button" class="voicing-nav-btn voicing-prev" title="Previous position" aria-label="Previous position of the ${escapeXML(parsed.label)} scale">${CHEVRON_LEFT}</button><button type="button" class="voicing-nav-count" title="See all positions and pick one" aria-label="See all positions of the ${escapeXML(parsed.label)} scale and pick one"></button><button type="button" class="voicing-nav-btn voicing-next" title="Next position (higher up the neck)" aria-label="Next position of the ${escapeXML(parsed.label)} scale">${CHEVRON_RIGHT}</button>`;
    card.appendChild(nav);
    const cyclePosition = delta=>{
      const n = positions.length;
      scaleState.posIndex = (scaleState.posIndex + delta + n) % n;
      updateScaleCardDiagram(card, delta);
    };
    nav.querySelector('.voicing-prev').addEventListener('click', ()=> cyclePosition(-1));
    nav.querySelector('.voicing-next').addEventListener('click', ()=> cyclePosition(1));
    const countBtn = nav.querySelector('.voicing-nav-count');
    countBtn.addEventListener('click', ()=> openPositionChooser(card, countBtn));
  }

  updateScaleCardDiagram(card);
  return card;
}

function scaleTileSVGString(card, pos, run){
  const { parsed, noteNames } = card._scaleResult;
  const tuning = currentTuning();
  const colors = currentColors();
  const sourceURL = new URL(window.location.pathname + '?' + readableQuery(scalePageParams()), window.location.href).href;
  const showBorder = document.getElementById('borderToggle').checked;
  const highlightRoot = document.getElementById('rootToggle').checked;
  const showNoteNames = document.getElementById('noteNamesToggle').checked;
  if(isNeckView()){
    return exportNeckTileSVG(formatAccidentals(parsed.label), pos.strings, pos.endFret, tuning.labels, colors,
      showBorder, tuning.openPCs, parsed.rootPC, highlightRoot, scaleNotesLine(parsed), sourceURL, showNoteNames, noteNames, parsed.blueNotePC, run);
  }
  return exportScaleTileSVG(formatAccidentals(parsed.label), pos.strings, pos.endFret, tuning.labels, colors,
    showBorder, tuning.openPCs, parsed.rootPC, highlightRoot, positionStartFret(pos), scaleNotesLine(parsed), sourceURL, showNoteNames, noteNames, parsed.blueNotePC, run);
}

// Everything a file is made of, settled at the click. The sheet stays live
// while a recording plays out — several seconds with the position arrows right
// there on the card — and reading the card afresh for each frame would swap the
// picture out from under sound already committed to the run.
function settleScaleTile(card){
  const index = currentPosIndex();
  const pos = card._scaleResult.positions[index];
  const openAbs = currentTuning().openAbs;
  const { parsed } = card._scaleResult;
  return {
    svg: run=> scaleTileSVGString(card, pos, run),
    run: playbackRun(positionPlaces(pos, openAbs), positionPlaybackMidis(pos), { arpeggio:true }),
    base: chordFileBase(`${parsed.label} ${isNeckView() ? 'whole neck' : `position ${index+1}`}`),
  };
}

function openScaleCardMenu(card, btn){
  const menu = ensureCardMenu();
  closeCardMenu();
  const { parsed } = card._scaleResult;
  menu.innerHTML = '';
  menu.setAttribute('aria-label', `Actions for ${parsed.label}`);

  const addAction = addCardMenuAction.bind(null, menu);

  addAction(COPY_ICON, 'Copy image', ()=>{
    const tile = settleScaleTile(card);
    copyTileImage(tile.svg(), `${tile.base}.png`, btn);
  });
  addAction(DOWNLOAD_ICON, 'Download PNG', ()=>{
    const tile = settleScaleTile(card);
    downloadTilePNG(tile.svg(), `${tile.base}.png`, btn);
  });
  addAction(DOWNLOAD_ICON, 'Download SVG', ()=>{
    const tile = settleScaleTile(card);
    downloadTileSVG(tile.svg(), `${tile.base}.svg`, btn);
  });
  menu.appendChild(Object.assign(document.createElement('hr'), { className:'card-menu-sep' }));
  addAction(DOWNLOAD_ICON, 'Download animated SVG', ()=>{
    const tile = settleScaleTile(card);
    downloadTileSVG(tile.svg(tile.run), `${tile.base}_animated.svg`, btn);
  });
  addAction(DOWNLOAD_ICON, 'Download video', ()=>{
    const tile = settleScaleTile(card);
    downloadTileVideo(tile.svg, tile.run, `${tile.base}_animated`, btn);
  });
  menu.appendChild(Object.assign(document.createElement('hr'), { className:'card-menu-sep' }));
  addAction(LINK_ICON, 'Copy link to this scale', async ()=>{
    flashButton(btn, await copyLinkText(shareLinkFor(scalePageParams())));
  });

  presentCardMenu(menu, btn);
}

const positionModal = createModal(document.getElementById('positionModal'));

function renderPositionTiles(card){
  const { parsed, positions, noteNames } = card._scaleResult;
  const tuning = currentTuning();
  const colors = currentColors();
  const highlightRoot = document.getElementById('rootToggle').checked;
  const showNoteNames = document.getElementById('noteNamesToggle').checked;
  positionModalTitleEl.innerHTML = accGlyphsHTML(`${formatAccidentals(parsed.label)} — ${positions.length} position${positions.length === 1 ? '' : 's'}`);
  positionModalGridEl.innerHTML = '';

  const tiles = positions.map((pos, i)=>{
    const isCurrent = i === currentPosIndex();
    const wrap = document.createElement('div');
    wrap.className = 'voicing-choice-wrap';
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'voicing-choice' + (isCurrent ? ' selected' : '');
    tile.setAttribute('aria-label', `Use position ${i+1} of ${positions.length} (${positionCaption(pos)})${isCurrent ? ' (current)' : ''}`);
    // no openAbs: per-note dots would nest interactive elements inside the button
    tile.innerHTML = `<span class="voicing-choice-index">${i+1}</span>`
      + scaleDiagramHTML(parsed, pos, noteNames, tuning, colors, highlightRoot, showNoteNames, false)
      + `<span class="position-caption">${positionCaption(pos)}</span>`;
    tile.addEventListener('click', ()=>{
      const prevIndex = currentPosIndex();
      scaleState.posIndex = i;
      updateScaleCardDiagram(card, Math.sign(i - prevIndex));
      playCardNotes(card, positionPlaybackMidis(pos), { arpeggio:true });
      positionModal.close();
    });
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'voicing-choice-play';
    playBtn.title = 'Play this position';
    playBtn.setAttribute('aria-label', `Play position ${i+1} of ${positions.length}`);
    playBtn.innerHTML = PLAY_ICON;
    playBtn.addEventListener('click', ()=> playChordAndFlash(playBtn, positionPlaybackMidis(pos), { arpeggio:true }));
    wrap.appendChild(tile);
    wrap.appendChild(playBtn);
    return wrap;
  });

  tiles.forEach(t=> positionModalGridEl.appendChild(t));
}

function openPositionChooser(card, opener){
  const fresh = positionModal.open(opener);
  renderPositionTiles(card);
  if(fresh){
    const focusTarget = positionModalGridEl.querySelector('.voicing-choice.selected') || positionModalGridEl.querySelector('.voicing-choice');
    if(focusTarget) focusTarget.focus();
  }
}
document.getElementById('positionModalClose').addEventListener('click', ()=> positionModal.close());

function generateScale(){
  updateScaleInputClearUI();
  updateScaleTransposeUI();
  closeCardMenu();
  const tuning = currentTuning();
  document.getElementById('pageTitleMain').textContent = `${tuning.name} scales`;
  document.getElementById('pageTitleSub').innerHTML = accGlyphsHTML(`${formatAccidentals(tuning.tuningLabel)} tuning`);

  const raw = scaleInputEl.value;
  const errorBox = document.getElementById('errorBox');
  const grid = document.getElementById('grid');
  resetGridLayout();

  const parsed = raw.trim() ? parseScale(raw) : null;
  if(!parsed){
    // an open completion menu means the name is still being typed — offering
    // suggestions and calling the input unreadable at once would be noise
    const midEntry = !scaleSuggestMenuEl.hidden;
    errorBox.textContent = (raw.trim() && !midEntry)
      ? `Could not read "${raw.trim()}" as a scale — try "A minor pentatonic"${/[,\n]/.test(raw) ? ', one scale at a time' : ''}.`
      : '';
    grid.innerHTML = '<p class="empty-hint">Type a scale above — its positions along the neck appear here.</p>';
    document.getElementById('resultsCount').textContent = 'Scale chart';
    document.getElementById('resultsContext').textContent = 'updates as you type';
    positionModal.close({ restoreFocus:false });
    saveSettings();
    updateScaleURLParam();
    return;
  }
  errorBox.textContent = '';

  const rootRun = document.getElementById('rootRunToggle').checked;
  const rootPC = rootRun ? parsed.rootPC : null;
  // the whole neck is one picture, so it enters the position pipeline as a
  // single-entry list — nav, chooser and captions fall away on their own
  const positions = isNeckView()
    ? [scaleNeck(parsed.pcs, tuning, undefined, rootPC)].filter(neck => neck.midis.length)
    : scalePositions(parsed.pcs, tuning, undefined, rootPC);
  if(!positions.length){
    // root-run only: the root can be out of reach, or its octave too far for
    // one box — a tuning spanning less than an octave never runs root to root
    grid.innerHTML = `<p class="empty-hint">${isNeckView()
      ? `This scale never reaches a second root within ${MAX_FRET_DEFAULT} frets on this tuning — switch off “Start and end at the root” to see every note.`
      : `No box on this tuning runs root to root within ${MAX_FRET_DEFAULT} frets — switch off “Start and end at the root” to see every position.`}</p>`;
    document.getElementById('resultsCount').innerHTML = accGlyphsHTML(formatAccidentals(parsed.label));
    document.getElementById('resultsContext').textContent = 'no root-to-root position';
    positionModal.close({ restoreFocus:false });
    saveSettings();
    updateScaleURLParam();
    return;
  }
  const noteNames = scaleNoteNames(parsed.rootName, parsed.type, simplifyAccidentals());
  // same scale on the same instrument: stay in the chosen position. The neck
  // has none to choose, and leaves the remembered one as it found it.
  const key = `${parsed.label}::${tuning.id}`;
  const remembered = (scaleState && scaleState.key === key) ? scaleState.posIndex : 0;
  scaleState = { key, posIndex: isNeckView() ? remembered : Math.min(remembered, positions.length - 1) };

  const card = buildScaleCard(parsed, positions, noteNames);
  grid.innerHTML = '';
  grid.appendChild(card);
  fitCardTitles();

  document.getElementById('resultsCount').innerHTML = accGlyphsHTML(formatAccidentals(parsed.label));
  // the neck's count is the dots on it: the same pitch played in several places
  // is several notes to find, which is the whole point of the map
  const dots = positions[0].strings.reduce((n, frets)=> n + frets.length, 0);
  document.getElementById('resultsContext').textContent =
    (isNeckView()
      ? `${dots} note${dots === 1 ? '' : 's'} up the neck`
      : `${positions.length} position${positions.length === 1 ? '' : 's'} up the neck`)
    + (parsed.hadRoot ? '' : ' — root defaulted to C');

  // the chooser points at the card that was just replaced; re-bind it — unless
  // the neck took over, which has no positions to choose between
  if(positionModal.isOpen()){
    if(isNeckView()) positionModal.close({ restoreFocus:false });
    else renderPositionTiles(card);
  }
  saveSettings();
  updateScaleURLParam();
}

// Scale-name typeahead: the harmonica app's combobox pattern. activeIndex -1 is
// the typed text itself, so arrowing through the list always leads back to it;
// Enter only picks while a row is active, so it never rewrites free-form input.
function initScaleTypeahead(){
  const input = scaleInputEl;
  const menu = scaleSuggestMenuEl;
  let activeIndex = -1;
  const isOpen = ()=> !menu.hidden;

  function close(){
    menu.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  }
  function setActive(i){
    activeIndex = i;
    [...menu.children].forEach((el, j)=>{
      el.classList.toggle('active', j === i);
      el.setAttribute('aria-selected', String(j === i));
    });
    if(i >= 0){
      input.setAttribute('aria-activedescendant', menu.children[i].id);
      menu.children[i].scrollIntoView({ block:'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }
  function refresh(){
    const items = scaleCompletions(input.value);
    // the sole remaining suggestion being exactly what's typed is no suggestion
    const only = items.length === 1 && items[0].text.toLowerCase() === input.value.trim().toLowerCase();
    if(!items.length || only){ close(); return; }
    menu.innerHTML = '';
    items.forEach((c, i)=>{
      const opt = document.createElement('div');
      opt.className = 'typeahead-opt';
      opt.setAttribute('role', 'option');
      opt.id = `scaleSuggestOpt${i}`;
      // the raw ASCII query, so picking it round-trips through the parser
      opt.dataset.q = c.text;
      const text = document.createElement('span');
      text.className = 'typeahead-text';
      text.textContent = formatAccidentals(c.text);
      const desc = document.createElement('span');
      desc.className = 'typeahead-desc';
      desc.textContent = c.desc;
      opt.append(text, desc);
      menu.appendChild(opt);
    });
    menu.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    setActive(-1);
  }
  function pick(text){
    input.value = text;
    scaleInputIsDefault = false;
    close();
    clearTimeout(scaleInputDebounce);
    generateScale();
  }

  // keep the input focused while clicking in the menu, else blur closes it
  // before the click can land
  menu.addEventListener('mousedown', e=> e.preventDefault());
  menu.addEventListener('click', e=>{
    const opt = e.target.closest('.typeahead-opt');
    if(opt) pick(opt.dataset.q);
  });
  input.addEventListener('blur', ()=> close());
  input.addEventListener('input', ()=>{
    scaleInputIsDefault = false;
    updateScaleInputClearUI();
    // manual edits re-baseline the transpose control; reflect that before the debounce
    updateScaleTransposeUI();
    refresh();
    clearTimeout(scaleInputDebounce);
    scaleInputDebounce = setTimeout(generateScale, 300);
  });
  input.addEventListener('keydown', e=>{
    if(e.key === 'Escape'){
      if(isOpen()){ e.stopPropagation(); close(); }
      return;
    }
    if(e.key === 'Tab'){ close(); return; }
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      if(!isOpen()){
        refresh();
        if(isOpen()) setActive(e.key === 'ArrowDown' ? 0 : menu.children.length - 1);
        return;
      }
      const n = menu.children.length;
      setActive(e.key === 'ArrowDown'
        ? (activeIndex + 2) % (n + 1) - 1
        : (activeIndex + n + 1) % (n + 1) - 1);
      return;
    }
    if(e.key === 'Enter'){
      clearTimeout(scaleInputDebounce);
      if(isOpen() && activeIndex >= 0){
        pick(menu.children[activeIndex].dataset.q);
      } else {
        close();
        generateScale();
      }
    }
  });
}
initScaleTypeahead();

document.getElementById('scaleInputClear').addEventListener('click', ()=>{
  clearTimeout(scaleInputDebounce);
  scaleInputEl.value = '';
  scaleInputIsDefault = false;
  scaleInputEl.focus();
  generateScale();
});

// generateScale re-reads the transpose control, so picking an example also
// re-baselines it on the new scale
document.querySelectorAll('.scale-example').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    clearTimeout(scaleInputDebounce);
    scaleInputEl.value = btn.textContent;
    scaleInputIsDefault = false;
    generateScale();
  });
});

initStepper('scaleTranspose', stepScaleTranspose);
document.getElementById('scaleTransposeValue').addEventListener('click', ()=>{
  setScaleTransposeOffset(0);
  // the reset control disables itself at 0; keep focus inside the stepper
  document.getElementById('scaleTransposePlus').focus();
});

// The view switch: same roving-tabindex handling as the chords/scales tabs,
// spelled as a radio group — both views draw the same scale, they aren't panels.
document.getElementById('scaleViewBox').addEventListener('click', ()=>{ if(isNeckView()) setScaleView('position'); });
document.getElementById('scaleViewNeck').addEventListener('click', ()=>{ if(!isNeckView()) setScaleView('neck'); });
document.getElementById('scaleViewTabs').addEventListener('keydown', e=>{
  let next = null;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) next = isNeckView() ? 'position' : 'neck';
  else if(e.key === 'Home') next = 'position';
  else if(e.key === 'End') next = 'neck';
  if(!next || next === scaleView) return;
  e.preventDefault();
  setScaleView(next);
  document.getElementById(next === 'neck' ? 'scaleViewNeck' : 'scaleViewBox').focus();
});

// --- Custom chord diagram: search fingerings for a free-form set of notes,
// not a named chord. Mirrors the voicing chooser above (same tile grid) but
// keeps its own max-fret/max-span search settings — a scratchpad search
// shouldn't disturb the sheet — and there's no sheet card to update, so
// every tile just plays — nothing to "select".
const customChordModalEl = document.getElementById('customChordModal');
const customChordNotesInputEl = document.getElementById('customChordNotesInput');
const customChordNotesNoteEl = document.getElementById('customChordNotesNote');
const customChordModalGridEl = document.getElementById('customChordModalGrid');

let customChordMaxFretValue = MAX_FRET_DEFAULT;
let customChordMaxSpanValue = MAX_SPAN_DEFAULT;
let customChordDebounce = null;

function syncCustomChordModalControls(){
  syncFretSpanControls('customChordModal', customChordMaxFretValue, customChordMaxSpanValue);
}

// Live link to reopen this exact search — mirrors syncVoicingModalOpenAll,
// carried on top of whatever chart/tuning params are already in the URL.
function syncCustomChordShareLink(tokens){
  const link = document.getElementById('customChordModalShareLink');
  const labelEl = document.getElementById('customChordModalShareLabel');
  if(!tokens || !tokens.length){
    link.hidden = true;
    link.removeAttribute('href');
    link.removeAttribute('title');
    labelEl.textContent = '';
    return;
  }
  link.hidden = false;
  const noteList = tokens.join(', ');
  const params = new URLSearchParams(window.location.search);
  params.set('notes', tokens.join(','));
  params.set('tuning', selectedTuningId);
  link.href = window.location.pathname + '?' + params.toString();
  link.title = `Open a link to this search for ${noteList} in a new tab`;
  labelEl.textContent = '';
  const code = document.createElement('code');
  code.textContent = noteList;
  labelEl.append('Open ', code, ' in a new tab');
}

function renderCustomChordTiles(){
  const parsed = parseNoteList(customChordNotesInputEl.value);
  syncCustomChordShareLink(parsed.tokens);
  const scrollTop = customChordModalGridEl.scrollTop;
  customChordModalGridEl.innerHTML = '';
  if(parsed.error){
    customChordNotesNoteEl.textContent = parsed.error;
    return;
  }
  const label = parsed.tokens.join(', ');
  const tuning = currentTuning();
  const colors = currentColors();
  const highlightRoot = document.getElementById('rootToggle').checked;
  const showNoteNames = document.getElementById('noteNamesToggle').checked;
  const masonry = document.getElementById('customChordModalMasonry').checked;
  const allowMuted = document.getElementById('customChordModalMuted').checked;
  const voicings = findVoicings(parsed.requiredPCs, null, tuning, customChordMaxFretValue, customChordMaxSpanValue, MAX_VOICINGS, allowMuted);
  customChordNotesNoteEl.textContent = voicings.length
    ? `${voicings.length} voicing${voicings.length===1 ? '' : 's'} found for ${label}.`
    : `No practical voicing found for ${label} up to fret ${customChordMaxFretValue} — raise “Search up to fret” or “Max stretch” below.`;
  customChordModalGridEl.classList.toggle('masonry', masonry);
  if(!voicings.length) return;

  const tiles = voicings.map((frets, i)=>{
    const { fretMax, startFret } = computeFretWindow(frets, shortenThreshold);
    // play button is a sibling of the tile button (nesting would be invalid),
    // overlaid on its corner via the wrapper — see renderVoicingTiles above
    const wrap = document.createElement('div');
    wrap.className = 'voicing-choice-wrap';
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'voicing-choice';
    tile.setAttribute('aria-label', `Play voicing ${i+1} of ${voicings.length} for ${label}`);
    // no openAbs: per-note dots would nest interactive elements inside the button
    tile.innerHTML = `<span class="voicing-choice-index">${i+1}</span>` + chordSVG(label, frets, fretMax, tuning.labels, colors, tuning.openPCs, null, highlightRoot, undefined, startFret, showNoteNames);
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'voicing-choice-play';
    playBtn.title = 'Play this voicing';
    playBtn.setAttribute('aria-label', `Play voicing ${i+1} of ${voicings.length} for ${label}`);
    playBtn.innerHTML = PLAY_ICON;
    // both the tile and its corner button flash the same small icon — never the
    // tile's own diagram, which would just blank out mid-swap
    const playThis = ()=> playChordAndFlash(playBtn, chordAbsNotes(frets, tuning.openAbs), chordPlayOpts(tuning));
    tile.addEventListener('click', playThis);
    playBtn.addEventListener('click', e=>{ e.stopPropagation(); playThis(); });
    wrap.appendChild(tile);
    wrap.appendChild(playBtn);
    return wrap;
  });

  if(!masonry){
    tiles.forEach(t=> customChordModalGridEl.appendChild(t));
  } else {
    layoutMasonryTiles(customChordModalGridEl, tiles);
  }
  customChordModalGridEl.scrollTop = scrollTop;
}

function scheduleCustomChordRender(){
  if(!customChordModalEl.hidden) renderCustomChordTiles();
}

function stepCustomChordMaxFret(delta){
  customChordMaxFretValue = Math.min(MAX_FRET_MAX, Math.max(MAX_FRET_MIN, customChordMaxFretValue + delta));
  syncCustomChordModalControls();
  scheduleCustomChordRender();
  saveSettings();
}
function stepCustomChordMaxSpan(delta){
  customChordMaxSpanValue = Math.min(MAX_SPAN_MAX, Math.max(MAX_SPAN_MIN, customChordMaxSpanValue + delta));
  syncCustomChordModalControls();
  scheduleCustomChordRender();
  saveSettings();
}
initStepper('customChordModalMaxFret', stepCustomChordMaxFret);
initStepper('customChordModalMaxSpan', stepCustomChordMaxSpan);

const customChordModal = createModal(customChordModalEl);

function openCustomChordModal(opener){
  const fresh = customChordModal.open(opener);
  syncCustomChordModalControls();
  renderCustomChordTiles();
  if(fresh) customChordNotesInputEl.focus();
}

function closeCustomChordModal(){
  customChordModal.close();
}
document.getElementById('customChordModalClose').addEventListener('click', ()=> closeCustomChordModal());
document.getElementById('customChordOpenBtn').addEventListener('click', e=> openCustomChordModal(e.currentTarget));
document.getElementById('customChordModalMasonry').addEventListener('change', ()=>{
  scheduleCustomChordRender();
  saveSettings();
});
document.getElementById('customChordModalMuted').addEventListener('change', ()=>{
  scheduleCustomChordRender();
  saveSettings();
});
customChordNotesInputEl.addEventListener('input', ()=>{
  clearTimeout(customChordDebounce);
  // debounce long enough that partial tokens rarely flash a parse error;
  // scheduled (not direct) so it no-ops if the modal closed in the meantime
  customChordDebounce = setTimeout(scheduleCustomChordRender, 450);
});
customChordNotesInputEl.addEventListener('keydown', e=>{
  if(e.key === 'Enter'){ e.preventDefault(); clearTimeout(customChordDebounce); renderCustomChordTiles(); }
});

// --- Reverse of the custom-chord search: the user clicks a fretboard and the
// tool names the chord. The board is an SVG rebuilt on every change (the
// codebase's usual innerHTML style), driven by pointer/touch; the aria-live
// readout announces the notes and verdict. fretboardIdState is per string:
// null muted, 0 open, n fretted.
const FB_XS = [30,70,110,150];
const FB_NUT_Y = 42, FB_FRET_H = 34, FB_FRETS = 15;
const FB_TOP_Y = 24, FB_LEFT = 20, FB_RIGHT = 160, FB_MARKER_X = 90;
const FB_FRET_MARKERS = [3,5,7,10,12,15];

let fretboardIdState = [0,0,0,0];
// Primary chord name of the current fingering (null when it names none) — drives
// the "Open this chord" link's main-page target.
let fretboardIdChordLabel = null;

const fretboardIdModalEl = document.getElementById('fretboardIdModal');
const fretboardIdBoardEl = document.getElementById('fretboardIdBoard');
const fretboardIdStringsEl = document.getElementById('fretboardIdStrings');
const fretboardIdNotesEl = document.getElementById('fretboardIdNotes');
const fretboardIdVerdictEl = document.getElementById('fretboardIdVerdict');
const fretboardIdCardSlotEl = document.getElementById('fretboardIdCardSlot');
const fretboardIdPlayEl = document.getElementById('fretboardIdPlay');
const fretboardIdCopyLinkEl = document.getElementById('fretboardIdCopyLink');
const fretboardIdNamesToggleEl = document.getElementById('fretboardIdNamesToggle');
fretboardIdNamesToggleEl.addEventListener('change', ()=> renderFretboardIdBoard());

// Compact, link/settings-friendly encoding: x muted, o open, else the fret.
function encodeFretboardState(state){
  return state.map(v => v===null ? 'x' : v===0 ? 'o' : String(v)).join('-');
}
function decodeFretboardState(str){
  if(!str) return null;
  const parts = String(str).split(/[-,]/).map(s=>s.trim().toLowerCase());
  if(parts.length !== 4) return null;
  const out = [];
  for(const p of parts){
    if(p === 'x') out.push(null);
    else if(p === 'o' || p === '0') out.push(0);
    else if(/^\d{1,2}$/.test(p)){ const n = parseInt(p,10); if(n < 1 || n > FB_FRETS) return null; out.push(n); }
    else return null;
  }
  return out;
}

function fretboardIdSVG(){
  const t = currentTuning();
  const st = fretboardIdState;
  const showNames = fretboardIdNamesToggleEl.checked;
  const bottomY = FB_NUT_Y + FB_FRETS*FB_FRET_H;
  let s = `<svg class="fb-input" viewBox="0 0 180 ${bottomY+12}" role="img" aria-hidden="true">`;
  // background-coloured radial glow that lifts un-selected note names off the
  // string line running behind them (the names inside filled dots need none)
  if(showNames) s += `<defs><radialGradient id="fbGlow"><stop class="fb-glow-a" offset="0"/><stop class="fb-glow-b" offset="0.4"/><stop class="fb-glow-c" offset="1"/></radialGradient></defs>`;
  t.labels.forEach((lab,i)=>{ s += `<text class="fb-label" x="${FB_XS[i]}" y="13" text-anchor="middle">${escapeXML(formatAccidentals(lab))}</text>`; });
  s += `<line class="fb-nut" x1="${FB_LEFT}" y1="${FB_NUT_Y}" x2="${FB_RIGHT}" y2="${FB_NUT_Y}"/>`;
  for(let r=1;r<=FB_FRETS;r++){
    const y = FB_NUT_Y + r*FB_FRET_H;
    s += `<line class="fb-line" x1="${FB_LEFT}" y1="${y}" x2="${FB_RIGHT}" y2="${y}"/>`;
    s += `<text class="fb-fretnum" x="168" y="${FB_NUT_Y+(r-0.5)*FB_FRET_H+4}">${r}</text>`;
  }
  FB_XS.forEach(x=>{ s += `<line class="fb-string" x1="${x}" y1="${FB_NUT_Y}" x2="${x}" y2="${bottomY}"/>`; });
  FB_FRET_MARKERS.forEach(f=>{ if(f<=FB_FRETS) s += `<circle class="fb-inlay" cx="${FB_MARKER_X}" cy="${FB_NUT_Y+(f-0.5)*FB_FRET_H}" r="3"/>`; });
  // open/mute markers sit above the nut, and only when the string isn't fretted;
  // a fretted string is re-opened by clicking its dot, then this toggles o/×
  FB_XS.forEach((x,i)=>{
    const v = st[i];
    if(v!==0 && v!==null) return;
    const glyph = v===0
      ? `<circle class="fb-open" cx="${x}" cy="${FB_TOP_Y}" r="6"/>`
      : `<path class="fb-mute" d="M${x-5} ${FB_TOP_Y-5} L${x+5} ${FB_TOP_Y+5} M${x-5} ${FB_TOP_Y+5} L${x+5} ${FB_TOP_Y-5}"/>`;
    s += `<g class="fb-top" data-string="${i}">${glyph}<rect class="fb-tophit" x="${x-18}" y="${FB_TOP_Y-14}" width="36" height="28"/></g>`;
  });
  for(let i=0;i<4;i++){
    const x = FB_XS[i];
    for(let f=1;f<=FB_FRETS;f++){
      const y = FB_NUT_Y + (f-0.5)*FB_FRET_H;
      const selected = st[i]===f;
      const name = showNames ? formatAccidentals(spellNote((t.openPCs[i]+f)%12)) : null;
      s += `<g class="fb-cell${selected?' selected':''}" data-string="${i}" data-fret="${f}">`;
      if(selected){
        s += `<circle class="fb-dot" cx="${x}" cy="${y}" r="10"/>`;
        if(name) s += `<text class="fb-dot-name" x="${x}" y="${y}">${name}</text>`;
      } else if(name){
        s += `<circle class="fb-glow" cx="${x}" cy="${y}" r="9" fill="url(#fbGlow)"/>`;
        s += `<text class="fb-guide-name" x="${x}" y="${y}">${name}</text>`;
      } else {
        s += `<circle class="fb-guide" cx="${x}" cy="${y}" r="3.5"/>`;
      }
      s += `<rect class="fb-hit" x="${x-20}" y="${y-FB_FRET_H/2}" width="40" height="${FB_FRET_H}"/></g>`;
    }
  }
  return s + '</svg>';
}

// Absolute link that reopens this exact fingering in the namer, or null when
// nothing sounds. This is what "Copy link" shares — a direct link to the modal.
function fretboardShareURL(){
  if(!fretboardIdState.some(v=>v!==null)) return null;
  const params = new URLSearchParams(window.location.search);
  [...CHART_PARAMS, ...MODAL_PARAMS].forEach(p=>params.delete(p));
  params.set('fretboard', encodeFretboardState(fretboardIdState));
  params.set('tuning', selectedTuningId);
  return new URL(window.location.pathname + '?' + readableQuery(params), window.location.href).href;
}

// Absolute link into the main sheet for the "See all fingerings" action: every
// voicing of the named chord (printable cards) when the fingering names one,
// otherwise the custom-notes search, which likewise lists every fingering.
function fretboardMainPageURL(){
  const t = currentTuning();
  const sounding = [];
  fretboardIdState.forEach((v,i)=>{ if(v!==null) sounding.push(t.openAbs[i]+v); });
  if(!sounding.length) return null;
  const params = new URLSearchParams(window.location.search);
  [...CHART_PARAMS, ...MODAL_PARAMS].forEach(p=>params.delete(p));
  params.set('tuning', selectedTuningId);
  if(fretboardIdChordLabel){
    params.set('chords', fretboardIdChordLabel + '*'); // * lays out every voicing
  } else {
    const distinct = [...new Set(sounding.map(a=>((a%12)+12)%12))];
    params.set('notes', distinct.map(spellNote).join(','));
  }
  return new URL(window.location.pathname + '?' + readableQuery(params), window.location.href).href;
}

function syncFretboardIdShareLink(){
  fretboardIdCopyLinkEl.disabled = !fretboardShareURL();
  const mainUrl = fretboardMainPageURL();
  const link = document.getElementById('fretboardIdShareLink');
  if(mainUrl){ link.hidden = false; link.href = mainUrl; }
  else { link.hidden = true; link.removeAttribute('href'); }
}

function fretboardIdVerdictHTML(matches){
  const exact = matches.filter(m=>m.exact);
  if(exact.length){
    let h = `<p class="fb-verdict-line"><span class="fb-verdict-lead">This is</span> <strong class="fb-chord-name">${accidentalsHTML(exact[0].label)}</strong></p>`;
    const alts = exact.slice(1,4).map(m=>accidentalsHTML(m.label));
    if(alts.length) h += `<p class="fb-alts">also written ${alts.map(a=>`<span>${a}</span>`).join(', ')}</p>`;
    return h;
  }
  const near = matches.slice(0,3);
  if(!near.length) return `<p class="fb-none">No common chord for these notes.</p>`;
  const p = near[0];
  let h = `<p class="fb-verdict-line"><span class="fb-verdict-lead">Looks like</span> <strong class="fb-chord-name">${accidentalsHTML(p.label)}</strong>`;
  if(p.missing.length) h += ` <span class="fb-missing">(no ${p.missing.map(n=>accidentalsHTML(n)).join(', ')})</span>`;
  h += `</p>`;
  const alts = near.slice(1).map(m => accidentalsHTML(m.missing.length ? `${m.label} (no ${m.missing.join(', ')})` : m.label));
  if(alts.length) h += `<p class="fb-alts">or ${alts.map(a=>`<span>${a}</span>`).join(', ')}</p>`;
  return h;
}

// Cross-fades the verdict on change (and fades it out as it empties), skipping
// re-animation when the text is unchanged so building up a chord doesn't flicker.
let lastVerdictHTML = null;
function setFretboardVerdict(html){
  if(html === lastVerdictHTML) return;
  lastVerdictHTML = html;
  const el = fretboardIdVerdictEl;
  if(!el.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    el.innerHTML = html;
    return;
  }
  el.getAnimations().forEach(a=>a.cancel());
  if(!html){
    const out = el.animate([{ opacity:1, transform:'none' }, { opacity:0, transform:'translateY(-3px)' }],
      { duration:150, easing:'ease', fill:'forwards' });
    // clear only if nothing newer arrived; cancel drops the forwards-fill afterwards
    out.finished.then(()=>{ if(lastVerdictHTML === ''){ el.innerHTML = ''; } out.cancel(); }).catch(()=>{});
    return;
  }
  el.innerHTML = html;
  el.animate([{ opacity:0, transform:'translateY(4px)' }, { opacity:1, transform:'none' }],
    { duration:200, easing:'cubic-bezier(.4,0,.2,1)' });
}

// The current fingering as a real main-sheet card (printable/copyable, same
// features), or an empty slot when the notes name no chord. `primary` is the
// top identifyChord match; a single-voicing result means no voicing nav.
function renderFretboardIdCard(primary){
  closeCardMenu(); // an open menu still points at the card we're about to replace
  fretboardIdCardSlotEl.innerHTML = '';
  if(!primary) return;
  const ctx = {
    tuning: currentTuning(),
    colors: currentColors(),
    highlightRoot: document.getElementById('rootToggle').checked,
    showOmitted: document.getElementById('omitToggle').checked,
    showNoteNames: document.getElementById('noteNamesToggle').checked,
  };
  const result = {
    label: primary.label, showAll: false,
    requiredPCs: [], bassPC: null,
    voicings: [fretboardIdState.slice()], altIndex: 0,
    rootPC: primary.root, omitted: null,
  };
  fretboardIdCardSlotEl.appendChild(buildCard(result, ctx));
}

function updateFretboardIdResult(){
  const t = currentTuning();
  // absolute pitch of every sounding string, kept in string order (dupes and all)
  const sounding = [];
  fretboardIdState.forEach((v,i)=>{ if(v!==null) sounding.push(t.openAbs[i]+v); });
  let notesText, verdictHTML = '', primary = null;
  if(!sounding.length){
    notesText = 'No strings selected — tap the fretboard to place notes.';
  } else {
    const names = sounding.map(a=>formatAccidentals(spellNote(a))); // every note, redundancies included, string order
    notesText = sounding.length===1 ? `Note: ${names[0]}` : `Notes: ${names.join(' · ')}`;
    if(new Set(sounding.map(a=>((a%12)+12)%12)).size < 2){
      verdictHTML = `<p class="fb-none">Just one note so far — add another to name a chord.</p>`;
    } else {
      const bassPC = ((Math.min(...sounding)%12)+12)%12;
      const { matches } = identifyChord(sounding.map(a=>a%12), bassPC);
      primary = matches.length ? matches[0] : null;
      verdictHTML = fretboardIdVerdictHTML(matches);
    }
  }
  fretboardIdNotesEl.textContent = notesText;
  fretboardIdPlayEl.disabled = !sounding.length;
  fretboardIdChordLabel = primary ? primary.label : null;
  renderFretboardIdCard(primary);
  setFretboardVerdict(verdictHTML);
  syncFretboardIdShareLink();
}

// The board is pointer-driven and its SVG is decorative (aria-hidden); these
// native <select>s are the keyboard/screen-reader equivalent, one per string
// (× muted, ○ open, else the fret). Visually hidden until focused (see CSS).
function buildFretboardIdSelects(){
  const opts = ['<option value="x">×</option>','<option value="o">○</option>']
    .concat(Array.from({length:FB_FRETS}, (_,i)=>`<option value="${i+1}">${i+1}</option>`)).join('');
  fretboardIdStringsEl.innerHTML = '';
  for(let i=0;i<4;i++){
    const label = document.createElement('label');
    label.className = 'fb-string-pick';
    label.innerHTML = `<span class="fb-string-name" id="fbStringName${i}"></span><select class="fb-string-select" data-string="${i}">${opts}</select>`;
    fretboardIdStringsEl.appendChild(label);
  }
  fretboardIdStringsEl.addEventListener('change', e=>{
    const sel = e.target.closest('select[data-string]');
    if(!sel) return;
    const i = +sel.dataset.string, v = sel.value;
    fretboardIdState[i] = v==='x' ? null : v==='o' ? 0 : parseInt(v,10);
    renderFretboardIdBoard();
  });
}

function syncFretboardIdSelects(){
  const t = currentTuning();
  for(let i=0;i<4;i++){
    const nameEl = document.getElementById('fbStringName'+i);
    if(nameEl) nameEl.textContent = t.labels[i];
    const sel = fretboardIdStringsEl.querySelector(`select[data-string="${i}"]`);
    if(sel){
      const v = fretboardIdState[i];
      sel.value = v===null ? 'x' : v===0 ? 'o' : String(v);
      sel.setAttribute('aria-label', `${formatAccidentals(t.labels[i])} string`);
    }
  }
}

function renderFretboardIdBoard(){
  fretboardIdBoardEl.innerHTML = fretboardIdSVG();
  if(fretboardIdStringsEl.children.length) syncFretboardIdSelects();
  updateFretboardIdResult();
  saveSettings();
}

// Sounds the single note a string is now set to (nothing when it was muted).
function playFretboardString(i){
  const v = fretboardIdState[i];
  if(v === null) return;
  const abs = currentTuning().openAbs[i] + v;
  flashPlayButton(fretboardIdPlayEl, playNote(abs), chordPlayDuration([abs]));
}

fretboardIdBoardEl.addEventListener('click', e=>{
  // sound the note before the (heavier) re-render + settings write, so the tap
  // feels responsive; playFretboardString only reads the just-updated state and
  // the stable play button, so it doesn't depend on the render
  const top = e.target.closest('.fb-top');
  if(top){
    const i = +top.dataset.string;
    fretboardIdState[i] = fretboardIdState[i]===0 ? null : 0;
    playFretboardString(i);
    renderFretboardIdBoard();
    return;
  }
  const cell = e.target.closest('.fb-cell');
  if(cell){
    const i = +cell.dataset.string, f = +cell.dataset.fret;
    fretboardIdState[i] = fretboardIdState[i]===f ? 0 : f; // re-tapping a fret opens the string
    playFretboardString(i);
    renderFretboardIdBoard();
  }
});

fretboardIdPlayEl.addEventListener('click', ()=>{
  const abs = chordAbsNotes(fretboardIdState, currentTuning().openAbs);
  if(abs.length) playChordAndFlash(fretboardIdPlayEl, abs, chordPlayOpts(currentTuning()));
});

// Brief inline "Copied"/"Shown" feedback on the copy-link button's own label.
function flashCopyLink(text){
  const label = fretboardIdCopyLinkEl.querySelector('.fb-copy-label');
  if(!label) return;
  if(fretboardIdCopyLinkEl._flashTimer) clearTimeout(fretboardIdCopyLinkEl._flashTimer);
  if(fretboardIdCopyLinkEl._origLabel == null) fretboardIdCopyLinkEl._origLabel = label.textContent;
  label.textContent = text;
  fretboardIdCopyLinkEl._flashTimer = setTimeout(()=>{
    label.textContent = fretboardIdCopyLinkEl._origLabel;
    fretboardIdCopyLinkEl._flashTimer = null;
  }, 1300);
}

fretboardIdCopyLinkEl.addEventListener('click', async ()=>{
  const url = fretboardShareURL();
  if(!url) return;
  flashCopyLink(await copyLinkText(url));
});

const fretboardIdModal = createModal(fretboardIdModalEl);

function openFretboardIdModal(opener){
  const fresh = fretboardIdModal.open(opener);
  if(!fretboardIdStringsEl.children.length) buildFretboardIdSelects();
  renderFretboardIdBoard();
  if(fresh){
    const closeBtn = document.getElementById('fretboardIdModalClose');
    try{ closeBtn.focus({ preventScroll:true }); }catch(err){ closeBtn.focus(); }
  }
}

document.getElementById('fretboardIdModalClose').addEventListener('click', ()=> fretboardIdModal.close());
document.getElementById('fretboardIdOpenBtn').addEventListener('click', e=> openFretboardIdModal(e.currentTarget));

function updateURLParam(chordInputValue){
  const params = new URLSearchParams(window.location.search);
  // a chords-mode URL never carries the scales tab's params (and vice versa)
  params.delete('scale');
  params.delete('view');
  // The URL carries either the song identity or the literal chords, never both:
  // ?song= (plus ?transpose= when shifted as a whole) while the chart is still
  // the song, ?chords= once it diverged — so a link always reproduces what is
  // on screen. (activeSong and songChartOffset live in the song-search section
  // below, which runs before the first generate() call.)
  const songOffset = songChartOffset(chordInputValue);
  if(songOffset !== null){
    params.set('song', activeSong.id);
    if(songOffset !== 0){ params.set('transpose', String(songOffset)); }
    // while the song fetch is pending the URL's own ?transpose= must survive
    // for the restore to apply it
    else if(activeSong.appliedText !== null){ params.delete('transpose'); }
    params.delete('chords');
  } else {
    params.delete('song');
    params.delete('transpose');
    const packed = packChordInput(chordInputValue);
    if(packed){ params.set('chords', packed); }
    else { params.delete('chords'); }
  }
  params.set('tuning', selectedTuningId);
  const query = readableQuery(params);
  const newURL = window.location.pathname + (query ? `?${query}` : '') + window.location.hash;
  history.replaceState(null, '', newURL);
}

// One reusable instrument picker, instantiated for the page and for the
// create-your-own-chord modal so both look and behave identically. selectTuning
// is the shared handler: it re-tunes the whole app and refreshes every instance.
const tuningSelects = [];

function selectTuning(id, opts){
  selectedTuningId = id;
  tuningSelects.forEach(sel=> sel.update(id));
  if(!opts || !opts.silent){
    tuningSelects.forEach(sel=> sel.close());
    regenerate();
    // the create-chord board reads the live tuning, so re-render it if open
    if(!fretboardIdModalEl.hidden) renderFretboardIdBoard();
  }
}

function createTuningSelect(root){
  const btn = root.querySelector('.tuning-select-trigger');
  const menu = root.querySelector('.tuning-select-menu');
  const iconEl = btn.querySelector('.tuning-select-icon');
  const nameEl = btn.querySelector('.tuning-select-name');
  const tuningEl = btn.querySelector('.tuning-select-tuning');
  TUNINGS.forEach(t=>{
    const li = document.createElement('li');
    li.className = 'tuning-select-option';
    li.setAttribute('role','option');
    li.dataset.id = t.id;
    li.innerHTML = `
      <span class="tuning-select-icon">${INSTRUMENT_ICONS[t.icon]}</span>
      <span class="tuning-select-text">
        <span class="tuning-select-name">${t.name}</span>
        <span class="tuning-select-tuning">${formatAccidentals(t.tuningLabel)}</span>
      </span>
      <svg class="check" aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    li.addEventListener('click', ()=> selectTuning(t.id));
    menu.appendChild(li);
  });
  const ctl = createMenu(root, btn);
  btn.addEventListener('keydown', e=>{
    const opts = [...menu.children];
    const idx = opts.findIndex(li=>li.dataset.id===selectedTuningId);
    if(e.key==='ArrowDown'){
      e.preventDefault();
      if(!ctl.isOpen()) ctl.open();
      selectTuning(opts[Math.min(idx+1, opts.length-1)].dataset.id);
    } else if(e.key==='ArrowUp'){
      e.preventDefault();
      if(!ctl.isOpen()) ctl.open();
      selectTuning(opts[Math.max(idx-1, 0)].dataset.id);
    } else if(e.key==='Escape'){
      // consume it while open so a containing dialog doesn't also close
      if(ctl.isOpen()) e.stopPropagation();
      ctl.close();
    } else if(e.key==='Enter' || e.key===' '){
      e.preventDefault();
      ctl.isOpen() ? ctl.close() : ctl.open();
    }
  });
  const inst = {
    update(id){
      const t = TUNINGS.find(x=>x.id===id) || TUNINGS[0];
      iconEl.innerHTML = INSTRUMENT_ICONS[t.icon];
      nameEl.textContent = t.name;
      tuningEl.textContent = formatAccidentals(t.tuningLabel);
      [...menu.children].forEach(li=> li.classList.toggle('selected', li.dataset.id===id));
    },
    close: ctl.close,
    isOpen: ctl.isOpen,
  };
  tuningSelects.push(inst);
  return inst;
}

setupInfoPopover('aquilaInfoWrap', 'aquilaInfoBtn');
setupInfoPopover('omitInfoWrap', 'omitInfoBtn');
setupInfoPopover('thresholdInfoWrap', 'thresholdInfoBtn');
setupInfoPopover('cardControlsInfoWrap', 'cardControlsInfoBtn');
setupInfoPopover('arpeggioInfoWrap', 'arpeggioInfoBtn');

const savedSettings = loadSettings();

// An empty stored/URL value is treated the same as "nothing customized" so the
// showcase default reappears instead of a blank input.
const savedChordInputExists = typeof savedSettings.chordInput === 'string' && savedSettings.chordInput.trim() !== '';
if(savedChordInputExists){
  document.getElementById('chordInput').value = formatChordInput(savedSettings.chordInput);
}
const chordsParam = new URLSearchParams(window.location.search).get('chords');
const chordsParamExists = chordsParam !== null && chordsParam.trim() !== '';
if(chordsParamExists){
  document.getElementById('chordInput').value = formatChordInput(chordsParam);
}
// True only while the input still holds the built-in default (untouched by the
// user, localStorage, or a ?chords= link) — gates whether saveSettings persists it.
let chordInputIsDefault = !savedChordInputExists && !chordsParamExists;
// same restore dance for the scale input
const savedScaleInputExists = typeof savedSettings.scaleInput === 'string' && savedSettings.scaleInput.trim() !== '';
if(savedScaleInputExists){
  document.getElementById('scaleInput').value = savedSettings.scaleInput;
}
const scaleParam = new URLSearchParams(window.location.search).get('scale');
const scaleParamExists = scaleParam !== null && scaleParam.trim() !== '';
if(scaleParamExists){
  document.getElementById('scaleInput').value = scaleParam.trim();
}
let scaleInputIsDefault = !savedScaleInputExists && !scaleParamExists;
if(typeof savedSettings.showBorder === 'boolean'){
  document.getElementById('borderToggle').checked = savedSettings.showBorder;
  document.getElementById('grid').classList.toggle('no-border', !savedSettings.showBorder);
}
if(typeof savedSettings.showCardControls === 'boolean'){
  document.getElementById('cardControlsToggle').checked = savedSettings.showCardControls;
  document.body.classList.toggle('card-controls-hidden', !savedSettings.showCardControls);
}
if(typeof savedSettings.bwMode === 'boolean'){
  document.getElementById('bwToggle').checked = savedSettings.bwMode;
  document.body.classList.toggle('bw-mode', savedSettings.bwMode);
}
if(typeof savedSettings.highlightRoot === 'boolean'){
  document.getElementById('rootToggle').checked = savedSettings.highlightRoot;
}
if(typeof savedSettings.scaleRootRun === 'boolean'){
  document.getElementById('rootRunToggle').checked = savedSettings.scaleRootRun;
}
if(typeof savedSettings.scaleSimplifyAccidentals === 'boolean'){
  document.getElementById('simplifyAccidentalsToggle').checked = savedSettings.scaleSimplifyAccidentals;
}
// pre-split settings carried a single showNoteNames; it becomes the chords value
if(typeof savedSettings.showNoteNames === 'boolean'){
  noteNamesByMode.chords = savedSettings.showNoteNames;
}
if(typeof savedSettings.scaleShowNoteNames === 'boolean'){
  noteNamesByMode.scales = savedSettings.scaleShowNoteNames;
}
if(typeof savedSettings.aquilaStrings === 'boolean'){
  document.getElementById('aquilaToggle').checked = savedSettings.aquilaStrings;
}
if(typeof savedSettings.masonry === 'boolean'){
  document.getElementById('masonryToggle').checked = savedSettings.masonry;
}
if(typeof savedSettings.showOmitted === 'boolean'){
  document.getElementById('omitToggle').checked = savedSettings.showOmitted;
}
if(savedSettings.columns === 'auto' || (Number.isInteger(savedSettings.columns) && savedSettings.columns >= COLUMNS_MIN && savedSettings.columns <= COLUMNS_MAX)){
  columnsValue = savedSettings.columns;
}
if(Number.isInteger(savedSettings.shortenThreshold) && savedSettings.shortenThreshold >= THRESHOLD_MIN && savedSettings.shortenThreshold <= THRESHOLD_MAX){
  shortenThreshold = savedSettings.shortenThreshold;
}
if(Number.isInteger(savedSettings.maxFret) && savedSettings.maxFret >= MAX_FRET_MIN && savedSettings.maxFret <= MAX_FRET_MAX){
  maxFretValue = savedSettings.maxFret;
}
if(Number.isInteger(savedSettings.maxSpan) && savedSettings.maxSpan >= MAX_SPAN_MIN && savedSettings.maxSpan <= MAX_SPAN_MAX){
  maxSpanValue = savedSettings.maxSpan;
}
if(typeof savedSettings.allowMuted === 'boolean'){
  document.getElementById('voicingModalMuted').checked = savedSettings.allowMuted;
}
document.getElementById('voicingModalMasonry').checked = typeof savedSettings.chooserMasonry === 'boolean'
  ? savedSettings.chooserMasonry
  : document.getElementById('masonryToggle').checked;
// custom-chord modal settings are independent, seeded from the sheet's on first use
customChordMaxFretValue = (Number.isInteger(savedSettings.customChordMaxFret) && savedSettings.customChordMaxFret >= MAX_FRET_MIN && savedSettings.customChordMaxFret <= MAX_FRET_MAX)
  ? savedSettings.customChordMaxFret : maxFretValue;
customChordMaxSpanValue = (Number.isInteger(savedSettings.customChordMaxSpan) && savedSettings.customChordMaxSpan >= MAX_SPAN_MIN && savedSettings.customChordMaxSpan <= MAX_SPAN_MAX)
  ? savedSettings.customChordMaxSpan : maxSpanValue;
document.getElementById('customChordModalMasonry').checked = typeof savedSettings.customChordMasonry === 'boolean'
  ? savedSettings.customChordMasonry
  : document.getElementById('masonryToggle').checked;
document.getElementById('customChordModalMuted').checked = typeof savedSettings.customChordAllowMuted === 'boolean'
  ? savedSettings.customChordAllowMuted
  : document.getElementById('voicingModalMuted').checked;
{
  const savedBoard = decodeFretboardState(savedSettings.fretboardId);
  if(savedBoard) fretboardIdState = savedBoard;
}
if(typeof savedSettings.fretboardIdNames === 'boolean'){
  fretboardIdNamesToggleEl.checked = savedSettings.fretboardIdNames;
}
const tuningParam = new URLSearchParams(window.location.search).get('tuning');
const initialTuningId = (tuningParam && TUNINGS.some(t=>t.id===tuningParam))
  ? tuningParam
  : (savedSettings.tuningId && TUNINGS.some(t=>t.id===savedSettings.tuningId))
    ? savedSettings.tuningId : TUNINGS[0].id;

createTuningSelect(document.getElementById('tuningSelectWrap'));
createTuningSelect(document.getElementById('fretboardIdTuningWrap'));
selectTuning(initialTuningId, { silent:true });

// Same as the mode below: a ?view= link wins, then the last view used.
const viewParam = new URLSearchParams(window.location.search).get('view');
setScaleView(viewParam === 'neck' || viewParam === 'position'
  ? viewParam
  : savedSettings.scaleView === 'neck' ? 'neck' : 'position', { silent:true });

// The URL wins over the saved mode: a ?scale= link lands on the Scales tab, a
// ?chords=/?song= link on Chords, and only a bare visit restores the last mode.
const initialMode = scaleParamExists ? 'scales'
  : (chordsParamExists || new URLSearchParams(window.location.search).get('song')) ? 'chords'
    : savedSettings.mode === 'scales' ? 'scales' : 'chords';
setMode(initialMode, { silent:true });

document.getElementById('modeTabChords').addEventListener('click', ()=>{ if(currentMode !== 'chords') setMode('chords'); });
document.getElementById('modeTabScales').addEventListener('click', ()=>{ if(currentMode !== 'scales') setMode('scales'); });
// roving tabindex: with two tabs both arrows toggle, Home/End pin the ends
document.getElementById('modeTabs').addEventListener('keydown', e=>{
  let next = null;
  if(e.key === 'ArrowLeft' || e.key === 'ArrowRight') next = currentMode === 'scales' ? 'chords' : 'scales';
  else if(e.key === 'Home') next = 'chords';
  else if(e.key === 'End') next = 'scales';
  if(!next || next === currentMode) return;
  e.preventDefault();
  setMode(next);
  document.getElementById(next === 'scales' ? 'modeTabScales' : 'modeTabChords').focus();
});

// --- tips toast: a rotating collection shown bottom-right, reachable via the bulb fab forever ---
const TIPS_OPT_OUT_KEY = 'chordChartGenerator.tipsOptOut';
const TIPS_REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// chordsOnly tips describe controls the Scales tab hides — they stay out of the
// rotation while that tab is up, and scalesOnly tips the other way round.
const TIPS = [
  { emoji:'🎧', chordsOnly:true, pointerText:"Select a chord's name or a dot on its diagram to hear how it sounds.", touchText:"Tap a chord's name or a dot on its diagram to hear how it sounds." },
  { emoji:'🎸', chordsOnly:true, text:'Use the arrows on a chord card to browse alternate voicings, or tap the number between them to see every voicing at once.' },
  { emoji:'📷', text:'Switch on “Black & white” in Options for crisp, high-contrast diagrams that print or screenshot cleanly.' },
  { emoji:'🎨', text:"Turn on “Use Aquila Kid's string colours” in Options to draw each string in its own colour — handy for teaching beginners." },
  { emoji:'🔗', chordsOnly:true, text:'Open the Share menu for a link to just the song, just these chords, or the whole app.' },
  { emoji:'🎼', text:'The + and − buttons beside the input transpose: they shift every chord — or the scale — up or down in semitones, so you never retype a thing.' },
  { emoji:'📥', chordsOnly:true, text:'Each chord card has a ⋯ menu — copy or download the diagram as PNG or SVG, or grab a link straight to that chord.' },
  { emoji:'📸', text:'Turn off “Show chord card controls” in Options to hide play buttons and arrows before you screenshot.' },
  { emoji:'🖼️', chordsOnly:true, text:'“Copy all charts as one image” in the Share menu combines every diagram on the page into a single picture, ready to paste anywhere.' },
  { emoji:'🧩', chordsOnly:true, text:"Switch on “Masonry layout” below the chart to pack chord cards together tightly instead of leaving gaps when they're different heights." },
  { emoji:'🔍', chordsOnly:true, text:'Raise “Search up to fret” in the voicing chooser — tap the number between a card\'s arrows — to unlock alternate voicings further up the neck.' },
  { emoji:'📏', chordsOnly:true, text:'Fingers too short? Lower “Max stretch” in the voicing chooser to skip voicings that need a wide stretch.' },
  { emoji:'🔇', chordsOnly:true, text:'Power chords hard to finger? Switch on “Allow muted strings” in the voicing chooser and two- and three-note chords can skip strings instead of doubling notes.' },
  { emoji:'🗺️', scalesOnly:true, text:'Switch “Show” to “Whole neck” below the chart for every note of the scale from the nut to the 15th fret, laid out along the neck.' },
];

// a shuffled bag (not plain Math.random each time) so every tip is seen before any repeat
let tipQueue = [];
let tipLastIndex = -1;
function nextTipIndex(){
  const scales = currentMode === 'scales';
  const eligible = i => !(scales ? TIPS[i].chordsOnly : TIPS[i].scalesOnly);
  tipQueue = tipQueue.filter(eligible);
  if(!tipQueue.length){
    tipQueue = TIPS.map((_, i)=>i).filter(eligible);
    for(let i = tipQueue.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [tipQueue[i], tipQueue[j]] = [tipQueue[j], tipQueue[i]];
    }
    if(tipQueue.length > 1 && tipQueue[0] === tipLastIndex){
      [tipQueue[0], tipQueue[1]] = [tipQueue[1], tipQueue[0]];
    }
  }
  tipLastIndex = tipQueue.shift();
  return tipLastIndex;
}

const tipToast = document.getElementById('tipToast');
const tipToastBody = document.getElementById('tipToastBody');
const tipToastEmoji = document.getElementById('tipToastEmoji');
const tipToastText = document.getElementById('tipToastText');
const tipFabBtn = document.getElementById('tipFabBtn');

// shared by the toast's single slot and the "all tips" modal's list items
function fillTipText(container, tip){
  container.replaceChildren();
  if(tip.text){
    container.textContent = tip.text;
    return;
  }
  const pointer = document.createElement('span');
  pointer.className = 'tip-pointer-text';
  pointer.textContent = tip.pointerText;
  const touch = document.createElement('span');
  touch.className = 'tip-touch-text';
  touch.textContent = tip.touchText;
  container.append(pointer, touch);
}

function renderTip(index){
  const tip = TIPS[index];
  tipToastEmoji.textContent = tip.emoji;
  fillTipText(tipToastText, tip);
}

function cycleTip(){
  if(TIPS_REDUCED_MOTION){ renderTip(nextTipIndex()); return; }
  if(tipToastBody.classList.contains('tip-anim-out')) return;
  tipToastBody.classList.add('tip-anim-out');
  setTimeout(()=>{
    renderTip(nextTipIndex());
    tipToastBody.classList.remove('tip-anim-out');
    tipToastBody.classList.add('tip-anim-in-start');
    void tipToastBody.offsetWidth; // force reflow so removing this class below animates back in
    tipToastBody.classList.remove('tip-anim-in-start');
  }, 160);
}

function openTipToast(){
  if(!tipToast.hidden) return; // e.g. the delayed auto-show firing after the user already opened it by hand
  renderTip(nextTipIndex());
  tipToast.hidden = false;
  tipFabBtn.setAttribute('aria-expanded', 'true');
  document.addEventListener('click', onTipDocClick);
}
function closeTipToast(){
  if(tipToast.hidden) return;
  tipToast.hidden = true;
  tipFabBtn.setAttribute('aria-expanded', 'false');
  document.removeEventListener('click', onTipDocClick);
}
function onTipDocClick(e){
  // a click inside the "all tips" modal (spawned from the toast) isn't "outside" the toast
  if(!tipToast.contains(e.target) && !tipFabBtn.contains(e.target) && !tipsModalEl.contains(e.target)){
    // clicking a focusable outside element (e.g. the chord input) already moved focus there —
    // only steal it back to the fab if closing would otherwise drop it onto hidden content
    const focusWasInToast = tipToast.contains(document.activeElement);
    closeTipToast();
    if(focusWasInToast) tipFabBtn.focus();
  }
}
tipFabBtn.addEventListener('click', ()=>{
  tipToast.hidden ? openTipToast() : closeTipToast();
});
function onTipEscape(e){
  if(e.key === 'Escape'){ closeTipToast(); tipFabBtn.focus(); }
}
// focus can sit on the fab (just clicked) or inside the toast (tabbed in) — listen on both
tipFabBtn.addEventListener('keydown', onTipEscape);
tipToast.addEventListener('keydown', onTipEscape);
document.getElementById('tipToastClose').addEventListener('click', ()=>{
  closeTipToast();
  tipFabBtn.focus();
});
document.getElementById('tipToastNext').addEventListener('click', cycleTip);
document.getElementById('tipToastOptOut').addEventListener('click', ()=>{
  try{ localStorage.setItem(TIPS_OPT_OUT_KEY, 'true'); }catch(err){}
  closeTipToast();
  tipFabBtn.focus();
});

// --- "all tips" modal: a static reference list, built once since TIPS never changes at runtime ---
const tipsModalEl = document.getElementById('tipsModal');
const tipsModalListEl = document.getElementById('tipsModalList');
TIPS.forEach(tip=>{
  const li = document.createElement('li');
  li.className = 'tips-modal-item';
  const emoji = document.createElement('span');
  emoji.className = 'tip-emoji';
  emoji.setAttribute('aria-hidden', 'true');
  emoji.textContent = tip.emoji;
  const text = document.createElement('span');
  text.className = 'tip-toast-text';
  fillTipText(text, tip);
  li.append(emoji, text);
  tipsModalListEl.appendChild(li);
});

const tipsModal = createModal(tipsModalEl, { focusFallback(){ tipFabBtn.focus(); } });
function openTipsModal(opener){
  if(tipsModal.open(opener)) document.getElementById('tipsModalClose').focus();
}
function closeTipsModal(){
  tipsModal.close();
}
document.getElementById('tipsModalClose').addEventListener('click', ()=> closeTipsModal());
document.getElementById('tipToastShowAll').addEventListener('click', e=> openTipsModal(e.currentTarget));

let tipsOptedOut = false;
try{ tipsOptedOut = localStorage.getItem(TIPS_OPT_OUT_KEY) === 'true'; }catch(err){}
if(!tipsOptedOut){
  // On a phone the toast lands on top of the builder card, so an unprompted
  // one would cover the form on arrival — there it waits for the first touch.
  if(window.matchMedia('(max-width:600px)').matches){
    let tipArmed = false;
    const armTipToast = ()=>{
      if(tipArmed) return;
      tipArmed = true;
      setTimeout(openTipToast, 900);
    };
    document.addEventListener('pointerdown', armTipToast, { once:true });
    document.getElementById('chordInput').addEventListener('input', armTipToast, { once:true });
  } else {
    setTimeout(openTipToast, 1500);
  }
}

document.getElementById('printBtn').addEventListener('click', ()=>window.print());

// --- share menu: one link per thing worth sharing (song / chord list / app) ---
const shareWrap = document.getElementById('shareWrap');
const shareBtn = document.getElementById('shareBtn');
document.getElementById('shareAppSub').textContent = window.location.host;

function shareLinkFor(params){
  const query = readableQuery(params);
  return window.location.origin + window.location.pathname + (query ? `?${query}` : '');
}

function buildShareMenu(){
  const scalesMode = currentMode === 'scales';
  const songItem = document.getElementById('shareSongItem');
  const withSong = !scalesMode && !!(activeSong && activeSong.appliedText !== null);
  songItem.hidden = !withSong;
  if(withSong){
    // version suffixes ("Wonderwall - Remastered") only add noise, as in the sheet link
    document.getElementById('shareSongLabel').textContent = `Chords of song “${activeSong.title.replace(/\s-\s.*$/,'')}”`;
    document.getElementById('shareSongSub').textContent = activeSong.artist;
  }
  // nothing drawn, nothing to put on the clipboard; the scale card's own ⋯ menu
  // covers single-tile images, so the all-charts item stays a chords affair
  document.getElementById('shareImageItem').hidden = scalesMode || !document.querySelector('#grid .card');
  const trimmed = document.getElementById('chordInput').value.trim();
  document.getElementById('shareChordsItem').hidden = scalesMode || trimmed === '';
  document.getElementById('shareChordsSub').textContent = trimmed.split(/[,\n]+/).map(t=>t.trim()).filter(Boolean).join(', ');
  const scaleText = packScaleInput(document.getElementById('scaleInput').value);
  document.getElementById('shareScaleItem').hidden = !scalesMode || scaleText === '';
  document.getElementById('shareScaleSub').textContent = formatAccidentals(scaleText);
}

const shareMenuCtl = createMenu(shareWrap, shareBtn, { onOpen: buildShareMenu });
shareWrap.addEventListener('keydown', e=>{
  if(e.key === 'Escape'){ shareMenuCtl.close(); shareBtn.focus(); }
});

// links are built at click time so they can't go stale while the menu is open
async function copyShareOption(buildParams){
  const params = buildParams();
  shareMenuCtl.close();
  // the clicked item is hidden with the menu and must not keep focus
  shareBtn.focus();
  if(!params) return;
  flashButtonText(shareBtn, await copyLinkText(shareLinkFor(params)));
}
document.getElementById('shareSongItem').addEventListener('click', ()=> copyShareOption(()=>{
  if(!activeSong) return null; // edited away while the menu was open
  const params = new URLSearchParams();
  params.set('song', activeSong.id);
  const offset = songChartOffset(document.getElementById('chordInput').value);
  if(offset) params.set('transpose', String(offset));
  params.set('tuning', selectedTuningId);
  return params;
}));
document.getElementById('shareChordsItem').addEventListener('click', ()=> copyShareOption(()=>{
  const params = new URLSearchParams();
  params.set('chords', packChordInput(document.getElementById('chordInput').value));
  params.set('tuning', selectedTuningId);
  return params;
}));
document.getElementById('shareScaleItem').addEventListener('click', ()=> copyShareOption(()=>{
  const params = new URLSearchParams();
  params.set('scale', packScaleInput(document.getElementById('scaleInput').value));
  params.set('tuning', selectedTuningId);
  return applyScaleViewParam(params);
}));
document.getElementById('shareAppItem').addEventListener('click', ()=> copyShareOption(()=> new URLSearchParams()));
// not a link, but the same intent — the feedback flashes on the Share button
// because the item it was clicked on is hidden with the menu
document.getElementById('shareImageItem').addEventListener('click', ()=>{
  shareMenuCtl.close();
  shareBtn.focus();
  copyAllChordsAsImage(shareBtn);
});

const syntaxToggleBtn = document.getElementById('syntaxToggleBtn');
const syntaxPanel = document.getElementById('syntaxPanel');
syntaxToggleBtn.addEventListener('click', ()=>{
  const open = syntaxToggleBtn.getAttribute('aria-expanded') !== 'true';
  syntaxToggleBtn.setAttribute('aria-expanded', String(open));
  syntaxPanel.setAttribute('aria-hidden', String(!open));
  syntaxPanel.classList.toggle('open', open);
});

const optionsPanel = document.getElementById('optionsPanel');
const optionsToggleBtn = document.getElementById('optionsToggleBtn');
let optionsSettleTimer = null;
optionsToggleBtn.addEventListener('click', ()=>{
  const open = !optionsPanel.classList.contains('open');
  clearTimeout(optionsSettleTimer);
  optionsPanel.classList.toggle('open', open);
  optionsToggleBtn.setAttribute('aria-expanded', String(open));
  // overflow stays hidden while the panel slides, then is released so the
  // info popovers inside can overhang the panel edge
  if(open) optionsSettleTimer = setTimeout(()=> optionsPanel.classList.add('settled'), 300);
  else optionsPanel.classList.remove('settled');
});

const chordInputEl = document.getElementById('chordInput');
let chordInputDebounce = null;
chordInputEl.addEventListener('keydown', e=>{
  if(e.key==='Enter'){ clearTimeout(chordInputDebounce); generate(); }
});
chordInputEl.addEventListener('input', ()=>{
  chordInputIsDefault = false;
  updateChordInputClearUI();
  // manual edits re-baseline the transpose control; reflect that before the debounce
  updateTransposeUI();
  resizeChordInput();
  // debounce long enough that partial tokens rarely flash a parse error
  clearTimeout(chordInputDebounce);
  chordInputDebounce = setTimeout(generate, 450);
});
// Delegated: the pills are rebuilt on every generate. The clicked one is gone
// afterwards (its chord is on the sheet now), so the keyboard is handed to
// whichever pill took its place — or to the input the pills feed once the last
// one has been taken — instead of falling back to the page.
document.getElementById('chordSuggestions').addEventListener('click', e=>{
  const row = e.currentTarget;
  const moreBtn = e.target.closest('.chord-suggestions-more');
  if(moreBtn){
    suggestionsExpanded = !suggestionsExpanded;
    row.classList.toggle('show-all', suggestionsExpanded);
    paintMoreToggle(moreBtn, row.querySelectorAll('.chord-suggestion.is-extra').length);
    return;
  }
  const btn = e.target.closest('.chord-suggestion');
  if(!btn) return;
  // collapsed extras can't take focus, so the successor is picked among the shown ones
  const shownPills = ()=> [...row.querySelectorAll('.chord-suggestion')].filter(p => p.offsetParent !== null);
  const index = shownPills().indexOf(btn);
  addSuggestedChord(btn.dataset.chord);
  const pills = shownPills();
  if(pills.length) pills[Math.min(index, pills.length - 1)].focus();
  else document.getElementById('chordInput').focus();
});
document.getElementById('chordInputClear').addEventListener('click', ()=>{
  clearTimeout(chordInputDebounce);
  const input = document.getElementById('chordInput');
  input.value = '';
  chordInputIsDefault = false;
  input.focus();
  resizeChordInput();
  generate();
});
document.getElementById('borderToggle').addEventListener('change', e=>{
  document.getElementById('grid').classList.toggle('no-border', !e.target.checked);
  saveSettings();
});
document.getElementById('cardControlsToggle').addEventListener('change', e=>{
  document.body.classList.toggle('card-controls-hidden', !e.target.checked);
  saveSettings();
});
document.getElementById('bwToggle').addEventListener('change', e=>{
  document.body.classList.toggle('bw-mode', e.target.checked);
  syncThemeUI();
  regenerate();
});
// Theme switches the page chrome only — the sheet keeps its paper palette.
// The pre-paint script in index.html applies the saved theme before first render.
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const themeToggleBtn = document.getElementById('themeToggleBtn');
function syncThemeUI(){
  const light = document.documentElement.dataset.theme === 'light';
  if(themeColorMeta){
    themeColorMeta.content = document.body.classList.contains('bw-mode') ? '#ffffff'
      : light ? '#f0e4cf' : '#191009';
  }
  // names the state it switches TO, matching the sun/moon icon shown
  const label = light ? 'Switch to dark theme' : 'Switch to light theme';
  themeToggleBtn.setAttribute('aria-label', label);
  themeToggleBtn.title = label;
}
syncThemeUI();
themeToggleBtn.addEventListener('click', ()=>{
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try{ localStorage.setItem('chords-theme', next); }catch(err){}
  syncThemeUI();
});
document.getElementById('rootToggle').addEventListener('change', regenerate);
document.getElementById('rootRunToggle').addEventListener('change', regenerate);
document.getElementById('simplifyAccidentalsToggle').addEventListener('change', regenerate);
document.getElementById('noteNamesToggle').addEventListener('change', e=>{
  noteNamesByMode[currentMode] = e.target.checked;
  regenerate();
});
document.getElementById('aquilaToggle').addEventListener('change', regenerate);
document.getElementById('autoColumnsToggle').addEventListener('change', e=>{
  columnsValue = e.target.checked ? 'auto' : currentRenderedColumns();
  updateColumnsUI(true);
  scheduleGenerate();
});
initStepper('columns', stepColumns);
function updateMasonryLabel(animate){
  setLabelText(document.getElementById('masonryLabel'),
    document.getElementById('masonryToggle').checked ? 'Masonry layout' : 'Table layout', animate);
}
document.getElementById('masonryToggle').addEventListener('change', ()=>{
  updateMasonryLabel(true);
  generate();
});
document.getElementById('omitToggle').addEventListener('change', generate);
initStepper('threshold', stepThreshold);
initStepper('transpose', stepTranspose);
document.getElementById('transposeValue').addEventListener('click', ()=>{
  setTransposeOffset(0);
  // the reset control disables itself at 0; keep focus inside the stepper
  document.getElementById('transposePlus').focus();
});

// --- song search (companion backend: chord-charts-song-backend) ---
// The whole feature is optional: it appears only when the backend's /healthz
// answers, so the app works unchanged when the API is down or absent.
// The deployed API allows localhost origins, so dev checkouts work against it
// with no local setup; ?songApi=http://localhost:8787 targets a local backend.
const SONG_API_BASE = (new URLSearchParams(window.location.search).get('songApi')
  || 'https://songsearch.chords.wbou.dev').replace(/\/+$/,'');
const SONG_SEARCH_SEEN_KEY = 'chordChartGenerator.songSearchSeen';

// The song the current chart came from, carried in the URL as ?song=<id> so
// the chart can be linked and re-shared with its attribution. appliedText is
// the exact chord-input text the song produced — while the input still matches
// it (allowing whole-chart transposition) the URL stays in song mode. Seeded
// from the URL (appliedText null = fetch pending) before the first generate()
// so the param survives loading.
const songParam = new URLSearchParams(window.location.search).get('song');
// Captured now because applySong's own generate() rewrites the URL (and drops
// ?transpose=) before the restore gets to apply it. Parsed strictly — parseInt
// alone would accept "3.5" or "3abc" from a hand-edited URL.
const songTransposeRaw = new URLSearchParams(window.location.search).get('transpose') || '';
const songTransposeParam = /^-?\d{1,2}$/.test(songTransposeRaw) ? parseInt(songTransposeRaw, 10) : NaN;
let activeSong = songParam ? { id: songParam, appliedText: null } : null;

// A song link owns the chart: drop chords pre-seeded from localStorage or a
// hand-crafted ?chords= so an unrelated chart never renders in song mode —
// the empty state shows until the song lands (or fails, beside the note).
// Flagged default so the transient empty input is not persisted over the
// visitor's stored chords.
if(songParam){
  chordInputEl.value = '';
  chordInputIsDefault = true;
}

// The transpose offset at which the chart is still exactly the active song
// (0 = as loaded), or null when there is no active song or the chart diverged
// beyond a whole-chart transposition.
function songChartOffset(chordInputValue){
  if(!activeSong) return null;
  if(activeSong.appliedText === null) return 0; // fetch pending — trust the param
  const offset = currentTransposeOffset();
  const baseText = (offset !== 0 && transposeState) ? transposeState.baseText : chordInputValue;
  return baseText === activeSong.appliedText ? offset : null;
}

const songSearchFieldEl = document.getElementById('songSearchField');
const songSearchOpenBtn = document.getElementById('songSearchOpenBtn');
const songDataFooterEl = document.getElementById('songDataFooter');
const songSearchInputEl = document.getElementById('songSearchInput');
const songSearchResultsEl = document.getElementById('songSearchResults');
const songSearchNoteEl = document.getElementById('songSearchNote');
let songSearchItems = [];
let songSearchActive = -1;
let songSearchDebounce = null;
let songSearchInflight = null; // AbortController — every keystroke cancels the previous request
let songLoadInflight = null; // AbortController — a newer selection or a manual edit cancels a pending song load

// Two independent gates on the song field: whether the backend offers it at all
// (the chips), and whether the user has asked for it (the field itself).
let songBackendReady = false;
let sheetChords = [];

function setSongSearchVisible(visible){
  songBackendReady = visible;
  songSearchOpenBtn.hidden = !visible;
  // the dataset attribution belongs to the feature, not the base app
  songDataFooterEl.hidden = !visible;
  // reverse search rides the same backend, so it appears and vanishes with it
  updateReverseSearchBtn();
  // …including a dialog opened during the localStorage pre-reveal, should the
  // healthz check later gate the feature off
  if(!visible){ setSongSearchExpanded(false); closeReverseModal(); }
  try{
    if(visible) localStorage.setItem(SONG_SEARCH_SEEN_KEY, 'true');
    else localStorage.removeItem(SONG_SEARCH_SEEN_KEY);
  }catch(err){}
}

// The inverse lookup answers "what else uses these?" — with nothing on the
// sheet to look up, it would open onto an empty query. The button spells the
// chords out so it names its own query; past this many the label is a wall of
// text nobody reads, ellipsis or not.
const REVERSE_LABEL_CHORDS = 6;
function updateReverseSearchBtn(chordLabels){
  if(Array.isArray(chordLabels)) sheetChords = chordLabels;
  const btn = document.getElementById('reverseSearchBtn');
  btn.hidden = !songBackendReady || sheetChords.length < 2;
  if(btn.hidden) return;
  const named = sheetChords.slice(0, REVERSE_LABEL_CHORDS).map(formatAccidentals).join(', ');
  const rest = sheetChords.length > REVERSE_LABEL_CHORDS ? ', …' : '';
  document.getElementById('reverseSearchLabel').textContent = `Find songs using chords ${named}${rest}`;
}

function setSongSearchExpanded(open){
  songSearchFieldEl.hidden = !open;
  songSearchOpenBtn.setAttribute('aria-expanded', String(open));
  if(!open) closeSongResults();
}

songSearchOpenBtn.addEventListener('click', ()=>{
  const open = songSearchFieldEl.hidden;
  setSongSearchExpanded(open);
  if(open) songSearchInputEl.focus();
  else songSearchOpenBtn.focus();
});

function setSongNote(text){ songSearchNoteEl.textContent = text || ''; }

function closeSongResults(){
  songSearchResultsEl.hidden = true;
  songSearchResultsEl.innerHTML = '';
  songSearchItems = [];
  songSearchActive = -1;
  songSearchInputEl.setAttribute('aria-expanded','false');
  songSearchInputEl.removeAttribute('aria-activedescendant');
}

function setSongActive(i){
  songSearchActive = i;
  [...songSearchResultsEl.children].forEach((li,j)=> li.classList.toggle('active', j===i));
  if(i >= 0){
    songSearchInputEl.setAttribute('aria-activedescendant', `songSearchOption${i}`);
    const li = songSearchResultsEl.children[i];
    if(li) li.scrollIntoView({ block:'nearest' });
  } else {
    songSearchInputEl.removeAttribute('aria-activedescendant');
  }
}

function renderSongResults(){
  songSearchResultsEl.innerHTML = '';
  songSearchItems.forEach((song,i)=>{
    const li = document.createElement('li');
    li.id = `songSearchOption${i}`;
    li.setAttribute('role','option');
    const title = document.createElement('span');
    title.className = 'song-result-title';
    title.textContent = song.title;
    const artist = document.createElement('span');
    artist.className = 'song-result-artist';
    artist.textContent = song.artist;
    li.append(title, artist);
    const metaText = [song.decade ? `${song.decade}s` : null, song.main_genre].filter(Boolean).join(' · ');
    if(metaText){
      const meta = document.createElement('span');
      meta.className = 'song-result-meta';
      meta.textContent = metaText;
      li.appendChild(meta);
    }
    // pointerdown fires before the input's blur, so the tap/click always lands
    li.addEventListener('pointerdown', e=>{ e.preventDefault(); selectSong(song); });
    li.addEventListener('mousemove', ()=> setSongActive(i));
    songSearchResultsEl.appendChild(li);
  });
  songSearchResultsEl.hidden = songSearchItems.length === 0;
  songSearchInputEl.setAttribute('aria-expanded', String(songSearchItems.length > 0));
  setSongActive(songSearchItems.length ? 0 : -1);
}

async function searchSongs(q){
  if(songSearchInflight) songSearchInflight.abort();
  const ctrl = new AbortController();
  songSearchInflight = ctrl;
  try{
    const res = await fetch(`${SONG_API_BASE}/api/search?q=${encodeURIComponent(q)}&limit=8`, { signal: ctrl.signal });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const found = await res.json();
    if(ctrl !== songSearchInflight) return; // a newer keystroke superseded this response
    songSearchItems = found;
    renderSongResults();
    setSongNote(found.length ? '' : 'No matching songs.');
  }catch(err){
    if(err.name === 'AbortError') return;
    closeSongResults();
    setSongNote('Song search is unavailable right now.');
  }
}

async function selectSong(song){
  // cancel anything that could reopen the list after the choice is made:
  // a debounce that hasn't fired yet, or a search still in flight
  clearTimeout(songSearchDebounce);
  if(songSearchInflight){ songSearchInflight.abort(); songSearchInflight = null; }
  // a slower earlier selection must not overwrite this one
  if(songLoadInflight) songLoadInflight.abort();
  const ctrl = new AbortController();
  songLoadInflight = ctrl;
  closeSongResults();
  songSearchInputEl.value = `${song.artist} — ${song.title}`;
  setSongNote('Loading song…');
  try{
    const res = await fetch(`${SONG_API_BASE}/api/songs/${encodeURIComponent(song.id)}`, { signal: ctrl.signal });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const full = await res.json();
    if(ctrl !== songLoadInflight) return; // superseded while the body streamed
    songLoadInflight = null;
    applySong(full, song.id);
  }catch(err){
    if(err.name === 'AbortError') return; // superseded — the newer action owns the UI
    if(ctrl === songLoadInflight) songLoadInflight = null;
    setSongNote('Could not load that song — please try again.');
  }
}

function applySong(full, songId){
  // a shared ?song= link lands here without the field ever being opened by hand;
  // the note below it (what loaded, what didn't, where to hear it) needs it shown
  setSongSearchExpanded(true);
  // "unmapped" symbols never reach the chord input — the parser would reject them
  if(!Array.isArray(full.chords) || !full.chords.length){
    setSongNote(`No playable chords found for ${full.artist} — ${full.title}.`);
    return;
  }
  const text = full.chords.join(', ');
  // before generate(), so updateURLParam writes the ?song= param
  activeSong = { id: songId, appliedText: text, artist: full.artist, title: full.title };
  clearTimeout(chordInputDebounce); // a half-typed manual edit must not overwrite the song
  chordInputEl.value = text;
  chordInputIsDefault = false;
  resizeChordInput();
  generate();
  const notes = [`Loaded ${full.artist} — ${full.title}: ${full.chords.length} chord${full.chords.length === 1 ? '' : 's'}.`];
  if(Array.isArray(full.unmapped) && full.unmapped.length){
    notes.push(`In the song but not renderable here: ${full.unmapped.join(', ')}.`);
  }
  setSongNote(notes.join(' '));
  const links = [];
  if(full.spotify_song_id){
    links.push({ label:'Listen on Spotify', href:`https://open.spotify.com/track/${encodeURIComponent(full.spotify_song_id)}` });
  }
  // version suffixes ("Wonderwall - Remastered") only hurt the sheet search
  const sheetQuery = `${full.artist} ${full.title.replace(/\s-\s.*$/,'')}`;
  links.push({ label:'Chord sheet on Ultimate Guitar', href:`https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(sheetQuery)}` });
  links.forEach(link=>{
    songSearchNoteEl.append(' · ');
    const a = document.createElement('a');
    a.href = link.href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = link.label;
    songSearchNoteEl.appendChild(a);
  });
}

songSearchInputEl.addEventListener('input', ()=>{
  const q = songSearchInputEl.value.trim();
  clearTimeout(songSearchDebounce);
  if(q.length < 2){
    if(songSearchInflight){ songSearchInflight.abort(); songSearchInflight = null; }
    closeSongResults();
    setSongNote('');
    return;
  }
  songSearchDebounce = setTimeout(()=> searchSongs(q), 180);
});

songSearchInputEl.addEventListener('keydown', e=>{
  if(songSearchResultsEl.hidden) return;
  if(e.key === 'ArrowDown'){ e.preventDefault(); setSongActive((songSearchActive+1) % songSearchItems.length); }
  else if(e.key === 'ArrowUp'){ e.preventDefault(); setSongActive((songSearchActive-1+songSearchItems.length) % songSearchItems.length); }
  else if(e.key === 'Enter'){ e.preventDefault(); if(songSearchItems[songSearchActive]) selectSong(songSearchItems[songSearchActive]); }
  else if(e.key === 'Escape'){ closeSongResults(); }
});

// the delay lets a pointerdown on a result land before the list disappears
songSearchInputEl.addEventListener('blur', ()=> setTimeout(closeSongResults, 120));

// A manual chord edit or clear makes the "Loaded …" note stale and breaks the
// chart–song association. The URL is refreshed here too because the clear
// button's own handler regenerates before this listener runs.
function clearActiveSong(){
  // a manual edit also abandons a song still loading
  if(songLoadInflight){ songLoadInflight.abort(); songLoadInflight = null; }
  if(!activeSong && !songSearchNoteEl.textContent) return;
  activeSong = null;
  setSongNote('');
  updateURLParam(chordInputEl.value);
}
chordInputEl.addEventListener('input', clearActiveSong);
document.getElementById('chordInputClear').addEventListener('click', clearActiveSong);

// --- Reverse search: find songs that use the chords currently in the input ---
const REVERSE_MAX_CHORDS = 24; // backend rejects longer queries
const reverseModalEl = document.getElementById('reverseModal');
const reverseChordsInputEl = document.getElementById('reverseChordsInput');
const reverseNoteEl = document.getElementById('reverseNote');
const reverseResultsEl = document.getElementById('reverseResults');
const reverseAnyKeyEl = document.getElementById('reverseAnyKey');
const reverseAllowExtraEl = document.getElementById('reverseAllowExtra');
let reverseInflight = null; // AbortController — toggles/close cancel a running search

if(typeof savedSettings.reverseAnyKey === 'boolean') reverseAnyKeyEl.checked = savedSettings.reverseAnyKey;
if(typeof savedSettings.reverseAllowExtra === 'boolean') reverseAllowExtraEl.checked = savedSettings.reverseAllowExtra;

// Parseable chords of a comma/newline-separated list, deduped, in typing
// order ("*" already stripped by parseChord). Unparseable tokens come back
// separately so callers can report them.
function chordLabelsFrom(text){
  const seen = new Set(); const labels = []; const bad = [];
  text.split(/[,\n]+/).map(t=>t.trim()).filter(Boolean).forEach(tok=>{
    const parsed = parseChord(tok);
    if(parsed.error){ bad.push(tok); return; }
    if(seen.has(parsed.label)) return;
    seen.add(parsed.label);
    labels.push(parsed.label);
  });
  return { labels, bad };
}

// Parse errors in the sheet input are skipped silently — its own error box
// reports them.
function currentChordLabels(){ return chordLabelsFrom(chordInputEl.value).labels; }

function setReverseNote(text, loading){
  reverseNoteEl.innerHTML = '';
  if(loading){
    const spin = document.createElement('span');
    spin.className = 'spinner';
    spin.setAttribute('aria-hidden', 'true');
    reverseNoteEl.appendChild(spin);
  }
  if(text) reverseNoteEl.appendChild(document.createTextNode(text));
}

function showReverseLoading(){
  const li = document.createElement('li');
  li.className = 'rsearch-loading';
  const spin = document.createElement('span');
  spin.className = 'spinner';
  spin.setAttribute('aria-hidden', 'true');
  li.appendChild(spin);
  reverseResultsEl.appendChild(li);
}

function renderReverseResults(songs){
  reverseResultsEl.innerHTML = '';
  songs.forEach(song=>{
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rsearch-result';
    const top = document.createElement('span');
    top.className = 'rsearch-result-top';
    // title + artist flow as one wrapping text block: long titles break onto a
    // second line instead of truncating, and the badge keeps the top right
    const heading = document.createElement('span');
    heading.className = 'rsearch-result-heading';
    const title = document.createElement('span');
    title.className = 'rsearch-result-title';
    title.textContent = song.title;
    const artist = document.createElement('span');
    artist.className = 'rsearch-result-artist';
    artist.textContent = '— ' + [song.artist, song.decade ? `${song.decade}s` : null, song.main_genre].filter(Boolean).join(' · ');
    heading.append(title, ' ', artist);
    top.append(heading);
    const extras = new Set(song.extra || []);
    const up = song.transposition > 0, abs = Math.abs(song.transposition);
    const badgeParts = [];
    // "same key" only means something when transposed matches are possible
    if(reverseAnyKeyEl.checked){
      badgeParts.push(song.transposition === 0 ? 'same key' : `${up ? '+' : '−'}${abs} semitone${abs === 1 ? '' : 's'}`);
    }
    if(extras.size) badgeParts.push(`${extras.size} extra`);
    if(badgeParts.length){
      const badge = document.createElement('span');
      badge.className = 'rsearch-result-badge' + (song.transposition === 0 && !extras.size ? ' is-same' : '');
      badge.textContent = badgeParts.join(' · ');
      if(song.transposition !== 0){
        badge.title = `Same chord relationships, ${abs} semitone${abs === 1 ? '' : 's'} ${up ? 'up' : 'down'} — shown in the song's own key`;
      }
      top.appendChild(badge);
    }
    const chords = document.createElement('span');
    chords.className = 'rsearch-result-chords';
    const addSymbol = (text, cls, tip)=>{
      if(chords.childNodes.length) chords.append(' · ');
      const s = document.createElement('span');
      if(cls) s.className = cls;
      if(tip) s.title = tip;
      s.textContent = text;
      chords.appendChild(s);
    };
    song.chords.forEach(c=> addSymbol(c,
      extras.has(c) ? 'rsearch-chord-extra' : '',
      extras.has(c) ? 'Not in your selection'
        // matching ignores the slash bass — spell that out where it shows
        : (c.includes('/') ? `Counts as ${c.split('/')[0]} — the note after the slash is just the bass` : '')));
    (song.unmapped || []).forEach(c=> addSymbol(c, 'rsearch-chord-unmapped', 'In the song, but not renderable here'));
    btn.append(top, chords);
    // close first so the "Loading song…" note isn't hidden behind the backdrop
    btn.addEventListener('click', ()=>{ closeReverseModal(); selectSong(song); });
    li.appendChild(btn);
    reverseResultsEl.appendChild(li);
  });
}

// Live link to reopen this exact search — mirrors syncCustomChordShareLink,
// carried on top of whatever chart/tuning params are already in the URL.
function syncReverseShareLink(labels){
  const link = document.getElementById('reverseShareLink');
  if(!labels.length){
    link.hidden = true;
    link.removeAttribute('href');
    link.removeAttribute('title');
    return;
  }
  link.hidden = false;
  const params = new URLSearchParams(window.location.search);
  params.set('findsongs', labels.join(','));
  link.href = window.location.pathname + '?' + params.toString();
  link.title = `Open a link to this search for ${labels.join(', ')} in a new tab`;
}

async function runReverseSearch(){
  if(reverseInflight) reverseInflight.abort();
  reverseInflight = null; // non-null must mean a request is actually in flight
  reverseResultsEl.innerHTML = '';
  const { labels, bad } = chordLabelsFrom(reverseChordsInputEl.value);
  const capped = labels.slice(0, REVERSE_MAX_CHORDS);
  syncReverseShareLink(capped);
  const notes = [];
  if(bad.length) notes.push(`Could not parse ${bad.map(t=>`“${t}”`).join(', ')} — skipped.`);
  if(!labels.length){
    setReverseNote(notes.concat('Enter some chords first.').join(' '));
    return;
  }
  const ctrl = new AbortController();
  reverseInflight = ctrl;
  const anyKey = reverseAnyKeyEl.checked;
  const allowExtra = reverseAllowExtraEl.checked;
  setReverseNote('Searching…', true);
  showReverseLoading();
  try{
    const params = new URLSearchParams({
      // sorted for the 5-minute HTTP cache: same set, same URL
      chords: [...capped].sort().join(','),
      mode: allowExtra ? 'contains' : 'playable',
      transpose: anyKey ? 'any' : 'same',
      limit: '20',
    });
    const res = await fetch(`${SONG_API_BASE}/api/search-by-chords?${params}`, { signal: ctrl.signal });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const found = await res.json();
    if(ctrl !== reverseInflight) return; // superseded by a toggle change
    reverseInflight = null;
    renderReverseResults(found);
    if(labels.length > capped.length) notes.push(`Searching with the first ${REVERSE_MAX_CHORDS} of ${labels.length} chords.`);
    if(!found.length){
      if(!allowExtra) notes.push('No songs use only these chords — try “Allow extra chords”.');
      else if(!anyKey) notes.push('Nothing in this exact key — try “Allow transposition”.');
      else notes.push('No songs found for this chord set.');
    }
    setReverseNote(notes.join(' '));
  }catch(err){
    if(err.name === 'AbortError') return;
    if(ctrl === reverseInflight) reverseInflight = null;
    reverseResultsEl.innerHTML = '';
    setReverseNote('Song search is unavailable right now.');
  }
}

const reverseModal = createModal(reverseModalEl, {
  // an open info popover swallows the first Escape; closing it through its
  // own toggle lets setupInfoPopover also detach its document click listener
  onEscape(){
    const openWrap = reverseModalEl.querySelector('.switch-wrap.open');
    if(openWrap){ openWrap.querySelector('.info-btn').click(); return true; }
    return false;
  },
  onClose(){
    if(reverseInflight){ reverseInflight.abort(); reverseInflight = null; }
  },
  // the opener may have been gated off with the feature — never drop focus on <body>
  focusFallback(){ chordInputEl.focus(); },
});

// Opened from the button, the editable query starts as the sheet's chords;
// a ?findsongs= link passes seedFromSheet=false to keep the linked ones.
// Either way the open itself is an explicit search request — after that the
// (expensive) search only re-runs on Search/Enter or an option change, never
// while typing.
function openReverseModal(seedFromSheet){
  if(seedFromSheet !== false) reverseChordsInputEl.value = currentChordLabels().join(', ');
  reverseModal.open();
  document.getElementById('reverseModalClose').focus();
  runReverseSearch();
}

function closeReverseModal(){
  reverseModal.close();
}

setupInfoPopover('reverseAnyKeyInfoWrap', 'reverseAnyKeyInfoBtn');
document.getElementById('reverseSearchBtn').addEventListener('click', ()=> openReverseModal());
document.getElementById('reverseSubmitBtn').addEventListener('click', ()=> runReverseSearch());
reverseChordsInputEl.addEventListener('keydown', e=>{
  if(e.key === 'Enter'){ e.preventDefault(); runReverseSearch(); }
});
document.getElementById('reverseModalClose').addEventListener('click', ()=> closeReverseModal());
[reverseAnyKeyEl, reverseAllowExtraEl].forEach(el=> el.addEventListener('change', ()=>{
  saveSettings();
  if(!reverseModalEl.hidden) runReverseSearch();
}));

// Reveal only when the backend answers. A previous sighting (localStorage)
// pre-reveals so repeat visitors don't see the builder jump on every load.
try{
  if(localStorage.getItem(SONG_SEARCH_SEEN_KEY) === 'true') setSongSearchVisible(true);
}catch(err){}
(async ()=>{
  try{
    // AbortSignal.timeout is missing in pre-2022 browsers — better an untimed
    // check than hiding the feature over a healthy backend
    const signal = AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined;
    const res = await fetch(`${SONG_API_BASE}/healthz`, { signal });
    const body = res.ok ? await res.json() : null;
    setSongSearchVisible(!!(body && body.ok));
  }catch(err){
    setSongSearchVisible(false);
  }
})();

// ?song=<id> restores a shared song link by loading the song itself. The load
// registers as songLoadInflight like a search selection, so a newer selection
// or a manual edit aborts it instead of being overwritten by it. On failure
// the param is kept so a reload retries.
if(songParam) (async ()=>{
  const ctrl = new AbortController();
  songLoadInflight = ctrl;
  try{
    const res = await fetch(`${SONG_API_BASE}/api/songs/${encodeURIComponent(songParam)}`, { signal: ctrl.signal });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const full = await res.json();
    if(ctrl !== songLoadInflight) return; // superseded while the body streamed
    songLoadInflight = null;
    if(!activeSong || activeSong.id !== songParam) return;
    setSongSearchVisible(true); // an answering song fetch proves the backend is up
    if(!songSearchInputEl.value) songSearchInputEl.value = `${full.artist} — ${full.title}`;
    applySong(full, songParam);
    // ?transpose= restores the sharer's key — only on top of a successful apply
    // (appliedText stays null when the song had no playable chords)
    if(activeSong && activeSong.appliedText !== null && Number.isInteger(songTransposeParam) && songTransposeParam !== 0){
      setTransposeOffset(songTransposeParam);
    }
  }catch(err){
    if(err.name === 'AbortError') return; // superseded — the newer action owns the UI
    if(ctrl === songLoadInflight) songLoadInflight = null;
    if(activeSong && activeSong.id === songParam){
      // A dead backend fails this fetch and the healthz check alike, and that
      // check gates the field's opener away — so expanding it here would strand
      // it open with nothing to close it. Then the builder's own error line
      // carries the message, which is on screen either way.
      const note = 'Could not load the linked song — please try again.';
      if(songBackendReady){
        setSongSearchExpanded(true);
        setSongNote(note);
      } else {
        document.getElementById('errorBox').textContent = note;
      }
    }
  }
})();

updateColumnsUI();
updateMasonryLabel();
updateChooserMasonryLabel();
updateThresholdUI();
resizeChordInput();
let chordInputResizeTimer = null;
window.addEventListener('resize', ()=>{
  clearTimeout(chordInputResizeTimer);
  // how many pills fit a line is a width question, so it is re-answered here
  chordInputResizeTimer = setTimeout(()=>{ resizeChordInput(); fitChordSuggestions(); }, 120);
});
// grid width can change without a window resize (scrollbar appearing, etc.).
// Height alone isn't a signal — it changes on every render (cards added or
// removed) and on every re-layout itself — so the observer callback ignores
// height-only notifications. A width change re-runs the column bin-packing
// (masonry column count and the mobile column cap depend on grid width) and
// then re-fits titles, whose available space depends on the column widths.
let gridRefitTimer = null;
let lastGridWidth = null;
const scheduleGridRefit = ()=>{
  clearTimeout(gridRefitTimer);
  gridRefitTimer = setTimeout(()=>{
    if(currentCardEls.length) layoutCards(currentCardEls);
    updateMasonryToggleVisibility(currentCardEls.length);
    fitCardTitles();
  }, 120);
};
if(typeof ResizeObserver === 'function'){
  new ResizeObserver(entries=>{
    const width = entries[0].contentRect.width;
    if(width === lastGridWidth) return;
    lastGridWidth = width;
    scheduleGridRefit();
  }).observe(document.getElementById('grid'));
} else {
  window.addEventListener('resize', scheduleGridRefit);
}
// both measure text, so both must re-run once the webfonts' metrics land
if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>{ fitCardTitles(); fitChordSuggestions(); });
regenerate();

// Opens the custom-chord modal pre-filled and already searched when linked
// directly, mirroring how ?chords= seeds the main sheet. The modal's grid
// always lists every match it finds, so this alone reproduces the "list all
// alternative voicings" view — there's no separate single-result mode to link to.
const notesParam = new URLSearchParams(window.location.search).get('notes');
if(notesParam && notesParam.trim()){
  // a lone trailing "*" (the known-chord "show all voicings" suffix) would
  // otherwise fail to parse as a note — strip it since every search here
  // already lists every voicing it finds
  customChordNotesInputEl.value = notesParam.trim().replace(/\*$/, '');
  // Opening this early (before the very first layout) can still measure a
  // 0-width viewport, which wrongly forces the masonry packer into a single,
  // full-bleed column — wait for a real viewport before laying out the grid.
  (function openWhenViewportReady(attemptsLeft){
    if(document.documentElement.clientWidth > 0 || attemptsLeft <= 0){
      openCustomChordModal(document.getElementById('customChordOpenBtn'));
    } else {
      requestAnimationFrame(()=> openWhenViewportReady(attemptsLeft - 1));
    }
  })(300);
}

// ?findsongs=<chords> opens the song finder pre-filled and already searched,
// mirroring ?notes= above. No need to await the healthz gate: the search
// reports an unavailable backend itself, and a failing check closes the
// dialog via setSongSearchVisible(false).
const findSongsParam = new URLSearchParams(window.location.search).get('findsongs');
if(findSongsParam && findSongsParam.trim()){
  reverseChordsInputEl.value = findSongsParam.split(',').map(t=>t.trim()).filter(Boolean).join(', ');
  openReverseModal(false);
}

// ?fretboard=<per-string frets> opens the chord namer on that exact fingering,
// mirroring ?notes= above. The board is a fixed-size scaled SVG, so unlike the
// custom-chord grid it needs no viewport-ready wait.
const fretboardParam = new URLSearchParams(window.location.search).get('fretboard');
if(fretboardParam){
  const decoded = decodeFretboardState(fretboardParam);
  if(decoded){
    fretboardIdState = decoded;
    openFretboardIdModal(document.getElementById('fretboardIdOpenBtn'));
  }
}
