/* =========================================================================
   SERVICE WORKER  —  background caching
   =========================================================================
   Runs in the browser's background, separately from the page. It makes
   repeat visits and moving between pages fast, and lets the site open with
   no connection at all.

   How it answers a request (same-site GET requests only):
     1. If a copy is saved, answer with it at once.
     2. In the background, ask the network for the latest version and save it.
     3. If a page, script, style or data file CHANGED, tell the open pages,
        which show a "New results are in" button (js/ui/offline.js).
   So nobody waits on the network, and nobody is left on old scores without
   being told.

   The first visit saves the five pages, everything their <head> lists
   (styles, scripts, the font) and every script those scripts import, so
   every later page opens from the device. Images are saved as they are seen.

   To switch all of this off, see docs/09-SPEED.md ("Turn caching off").
   ========================================================================= */

const VERSION = "v1";
const CACHE = `jnucse-${VERSION}`;
const PAGES = ["index.html", "premium.html", "second-tier.html", "history.html", "players.html"];

/* Files whose changes matter to what the visitor reads. */
const TEXT = /\.(?:html|js|css|json)$/i;

const here = (path) => new URL(path, self.location).href;

/* Some hosts answer "premium.html" with a redirect to "premium". A saved
   redirect cannot be used to answer a page load, so keep a plain copy. */
async function plain(res) {
  if (!res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}

/* ---- Install: save the shell ------------------------------------------- */

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const wanted = new Set(PAGES.map(here));

    /* Each page's <head> lists its styles, scripts and font. Read those
       lists instead of keeping a second copy of them here. */
    await Promise.all(PAGES.map(async (page) => {
      try {
        const res = await plain(await fetch(here(page), { cache: "no-cache" }));
        if (!res.ok) return;
        await cache.put(here(page), res.clone());
        const html = await res.text();
        for (const m of html.matchAll(/<link\b[^>]*\brel="(?:stylesheet|modulepreload|preload|icon)"[^>]*>/g)) {
          const href = m[0].match(/\bhref="([^"]+)"/)?.[1];
          if (href && !/^[a-z]+:/i.test(href)) wanted.add(here(href));
        }
      } catch { /* offline during install: the rest is saved as it is used */ }
    }));

    /* Save each file, and follow the imports inside scripts, so the season
       data files (which only data/seasons/_index.js names) are saved too. */
    const done = new Set();
    const save = async (url) => {
      if (done.has(url)) return;
      done.add(url);
      try {
        let res = await cache.match(url);
        if (!res) {
          res = await plain(await fetch(url, { cache: "no-cache" }));
          if (!res.ok) return;
          await cache.put(url, res.clone());
        }
        if (!/\.js$/i.test(new URL(url).pathname)) return;
        const code = await res.text();
        const found = [...code.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g)]
          .map(m => new URL(m[1], url).href);
        await Promise.all(found.map(save));
      } catch { /* best effort */ }
    };
    await Promise.all([...wanted].map(save));

    await self.skipWaiting();
  })());
});

/* ---- Activate: drop caches from older versions --------------------------- */

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith("jnucse-") && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

/* ---- Fetch: saved copy first, refresh in the background ------------------ */

let pending = 0;
let changed = false;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.has("range")) return;

  /* The address without ?query or #hash is the key, so index.html#news and
     index.html share one saved copy. */
  const key = url.origin + url.pathname;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const saved = await cache.match(key);
    /* The saved copy is about to be handed to the page, which uses it up;
       keep a second copy to compare the fresh one against. */
    const refresh = update(cache, key, saved?.clone());

    if (saved) {
      event.waitUntil(refresh);
      return saved;
    }
    const fresh = await refresh;
    if (fresh) return fresh;
    /* Offline and never saved: for a page, fall back to the home page. */
    if (req.mode === "navigate") {
      const home = await cache.match(here("index.html"));
      if (home) return home;
    }
    return Response.error();
  })());
});

/** Fetch the latest copy, save it, and note whether it differs. */
async function update(cache, key, saved) {
  pending++;
  try {
    const fresh = await plain(await fetch(key, { cache: "no-cache" }));
    if (!fresh.ok) {
      /* The file is gone from the site: stop serving the saved copy. */
      if (saved && (fresh.status === 404 || fresh.status === 410)) await cache.delete(key);
      return saved ? null : fresh;
    }
    if (saved && TEXT.test(new URL(key).pathname) && !(await same(saved, fresh.clone()))) {
      changed = true;
    }
    await cache.put(key, fresh.clone());
    return fresh;
  } catch {
    return null;
  } finally {
    pending--;
    if (pending === 0 && changed) {
      changed = false;
      announce();
    }
  }
}

async function same(a, b) {
  const [x, y] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()]);
  if (x.byteLength !== y.byteLength) return false;
  const p = new Uint8Array(x), q = new Uint8Array(y);
  for (let i = 0; i < p.length; i++) if (p[i] !== q[i]) return false;
  return true;
}

async function announce() {
  for (const client of await self.clients.matchAll({ type: "window" })) {
    client.postMessage({ type: "content-updated" });
  }
}
