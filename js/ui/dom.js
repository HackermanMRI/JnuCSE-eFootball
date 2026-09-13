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

export function emptyState(title, detail) {
  return el("div", { class: "empty" },
    el("h3", {}, title),
    el("p", { html: detail })
  );
}
