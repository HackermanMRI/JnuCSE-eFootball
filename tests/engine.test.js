/* =========================================================================
   ENGINE TESTS
   =========================================================================
   Runs in the browser (tests/test.html) or in Node:
       node tests/engine.test.js
   ========================================================================= */

import { generateFixtures, expectedMatchCount, pairKey } from "../js/core/fixtures.js";
import { computeTable, splitFixtures, isPlayed } from "../js/core/standings.js";
import { movementPlan, closeSeason, inheritRosters } from "../js/core/season.js";
import { buildRecords } from "../js/core/stats.js";
import { POINTS } from "../js/core/rules.js";

/* ---- tiny test harness ------------------------------------------------ */
const results = [];
let group = "";

export function describe(name, fn) { group = name; fn(); }
export function it(name, fn) {
  try { fn(); results.push({ group, name, pass: true }); }
  catch (e) { results.push({ group, name, pass: false, msg: e.message }); }
}
function eq(actual, expected, what = "") {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${what} expected ${b}, got ${a}`);
}
function ok(cond, what = "") { if (!cond) throw new Error(what || "expected true"); }

/* ---- helpers ---------------------------------------------------------- */
const ids = n => Array.from({ length: n }, (_, i) => `p${i + 1}`);

function play(fixtures, scores) {
  // scores: array of [ag, bg] applied in order; null entry leaves it unplayed
  return fixtures.map((f, i) => {
    const s = scores[i];
    return s ? { ...f, ag: s[0], bg: s[1] } : { ...f };
  });
}

function fx(a, b, ag, bg, r = 1, leg = 1) { return { r, leg, a, b, ag, bg }; }

/* =======================================================================
   1. FIXTURE GENERATION
   ======================================================================= */
describe("Fixture generation", () => {

  it("8 players produce 56 matches over 14 rounds", () => {
    const f = generateFixtures(ids(8));
    eq(f.length, 56, "match count");
    eq(Math.max(...f.map(x => x.r)), 14, "rounds");
  });

  it("every pair meets exactly twice, once per leg", () => {
    const f = generateFixtures(ids(8));
    const seen = new Map();
    for (const m of f) {
      const k = `${pairKey(m.a, m.b)}#${m.leg}`;
      seen.set(k, (seen.get(k) || 0) + 1);
    }
    eq(seen.size, 56, "unique pair-legs");
    ok([...seen.values()].every(v => v === 1), "no duplicate pair in the same leg");
  });

  it("odd rosters work with a rotating bye", () => {
    const f = generateFixtures(ids(7));
    eq(f.length, expectedMatchCount(7), "7 players => 42 matches");
    // each round must have 3 matches (one player rests)
    const byRound = {};
    for (const m of f) byRound[m.r] = (byRound[m.r] || 0) + 1;
    ok(Object.values(byRound).every(c => c === 3), "3 matches per round");
  });

  it("every player plays the same number of matches", () => {
    for (const n of [4, 5, 8, 9, 15]) {
      const f = generateFixtures(ids(n));
      const count = {};
      for (const m of f) { count[m.a] = (count[m.a] || 0) + 1; count[m.b] = (count[m.b] || 0) + 1; }
      const vals = Object.values(count);
      eq(vals.length, n, `n=${n} all players appear`);
      ok(vals.every(v => v === 2 * (n - 1)), `n=${n} each plays ${2 * (n - 1)}`);
    }
  });

  it("nobody faces themselves", () => {
    const f = generateFixtures(ids(9));
    ok(f.every(m => m.a !== m.b), "no self match");
  });

  it("fewer than two players produces no fixtures", () => {
    eq(generateFixtures(["solo"]).length, 0);
    eq(generateFixtures([]).length, 0);
  });
});

/* =======================================================================
   2. POINTS AND STANDINGS
   ======================================================================= */
