/* =========================================================================
   VALIDATE  —  DO NOT EDIT
   =========================================================================
   Checks the data files on load and reports problems as a banner on the
   site, so a typo can never quietly change a table.

   ERROR   the data is wrong and results may be misleading
   NOTICE  the data is usable but needs the manager's attention
   ========================================================================= */

import { expectedMatchCount, pairKey } from "./fixtures.js";
import { isPlayed } from "./standings.js";

export function createReport() {
  return {
    errors: [],
    notices: [],
    error(msg) { this.errors.push(msg); },
    notice(msg) { this.notices.push(msg); },
    get ok() { return this.errors.length === 0; }
  };
}

export function validatePlayers(players, report) {
  const seen = new Set();
  for (const p of players) {
    if (!p.id) { report.error("A player in players.js has no id."); continue; }
    if (!/^[a-z0-9_-]+$/.test(p.id)) {
      report.error(`Player id "${p.id}" must be lowercase letters, numbers, - or _ only.`);
    }
    if (seen.has(p.id)) report.error(`Player id "${p.id}" appears twice in players.js.`);
    seen.add(p.id);
    if (!p.name) report.error(`Player "${p.id}" has no name.`);
  }
}

export function validateRoster(seasonNo, tier, ids, known, report) {
  const seen = new Set();
  for (const id of ids) {
    if (!known.has(id)) {
      report.error(`Season ${seasonNo} ${tier}: "${id}" is not in players.js.`);
    }
    if (seen.has(id)) {
      report.error(`Season ${seasonNo} ${tier}: "${id}" is listed twice.`);
    }
    seen.add(id);
  }
}

export function validateNoOverlap(seasonNo, premium, second, report) {
  const inBoth = premium.filter(id => second.includes(id));
  for (const id of inBoth) {
    report.error(`Season ${seasonNo}: "${id}" is in both tiers at once.`);
  }
}

export function validateFixtures(seasonNo, tier, roster, fixtures, report) {
  const set = new Set(roster);

  /* Small tiers are allowed to have no fixtures at all. */
  if (roster.length <= 2 && fixtures.length === 0) return;

  const pairs = new Map();

  for (const fx of fixtures) {
    const where = `Season ${seasonNo} ${tier} round ${fx.r} leg ${fx.leg}`;

    if (!set.has(fx.a)) report.error(`${where}: "${fx.a}" is not in this tier.`);
    if (!set.has(fx.b)) report.error(`${where}: "${fx.b}" is not in this tier.`);
    if (fx.a === fx.b) report.error(`${where}: a player cannot face themselves.`);
    if (fx.leg !== 1 && fx.leg !== 2) report.error(`${where}: leg must be 1 or 2.`);

    const half = (fx.ag === null) !== (fx.bg === null);
    if (half) report.error(`${where}: only one score was entered. Enter both or neither.`);

    for (const [side, g] of [["ag", fx.ag], ["bg", fx.bg]]) {
      if (g === null) continue;
      if (!Number.isInteger(g) || g < 0) {
        report.error(`${where}: ${side} must be a whole number of 0 or more.`);
      }
    }

    const key = `${pairKey(fx.a, fx.b)}#${fx.leg}`;
    pairs.set(key, (pairs.get(key) || 0) + 1);
  }

  for (const [key, count] of pairs) {
    if (count > 1) {
      const [pair, leg] = key.split("#");
      report.error(
        `Season ${seasonNo} ${tier}: ${pair.replace("|", " v ")} leg ${leg} ` +
        `is listed ${count} times.`
      );
    }
  }

  const expected = expectedMatchCount(roster.length);
  if (fixtures.length !== expected) {
    report.error(
      `Season ${seasonNo} ${tier}: ${roster.length} players need ${expected} matches, ` +
      `but ${fixtures.length} are listed.`
    );
  }
}

/** Tells the manager a season is fully played and ready to be closed. */
export function checkReadyToClose(seasonNo, allFixtures, status, report) {
  if (status === "completed") return;
  const unplayed = allFixtures.filter(fx => !isPlayed(fx)).length;
  if (allFixtures.length > 0 && unplayed === 0) {
    report.notice(
      `Season ${seasonNo}: every match has a result. ` +
      `Set status to "completed" in the season file to promote and relegate.`
    );
  }
}
