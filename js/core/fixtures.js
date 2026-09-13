/* =========================================================================
   FIXTURES  —  DO NOT EDIT
   =========================================================================
   Double round-robin via the circle method.
   Every player meets every other player exactly twice: leg 1 and leg 2.

   n players  ->  n-1 rounds per leg  ->  n(n-1) matches total
   Odd n      ->  one player rests each round (rotating bye)
   ========================================================================= */

function legFixtures(ids, leg, roundOffset, swapSides) {
  const list = ids.slice();
  if (list.length % 2 === 1) list.push(null);   // ghost = the bye

  const n = list.length;
  const rounds = n - 1;
  const half = n / 2;
  const out = [];

  let arr = list.slice();
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const x = arr[i];
      const y = arr[n - 1 - i];
      if (x === null || y === null) continue;   // that player rests
      const a = swapSides ? y : x;
      const b = swapSides ? x : y;
      out.push({ r: roundOffset + r + 1, leg, a, b, ag: null, bg: null });
    }
    /* Rotate everyone except the first slot. */
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  return out;
}

/**
 * Full season fixture list for one tier.
 * @param {string[]} ids  roster
 * @returns {object[]}    fixtures with ag/bg left as null
 */
export function generateFixtures(ids) {
  if (!Array.isArray(ids) || ids.length < 2) return [];
  const perLeg = (ids.length % 2 === 0 ? ids.length : ids.length + 1) - 1;
  return [
    ...legFixtures(ids, 1, 0, false),
    ...legFixtures(ids, 2, perLeg, true)
  ];
}

/** Expected match count for a roster, used by the validator. */
export function expectedMatchCount(n) {
  return n < 2 ? 0 : n * (n - 1);
}

/** Every unordered pair, as "x|y" keys — used to detect missing/duplicate ties. */
export function pairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