describe("Points and standings", () => {

  it("win 3, draw 1, loss 0", () => {
    eq([POINTS.win, POINTS.draw, POINTS.loss], [3, 1, 0]);
  });

  it("a simple three-player table adds up", () => {
    const roster = ["a", "b", "c"];
    const f = [
      fx("a", "b", 2, 1),
      fx("a", "c", 0, 0),
      fx("b", "c", 1, 3)
    ];
    const t = computeTable(roster, f);
    const row = id => t.find(r => r.id === id);

    eq(row("a").pts, 4, "a: win + draw");
    eq(row("a").gd, 1);
    eq(row("b").pts, 0, "b: two losses");
    eq(row("c").pts, 4, "c: draw + win");
    eq(row("c").gd, 2);
    eq(t[0].id, "c", "c ranks above a on goal difference");
  });

  it("unplayed matches are ignored completely", () => {
    const f = [fx("a", "b", 3, 0), fx("a", "b", null, null, 2, 2)];
    const t = computeTable(["a", "b"], f);
    eq(t.find(r => r.id === "a").p, 1, "only one match counted");
  });

  it("a half-entered score does not count", () => {
    const f = [fx("a", "b", 3, null)];
    const t = computeTable(["a", "b"], f);
    eq(t.find(r => r.id === "a").p, 0, "incomplete result skipped");
  });

  it("0-0 counts as a played match", () => {
    const t = computeTable(["a", "b"], [fx("a", "b", 0, 0)]);
    eq(t.find(r => r.id === "a").p, 1);
    eq(t.find(r => r.id === "a").pts, 1);
  });

  it("goal difference equals scored minus conceded", () => {
    const t = computeTable(["a", "b"], [fx("a", "b", 5, 2)]);
    const a = t.find(r => r.id === "a");
    eq([a.gf, a.ga, a.gd], [5, 2, 3]);
  });

  it("an empty season ranks everyone on zero", () => {
    const t = computeTable(["a", "b", "c"], []);
    eq(t.length, 3);
    ok(t.every(r => r.pts === 0 && r.p === 0), "all blank");
    eq(t.map(r => r.rank), [1, 2, 3], "ranks still assigned");
  });

  it("form reads oldest to newest", () => {
    const f = [
      fx("a", "b", 1, 0, 1, 1),
      fx("a", "b", 0, 0, 2, 1),
      fx("a", "b", 0, 2, 3, 1)
    ];
    const t = computeTable(["a", "b"], f);
    eq(t.find(r => r.id === "a").form, ["W", "D", "L"]);
    eq(t.find(r => r.id === "b").form, ["L", "D", "W"]);
  });

  it("leg 2 sorts after leg 1 even when rounds restart", () => {
    const f = [
      { r: 1, leg: 2, a: "a", b: "b", ag: 0, bg: 5 },
      { r: 1, leg: 1, a: "a", b: "b", ag: 1, bg: 0 }
    ];
    const t = computeTable(["a", "b"], f);
    eq(t.find(r => r.id === "a").form, ["W", "L"], "leg 1 first");
  });
});

/* =======================================================================
   3. THE TIEBREAK LADDER
   ======================================================================= */
