/* Fog & Forge — game engine (state, save/load, daily loop)
 * Gracefully Glitching LLC
 * Pure logic. No DOM here — ui.js renders, main.js wires it together.
 */
(function (global) {
  "use strict";

  var D = global.FF_DATA;
  var clamp = D.helpers.clamp;
  var SAVE_KEY = "fogforge.save.v1";
  var SETTINGS_KEY = "fogforge.settings.v1";

  // Tiny seedable-ish RNG wrapper. We don't need crypto; we need variety.
  var RNG = {
    int: function (lo, hi) {
      return lo + Math.floor(Math.random() * (hi - lo + 1));
    },
    chance: function (p) {
      return Math.random() < p;
    },
  };

  function newState() {
    return {
      version: 1,
      day: 1,
      spoons: { current: 0, max: 0, carryover: 0 },
      resources: { ore: 0, ember: 0, calm: 0 },
      fog: 30,
      wards: [],
      chapter: 0,
      stats: { resilienceXp: 0, craftXp: 0, warmthXp: 0 },
      totals: { embers: 0, daysPlayed: 0, wardsForged: 0 },
      journalUnlocked: [],
      reflectCount: 0,
      townsfolk: {},        // id -> number of beats completed
      glimpses: [],         // ids of fog phenomena seen
      discoveries: [],      // ids of places found while venturing
      realDays: 0,          // distinct real-world days played (never "streak")
      giftDate: null,       // last real date a return-gift was given (YYYY-MM-DD)
      spoonieMode: false,   // Full Spoonie Mode: only one in-game day per real day
      lastDayStartedDate: null, // real date the current/last in-game day began
      flags: {},
      log: [],
      started: false,
      dayActive: false,
    };
  }

  // ---------- effect aggregation ----------
  function wardEffects(s) {
    var eff = { spoonFloor: 0, fogDrift: 0, restRecover: 0, ventureSafety: 0, keystone: false, story: false };
    s.wards.forEach(function (id) {
      var w = D.WARDS.find(function (x) { return x.id === id; });
      if (!w) return;
      Object.keys(w.effects).forEach(function (k) {
        if (typeof w.effects[k] === "number") eff[k] += w.effects[k];
        else eff[k] = eff[k] || w.effects[k];
      });
    });
    return eff;
  }

  // ---------- daily spoon roll (the heart of the pacing mechanic) ----------
  // Spoons vary day to day — that's the chronic-illness truth the game models.
  // Higher fog and low resilience pull the average down; Wards lift the floor.
  function rollSpoons(s) {
    var eff = wardEffects(s);
    var resilienceLevel = Math.floor(s.stats.resilienceXp / 5); // grows slowly
    var base = 6 + resilienceLevel - Math.floor(s.fog / 25);
    var swing = RNG.int(-2, 2); // the unpredictability
    var floor = 2 + eff.spoonFloor;
    var max = clamp(base + swing, floor, 10);
    // carryover from resting early / Ward of Warmth, minus borrowed spoons
    max = clamp(max + (s.spoons.carryover || 0), floor, 11);
    return max;
  }

  function fogBand(fog) {
    if (fog < 30) return "clear";
    if (fog < 65) return "middling";
    return "heavy";
  }

  // ---------- lifecycle ----------
  function startGame(s) {
    s.started = true;
    beginDay(s);
  }

  function beginDay(s) {
    s.dayActive = true;
    s.lastDayStartedDate = todayStr(); // for Full Spoonie Mode's one-day-per-day gate
    s.spoons.max = rollSpoons(s);
    s.spoons.current = s.spoons.max;
    s.spoons.carryover = 0;
    s.flags.reflectedToday = false;
    s.flags.restedEarly = false;
    s.flags.shiftsToday = 0;
    var band = fogBand(s.fog);
    var openers = D.DAY_OPENERS[band];
    log(s, "— Day " + s.day + " —", "day");
    log(s, openers[RNG.int(0, openers.length - 1)], "ambient");
    maybeDailyGift(s);         // warm welcome on the first session of a new real day
    maybeMorningEvent(s, RNG); // the day may wake you with more, or less
    log(s, "You have " + s.spoons.max + " spoon" + (s.spoons.max === 1 ? "" : "s") + " today.", "spoons");
  }

  function canAfford(s, action) {
    if (typeof action.enabled === "function" && !action.enabled(s)) return false;
    return s.spoons.current >= action.cost;
  }

  function doAction(s, actionId) {
    var action = D.ACTIONS.find(function (a) { return a.id === actionId; });
    if (!action) return { ok: false };
    if (!canAfford(s, action)) return { ok: false, reason: "Not enough spoons for that today." };

    s.spoons.current -= action.cost;
    var result = action.act(s, RNG);
    log(s, result.text, "action");
    if (result.note) log(s, action.icon + " " + result.name + " — " + result.note + ".", "note");

    if (action.id === "reflect") {
      s.reflectCount += 1;
      checkJournal(s);
    }

    // Tending the hearth and venturing can advance the world around you.
    if (action.id === "hearth") {
      tryTownsfolk(s, "hearth");
    } else if (action.id === "venture") {
      tryTownsfolk(s, "fog");
      tryDiscovery(s, RNG);  // the payoff for exploring
      tryGlimpse(s, RNG);
    }

    // The sporadic shift — a lift or a wave, any day, after any real effort.
    if (action.id !== "rest") maybeDayShift(s, RNG);

    var ended = false;
    if (result.endsDay || s.spoons.current <= 0) {
      ended = endDay(s);
    }
    return { ok: true, endedDay: ended };
  }

  function forgeWard(s, wardId) {
    var ward = D.WARDS.find(function (w) { return w.id === wardId; });
    if (!ward) return { ok: false };
    if (s.wards.indexOf(wardId) !== -1) return { ok: false, reason: "Already forged." };
    if (s.spoons.current < 3) return { ok: false, reason: "Forging a ward takes 3 spoons." };
    // resource check
    var c = ward.cost;
    if ((c.ore || 0) > s.resources.ore || (c.ember || 0) > s.resources.ember || (c.calm || 0) > s.resources.calm) {
      return { ok: false, reason: "Not enough materials yet." };
    }
    s.spoons.current -= 3;
    s.resources.ore -= c.ore || 0;
    s.resources.ember -= c.ember || 0;
    s.resources.calm -= c.calm || 0;
    s.wards.push(wardId);
    s.totals.wardsForged += 1;
    s.stats.craftXp += 3;
    // forging pushes the fog back as an immediate reward
    s.fog = clamp(s.fog - 8, 0, 100);
    log(s, ward.forged, "forge");
    log(s, ward.icon + " " + ward.name + " forged. The fog draws back a little.", "note");

    var ended = false;
    if (s.spoons.current <= 0) ended = endDay(s);
    return { ok: true, endedDay: ended };
  }

  // End of day: fog drifts, embers banked, carryover computed, chapter check.
  function endDay(s) {
    s.dayActive = false;
    var eff = wardEffects(s);
    s.totals.daysPlayed += 1;

    // fog drifts up, softened by wards
    var drift = clamp(4 + eff.fogDrift, 0, 10);
    s.fog = clamp(s.fog + drift, 0, 100);

    // carryover: resting early and Ward of Warmth give a little back tomorrow
    var carry = 0;
    if (s.flags.restedEarly) carry += 1;
    carry += eff.restRecover;
    s.spoons.carryover = carry;

    // lifetime ember total is what advances chapters — count embers ever gathered.
    // We approximate by tracking cumulative embers in totals at gather/venture time
    // is cleaner, but to keep one source of truth we recompute story from milestones.
    s.day += 1;
    checkChapter(s);
    checkJournal(s);
    save(s);
    return true;
  }

  // ---------- progression ----------
  // Story progress = cumulative embers gathered over the whole game
  // (incremented in data.js when ore/venture yields an ember).
  function checkChapter(s) {
    for (var i = D.CHAPTERS.length - 1; i >= 0; i--) {
      if (s.totals.embers >= D.CHAPTERS[i].embers && s.chapter < D.CHAPTERS[i].id) {
        s.chapter = D.CHAPTERS[i].id;
        log(s, "✶ New chapter: " + D.CHAPTERS[i].title, "chapter");
        break;
      }
    }
  }

  function checkJournal(s) {
    D.JOURNAL.forEach(function (j) {
      if (s.journalUnlocked.indexOf(j.id) !== -1) return;
      var ok = true;
      if (j.at.reflectCount && s.reflectCount < j.at.reflectCount) ok = false;
      if (j.at.embers && s.totals.embers < j.at.embers) ok = false;
      if (ok) {
        s.journalUnlocked.push(j.id);
        log(s, "📖 Journal entry unlocked: " + j.title, "note");
      }
    });
  }

  function nextChapter(s) {
    return D.CHAPTERS.find(function (c) { return c.id === s.chapter + 1; }) || null;
  }

  // ---------- world-building: townsfolk, glimpses, daily gifts ----------
  function applyReward(s, reward) {
    if (!reward) return;
    if (reward.ore) s.resources.ore += reward.ore;
    if (reward.calm) s.resources.calm += reward.calm;
    if (reward.ember) { s.resources.ember += reward.ember; s.totals.embers += reward.ember; }
    if (reward.carry) s.spoons.carryover = (s.spoons.carryover || 0) + reward.carry;
    if (reward.spoons) { s.spoons.max += reward.spoons; s.spoons.current += reward.spoons; }
    if (reward.fog) s.fog = clamp(s.fog + reward.fog, 0, 100);
    if (reward.journal && s.journalUnlocked.indexOf(reward.journal) === -1) {
      s.journalUnlocked.push(reward.journal);
    }
  }

  // Advance one townsfolk thread that's "due" at this place. Returns a log
  // line or null. Threads never expire — a due beat waits until you show up.
  function tryTownsfolk(s, where) {
    var candidates = D.TOWNSFOLK.filter(function (p) {
      if (p.where !== where) return false;
      var done = s.townsfolk[p.id] || 0;
      if (done >= p.beats.length) return false;
      return s.totals.embers >= p.beats[done].minEmbers;
    });
    if (candidates.length === 0) return null;
    // Prefer the person you've talked to least, for variety.
    candidates.sort(function (a, b) {
      return (s.townsfolk[a.id] || 0) - (s.townsfolk[b.id] || 0);
    });
    var person = candidates[0];
    var idx = s.townsfolk[person.id] || 0;
    var beat = person.beats[idx];
    s.townsfolk[person.id] = idx + 1;
    applyReward(s, beat.reward);
    var line = person.icon + " " + person.name + ": " + beat.text;
    if (s.townsfolk[person.id] >= person.beats.length) {
      log(s, line, "people");
      return { person: person, done: true };
    }
    log(s, line, "people");
    return { person: person, done: false };
  }

  function tryGlimpse(s, rng) {
    var unseen = D.GLIMPSES.filter(function (g) { return s.glimpses.indexOf(g.id) === -1; });
    if (unseen.length === 0) return null;
    if (!rng.chance(0.5)) return null;
    var g = unseen[rng.int(0, unseen.length - 1)];
    s.glimpses.push(g.id);
    applyReward(s, { ember: 1 }); // wonder is a warm coin of the person you still are
    log(s, g.icon + " You glimpse something in the grey — " + g.name + ". " + g.text, "glimpse");
    log(s, "Seeing it stirs something. +1 ember.", "note");
    return g;
  }

  // Discoveries are the payoff for venturing: one-time finds out in the fog.
  function tryDiscovery(s, rng) {
    var undisc = D.DISCOVERIES.filter(function (d) { return s.discoveries.indexOf(d.id) === -1; });
    if (undisc.length === 0) return null;
    if (!rng.chance(0.5)) return null;
    var d = undisc[rng.int(0, undisc.length - 1)];
    s.discoveries.push(d.id);
    applyReward(s, d.reward);
    log(s, d.icon + " You find something out here — " + d.name + ". " + d.text, "discovery");
    log(s, rewardNote(d.reward), "note");
    return d;
  }

  function rewardNote(r) {
    var parts = [];
    if (r.spoons) parts.push("+" + r.spoons + " spoon" + (r.spoons === 1 ? "" : "s"));
    if (r.ore) parts.push("+" + r.ore + " ore");
    if (r.ember) parts.push("+" + r.ember + " ember");
    if (r.calm) parts.push("+" + r.calm + " calm");
    if (r.fog) parts.push("fog " + r.fog);
    return parts.join(", ") + (parts.length ? "." : "");
  }

  // The sporadic truth of spoonie life: random spoon swings, never as failure.
  function applySpoonShift(s, delta, wholeDay) {
    if (delta > 0) {
      s.spoons.max += delta;
      s.spoons.current += delta;
    } else if (delta < 0) {
      if (wholeDay) {
        s.spoons.max = clamp(s.spoons.max + delta, 1, 12);
        s.spoons.current = s.spoons.max;
      } else {
        s.spoons.current = clamp(s.spoons.current + delta, 0, s.spoons.max);
      }
    }
  }

  function logShift(s, e) {
    log(s, e.text, e.kind);
    if (e.delta) {
      log(s, (e.delta > 0 ? "+" : "") + e.delta + " spoon" + (Math.abs(e.delta) === 1 ? "" : "s") + ".", "note");
    }
  }

  // Morning shift — sets the day's capacity (day 1 stays stable for onboarding).
  function maybeMorningEvent(s, rng) {
    if (s.day < 2) return;
    if (!rng.chance(0.32)) return;
    var pool = D.SPOON_EVENTS.filter(function (e) { return e.when === "morning"; });
    var e = pool[rng.int(0, pool.length - 1)];
    applySpoonShift(s, e.delta, true);
    if (e.reward) applyReward(s, e.reward);
    logShift(s, e);
  }

  // Mid-day shift — the out-of-nowhere lift or wave. At most one per day.
  function maybeDayShift(s, rng) {
    if ((s.flags.shiftsToday || 0) >= 1) return null;
    if (!rng.chance(0.13)) return null;
    var pool = D.SPOON_EVENTS.filter(function (e) { return e.when === "anytime"; });
    var e = pool[rng.int(0, pool.length - 1)];
    s.flags.shiftsToday = 1;
    applySpoonShift(s, e.delta, false);
    if (e.reward) applyReward(s, e.reward);
    logShift(s, e);
    return e;
  }

  // Local calendar date (YYYY-MM-DD). Local — so "one day per day" and the
  // return-gift roll over at the player's midnight, not UTC's.
  function todayStr() {
    try {
      var d = new Date();
      return d.getFullYear() + "-" +
        ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
        ("0" + d.getDate()).slice(-2);
    } catch (e) { return null; }
  }

  // Full Spoonie Mode gate: you may begin a new in-game day only once per real
  // day. An in-progress day can always be resumed; this only blocks starting
  // the NEXT one. Off by default — entirely opt-in.
  function canBeginDay(s) {
    if (!s.spoonieMode) return true;
    if (s.dayActive) return true; // already in today's day; nothing to gate
    return s.lastDayStartedDate !== todayStr();
  }

  // First session of a new real day brings a small warm gift. Missing days
  // costs nothing — this is the opposite of a streak.
  function maybeDailyGift(s) {
    var today = todayStr();
    if (!today || s.giftDate === today) return;
    s.giftDate = today;
    s.realDays += 1;
    var gifts = D.DAILY_GIFTS;
    var gift = gifts[(s.realDays - 1) % gifts.length];
    applyReward(s, gift.reward);
    log(s, "🎁 " + gift.text, "gift");
  }

  function townsfolkBeat(s, id) { return s.townsfolk[id] || 0; }

  // ---------- log ----------
  function log(s, text, kind) {
    s.log.push({ text: text, kind: kind || "info", day: s.day });
    if (s.log.length > 60) s.log.shift();
  }

  // ---------- persistence ----------
  function save(s) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch (e) { /* storage may be unavailable; game still runs in-memory */ }
  }
  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (s && s.version === 1) return s;
    } catch (e) {}
    return null;
  }
  function hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  }
  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { reducedMotion: false, largeText: false, highContrast: false, spoonieMode: false };
  }
  function saveSettings(st) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(st)); } catch (e) {}
  }

  global.FF_GAME = {
    newState: newState,
    startGame: startGame,
    beginDay: beginDay,
    doAction: doAction,
    forgeWard: forgeWard,
    endDay: endDay,
    canAfford: canAfford,
    canBeginDay: canBeginDay,
    wardEffects: wardEffects,
    fogBand: fogBand,
    nextChapter: nextChapter,
    townsfolkBeat: townsfolkBeat,
    checkChapter: checkChapter,
    checkJournal: checkJournal,
    save: save,
    load: load,
    hasSave: hasSave,
    clearSave: clearSave,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    RNG: RNG,
  };
})(window);
