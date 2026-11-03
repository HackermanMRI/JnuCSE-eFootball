/* =========================================================================
   RENDER: TABLES AND MATCHES
   =========================================================================
   These read the finished model. They never calculate a point, a rank or
   a goal difference.
   ========================================================================= */

import { el, nameOf, avatar, signed, formRow, emptyState, pad } from "./dom.js";
import { matchFeed } from "../core/standings.js";

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
      `<code>data/seasons/season-${pad(season.number)}/season.js</code>.`
    );
  }

  const zones = zoneMap(season, tier);

  const head = el("tr", {},
    el("th", { scope: "col" }, "#"),
    el("th", { scope: "col" }, "Player"),
    COLS.map(c => el("th", { scope: "col", title: c.title, "data-slim": c.slim ? "1" : "0" }, c.label)),
    el("th", { scope: "col", class: "pts-col", title: "Points" }, "Pts"),
    el("th", { scope: "col", title: "Last five results, oldest first" }, "Form")
  );

  const body = rows.map((r, i) => el("tr", {
    style: { "--i": i },
    "data-zone": zones.get(r.id) || null
  },
    el("td", { class: "c-rank num" }, String(r.rank)),
    el("td", { class: "c-player" },
      el("div", { class: "player-cell" }, avatar(model, r.id), el("span", { class: "name" }, nameOf(model, r.id)))
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
 * Match list with infinite scroll. `batch` matches are drawn first; the rest
 * are drawn in further batches as the visitor nears the bottom, until the
 * last upcoming match (or the very first match of the season, for Recent).
 * `batch` comes from recentMatchesCount / upcomingMatchesCount in config.js.
 */
export function renderMatches(model, season, tier, kind, batch) {
  const feed = matchFeed(season.split[tier], kind);

  if (!feed.length) {
    return kind === "recent"
      ? emptyState("No results yet",
          "Matches appear here as soon as you enter a score. " +
          "See <code>docs/02-ENTER-MATCH-RESULTS.md</code>.")
      : emptyState("No matches left",
          "Every fixture in this tier has a result. The season is ready to close.");
  }

  const size = Math.max(1, Number.isInteger(batch) ? batch : 10);
  const noun = kind === "recent" ? "results" : "fixtures";
  const endNote = kind === "recent"
    ? "That was the first match of the season."
    : "That is the last match of the season.";

  const list = el("div", { class: "match-list" });
  const more = el("button", { class: "feed-more", type: "button" });
  const status = el("p", { class: "feed-status", role: "status" });
  let shown = 0;

  /* Draw the next batch. Row delays restart at 0 each time so a late batch
     does not wait behind a long stagger. */
  function drawNext() {
    const next = feed.slice(shown, shown + size);
    list.append(...next.map((fx, i) => matchRow(model, fx, i)));
    shown += next.length;

    const left = feed.length - shown;
    status.textContent = left > 0 ? `Showing ${shown} of ${feed.length} ${noun}` : "";
    if (left > 0) {
      more.textContent = `Load ${Math.min(size, left)} more`;
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
  return root;
}

export function matchRow(model, fx, i = 0) {
  const done = Number.isInteger(fx.ag) && Number.isInteger(fx.bg);
  const aWins = done && fx.ag > fx.bg;
  const bWins = done && fx.bg > fx.ag;

  const score = done
    ? el("div", { class: "score num" },
        String(fx.ag), el("span", { class: "dash" }, "–"), String(fx.bg))
    : el("div", { class: "score score--pending" }, "vs");

  return el("div", { class: "match", style: { "--i": i } },
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
