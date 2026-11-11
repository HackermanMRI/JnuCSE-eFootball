/* =========================================================================
   RENDER: NEWS, HISTORY, RECORDS
   ========================================================================= */

import { el, nameOf, avatar, signed, richText, formatDate, emptyState, starIcon } from "./dom.js";
import { accordion } from "./interactions.js";
import { countUp, whenVisible } from "./motion.js";
import { sources, guard, blurUp } from "./images.js";
import { matchFeed } from "../core/standings.js";

export function renderNews(model) {
  if (!model.news.length) {
    return emptyState(
      "No news yet",
      "Posts appear here as soon as you add them. " +
      "See <code>docs/03-POST-NEWS.md</code> for the format.",
      "news"
    );
  }

  return el("div", { class: "news-list" },
    model.news.map((item, i) => el("article", { class: "reveal" }, newsCard(item, i === 0)))
  );
}

function newsCard(item, first) {
  const head = el("div", { class: "grow", style: { display: "flex", alignItems: "center", gap: "var(--s-3)" } },
    el("div", { class: "grow" },
      el("div", { style: { display: "flex", alignItems: "center", gap: "var(--s-2)", marginBottom: "2px" } },
        item.pinned ? el("span", { class: "pin" }, "PINNED") : null,
        el("span", { class: "news-date" }, formatDate(item.date))
      ),
      el("h2", { class: "acc-title" }, item.title)
    )
  );

  const body = el("div", { class: "news-body", html: richText(item.body || "") });

  const card = accordion({ head, body, tier: "premium" });

  if (item.banner) {
    /* The first banner is the largest thing on the News page: load it at
       once. The rest wait until they are near the screen. Each one fades
       in from a soft blur instead of popping in. */
    const pic = sources(item.banner);
    const img = el("img", {
      class: "news-banner", alt: "", decoding: "async",
      loading: first ? "eager" : "lazy",
      fetchpriority: first ? "high" : null,
      /* Each screen downloads only the size it can show. */
      srcset: pic?.srcset,
      sizes: pic ? "(max-width: 760px) calc(100vw - 2rem), min(1132px, 100vw - 3rem)" : null,
      width: pic?.w, height: pic?.h
    });
    const media = el("div", { class: "news-media" }, img);
    /* The frame takes the picture's own shape, so nothing is cropped and
       the page does not jump when it arrives. */
    if (pic?.w) media.style.aspectRatio = `${pic.w} / ${pic.h}`;
    guard(img, item.banner, () => media.remove());
    blurUp(media, img, pic?.ph);
    img.src = pic?.src || item.banner;
    card.prepend(media);
  }
  return card;
}

/* ---- Results ticker ------------------------------------------------------- */

const TIER_NAME = { premium: "Premium", second: "Second Tier" };
const TIER_PAGE = { premium: "premium.html", second: "second-tier.html" };

/**
 * The latest results from both tiers, drifting past on the News page.
 * Built from the same played matches as the Recent tabs; nothing is
 * calculated here. Returns null when no match has been played yet.
 */
export function renderTicker(model, perTier = 6) {
  if (!model.started) return null;
  const season = model.current;
  const items = [];
  for (const tier of ["premium", "second"]) {
    for (const fx of matchFeed(season.split[tier], "recent").slice(0, perTier)) items.push({ tier, fx });
  }
  if (!items.length) return null;

  const tick = ({ tier, fx }, hidden) => {
    const aWon = fx.ag > fx.bg, bWon = fx.bg > fx.ag;
    return el("li", {},
      el("a", { class: "tick", href: `${TIER_PAGE[tier]}#recent`, "data-tier": tier, tabindex: hidden ? "-1" : null },
        el("span", { class: "where" }, `${TIER_NAME[tier]} · R${fx.r} L${fx.leg}`),
        el("span", { class: aWon ? "won" : null }, nameOf(model, fx.a)),
        el("span", { class: "sc" }, `${fx.ag} – ${fx.bg}`),
        el("span", { class: bWon ? "won" : null }, nameOf(model, fx.b))
      )
    );
  };

  /* The list appears twice so the loop has no seam; the copy is hidden
     from screen readers and from the keyboard. */
  const track = el("div", { class: "ticker-track", style: { "--ticker-dur": `${items.length * 6}s` } },
    el("ul", {}, items.map(i => tick(i, false))),
    el("ul", { "aria-hidden": "true" }, items.map(i => tick(i, true)))
  );

  const toggle = el("button", { class: "ticker-toggle", type: "button", "aria-pressed": "false", "aria-label": "Pause the results ticker" },
    glyph("i-pause", "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"),
    glyph("i-play", "M8 5v14l11-7z")
  );
  const root = el("section", { class: "ticker", "aria-label": "Latest results" },
    el("span", { class: "ticker-label" }, el("span", { class: "live-dot" }), "Latest"),
    el("div", { class: "ticker-view" }, track),
    toggle
  );
  toggle.addEventListener("click", () => {
    const paused = root.classList.toggle("is-paused");
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Resume the results ticker" : "Pause the results ticker");
  });
  return root;
}

