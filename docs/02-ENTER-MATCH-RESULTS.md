# Entering match results

This is the thing you will do most often. It takes about ten seconds per match.

## Where to go

| Tier | File |
|---|---|
| Premium Tier | `data/seasons/season-01/premium.js` |
| Second Tier | `data/seasons/season-01/second-tier.js` |

Replace `season-01` with whichever season is running.

## What to change

Find the match. Every unplayed match looks like this:

```js
{ r:  3, leg: 1, a: "mrinmoy",  b: "nayem",    ag: null, bg: null },
```

`ag` is how many goals **a** scored. `bg` is how many goals **b** scored.

Mrinmoy beat Nayem 2–1, so:

```js
{ r:  3, leg: 1, a: "mrinmoy",  b: "nayem",    ag: 2, bg: 1 },
```

Save the file, refresh the site. The table, goal difference, form, rankings, recent matches and upcoming matches all update by themselves. There is nothing else to change anywhere.

## Rules for entering

- **Enter both numbers or neither.** A match with only one score filled in is reported as an error on the site and is not counted.
- **0–0 is a real result.** Write `ag: 0, bg: 0`. It counts as a played match and gives both players a point. Leaving `null` means the match has not happened yet.
- **Do not change `r`, `leg`, `a` or `b`.** Those define the fixture. Only the two score numbers are yours to edit.
- **Do not delete a line** to skip a match. Leave it as `null` and it simply stays in Upcoming.

## Correcting a mistake

Just change the numbers and save. The engine recalculates everything from scratch on every load, so there is nothing stale to clean up.

## When a player quits mid-season

Enter their remaining matches as `0–1` losses, as agreed. Their played matches stay exactly as they are, the opponent takes the three points, and the quitter drifts to the bottom of the table and is relegated normally.

## Order of matches

The site sorts matches by leg, then round, then the order they appear in the file. Round numbers are already correct in the generated files, so you do not need to think about this.

## If something looks wrong

A red banner at the top of the site lists every problem found in the data. It names the season, tier, round and leg. Common causes:

| Banner says | Cause |
|---|---|
| only one score was entered | you filled `ag` but left `bg` as `null` |
| is not in this tier | a player id was mistyped |
| must be a whole number of 0 or more | a decimal, a negative, or a number in quotes |
| need N matches, but M are listed | a fixture line was deleted or duplicated |
