/**
 * brand/entity-rules.ts
 * ----------------------
 * Single source of truth for the entity behind Fog & Forge.
 *
 * This file exists so that copy, palette, and tone are never invented
 * ad-hoc. If a value is not here, it should not appear in the product.
 *
 * Entity: Gracefully Glitching LLC (GG)
 * Do NOT mix entities. Do NOT invent branding.
 */

export const ENTITY = {
  id: "GG",
  legalName: "Gracefully Glitching LLC",
  shortName: "Gracefully Glitching",
  tagline: "Software that meets you where your body is.",
} as const;

/**
 * Brand voice. Warm, unflinching, never toxic-positive.
 * We name hard things plainly (illness, grief, fatigue) and hold them
 * with care. Gothic warmth = candlelight in a cold room, not despair.
 */
export const VOICE = {
  pillars: [
    "chronic illness", // pacing over pushing; spoons are finite and that's ok
    "grief",           // loss of the old self is real and allowed
    "gothic warmth",   // tender, low-lit, a little eerie, deeply kind
    "accessible",      // legible, calm, no time pressure, no shame
  ],
  do: [
    "Acknowledge limits without pity.",
    "Frame rest as progress, not failure.",
    "Let small wins matter.",
    "Speak to the player as a capable adult having a hard time.",
  ],
  dont: [
    "No 'overcome', 'beat', 'fight', or 'warrior' framing of illness.",
    "No cure narratives — this is about living well, not being fixed.",
    "No urgency, streak-shame, or punishment for resting.",
    "No clinical coldness; no saccharine cheer.",
  ],
} as const;

/**
 * Palette. Aubergine base, with teal / gold / dusty rose accents.
 * Tuned for AA contrast against the deep ground.
 */
export const PALETTE = {
  // grounds (aubergine family)
  ink: "#1c1420",        // deepest ground / page bg
  surface: "#271b2e",    // panels
  surfaceRaised: "#352640",
  aubergine: "#4a3357",  // brand aubergine
  // accents
  teal: "#57c4b8",       // calm, water, recovery
  gold: "#e8c06a",       // embers, warmth, hope
  rose: "#d99fa9",       // dusty rose, tenderness, grief
  // type
  text: "#efe7ef",
  muted: "#b6a6bb",
  // states
  danger: "#d98a8a",     // gentle warning — never alarming red
  success: "#9ad6b0",
} as const;

export const PRODUCT = {
  name: "Fog & Forge",
  subtitle: "A short-session chronic illness RPG",
  entity: ENTITY.id,
  blurb:
    "Some days the fog rolls in and the spoons run short. Tend the forge " +
    "anyway — a little at a time, on your own terms.",
} as const;

export type Entity = typeof ENTITY;
export type Palette = typeof PALETTE;
