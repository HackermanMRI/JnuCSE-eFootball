# Posting news

All news lives in `data/news.js`. Newest post appears first automatically.

## Add a post

Add an entry at the top of the list:

```js
{
  id: "s1-matchday-9",
  title: "Mrinmoy retakes the lead",
  banner: "assets/news/s1-md9.jpg",
  date: "2026-09-14",
  body: `Two goals in the second half put Mrinmoy back on top.

Sakib stays within one point with four matches to play.`
},
```

| Field | Notes |
|---|---|
| `id` | unique, never reused. Anything readable. |
| `title` | headline on the collapsed card. |
| `banner` | landscape image in `assets/news/`. About 1200x500 looks best. Optional. |
| `date` | `"YYYY-MM-DD"`. This is what sorts the feed and what shows on the card. |
| `body` | the post. Use backticks so you can write across multiple lines. A blank line starts a new paragraph. Wrap words in `*asterisks*` for emphasis. |
| `pinned` | optional. `pinned: true` keeps it above everything else. |

## Order

Pinned posts first, then newest date first. You do not have to keep the file in any particular order — the site sorts it.

## Removing a post

Delete the entry. Nothing else references it.

## Tips

- Keep `id` values meaningful (`s2-champion`, `s1-opening`) so the file stays readable after fifty posts.
- Unpin the old season announcement when you pin the new one, or you will end up with two pinned posts.
