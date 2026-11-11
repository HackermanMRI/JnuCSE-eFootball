/* =========================================================================
   GLASS
   =========================================================================
   Progressive enhancements for css/glass.css. The site works without any
   of them.

     1. Refraction (Chromium only). For each floating bar, a displacement
        map is drawn from the bar's own shape: pixels near the rim are
        sampled from further inside, so the background bends at the edge
        while the centre stays clear, like a lens. Larger bars get a wider,
        stronger rim. Maps are rebuilt when a bar changes size.
     2. Press response: glass controls swell and light blooms from the
        touch point.
     3. Pointer light on content cards, and a slight tilt toward the
        pointer on record cards and player photos (desktop).
     4. The "Reduce transparency" switch in the footer, for browsers that
        cannot report the system setting (Safari).
   ========================================================================= */

import { el } from "./dom.js";

const KEY = "jnucse:transparency";
const root = document.documentElement;

export function initGlass() {
  pressResponse();
  pointerLight();
  transparencySwitch();
  if (refractionSupported() && root.dataset.transparency !== "reduced") refraction();
}

/* ---- 1. Refraction ---------------------------------------------------------- */

function refractionSupported() {
  const chromium = navigator.userAgentData?.brands?.some(b => b.brand === "Chromium");
  return Boolean(chromium) && Boolean(document.createElement("canvas").getContext);
}

let defs = null;
let refracting = false;
let uid = 0;

function refraction() {
  if (refracting) return;
  refracting = true;
  root.classList.add("glass-refract");

  defs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.setAttribute("aria-hidden", "true");
  defs.style.position = "absolute";
  document.body.append(defs);

  const header = document.querySelector(".site-header");
  if (header) lens(header, () => capsuleOf(header));
  const nav = document.querySelector(".main-nav");
  if (nav) lens(nav, () => boxOf(nav));
  for (const bar of document.querySelectorAll(".tabs")) lens(bar, () => boxOf(bar));
  const top = document.querySelector(".to-top");
  if (top) lens(top, () => boxOf(top));
}

/* The header's glass is its ::before, so measure that. */
function capsuleOf(header) {
  const r = header.getBoundingClientRect();
  const cs = getComputedStyle(header, "::before");
  const w = r.width - parseFloat(cs.left) - parseFloat(cs.right);
  const h = r.height - parseFloat(cs.top) - parseFloat(cs.bottom);
  return { w, h, radius: Math.min(parseFloat(cs.borderTopLeftRadius) || h / 2, h / 2) };
}

function boxOf(node) {
  const w = node.offsetWidth, h = node.offsetHeight;
  const radius = parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0;
  return { w, h, radius: Math.min(radius, w / 2, h / 2) };
}

function lens(node, measure) {
  const id = `lg-${++uid}`;
  let last = "";
  let timer = 0;

  const build = () => {
    const { w, h, radius } = measure();
    const W = Math.round(w), H = Math.round(h);
    if (W < 8 || H < 8) return;
    const sig = `${W}x${H}x${Math.round(radius)}`;
    if (sig === last) return;
    last = sig;

    /* Bigger glass is thicker glass: a wider rim and stronger bend. */
    const bezel = Math.max(8, Math.min(22, H * .34));
    const scale = Math.max(14, Math.min(34, H * .56));
    const map = lensMap(W, H, Math.round(radius), bezel);

    defs.querySelector(`#${id}`)?.remove();
    defs.insertAdjacentHTML("beforeend",
      `<filter id="${id}" x="0" y="0" width="${W}" height="${H}" filterUnits="userSpaceOnUse"
               primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
         <feImage href="${map}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" result="map"/>
         <feDisplacementMap in="SourceGraphic" in2="map" scale="${scale.toFixed(1)}"
                            xChannelSelector="R" yChannelSelector="G"/>
       </filter>`);
    node.style.setProperty("--lg-url", `url(#${id})`);
  };

  build();
  if ("ResizeObserver" in window) {
    /* Bars animate their size (the tab bar tucking in): rebuild once it settles. */
    new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(build, 160); }).observe(node);
  }
}

/** Displacement map for a rounded rectangle, from its signed distance field.
    Red = horizontal shift, green = vertical, 128 = none. */
