/* Fog & Forge — account orchestration.
 *
 * Ties GG auth + cloud sync to the game. Entirely inert unless
 * GGConfig.isConfigured(): with no backend, the account bar stays hidden and
 * Fog & Forge is the original anonymous, offline, device-local experience.
 *
 * Cloud model: the player's whole Fog & Forge save IS the "savedGame" stored
 * via PUT /saved-game. On sign-in we pull /me; if the cloud save is further
 * along than what's on this device, we offer to restore it — so you can keep
 * one forge across phone, laptop, and tablet.
 */
(function () {
  "use strict";

  var cfg = window.GGConfig;
  var GAME_ID = "forge";  // namespaces this game's cloud save (savedGames[GAME_ID])
  var app = null;        // { getState, applyCloudState }
  var els = {};
  var saveTimer = null;
  var meCache = null;

  // Fog & Forge's own cloud save ONLY — never the shared/legacy slot, which may
  // belong to another GG game (e.g. Solitaire). No cross-game restore.
  function cloudSave(me) {
    return (me && me.savedGames && me.savedGames[GAME_ID]) || null;
  }

  function $(id) { return document.getElementById(id); }
  function show(el, on) { if (el) el.hidden = !on; }
  function text(el, t) { if (el) el.textContent = t; }

  // "Further along" = more lifetime embers, then more days. Used to decide
  // whether the cloud save should be offered as a restore over the local one.
  function progressScore(s) {
    if (!s) return -1;
    var embers = (s.totals && s.totals.embers) || 0;
    var day = s.day || 0;
    return embers * 1000 + day;
  }

  function renderBar() {
    if (!cfg.isConfigured()) { show(els.bar, false); return; }
    show(els.bar, true);
    var loggedIn = window.GGAuth.isLoggedIn();
    show(els.signedOut, !loggedIn);
    show(els.signedIn, loggedIn);
    if (loggedIn) {
      var p = window.GGAuth.profile();
      text(els.email, p && p.email ? p.email : "Signed in");
    }
  }

  function refreshMe() {
    return window.GGCloud.me().then(function (me) {
      meCache = me;
      return me;
    });
  }

  function maybeOfferRestore() {
    if (!app) return;
    var cloud = cloudSave(meCache);
    var ahead = cloud && progressScore(cloud) > progressScore(app.getState());
    if (ahead) {
      var d = cloud.day || 1;
      text(els.restoreNote, "A more recent forge is saved to your account (Day " + d + ").");
      show(els.restore, true);
    } else {
      text(els.restoreNote, "");
      show(els.restore, false);
    }
  }

  function doRestore() {
    var cloud = cloudSave(meCache);
    if (cloud && app) {
      app.applyCloudState(cloud);
      show(els.restore, false);
    }
  }

  // Debounced push of the whole save to the cloud after any change.
  function debouncedSave(stateObj) {
    if (!window.GGAuth.isLoggedIn()) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      window.GGCloud.saveGame(stateObj, GAME_ID);
    }, 1500);
  }

  window.GGAccount = {
    // Called once by main.js after the app is wired.
    ready: function (appApi) {
      app = appApi;
      els = {
        bar: $("ff-account"),
        signedOut: $("ff-signed-out"),
        signedIn: $("ff-signed-in"),
        email: $("ff-email"),
        restore: $("ff-restore"),
        restoreNote: $("ff-restore-note"),
      };
      if ($("ff-signin")) $("ff-signin").addEventListener("click", function () { window.GGAuth.login(); });
      if ($("ff-signout")) $("ff-signout").addEventListener("click", function () { window.GGAuth.logout(); });
      if (els.restore) els.restore.addEventListener("click", doRestore);

      if (!cfg.isConfigured()) { renderBar(); return; }
      window.GGAuth.handleRedirect().then(function () {
        renderBar();
        if (window.GGAuth.isLoggedIn()) {
          refreshMe().then(maybeOfferRestore);
        }
      });
    },

    // Called by main.js whenever the game state changes.
    changed: function (stateObj) {
      debouncedSave(stateObj);
    },

    // Re-evaluate the cloud-restore offer (e.g. after a local save loads).
    reconsiderRestore: function () { maybeOfferRestore(); },

    isOn: function () { return !!(cfg && cfg.isConfigured()); },
  };
})();