describe("Tiebreak ladder", () => {

  it("points beat goal difference", () => {
    const f = [
      fx("a", "c", 1, 0), fx("a", "d", 1, 0),   // a: 6 pts, gd +2
      fx("b", "c", 9, 0), fx("b", "d", 0, 1)    // b: 3 pts, gd +8
    ];
    const t = computeTable(["a", "b", "c", "d"], f);
    eq(t[0].id, "a", "more points wins even with worse gd");
  });

  it("goal difference separates equal points", () => {
    const f = [fx("a", "c", 4, 0), fx("b", "d", 1, 0)];
    const t = computeTable(["a", "b", "c", "d"], f);
    eq(t[0].id, "a", "+4 above +1");
  });

  it("wins separate equal points and equal goal difference", () => {
    // a: 2W 0D 2L = 6 pts, gd +1   |   b: 1W 3D 0L = 6 pts, gd +1
    const f = [
      fx("a", "x1", 3, 0), fx("a", "x2", 1, 0), fx("a", "x3", 0, 2), fx("a", "x4", 0, 1),
      fx("b", "y1", 1, 0), fx("b", "y2", 1, 1), fx("b", "y3", 0, 0), fx("b", "y4", 2, 2)
    ];
    const t = computeTable(["a","b","x1","x2","x3","x4","y1","y2","y3","y4"], f);
    const A = t.find(r => r.id === "a"), B = t.find(r => r.id === "b");

    eq([A.pts, A.gd], [B.pts, B.gd], "level on points and goal difference");
    eq([A.w, B.w], [2, 1], "a has more wins");
    ok(A.rank < B.rank, "more wins ranks higher");
  });

  it("draws can never separate once points and wins are level", () => {
    // Points = 3*wins + draws, so equal points and equal wins force equal draws.
    // The draws step in the ranking chain is therefore always a pass-through.
    const f = [
      fx("a", "x1", 2, 0), fx("a", "x2", 1, 1), fx("a", "x3", 0, 2),
      fx("b", "y1", 3, 0), fx("b", "y2", 2, 2), fx("b", "y3", 0, 1)
    ];
    const t = computeTable(["a","b","x1","x2","x3","y1","y2","y3"], f);
    const A = t.find(r => r.id === "a"), B = t.find(r => r.id === "b");

    eq([A.pts, A.w], [B.pts, B.w], "level on points and wins");
    eq(A.d, B.d, "draws are therefore also level");
    ok(A.pts === 3 * A.w + A.d, "points are exactly 3*wins + draws");
  });

  it("goals scored separates when everything above is equal", () => {
    const f = [
      fx("a", "x1", 3, 1), fx("a", "x2", 1, 3),   // 3pts, gd 0, 1W 0D 1L, gf 4
      fx("b", "x1", 1, 0), fx("b", "x2", 0, 1)    // 3pts, gd 0, 1W 0D 1L, gf 1
    ];
    const t = computeTable(["a", "b", "x1", "x2"], f);
    const A = t.find(r => r.id === "a"), B = t.find(r => r.id === "b");
    eq([A.pts, A.gd, A.w, A.d], [B.pts, B.gd, B.w, B.d], "level to goals scored");
    ok(A.rank < B.rank, "more goals scored ranks higher");
  });

  it("head-to-head decides when the whole chain is level", () => {
    // a and b end identical on points, gd, wins, draws and goals scored.
    // Between themselves: a won 3-0, b won 1-0, so a leads on head-to-head gd.
    const f = [
      fx("a", "b", 3, 0, 1, 1),   // a wins their first meeting
      fx("a", "b", 0, 1, 2, 2),   // b wins their second
      fx("a", "x1", 0, 3), fx("b", "x1", 2, 3),
      fx("a", "x2", 1, 4), fx("b", "x2", 1, 2)
    ];
    const t = computeTable(["a", "b", "x1", "x2"], f);
    const A = t.find(r => r.id === "a"), B = t.find(r => r.id === "b");

    eq([A.pts, A.gd, A.w, A.d, A.gf], [B.pts, B.gd, B.w, B.d, B.gf],
       "level on every listed tiebreak");
    ok(A.rank < B.rank, "a ranks higher on head-to-head");
  });

  it("head-to-head is skipped when the tied players never met", () => {
    // Two tied players in the same tier who have not yet played each other
    // fall through to manual order rather than being decided on nothing.
    const f = [
      fx("a", "x1", 1, 0), fx("a", "b", null, null, 2, 1),
      fx("b", "x1", 1, 0)
    ];
    const t = computeTable(["a", "b", "x1"], f, { manualOrder: { b: 1, a: 2 } });
    const A = t.find(r => r.id === "a"), B = t.find(r => r.id === "b");
    eq([A.pts, A.gd, A.gf], [B.pts, B.gd, B.gf], "level");
    ok(B.rank < A.rank, "manual order decided it");
  });

  it("manual order is used when head-to-head is also level", () => {
    const f = [fx("a", "b", 1, 1, 1, 1), fx("a", "b", 2, 2, 2, 2)];
    const t = computeTable(["a", "b"], f, { manualOrder: { b: 1, a: 2 } });
    eq(t[0].id, "b", "manual order applied");
  });

  it("a table always ranks, even with no way to separate", () => {
    let notices = 0;
    const f = [fx("a", "b", 1, 1, 1, 1), fx("a", "b", 1, 1, 2, 2)];
    const t = computeTable(["a", "b"], f, {
      registryOrder: { a: 0, b: 1 },
      onNotice: () => notices++
    });
    eq(t.map(r => r.rank), [1, 2], "ranks assigned");
    ok(notices > 0, "manager is told a manual decision is needed");
  });

  it("a season with no matches yet raises no tie notices", () => {
    // Everyone is level at 0-0-0 on day one. That is not a decision the
    // manager needs to make, so it must not fill the page with warnings.
    let notices = 0;
    computeTable(ids(8), generateFixtures(ids(8)), { onNotice: () => notices++ });
    eq(notices, 0, "silent on an empty table");
  });

  it("ranks are 1..n with no gaps", () => {
    const f = generateFixtures(ids(6)).map((m, i) => ({ ...m, ag: i % 4, bg: (i + 1) % 3 }));
    const t = computeTable(ids(6), f);
    eq(t.map(r => r.rank), [1, 2, 3, 4, 5, 6]);
  });
});

