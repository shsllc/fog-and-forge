/* GG Games — Cognito Hosted UI auth (Authorization Code + PKCE).
 *
 * One hosted sign-in surface handles email+password, passwordless email OTP,
 * and Google. We never see passwords; we just redirect, exchange the code for
 * tokens, and store them. All methods are inert until GGConfig.isConfigured().
 *
 * Shared verbatim with the GG games hub — do not fork its behaviour here.
 */
(function () {
  "use strict";

  var TOKENS_KEY = "gg-games-tokens-v1";
  var VERIFIER_KEY = "gg-games-pkce-verifier";
  var cfg = window.GGConfig;

  // ---- small crypto/encoding helpers ----------------------------------
  function b64url(bytes) {
    var s = btoa(String.fromCharCode.apply(null, new Uint8Array(bytes)));
    return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function randomString(len) {
    var arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return b64url(arr);
  }
  async function sha256(str) {
    var data = new TextEncoder().encode(str);
    return crypto.subtle.digest("SHA-256", data);
  }
  function decodeJwt(token) {
    try {
      var p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(decodeURIComponent(escape(atob(p))));
    } catch (_) {
      return null;
    }
  }

  // ---- token storage ---------------------------------------------------
  function loadTokens() {
    try { return JSON.parse(localStorage.getItem(TOKENS_KEY)) || null; } catch (_) { return null; }
  }
  function saveTokens(t) {
    t.obtainedAt = Date.now();
    localStorage.setItem(TOKENS_KEY, JSON.stringify(t));
  }
  function clearTokens() { localStorage.removeItem(TOKENS_KEY); }

  function isExpired(t) {
    if (!t || !t.expires_in) return true;
    return Date.now() > t.obtainedAt + (t.expires_in - 60) * 1000; // 60s skew
  }

  // ---- OAuth flow ------------------------------------------------------
  async function login() {
    if (!cfg.isConfigured()) return;
    var verifier = randomString(64);
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    var challenge = b64url(await sha256(verifier));
    var url =
      cfg.hostedUiDomain +
      "/oauth2/authorize?response_type=code" +
      "&client_id=" + encodeURIComponent(cfg.clientId) +
      "&redirect_uri=" + encodeURIComponent(cfg.redirectUri) +
      "&scope=" + encodeURIComponent("openid email profile") +
      "&code_challenge_method=S256" +
      "&code_challenge=" + challenge;
    window.location.assign(url);
  }

  async function exchangeCode(code) {
    var verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!verifier) throw new Error("missing PKCE verifier");
    var body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cfg.clientId,
      code: code,
      redirect_uri: cfg.redirectUri,
      code_verifier: verifier,
    });
    var res = await fetch(cfg.hostedUiDomain + "/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) throw new Error("token exchange failed");
    var tokens = await res.json();
    saveTokens(tokens);
    sessionStorage.removeItem(VERIFIER_KEY);
    return tokens;
  }

  async function refresh() {
    var t = loadTokens();
    if (!t || !t.refresh_token) return null;
    var body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: cfg.clientId,
      refresh_token: t.refresh_token,
    });
    var res = await fetch(cfg.hostedUiDomain + "/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) { clearTokens(); return null; }
    var fresh = await res.json();
    fresh.refresh_token = fresh.refresh_token || t.refresh_token; // Cognito omits on refresh
    saveTokens(fresh);
    return fresh;
  }

  // Call on page load — completes the redirect if ?code= is present.
  async function handleRedirect() {
    if (!cfg.isConfigured()) return false;
    var params = new URLSearchParams(window.location.search);
    var code = params.get("code");
    if (!code) return false;
    try {
      await exchangeCode(code);
    } catch (e) {
      console.warn("auth redirect failed", e);
    }
    // Strip OAuth params from the URL.
    params.delete("code");
    params.delete("state");
    var clean = window.location.pathname + (params.toString() ? "?" + params : "");
    window.history.replaceState({}, document.title, clean);
    return true;
  }

  async function getAccessToken() {
    var t = loadTokens();
    if (!t) return null;
    if (isExpired(t)) t = await refresh();
    return t ? t.access_token : null;
  }

  function isLoggedIn() {
    return !!loadTokens();
  }

  function profile() {
    var t = loadTokens();
    if (!t || !t.id_token) return null;
    var claims = decodeJwt(t.id_token);
    return claims ? { email: claims.email, sub: claims.sub } : null;
  }

  function logout() {
    clearTokens();
    if (!cfg.isConfigured()) return;
    var url =
      cfg.hostedUiDomain +
      "/logout?client_id=" + encodeURIComponent(cfg.clientId) +
      "&logout_uri=" + encodeURIComponent(cfg.logoutUri);
    window.location.assign(url);
  }

  window.GGAuth = {
    login: login,
    logout: logout,
    handleRedirect: handleRedirect,
    getAccessToken: getAccessToken,
    isLoggedIn: isLoggedIn,
    profile: profile,
  };
})();
