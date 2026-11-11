# Speed: images, the font, and background caching

The site is set up so pages open quickly, even on mobile data. Most of it is
automatic. **You have one job: after you add or replace an image, run one command.**

## Your one job: after adding or replacing an image

```
python3 tools/optimize-images.py
```

Then commit and push as usual, including the new files in `assets/_small/`.

What it does: for every photo in `assets/` it makes small copies (WebP files) in
`assets/_small/` and updates the list `assets/_small/manifest.js`. The site shows
the small copy that fits the visitor's screen, and a tiny blurred preview while
it loads. Your originals are never changed.

| Image | Original | What a phone downloads now |
|---|---|---|
| A news banner | about 800 KB | about 40 KB |
| A player photo in a table | about 100 KB | about 4 KB |
| The logo in the header | 2.7 MB (the old `logo.svg`) | 3 KB |

- **Needs** Python 3 and Pillow (`pip install pillow`), once.
- **If you forget:** nothing breaks. A new image without small copies is shown
  from its original file, just slower. A *replaced* image keeps showing its old
  small copy until you run the command, so do not skip it then.
- **To check without changing anything:** `python3 tools/optimize-images.py --check`
  or `node tests/site.test.js`. Both list any image that is out of date.

### The logo

`data/config.js` now points at `assets/logo.jpg`. Use a JPG or PNG for the logo.
The old `assets/logo.svg` was 2.7 MB (a traced copy of the same picture) and was
downloaded on every page to fill a 34-pixel square; it was the largest single
cause of slow loading. It is still in the folder but no longer used, and you
can delete it. The script warns about any large file it cannot shrink.

## The font

The Archivo font is served from this site (`assets/fonts/archivo-latin.woff`,
60 KB) instead of from Google, so text does not wait on a second server. It
holds Latin letters only; anything else uses the device's own font. Its licence
is `assets/fonts/OFL.txt`.

## Background caching (the service worker)

`sw.js` is a small program the browser runs in the background, separately from
the page. After someone's first visit it keeps a copy of the site on their device.

- **Pages open at once** on later visits and when moving between tabs, because
  they come from the device instead of the network.
- **The site works offline.** Pictures are available offline once they have been
  seen.
- **Nobody is left on old scores.** Each time a page opens, the worker checks
  the network in the background. If any page, script, style or data file has
  changed, a **"New results are in · Tap to refresh"** button appears. So after
  you push new results, a visitor sees the old page for a moment, then the
  button, and one tap shows the new results.

**When you preview on your own computer** (`localhost`), the worker is switched
off, so you always see the files you just saved.

In Chrome and Edge the site also fetches the other pages ahead of time and
prepares one in the background when a link is about to be pressed.

### Turn caching off

1. In `js/app.js`, delete the line `initOffline();`.
2. Replace everything in `sw.js` with:

```js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", async () => {
  for (const name of await caches.keys()) await caches.delete(name);
  await self.registration.unregister();
});
```

Keep that `sw.js` on the site for a few weeks: it removes the saved copy from
each visitor's device the next time they come. Do not just delete `sw.js`;
devices that already have the worker would keep using their saved copy.

## Checks

```
node tests/site.test.js
```

It confirms that every page preloads the scripts it needs, that the worker
knows every page, and that every image has up-to-date small copies. If you add
a new page or a new script file, this test tells you what to update.

## Where it lives (for developers)

| Part | File |
|---|---|
| Small image copies | `tools/optimize-images.py`, `assets/_small/` |
| Choosing the right copy | `js/ui/images.js` |
| Service worker | `sw.js`; started by `js/ui/offline.js` |
| Script preloads, page prefetch | the `<head>` of each page |
| Tests | `tests/site.test.js` |
