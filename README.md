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

## Song search backend

The "start from a song" search box calls [chord-charts-song-backend](../chord-charts-song-backend), a separate Bun/TypeScript API (deployed at `songsearch.chords.wbou.dev`) that resolves a song title to its chord progression from a SQLite dataset built from Chordonomicon + Spotify metadata.

The integration is optional by design: the search box only appears once the backend's `/healthz` responds, so this app works unmodified with the backend down or absent. To point it at a local backend during development, add `?songApi=http://localhost:8787` to the URL.

## Run locally

Single static file, no build step:

    python3 -m http.server

then open `http://localhost:8000`, or just open `index.html` directly in a browser.

## Deploy

GitHub Pages, serving `index.html` straight from `main`. `CNAME` holds the custom domain.