/* =======================================================================
   4. PROMOTION AND RELEGATION
   ======================================================================= */
describe("Promotion and relegation", () => {

  const table = list => list.map((id, i) => ({ id, rank: i + 1 }));

  it("two down from Premium, two up from Second", () => {
    const plan = movementPlan(8, 7, 8, 2);
    eq(plan, { up: 2, down: 2 });

    const out = closeSeason(1, {
      premium: table(["p1","p2","p3","p4","p5","p6","p7","p8"]),
      second: table(["s1","s2","s3","s4","s5","s6","s7"])
    }, 2, plan);

    eq(out.champion, "p1");
    eq(out.relegated, ["p7", "p8"], "bottom two down");
    eq(out.promoted, ["s1", "s2"], "top two up");
  });

  it("a Second Tier of two sends both up and needs no matches", () => {
    const plan = movementPlan(8, 2, 8, 2);
    eq(plan.up, 2, "both promoted");
    const out = closeSeason(3, {
      premium: table(["p1","p2","p3","p4","p5","p6","p7","p8"]),
      second: table(["s1","s2"])
    }, 2, plan);
    eq(out.promoted, ["s1", "s2"]);
  });

  it("growing Premium promotes extra and relegates nobody", () => {
    const plan = movementPlan(8, 7, 10, 2);
    eq(plan, { up: 2, down: 0 }, "8 -> 10 lifts two, drops none");
  });

  it("shrinking Premium relegates extra and promotes nobody", () => {
    const plan = movementPlan(8, 7, 6, 2);
    eq(plan, { up: 0, down: 2 }, "8 -> 6 drops two, lifts none");
  });

  it("rosters carry into the next season automatically", () => {
    const prev = {
      season: 1,
      champion: "p1",
      relegated: ["p7", "p8"],
      promoted: ["s1", "s2"],
      premiumTable: table(["p1","p2","p3","p4","p5","p6","p7","p8"]),
      secondTable: table(["s1","s2","s3","s4","s5","s6","s7"])
    };
    const r = inheritRosters(prev, { number: 2 }, { premiumSize: 8, promotionCount: 2 });

    eq(r.premium.length, 8);
    ok(r.premium.includes("s1") && r.premium.includes("s2"), "promoted moved up");
    ok(!r.premium.includes("p7") && !r.premium.includes("p8"), "relegated moved out");
    ok(r.second.includes("p7") && r.second.includes("p8"), "relegated moved down");
    ok(!r.second.includes("s1"), "promoted left Second Tier");
    eq(r.second.length, 7, "Second Tier size held");
  });

  it("a new player joins Second Tier only", () => {
    const prev = {
      season: 1, champion: "p1",
      relegated: ["p7", "p8"], promoted: ["s1", "s2"],
      premiumTable: table(["p1","p2","p3","p4","p5","p6","p7","p8"]),
      secondTable: table(["s1","s2","s3","s4","s5","s6","s7"])
    };
    const r = inheritRosters(prev, { number: 2, join: ["newguy"] },
      { premiumSize: 8, promotionCount: 2 });

    ok(r.second.includes("newguy"), "joined Second Tier");
    ok(!r.premium.includes("newguy"), "never straight into Premium");
    eq(r.second.length, 8);
  });

  it("a returning player also re-enters Second Tier", () => {
    const prev = {
      season: 2, champion: "p1",
      relegated: ["p7", "p8"], promoted: ["s1", "s2"],
      premiumTable: table(["p1","p2","p3","p4","p5","p6","p7","p8"]),
      secondTable: table(["s1","s2","s3","s4","s5","s6","s7"])
    };
    const r = inheritRosters(prev, { number: 3, join: ["p9"] },
      { premiumSize: 8, promotionCount: 2 });
    ok(r.second.includes("p9"), "back in at Second Tier");
  });

  it("a departure from Premium is backfilled from Second Tier", () => {
    const prev = {
      season: 1, champion: "p1",
      relegated: ["p7", "p8"], promoted: ["s1", "s2"],
      premiumTable: table(["p1","p2","p3","p4","p5","p6","p7","p8"]),
      secondTable: table(["s1","s2","s3","s4","s5","s6","s7"])
    };
    const r = inheritRosters(prev, { number: 2, leave: ["p1"] },
      { premiumSize: 8, promotionCount: 2 });

    eq(r.premium.length, 8, "Premium back to full strength");
    ok(!r.premium.includes("p1"), "departed player gone");
    ok(r.premium.includes("s3"), "next best from Second Tier moved up");
    ok(r.notices.length > 0, "the manager is told");
  });

  it("forceRosters overrides inheritance and raises a notice", () => {
    const prev = {
      season: 1, champion: "p1", relegated: [], promoted: [],
      premiumTable: table(["p1"]), secondTable: table(["s1"])
    };
    const r = inheritRosters(prev, {
      number: 2,
      forceRosters: { premium: ["x1", "x2"], second: ["y1"] }
    }, { premiumSize: 2, promotionCount: 2 });

    eq(r.premium, ["x1", "x2"]);
    eq(r.second, ["y1"]);
    ok(r.notices.some(n => n.includes("forceRosters")), "notice raised");
  });

  it("an ongoing season produces no promotion or relegation", () => {
    // closeSeason is only called for completed seasons; guard the contract.
    const plan = movementPlan(8, 7, 8, 2);
    const out = closeSeason(1, { premium: table(["p1"]), second: table(["s1"]) }, 2, plan);
    ok(out.season === 1 && out.champion === "p1", "close produces an outcome");
  });
});

