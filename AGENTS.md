# AGENTS.md

- Single-file app: all HTML, CSS and JS live in `index.html`. No build step, no dependencies, no package.json.
- No test suite or linter — verify changes by serving the file and checking in a browser (see README).
- Match existing style: 2-space indent, semicolons, minimal comments (only the non-obvious "why").
- The song search box (`songSearch*` in `index.html`) talks to a separate backend at [`../chord-charts-song-backend`](../chord-charts-song-backend) (own repo, own README/IMPLEMENTATION_PLAN.md). Don't add backend logic here — the frontend only calls its HTTP API and must keep working with that API absent.