function glyph(cls, d) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", cls);
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", d);
  svg.append(path);
  return svg;
}

/* ---- Tier history ------------------------------------------------------- */

export function renderHistory(model) {
  if (!model.history.length) {
    return emptyState(
      "No seasons completed yet",
      "When a season is marked complete, its champion, the two players relegated " +
      "and the two promoted are recorded here permanently.",
      "trophy"
    );
  }

  const newest = model.history.slice().reverse();

  return el("div", { class: "timeline" },
    newest.map(h => el("div", { class: "reveal" }, seasonCard(model, h)))
  );
}

function seasonCard(model, h) {
  return el("article", { class: "season-card", "data-tier": "premium" },
    el("header", { class: "season-card-head" },
      el("div", { class: "no display" }, `S${h.season}`),
      avatar(model, h.champion, true),
      el("div", { class: "champ" },
        el("div", { class: "k" }, "Premium Tier champion"),
        el("div", { class: "n" }, nameOf(model, h.champion))
      )
    ),
    el("div", { class: "movement" },
      movementCol("up", "Promoted to Premium Tier", h.promoted, model),
      movementCol("down", "Relegated to Second Tier", h.relegated, model)
    )
  );
}

function movementCol(dir, label, ids, model) {
  return el("div", { class: `movement-col ${dir}` },
    el("div", { class: "k" }, el("span", { "aria-hidden": "true" }, dir === "up" ? "▲" : "▼"), label),
    el("ul", {},
      ids.length
        ? ids.map(id => el("li", {}, avatar(model, id), nameOf(model, id)))
        : el("li", { style: { color: "var(--faint)" } }, "Nobody this season")
    )
  );
}

/* ---- Hall of fame ------------------------------------------------------- */

export function renderHallOfFame(model) {
  const r = model.records;

  if (!r.seasonsCompleted) {
    return emptyState(
      "The record books are empty",
      "Records are written when a season is completed. Champions, points, goals " +
      "and clean defences all appear here after Season 1 closes.",
      "trophy"
    );
  }

  const cards = [
    record("Most points in a season", r.mostPointsInSeason, x => x.pts, model),
    record("Most goals in a season", r.mostGoalsInSeason, x => x.gf, model),
    record("Fewest conceded in a season", r.fewestConcededInSeason, x => x.ga, model),
    record("Best goal difference", r.bestGDInSeason, x => signed(x.gd), model),
    record("Most wins in a season", r.mostWinsInSeason, x => x.w, model),
    titlesCard(r, model)
  ].filter(Boolean);

  /* The record numbers count up the first time the grid is seen. */
  const grid = el("div", { class: "record-grid reveal" }, cards);
  whenVisible(grid, () => grid.querySelectorAll(".record .v").forEach(v => countUp(v)));

  return el("div", {},
    grid,
    el("h3", { class: "section-title" }, "Roll of honour"),
    el("div", { class: "table-wrap reveal" },
      el("div", { class: "roll" },
        model.records.champions.slice().reverse().map(c =>
          el("div", { class: "roll-row" },
            el("span", { class: "season-no" }, `Season ${c.season}`),
            starIcon("premium"),
            avatar(model, c.id),
            el("span", { class: "name" }, nameOf(model, c.id))
          )
        )
      )
    )
  );
}

function record(label, holders, pick, model) {
  if (!holders.length) return null;
  const top = holders[0];
  const who = holders
    .map(h => `${nameOf(model, h.id)} (S${h.season})`)
    .join(", ");

  return el("div", { class: "record" },
    el("div", { class: "k" }, label),
    el("div", { class: "v" }, String(pick(top))),
    el("div", { class: "who" }, who)
  );
}

function titlesCard(r, model) {
  if (!r.mostTitles.length) return null;
  const who = r.mostTitles.map(t => nameOf(model, t.id)).join(", ");
  return el("div", { class: "record" },
    el("div", { class: "k" }, "Most tier wins"),
    el("div", { class: "v" }, String(r.mostTitles[0].count)),
    el("div", { class: "who" }, who)
  );
}
