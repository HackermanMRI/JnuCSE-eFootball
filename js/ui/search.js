/* =========================================================================
   SEARCH BAR
   =========================================================================
   One search box used by Upcoming, Recent and the Players page. It owns the
   text field and the Reset button; the caller decides what to filter.

   onChange(query) runs on every keystroke and on Reset (with "").
   Reset clears the field, hands focus back to it, and so restores whatever
   default list the caller shows for an empty query. Escape does the same.
   ========================================================================= */

import { el } from "./dom.js";

let uid = 0;

function magnifier() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  for (const [k, v] of Object.entries({
    viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor",
    "stroke-width": "2.2", "stroke-linecap": "round", "stroke-linejoin": "round",
    "aria-hidden": "true", class: "search-icon"
  })) svg.setAttribute(k, v);
  const c = document.createElementNS(ns, "circle");
  c.setAttribute("cx", "11"); c.setAttribute("cy", "11"); c.setAttribute("r", "7");
  const l = document.createElementNS(ns, "path");
  l.setAttribute("d", "m20 20-3.5-3.5");
  svg.append(c, l);
  return svg;
}

export function searchBar({ label, placeholder = "Search players by name", onChange }) {
  const id = `search-${++uid}`;

  const input = el("input", {
    class: "search-input", id, name: "q", type: "search",
    placeholder, autocomplete: "off", autocapitalize: "off", spellcheck: "false",
    enterkeyhint: "search", maxlength: "60"
  });
  const reset = el("button", { class: "search-reset", type: "button", hidden: "" }, "Reset");

  const root = el("form", { class: "search", role: "search" },
    el("label", { class: "visually-hidden", for: id }, label),
    magnifier(), input, reset
  );

  const sync = () => {
    reset.hidden = input.value === "";
    onChange(input.value);
  };
  const clear = () => { input.value = ""; sync(); };

  input.addEventListener("input", sync);
  input.addEventListener("keydown", e => { if (e.key === "Escape" && input.value) { e.preventDefault(); clear(); } });
  reset.addEventListener("click", () => { clear(); input.focus(); });
  /* The phone keyboard's Search key submits the form: close the keyboard, never reload. */
  root.addEventListener("submit", e => { e.preventDefault(); input.blur(); });

  return { root, input, clear };
}

/** "No matches" panel. The query is added as text, never as markup. */
export function noMatches(query, what) {
  return el("div", { class: "empty" },
    el("h3", {}, `No ${what} match “${query.trim()}”`),
    el("p", {}, "Check the spelling or try just a first name. Tap Reset to see everything again.")
  );
}
