/* =========================================================================
   MOTION
   =========================================================================
   Shared animation helpers. They read the same spring curves as the CSS
   (tokens.css), so JavaScript motion and CSS motion feel like one system.
   Everything here does nothing, or the plain instant change, when the
   visitor prefers reduced motion.

   Batching rules followed throughout:
     · read layout first, then write (no read/write ping-pong per element);
     · one shared IntersectionObserver per job, not one per element;
     · scroll work is coalesced into one requestAnimationFrame;
     · non-urgent work waits for idle time.
   ========================================================================= */

const reduceQuery = matchMedia("(prefers-reduced-motion: reduce)");
export const reducedMotion = () => reduceQuery.matches;

/* Settle times of the generated springs, in ms (see tokens.css). */
export const DUR = { snappy: 420, liquid: 690, gentle: 610, bouncy: 790 };

const FALLBACK = {
  snappy: "cubic-bezier(.3, 1.25, .5, 1)",
  liquid: "cubic-bezier(.34, 1.45, .55, 1)",
  gentle: "cubic-bezier(.22, 1, .36, 1)",
  bouncy: "cubic-bezier(.34, 1.8, .5, 1)"
};
const cache = new Map();

/** The easing string for a spring, straight from the CSS custom property. */
export function easing(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--spring-${kind}`).trim() || FALLBACK[kind];
  cache.set(kind, value);
  return value;
}

/** Run a Web Animation with a spring. Returns null under reduced motion. */
export function spring(node, keyframes, kind = "gentle", options = {}) {
  if (reducedMotion() || !node.animate) return null;
  return node.animate(keyframes, { duration: DUR[kind], easing: easing(kind), ...options });
}

/** Smooth scroll that respects reduced motion. */
export function scrollToY(top, smooth = true) {
  window.scrollTo({ top: Math.max(0, top), behavior: smooth && !reducedMotion() ? "smooth" : "auto" });
}

/* ---- Where the floating bars are, for scroll maths --------------------- */

export function headerBottom() {
  return document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0;
}
export function tabbarTop() {
  const nav = document.querySelector(".main-nav");
  if (!nav || getComputedStyle(nav).position !== "fixed") return innerHeight;
  return nav.getBoundingClientRect().top;
}

/* ---- Idle scheduling ------------------------------------------------------ */

export const idle = window.requestIdleCallback
  ? (fn) => requestIdleCallback(fn, { timeout: 1500 })
  : (fn) => setTimeout(fn, 120);

/* ---- Count-up -------------------------------------------------------------
   Animates the number inside a node from 0 to its final text ("80%", "+4",
   "17"). Screen readers get the final value from a hidden twin, never the
   in-between numbers. */

export function countUp(node, duration = 760) {
  const final = node.textContent;
  const m = final.match(/^([^\d-]*)(-?\d+(?:\.\d+)?)(.*)$/);
  if (!m || reducedMotion()) return;
  const [, pre, num, post] = m;
  const to = parseFloat(num);
  if (!to) return;
  const decimals = (num.split(".")[1] || "").length;

  const twin = document.createElement("span");
  twin.className = "visually-hidden";
  twin.textContent = final;
  node.setAttribute("aria-hidden", "true");
  node.after(twin);

  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const e = 1 - Math.pow(1 - p, 4);               /* fast start, soft landing */
    node.textContent = pre + (to * e).toFixed(decimals) + post;
    if (p < 1) requestAnimationFrame(step);
    else {
      node.textContent = final;
      node.removeAttribute("aria-hidden");
      twin.remove();
    }
  };
  requestAnimationFrame(step);
}

/* ---- One-shot "when this is on screen" ----------------------------------- */

const onceIO = "IntersectionObserver" in window
  ? new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        onceIO.unobserve(e.target);
        e.target._whenVisible?.();
      }
    }, { rootMargin: "0px 0px -10% 0px" })
  : null;

export function whenVisible(node, fn) {
  if (!onceIO) { fn(); return; }
  node._whenVisible = fn;
  onceIO.observe(node);
}

/* ---- Rows that arrive one by one as they reach the screen ----------------
   Used by the infinite-scroll match lists: each new batch is inserted in
   one DOM write, then each row animates only when it is actually seen,
   staggered within whatever arrives together. */

const rowIO = "IntersectionObserver" in window
  ? new IntersectionObserver(entries => {
      const hits = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      hits.forEach((e, i) => {
        const node = e.target;
        rowIO.unobserve(node);
        node.classList.remove("reveal-row");
        node.animate?.(
          [{ opacity: 0, transform: "translateY(14px) scale(.985)" }, { opacity: 1, transform: "none" }],
          { duration: DUR.snappy, easing: easing("snappy"), delay: Math.min(i, 8) * 45, fill: "backwards" }
        );
      });
    }, { rootMargin: "0px 0px -3% 0px" })
  : null;

export function revealRows(nodes) {
  if (!rowIO || reducedMotion()) return;
  for (const n of nodes) { n.classList.add("reveal-row"); rowIO.observe(n); }
}

/** Stop watching rows that are being thrown away (a new search result). */
export function forgetRows(nodes) {
  if (!rowIO) return;
  for (const n of nodes) rowIO.unobserve(n);
}

/* ---- FLIP: animate a list into its new layout ------------------------------
   Measure positions, apply the change, measure again, then play each item
   from where it was. Only items near the screen are animated. */

export function flip(nodes, mutate) {
  if (reducedMotion()) { mutate(); return; }

  const near = (r) => r.bottom > -innerHeight && r.top < innerHeight * 2;
  const first = new Map();
  for (const n of nodes) {
    if (n.hidden) continue;
    const r = n.getBoundingClientRect();
    if (near(r)) first.set(n, r.top);
  }

  mutate();

  /* All reads, then all writes. */
  const plays = [];
  for (const n of nodes) {
    if (n.hidden) continue;
    const r = n.getBoundingClientRect();
    if (!near(r)) continue;
    plays.push([n, first.get(n), r.top]);
  }
  for (const [n, before, after] of plays) {
    if (before === undefined) {
      n.animate([{ opacity: 0, transform: "translateY(12px) scale(.97)" }, { opacity: 1, transform: "none" }],
        { duration: DUR.snappy, easing: easing("snappy") });
    } else if (Math.abs(before - after) > .5) {
      n.animate([{ transform: `translateY(${before - after}px)` }, { transform: "none" }],
        { duration: DUR.liquid, easing: easing("liquid") });
    }
  }
}
