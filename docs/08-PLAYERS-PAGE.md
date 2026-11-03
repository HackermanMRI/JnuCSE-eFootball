# Players page and search

You never enter anything for this page. It is built from the players you list in
`data/players.js` and the matches you enter each season. Add a player or a result
and the page updates by itself.

## What the Players page shows

One card per player who has ever been on a season roster (in either tier), listed A to Z.
Tap a card to open it. A player who is on a roster but has not played yet is still
listed, with zeros or dashes.

Every opened card has:

| Item | How it is worked out |
|---|---|
| Played, Won, Drawn, Lost | All played matches from Season 1 onward, both tiers |
| Win rate | won ÷ played × 100 (shown as a dash before the first match) |
| Biggest win | The win with the largest goal margin. Tie: the one with more goals scored, then the earlier match |
| Biggest loss | The loss with the largest goal margin. Tie: the one with more goals conceded, then the earlier match |
| Most goals in a season | Goals scored in one season, added up over its matches. Tied seasons are all listed |
| Best win streak | The longest run of wins in a row **inside one season**, with the season shown. A draw or a loss ends the run, and a run never carries into the next season. Tied seasons are all listed |
| Trophies | One star per trophy, with the season (see below) |
| Photo | The large picture, from the `photo` file in `data/players.js` |

A season that is still being played counts toward all the numbers above, and is
labelled "(in progress)". Trophies only count once a season is marked `"completed"`.

## Trophies

- **Gold star:** Premium Tier champion (rank 1 of Premium).
- **Teal star:** Second Tier winner (rank 1 of Second Tier).

The league champion is still only the Premium rank 1. See `docs/06-RULES-REFERENCE.md`.

## Photos

Each player's picture comes from `data/players.js`, for example
`photo: "assets/players/sun.jpg"`. A portrait photo (taller than wide) looks best. If the
file is missing, the card shows the player's initials instead of a broken image.

## Search

The search box appears above **Upcoming**, **Recent** (in both tiers) and on the **Players** page.

- Type part of a name. Capital letters and accents do not matter.
- On Upcoming and Recent, matches where either player fits are shown. Typing two names
  (`arnish robi`) finds the match between them.
- On Players, only the matching cards are shown.
- **Reset** (or the Escape key) clears the box and brings back the full default list.

## Where it lives (for developers)

| Part | File |
|---|---|
| Career numbers | `js/core/careers.js` |
| Name matching | `js/core/search.js` |
| Players page | `js/ui/render-players.js`, `players.html` |
| Search box | `js/ui/search.js` |
| Tests | `tests/engine.test.js` ("Player careers", "Search") |
