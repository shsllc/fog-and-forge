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
      "spoons", "res-ore", "res-ember", "res-calm", "embers-total",
      "actions", "wards", "log", "journal", "journal-list",
      "next-chapter", "settings-panel", "btn-restart",
      "set-motion", "set-text", "set-contrast",
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
      var j = D.JOURNAL.find(function (x) { return x.id === id; });
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
      els["next-chapter"].textContent = "You've reached the Clearing. Keep the forge as long as it serves you.";
      return;
    }
    var remaining = Math.max(0, nx.embers - s.totals.embers);
    els["next-chapter"].textContent = remaining === 0
      ? "The next chapter opens at day's end…"
      : remaining + " more ember" + (remaining === 1 ? "" : "s") + " until: " + nx.title;
  }

  function renderAll(s, handlers) {
    renderHeader(s);
    renderSpoons(s);
    renderResources(s);
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
  }

  function showScreen(which) {
    els["screen-title"].hidden = which !== "title";
    els["screen-game"].hidden = which !== "game";
  }

  global.FF_UI = {
    cache: cache,
    renderAll: renderAll,
    renderLog: renderLog,
    applySettings: applySettings,
    showScreen: showScreen,
    els: function () { return els; },
  };
})(window);
