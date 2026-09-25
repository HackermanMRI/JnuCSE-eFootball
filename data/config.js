/* =========================================================================
   CONFIG  —  you may edit this file
   =========================================================================
   Site identity and tournament sizing live here.
   Nothing in this file affects how points or rankings are calculated.
   ========================================================================= */

export const CONFIG = {

  /* ---- Site identity ---------------------------------------------------- */
  siteName: "JnUCSE eFootball",
  logo: "assets/logo.svg",          // replace this file with your own logo

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
  recentMatchesCount: 10, // how many played matches the "Recent" tab lists
  upcomingMatchesCount: 10 // how many unplayed matches the "Upcoming" tab lists
};
