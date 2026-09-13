# Adding a player

Two steps. Both are one line each.

## Step 1 — Register them, once and forever

Open `data/players.js` and add a line:

```js
{ id: "rony", name: "Rony", photo: "assets/players/rony.jpg" },
```

| Field | Rule |
|---|---|
| `id` | lowercase letters, numbers, `-` and `_` only. No spaces. **Permanent — never change it and never reuse it for a different person.** |
| `name` | what appears on the site. Anything you like. |
| `photo` | optional. Put the image in `assets/players/`. A placeholder shows if the file is missing. |

Leave players in this file forever, even after they stop playing. Their past seasons still reference them.

## Step 2 — Put them in a season

New players always start in Second Tier, and only at the start of a season. In that season's `season.js`:

```js
join: ["rony"],
```

From the following season onward the engine carries them automatically. You never mention them again unless they leave.

## A player returning after a break

Same thing. They are already in `players.js`, so only step 2 applies:

```js
join: ["imran"],
```

They re-enter in Second Tier. Their old seasons, titles and records stay intact and still show on their player card.

## A player leaving

In the season they are sitting out:

```js
leave: ["imran"],
```

Do **not** delete them from `players.js`. If they were in Premium Tier, the next best Second Tier player is moved up to keep Premium at full strength, and the site tells you it happened.

## Changing a photo or a display name

Edit `data/players.js` and save. Nothing else is affected — names and photos are display only, and every calculation uses the `id`.
