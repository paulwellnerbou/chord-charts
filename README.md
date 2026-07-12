# Chord chart generator

A single-page web app that draws printable chord diagrams (fretboard finger positions) for ukulele (several tunings, plus baritone), mandolin, mandola, tenor banjo and plectrum banjo.

Live at [chords.wbou.dev](https://chords.wbou.dev/).

## Features

- Type a list of chords (e.g. `C, Am7, F, G7`) using a compact shorthand — qualities, slash/bass chords, extensions — and get a diagram for each, with alternate voicings when a chord can be fretted more than one way.
- Transpose the whole chart up or down in semitones.
- Play a chord back (Web Audio) to check it by ear.
- Print the chart, export a chord as an image, or share it via URL.
- Black & white print mode, and an "Aquila Kids" colored-string mode for teaching.
- **Song search**: search a song title to load its chord progression straight into the chart builder, instead of typing chords by hand. Backed by a companion service — see below.

## Song search

The "start from a song" search box resolves a song title to its chord progression via a companion API, backed by a chord dataset built from Chordonomicon and Spotify metadata.

The integration is optional by design: the search box only appears once that backend answers a health check, so this app works unmodified with the backend down or absent. To point it at a different backend during development, add `?songApi=http://localhost:8787` to the URL.

## Run locally

Single static file, no build step:

    python3 -m http.server

then open `http://localhost:8000`, or just open `index.html` directly in a browser.

## Deploy

GitHub Pages, serving `index.html` straight from `main`. `CNAME` holds the custom domain.
