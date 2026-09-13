/* =========================================================================
   SEASON ENGINE  —  DO NOT EDIT
   =========================================================================
   Works out who plays in which tier each season, and what happened at the
   end of each completed season.

   Roster inheritance, in order:

     1. Start from last season's final tables.
     2. Move players between tiers (promotion / relegation / resizing).
     3. Remove anyone listed in `leave`.
     4. Append anyone listed in `join` to Second Tier.
     5. Backfill Premium from the top of Second if departures left it short.

   `forceRosters` in a season file skips steps 1–2 entirely.
   ========================================================================= */

import { TIER, STATUS } from "./rules.js";

/**
 * Decide how many go up and how many come down.
 * Approved rules:
 *   - Premium stays the same size -> promotionCount up, promotionCount down.
 *   - Premium grows by g          -> g promoted, nobody relegated.
 *   - Premium shrinks by g        -> g relegated, nobody promoted.
 *   - Second Tier has <= promotionCount players -> all of them go up.
 */
export function movementPlan(prevPremiumSize, prevSecondSize, targetPremiumSize, promotionCount) {
  const delta = targetPremiumSize - prevPremiumSize;

  let up, down;
  if (delta === 0)     { up = promotionCount; down = promotionCount; }
  else if (delta > 0)  { up = delta;          down = 0; }
  else                 { up = 0;              down = -delta; }

  /* A Second Tier too small to sustain the promotion count sends everyone up. */
  if (prevSecondSize > 0 && prevSecondSize <= promotionCount) {
    up = prevSecondSize;
  } else {
    up = Math.min(up, prevSecondSize);
  }
  down = Math.min(down, prevPremiumSize);

  return { up, down };
}

/**
 * Summarise a completed season.
 * @param {object} tables  { premium: rankedRows, second: rankedRows }
 */
export function closeSeason(number, tables, promotionCount, plan) {
  const prem = tables.premium || [];
  const sec = tables.second || [];

  return {
    season: number,
    champion: prem.length ? prem[0].id : null,
    relegated: plan.down ? prem.slice(-plan.down).map(r => r.id) : [],
    promoted: plan.up ? sec.slice(0, plan.up).map(r => r.id) : [],
    premiumTable: prem,
    secondTable: sec
  };
}

/**
 * Build next season's rosters from the previous season's outcome.
 * @returns {{premium:string[], second:string[], notices:string[]}}
 */
export function inheritRosters(prevOutcome, meta, config) {
  const notices = [];
  const join = meta.join || [];
  const leave = new Set(meta.leave || []);

  /* --- Manual takeover ------------------------------------------------- */
  if (meta.forceRosters) {
    notices.push(
      `Season ${meta.number} is using forceRosters. Promotion and relegation ` +
      `from Season ${meta.number - 1} were not applied.`
    );
    return {
      premium: meta.forceRosters.premium.slice(),
      second: meta.forceRosters.second.slice(),
      notices
    };
  }

  const prevPrem = prevOutcome.premiumTable.map(r => r.id);
  const prevSec = prevOutcome.secondTable.map(r => r.id);

  /* --- Steps 1–2: movement --------------------------------------------- */
  const relegated = new Set(prevOutcome.relegated);
  const promoted = new Set(prevOutcome.promoted);

  let premium = prevPrem.filter(id => !relegated.has(id))
                        .concat(prevOutcome.promoted);
  let second = prevSec.filter(id => !promoted.has(id))
                      .concat(prevOutcome.relegated);

  /* --- Step 3: departures ---------------------------------------------- */
  if (leave.size) {
    const goneFromPremium = premium.filter(id => leave.has(id));
    premium = premium.filter(id => !leave.has(id));
    second = second.filter(id => !leave.has(id));
    if (goneFromPremium.length) {
      notices.push(
        `${goneFromPremium.join(", ")} left Premium Tier before Season ${meta.number}.`
      );
    }
  }

  /* --- Step 4: arrivals ------------------------------------------------- */
  for (const id of join) {
    if (!second.includes(id) && !premium.includes(id)) second.push(id);
  }

  /* --- Step 5: backfill Premium ---------------------------------------- */
  const target = config.premiumSize;
  while (premium.length < target && second.length > 0) {
    const lifted = second.shift();
    premium.push(lifted);
    notices.push(
      `${lifted} was moved up to fill an empty Premium Tier place in Season ${meta.number}.`
    );
  }
  while (premium.length > target) {
    const dropped = premium.pop();
    second.unshift(dropped);
    notices.push(
      `${dropped} was moved down because Premium Tier was over capacity in Season ${meta.number}.`
    );
  }

  return { premium, second, notices };
}

export function isCompleted(meta) {
  return meta.status === STATUS.COMPLETED;
}

export { TIER };
