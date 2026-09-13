# First time setup

Start here. Four steps, then the league is live.

Until you finish, every page shows a setup panel instead of empty tables. That is normal.

---

## 1. Add your players

Open `data/players.js` and add one line per person:

```js
export const PLAYERS = [
  { id: "mrinmoy", name: "Mrinmoy", photo: "assets/players/mrinmoy.jpg" },
  { id: "azam",    name: "Azam",    photo: "assets/players/azam.jpg"    },
  // ...one line per player
];
```

The `id` is permanent. Lowercase, no spaces. Never reuse an id for a different person.

Photos are optional — a player without one shows their initials. Put any you have in `assets/players/`.

Full detail: `01-ADD-A-PLAYER.md`

## 2. Split them into two tiers

Open `data/seasons/season-01/season.js` and fill in the two lists:

```js
rosters: {
  premium: ["mrinmoy", "azam", "rifat", "sakib", "tanvir", "nayem", "arif", "joy"],
  second:  ["hasan", "imran", "shuvo", "rakib", "tonmoy", "fahim", "noman"]
}
```

Premium takes 8 players by default. Everyone else goes in second — there is no limit there.

**This is the only season where you do this by hand.** Season 2 onwards builds its own tiers from the previous season's results.

If you want a different Premium size, change `premiumSize` in `data/config.js` first.

## 3. Generate the fixtures

Open `tools/fixture-generator.html` in your browser.

1. Paste your Premium Tier ids into the box, one per line.
2. Set season number to 1 and tier to Premium Tier.
3. Press **Generate fixtures**, then **Copy to clipboard**.
4. Paste over everything in `data/seasons/season-01/premium.js`.
5. Repeat for Second Tier into `data/seasons/season-01/second-tier.js`.

Every match comes out blank, ready for you to fill in as they are played.

## 4. Switch the season on

Open `data/seasons/_index.js` and uncomment four lines:

```js
import s1meta    from "./season-01/season.js";
import s1premium from "./season-01/premium.js";
import s1second  from "./season-01/second-tier.js";

export const SEASONS = [
  { meta: s1meta, premium: s1premium, second: s1second },
];
```

Refresh. The setup panel is replaced by real tables.

---

## Check it worked

- Both tier pages show a points table with everyone on 0 points.
- Upcoming lists matches; Recent is empty.
- No red banner at the top.

If a red banner appears, it names exactly what is wrong and where.

## Make it yours

- **Logo** — replace `assets/logo.svg` with your own file, or point `logo` in `data/config.js` somewhere else.
- **Site name** — `siteName` in `data/config.js`.
- **First news post** — `data/news.js`. See `03-POST-NEWS.md`.

## Put it online

The site is plain files. Drag the whole folder into Netlify, Vercel or Cloudflare Pages. No build command, no output directory.

To preview locally, run a small server from the project folder — opening the files directly will not work, because browsers block modules on `file://`:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Next

Once matches start being played, the only file you touch is the tier fixture file. See `02-ENTER-MATCH-RESULTS.md`.
