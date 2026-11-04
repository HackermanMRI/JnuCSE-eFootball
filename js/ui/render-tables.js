/* =========================================================================
   RENDER: TABLES AND MATCHES
   =========================================================================
   These read the finished model. They never calculate a point, a rank or
   a goal difference.
   ========================================================================= */

import { el, nameOf, avatar, signed, formRow, emptyState, pad } from "./dom.js";
import { matchFeed } from "../core/standings.js";
import { matchesQuery } from "../core/search.js";
import { searchBar, noMatches } from "./search.js";
import { revealRows, forgetRows } from "./motion.js";

/* ---- Standings ---------------------------------------------------------- */

/* `slim: true` columns survive on a phone. The rest are hidden there so
   Points and Form stay on screen without sideways scrolling. */
const COLS = [
  { k: "p",   label: "P",  title: "Played",          slim: true },
  { k: "w",   label: "W",  title: "Won" },
  { k: "d",   label: "D",  title: "Drawn" },
  { k: "l",   label: "L",  title: "Lost" },
  { k: "gf",  label: "GF", title: "Goals scored" },
  { k: "ga",  label: "GA", title: "Goals conceded" },
  { k: "gd",  label: "GD", title: "Goal difference", slim: true }
];

/**
 * @param {object} model
 * @param {object} season
 * @param {"premium"|"second"} tier
 */
export function renderStandings(model, season, tier) {
  const rows = season.tables[tier];
  const roster = season.rosters[tier];

  if (!roster.length) {
    return emptyState(
      "No players in this tier yet",
      `Add player ids to the <code>${tier}</code> list in ` +
      `<code>data/seasons/season-${pad(season.number)}/season.js</code>.`,
      "users"
    );
  }

  const zones = zoneMap(season, tier);

  const head = el("tr", {},
    el("th", { scope: "col" }, "#"),
    el("th", { scope: "col" }, "Player"),
    COLS.map(c => el("th", { scope: "col", title: c.title, "data-slim": c.slim ? "1" : "0" }, c.label)),
    el("th", { scope: "col", class: "pts-col", title: "Points" }, "Pts"),
    el("th", { scope: "col", class: "form-col", title: "Last five results, oldest first" }, "Form")
  );

  const body = rows.map((r, i) => el("tr", {
    style: { "--i": i },
    "data-zone": zones.get(r.id) || null
  },
    el("td", { class: "c-rank num" }, String(r.rank)),
    el("td", { class: "c-player" },
      el("div", { class: "player-cell" },
        el("a", { class: "player-link", href: `players.html#player-${r.id}`, title: "Open career card" },
          avatar(model, r.id),
          el("span", { class: "name" }, nameOf(model, r.id))
        )
      )
    ),
    COLS.map(c => el("td", {
      "data-slim": c.slim ? "1" : "0",
      class: "num" + (c.k === "gd" ? ` c-gd ${r.gd > 0 ? "pos" : r.gd < 0 ? "neg" : ""}` : "")
    }, c.k === "gd" ? signed(r.gd) : String(r[c.k]))),
    el("td", { class: "c-pts num" }, String(r.pts)),
    el("td", {}, formRow(r.form.slice(-model.config.formLength), i))
  ));

  return el("div", { class: "table-wrap" },
    el("div", { class: "table-scroll" },
      el("table", { class: "standings" },
        el("thead", {}, head),
        el("tbody", {}, body)
      )
    ),
    tableKey(season, tier)
  );
}

/** Which rows are champion / promotion / relegation places this season. */
function zoneMap(season, tier) {
  const map = new Map();
  const rows = season.tables[tier];
  const { up, down } = season.plan;

  if (tier === "premium") {
    if (rows.length) map.set(rows[0].id, "champion");
    if (down > 0) for (const r of rows.slice(-down)) map.set(r.id, "relegation");
  } else if (up > 0) {
    for (const r of rows.slice(0, up)) map.set(r.id, "promotion");
  }
  return map;
}

function tableKey(season, tier) {
  const { up, down } = season.plan;
  const items = [];

  if (tier === "premium") {
    items.push(["var(--premium)", "League champion"]);
    if (down > 0) items.push(["var(--loss)", `Relegated to Second Tier (${down})`]);
  } else if (up > 0) {
    items.push(["var(--second)", `Promoted to Premium Tier (${up})`]);
  }
  if (!items.length) return null;

  return el("div", { class: "table-key" },
    items.map(([c, label]) =>
      el("span", {}, el("i", { style: { background: c } }), label)
    ),
    el("span", {}, "Ranked by points, then goal difference, wins, draws, goals scored")
  );
}

/* ---- Matches ------------------------------------------------------------ */

/**
 * Upcoming / Recent list: a search box above an infinite-scroll feed.
 *
 * Scrolling: `batch` matches are drawn first and the rest follow as the
 * visitor nears the bottom, up to the last upcoming match (or back to the
 * very first match of the season, for Recent). `batch` comes from
 * recentMatchesCount / upcomingMatchesCount in config.js.
 *
 * Search: matches where either player's name fits the query. Reset (or an
 * empty box) brings back the full default feed.
 */
