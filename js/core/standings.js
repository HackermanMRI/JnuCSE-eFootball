/* =========================================================================
   STANDINGS  —  DO NOT EDIT
   =========================================================================
   Turns raw fixtures into a ranked table.
   Nothing here reads config; the laws come from rules.js only.
   ========================================================================= */

import { POINTS } from "./rules.js";
import { resolveTies } from "./tiebreak.js";

/* A fixture counts only when BOTH scores are real numbers. */
export function isPlayed(fx) {
  return Number.isInteger(fx.ag) && Number.isInteger(fx.bg);
}

/* Chronological order: leg first, then round, then the order you typed them. */
export function chronological(fixtures) {
  return fixtures
    .map((fx, i) => ({ fx, i }))
    .sort((x, y) =>
      (x.fx.leg - y.fx.leg) || (x.fx.r - y.fx.r) || (x.i - y.i)
    )
    .map(o => o.fx);
}

function blankRow(id) {
  return {
    id, p: 0, w: 0, d: 0, l: 0,
    gf: 0, ga: 0, gd: 0, pts: 0,
    form: [],          // ["W","D","L"...] oldest first
    results: []        // every played match, chronological
  };
}

/* Accumulate one played fixture into both players' rows. */
function applyFixture(rows, fx) {
  const A = rows.get(fx.a);
  const B = rows.get(fx.b);
  if (!A || !B) return;

  A.p++; B.p++;
  A.gf += fx.ag; A.ga += fx.bg;
  B.gf += fx.bg; B.ga += fx.ag;

  let ar, br;
  if (fx.ag > fx.bg)      { A.w++; B.l++; A.pts += POINTS.win;  B.pts += POINTS.loss; ar = "W"; br = "L"; }
  else if (fx.ag < fx.bg) { B.w++; A.l++; B.pts += POINTS.win;  A.pts += POINTS.loss; ar = "L"; br = "W"; }
  else                    { A.d++; B.d++; A.pts += POINTS.draw; B.pts += POINTS.draw; ar = "D"; br = "D"; }

  A.form.push(ar); B.form.push(br);
  A.results.push({ fx, opponent: fx.b, for: fx.ag, against: fx.bg, outcome: ar });
  B.results.push({ fx, opponent: fx.a, for: fx.bg, against: fx.ag, outcome: br });
}

/**
 * Build a ranked table.
 * @param {string[]} playerIds  roster for this tier this season
 * @param {object[]} fixtures   that tier's fixture list
 * @param {object}   ctx        { manualOrder, registryOrder }
 */
export function computeTable(playerIds, fixtures, ctx = {}) {
  const rows = new Map(playerIds.map(id => [id, blankRow(id)]));

  for (const fx of chronological(fixtures)) {
    if (isPlayed(fx)) applyFixture(rows, fx);
  }

  const table = [...rows.values()];
  for (const r of table) r.gd = r.gf - r.ga;

  const ranked = resolveTies(table, fixtures, ctx);
  ranked.forEach((r, i) => { r.rank = i + 1; });
  return ranked;
}

/* Last N results as a form string, oldest on the left. */
export function formString(row, n) {
  return row.form.slice(-n);
}

/* Split a tier's fixtures into played and unplayed, chronologically. */
export function splitFixtures(fixtures) {
  const ordered = chronological(fixtures);
  return {
    played: ordered.filter(isPlayed),
    upcoming: ordered.filter(fx => !isPlayed(fx))
  };
}
