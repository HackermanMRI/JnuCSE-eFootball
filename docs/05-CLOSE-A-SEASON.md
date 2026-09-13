# Closing a season

Closing a season is what triggers promotion, relegation, the champion record and the Tier History entry. It is a single word change, and it is deliberately manual so it can never fire by accident.

## When you can close

Once every match in **both** tiers has a result, the site shows a notice:

> Season 1: every match has a result. Set status to "completed" in the season file to promote and relegate.

That is your signal. Until you act on it, nothing moves.

## How to close

Open that season's `season.js` and change one word:

```js
status: "ongoing",
```

to

```js
status: "completed",
```

Save and refresh.

## What happens immediately

| | |
|---|---|
| Champion | the Premium Tier player ranked 1 |
| Relegated | the bottom two of Premium Tier |
| Promoted | the top two of Second Tier |
| Tier History | a new entry appears for this season |
| Hall of Fame | this season's figures enter the all-time records |

Second Tier has no champion, by design. Its top two celebrate promotion.

## Before you close, check

- No red banner anywhere on the site.
- No outstanding tie notice. If two players are level on points, goal difference, wins, draws, goals scored **and** head-to-head, the site asks you to decide. On a relegation or promotion place this matters. Fix it with `tiebreakOrder` in `season.js`:

```js
tiebreakOrder: { hasan: 1, imran: 2 }
```

Lower number ranks higher. This only ever applies to players the engine genuinely cannot separate.

## Reopening a season

Change `"completed"` back to `"ongoing"`. Promotion, relegation and the history entry all disappear until you close it again. Nothing is destroyed — every figure is recalculated from the match results each time the page loads.

## Next

Go to `04-START-A-NEW-SEASON.md`.
