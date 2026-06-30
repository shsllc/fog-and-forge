/* GG Games — API client for the AWS backend (shared across games).
 *
 * Every call is a no-op (resolves to null) unless the app is configured AND
 * the player is signed in. This keeps anonymous play fully offline.
 *
 * Endpoints (gg-games-backend):
 *   GET  /me           -> profile, progress, entitlements, savedGame
 *   PUT  /saved-game   -> store (or clear, with null) the in-progress game
 *   POST /game-completed
 *   POST /checkout     (Stripe; unused by Fog & Forge)
 */
(function () {
  "use strict";
  var cfg = window.GGConfig;

  async function authedFetch(path, options) {
    if (!cfg.isConfigured()) return null;
    var token = await window.GGAuth.getAccessToken();
    if (!token) return null;
    options = options || {};
    options.headers = Object.assign(
      { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      options.headers || {}
    );
    var res = await fetch(cfg.apiBaseUrl + path, options);
    if (res.status === 402) return { paymentRequired: true };
    if (!res.ok) throw new Error("api " + path + " -> " + res.status);
    var text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  // GET /me — profile, progress, entitlements, and any cloud-saved game.
  function me() {
    return authedFetch("/me", { method: "GET" }).catch(function (e) {
      console.warn("cloud.me failed", e);
      return null;
    });
  }

  // PUT /saved-game — store (or clear, with null) the in-progress game.
  function saveGame(state) {
    return authedFetch("/saved-game", {
      method: "PUT",
      body: JSON.stringify({ savedGame: state || null }),
    }).catch(function () { return null; });
  }

  // POST /game-completed — record a finished game.
  function gameCompleted(payload) {
    return authedFetch("/game-completed", {
      method: "POST",
      body: JSON.stringify(payload),
    }).catch(function (e) { console.warn("cloud.gameCompleted failed", e); return null; });
  }

  // POST /checkout — Stripe Checkout session for a one-time SKU.
  function checkout(sku) {
    return authedFetch("/checkout", {
      method: "POST",
      body: JSON.stringify({ sku: sku }),
    }).catch(function (e) { console.warn("cloud.checkout failed", e); return null; });
  }

  // POST /redeem — redeem a giveaway / share-to-win code for an entitlement.
  function redeem(code) {
    return authedFetch("/redeem", {
      method: "POST",
      body: JSON.stringify({ code: code }),
    }).catch(function (e) { console.warn("cloud.redeem failed", e); return null; });
  }

  window.GGCloud = {
    me: me,
    saveGame: saveGame,
    gameCompleted: gameCompleted,
    checkout: checkout,
    redeem: redeem,
  };
})();
