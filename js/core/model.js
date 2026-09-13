/* =========================================================================
   MODEL  —  DO NOT EDIT
   =========================================================================
   Reads the data files, runs the engine, and produces one frozen object
   that the UI renders. The UI never calculates anything itself.
   ========================================================================= */

import { CONFIG } from "../../data/config.js";
import { PLAYERS } from "../../data/players.js";
import { NEWS } from "../../data/news.js";
import { SEASONS } from "../../data/seasons/_index.js";

import { TIER, STATUS } from "./rules.js";
import { computeTable, splitFixtures, chronological, isPlayed } from "./standings.js";
import { movementPlan, closeSeason, inheritRosters } from "./season.js";
import { buildRecords } from "./stats.js";
import * as V from "./validate.js";

function playerIndex() {
  const byId = new Map();
  const order = {};
  PLAYERS.forEach((p, i) => { byId.set(p.id, p); order[p.id] = i; });
  return { byId, order };
}

export function buildModel() {
  const report = V.createReport();
  const { byId, order } = playerIndex();

  V.validatePlayers(PLAYERS, report);

  const seasons = [];
  let prevOutcome = null;

  const ordered = SEASONS.slice().sort((a, b) => a.meta.number - b.meta.number);

  for (const src of ordered) {
    const meta = src.meta;
    const n = meta.number;

    /* ---- Rosters ----------------------------------------------------- */
    let rosters, notices = [];

    if (n === ordered[0].meta.number || !prevOutcome) {
      const base = meta.forceRosters || meta.rosters;
      if (!base) {
        report.error(`Season ${n} is the first season and needs a rosters block.`);
        continue;
      }
      if (base.premium.length === 0 && base.second.length === 0) {
        report.notice(
          `Season ${n} has no players yet. Add ids to the rosters block in ` +
          `data/seasons/season-${String(n).padStart(2,"0")}/season.js.`
        );
      }
      rosters = { premium: base.premium.slice(), second: base.second.slice() };
      for (const id of meta.join || []) {
        if (!rosters.second.includes(id) && !rosters.premium.includes(id)) {
          rosters.second.push(id);
        }
      }
      rosters.second = rosters.second.filter(id => !(meta.leave || []).includes(id));
      rosters.premium = rosters.premium.filter(id => !(meta.leave || []).includes(id));
    } else {
      const r = inheritRosters(prevOutcome, meta, CONFIG);
      rosters = { premium: r.premium, second: r.second };
      notices = r.notices;
    }

    notices.forEach(m => report.notice(m));
    V.validateRoster(n, "Premium Tier", rosters.premium, byId, report);
    V.validateRoster(n, "Second Tier", rosters.second, byId, report);
    V.validateNoOverlap(n, rosters.premium, rosters.second, report);

    if (rosters.premium.length !== CONFIG.premiumSize) {
      report.notice(
        `Season ${n}: Premium Tier holds ${rosters.premium.length} players, ` +
        `but premiumSize in config.js is ${CONFIG.premiumSize}.`
      );
    }

    /* ---- Fixtures ---------------------------------------------------- */
    const fx = {
      premium: (src.premium || []).slice(),
      second: (src.second || []).slice()
    };
    V.validateFixtures(n, "Premium Tier", rosters.premium, fx.premium, report);
    V.validateFixtures(n, "Second Tier", rosters.second, fx.second, report);
    V.checkReadyToClose(n, [...fx.premium, ...fx.second], meta.status, report);

    /* ---- Tables ------------------------------------------------------ */
    const ctx = {
      registryOrder: order,
      manualOrder: meta.tiebreakOrder || {},
      onNotice: m => report.notice(`Season ${n}: ${m}`)
    };

    const tables = {
      premium: computeTable(rosters.premium, fx.premium, ctx),
      second: computeTable(rosters.second, fx.second, ctx)
    };

    /* ---- Outcome ----------------------------------------------------- */
    const plan = movementPlan(
      rosters.premium.length,
      rosters.second.length,
      CONFIG.premiumSize,
      CONFIG.promotionCount
    );

    const completed = meta.status === STATUS.COMPLETED;
    const outcome = completed
      ? closeSeason(n, tables, CONFIG.promotionCount, plan)
      : null;

    seasons.push({
      number: n,
      status: meta.status,
      completed,
      rosters,
      fixtures: fx,
      tables,
      plan,
      outcome,
      split: {
        premium: splitFixtures(fx.premium),
        second: splitFixtures(fx.second)
      }
    });

    if (completed) prevOutcome = outcome;
  }

  const current = seasons.length ? seasons[seasons.length - 1] : null;
  const history = seasons.filter(s => s.completed).map(s => s.outcome);

  /* Nothing registered yet is a valid state, not an error. The pages show
     a setup panel instead of empty tables. */
  const started = seasons.length > 0 &&
    (current.rosters.premium.length > 0 || current.rosters.second.length > 0);

  const model = {
    config: CONFIG,
    players: PLAYERS,
    playerById: byId,
    news: NEWS.slice().sort(newsSort),
    seasons,
    current,
    started,
    history,
    records: buildRecords(seasons, byId, CONFIG),
    report
  };

  return deepFreeze(model);
}

function newsSort(a, b) {
  if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
  return new Date(b.date) - new Date(a.date);
}

function deepFreeze(obj, seen = new WeakSet()) {
  if (obj === null || typeof obj !== "object" || seen.has(obj)) return obj;
  if (obj instanceof Map || obj instanceof Set || obj instanceof Date) return obj;
  seen.add(obj);
  for (const v of Object.values(obj)) deepFreeze(v, seen);
  return Object.freeze(obj);
}

export { isPlayed, chronological, TIER };
