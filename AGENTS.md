# AGENTS.md

- Static ES-module app, no build step: `index.html` (markup) + `css/app.css` + `js/` modules. No runtime dependencies and no `node_modules` — `package.json` exists only to mark ESM and hold the test script. Don't add dependencies or a bundler.
- Module boundaries: `js/theory.js` (chord parsing, voicing search, transposition) and `js/diagram.js` (SVG rendering) are pure and covered by `tests/` — keep them free of DOM access and extend the tests when changing them. `js/ui.js` holds the shared modal/menu/stepper primitives; new dialogs and steppers must use them instead of hand-rolling lifecycles. `js/app.js` is feature logic and DOM wiring.
- Run `npm test` (Node's built-in runner, nothing to install) and verify in a served browser (`python3 -m http.server` — ES modules don't load from `file://`).
- Match existing style: 2-space indent, semicolons, minimal comments (only the non-obvious "why").
- The song search box (`songSearch*` in `js/app.js`) calls an external API for song → chord-progression lookups; that backend is a separate, unpublished repo. Don't add backend logic here — the frontend only calls its HTTP API and must keep working with that API absent.
