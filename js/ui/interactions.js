/* =========================================================================
   INTERACTIONS
   =========================================================================
   Accordions, tabs and the arrival reveal. Motion answers an action; the
   one exception is content settling in as it scrolls into view.
   ========================================================================= */

import { el } from "./dom.js";
import { reducedMotion, spring, easing, DUR, idle, headerBottom, tabbarTop } from "./motion.js";

/* ---- Accordion -------------------------------------------------------------
   Height runs on a spring with the Web Animations API, so a second tap in
   the middle of an animation reverses smoothly from wherever it is. When a
   card opens near the bottom of the screen, the page scrolls just enough to
   show it, never pushing its top under the header.
   `body` may be a function: the content is then built the first time the
   card opens, so a long list of closed cards stays light. */

let accId = 0;

export function accordion({ head, body, open = false, tier, onFirstOpen }) {
  const id = `acc-${++accId}`;
  const lazy = typeof body === "function";
  const inner = el("div", { class: "acc-inner" }, lazy ? null : body);
  const panel = el("div", { class: "acc-body", id, role: "region" }, inner);

  const chevron = el("span", { class: "acc-chevron", "aria-hidden": "true" }, svgChevron());

  const button = el("button", {
    class: "acc-head",
    type: "button",
    "aria-expanded": String(open),
    "aria-controls": id
  }, head, chevron);

  const card = el("div", { class: "acc" + (open ? " is-open" : ""), "data-tier": tier }, button, panel);

  let anim = null;
  let opened = open;

  function setOpen(next, { animate = true, reveal = true } = {}) {
    if (next && lazy && !inner.firstChild) inner.append(body());
    const from = panel.getBoundingClientRect().height;   /* mid-flight safe */
    anim?.cancel();
    anim = null;

    button.setAttribute("aria-expanded", String(next));
    card.classList.toggle("is-open", next);

    panel.style.height = "auto";
    const to = next ? panel.scrollHeight : 0;
    panel.style.height = next ? "auto" : "0px";

    if (next && !opened) { opened = true; onFirstOpen?.(card); }

    if (!animate || reducedMotion() || Math.abs(to - from) < 1) {
      if (next && reveal) keepInView(card);
      return;
    }
    anim = panel.animate([{ height: `${from}px` }, { height: `${to}px` }], next
      ? { duration: DUR.gentle, easing: easing("gentle") }
      : { duration: 340, easing: "cubic-bezier(.4, 0, .2, 1)" });
    anim.onfinish = () => {
      anim = null;
      if (next && reveal) keepInView(card);
    };
  }

  button.addEventListener("click", () => {
    setOpen(button.getAttribute("aria-expanded") !== "true");
  });

  if (open) {
    if (lazy) inner.append(body());
    panel.style.height = "auto";
  }

  /* Lets a page open a card from a link (players.html#player-…). */
  card.openCard = (options) => setOpen(true, options);
  return card;
}

function keepInView(card) {
  const r = card.getBoundingClientRect();
  const top = headerBottom() + 12;
  const bottom = tabbarTop() - 12;
  if (r.bottom <= bottom) return;
  const delta = Math.min(r.bottom - bottom, r.top - top);
  if (delta > 4) window.scrollBy({ top: delta, behavior: reducedMotion() ? "auto" : "smooth" });
}

function svgChevron() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "15");
  svg.setAttribute("height", "15");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const path = document.createElementNS(ns, "polyline");
  path.setAttribute("points", "6 9 12 15 18 9");
  svg.append(path);
  return svg;
}

/* ---- Tabs -------------------------------------------------------------------
   A segmented control. The selection lens moves like a drop of liquid: its
   leading edge reaches the new tab first, it thins as it stretches, the
   trailing edge catches up and it settles with a small wobble. The bar is
   sticky, so after scrolling down a long list the tabs are still at hand;
   switching tabs then starts the new panel at its top. The selected tab is
   kept in the URL hash so a tab can be linked to. Panels that are not
   shown are built in idle time, so switching is instant. */

