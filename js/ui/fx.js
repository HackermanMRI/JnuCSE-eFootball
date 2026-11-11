/* =========================================================================
   FX  —  text animation and the page-head motion graphic
   =========================================================================
   Decoration only. Everything here is skipped when the visitor prefers
   reduced motion, and the page reads the same without it.

     splitTitle   the large title arrives letter by letter, then a glint
                  runs along it
     splitWords   the line under the title arrives word by word
     pitchArt     a football pitch draws itself in line art behind the
                  title, and a ball drifts across it
     navIcons     the current page's nav icon redraws itself on arrival

   The matching styles are in css/animations.css ("Text" and "Pitch").
   ========================================================================= */

import { el } from "./dom.js";
import { reducedMotion } from "./motion.js";

const NS = "http://www.w3.org/2000/svg";

export function initFx() {
  if (reducedMotion()) return;
  const head = document.querySelector(".page-head");
  if (head) {
    const h1 = head.querySelector("h1");
    const sub = head.querySelector(".sub");
    if (h1) splitTitle(h1);
    if (sub) splitWords(sub);
    head.prepend(pitchArt());
  }
  navIcons();
}

/* ---- Text ----------------------------------------------------------------
   Letters become inline blocks so each can move on its own. Words stay
   whole (they never break in the middle), and screen readers get the
   original text from aria-label instead of thirty separate letters. */

function splitTitle(h1) {
  const text = h1.textContent.trim();
  if (!text) return;
  let c = 0;
  const words = text.split(/\s+/).map(word =>
    el("span", { class: "split-word" },
      [...word].map(ch => el("span", { class: "split-char", style: { "--c": c++ } }, ch))
    )
  );
  h1.setAttribute("aria-label", text);
  h1.replaceChildren(el("span", { class: "split", "aria-hidden": "true" },
    words.flatMap((w, i) => (i ? [" ", w] : [w]))
  ));
}

function splitWords(node) {
  const text = node.textContent.trim();
  if (!text) return;
  const words = text.split(/\s+/);
  node.replaceChildren(...words.flatMap((word, i) => {
    const span = el("span", { class: "split-word split-in", style: { "--w": i } }, word);
    return i ? [" ", span] : [span];
  }));
}

/* ---- Pitch ---------------------------------------------------------------
   Every line has pathLength 1, so one CSS rule can "draw" all of them by
   animating stroke-dashoffset from 1 to 0. */

function shape(tag, attrs, order) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (order !== undefined) {
    node.setAttribute("pathLength", "1");
    node.setAttribute("class", "pitch-line");
    node.style.setProperty("--o", order);
  }
  return node;
}

function pitchArt() {
  const svg = shape("svg", { viewBox: "0 0 360 220", class: "pitch-art", "aria-hidden": "true", focusable: "false" });
  svg.append(
    shape("rect", { x: 10, y: 10, width: 340, height: 200, rx: 8 }, 0),
    shape("path", { d: "M180 10V210" }, 1),
    shape("circle", { cx: 180, cy: 110, r: 38 }, 2),
    shape("rect", { x: 270, y: 50, width: 80, height: 120 }, 3),
    shape("rect", { x: 10, y: 50, width: 80, height: 120 }, 3),
    shape("rect", { x: 318, y: 82, width: 32, height: 56 }, 4),
    shape("rect", { x: 10, y: 82, width: 32, height: 56 }, 4),
    shape("path", { d: "M270 88A30 30 0 0 0 270 132" }, 5),
    shape("path", { d: "M90 88A30 30 0 0 1 90 132" }, 5),
    shape("circle", { cx: 180, cy: 110, r: 2.6, class: "pitch-spot" }),
    shape("circle", { r: 4.5, class: "pitch-ball" })
  );
  return svg;
}

/* ---- Nav icons ----------------------------------------------------------- */

function navIcons() {
  const current = document.querySelector(".main-nav a[aria-current='page'] .nav-ico");
  if (!current) return;
  [...current.children].forEach((node, i) => {
    node.setAttribute("pathLength", "1");
    node.style.setProperty("--o", i);
  });
  current.classList.add("is-drawn");
}
