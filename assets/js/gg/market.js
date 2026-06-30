/* Fog & Forge — the Forge Market (optional cosmetics, expansions, codes).
 *
 * Philosophy: the whole game is free. Nothing here gates the core experience,
 * and we NEVER sell spoons, energy, rest, or time — that would betray the
 * premise. The market offers cosmetics, optional content, and a tip jar, plus
 * a redeem field for giveaway / share-to-win codes.
 *
 * Free themes work offline, immediately. Premium items require an entitlement
 * from the player's account (GET /me), so paid content can't be unlocked by
 * editing client code. Purchases (Stripe /checkout) and code redemption
 * (/redeem) are inert until GGConfig is configured — exactly like sign-in.
 */
(function () {
  "use strict";

  var D = window.FF_DATA;
  var G = window.FF_GAME;
  var UI = window.FF_UI;
  var cfg = window.GGConfig;

  var dlg = null, body = null;
  var owned = [];   // entitlement SKUs from the account

  function configured() { return cfg && cfg.isConfigured(); }

  // ---- entitlements ----
  function refresh() {
    if (!configured() || !window.GGAuth || !window.GGAuth.isLoggedIn()) { owned = []; return Promise.resolve(); }
    return window.GGCloud.me().then(function (me) {
      owned = (me && me.entitlements) || [];
    });
  }
  function ownsSku(sku) { return owned.indexOf(sku) !== -1; }
  function ownedThemeIds() {
    var ids = {};
    D.OFFERS.forEach(function (o) {
      if (!ownsSku(o.sku)) return;
      (o.grants || []).forEach(function (g) {
        if (g.indexOf("theme:") === 0) ids[g.slice(6)] = true;
      });
    });
    return ids;
  }
  function themeUnlocked(t) {
    return t.tier === "free" || !!ownedThemeIds()[t.id];
  }

  // ---- theme application (persists in settings, applies instantly) ----
  function currentTheme() {
    try { return G.loadSettings().theme || "dusk"; } catch (e) { return "dusk"; }
  }
  function applyTheme(id) {
    var t = D.THEMES.find(function (x) { return x.id === id; });
    if (!t) return;
    if (!themeUnlocked(t)) { msg("That theme is part of the " + skuName(t.sku) + ". " + buyHint()); return; }
    var st = G.loadSettings();
    st.theme = id;
    G.saveSettings(st);
    UI.applySettings(st);
    render();
  }
  function skuName(sku) {
    var o = D.OFFERS.find(function (x) { return x.sku === sku; });
    return o ? o.name : "premium pack";
  }
  function buyHint() {
    return configured() ? "Find it below to unlock." : "Coming when the Forge Market opens.";
  }

  // ---- purchase / redeem (inert until backend configured) ----
  function buy(sku) {
    if (!configured()) { msg("Purchases open when the Forge Market goes live. The game stays free."); return; }
    if (!window.GGAuth.isLoggedIn()) { msg("Sign in first, so your purchase follows you across devices."); return; }
    window.GGCloud.checkout(sku).then(function (res) {
      if (res && res.url) window.location.assign(res.url);
      else msg("Couldn't open checkout just now. Please try again.");
    });
  }
  function redeem(code) {
    code = (code || "").trim();
    if (!code) { msg("Enter a code to redeem."); return; }
    if (!configured()) { msg("Code redemption opens with the Forge Market. Hold onto your code!"); return; }
    if (!window.GGAuth.isLoggedIn()) { msg("Sign in first, so your unlock is saved to your account."); return; }
    window.GGCloud.redeem(code).then(function (res) {
      if (res && res.ok) { refresh().then(render); msg("Redeemed — enjoy! ✦"); }
      else msg("That code didn't work. Double-check it, or it may have expired.");
    });
  }
  function msg(t) {
    var m = document.getElementById("market-msg");
    if (m) m.textContent = t;
  }

  // ---- render ----
  function render() {
    if (!body) return;
    var cur = currentTheme();
    var html = "";

    html += '<p class="mkt-lede">Fog &amp; Forge is free, forever. These are optional — cosmetics, extra world, and a tip jar — for folks who want to support the studio. None of it touches your spoons, the fog, or the story.</p>';

    // Appearance / themes
    html += '<h3 class="alm-h">Appearance</h3><div class="mkt-themes">';
    D.THEMES.forEach(function (t) {
      var unlocked = themeUnlocked(t);
      var active = cur === t.id;
      html += '<button class="mkt-theme sw-' + t.id + (active ? " active" : "") + (unlocked ? "" : " locked") +
        '" data-theme="' + t.id + '" aria-pressed="' + active + '">' +
        '<span class="mkt-sw" aria-hidden="true"></span>' +
        '<span class="mkt-theme-name">' + t.name + (active ? " ✓" : "") + "</span>" +
        '<span class="mkt-theme-desc">' + t.desc + "</span>" +
        '<span class="mkt-theme-tag">' + (t.tier === "free" ? "Free" : unlocked ? "Owned" : "🔒 " + skuName(t.sku)) + "</span>" +
        "</button>";
    });
    html += "</div>";

    // Offers
    html += '<h3 class="alm-h">Support &amp; extras</h3><div class="mkt-offers">';
    D.OFFERS.forEach(function (o) {
      var got = ownsSku(o.sku);
      var soon = o.status === "soon";
      var btn = got
        ? '<span class="mkt-owned">✓ Owned</span>'
        : soon
          ? '<span class="mkt-soon">Coming soon</span>'
          : '<button class="btn btn-forge btn-small" data-buy="' + o.sku + '">' + o.price + "</button>";
      html += '<div class="mkt-offer mkt-' + o.kind + (got ? " got" : "") + '">' +
        '<div class="mkt-offer-head"><span class="mkt-offer-name">' + o.name + "</span>" +
        '<span class="mkt-kind">' + o.kind + "</span></div>" +
        '<p class="mkt-offer-desc">' + o.desc + "</p>" +
        '<div class="mkt-offer-foot">' + btn + "</div></div>";
    });
    html += "</div>";

    // Redeem + tip
    html += '<h3 class="alm-h">Have a code?</h3>' +
      '<p class="mkt-redeem-note">Win codes by sharing Gracefully Glitching posts, or from giveaways. Redeem one here to unlock an item free.</p>' +
      '<div class="mkt-redeem"><input id="market-code" type="text" placeholder="Enter a code" autocomplete="off" aria-label="Redeem code" />' +
      '<button class="btn btn-small" id="market-redeem-btn">Redeem</button></div>' +
      '<p id="market-msg" class="mkt-msg" role="status" aria-live="polite"></p>' +
      '<p class="mkt-tip">Prefer to just tip? <a href="https://ko-fi.com/gracefullyglitching" target="_blank" rel="noopener">Support the studio on Ko-fi ☕</a></p>';

    body.innerHTML = html;
    wireDynamic();
  }

  function wireDynamic() {
    body.querySelectorAll("[data-theme]").forEach(function (el) {
      el.addEventListener("click", function () { applyTheme(el.getAttribute("data-theme")); });
    });
    body.querySelectorAll("[data-buy]").forEach(function (el) {
      el.addEventListener("click", function () { buy(el.getAttribute("data-buy")); });
    });
    var rb = document.getElementById("market-redeem-btn");
    if (rb) rb.addEventListener("click", function () {
      var input = document.getElementById("market-code");
      redeem(input ? input.value : "");
    });
  }

  // ---- open/close ----
  function open() {
    if (!dlg) return;
    render();
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
  }
  function close() {
    if (!dlg) return;
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  }

  window.GGMarket = {
    ready: function () {
      dlg = document.getElementById("market-dialog");
      body = document.getElementById("market-body");
      function on(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener("click", fn); }
      on("btn-market", open);
      on("market-close", close);
      on("market-done", close);
      if (dlg) dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
      refresh();
    },
    open: open,
    currentTheme: currentTheme,
  };
})();
