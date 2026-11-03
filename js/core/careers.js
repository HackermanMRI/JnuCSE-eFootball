/* =========================================================================
   CAREERS  —  DO NOT EDIT
   =========================================================================
   One career record per player who has ever been on a roster, built from
   every season's played matches. A season still in progress counts: its
   played matches are real. Trophies are the exception and only come from
   completed seasons.

   Definitions (also written out in docs/08-PLAYERS-PAGE.md):
     winPct           won / played * 100, or null before the first match
     biggest win      largest goal margin; ties go to the most goals scored,
                      then to the earlier match
     biggest loss     largest goal margin; ties go to the most goals
                      conceded, then to the earlier match
     most goals       goals scored in one season, summed over its matches
     best win streak  longest run of consecutive wins inside ONE season,
                      in match order. A draw or a loss ends the run, and a
                      run never carries into the next season
     trophies         Premium champion and Second Tier winner of a
                      completed season
   Where records tie, every tied season is listed.
   ========================================================================= */

import { isPlayed, chronological } from "./standings.js";

const TIERS = ["premium", "second"];

const blank = id => ({
  id,
  played: 0, won: 0, drawn: 0, lost: 0,
  goalsFor: 0, goalsAgainst: 0,
  winPct: null,
  biggestWin: null,
  biggestLoss: null,
  mostGoalsInSeason: null,
  bestWinStreak: null,
  trophies: [],
  seasons: []
});

/* Does candidate `c` beat the current record `r`? Equal never replaces, so
   the earlier match is kept. */
function beats(c, r, key) {
  if (!r) return true;
  if (c.margin !== r.margin) return c.margin > r.margin;
  return c[key] > r[key];
}

export function buildCareers(seasons, byId = new Map()) {
  const map = new Map();
  const get = id => {
    if (!map.has(id)) map.set(id, blank(id));
    return map.get(id);
  };

  for (const s of seasons) {
    const live = !s.completed;
    const goals = new Map();      // id -> goals scored this season
    const streak = new Map();     // id -> { run, max }

    for (const tier of TIERS) {
      for (const id of s.rosters[tier]) {
        const c = get(id);
        if (!c.seasons.some(x => x.season === s.number)) {
          c.seasons.push({ season: s.number, tier });
        }
      }

      for (const fx of chronological(s.fixtures[tier]).filter(isPlayed)) {
        const sides = [
          { id: fx.a, own: fx.ag, opp: fx.bg, other: fx.b },
          { id: fx.b, own: fx.bg, opp: fx.ag, other: fx.a }
        ];
        for (const side of sides) {
          const c = get(side.id);
          const st = streak.get(side.id) || { run: 0, max: 0 };
          streak.set(side.id, st);

          c.played++;
          c.goalsFor += side.own;
          c.goalsAgainst += side.opp;
          goals.set(side.id, (goals.get(side.id) || 0) + side.own);

          const where = { opponent: side.other, season: s.number, tier,
                          round: fx.r, leg: fx.leg, live };

          if (side.own > side.opp) {
            c.won++;
            st.run++;
            st.max = Math.max(st.max, st.run);
            const cand = { margin: side.own - side.opp, for: side.own, against: side.opp, ...where };
            if (beats(cand, c.biggestWin, "for")) c.biggestWin = cand;
          } else if (side.own < side.opp) {
            c.lost++;
            st.run = 0;
            const cand = { margin: side.opp - side.own, for: side.own, against: side.opp, ...where };
            if (beats(cand, c.biggestLoss, "against")) c.biggestLoss = cand;
          } else {
            c.drawn++;
            st.run = 0;
          }
        }
      }
    }

    /* Fold this season's goals and streak into each career. */
    for (const [id, total] of goals) {
      const c = get(id);
      const entry = { season: s.number, live };
      const r = c.mostGoalsInSeason;
      if (!r || total > r.goals) c.mostGoalsInSeason = { goals: total, seasons: [entry] };
      else if (total === r.goals) r.seasons.push(entry);
    }
    for (const [id, st] of streak) {
      if (st.max === 0) continue;
      const c = get(id);
      const entry = { season: s.number, live };
      const r = c.bestWinStreak;
      if (!r || st.max > r.length) c.bestWinStreak = { length: st.max, seasons: [entry] };
      else if (st.max === r.length) r.seasons.push(entry);
    }

    /* Trophies: completed seasons only. */
    if (s.completed && s.outcome) {
      const premium = s.outcome.champion;
      const second = s.outcome.secondTable?.[0]?.id;
      if (premium) get(premium).trophies.push({ season: s.number, tier: "premium" });
      if (second)  get(second).trophies.push({ season: s.number, tier: "second" });
    }
  }

  for (const c of map.values()) {
    c.winPct = c.played ? (c.won / c.played) * 100 : null;
  }

  const nameOf = id => (byId.get(id)?.name || id).trim();
  return [...map.values()].sort((a, b) =>
    nameOf(a.id).localeCompare(nameOf(b.id), "en", { sensitivity: "base" }));
}