export function renderMatches(model, season, tier, kind, batch) {
  const all = matchFeed(season.split[tier], kind);

  if (!all.length) {
    return kind === "recent"
      ? emptyState("No results yet",
          "Matches appear here as soon as you enter a score. " +
          "See <code>docs/02-ENTER-MATCH-RESULTS.md</code>.", "calendar")
      : emptyState("No matches left",
          "Every fixture in this tier has a result. The season is ready to close.", "check");
  }

  const size = Math.max(1, Number.isInteger(batch) ? batch : 10);
  const results = el("div", { class: "feed-results" });
  let view = null;

  function show(rawQuery) {
    view?.destroy();
    const query = rawQuery.trim();
    const feed = query
      ? all.filter(fx => matchesQuery([nameOf(model, fx.a), nameOf(model, fx.b)], query))
      : all;

    if (!feed.length) {
      view = null;
      results.replaceChildren(noMatches(query, kind === "recent" ? "results" : "fixtures"));
      return;
    }
    view = feedView(model, feed, kind, size, query);
    results.replaceChildren(view.root);
  }

  /* Typing is coalesced: the list is rebuilt once the visitor pauses, not
     on every key. Reset (an empty box) is instant. */
  let pending = 0;
  const bar = searchBar({
    label: kind === "recent" ? "Search results by player name" : "Search fixtures by player name",
    onChange: q => {
      clearTimeout(pending);
      if (!q.trim()) show("");
      else pending = setTimeout(() => show(q), 120);
    }
  });

  show("");
  return el("div", { class: "feed-panel" }, bar.root, results);
}

function feedView(model, feed, kind, size, query) {
  const noun = kind === "recent" ? "results" : "fixtures";
  const endNote = query
    ? `End of the matches for “${query}”`
    : kind === "recent" ? "That was the first match of the season." : "That is the last match of the season.";
  const of = query ? ` for “${query}”` : "";

  const list = el("div", { class: "match-list" });
  const label = el("span", {});
  const more = el("button", { class: "feed-more", type: "button" }, label, chevronDown());
  const status = el("p", { class: "feed-status", role: "status" });
  const rows = [];
  let shown = 0;

  /* Draw the next batch in one DOM write. Each row then plays in when it is
     actually seen (motion.js), so a batch drawn below the fold still
     arrives with a stagger instead of having animated off screen. */
  function drawNext() {
    const next = feed.slice(shown, shown + size).map(fx => matchRow(model, fx));
    list.append(...next);
    rows.push(...next);
    revealRows(next);
    shown += next.length;

    const left = feed.length - shown;
    if (left > 0) {
      status.textContent = `Showing ${shown} of ${feed.length} ${noun}${of}`;
      label.textContent = `Load ${Math.min(size, left)} more`;
    } else {
      more.remove();
      observer?.disconnect();
      status.textContent = `${endNote} (${feed.length} ${noun} in total)`;
    }
  }

  /* The button is also the scroll trigger. Scrolling near it loads the next
     batch; keyboard users and browsers without IntersectionObserver press it. */
  more.addEventListener("click", drawNext);

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
        if (!entries.some(e => e.isIntersecting)) return;
        drawNext();
        /* Still in view after drawing (tall screen, short batch)? Observing
           again makes the browser re-report, so the next batch follows. */
        if (more.isConnected) { observer.unobserve(more); observer.observe(more); }
      }, { rootMargin: "0px 0px 480px 0px" })
    : null;

  const root = el("div", { class: "feed" }, list, more, status);
  drawNext();
  if (feed.length > shown) observer?.observe(more);
  return { root, destroy: () => { observer?.disconnect(); forgetRows(rows); } };
}

function chevronDown() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.4");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(ns, "polyline");
  p.setAttribute("points", "6 9 12 15 18 9");
  svg.append(p);
  return svg;
}

export function matchRow(model, fx) {
  const done = Number.isInteger(fx.ag) && Number.isInteger(fx.bg);
  const aWins = done && fx.ag > fx.bg;
  const bWins = done && fx.bg > fx.ag;

  const score = done
    ? el("div", { class: "score num" },
        String(fx.ag), el("span", { class: "dash" }, "–"), String(fx.bg))
    : el("div", { class: "score score--pending" }, "vs");

  return el("div", { class: "match" },
    el("div", { class: "meta" },
      el("b", {}, `Round ${fx.r}`),
      el("span", {}, `Leg ${fx.leg}`)
    ),
    el("div", { class: "side" + (aWins ? " winner" : "") },
      avatar(model, fx.a),
      el("span", { class: "name" }, nameOf(model, fx.a))
    ),
    score,
    el("div", { class: "side right" + (bWins ? " winner" : "") },
      avatar(model, fx.b),
      el("span", { class: "name" }, nameOf(model, fx.b))
    )
  );
}
