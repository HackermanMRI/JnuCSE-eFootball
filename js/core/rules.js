/* =========================================================================
   RULES  —  DO NOT EDIT
   =========================================================================
   The fixed laws of the tournament, as defined by the manager.
   These are constants, not settings. Changing them changes the sport.
   ========================================================================= */

export const POINTS = Object.freeze({
  win: 3,
  draw: 1,
  loss: 0
});

export const TIER = Object.freeze({
  PREMIUM: "premium",
  SECOND: "second"
});

export const TIER_LABEL = Object.freeze({
  premium: "Premium Tier",
  second: "Second Tier"
});

export const STATUS = Object.freeze({
  ONGOING: "ongoing",
  COMPLETED: "completed"
});

/* Ranking chain, in strict priority order.
   Applied left to right; the first difference decides.
   Falls through to head-to-head, then manual order, then registry order. */
export const RANK_CHAIN = Object.freeze([
  { key: "pts", label: "Points" },
  { key: "gd", label: "Goal Difference" },
  { key: "w", label: "Wins" },
  { key: "d", label: "Draws" },
  { key: "gf", label: "Goals Scored" }
]);
