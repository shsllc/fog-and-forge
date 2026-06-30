/* Fog & Forge — UI rendering
 * Gracefully Glitching LLC
 * Renders state into the DOM. Accessible: ARIA live regions, keyboard-first,
 * no time pressure, respects reduced-motion / large-text / high-contrast.
 */
(function (global) {
  "use strict";

  var D = global.FF_DATA;
  var G = global.FF_GAME;

  var els = {};
  function $(id) { return document.getElementById(id); }

  function cache() {
    [
      "screen-title", "screen-game", "btn-new", "btn-continue", "btn-settings",
      "stat-day", "stat-fog", "fog-bar", "fog-band", "chapter-title",
      "spoons", "res-ore", "res-ember", "res-calm", "embers-total", "days-kept",
      "actions", "wards", "log", "journal", "journal-list",
      "next-chapter", "settings-panel", "btn-restart",
      "set-motion", "set-text", "set-contrast", "set-spoonie", "almanac-body",
    ].forEach(function (id) { els[id] = $(id); });
  }

  // ---- spoons as discrete pips (with a textual fallback for SR) ----
  function renderSpoons(s) {
    var box = els.spoons;
    box.innerHTML = "";
    var label = document.createElement("span");
    label.className = "spoon-label";
    label.textContent = "Spoons today: " + s.spoons.current + " of " + s.spoons.max;
    box.appendChild(label);
    var pips = document.createElement("div");
    pips.className = "spoon-pips";
    pips.setAttribute("aria-hidden", "true");
    for (var i = 0; i < s.spoons.max; i++) {
      var pip = document.createElement("span");
      pip.className = "spoon-pip" + (i < s.spoons.current ? " full" : " spent");
      pip.textContent = "🥄";
      pips.appendChild(pip);
    }
    box.appendChild(pips);
  }

  function renderResources(s) {
    els["res-ore"].textContent = s.resources.ore;
    els["res-ember"].textContent = s.resources.ember;
    els["res-calm"].textContent = s.resources.calm;
    els["embers-total"].textContent = s.totals.embers;
  }

  function renderDaysKept(s) {
    var el = els["days-kept"];
    if (!el) return;
    var parts = [];
    if (s.spoonieMode) parts.push("🌙 Full Spoonie Mode — one day per day");
    if (s.realDays > 0) parts.push("Days kept: " + s.realDays + " (no streaks here — every return counts)");
    el.textContent = parts.join(" · ");
  }

  function renderHeader(s) {
    els["stat-day"].textContent = "Day " + s.day;
    els["stat-fog"].textContent = s.fog + "%";
    els["fog-bar"].style.width = s.fog + "%";
    var band = G.fogBand(s.fog);
    els["fog-band"].textContent = band === "clear" ? "thin" : band === "middling" ? "steady" : "heavy";
    els["fog-bar"].setAttribute("aria-valuenow", String(s.fog));
    var ch = D.CHAPTERS.find(function (c) { return c.id === s.chapter; });
    els["chapter-title"].textContent = ch ? ch.title : "";
  }

  function renderActions(s, handlers) {
    var box = els.actions;
    box.innerHTML = "";
    if (!s.dayActive) {
      var done = document.createElement("div");
      done.className = "day-over";
      if (!G.canBeginDay(s)) {
        // Full Spoonie Mode: today's day is spent. The forge waits.
        done.innerHTML =
          "<p>🌙 That's today's turn at the forge.</p>" +
          '<p class="day-over-sub">Full Spoonie Mode is on — one day per day. ' +
          "The forge will keep. Come back tomorrow; rest is the rest of the work.</p>";
        box.appendChild(done);
        return;
      }
      done.innerHTML = "<p>The day is done. Rest well.</p>";
      var btn = document.createElement("button");
      btn.className = "btn btn-primary";
      btn.textContent = "Begin Day " + s.day;
      btn.addEventListener("click", function () { handlers.beginDay(); });
      done.appendChild(btn);
      box.appendChild(done);
      return;
    }
    D.ACTIONS.forEach(function (a) {
      var affordable = G.canAfford(s, a);
      var btn = document.createElement("button");
      btn.className = "action-card" + (affordable ? "" : " disabled");
      btn.disabled = !affordable;
      btn.setAttribute("aria-label",
        a.name + ", costs " + a.cost + " spoon" + (a.cost === 1 ? "" : "s") + ". " + a.hint);
      btn.innerHTML =
        '<span class="action-icon" aria-hidden="true">' + a.icon + "</span>" +
        '<span class="action-body">' +
        '<span class="action-name">' + a.name +
        '<span class="action-cost">' + (a.cost === 0 ? "free" : a.cost + "🥄") + "</span></span>" +
        '<span class="action-hint">' + a.hint + "</span></span>";
      btn.addEventListener("click", function () { handlers.doAction(a.id); });
      box.appendChild(btn);
    });
  }

  function renderWards(s, handlers) {
    var box = els.wards;
    box.innerHTML = "";
    D.WARDS.forEach(function (w) {
      var owned = s.wards.indexOf(w.id) !== -1;
      var card = document.createElement("div");
      card.className = "ward-card" + (owned ? " owned" : "");
      var costStr = Object.keys(w.cost).map(function (k) {
        var have = s.resources[k] || 0;
        var enough = have >= w.cost[k];
        return '<span class="cost ' + (enough ? "ok" : "short") + '">' + w.cost[k] + " " + k + "</span>";
      }).join(" · ");
      var btnHtml;
      if (owned) {
        btnHtml = '<span class="ward-state">✓ forged</span>';
      } else {
        btnHtml = '<button class="btn btn-forge" data-ward="' + w.id + '">Forge (3🥄)</button>';
      }
      card.innerHTML =
        '<div class="ward-head"><span class="ward-icon" aria-hidden="true">' + w.icon + "</span>" +
        '<span class="ward-name">' + w.name + "</span></div>" +
        '<p class="ward-desc">' + w.desc + "</p>" +
        '<div class="ward-foot"><span class="ward-cost">' + costStr + "</span>" + btnHtml + "</div>";
      box.appendChild(card);
      if (!owned) {
        var fb = card.querySelector("[data-ward]");
        if (fb) {
          var affordable = s.dayActive && s.spoons.current >= 3 &&
            Object.keys(w.cost).every(function (k) { return (s.resources[k] || 0) >= w.cost[k]; });
          fb.disabled = !affordable;
          fb.addEventListener("click", function () { handlers.forgeWard(w.id); });
        }
      }
    });
  }

  function renderLog(s) {
    var box = els.log;
    box.innerHTML = "";
    // newest at the bottom; show the recent slice
    var recent = s.log.slice(-14);
    recent.forEach(function (entry) {
      var line = document.createElement("p");
      line.className = "log-line log-" + entry.kind;
      line.textContent = entry.text;
      box.appendChild(line);
    });
    box.scrollTop = box.scrollHeight;
  }

  function renderJournal(s) {
    var box = els["journal-list"];
    box.innerHTML = "";
    if (s.journalUnlocked.length === 0) {
      box.innerHTML = '<p class="empty">Reflect at the forge to begin your journal.</p>';
      return;
    }
    s.journalUnlocked.forEach(function (id) {
      var j = D.ALL_JOURNAL.find(function (x) { return x.id === id; });
      if (!j) return;
      var det = document.createElement("details");
      det.className = "journal-entry";
      det.innerHTML = "<summary>" + j.title + "</summary><p>" + j.text + "</p>";
      box.appendChild(det);
    });
  }

  function renderNextChapter(s) {
    var nx = G.nextChapter(s);
    if (!nx) {
      els["next-chapter"].textContent = "You've kept the forge through every chapter. Stay as long as it serves you.";
      return;
    }
    var remaining = Math.max(0, nx.embers - s.totals.embers);
    els["next-chapter"].textContent = remaining === 0
      ? "The next chapter opens at day's end…"
      : remaining + " more ember" + (remaining === 1 ? "" : "s") + " until: " + nx.title;
  }

  // ---- Almanac (the world you've built) ----
  function renderAlmanac(s) {
    var box = els["almanac-body"];
    if (!box) return;
    var html = "";

    // Stats strip
    var peopleMet = D.TOWNSFOLK.filter(function (p) { return (s.townsfolk[p.id] || 0) > 0; }).length;
    html += '<div class="alm-stats">' +
      statChip("🗓️", s.realDays, "days kept") +
      statChip("🔥", s.totals.embers, "embers") +
      statChip("🪨", s.wards.length, "wards") +
      statChip("🤝", peopleMet, "of " + D.TOWNSFOLK.length + " met") +
      statChip("🦋", s.glimpses.length, "of " + D.GLIMPSES.length + " glimpsed") +
      statChip("🗺️", (s.discoveries || []).length, "of " + D.DISCOVERIES.length + " charted") +
      "</div>";

    // Townsfolk
    html += '<h3 class="alm-h">Townsfolk of Emberhollow</h3><div class="alm-people">';
    D.TOWNSFOLK.forEach(function (p) {
      var done = s.townsfolk[p.id] || 0;
      var total = p.beats.length;
      var met = done > 0;
      var complete = done >= total;
      var status = !met ? "Not yet met" : complete ? "Thread complete" : "Knowing them (" + done + "/" + total + ")";
      var latest = complete ? p.done : (met ? p.beats[done - 1].text : p.blurb);
      html += '<div class="alm-person' + (met ? " met" : "") + '">' +
        '<div class="alm-person-head"><span class="alm-ic" aria-hidden="true">' + p.icon + "</span>" +
        '<span class="alm-person-name">' + (met ? p.name : "A stranger in the fog") + "</span>" +
        '<span class="alm-person-status">' + status + "</span></div>" +
        '<p class="alm-person-text">' + latest + "</p></div>";
    });
    html += "</div>";

    // Glimpses
    html += '<h3 class="alm-h">Glimpses in the grey</h3><div class="alm-glimpses">';
    D.GLIMPSES.forEach(function (g) {
      var seen = s.glimpses.indexOf(g.id) !== -1;
      html += '<div class="alm-glimpse' + (seen ? " seen" : "") + '">' +
        '<span class="alm-ic" aria-hidden="true">' + (seen ? g.icon : "❓") + "</span>" +
        '<div><span class="alm-gname">' + (seen ? g.name : "Not yet glimpsed") + "</span>" +
        (seen ? '<span class="alm-gtext">' + g.text + "</span>" : "") + "</div></div>";
    });
    html += "</div>";

    // Discoveries (places charted while venturing)
    var disc = s.discoveries || [];
    html += '<h3 class="alm-h">Places charted</h3>';
    html += '<p class="alm-hint">Found only by venturing into the fog.</p><div class="alm-glimpses">';
    D.DISCOVERIES.forEach(function (d) {
      var found = disc.indexOf(d.id) !== -1;
      html += '<div class="alm-glimpse' + (found ? " seen" : "") + '">' +
        '<span class="alm-ic" aria-hidden="true">' + (found ? d.icon : "❓") + "</span>" +
        '<div><span class="alm-gname">' + (found ? d.name : "Uncharted") + "</span>" +
        (found ? '<span class="alm-gtext">' + d.text + "</span>" : "") + "</div></div>";
    });
    html += "</div>";

    box.innerHTML = html;
  }
  function statChip(icon, n, label) {
    return '<span class="alm-chip"><span class="alm-chip-ic" aria-hidden="true">' + icon +
      '</span><strong>' + n + "</strong> " + label + "</span>";
  }

  function renderAll(s, handlers) {
    renderHeader(s);
    renderSpoons(s);
    renderResources(s);
    renderDaysKept(s);
    renderActions(s, handlers);
    renderWards(s, handlers);
    renderLog(s);
    renderJournal(s);
    renderNextChapter(s);
  }

  // ---- settings (accessibility) ----
  function applySettings(st) {
    var root = document.documentElement;
    root.classList.toggle("reduced-motion", !!st.reducedMotion);
    root.classList.toggle("large-text", !!st.largeText);
    root.classList.toggle("high-contrast", !!st.highContrast);
    // cosmetic theme: clear any existing theme-* class, then apply the chosen one
    var existing = [];
    root.classList.forEach(function (c) { if (c.indexOf("theme-") === 0) existing.push(c); });
    existing.forEach(function (c) { root.classList.remove(c); });
    if (st.theme && st.theme !== "dusk") root.classList.add("theme-" + st.theme);
  }

  function showScreen(which) {
    els["screen-title"].hidden = which !== "title";
    els["screen-game"].hidden = which !== "game";
  }

  global.FF_UI = {
    cache: cache,
    renderAll: renderAll,
    renderAlmanac: renderAlmanac,
    renderLog: renderLog,
    applySettings: applySettings,
    showScreen: showScreen,
    els: function () { return els; },
  };
})(window);
