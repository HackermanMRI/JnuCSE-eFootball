/* =========================================================================
   APP
   =========================================================================
   Builds the model once, then hands it to whichever page is open.
   Pages identify themselves with <body data-page="...">.
   ========================================================================= */

import { buildModel } from "./core/model.js";
import { el, mount, emptyState } from "./ui/dom.js";
import { tabs, revealIn } from "./ui/interactions.js";
import { renderStandings, renderMatches } from "./ui/render-tables.js";
import { renderPlayers, renderNews, renderHistory, renderHallOfFame } from "./ui/render-content.js";

const model = buildModel();
const page = document.body.dataset.page;

document.title = `${pageTitle(page)} · ${model.config.siteName}`;
chrome();
banners();

switch (page) {
  case "home":    home(); break;
  case "premium": tierPage("premium"); break;
  case "second":  tierPage("second"); break;
  case "history": historyPage(); break;
}

revealIn(document.body);

/* =========================================================================
   Shared chrome
   ========================================================================= */

function pageTitle(p) {
  return { home: "News", premium: "Premium Tier", second: "Second Tier", history: "Tier History" }[p] || "";
}

function chrome() {
  for (const node of document.querySelectorAll("[data-site-name]")) {
    node.textContent = model.config.siteName;
  }

  /* Logo: swap in the configured file, fall back to the inline mark. */
  const slot = document.getElementById("logo-slot");
  if (slot && model.config.logo) {
    const img = el("img", { src: model.config.logo, alt: "" });
    img.addEventListener("error", () => {}, { once: true });
    img.addEventListener("load", () => slot.replaceChildren(img));
  }

  const chip = document.getElementById("season-chip");
  if (chip) {
    if (!model.started) {
      chip.textContent = "Not started";
    } else {
      const s = model.current;
      chip.replaceChildren(
        document.createTextNode("Season "),
        el("b", {}, String(s.number)),
        document.createTextNode(s.completed ? " · complete" : "")
      );
    }
  }

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
}

function banners() {
  const host = document.getElementById("banners");
  if (!host) return;
  const { errors, notices } = model.report;
  const out = [];

  if (errors.length) {
    out.push(el("div", { class: "banner banner--error", role: "alert" },
      el("h3", {}, errors.length === 1 ? "There is a problem in the data" : `${errors.length} problems in the data`),
      el("ul", {}, errors.map(e => el("li", {}, e)))
    ));
  }
  if (notices.length) {
    out.push(el("div", { class: "banner banner--notice" },
      el("h3", {}, "Needs your attention"),
      el("ul", {}, notices.map(n => el("li", {}, n)))
    ));
  }
  mount(host, out);
}

/** Shown on every page until the first season is registered. */
function setupPanel() {
  const steps = [
    ["Add your players", "Open <code>data/players.js</code> and add one line per person. Their id is permanent."],
    ["Split them into tiers", "In <code>data/seasons/season-01/season.js</code>, put 8 ids in <code>premium</code> and everyone else in <code>second</code>."],
    ["Generate the fixtures", "Open <code>tools/fixture-generator.html</code>, paste each tier's ids, and copy the result into <code>premium.js</code> and <code>second-tier.js</code>."],
    ["Switch the season on", "Uncomment the three imports and the array line in <code>data/seasons/_index.js</code>."]
  ];

  return el("div", { class: "setup" },
    el("h2", { class: "display" }, "No season has started yet"),
    el("p", {}, "Four steps and the league is live."),
    el("ol", {},
      steps.map(([title, detail], i) =>
        el("li", { style: { "--i": i } },
          el("div", {},
            el("b", {}, title),
            el("span", { html: detail })
          )
        )
      )
    ),
    el("p", {
      style: { marginTop: "var(--s-5)", color: "var(--faint)", fontSize: "var(--t-sm)" },
      html: "Everything is documented in the <code>docs/</code> folder. Start with <code>00-FIRST-TIME-SETUP.md</code>."
    })
  );
}

/* =========================================================================
   Pages
   ========================================================================= */

function home() {
  const host = document.getElementById("content");
  if (!model.started && !model.news.length) {
    mount(host, setupPanel());
    return;
  }
  mount(host, renderNews(model));
  revealIn(host);
}

function tierPage(tier) {
  const host = document.getElementById("content");
  document.body.dataset.tier = tier;

  if (!model.started) {
    mount(host, setupPanel());
    return;
  }

  const season = model.current;
  const cfg = model.config;

  const items = [
    { id: "table",    label: "Points Table", build: () => renderStandings(model, season, tier) },
    { id: "upcoming", label: "Upcoming",     build: () => renderMatches(model, season, tier, "upcoming", cfg.upcomingMatchesCount) },
    { id: "recent",   label: "Recent",       build: () => renderMatches(model, season, tier, "recent", cfg.recentMatchesCount) }
  ];

  if (tier === "premium") {
    items.push({ id: "hall", label: "Hall of Fame", build: () => renderHallOfFame(model) });
  }
  items.push({ id: "players", label: "Players", build: () => renderPlayers(model, season, tier) });

  host.replaceChildren();
  tabs(host, items);
}

function historyPage() {
  const host = document.getElementById("content");
  if (!model.started) {
    mount(host, setupPanel());
    return;
  }
  mount(host, renderHistory(model));
  revealIn(host);
}
