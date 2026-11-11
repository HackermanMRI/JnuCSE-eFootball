/* =========================================================================
   SHELL
   =========================================================================
   The page chrome around the content:
     · scroll edge effects where content slides under the floating bars;
     · the large title collapsing into a small one in the bar (phones);
     · the tab bar tucking in while you scroll down (phones);
     · back to top (desktop), and tapping the current tab to scroll up.
   One passive scroll listener, coalesced into a single animation frame;
   classes are only written when their value actually changes.
   ========================================================================= */

import { el } from "./dom.js";
import { scrollToY } from "./motion.js";

export function initShell() {
  const root = document.documentElement;
  const header = document.querySelector(".site-header");
  const nav = document.querySelector(".main-nav");
  const h1 = document.querySelector(".page-head h1");
  const phone = matchMedia("(max-width: 760px)");

  /* ---- Pieces that only make sense with JavaScript running ------------- */
  document.body.append(
    el("div", { class: "edge edge-top", "aria-hidden": "true" }),
    el("div", { class: "edge edge-bottom", "aria-hidden": "true" })
  );

  if (header && h1) {
    header.append(el("span", { class: "bar-title", "aria-hidden": "true" }, h1.textContent.trim()));
  }
  /* A line of light along the header's rim that fills as you scroll
     (pure CSS, see animations.css; hidden where unsupported). */
  header?.append(el("span", { class: "scroll-progress", "aria-hidden": "true" }));

  const toTop = el("button", { class: "to-top gi", type: "button", "aria-label": "Back to top" }, arrowUp());
  document.body.append(toTop);

  const goTop = () => {
    scrollToY(0);
    h1?.focus({ preventScroll: true });   /* keyboard users land on the title */
  };
  toTop.addEventListener("click", goTop);

  /* Tapping the tab you are already on scrolls back up (iOS convention). */
  nav?.addEventListener("click", e => {
    const current = e.target.closest("a[aria-current='page']");
    if (!current || window.scrollY < 4) return;
    e.preventDefault();
    goTop();
  });

  /* iOS Safari only applies :active styles when a touch listener exists. */
  document.addEventListener("touchstart", () => {}, { passive: true });

  /* ---- State writes, deduplicated ---------------------------------------- */
  const state = new Map();
  const set = (node, cls, on) => {
    const key = node === root ? cls : "fab:" + cls;
    if (state.get(key) === on) return;
    state.set(key, on);
    node.classList.toggle(cls, on);
  };

  /* ---- The large title collapsing into the bar --------------------------- */
  if (h1 && "IntersectionObserver" in window) {
    const offset = Math.round(header?.getBoundingClientRect().height || 64);
    new IntersectionObserver(([e]) => {
      set(root, "title-collapsed", !e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? offset));
    }, { rootMargin: `-${offset}px 0px 0px 0px` }).observe(h1);
  }

  /* ---- Scroll ------------------------------------------------------------- */
  let lastY = window.scrollY;
  let down = 0, up = 0;
  let queued = false;

  function frame() {
    queued = false;
    /* Reads */
    const y = Math.max(0, window.scrollY);
    const room = document.documentElement.scrollHeight - innerHeight - y;
    const dy = y - lastY;
    lastY = y;

    /* Writes */
    set(root, "is-scrolled", y > 4);
    set(root, "has-below", room > 24);
    set(toTop, "is-visible", y > innerHeight * 1.1);

    if (phone.matches) {
      if (dy > 0) { down += dy; up = 0; }
      else if (dy < 0) { up -= dy; down = 0; }
      let tucked = state.get("nav-min") || false;
      if (y < 90 || room < 40) tucked = false;   /* near the top or the end */
      else if (down > 28) tucked = true;
      else if (up > 18) tucked = false;
      set(root, "nav-min", tucked);
    } else {
      set(root, "nav-min", false);
    }
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };

  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue, { passive: true });
  frame();

  /* Touching or tabbing into a tucked bar brings it back. */
  nav?.addEventListener("pointerdown", () => set(root, "nav-min", false), { passive: true });
  nav?.addEventListener("focusin", () => set(root, "nav-min", false));
}

function arrowUp() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const a = document.createElementNS(ns, "path");
  a.setAttribute("d", "M12 19V5");
  const b = document.createElementNS(ns, "path");
  b.setAttribute("d", "m5.5 11.5 6.5-6.5 6.5 6.5");
  svg.append(a, b);
  return svg;
}
