# Fog & Forge — Netlify Hot App Summer submission

## App
**Fog & Forge** — a short-session chronic illness RPG. A gentle, gothic-warm browser game about pacing rather than pushing: keep a forge alive in the fog with whatever energy ("spoons") each day gives you.

## Entity
**Gracefully Glitching LLC (GG)** — software that meets you where your body is. Brand voice: chronic illness, grief, gothic warmth, accessible. Palette: aubergine ground with teal, gold, and dusty-rose accents.

## Tier
**Game** — a playable core loop, start to story-complete, entirely in the browser.

## Pitch (200 characters)
> A short-session RPG about pacing, not pushing. Keep a forge alive in the fog with the spoons each day gives you. No timers, no losing — forge wards, gather embers, live well with chronic illness.

*(197 characters)*

## Project Story
Most games reward grinding: play more, win more. That logic is quietly hostile to anyone whose energy is finite and unpredictable. Fog & Forge inverts it.

You keep a forge in Emberhollow, a town where the fog stopped lifting. Every in-game day is a short session of two to four minutes. You wake and roll your **spoons** — a variable amount of energy, lower on heavy-fog days, the way it actually works when you live with chronic illness. You spend those spoons on a handful of honest actions: gather ore, tend the hearth, venture into the fog, reflect, or simply rest. **Resting early is rewarded, never punished** — there is no streak to break and no way to lose.

From what you gather you forge **Wards**: a grounding stone that lifts your worst days, banked coals that slow the fog, a kept hearth that gives more back, a name carved against the grey. None of them is a cure. Each makes the fog a little easier to live with, and each pushes it back the moment it's forged. Embers gathered along the way open a five-chapter story — and an in-character journal about grief, pacing, and how the meaning of "better" changes — that ends not with a cure but with **The Clearing**: a rise where, on the right morning, you can see *over* the fog instead of through it.

It's built to the brand of Gracefully Glitching LLC: warm and unflinching, never toxic-positive, with explicit care taken to avoid "fight/beat/warrior" framings of illness. Accessibility is a feature, not an afterthought — reduce-motion, larger-text, and higher-contrast modes; keyboard-first play; ARIA live regions; and a no-account, offline-first, save-stays-on-your-device design.

## Built With
- **HTML5** — semantic, single-page, two-screen structure (title / game).
- **CSS3** — custom-property theming, responsive grid, three accessibility modes, a subtle animated fog layer that fully disables under reduced-motion.
- **Vanilla JavaScript (ES5-style, no framework, no build)** — split into `data.js` (content/balance), `game.js` (engine + save/load), `ui.js` (rendering), `main.js` (wiring).
- **Web Storage API (`localStorage`)** — autosave of game state and accessibility settings.
- **Netlify** — static hosting + `netlify.toml`.
- **TypeScript** — `brand/entity-rules.ts` as the typed single source of truth for entity, voice, and palette.

## Netlify Primitives Used
- **Netlify static hosting** — zero-build deploy of hand-written assets from the repo root.
- **`netlify.toml`** — publish directory, strict Content-Security-Policy, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Cache-Control` for `/assets/*`.

## Screenshots Needed
See [`screenshots.md`](screenshots.md) for the full capture checklist. In short:
1. Title screen (logo, pitch, accessibility entry point).
2. A fresh day — actions panel + spoon count + opening narrative.
3. The Forge — ward cards, costs, one forged.
4. Mid-game status — resources, embers, chapter progress, unlocked journal.
5. Accessibility panel — toggles open (proof of comfort features).

## Demo Outline (≈90 seconds)
1. **0:00 — Title.** Read the pitch. Open **Accessibility**, flip *Reduce motion* / *Larger text* to show the comfort settings. Press **New Game**.
2. **0:15 — The premise.** Point out today's **spoon count** and the opening line. Note: spoons vary by day — that's the chronic-illness mechanic, not a difficulty setting.
3. **0:30 — Play a day.** *Gather Ore* (resources tick up, an ember appears), *Tend the Hearth* (calm rises), *Reflect* (journal unlocks). Show spoons draining.
4. **0:50 — Rest as progress.** Choose **Rest** with spoons still in hand; show the gentle "rest is part of the work" framing and the day ending without penalty.
5. **1:00 — The Forge.** Begin a new day, forge a **Ward**; show the fog meter draw back and the passive benefit it grants.
6. **1:15 — The arc.** Show the embers-to-next-chapter tracker and a newly opened chapter title; read one journal entry to land the grief/pacing theme.
7. **1:25 — Close.** "No timers, no losing. You don't beat the fog — you build something good inside it." Cut to the Gracefully Glitching mark.
