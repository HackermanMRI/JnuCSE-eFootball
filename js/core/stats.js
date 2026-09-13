/* =========================================================================
   STATS  —  DO NOT EDIT
   =========================================================================
   Hall of Fame records and per-player career figures.
   Records count COMPLETED seasons only, so a season in progress never
   appears in the all-time lists.
   ========================================================================= */

import { isPlayed, chronological } from "./standings.js";

function best(entries, pick, direction = "max") {
  if (!entries.length) return [];
  const values = entries.map(pick);
  const target = direction === "max" ? Math.max(...values) : Math.min(...values);
  return entries.filter((e, i) => values[i] === target);
}

export function buildRecords(seasons, byId, config) {
  const done = seasons.filter(s => s.completed);

  /* Every Premium Tier row from every completed season. */
  const premiumRuns = [];
  for (const s of done) {
    for (const row of s.tables.premium) {
      premiumRuns.push({ ...row, season: s.number });
    }
  }

  /* Titles per player. */
  const titles = new Map();
  for (const s of done) {
    const c = s.outcome?.champion;
    if (c) titles.set(c, (titles.get(c) || 0) + 1);
  }

  const titleList = [...titles.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);

  return {
    seasonsCompleted: done.length,
    champions: done.map(s => ({ season: s.number, id: s.outcome.champion })),
    mostTitles: titleList.length
      ? titleList.filter(t => t.count === titleList[0].count)
      : [],
    titleList,
    mostPointsInSeason: best(premiumRuns, r => r.pts, "max"),
    mostGoalsInSeason: best(premiumRuns, r => r.gf, "max"),
    fewestConcededInSeason: best(premiumRuns, r => r.ga, "min"),
    bestGDInSeason: best(premiumRuns, r => r.gd, "max"),
    mostWinsInSeason: best(premiumRuns, r => r.w, "max")
  };
}

/**
 * Everything a player card needs, for one season.
 * Returns null when the player is not in that season.
 */
export function playerSeasonProfile(model, seasonNumber, playerId) {
  const season = model.seasons.find(s => s.number === seasonNumber);
  if (!season) return null;

  const tier = season.rosters.premium.includes(playerId) ? "premium"
             : season.rosters.second.includes(playerId) ? "second"
             : null;
  if (!tier) return null;

  const row = season.tables[tier].find(r => r.id === playerId);
  const mine = chronological(season.fixtures[tier])
    .filter(fx => fx.a === playerId || fx.b === playerId);

  const played = mine.filter(isPlayed);
  const upcoming = mine.filter(fx => !isPlayed(fx));

  return {
    tier,
    row,
    form: row.form.slice(-model.config.formLength),
    lastMatch: played.length ? played[played.length - 1] : null,
    nextMatch: upcoming.length ? upcoming[0] : null,
    totalMatches: mine.length
  };
}

/** Titles, promotions and relegations across a player's whole career. */
export function playerHistory(model, playerId) {
  const out = { titles: [], promotions: [], relegations: [], seasons: [] };

  for (const s of model.seasons) {
    const tier = s.rosters.premium.includes(playerId) ? "premium"
               : s.rosters.second.includes(playerId) ? "second"
               : null;
    if (!tier) continue;

    const row = s.tables[tier].find(r => r.id === playerId);
    out.seasons.push({ season: s.number, tier, rank: row?.rank, row });

    if (!s.outcome) continue;
    if (s.outcome.champion === playerId) out.titles.push(s.number);
    if (s.outcome.promoted.includes(playerId)) out.promotions.push(s.number);
    if (s.outcome.relegated.includes(playerId)) out.relegations.push(s.number);
  }
  return out;
}
