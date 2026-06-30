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

  var HELP_SEEN_KEY = "fogforge.seenhelp.v1";

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
    // First-timers get the walkthrough automatically (once).
    try {
      if (!localStorage.getItem(HELP_SEEN_KEY)) {
        openHelp();
        localStorage.setItem(HELP_SEEN_KEY, "1");
      }
    } catch (e) {}
  }

  function continueGame() {
    var loaded = G.load();
    if (!loaded) { startNew(); return; }
    state = loaded;
    UI.showScreen("game");
    UI.renderAll(state, handlers);
    // Gentle re-entry: remind the player where they are.
    var nx = G.nextChapter(state);
    var goal = nx
      ? "Next: " + Math.max(0, nx.embers - state.totals.embers) + " more embers toward “" + nx.title + ".”"
      : "You've reached the Clearing. Keep the forge as long as it serves you.";
    flash("Welcome back to the forge. Day " + state.day + ". " + goal);
  }

  // ---- How to Play dialog ----
  var dlg;
  function openHelp() {
    if (!dlg) return;
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
  }
  function closeHelp() {
    if (!dlg) return;
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  }
  function wireHowTo() {
    dlg = document.getElementById("how-dialog");
    function on(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener("click", fn); }
    on("btn-how", openHelp);
    on("btn-help", openHelp);
    on("how-close", closeHelp);
    on("how-start", closeHelp);
    // click on the backdrop (outside the inner card) closes it
    if (dlg) {
      dlg.addEventListener("click", function (e) {
        if (e.target === dlg) closeHelp();
      });
    }
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
    wireHowTo();
    UI.showScreen("title");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
