/* =========================================================================
   CONFIG  —  you may edit this file
   =========================================================================
   Site identity and tournament sizing live here.
   Nothing in this file affects how points or rankings are calculated.
   ========================================================================= */

export const CONFIG = {

  /* ---- Site identity ---------------------------------------------------- */
  siteName: "JnUCSE eFootball",
  logo: "assets/logo.jpg",          // replace this file with your own logo (JPG or PNG; see docs/09-SPEED.md)

  /* ---- Tier sizing ------------------------------------------------------ */
  // How many players sit in Premium Tier.
  // Second Tier automatically holds everyone else.
  // If you change this, read docs/06-RULES-REFERENCE.md first — the season
  // after the change will promote or relegate extra players to rebalance.
  premiumSize: 10,

  // How many go up from Second and down from Premium each season.
  promotionCount: 3,

  /* ---- Display -------------------------------------------------------- */
  formLength: 5,          // how many recent results the W/D/L form string shows
  // The Recent and Upcoming tabs scroll on until the first / last match of
  // the season. These two numbers are how many matches load at a time.
  recentMatchesCount: 10,   // "Recent": matches added per scroll
  upcomingMatchesCount: 10  // "Upcoming": matches added per scroll
};
