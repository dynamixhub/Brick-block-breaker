# Brick Breaker

A classic brick-breaker arcade game by Dynamix Studio — power-ups, a
level ladder, an in-game shop, rewarded ads, and a 7-day daily login
bonus. Built with plain HTML5 canvas, CSS and JavaScript — no framework,
no build step.

## Files

```
brick-breaker/
├── index.html      # structure only, links the two files below
├── css/
│   └── style.css   # theme (flat dark, no neon)
└── js/
    └── game.js      # all game logic
```

## Running it locally

No install, no build. Any static file server works, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed local URL. This needs the whole `brick-breaker`
folder open as a project (not just `index.html` on its own) — the CSS and
JS are in separate files, so a single-file preview won't find them.

## Controls

- **Drag / move your mouse or finger** left-right to steer the paddle
- **Tap anywhere on the canvas** to set the paddle's position instantly
- Clear every brick on a level to advance; you have 3 lives (hearts) per
  level

## Features

- **20 levels**, generated from a small difficulty table — more rows,
  tougher multi-hit bricks, and a faster ball as you go
- **Power-ups** dropped from broken bricks, each with its own hand-drawn
  icon (no emoji): Multi-Ball, Paddle Extension, Slow-Motion, Fire-Ball
- **Shop**: unlock new ball/paddle skins and currency packs with coins
  and diamonds earned from play
- **Rewarded ads**: every shop purchase is gated behind a short ad
  before it completes; a "Watch Ad" button on the lobby gives a flat
  coin bonus any time
- **7-day daily login track**: a calendar-style popup and a persistent
  lobby card show today's reward, with bigger payouts (including
  diamonds) the longer your streak runs
- **Sound effects and music cues** — all generated in the browser with
  the Web Audio API, no audio files to host

## Publishing with real ads

`js/game.js` has one function, `showAd(...)`, that every rewarded-ad
moment in the game calls through. Right now it's a 5-second countdown
standing in for a real ad. To go live:

1. Pick a rewarded-ad network for web games (e.g. AppLixir, Adsterra's
   Rewarded Video), or publish through a portal like CrazyGames/Poki/
   GameDistribution that supplies its own ad SDK.
2. Replace the body of `showAd()` with that network's call.
3. Call the function's `onDone()` callback **only** from the ad
   network's own "ad completed / reward earned" event — never from a
   skip/close event, or purchases and rewards could be claimed without
   actually watching anything.

Nothing else in the file needs to change — every purchase and the
lobby's "Watch Ad" button already go through this one function.

For plain banner ads (not rewarded), Google AdSense works normally —
add its script tag and `<ins>` ad units to `index.html`, placed outside
the `.app` / canvas area so they never overlap the game.

## Deploying to GitHub Pages

1. Push this folder to a new GitHub repo.
2. **Settings → Pages → Source → Deploy from a branch**, pick `main`
   and `/ (root)`, save.
3. Live at `https://<your-username>.github.io/<repo-name>/`.

```bash
git init
git add .
git commit -m "Brick Breaker"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## Save data

Progress (coins, diamonds, unlocked cosmetics, level progress, high
score, login streak) is stored in the browser's `localStorage` under
`brickBreakerSave.v2` — it's per-browser/per-device, nothing is sent
anywhere.
