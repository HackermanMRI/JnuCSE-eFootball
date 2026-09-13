/* =========================================================================
   RENDER: PLAYERS, NEWS, HISTORY, RECORDS
   ========================================================================= */

import { el, nameOf, avatar, signed, formRow, richText, formatDate, emptyState, pad } from "./dom.js";
import { accordion } from "./interactions.js";
import { playerSeasonProfile, playerHistory } from "../core/stats.js";
import { matchRow } from "./render-tables.js";

/* ---- Player list -------------------------------------------------------- */

export function renderPlayers(model, season, tier) {
  const roster = season.rosters[tier];
  if (!roster.length) {
    return emptyState(
      "No players in this tier yet",
      `Add player ids to the <code>${tier}</code> list in ` +
      `<code>data/seasons/season-${pad(season.number)}/season.js</code>.`
    );
  }

  const ordered = season.tables[tier].map(r => r.id);

  return el("div", { class: "news-list" },
    ordered.map(id => el("div", { class: "reveal" }, playerCard(model, season, tier, id)))
  );
}

function playerCard(model, season, tier, id) {
  const prof = playerSeasonProfile(model, season.number, id);
  const career = playerHistory(model, id);
  const row = prof.row;

  const head = el("div", { class: "acc-head-content grow", style: { display: "flex", alignItems: "center", gap: "var(--s-4)" } },
    avatar(model, id),
    el("div", { class: "grow" },
      el("div", { class: "acc-title" }, nameOf(model, id)),
      el("div", { class: "acc-sub" },
        `Rank ${row.rank} · ${row.pts} ${row.pts === 1 ? "point" : "points"} · ${row.p} played`)
    ),
    formRow(prof.form)
  );

  const body = el("div", {},
    el("div", { class: "player-stats" },
      stat(row.p, "Played"),
      stat(row.w, "Won"),
      stat(row.d, "Drawn"),
      stat(row.l, "Lost"),
      stat(row.gf, "Scored"),
      stat(row.ga, "Conceded"),
      stat(signed(row.gd), "Goal diff."),
      stat(row.pts, "Points", true)
    ),
    el("div", { class: "player-meta" },
      metaLine("Form", formRow(prof.form)),
      metaLine("Last match", prof.lastMatch
        ? matchRow(model, prof.lastMatch)
        : el("span", { style: { color: "var(--faint)" } }, "Not played yet")),
      metaLine("Next match", prof.nextMatch
        ? matchRow(model, prof.nextMatch)
        : el("span", { style: { color: "var(--faint)" } }, "Season complete")),
      honoursLine(career)
    )
  );

  return accordion({ head, body, tier });
}

function stat(value, label, accent = false) {
  return el("div", { class: "stat-box" + (accent ? " accent" : "") },
    el("span", { class: "v" }, String(value)),
    el("span", { class: "k" }, label)
  );
}

function metaLine(key, value) {
  return el("div", { class: "meta-line" },
    el("span", { class: "k" }, key),
    el("span", { class: "v", style: { flex: "1", minWidth: "0" } }, value)
  );
}

function honoursLine(career) {
  const badges = [];
  for (const s of career.titles) badges.push(el("span", { class: "honour title" }, `S${s} champion`));
  for (const s of career.promotions) badges.push(el("span", { class: "honour up" }, `S${s} promoted`));
  for (const s of career.relegations) badges.push(el("span", { class: "honour down" }, `S${s} relegated`));

  /* A player can have played completed seasons without winning or moving
     tier, so this says "none yet" rather than "no seasons yet". */
  return metaLine("Honours", badges.length
    ? el("span", {}, badges)
    : el("span", { style: { color: "var(--faint)" } }, "None yet"));
}

/* ---- News --------------------------------------------------------------- */

export function renderNews(model) {
  if (!model.news.length) {
    return emptyState(
      "No news yet",
      "Posts appear here as soon as you add them. " +
      "See <code>docs/03-POST-NEWS.md</code> for the format."
    );
  }

  return el("div", { class: "news-list" },
    model.news.map(item => el("article", { class: "reveal" }, newsCard(item)))
  );
}

function newsCard(item) {
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
    const img = el("img", {
      class: "news-banner", src: item.banner, alt: "", loading: "lazy"
    });
    img.addEventListener("error", () => img.remove());
    card.prepend(img);
  }
  return card;
}

/* ---- Tier history ------------------------------------------------------- */

export function renderHistory(model) {
  if (!model.history.length) {
    return emptyState(
      "No seasons completed yet",
      "When a season is marked complete, its champion, the two players relegated " +
      "and the two promoted are recorded here permanently."
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
      "and clean defences all appear here after Season 1 closes."
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

  return el("div", {},
    el("div", { class: "record-grid reveal" }, cards),
    el("h3", {
      style: { margin: "var(--s-6) 0 var(--s-3)", fontSize: "var(--t-md)" }
    }, "Roll of honour"),
    el("div", { class: "table-wrap reveal" },
      el("div", { class: "roll" },
        model.records.champions.slice().reverse().map(c =>
          el("div", { class: "roll-row" },
            el("span", { class: "season-no" }, `Season ${c.season}`),
            el("span", { class: "trophy" }, "★"),
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
