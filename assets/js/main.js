/* Fog & Forge — bootstrap & event wiring
 * Gracefully Glitching LLC
 */
(function (global) {
  "use strict";

  var G = global.FF_GAME;
  var UI = global.FF_UI;

  var state = null;

  // Notify the (optional) account layer that the save changed, so it can
  // sync to the cloud. No-op when accounts aren't configured / signed in.
  function touch() {
    if (window.GGAccount) window.GGAccount.changed(state);
  }

  var handlers = {
    doAction: function (id) {
      var r = G.doAction(state, id);
      if (!r.ok && r.reason) flash(r.reason);
      UI.renderAll(state, handlers);
      announceDayEnd(r);
      touch();
    },
    forgeWard: function (id) {
      var r = G.forgeWard(state, id);
      if (!r.ok && r.reason) flash(r.reason);
      UI.renderAll(state, handlers);
      announceDayEnd(r);
      touch();
    },
    beginDay: function () {
      if (!G.canBeginDay(state)) { UI.renderAll(state, handlers); return; }
      G.beginDay(state);
      G.save(state);
      UI.renderAll(state, handlers);
      touch();
    },
  };

  // Replace the running game with a save pulled from the cloud (cross-device).
  function applyCloudState(obj) {
    if (!obj) return;
    state = obj;
    G.save(state);
    UI.showScreen("game");
    UI.renderAll(state, handlers);
    flash("Restored your forge from the cloud. Welcome back, Day " + state.day + ".");
  }

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
    state.spoonieMode = !!G.loadSettings().spoonieMode; // honor the chosen pace
    G.startGame(state);
    G.save(state);
    UI.showScreen("game");
    UI.renderAll(state, handlers);
    touch();
    if (window.GGAccount) window.GGAccount.reconsiderRestore();
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
    if (window.GGAccount) window.GGAccount.reconsiderRestore();
    // Gentle re-entry: remind the player where they are.
    var nx = G.nextChapter(state);
    var goal = nx
      ? "Next: " + Math.max(0, nx.embers - state.totals.embers) + " more embers toward “" + nx.title + ".”"
      : "You've kept the forge through every chapter. Stay as long as it serves you.";
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

  // ---- Almanac dialog ----
  var almDlg;
  function openAlmanac() {
    if (!almDlg || !state) return;
    UI.renderAlmanac(state);
    if (typeof almDlg.showModal === "function") almDlg.showModal();
    else almDlg.setAttribute("open", "");
  }
  function closeAlmanac() {
    if (!almDlg) return;
    if (typeof almDlg.close === "function") almDlg.close();
    else almDlg.removeAttribute("open");
  }
  function wireAlmanac() {
    almDlg = document.getElementById("almanac-dialog");
    function on(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener("click", fn); }
    on("btn-almanac", openAlmanac);
    on("almanac-close", closeAlmanac);
    on("almanac-done", closeAlmanac);
    if (almDlg) {
      almDlg.addEventListener("click", function (e) {
        if (e.target === almDlg) closeAlmanac();
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
        // Load-modify-save fresh so we never clobber the theme the market set.
        var cur = G.loadSettings();
        cur[key] = input.checked;
        G.saveSettings(cur);
        UI.applySettings(cur);
      });
    }
    bind(els["set-motion"], "reducedMotion");
    bind(els["set-text"], "largeText");
    bind(els["set-contrast"], "highContrast");

    // Full Spoonie Mode is a pacing choice, not a visual one: persist it as a
    // preference AND apply it to the active save (player's autonomy to change).
    var spoonie = els["set-spoonie"];
    if (spoonie) {
      spoonie.checked = !!st.spoonieMode;
      spoonie.addEventListener("change", function () {
        var cur = G.loadSettings();
        cur.spoonieMode = spoonie.checked;
        G.saveSettings(cur);
        if (state) {
          state.spoonieMode = spoonie.checked;
          G.save(state);
          UI.renderAll(state, handlers);
        }
      });
    }
  }

  function init() {
    UI.cache();
    wireTitle();
    wireSettings();
    wireHowTo();
    wireAlmanac();
    if (window.GGAccount) {
      window.GGAccount.ready({ getState: function () { return state; }, applyCloudState: applyCloudState });
    }
    if (window.GGMarket) window.GGMarket.ready();
    UI.showScreen("title");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
