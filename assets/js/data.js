/* Fog & Forge — content & balance data
 * Gracefully Glitching LLC
 * All narrative copy follows brand/entity-rules.ts: chronic illness, grief,
 * gothic warmth, accessible. No cure narratives, no streak-shame.
 */
(function (global) {
  "use strict";

  // ---- Actions the player can take each day. Cost is in spoons. ----
  // Each action has an `act(state, rng)` that mutates resources/stats and
  // returns a short narrative line. `enabled(state)` gates availability.
  const ACTIONS = [
    {
      id: "gather",
      name: "Gather Ore",
      icon: "⛏️",
      cost: 2,
      hint: "Walk the cold seam. Reliable ore, sometimes an ember.",
      lines: [
        "You chip slow and steady at the seam. The ache is familiar; the ore is real.",
        "Cold rock gives way. You take only what you can carry, and that is enough.",
        "The seam hums faintly. An ember winks loose into your palm.",
      ],
      act: function (s, rng) {
        var ore = 2 + rng.int(0, 1);
        s.resources.ore += ore;
        var note = "+" + ore + " ore";
        if (rng.chance(0.35)) {
          s.resources.ember += 1;
          s.totals.embers += 1; // lifetime tally drives the story
          note += ", +1 ember";
        }
        s.stats.craftXp += 1;
        return { text: pick(this.lines, rng), note: note };
      },
    },
    {
      id: "hearth",
      name: "Tend the Hearth",
      icon: "🕯️",
      cost: 1,
      hint: "Sit with the fire and whoever has wandered in. Restores calm.",
      lines: [
        "You feed the fire a single split log. The room exhales with you.",
        "Old Wren stops by, says nothing useful, stays a while. It helps.",
        "Warmth settles into your hands. Nothing is fixed. Something is softer.",
      ],
      act: function (s, rng) {
        var calm = 2 + rng.int(0, 1);
        s.resources.calm += calm;
        s.stats.warmthXp += 1;
        return { text: pick(this.lines, rng), note: "+" + calm + " calm" };
      },
    },
    {
      id: "venture",
      name: "Venture into the Fog",
      icon: "🌫️",
      cost: 4,
      hint: "Costly and uncertain. Bigger finds — and the fog may thicken.",
      enabled: function (s) {
        return true;
      },
      lines: [
        "The fog closes behind you. You move by feel, breadcrumbing your way.",
        "Shapes lean at the edge of sight — kind, you decide, because you must.",
        "You find a cache half-buried in grey: someone left it for someone.",
      ],
      act: function (s, rng) {
        var ember = 2 + rng.int(0, 1);
        var ore = rng.int(1, 2);
        s.resources.ember += ember;
        s.totals.embers += ember; // lifetime tally drives the story
        s.resources.ore += ore;
        var note = "+" + ember + " ember, +" + ore + " ore";
        // The fog can thicken — unless a Ward softens it.
        var thicken = mitigatedFog(s, 6);
        if (thicken > 0 && rng.chance(0.6)) {
          s.fog = clamp(s.fog + thicken, 0, 100);
          note += ", fog +" + thicken;
        }
        s.stats.resilienceXp += 1;
        return { text: pick(this.lines, rng), note: note };
      },
    },
    {
      id: "reflect",
      name: "Reflect",
      icon: "📖",
      cost: 1,
      hint: "Write the day down. Grows resilience; unlocks the journal.",
      lines: [
        "You write the true thing, not the brave thing. The page holds it.",
        "Grief gets a paragraph. So does the ember you found. Both are allowed.",
        "You name what you lost and what you kept. The list is longer than you feared.",
      ],
      act: function (s, rng) {
        s.stats.resilienceXp += 2;
        s.resources.calm += 1;
        s.flags.reflectedToday = true;
        return { text: pick(this.lines, rng), note: "+2 resilience xp, +1 calm" };
      },
    },
    {
      id: "rest",
      name: "Rest",
      icon: "🌙",
      cost: 0,
      hint: "Stop for today. Rest is progress, not failure.",
      lines: [
        "You set the tools down with intention. Tomorrow can have the rest.",
        "You rest before you're forced to. That is its own kind of skill.",
      ],
      act: function (s, rng) {
        s.flags.restedEarly = s.spoons.current > 1;
        return { text: pick(this.lines, rng), note: "the day ends gently", endsDay: true };
      },
    },
  ];

  // ---- Wards: crafted at the forge from resources. Passive benefits. ----
  // `effects` are read by the engine (game.js) — keep ids stable.
  const WARDS = [
    {
      id: "stillness",
      name: "Ward of Stillness",
      icon: "🪨",
      cost: { ore: 6, calm: 4 },
      desc: "A grounding stone. Your worst days are a little gentler (+1 to the daily spoon floor).",
      effects: { spoonFloor: 1 },
      forged: "You set the stone by the door. Even thin mornings will have a little more in them now.",
    },
    {
      id: "emberkeep",
      name: "Ward of Emberkeep",
      icon: "🔥",
      cost: { ore: 4, ember: 5 },
      desc: "Banked coals. The fog creeps back more slowly (-2 fog drift each day).",
      effects: { fogDrift: -2 },
      forged: "Coals banked deep. The grey will have to work harder to reach you.",
    },
    {
      id: "warmth",
      name: "Ward of Warmth",
      icon: "💛",
      cost: { calm: 6, ember: 3 },
      desc: "A kept hearth. Tending it and resting give back more (rest recovers +1 spoon next day).",
      effects: { restRecover: 1 },
      forged: "The hearth remembers heat now. Rest will return a little more of you.",
    },
    {
      id: "memory",
      name: "Ward of Memory",
      icon: "🕊️",
      cost: { ember: 6, calm: 5 },
      desc: "A name kept against the fog. Venturing is safer and the story opens (-3 fog risk; +story).",
      effects: { ventureSafety: 3, story: true },
      forged: "You carve the name where the fog can't smudge it. You are less alone out there.",
    },
    {
      id: "lantern",
      name: "Ward of the Long Lantern",
      icon: "🏮",
      cost: { ore: 8, ember: 8, calm: 8 },
      desc: "The keystone ward. Steadies everything (+1 spoon floor, -1 fog drift) and lights the way to the Clearing.",
      effects: { spoonFloor: 1, fogDrift: -1, keystone: true },
      forged: "The Long Lantern catches. Its light is small and it does not waver. It is enough to walk by.",
    },
  ];

  // ---- Chapters: gentle story milestones gated by embers collected. ----
  // No fail state. Progress is cumulative; the arc is living-with, not cure.
  const CHAPTERS = [
    {
      id: 0,
      embers: 0,
      title: "The Morning the Fog Stayed",
      body:
        "It used to lift by noon. This season it does not lift. You keep the forge in Emberhollow because someone must, and because the work is one of the few things the fog can't take whole. You learn the new arithmetic of mornings: count your spoons before you count your tasks.",
    },
    {
      id: 1,
      embers: 6,
      title: "What the Cold Seam Remembers",
      body:
        "You've found a rhythm — small days, honest ones. The seam gives ore and, now and then, an ember: a warm coin of the person you still are. You stop apologizing to the empty room for resting. The forge stays lit on the days you can, and that turns out to be most of them.",
    },
    {
      id: 2,
      embers: 16,
      title: "Names in the Grey",
      body:
        "Out in the fog you find the caches: a chipped cup, a child's mitten, a letter never sent. Other people walked here. Other people are walking here now. You leave your own small marker so the next forge-keeper knows the way back. Grief, you notice, has started to feel less like drowning and more like weather.",
    },
    {
      id: 3,
      embers: 30,
      title: "The Long Lantern",
      body:
        "With the keystone ward forged, the lantern's light reaches past your own doorstep. Wren brings others. The forge becomes a place people come to warm their hands and set their tools down without shame. You did not beat the fog. You built something good inside it.",
    },
    {
      id: 4,
      embers: 48,
      title: "The Clearing",
      body:
        "There's a rise east of town where, on the right kind of morning, you can see over the fog rather than through it. You walk there slowly, the way you do everything now. The view is not a cure. It is a clearing — proof the fog has edges, and that you learned to live right up against them, gracefully, glitching, still here.",
    },
  ];

  // ---- Journal entries unlocked by reflecting / story flags. ----
  const JOURNAL = [
    { id: "j1", at: { reflectCount: 1 }, title: "Day one of writing it down", text: "If I don't record the good minutes, the fog edits them out. So: today the seam gave me an ember. I sat too long and that was the right amount of long." },
    { id: "j2", at: { reflectCount: 3 }, title: "On spoons", text: "I keep wanting to borrow against tomorrow. Tomorrow is not a lender; it's a person, and that person is me, and she is tired. Spend today's. Let tomorrow keep its own." },
    { id: "j3", at: { reflectCount: 6 }, title: "Letter I didn't send", text: "Found a letter in the fog, never posted. I won't read past the first line. But I understand the impulse — to write the whole truth and then protect everyone from it. The forge is my version. I keep it lit instead of sending the letter." },
    { id: "j4", at: { embers: 30 }, title: "What 'better' means now", text: "I used to think better meant back to before. Now better means the lantern stays lit and I'm honest about the days. That's not a smaller life. It's a more accurate one." },
  ];

  // ---- Daily atmospheric openers, varied by fog level. ----
  const DAY_OPENERS = {
    clear: [
      "A thinner morning. The fog sits low and lets the gold through.",
      "You wake with more than you expected. Don't spend it all proving something.",
    ],
    middling: [
      "The usual grey. Not the worst of it. You've worked through worse and rested through worse.",
      "Fog at the windows like a patient animal. You make tea. You begin.",
    ],
    heavy: [
      "A thick one. The kind where standing up is the first achievement.",
      "The fog is loud today. Small is allowed. Small is the plan.",
    ],
  };

  // ---- helpers shared with engine ----
  function pick(arr, rng) {
    return arr[rng.int(0, arr.length - 1)];
  }
  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }
  // fog amount after subtracting Memory ward's ventureSafety
  function mitigatedFog(s, base) {
    var safety = 0;
    for (var i = 0; i < s.wards.length; i++) {
      var w = WARDS.find(function (x) { return x.id === s.wards[i]; });
      if (w && w.effects.ventureSafety) safety += w.effects.ventureSafety;
    }
    return clamp(base - safety, 0, base);
  }

  global.FF_DATA = {
    ACTIONS: ACTIONS,
    WARDS: WARDS,
    CHAPTERS: CHAPTERS,
    JOURNAL: JOURNAL,
    DAY_OPENERS: DAY_OPENERS,
    helpers: { pick: pick, clamp: clamp, mitigatedFog: mitigatedFog },
  };
})(window);
