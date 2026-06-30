/* Fog & Forge — bootstrap & event wiring
 * Gracefully Glitching LLC
 */
(function (global) {
  "use strict";

  var G = global.FF_GAME;
  var UI = global.FF_UI;

  var state = null;

  var handlers = {
    doAction: function (id) {
      var r = G.doAction(state, id);
      if (!r.ok && r.reason) flash(r.reason);
      UI.renderAll(state, handlers);
      announceDayEnd(r);
    },
    forgeWard: function (id) {
      var r = G.forgeWard(state, id);
      if (!r.ok && r.reason) flash(r.reason);
      UI.renderAll(state, handlers);
      announceDayEnd(r);
    },
    beginDay: function () {
      G.beginDay(state);
      G.save(state);
      UI.renderAll(state, handlers);
    },
  };

  function announceDayEnd(r) {
    if (r && r.endedDay) {
      // gentle nudge — the action panel already shows the Begin Day button
      flash("The day has ended. Rest is part of the work.");
    }
  }

  // small transient status message via the log live-region
  function flash(msg) {
    var els = UI.els();
    var p = document.createElement("p");
    p.className = "log-line log-flash";
    p.textContent = msg;
    els.log.appendChild(p);
    els.log.scrollTop = els.log.scrollHeight;
  }

  function startNew() {
    if (G.hasSave()) {
      var ok = confirm("Start a new game? Your current forge will be lost.");
      if (!ok) return;
    }
    state = G.newState();
    G.startGame(state);
    G.save(state);
    UI.showScreen("game");
    UI.renderAll(state, handlers);
  }

  function continueGame() {
    var loaded = G.load();
    if (!loaded) { startNew(); return; }
    state = loaded;
    if (!state.dayActive && state.started) {
      // mid-game, between days — show the begin-day prompt
    }
    UI.showScreen("game");
    UI.renderAll(state, handlers);
  }

  function wireTitle() {
    var els = UI.els();
    els["btn-new"].addEventListener("click", startNew);
    els["btn-continue"].addEventListener("click", continueGame);
    els["btn-continue"].disabled = !G.hasSave();
    if (!G.hasSave()) els["btn-continue"].classList.add("disabled");

    els["btn-settings"].addEventListener("click", function () {
      var panel = els["settings-panel"];
      panel.hidden = !panel.hidden;
    });
    els["btn-restart"].addEventListener("click", function () {
      if (confirm("Clear your saved forge and return to the title screen?")) {
        G.clearSave();
        location.reload();
      }
    });
  }

  function wireSettings() {
    var els = UI.els();
    var st = G.loadSettings();
    UI.applySettings(st);
    // honor OS-level reduced motion if the user hasn't chosen
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      st.reducedMotion = st.reducedMotion || true;
      UI.applySettings(st);
    }
    els["set-motion"].checked = !!st.reducedMotion;
    els["set-text"].checked = !!st.largeText;
    els["set-contrast"].checked = !!st.highContrast;

    function bind(input, key) {
      input.addEventListener("change", function () {
        st[key] = input.checked;
        G.saveSettings(st);
        UI.applySettings(st);
      });
    }
    bind(els["set-motion"], "reducedMotion");
    bind(els["set-text"], "largeText");
    bind(els["set-contrast"], "highContrast");
  }

  function init() {
    UI.cache();
    wireTitle();
    wireSettings();
    UI.showScreen("title");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
