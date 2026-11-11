/* =========================================================================
   RENDER: PLAYERS PAGE
   =========================================================================
   Every player who has ever been on a roster, A to Z, as a card that opens
   to their career. All numbers come from model.careers (js/core/careers.js);
   nothing is calculated here.
   ========================================================================= */

import { el, nameOf, avatar, initials, emptyState, starIcon } from "./dom.js";
import { accordion, revealNow } from "./interactions.js";
import { searchBar, noMatches } from "./search.js";
import { matchesQuery } from "../core/search.js";
import { countUp, flip, scrollToY, headerBottom } from "./motion.js";
import { small, guard, blurUp } from "./images.js";

const TIER_LABEL = { premium: "Premium", second: "Second Tier" };
const TROPHY_LABEL = { premium: "Premium champion", second: "Second Tier winner" };

export function renderPlayersPage(model) {
  const careers = model.careers;
  if (!careers.length) {
    return emptyState("No players yet",
      "Players appear here once they are on a season roster. See <code>docs/00-FIRST-TIME-SETUP.md</code>.",
      "users");
  }

  const items = careers.map(c => {
    const card = careerCard(model, c);
    return {
      id: c.id,
      name: nameOf(model, c.id),
      card,
      node: el("div", { class: "reveal", id: `player-${c.id}` }, card)
    };
  });

  const list = el("div", { class: "news-list players-grid" }, items.map(i => i.node));
  const note = el("p", { class: "feed-status", role: "status" });
  const none = el("div", { hidden: "" });

  /* Cards are hidden, not rebuilt, so an open card stays open while typing.
     The cards that remain glide into their new places (FLIP) rather than
     jumping, and cards coming back fade in. */
  const bar = searchBar({
    label: "Search players by name",
    onChange: query => {
      let shown = 0;
      flip(items.map(i => i.node), () => {
        for (const item of items) {
          const hit = matchesQuery(item.name, query);
          item.node.hidden = !hit;
          if (hit) shown++;
        }
        const searching = query.trim() !== "";
        note.textContent = searching && shown ? `${shown} of ${items.length} players` : "";
        none.hidden = shown > 0;
        if (!shown) none.replaceChildren(noMatches(query, "players"));
      });
    }
  });

  const root = el("div", {}, bar.root, note, none, list);

  /* players.html#player-sun opens and scrolls to that card (the points
     tables link here). Called by app.js once the page is mounted. */
  root.openFromHash = () => {
    const m = location.hash.match(/^#player-([\w-]+)$/);
    const item = m && items.find(i => i.id === m[1]);
    if (!item) return;
    revealNow(item.node);
    item.card.openCard({ reveal: false });
    requestAnimationFrame(() => {
      /* Layout position, not getBoundingClientRect: the card may still be
         mid-reveal, and its transform would throw the target off. */
      let top = 0;
      for (let n = item.node; n; n = n.offsetParent) top += n.offsetTop;
      scrollToY(top - headerBottom() - 16);
      item.card.classList.remove("is-target");
      void item.card.offsetWidth;            /* restart the pulse */
      item.card.classList.add("is-target");
    });
  };
  addEventListener("hashchange", root.openFromHash);

  return root;
}

/* ---- One player ---------------------------------------------------------- */

function careerCard(model, c) {
  const name = nameOf(model, c.id);

  const sub = c.played
    ? `${c.played} played · ${pct(c.winPct)} wins`
    : "No matches played yet";

  const head = el("div", { class: "player-head grow" },
    avatar(model, c.id),
    el("div", { class: "grow" },
      el("div", { class: "acc-title" }, name),
      el("div", { class: "acc-sub" }, sub)
    ),
    headStars(c.trophies)
  );

  /* Built on first open (see accordion in interactions.js). */
  const body = () => el("div", { class: "career-wrap" }, el("div", { class: "career" },
    portrait(model, c.id, name),
    el("div", { class: "career-main", style: { "--k": 1 } },
      el("div", { class: "player-stats" },
        stat(c.played, "Played"),
        stat(c.won, "Won"),
        stat(c.drawn, "Drawn"),
        stat(c.lost, "Lost"),
        stat(c.played ? pct(c.winPct) : "—", "Win rate", true)
      ),
      splitBar(c),
      el("div", { class: "player-meta" },
        line("Biggest win", scoreRecord(model, c.biggestWin, "No wins yet")),
        line("Biggest loss", scoreRecord(model, c.biggestLoss, "No losses yet")),
        line("Most goals in a season", c.mostGoalsInSeason
          ? record(`${c.mostGoalsInSeason.goals} ${c.mostGoalsInSeason.goals === 1 ? "goal" : "goals"}`,
                   seasonsText(c.mostGoalsInSeason.seasons))
          : dash("Not played yet")),
        line("Best win streak", c.bestWinStreak
          ? record(`${c.bestWinStreak.length} in a row`, streakText(c.bestWinStreak))
          : dash(c.played ? "No wins yet" : "Not played yet")),
        line("Trophies", trophies(c.trophies))
      )
    )
  ));

  /* The numbers count up the first time the card opens. */
  return accordion({
    head, body,
    onFirstOpen: card => card.querySelectorAll(".stat-box .v").forEach(v => countUp(v))
  });
}

/* ---- Pieces -------------------------------------------------------------- */

/** The large photo. Space is reserved by CSS so the card does not jump when it loads. */
function portrait(model, id, name) {
  const p = model.playerById.get(id);
  const frame = el("div", { class: "portrait" });
  const fallback = () => frame.replaceChildren(
    el("div", { class: "portrait-fallback", role: "img", "aria-label": `${name} (no photo yet)` }, initials(name)));

  if (!p?.photo) { fallback(); return frame; }

  const pic = small(p.photo, 640);
  const img = el("img", { src: pic.src, alt: name, decoding: "async" });
  guard(img, p.photo, fallback);
  frame.append(img);
  blurUp(frame, img, pic.ph);
  return frame;
}

/** Won, drawn and lost as shares of one bar. Decorative: the numbers are
    in the boxes above, so screen readers skip it. */
function splitBar(c) {
  if (!c.played) return null;
  const part = (cls, n) => n ? el("i", { class: cls, style: { flexGrow: n } }) : null;
  return el("div", { class: "split-bar", "aria-hidden": "true" },
    part("w", c.won), part("d", c.drawn), part("l", c.lost));
}

function stat(value, label, accent = false) {
  return el("div", { class: "stat-box" + (accent ? " accent" : "") },
    el("span", { class: "v" }, String(value)),
    el("span", { class: "k" }, label)
  );
}

function line(key, value) {
  return el("div", { class: "meta-line" },
    el("span", { class: "k" }, key),
    el("span", { class: "v", style: { flex: "1", minWidth: "0" } }, value)
  );
}

const dash = text => el("span", { style: { color: "var(--faint)" } }, text);

function record(main, detail) {
  return el("span", { class: "rec" },
    el("b", {}, main),
    detail && el("small", {}, detail)
  );
}

function scoreRecord(model, r, empty) {
  if (!r) return dash(empty);
  return record(
    `${r.for} – ${r.against} vs ${nameOf(model, r.opponent)}`,
    `Season ${r.season}${r.live ? " (in progress)" : ""} · ${TIER_LABEL[r.tier]} · Round ${r.round}, Leg ${r.leg}`
  );
}

/** "Season 1", "Seasons 1 and 3", "Seasons 1, 2 and 4"; flags one still in progress. */
function seasonsText(list) {
  const names = list.map(x => String(x.season));
  const joined = names.length === 1 ? names[0]
    : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  const live = list.some(x => x.live) ? " (in progress)" : "";
  return `Season${names.length > 1 ? "s" : ""} ${joined}${live}`;
}

/** "Season 1", "Seasons 1 – 2" for a run that crossed seasons, plus its status. */
function streakText(r) {
  const span = r.from === r.to ? `Season ${r.from}` : `Seasons ${r.from} – ${r.to}`;
  return span + (r.live ? " (in progress)" : "") + (r.active ? " · still running" : "");
}

const pct = n => `${Math.round(n * 10) / 10}%`;

/* ---- Trophies ------------------------------------------------------------ */

/** Compact stars in the collapsed card: one per trophy. */
function headStars(list) {
  if (!list.length) return null;
  const MAX = 5;
  return el("span", {
    class: "head-stars", role: "img",
    "aria-label": `${list.length} ${list.length === 1 ? "trophy" : "trophies"}`
  },
    list.slice(0, MAX).map((t, i) => {
      const s = starIcon(t.tier);
      s.style.setProperty("--s", i);
      return s;
    }),
    list.length > MAX && el("span", { class: "more" }, `+${list.length - MAX}`)
  );
}

/** Full list in the opened card: a star and a label for every trophy. */
function trophies(list) {
  if (!list.length) return dash("No trophies yet");
  return el("ul", { class: "trophies" },
    list.map(t => el("li", { class: `trophy-chip trophy-chip--${t.tier}` },
      starIcon(t.tier),
      el("span", {}, el("b", {}, `Season ${t.season}`), TROPHY_LABEL[t.tier])
    ))
  );
}
