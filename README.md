# Fog & Forge

**A short-session chronic illness RPG.** By [Gracefully Glitching LLC](#entity).

> Some days the fog rolls in and the spoons run short. Tend the forge anyway — a little at a time, on your own terms.

Fog & Forge is a small, gentle role-playing game about pacing rather than pushing. You keep a forge in the fog-bound town of Emberhollow. Each in-game day is a short session: you wake, you count your **spoons** (energy, which varies day to day — the way it really does), and you spend them on a few honest actions. There is no timer, no streak to break, no boss to beat. The fog never fully clears. The story is about building something good while living inside it.

Built for **Netlify Hot App Summer** — Tier: **Game** (a playable core loop).

---

## The story

It used to lift by noon. This season it doesn't lift. You keep the forge because someone must, and because the work is one of the few things the fog can't take whole. You learn the new arithmetic of mornings: count your spoons before you count your tasks.

As you gather embers — small warm coins of the person you still are — the story opens across five chapters, from *The Morning the Fog Stayed* to *The Clearing*. You forge **Wards** from what you find: grounding stones, banked coals, a kept hearth, a name carved against the fog. None of them cures anything. Each one makes the fog a little easier to live with.

The arc is deliberately *living-with*, not *cure*. As the final chapter puts it: *you did not beat the fog; you built something good inside it.*

## Features

- **Spoon-theory core loop.** Each day grants a *variable* number of spoons (energy). Bad days are real; good days aren't guaranteed. A normal day is about 5 spoons; a clear morning 7–8; a heavy-fog day as low as 3. Wards raise your floor so your worst days are a little gentler.
- **Five actions, each with a cost and a consequence.** Gather Ore, Tend the Hearth, Venture into the Fog, Reflect, and Rest. **Rest is treated as progress, not failure** — and resting early gives a little back tomorrow.
- **The Forge.** Craft five **Wards** from ore / ember / calm. Each grants a passive benefit (spoon floor, slower fog drift, better recovery, safer venturing) and pushes the fog back when forged.
- **A five-chapter story** gated by embers gathered, plus an **unlockable journal** of in-character reflections on grief, pacing, and what "better" comes to mean.
- **A town that grows around you (world-building).** Four recurring neighbours — **Old Wren, Mirin, Bog the Ferryman, and Quill the Cartographer** — each carry a small, multi-beat story thread that advances as you tend the hearth or venture into the fog. Their threads never expire; they wait for you.
- **The Almanac.** A keepsake of the world you've built: townsfolk and their threads, a gentle six-creature **bestiary of fog "glimpses,"** wards forged, journal entries, and days kept.
- **Gentle returns, never streaks.** The first session of each real-world day brings a small warm gift ("the hearth was kept while you were away"). Missing days costs nothing — there is no streak counter and no guilt.
- **A built-in How to Play walkthrough** (auto-shown on first play, reopenable any time) that explains the spoon economy and the loop.
- **Accounts & cross-device cloud sync (optional).** Sign in once to keep a single forge across phone, laptop, and tablet. Built on the shared **Gracefully Glitching Games** account system (Cognito Hosted UI + an AWS API). **Entirely optional and inert by default** — with no backend configured the game is the original anonymous, offline, device-local experience. See [Accounts & cloud sync](#accounts--cloud-sync).
- **A living fog meter.** Fog drifts up over time and is softened by your Wards — but never reaches a fail state. There is no losing, only pacing.
- **Accessibility & comfort built in:** reduce-motion, larger-text, and higher-contrast toggles (with OS `prefers-reduced-motion` respected automatically), full keyboard navigation, ARIA live regions for the spoon count and event log, visible focus rings, and a skip link. No timers.
- **Offline-first.** Pure static HTML/CSS/JS. Without accounts, your save lives in `localStorage` on your device and nothing is sent anywhere.

## Netlify primitives used

- **Netlify static hosting** — the entire game is hand-written static assets served from the repo root; no build step.
- **`netlify.toml`** — declares the publish directory, security response headers (a strict Content-Security-Policy, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`), and cache-control for `/assets/*`.

## Accounts & cloud sync

Fog & Forge ships **anonymous and offline by default** — the standalone build at `fog-and-forge.netlify.app` has no login and saves only to the device. The account layer under `assets/js/gg/` stays completely inert until a backend is configured.

When deployed under the **shared Gracefully Glitching Games origin** (`games.gracefullyglitching.com`), it joins the same account system as the other GG games (e.g. Solitaire Sanctum), so **one sign-in covers every game** and your forge follows you across devices:

- **Auth:** Cognito Hosted UI (email + password, passwordless email OTP, or Google) via Authorization Code + PKCE. We never see passwords.
- **Sync:** your entire save is stored server-side via `PUT /saved-game`; on sign-in we pull `GET /me` and, if the cloud forge is further along than this device's, offer to restore it.
- **Shared origin = shared login:** tokens live in origin-scoped `localStorage`, so the hub and all games share one session.

To switch accounts on for a deployment, fill in the four backend values in [`assets/js/gg/config.js`](assets/js/gg/config.js) (region, userPoolId, clientId, hostedUiDomain, apiBaseUrl), register this game's callback URL in the Cognito app client, and serve it under the games origin. Full instructions are in the file's header comment.

## The Forge Market (optional, non-obtrusive monetization)

The whole game — all ten chapters, every ward, the townsfolk, the Almanac, accessibility — is **free, forever**. Monetization is strictly optional and never touches the core experience. **We never sell spoons, energy, rest, or time-skips** — in a spoon-theory game that would betray the premise.

The **Forge Market** (✦ Market in-game) offers:

- **Cosmetic themes** — three **free** palettes (Aubergine Dusk, Candlelit, Slate Hush) that work offline right now, plus a premium **Season Pack** (Spring / Summer / Autumn / Winter).
- **A catalog of optional one-time offers** (suggested pricing, easily tuned in [`data.js`](assets/js/data.js) → `OFFERS`):
  | Offer | Type | Price |
  |---|---|---|
  | Forge Lights | cosmetic | $1.99 |
  | Season Pack | cosmetic | $2.99 |
  | Letters Never Sent | expansion (bonus chapters/thread) | $4.99 |
  | The Far Fog | expansion (new region/glimpses/ward) | $4.99 |
  | Lantern-keeper Bundle | bundle | $9.99 |
  | Cross-game Supporter | perks across all GG games | $14.99 |
- **A tip jar** (Ko-fi) on every screen — pay-what-you-want, dismissable.
- **Giveaway / share-to-win codes** — a redeem field for promo codes (e.g. rewards for sharing GG posts) that unlock items free.

**How the gating works (no client-side bypass):** free themes apply locally and instantly. Premium items require an **entitlement on your account** (`GET /me` returns owned SKUs), purchases run through the shared GG **Stripe `/checkout`**, and codes through **`/redeem`** — so paid content can't be unlocked by editing the JavaScript. All of it is **inert until the backend is configured** (`assets/js/gg/config.js`), exactly like sign-in; the standalone build shows the free themes and an honest "coming soon" on paid items. Content expansions are listed as genuine upcoming offers, never faked as finished.

## Local setup

No build tools, no dependencies. Any static file server works.

```bash
# from the FogForge/ directory
python -m http.server 8754
# then open http://localhost:8754
```

Or with Node:

```bash
npx serve .
```

You can also just open `index.html` directly in a browser — though serving over `http://` is recommended so `localStorage` and the relative asset paths behave exactly as they do in production.

## Deployment notes

This is a zero-config Netlify static deploy:

1. Point Netlify at this directory (`FogForge/`).
2. **Build command:** *(none)* — leave empty.
3. **Publish directory:** `.` (set in `netlify.toml`).
4. Deploy. Netlify reads `netlify.toml` for headers and caching automatically.

CLI alternative:

```bash
netlify deploy --dir=. --prod
```

The Content-Security-Policy in `netlify.toml` is intentionally strict: scripts and styles are same-origin only, with `data:` allowed solely for the inline SVG favicon. If you add external fonts or analytics later, widen the CSP accordingly.

## Project structure

```
FogForge/
├── index.html              # markup + screen scaffolding
├── netlify.toml            # publish dir, security headers, caching
├── assets/
│   ├── css/style.css       # gothic-warmth theme, responsive, a11y modes
│   └── js/
│       ├── data.js         # content & balance: actions, wards, chapters, journal, townsfolk, glimpses
│       ├── game.js         # engine: state, spoon rolls, day loop, world-building, save/load
│       ├── ui.js           # DOM rendering incl. Almanac (no game logic)
│       ├── main.js         # bootstrap & event wiring
│       └── gg/             # shared Gracefully Glitching Games account layer (inert until configured)
│           ├── config.js   # backend endpoints (blank = anonymous/offline)
│           ├── auth.js     # Cognito Hosted UI (Authorization Code + PKCE)
│           ├── cloud.js    # API client (GET /me, PUT /saved-game, …)
│           └── account.js  # Fog & Forge sync + cross-device restore
├── brand/entity-rules.ts   # single source of truth for entity, voice, palette
├── submission.md           # Hot App Summer submission packet
├── screenshots.md          # 5-screenshot capture checklist
└── README.md
```

## <a name="entity"></a>Entity & brand

Made by **Gracefully Glitching LLC** — software that meets you where your body is. Brand voice: chronic illness, grief, gothic warmth, accessible. Palette: aubergine ground with teal, gold, and dusty-rose accents. The canonical definitions live in [`brand/entity-rules.ts`](brand/entity-rules.ts); nothing in the product invents branding outside that file.

## License & care note

Fog & Forge is a work of empathy, not medical advice. It models the *experience* of pacing with limited energy; it is not a treatment or a substitute for care.
