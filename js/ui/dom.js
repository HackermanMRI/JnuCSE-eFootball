/* =========================================================================
   DOM HELPERS
   =========================================================================
   Small utilities shared by the renderers. No tournament logic lives here.
   ========================================================================= */

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "style" && typeof v === "object") {
      // Custom properties need setProperty; Object.assign silently drops them.
      for (const [prop, val] of Object.entries(v)) {
        if (val === null || val === undefined) continue;
        if (prop.startsWith("--")) node.style.setProperty(prop, String(val));
        else node.style[prop] = val;
      }
    }
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function mount(target, ...nodes) {
  const host = typeof target === "string" ? document.getElementById(target) : target;
  if (!host) return null;
  host.replaceChildren(...nodes.flat().filter(Boolean));
  return host;
}

export const escapeHtml = s => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---- Names and faces ---------------------------------------------------- */

export function nameOf(model, id) {
  return model.playerById.get(id)?.name || id;
}

export function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

/**
 * An avatar that degrades to initials when the photo is missing, so a
 * player with no image never shows a broken file.
 */
export function avatar(model, id, large = false) {
  const p = model.playerById.get(id);
  const name = p?.name || id;
  const cls = "avatar" + (large ? " avatar--lg" : "");

  if (!p?.photo) {
    return el("div", { class: cls + " avatar-fallback", "aria-hidden": "true" }, initials(name));
  }
  const img = el("img", { class: cls, src: p.photo, alt: "", loading: "lazy" });
  img.addEventListener("error", () => {
    img.replaceWith(el("div", { class: cls + " avatar-fallback", "aria-hidden": "true" }, initials(name)));
  });
  return img;
}

/* ---- Formatting --------------------------------------------------------- */

export const signed = n => (n > 0 ? `+${n}` : String(n));

/* Season 7 -> "07", season 12 -> "12". Keeps folder names in messages right. */
export const pad = n => String(n).padStart(2, "0");

export function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

/* Minimal formatting for news bodies: paragraphs and *emphasis*. */
export function richText(body) {
  return escapeHtml(body)
    .split(/\n\s*\n/)
    .map(p => `<p>${p.replace(/\*([^*\n]+)\*/g, "<em>$1</em>").replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/* ---- Reusable blocks ---------------------------------------------------- */

export function formRow(form, rowIndex = 0) {
  if (!form.length) return el("span", { class: "form-empty" }, "—");
  return el("span", { class: "form-row" },
    form.map((r, i) => el("span", {
      class: `form-pill ${r}`,
      style: { "--p": i, "--row": rowIndex },
      title: r === "W" ? "Win" : r === "D" ? "Draw" : "Loss"
    }, r))
  );
}

/* ---- Icons ------------------------------------------------------------- */

const NS = "http://www.w3.org/2000/svg";
const ICONS = {
  trophy:   ["M8 21h8", "M12 17v4", "M7 4h10v5a5 5 0 0 1-10 0Z", "M17 6h2.5a1.5 1.5 0 0 1 1.5 1.5c0 2.2-1.8 4-4 4", "M7 6H4.5A1.5 1.5 0 0 0 3 7.5c0 2.2 1.8 4 4 4"],
  calendar: ["M4.5 6.5h15v13h-15Z", "M4.5 10.5h15", "M8.5 4v4", "M15.5 4v4", "M8 14h2", "M12 14h2", "M8 17h2"],
  search:   ["M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "m20.5 20.5-5-5"],
  users:    ["M9 11.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z", "M3.25 19.5a5.75 5.75 0 0 1 11.5 0", "M15.25 5.2a3.25 3.25 0 0 1 0 6.1", "M17.5 14.2a5.75 5.75 0 0 1 3.25 5.3"],
  news:     ["M4 4.75h12.5a1 1 0 0 1 1 1V18a1.75 1.75 0 0 0 1.75 1.75H6.25A2.25 2.25 0 0 1 4 17.5Z", "M17.5 8.5h2.25a.75.75 0 0 1 .75.75V18a1.75 1.75 0 0 1-3 1.2", "M7.5 8.5h6M7.5 12h6M7.5 15.5h3.5"],
  check:    ["M5 12.5 10 17.5 19.5 7"]
};

/** A line icon from the set above. Decorative: hidden from screen readers. */
export function icon(name) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  for (const d of ICONS[name] || []) {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}

/** A filled trophy star, gold for Premium and teal for Second Tier. */
export function starIcon(tier = "premium") {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", `star star--${tier}`);
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", "M12 2.6l2.95 6.02 6.65.88-4.84 4.62 1.2 6.6L12 17.5l-5.96 3.22 1.2-6.6L2.4 9.5l6.65-.88L12 2.6z");
  svg.append(path);
  return svg;
}

export function emptyState(title, detail, iconName = null) {
  return el("div", { class: "empty" },
    iconName && el("span", { class: "empty-ico" }, icon(iconName)),
    el("h3", {}, title),
    el("p", { html: detail })
  );
}
