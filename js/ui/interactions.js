/* =========================================================================
   INTERACTIONS
   =========================================================================
   Accordions, tabs and the arrival reveal. All motion answers an action,
   except the one-time reveal as content scrolls in.
   ========================================================================= */

import { el } from "./dom.js";

/* ---- Accordion ---------------------------------------------------------- */

let accId = 0;

/**
 * Collapsible card. Height is animated in JS because CSS cannot transition
 * to `auto`; after opening we release it back to auto so the panel can
 * still reflow if the window resizes.
 */
export function accordion({ head, body, open = false, tier }) {
  const id = `acc-${++accId}`;
  const inner = el("div", { class: "acc-inner" }, body);
  const panel = el("div", { class: "acc-body", id, role: "region" }, inner);

  const chevron = el("span", { class: "acc-chevron", "aria-hidden": "true" },
    svgChevron());

  const button = el("button", {
    class: "acc-head",
    type: "button",
    "aria-expanded": String(open),
    "aria-controls": id
  }, head, chevron);

  const card = el("div", { class: "acc" + (open ? " is-open" : ""), "data-tier": tier }, button, panel);

  const setOpen = next => {
    button.setAttribute("aria-expanded", String(next));
    card.classList.toggle("is-open", next);

    if (next) {
      panel.style.height = panel.scrollHeight + "px";
      panel.addEventListener("transitionend", function done(e) {
        if (e.propertyName !== "height") return;
        panel.style.height = "auto";
        panel.removeEventListener("transitionend", done);
      });
    } else {
      panel.style.height = panel.scrollHeight + "px";
      requestAnimationFrame(() => { panel.style.height = "0px"; });
    }
  };

  button.addEventListener("click", () => {
    setOpen(button.getAttribute("aria-expanded") !== "true");
  });

  if (open) requestAnimationFrame(() => { panel.style.height = "auto"; });
  return card;
}

function svgChevron() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
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

/* ---- Tabs --------------------------------------------------------------- */

/**
 * Tab bar with a marker that slides between tabs.
 * The selected tab is kept in the URL hash so a tab can be linked to.
 */
export function tabs(container, items) {
  const marker = el("span", { class: "tab-marker", "aria-hidden": "true" });
  const bar = el("div", { class: "tabs", role: "tablist" }, marker);
  const panels = [];

  items.forEach((item, i) => {
    const tabEl = el("button", {
      class: "tab",
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
    const current = panels.findIndex(p => p.tabEl.getAttribute("aria-selected") === "true");
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

  function moveMarker(i) {
    const t = panels[i].tabEl;
    marker.style.width = t.offsetWidth + "px";
    marker.style.transform = `translateX(${t.offsetLeft - bar.clientLeft}px)`;
  }

  function select(i, updateHash = true) {
    panels.forEach((p, j) => {
      const on = i === j;
      p.tabEl.setAttribute("aria-selected", String(on));
      p.tabEl.tabIndex = on ? 0 : -1;
      p.panel.classList.toggle("is-active", on);
      if (on && !p.panel._built) {          // build a panel the first time it is shown
        p.panel.replaceChildren(p.panel._build());
        p.panel._built = true;
        revealIn(p.panel);
      }
    });
    moveMarker(i);
    if (updateHash) history.replaceState(null, "", "#" + items[i].id);
  }

  container.append(bar, ...panels.map(p => p.panel));

  const fromHash = items.findIndex(it => "#" + it.id === location.hash);
  select(fromHash >= 0 ? fromHash : 0, false);

  /* Fonts load after first paint and change tab widths. */
  requestAnimationFrame(() => moveMarker(Math.max(fromHash, 0)));
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      const i = panels.findIndex(p => p.tabEl.getAttribute("aria-selected") === "true");
      if (i >= 0) moveMarker(i);
    });
  }
  window.addEventListener("resize", () => {
    const i = panels.findIndex(p => p.tabEl.getAttribute("aria-selected") === "true");
    if (i >= 0) moveMarker(i);
  });

  return { select };
}

/* ---- Reveal on scroll --------------------------------------------------- */

const io = "IntersectionObserver" in window
  ? new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: .05 })
  : null;

/** Stagger the direct children of a container as they scroll into view. */
export function revealIn(root, selector = ".reveal") {
  const nodes = root.querySelectorAll(selector);
  nodes.forEach((n, i) => {
    n.style.setProperty("--delay", Math.min(i, 8) * 60 + "ms");
    if (io) io.observe(n); else n.classList.add("is-in");
  });
}
