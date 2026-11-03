/* =========================================================================
   STATS  —  DO NOT EDIT
   =========================================================================
   Hall of Fame records. Per-player career figures live in careers.js.
   Records count COMPLETED seasons only, so a season in progress never
   appears in the all-time lists.
   ========================================================================= */

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
