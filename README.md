# Chord chart generator

A single-page web app that draws printable chord diagrams (fretboard finger positions) for ukulele (several tunings, plus baritone), cavaquinho (Brazilian and Portuguese), Venezuelan cuatro, mandolin, mandola, tenor banjo, plectrum banjo and bass guitar.

Live at [chords.wbou.de](https://chords.wbou.de/).

## Features

- Type a list of chords (e.g. `C, Am7, F, G7`) using a compact shorthand — qualities, slash/bass chords, extensions — and get a diagram for each, with alternate voicings when a chord can be fretted more than one way.
- Transpose the whole chart up or down in semitones.
- Play a chord back (Web Audio) to check it by ear.
- Print the chart, export a chord as an image, or share it via URL.
- Black & white print mode, and an "Aquila Kids" colored-string mode for teaching.
- Reverse lookup, both directions: give a set of notes to get fingerings for them, or click the notes onto an interactive fretboard and let the app name the chord (with `×`/`○` for muted/open strings).
- **Scales mode**: type any scale name (with autocompletion — modes, pentatonics, blues, harmonic/melodic minor and more) and see it either as position boxes along the neck, lowest first, or as one horizontal whole-neck map from the nut to the 15th fret. Both views play back up and down, spell their notes correctly per key (F♯ major reads E♯), transpose in semitones like the chord chart, export as PNG/SVG and share via `?scale=` links.
- **Song search**: search a song title to load its chord progression straight into the chart builder, instead of typing chords by hand. Backed by a companion service — see below.

## Song search

The "start from a song" search box resolves a song title to its chord progression via a companion API, backed by a chord dataset built from Chordonomicon and Spotify metadata.

The integration is optional by design: the search box only appears once that backend answers a health check, so this app works unmodified with the backend down or absent. To point it at a different backend during development, add `?songApi=http://localhost:8787` to the URL.

## Run locally

Static files, no build step — but ES modules need a server (`file://` won't work):

    python3 -m http.server

then open `http://localhost:8000`.

## Code layout

- `index.html` — markup only
- `css/app.css` — styles
- `js/theory.js` — chord parsing, voicing search, transposition (pure, tested)
- `js/scales.js` — scale parsing, note spelling, position generation (pure, tested)
- `js/diagram.js` — SVG diagram rendering (pure, tested)
- `js/audio.js` — Web Audio playback
- `js/ui.js` — shared modal/menu/stepper primitives
- `js/app.js` — features, state and DOM wiring

## Tests

Zero dependencies — the suite runs on Node's built-in test runner:

    npm test

`package.json` exists only to mark the repo as ESM and hold that script; there is
no build step and nothing to install.

## Hosting

Plain static files with no build step — serve the repo root with any web server,
GitHub Pages included. Every path is relative, so a subdirectory works too.
