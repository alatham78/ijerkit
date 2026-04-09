# iJerkIt

A phone-shaking arcade game. Jerk your phone up and down as fast as you can before time runs out. Top scores live on a per-duration leaderboard.

---

## How to Play

1. Pick a round length: **10**, **20**, or **30** seconds.
2. Tap **START!** (iOS users will be asked to allow motion access — tap **Allow**).
3. Wait for the **3 … 2 … 1 … GO!** countdown.
4. Shake your phone **up and down** as fast as you can.
5. When the buzzer sounds, your jerk count is locked in.
6. If you cracked the top 10 for that round length, enter your 3-letter initials arcade-style.

---

## Running Locally

Open `index.html` directly in a desktop browser for basic testing (UI, sound, leaderboard).

**Motion sensors require HTTPS** — the DeviceMotion API is blocked on plain `http://` and on `file://` on real phones. Use [GitHub Pages](https://pages.github.com/) (or any HTTPS host) for the full experience on a device.

---

## PWA / Add to Home Screen

The app includes a Web App Manifest and a service worker. After visiting the GitHub Pages URL on your phone:

- **Android (Chrome):** tap the "Add to Home Screen" banner or use the browser menu.
- **iOS (Safari):** tap the Share icon → "Add to Home Screen".

The app will then launch full-screen, portrait-locked, with no browser chrome.

---

## One-Time Icon Setup

The repository includes `icon.svg` (used directly) but the PWA manifest also references `icon-192.png` and `icon-512.png`. Generate them once:

1. Open `generate-icons.html` in any browser.
2. Two PNG files will download automatically.
3. Move them to the project root alongside `index.html`.
4. Commit them.

---

## File Structure

```
ijerkit/
├── index.html          — app shell (all screens)
├── styles.css          — arcade dark-theme styles
├── app.js              — game logic, motion detection, audio, leaderboard
├── manifest.json       — PWA manifest
├── sw.js               — cache-first service worker
├── icon.svg            — vector icon (used by manifest + favicon)
├── icon-192.png        — PWA icon 192×192 (generate via generate-icons.html)
├── icon-512.png        — PWA icon 512×512 (generate via generate-icons.html)
├── generate-icons.html — one-time icon PNG generator (not part of the app)
├── .gitignore
└── README.md
```

---

## Motion Detection Details

- Uses the [DeviceMotion API](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent).
- Reads the **Y-axis** linear acceleration (up/down when holding phone portrait).
- Prefers `event.acceleration` (browser-provided gravity removal); falls back to a rolling low-pass filter on `event.accelerationIncludingGravity`.
- A jerk is counted when Y acceleration exceeds **15 m/s²** (roughly 1.5× gravity — a deliberate shake, not normal movement).
- A 300 ms debounce prevents one motion from counting twice.
- Only the **upstroke** is counted, so one full up-then-down motion = 1 jerk.

---

## Settings / Resetting Scores

Tap the **⚙** gear icon on the menu screen → **Reset All Scores** to wipe all three leaderboards from localStorage.

---

## Browser Support

| Browser | Motion | Vibration | Notes |
|---------|--------|-----------|-------|
| Android Chrome | ✅ | ✅ | Full support |
| iOS Safari 13+ | ✅* | ❌ | *Permission prompt required; Vibration API ignored |
| iOS Safari <13 | ✅ | ❌ | DeviceMotion works without permission prompt |
| Desktop Chrome | — | — | No motion sensor; UI and sound still work |

---

## License

MIT
