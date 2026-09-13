# Rules reference

What the system does, and exactly where each rule lives in the code.

## Tiers

- **Premium Tier** holds `premiumSize` players. Default 8, set in `data/config.js`.
- **Second Tier** holds everyone else. No upper limit.
- Players only ever face others in their own tier.

## Matches

Every player meets every other player in their tier twice: leg 1 and leg 2. There is no home or away — the legs are just the first and second meeting.

`n` players produce `n × (n−1)` matches across `2 × (n−1)` rounds. With an odd number of players, one player rests each round.

| Players | Matches | Rounds |
|---|---|---|
| 6 | 30 | 10 |
| 7 | 42 | 14 |
| 8 | 56 | 14 |
| 9 | 72 | 18 |
| 10 | 90 | 18 |

## Points

Win 3, draw 1, loss 0. Goal difference is goals scored minus goals conceded.

Set in `js/core/rules.js`. These are fixed laws, not settings.

## Ranking

Applied in strict order. The first difference decides.

1. Points
2. Goal difference
3. Wins
4. Draws
5. Goals scored
6. Head-to-head between the tied players only
7. Manual order (`tiebreakOrder` in the season file)
8. Registry order, so a table always renders

Steps 1–5 are your ranking system. Steps 6–8 are the approved fallback so the table can never be left undecided.

**Note on step 4:** points are always `3 × wins + draws`, so two players level on points and wins must also be level on draws. The draws step can never actually separate anyone. It is harmless and stays in the chain as written, but it never fires.

Steps 7 and 8 raise a notice on the site so you know a manual decision is outstanding. That notice is suppressed for players who have not played yet, since everyone is level at the start of a season.

## Champion

Premium Tier rank 1 wins the league. Second Tier has no champion.

## Promotion and relegation

Applied when a season is marked `"completed"`, and only then.

- Bottom `promotionCount` of Premium Tier go down. Default 2.
- Top `promotionCount` of Second Tier go up.
- If Second Tier has `promotionCount` players or fewer, all of them go up and no fixtures are required.

**If you change `premiumSize`,** the next season rebalances in one go:

| Change | Effect that season |
|---|---|
| unchanged | 2 up, 2 down |
| grows by g | g promoted, nobody relegated |
| shrinks by g | g relegated, nobody promoted |

## Roster inheritance

Season 1 is the only season where you type both tier lists by hand. Every season after builds itself:

1. Start from last season's final tables.
2. Apply promotion, relegation and any resizing.
3. Remove anyone in `leave`.
4. Add anyone in `join` to Second Tier.
5. If departures left Premium short, move the next best Second Tier player up.

`forceRosters` skips steps 1–2 and uses exactly what you type. A notice shows on the site while it is active.

## Seasons

A season is `"ongoing"` until you set it to `"completed"`. The season number is whatever you write in `season.js`. There is no limit and no structural change between seasons.

## Where things live

| Rule | File |
|---|---|
| Points values, tier names | `js/core/rules.js` |
| Ranking and tiebreaks | `js/core/tiebreak.js` |
| Table calculation | `js/core/standings.js` |
| Fixture generation | `js/core/fixtures.js` |
| Promotion, relegation, inheritance | `js/core/season.js` |
| Hall of Fame records | `js/core/stats.js` |
| Data checking | `js/core/validate.js` |
| Tier sizes, display counts | `data/config.js` |

Everything under `js/core/` is engine. You should never need to edit it. Everything under `data/` is yours.