function lensMap(w, h, r, bezel) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const hw = w / 2, hh = h / 2;
  const bx = hw - r, by = hh - r;

  for (let y = 0; y < h; y++) {
    const py = y + .5 - hh;
    const qy = Math.abs(py) - by;
    for (let x = 0; x < w; x++) {
      const px = x + .5 - hw;
      const qx = Math.abs(px) - bx;

      let dist, nx = 0, ny = 0;
      if (qx > 0 && qy > 0) {                 /* a corner: distance from the arc */
        const l = Math.hypot(qx, qy) || 1;
        dist = r - l;
        nx = (qx / l) * Math.sign(px);
        ny = (qy / l) * Math.sign(py);
      } else if (qx > qy) {                   /* a left or right side */
        dist = r - qx;
        nx = Math.sign(px);
      } else {                                /* the top or bottom */
        dist = r - qy;
        ny = Math.sign(py);
      }

      let dx = 0, dy = 0;
      if (dist > 0 && dist < bezel) {
        const t = 1 - dist / bezel;           /* 1 at the rim, 0 inside the bezel */
        const m = t * t;                      /* convex: bends hardest right at the rim */
        dx = -nx * m;                         /* sample from further inside */
        dy = -ny * m;
      }
      const i = (y * w + x) * 4;
      d[i]     = 128 + dx * 127;
      d[i + 1] = 128 + dy * 127;
      d[i + 2] = 128;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

/* ---- 2. Press response ------------------------------------------------------ */

function pressResponse() {
  document.addEventListener("pointerdown", e => {
    const g = e.target instanceof Element ? e.target.closest(".gi") : null;
    if (!g || e.button > 0) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty("--px", `${e.clientX - r.left}px`);
    g.style.setProperty("--py", `${e.clientY - r.top}px`);
    g.classList.add("is-pressed");
    const release = () => {
      g.classList.remove("is-pressed");
      removeEventListener("pointerup", release);
      removeEventListener("pointercancel", release);
    };
    addEventListener("pointerup", release);
    addEventListener("pointercancel", release);
  }, { passive: true });
}

/* ---- 3. Pointer light on content cards -------------------------------------- */

const CARDS = ".table-wrap, .acc, .record, .season-card";
const TILT = ".record, .season-card, .portrait";

function pointerLight() {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let queued = false, x = 0, y = 0, card = null, tilt = null, tilted = null;

  const level = (node) => {
    node?.style.removeProperty("--tx");
    node?.style.removeProperty("--ty");
  };

  document.addEventListener("pointermove", e => {
    const t = e.target instanceof Element ? e.target : null;
    card = t?.closest(CARDS) || null;
    tilt = t?.closest(TILT) || null;
    x = e.clientX; y = e.clientY;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      /* Reads, then writes. */
      const cr = card?.getBoundingClientRect();
      const tr = tilt && !still.matches ? tilt.getBoundingClientRect() : null;
      if (cr) {
        card.style.setProperty("--mx", `${x - cr.left}px`);
        card.style.setProperty("--my", `${y - cr.top}px`);
      }
      if (tilted && tilted !== tilt) level(tilted);
      if (tr) {
        tilt.style.setProperty("--tx", (((x - tr.left) / tr.width) * 2 - 1).toFixed(3));
        tilt.style.setProperty("--ty", (((y - tr.top) / tr.height) * 2 - 1).toFixed(3));
      }
      tilted = tr ? tilt : null;
    });
  }, { passive: true });

  document.addEventListener("pointerleave", () => { level(tilted); tilted = null; });
}

/* ---- 4. Reduce transparency ---------------------------------------------------- */

function transparencySwitch() {
  const host = document.querySelector(".site-footer .shell");
  const system = matchMedia("(prefers-reduced-transparency: reduce)");

  const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const reduced = () => root.dataset.transparency === "reduced";
  let button = null;

  const apply = (on) => {
    if (on) root.dataset.transparency = "reduced";
    else delete root.dataset.transparency;
    button?.setAttribute("aria-pressed", String(on));
    if (!on && refractionSupported()) refraction();
  };

  /* Follow the system setting live, unless the visitor chose here. */
  system.addEventListener?.("change", () => { if (!stored()) apply(system.matches); });

  if (!host) return;
  button = el("button", { class: "pref-toggle", type: "button", "aria-pressed": String(reduced()) },
    el("span", { class: "switch", "aria-hidden": "true" }),
    "Reduce transparency"
  );
  button.addEventListener("click", () => {
    const next = !reduced();
    try { localStorage.setItem(KEY, next ? "reduced" : "full"); } catch { /* private mode: session only */ }
    apply(next);
  });
  host.append(button);
}
