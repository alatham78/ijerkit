# iJerkIt — Claude Code Project Instructions

## Project context
iJerkIt is a Progressive Web App that measures how fast a user can shake their phone up and down within a chosen time window (10, 20, or 30 seconds). It's hosted on GitHub Pages, runs as a static site, and is also a learning project for me — I'm an enterprise architect returning to hands-on coding after years away.

## Tech stack and constraints
- **Vanilla HTML, CSS, and JavaScript only.** No frameworks (no React, Vue, Svelte, etc.). No build step. No bundlers. No transpilation. No npm dependencies of any kind.
- **Static hosting on GitHub Pages.** No backend, no server-side code, no API calls to external services. Everything must work as plain files served over HTTPS.
- **PWA via service worker and manifest.** The app must remain installable and work offline.
- **localStorage for persistence.** No cookies, no IndexedDB unless there's a strong reason.
- **Mobile-first.** Desktop is for development and testing only — design and tune for phones.

## File structure
- `index.html` — single page, multiple screen divs toggled by JS
- `app.js` — game state machine, motion detection, audio, leaderboard
- `styles.css` — all styling
- `sw.js` — service worker (network-first for HTML/CSS/JS, cache-first for icons)
- `manifest.json` — PWA manifest
- `icon.svg`, `icon-192.png`, `icon-512.png` — app icons

## Important constants
The accelerometer detection uses two tunable constants at the top of `app.js`:
- `JERK_THRESHOLD` (currently around 15 m/s²) — minimum acceleration peak to count as a jerk
- `JERK_DEBOUNCE_MS` (currently around 100 ms) — minimum gap between counted jerks

When asked to tune detection sensitivity, always change these constants rather than restructuring the detection logic.

## Service worker caching
`sw.js` uses a `CACHE_VERSION` constant. **Whenever you make changes to `index.html`, `app.js`, `styles.css`, or `sw.js` itself, bump the version string** (e.g., `'v3'` → `'v4'`) so that deployed clients pick up the changes. Mention the bump in the commit message.

## Workflow expectations
- **Always start in Plan mode for non-trivial changes.** Describe the plan, list the files you'll touch, and wait for approval before editing.
- **Create a branch for any change beyond a one-line tweak.** Use prefixes: `feature/`, `fix/`, `chore/`, `refactor/`. Branch off `main`.
- **One logical change per commit.** If a task involves both a bug fix and a refactor, split them.
- **Commit messages in the imperative mood**, present tense ("Add scoreboard sort" not "Added scoreboard sort"). Keep the subject line under 72 characters.
- **Don't push branches automatically** — leave that to me so I can review the diff first.

## Environment
- I'm on **Windows**, working in **VS Code** with the Claude Code extension.
- Terminal commands should be **PowerShell-compatible**, not bash. Use `;` not `&&` for command chaining if needed. Use Windows-style paths in examples when paths are involved.
- Git is configured globally; no need to set user.name or user.email per repo.

## How I want you to communicate
- I'm relearning modern dev after years in architecture, and I'm coming from TFVC, not Git. **Briefly explain what you're doing and why**, especially when introducing a Git, JavaScript, or web platform concept I might not have seen.
- When you make a code change, point out which constants, functions, or sections I should look at if I want to tune or extend it later.
- If I ask for something that conflicts with the constraints in this file, push back and explain the conflict before doing it.

## Things to avoid
- Don't add analytics, telemetry, or anything that phones home.
- Don't suggest "let's add a backend" or "let's use Firebase" — keep it static.
- Don't add testing frameworks. If a function needs verification, write a tiny inline test in a `<script>` block I can run manually.
- Don't restructure the project into folders (`src/`, `dist/`, etc.) unless I explicitly ask.