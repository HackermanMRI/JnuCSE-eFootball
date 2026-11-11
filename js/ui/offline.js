/* =========================================================================
   OFFLINE + UPDATES
   =========================================================================
   Starts the service worker (sw.js), which saves the site on the visitor's
   device in the background, and shows a small "New results are in" button
   when the worker finds newer files than the ones on screen.

   Not started on localhost, so that when you preview your own edits you
   always see the files you just saved. (To test it locally, run
   localStorage.setItem("jnucse:sw", "on") in the browser console.)
   ========================================================================= */

import { el, icon } from "./dom.js";

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

export function initOffline() {
  if (!("serviceWorker" in navigator)) return;

  let optedIn = false;
  try { optedIn = localStorage.getItem("jnucse:sw") === "on"; } catch { /* private mode */ }
  if (LOCAL && !optedIn) return;

  /* The <head> script starts listening before anything else runs, so a
     notice that arrives while the page is still loading is not missed. */
  if (window.__contentUpdated) offerRefresh();
  addEventListener("jnucse:updated", offerRefresh);

  /* After the page has finished its own work. */
  const start = () => navigator.serviceWorker.register("sw.js").catch(() => { /* the site works without it */ });
  if (document.readyState === "complete") start();
  else addEventListener("load", start, { once: true });
}

let shown = false;

function offerRefresh() {
  if (shown) return;
  shown = true;
  const button = el("button", { class: "update-toast gi", type: "button" },
    el("span", { class: "update-ico" }, icon("refresh")),
    el("span", {}, el("b", {}, "New results are in"), el("small", {}, "Tap to refresh"))
  );
  button.addEventListener("click", () => location.reload());
  const live = el("div", { class: "update-host", role: "status" }, button);
  document.body.append(live);
}
