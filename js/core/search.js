/* =========================================================================
   SEARCH  —  DO NOT EDIT
   =========================================================================
   Name matching for the search boxes. Case, accents and extra spaces are
   ignored, and every word typed must appear somewhere in the name(s), so
   "rim" finds "Sakif Mahdi Rimon" and "arnish robi" finds their match.
   Plain substring checks only: nothing the visitor types is ever treated
   as a pattern.
   ========================================================================= */

export function normalize(text) {
  return String(text ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** `names` is one name or a list of names (both players of a match). */
export function matchesQuery(names, query) {
  const words = normalize(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const hay = normalize(Array.isArray(names) ? names.join(" ") : names);
  return words.every(w => hay.includes(w));
}