export function tabs(container, items) {
  const marker = el("span", { class: "tab-marker", "aria-hidden": "true" });
  const bar = el("div", { class: "tabs", role: "tablist" }, marker);
  const panels = [];
  let current = -1;
  let markerAnim = null;

  items.forEach((item, i) => {
    const tabEl = el("button", {
      class: "tab gi",
      type: "button",
      role: "tab",
      id: `tab-${item.id}`,
      "aria-controls": `panel-${item.id}`,
      "aria-selected": "false",
      tabindex: "-1"
    }, item.label);

    const panel = el("section", {
      class: "tab-panel",
      id: `panel-${item.id}`,
      role: "tabpanel",
      "aria-labelledby": `tab-${item.id}`,
      tabindex: "0"
    });
    panel._build = item.build;
    panel._built = false;

    tabEl.addEventListener("click", () => select(i));
    bar.append(tabEl);
    panels.push({ tabEl, panel });
  });

  bar.addEventListener("keydown", e => {
    const last = panels.length - 1;
    let next = null;
    if (e.key === "ArrowRight") next = current === last ? 0 : current + 1;
    if (e.key === "ArrowLeft") next = current === 0 ? last : current - 1;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    select(next);
    panels[next].tabEl.focus();
  });

  function build(p) {
    if (p.panel._built) return;
    p.panel.replaceChildren(p.panel._build());
    p.panel._built = true;
    revealIn(p.panel);
  }

  const rectOf = i => ({ x: panels[i].tabEl.offsetLeft, w: panels[i].tabEl.offsetWidth });

  function placeMarker(i) {
    const { x, w } = rectOf(i);
    marker.style.width = `${w}px`;
    marker.style.transform = `translateX(${x}px)`;
  }

  function slideMarker(i) {
    /* Start from wherever the lens is now, even mid-flight. */
    const cs = getComputedStyle(marker);
    const m = new DOMMatrixReadOnly(cs.transform === "none" ? undefined : cs.transform);
    const from = { x: m.m41, w: parseFloat(cs.width) || 0 };
    markerAnim?.cancel();
    const to = rectOf(i);
    placeMarker(i);
    if (reducedMotion() || !marker.animate || !from.w) return;

    const dir = Math.sign(to.x - from.x) || 1;
    const L0 = from.x, R0 = from.x + from.w, L1 = to.x, R1 = to.x + to.w;
    const lead = .9, trail = .22;
    const mid = dir > 0
      ? { L: L0 + (L1 - L0) * trail, R: R0 + (R1 - R0) * lead }
      : { L: L0 + (L1 - L0) * lead,  R: R0 + (R1 - R0) * trail };

    markerAnim = marker.animate([
      { transform: `translateX(${L0}px) scaleY(1)`,   width: `${R0 - L0}px` },
      { transform: `translateX(${mid.L}px) scaleY(.8)`, width: `${mid.R - mid.L}px`, offset: .42 },
      { transform: `translateX(${L1}px) scaleY(1)`,   width: `${R1 - L1}px` }
    ], { duration: DUR.liquid, easing: easing("liquid") });
    markerAnim.onfinish = () => { markerAnim = null; };
  }

  /* After scrolling down a long list, a new tab starts at its top. */
  function keepPanelTop() {
    const stickyTop = parseFloat(getComputedStyle(bar).top) || 0;
    const naturalTop = container.getBoundingClientRect().top + window.scrollY;
    const target = naturalTop - stickyTop;
    if (window.scrollY > target + 1) window.scrollTo({ top: target, behavior: "auto" });
  }

  /* On a narrow phone the bar can scroll sideways: keep the chosen tab in view. */
  function revealTab(i) {
    if (bar.scrollWidth <= bar.clientWidth + 1) return;
    const t = panels[i].tabEl;
    const left = t.offsetLeft - 24;
    const right = t.offsetLeft + t.offsetWidth + 24;
    const behavior = reducedMotion() ? "auto" : "smooth";
    if (left < bar.scrollLeft) bar.scrollTo({ left, behavior });
    else if (right > bar.scrollLeft + bar.clientWidth) bar.scrollTo({ left: right - bar.clientWidth, behavior });
  }

  function select(i, { updateHash = true, animate = true } = {}) {
    if (i === current) return;
    const prev = current;
    current = i;

    panels.forEach((p, j) => {
      const on = i === j;
      p.tabEl.setAttribute("aria-selected", String(on));
      p.tabEl.tabIndex = on ? 0 : -1;
      p.panel.classList.toggle("is-active", on);
    });

    const p = panels[i];
    build(p);

    if (prev < 0 || !animate) {
      placeMarker(i);
    } else {
      keepPanelTop();
      slideMarker(i);
      const dir = Math.sign(i - prev);
      spring(p.panel, [
        { opacity: 0, transform: `translateX(${dir * 28}px)` },
        { opacity: 1, transform: "none" }
      ], "gentle");
    }
    revealTab(i);
    if (updateHash) history.replaceState(null, "", "#" + items[i].id);
  }

  container.append(bar, ...panels.map(p => p.panel));
  document.documentElement.classList.add("has-tabs");

  const fromHash = items.findIndex(it => "#" + it.id === location.hash);
  select(fromHash >= 0 ? fromHash : 0, { updateHash: false, animate: false });

  /* Mark a bar that scrolls sideways, so CSS can fade the cut edge. */
  const edges = () => {
    const over = bar.scrollWidth > bar.clientWidth + 1;
    bar.classList.toggle("is-overflowing", over);
    bar.classList.toggle("more-left", over && bar.scrollLeft > 2);
    bar.classList.toggle("more-right", over && bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 2);
  };
  bar.addEventListener("scroll", edges, { passive: true });

  /* Fonts load after first paint and change tab widths; so do rotations. */
  const replace = () => { if (!markerAnim && current >= 0) placeMarker(current); edges(); };
  requestAnimationFrame(replace);
  document.fonts?.ready.then(replace);
  if ("ResizeObserver" in window) new ResizeObserver(replace).observe(bar);
  else window.addEventListener("resize", replace);

  /* Build the hidden panels one at a time while the browser is idle. */
  const prebuild = () => {
    const next = panels.find(p => !p.panel._built);
    if (!next) return;
    idle(() => { build(next); prebuild(); });
  };
  prebuild();

  return { select };
}

/* ---- Reveal on scroll --------------------------------------------------- */

/* The stagger counts only the cards that arrive together, in screen order,
   so a card far down the list (or one reached by a link) is not kept
   waiting behind cards that came in long ago. */
const io = "IntersectionObserver" in window
  ? new IntersectionObserver(entries => {
      entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        .forEach((e, i) => {
          e.target.style.setProperty("--delay", Math.min(i, 6) * 60 + "ms");
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .05 })
  : null;

/** Cards settle in as they scroll into view. */
export function revealIn(root, selector = ".reveal") {
  for (const n of root.querySelectorAll(selector)) {
    if (io) io.observe(n); else n.classList.add("is-in");
  }
}

/** Show a card right away, without waiting to be scrolled to. */
export function revealNow(node) {
  io?.unobserve(node);
  node.style.setProperty("--delay", "0ms");
  node.classList.add("is-in");
}
