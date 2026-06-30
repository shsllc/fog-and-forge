/* Fog & Forge — the living scene.
 * A hand-built SVG of Emberhollow that reacts to game state: the fog thickens
 * and thins with your fog level, the town lights up as the story advances,
 * wards appear by the forge as you craft them, the lantern lights with the
 * keystone, and embers rise when the grey lifts. Themeable (uses palette CSS
 * vars) and fully animated — all motion stops under reduced-motion.
 */
(function (global) {
  "use strict";

  var root = null;   // the <svg> element
  var els = {};      // cached references

  function buildSVG() {
    // --- town houses + windows (silhouettes along the horizon) ---
    var houses = "", windows = [];
    var hx = [60, 165, 285, 455, 585, 678];
    for (var i = 0; i < hx.length; i++) {
      var x = hx[i], w = 72 + (i % 2 ? 18 : 0), h = 58 + (i % 3) * 20;
      var baseY = 236, topY = baseY - h, roof = 22;
      houses += '<path class="sc-town" d="M' + x + ',' + baseY + ' L' + x + ',' + topY +
        ' L' + (x + w / 2) + ',' + (topY - roof) + ' L' + (x + w) + ',' + topY +
        ' L' + (x + w) + ',' + baseY + ' Z"/>';
      windows.push([x + w * 0.28, topY + 14]);
      if (h > 72) windows.push([x + w * 0.6, topY + 30]);
    }
    var winSVG = windows.map(function (p, idx) {
      return '<rect class="sc-win" data-win="' + idx + '" x="' + p[0].toFixed(0) +
        '" y="' + p[1].toFixed(0) + '" width="7" height="9" rx="1"/>';
    }).join("");
    els.winCount = windows.length;

    // --- stars ---
    var sp = [[120, 50, 1.4], [240, 32, 1], [360, 58, 1.2], [520, 40, 1], [600, 80, 1.3],
      [90, 92, 1], [430, 30, 1], [712, 116, 1.1], [300, 92, 0.9], [560, 120, 1], [200, 70, 0.8]];
    var stars = sp.map(function (s) {
      return '<circle class="sc-star" cx="' + s[0] + '" cy="' + s[1] + '" r="' + s[2] + '"/>';
    }).join("");

    // --- embers (rise + fade, staggered) ---
    var embers = "";
    for (var e = 0; e < 11; e++) {
      var ex = 110 + e * 58 + (e % 3) * 14;
      embers += '<circle class="sc-ember" style="animation-delay:' + (e % 6) * 0.7 +
        's" cx="' + ex + '" cy="' + (232 - (e % 4) * 6) + '" r="' + (1.4 + (e % 3) * 0.6).toFixed(1) + '"/>';
    }

    // --- wards: small objects that appear by the forge when forged ---
    function ward(id, x, inner) {
      return '<g id="w-' + id + '" class="sc-ward" transform="translate(' + x + ',214)">' + inner + "</g>";
    }
    var wards =
      ward("stillness", 250, '<ellipse class="sc-stone" cx="0" cy="6" rx="11" ry="13"/><ellipse class="sc-stone2" cx="0" cy="2" rx="7" ry="8"/>') +
      ward("emberkeep", 300, '<path class="sc-coal" d="M-13,12 Q0,-6 13,12 Z"/><circle class="sc-cglow" cx="-4" cy="7" r="2"/><circle class="sc-cglow" cx="4" cy="9" r="2.2"/><circle class="sc-cglow" cx="0" cy="4" r="2"/>') +
      ward("warmth", 352, '<path class="sc-heart" d="M0,14 C-12,3 -9,-7 0,-1 C9,-7 12,3 0,14 Z"/>') +
      ward("memory", 404, '<rect class="sc-stele" x="-7" y="-10" width="14" height="24" rx="6"/><rect class="sc-stele2" x="-2.5" y="-4" width="5" height="12" rx="2"/>');

    // --- the Long Lantern (keystone): a post + lantern that lights the scene ---
    var lantern =
      '<g id="w-lantern" class="sc-ward sc-lantern" transform="translate(470,196)">' +
      '<rect class="sc-post" x="-2" y="0" width="4" height="44"/>' +
      '<rect class="sc-post" x="-18" y="2" width="18" height="3" rx="1"/>' +
      '<circle class="sc-lantern-halo" cx="-18" cy="14" r="26"/>' +
      '<rect class="sc-lantern-body" x="-24" y="6" width="12" height="16" rx="2"/>' +
      '<circle class="sc-lantern-flame" cx="-18" cy="14" r="3.2"/>' +
      "</g>";

    // --- townsfolk: simple silhouettes that appear once met ---
    function folk(id, x, accent) {
      return '<g id="folk-' + id + '" class="sc-folk" transform="translate(' + x + ',206)">' +
        '<ellipse class="sc-folk-shadow" cx="0" cy="30" rx="10" ry="3"/>' +
        '<path class="sc-folk-body" d="M-7,30 Q-8,8 0,6 Q8,8 7,30 Z"/>' +
        '<circle class="sc-folk-head" cx="0" cy="2" r="5"/>' +
        '<circle class="sc-folk-spark" cx="0" cy="16" r="2.2" style="fill:' + accent + '"/>' +
        "</g>";
    }
    var folks =
      folk("wren", 120, "var(--rose)") +
      folk("mirin", 560, "var(--success)") +
      folk("bog", 92, "var(--teal)") +
      folk("quill", 620, "var(--gold)");

    // --- fog banks (opacity scales with the fog level) ---
    var fog =
      '<g id="sc-fog" class="sc-fog">' +
      '<ellipse class="sc-fog-layer" cx="200" cy="244" rx="340" ry="64"/>' +
      '<ellipse class="sc-fog-layer" cx="600" cy="250" rx="340" ry="74"/>' +
      '<ellipse class="sc-fog-layer" cx="400" cy="276" rx="540" ry="92"/>' +
      "</g>";

    var defs =
      '<defs>' +
      '<linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop class="sc-sky-0" offset="0%"/><stop class="sc-sky-1" offset="100%"/></linearGradient>' +
      '<radialGradient id="sc-moonglow" cx="50%" cy="50%" r="50%">' +
      '<stop class="sc-moon-0" offset="0%"/><stop class="sc-moon-1" offset="100%"/></radialGradient>' +
      '<radialGradient id="sc-forgeglow" cx="50%" cy="50%" r="50%">' +
      '<stop class="sc-forge-0" offset="0%"/><stop class="sc-forge-1" offset="100%"/></radialGradient>' +
      "</defs>";

    var forge =
      '<g class="sc-forge" transform="translate(168,208)">' +
      '<ellipse id="sc-forge-glow" class="sc-forge-glow" cx="0" cy="14" rx="120" ry="60" fill="url(#sc-forgeglow)"/>' +
      '<rect class="sc-anvil" x="-34" y="22" width="68" height="9" rx="3"/>' +
      '<rect class="sc-anvil" x="-22" y="10" width="44" height="14" rx="2"/>' +
      '<path class="sc-bowl" d="M-22,10 L-15,-8 L15,-8 L22,10 Z"/>' +
      '<g class="sc-flames">' +
      '<path class="sc-flame sc-flame-1" d="M-9,-8 Q-13,-30 0,-40 Q13,-30 9,-8 Z"/>' +
      '<path class="sc-flame sc-flame-2" d="M-5,-8 Q-7,-22 0,-30 Q7,-22 5,-8 Z"/>' +
      "</g></g>";

    return (
      '<svg id="ff-scene" class="ff-scene" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" ' +
      'xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A view of Emberhollow: a forge glowing in the fog">' +
      defs +
      '<rect class="sc-sky" x="0" y="0" width="800" height="300" fill="url(#sc-sky)"/>' +
      '<g class="sc-stars">' + stars + "</g>" +
      '<circle class="sc-moon-halo" cx="676" cy="68" r="58" fill="url(#sc-moonglow)"/>' +
      '<circle class="sc-moon" cx="676" cy="68" r="28"/>' +
      '<path class="sc-hills" d="M0,214 Q150,176 330,204 T800,196 L800,300 L0,300 Z"/>' +
      '<g class="sc-townwrap">' + houses + winSVG + "</g>" +
      '<path class="sc-ground" d="M0,252 Q400,238 800,252 L800,300 L0,300 Z"/>' +
      forge + wards + lantern + folks +
      '<g class="sc-embers">' + embers + "</g>" + fog +
      "</svg>"
    );
  }

  function mount(container) {
    if (!container) return;
    container.innerHTML = buildSVG();
    root = container.querySelector("svg");
    els.fog = container.querySelector("#sc-fog");
    els.glow = container.querySelector("#sc-forge-glow");
    els.windows = container.querySelectorAll(".sc-win");
    els.embers = container.querySelectorAll(".sc-ember");
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function update(s) {
    if (!root || !s) return;

    // Fog: thicker bank + more obscured town as the fog level climbs.
    var fogN = (typeof s.fog === "number") ? s.fog : 40;
    if (els.fog) els.fog.style.opacity = (0.16 + (fogN / 100) * 0.62).toFixed(3);

    // Embers rise when the grey lifts.
    var emberVis = clamp((58 - fogN) / 58, 0, 1);
    root.style.setProperty("--ember-vis", emberVis.toFixed(2));

    // The forge burns brighter the more wards you've forged.
    var wards = s.wards || [];
    if (els.glow) els.glow.style.opacity = clamp(0.32 + wards.length * 0.12, 0.32, 0.95).toFixed(2);

    // Show each forged ward object by the forge.
    ["stillness", "emberkeep", "warmth", "memory", "lantern"].forEach(function (id) {
      var el = root.querySelector("#w-" + id);
      if (el) el.classList.toggle("shown", wards.indexOf(id) !== -1);
    });
    root.classList.toggle("has-lantern", wards.indexOf("lantern") !== -1);

    // Townsfolk you've met step into the scene.
    var tf = s.townsfolk || {};
    ["wren", "mirin", "bog", "quill"].forEach(function (id) {
      var el = root.querySelector("#folk-" + id);
      if (el) el.classList.toggle("shown", (tf[id] || 0) > 0);
    });

    // The town lights up with your progress (chapter + wards + people met).
    var peopleMet = Object.keys(tf).filter(function (k) { return tf[k] > 0; }).length;
    var lit = clamp((s.chapter || 0) + wards.length + peopleMet, 0, els.windows.length);
    for (var i = 0; i < els.windows.length; i++) {
      els.windows[i].classList.toggle("lit", i < lit);
    }
  }

  // Brief reaction to an action — a pulse of light/motion for feedback.
  function pulse(kind) {
    if (!root) return;
    var cls = "pulse-" + kind;
    root.classList.add(cls);
    setTimeout(function () { root.classList.remove(cls); }, 900);
  }

  global.FFScene = { mount: mount, update: update, pulse: pulse };
})(window);
