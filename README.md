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

- **Spoon-theory core loop.** Each day grants a *variable* number of spoons (energy). Bad days are real; good days aren't guaranteed. Wards raise your floor so the worst days are a little less worst.
- **Five actions, each with a cost and a consequence.** Gather Ore, Tend the Hearth, Venture into the Fog, Reflect, and Rest. **Rest is treated as progress, not failure** — and resting early gives a little back tomorrow.
- **The Forge.** Craft five **Wards** from ore / ember / calm. Each grants a passive benefit (spoon floor, slower fog drift, better recovery, safer venturing) and pushes the fog back when forged.
- **A five-chapter story** gated by embers gathered, plus an **unlockable journal** of in-character reflections on grief, pacing, and what "better" comes to mean.
- **A living fog meter.** Fog drifts up over time and is softened by your Wards — but never reaches a fail state. There is no losing, only pacing.
- **Accessibility & comfort built in:** reduce-motion, larger-text, and higher-contrast toggles (with OS `prefers-reduced-motion` respected automatically), full keyboard navigation, ARIA live regions for the spoon count and event log, visible focus rings, and a skip link. No accounts, no timers.
- **Offline-first.** Pure static HTML/CSS/JS. Your save lives in `localStorage` on your device — nothing is sent anywhere.

## Netlify primitives used

- **Netlify static hosting** — the entire game is hand-written static assets served from the repo root; no build step.
- **`netlify.toml`** — declares the publish directory, security response headers (a strict Content-Security-Policy, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`), and cache-control for `/assets/*`.

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
│       ├── data.js         # content & balance: actions, wards, chapters, journal
│       ├── game.js         # engine: state, spoon rolls, day loop, save/load
│       ├── ui.js           # DOM rendering (no game logic)
│       └── main.js         # bootstrap & event wiring
├── brand/entity-rules.ts   # single source of truth for entity, voice, palette
├── submission.md           # Hot App Summer submission packet
├── screenshots.md          # 5-screenshot capture checklist
└── README.md
```

## <a name="entity"></a>Entity & brand

Made by **Gracefully Glitching LLC** — software that meets you where your body is. Brand voice: chronic illness, grief, gothic warmth, accessible. Palette: aubergine ground with teal, gold, and dusty-rose accents. The canonical definitions live in [`brand/entity-rules.ts`](brand/entity-rules.ts); nothing in the product invents branding outside that file.

## License & care note

Fog & Forge is a work of empathy, not medical advice. It models the *experience* of pacing with limited energy; it is not a treatment or a substitute for care.
