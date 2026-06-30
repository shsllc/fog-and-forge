/* GG Games — frontend config (shared across all Gracefully Glitching games).
 *
 * ANONYMOUS by default: with blank backend values, isConfigured() is false,
 * every auth/cloud call is a no-op, and Fog & Forge is the original offline
 * game — no login UI, no network. This is the correct state for the
 * standalone fog-and-forge.netlify.app submission.
 *
 * TO ENABLE ACCOUNTS + CLOUD SYNC (when deploying under the shared games
 * origin, e.g. games.gracefullyglitching.com/forge/):
 *   1. Fill in the four values below from the gg-games-backend CDK outputs.
 *      The live values currently are:
 *        region:        "us-west-2"
 *        userPoolId:    "us-west-2_AoP2ViGRY"
 *        clientId:      "3mki8hlo76b890llr5jt9voskt"
 *        hostedUiDomain:"https://gg-games-auth.auth.us-west-2.amazoncognito.com"
 *        apiBaseUrl:    "https://2ubwh2qob7.execute-api.us-west-2.amazonaws.com"
 *   2. Register THIS game's callback + logout URL in the Cognito app client
 *      (e.g. "https://games.gracefullyglitching.com/forge/"). Cognito only
 *      redirects to exact, pre-registered URLs.
 *   3. Deploy under the SAME origin as the hub so one sign-in covers every
 *      game (tokens live in shared localStorage, keyed per origin).
 */
window.GGConfig = {
  region: "",
  userPoolId: "",
  clientId: "",
  hostedUiDomain: "",
  apiBaseUrl: "",

  // OAuth redirect target — must be an exact registered Cognito callback URL.
  // Generic: the directory this page is served from (origin + path up to the
  // last slash). Works at "/", "/forge/", "/spider/", etc.
  get redirectUri() {
    var p = window.location.pathname;
    return window.location.origin + p.slice(0, p.lastIndexOf("/") + 1);
  },
  get logoutUri() {
    return this.redirectUri;
  },

  isConfigured: function () {
    return !!(this.clientId && this.hostedUiDomain && this.apiBaseUrl);
  },
};
