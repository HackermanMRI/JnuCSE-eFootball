/* =========================================================================
   TIEBREAK  —  DO NOT EDIT
   =========================================================================
   The approved ranking ladder, in order:

     1. Points
     2. Goal Difference
     3. Wins
     4. Draws
     5. Goals Scored
     6. Head-to-head mini-league between the tied players only
     7. Manual order set by the manager in the season file
     8. Registry order (players.js), so a table is never undecided

   Any table that reaches step 7 or 8 raises a notice on the site so the
   manager knows a manual decision is outstanding.
   ========================================================================= */

import { POINTS, RANK_CHAIN } from "./rules.js";
import { isPlayed } from "./standings.js";

/* Steps 1–5. Returns 0 when the two rows are inseparable. */
function compareChain(a, b) {
  for (const { key } of RANK_CHAIN) {
    if (b[key] !== a[key]) return b[key] - a[key];
  }
  return 0;
}

/**
 * Head-to-head: rebuild a miniature table using ONLY the matches played
 * between the tied players, then rank by Points, GD, Goals Scored.
 */
function headToHead(groupIds, fixtures) {
  const set = new Set(groupIds);
  const mini = new Map(groupIds.map(id => [id, { id, pts: 0, gf: 0, ga: 0, gd: 0, p: 0 }]));

  for (const fx of fixtures) {
    if (!isPlayed(fx)) continue;
    if (!set.has(fx.a) || !set.has(fx.b)) continue;

    const A = mini.get(fx.a), B = mini.get(fx.b);
    A.p++; B.p++;
    A.gf += fx.ag; A.ga += fx.bg;
    B.gf += fx.bg; B.ga += fx.ag;
    if (fx.ag > fx.bg)      { A.pts += POINTS.win; }
    else if (fx.ag < fx.bg) { B.pts += POINTS.win; }
    else                    { A.pts += POINTS.draw; B.pts += POINTS.draw; }
  }

  for (const m of mini.values()) m.gd = m.gf - m.ga;
  return mini;
}

/**
 * @param {object[]} table      unranked rows
 * @param {object[]} fixtures   the tier's fixtures
 * @param {object}   ctx        { manualOrder: {id:number}, registryOrder: {id:number},
 *                               onNotice: fn(message) }
 */
export function resolveTies(table, fixtures, ctx = {}) {
  const manual = ctx.manualOrder || {};
  const registry = ctx.registryOrder || {};
  const notice = ctx.onNotice || (() => {});

  /* Step 1: sort by the main chain. */
  const sorted = table.slice().sort(compareChain);

  /* Step 2: find runs of rows the chain could not separate. */
  const out = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && compareChain(sorted[i], sorted[j]) === 0) j++;

    if (j - i === 1) {
      out.push(sorted[i]);
    } else {
      const group = sorted.slice(i, j);
      out.push(...breakGroup(group, fixtures, manual, registry, notice));
    }
    i = j;
  }
  return out;
}

function breakGroup(group, fixtures, manual, registry, notice) {
  const ids = group.map(r => r.id);
  const mini = headToHead(ids, fixtures);

  return group.slice().sort((a, b) => {
    const ma = mini.get(a.id), mb = mini.get(b.id);

    /* Step 6 — head-to-head, only meaningful if they have actually met. */
    if (ma.p > 0 && mb.p > 0) {
      if (mb.pts !== ma.pts) { a._brokenBy = b._brokenBy = "h2h"; return mb.pts - ma.pts; }
      if (mb.gd  !== ma.gd)  { a._brokenBy = b._brokenBy = "h2h"; return mb.gd  - ma.gd;  }
      if (mb.gf  !== ma.gf)  { a._brokenBy = b._brokenBy = "h2h"; return mb.gf  - ma.gf;  }
    }

    /* Step 7 — manual order from the season file. Lower number ranks higher. */
    const qa = manual[a.id], qb = manual[b.id];
    if (Number.isFinite(qa) && Number.isFinite(qb) && qa !== qb) {
      a._brokenBy = b._brokenBy = "manual";
      return qa - qb;
    }

    /* Step 8 — registry order, purely so the table always renders.
       Players who have not played yet are level for the obvious reason,
       so that is not worth telling the manager about. */
    a._brokenBy = b._brokenBy = "unresolved";
    if (a.p > 0 && b.p > 0) {
      notice(
        `${a.id} and ${b.id} are level on every tiebreak. ` +
        `Set tiebreakOrder in the season file to decide this.`
      );
    }
    return (registry[a.id] ?? 0) - (registry[b.id] ?? 0);
  });
}