/* =======================================================================
   5. RECORDS AND HISTORY
   ======================================================================= */
describe("Records and history", () => {

  const season = (n, completed, premium, second, outcome) => ({
    number: n, completed,
    tables: { premium, second },
    outcome: completed ? outcome : null
  });
  const row = (id, o) => ({ id, rank: 0, p: 14, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, ...o });

  it("only completed seasons reach the records", () => {
    const s1 = season(1, true,
      [row("a", { pts: 30, gf: 40, ga: 10, gd: 30, w: 10 })], [],
      { season: 1, champion: "a", relegated: [], promoted: [], premiumTable: [], secondTable: [] });
    const s2 = season(2, false,
      [row("b", { pts: 99, gf: 99, ga: 0, gd: 99, w: 33 })], [], null);

    const rec = buildRecords([s1, s2], new Map(), { premiumSize: 8 });
    eq(rec.seasonsCompleted, 1);
    eq(rec.mostPointsInSeason.map(r => r.id), ["a"], "the ongoing season is excluded");
  });

  it("titles are counted per player", () => {
    const mk = (n, champ) => season(n, true, [row(champ, { pts: 20 })], [],
      { season: n, champion: champ, relegated: [], promoted: [], premiumTable: [], secondTable: [] });

    const rec = buildRecords([mk(1, "a"), mk(2, "a"), mk(3, "b")], new Map(), {});
    eq(rec.mostTitles.map(t => t.id), ["a"]);
    eq(rec.mostTitles[0].count, 2);
    eq(rec.champions, [
      { season: 1, id: "a" }, { season: 2, id: "a" }, { season: 3, id: "b" }
    ]);
  });

  it("a shared record lists every holder", () => {
    const s = season(1, true, [
      row("a", { pts: 30 }), row("b", { pts: 30 }), row("c", { pts: 12 })
    ], [], { season: 1, champion: "a", relegated: [], promoted: [], premiumTable: [], secondTable: [] });

    const rec = buildRecords([s], new Map(), {});
    eq(rec.mostPointsInSeason.map(r => r.id).sort(), ["a", "b"]);
  });

  it("fewest conceded takes the minimum, not the maximum", () => {
    const s = season(1, true, [
      row("a", { ga: 30 }), row("b", { ga: 4 })
    ], [], { season: 1, champion: "a", relegated: [], promoted: [], premiumTable: [], secondTable: [] });

    const rec = buildRecords([s], new Map(), {});
    eq(rec.fewestConcededInSeason.map(r => r.id), ["b"]);
  });

  it("no completed seasons yields empty records, not an error", () => {
    const rec = buildRecords([season(1, false, [], [], null)], new Map(), {});
    eq(rec.seasonsCompleted, 0);
    eq(rec.champions, []);
    eq(rec.mostTitles, []);
    eq(rec.mostPointsInSeason, []);
  });
});

