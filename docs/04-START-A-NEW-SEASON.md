# Starting a new season

Do this once, after you have closed the previous season (see `05-CLOSE-A-SEASON.md`).

Nothing about the system changes between seasons. Season 40 works exactly like Season 2.

---

## Step 1 — Make the folder

Copy `data/seasons/season-01/` and rename the copy to `season-02/`. It contains three files:

```
data/seasons/season-02/
  season.js
  premium.js
  second-tier.js
```

## Step 2 — Write season.js

Replace the whole file with this:

```js
export default {
  number: 2,
  status: "ongoing"
};
```

That is all a normal season needs. **Do not include a `rosters` block.** The engine works out both tiers from last season's final tables and applies promotion and relegation automatically.

If anyone is joining or leaving, add those lines:

```js
export default {
  number: 2,
  status: "ongoing",

  join:  ["rony"],     // new or returning players — always enter Second Tier
  leave: ["imran"]     // not playing this season
};
```

A player in `join` must already exist in `data/players.js`. See `01-ADD-A-PLAYER.md`.

## Step 3 — Find out who is in which tier

Open the site. It shows the new season's two tiers immediately, built from last season's results. Write the two lists down, or copy them from the Points Table pages.

## Step 4 — Generate the fixtures

Open `tools/fixture-generator.html` in your browser.

1. Paste the Premium Tier ids, set the season number, choose Premium Tier.
2. Press **Generate fixtures**, then **Copy to clipboard**.
3. Paste over the entire contents of `season-02/premium.js`.
4. Repeat for Second Tier into `season-02/second-tier.js`.

Choose **Shuffled** for round order if you want a different match order than last season. Standard is fine.

## Step 5 — Register the season

Open `data/seasons/_index.js` and add four lines:

```js
import s2meta    from "./season-02/season.js";
import s2premium from "./season-02/premium.js";
import s2second  from "./season-02/second-tier.js";

export const SEASONS = [
  { meta: s1meta, premium: s1premium, second: s1second },
  { meta: s2meta, premium: s2premium, second: s2second },   // <- added
];
```

## Step 6 — Check

Refresh the site. You should see:

- the new season as the current one
- both tiers at full size, nobody in two tiers at once
- every match in Upcoming, none in Recent
- no red banner

Post a news item announcing the season and you are running.

---

## What if the tiers look wrong?

They are built from the previous season's final tables, so first check that season is marked `"completed"`. If it is and the tiers still look wrong, you can take manual control for one season:

```js
export default {
  number: 2,
  status: "ongoing",
  forceRosters: {
    premium: ["...", "...", "...", "...", "...", "...", "...", "..."],
    second:  ["...", "...", "...", "...", "..."]
  }
};
```

This skips promotion and relegation entirely and uses exactly what you type. A notice appears on the site while it is switched on, so you cannot forget it is there. You should almost never need this.