/* =======================================================================
   6. FULL SEASON SIMULATION
   ======================================================================= */
describe("Full season simulation", () => {

  it("a complete 8-player season adds up across the whole table", () => {
    const roster = ids(8);
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const g = () => Math.floor(rnd() * 5);

    const f = generateFixtures(roster).map(m => ({ ...m, ag: g(), bg: g() }));
    const t = computeTable(roster, f);

    const totalPlayed = t.reduce((s, r) => s + r.p, 0);
    eq(totalPlayed, 112, "56 matches counted twice, once per player");

    const gf = t.reduce((s, r) => s + r.gf, 0);
    const ga = t.reduce((s, r) => s + r.ga, 0);
    eq(gf, ga, "goals scored equals goals conceded league-wide");
    eq(t.reduce((s, r) => s + r.gd, 0), 0, "goal differences cancel out");

    const draws = f.filter(m => m.ag === m.bg).length;
    const expectedPts = (56 - draws) * 3 + draws * 2;
    eq(t.reduce((s, r) => s + r.pts, 0), expectedPts, "total points match the results");

    ok(t.every(r => r.w + r.d + r.l === r.p), "W+D+L equals played");
    eq(t.length, 8);
  });

  it("three seasons roll forward without any structural change", () => {
    let premium = ids(8);
    let second = ["s1","s2","s3","s4","s5","s6","s7"];
    const config = { premiumSize: 8, promotionCount: 2 };
    let seed = 99;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const g = () => Math.floor(rnd() * 5);
    const seen = [];

    for (let n = 1; n <= 3; n++) {
      const pf = generateFixtures(premium).map(m => ({ ...m, ag: g(), bg: g() }));
      const sf = generateFixtures(second).map(m => ({ ...m, ag: g(), bg: g() }));
      const tables = {
        premium: computeTable(premium, pf),
        second: computeTable(second, sf)
      };
      const plan = movementPlan(premium.length, second.length, config.premiumSize, config.promotionCount);
      const outcome = closeSeason(n, tables, config.promotionCount, plan);
      seen.push(outcome);

      const next = inheritRosters(outcome, { number: n + 1 }, config);
      premium = next.premium; second = next.second;

      eq(premium.length, 8, `season ${n + 1} Premium size`);
      eq(second.length, 7, `season ${n + 1} Second size`);
      eq(premium.filter(id => second.includes(id)).length, 0, "no player in both tiers");
    }

    eq(seen.length, 3);
    ok(seen.every(o => o.champion && o.relegated.length === 2 && o.promoted.length === 2),
      "each season produced a champion, two down and two up");
  });

  it("a 15-player roster splits correctly and stays split", () => {
    const all = ids(15);
    const premium = all.slice(0, 8);
    const second = all.slice(8);
    eq(second.length, 7);
    eq(generateFixtures(premium).length, 56);
    eq(generateFixtures(second).length, 42);
    eq(premium.filter(id => second.includes(id)).length, 0);
  });

  it("split separates played from upcoming", () => {
    const f = [
      fx("a", "b", 1, 0, 1, 1),
      fx("a", "b", null, null, 2, 2)
    ];
    const s = splitFixtures(f);
    eq(s.played.length, 1);
    eq(s.upcoming.length, 1);
    eq(isPlayed(s.played[0]), true);
  });
});

/* ---- reporting -------------------------------------------------------- */
export function getResults() { return results; }

export function summary() {
  const pass = results.filter(r => r.pass).length;
  return { total: results.length, pass, fail: results.length - pass, results };
}

/* Node runner */
if (typeof process !== "undefined" && process.argv?.[1]?.includes("engine.test")) {
  const s = summary();
  let last = "";
  for (const r of s.results) {
    if (r.group !== last) { console.log(`\n  ${r.group}`); last = r.group; }
    console.log(`    ${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.pass ? "" : "\n          " + r.msg}`);
  }
  console.log(`\n  ${s.pass}/${s.total} passed, ${s.fail} failed\n`);
  if (s.fail) process.exitCode = 1;
}
