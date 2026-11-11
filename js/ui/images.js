/* =========================================================================
   IMAGES
   =========================================================================
   Picks the small copy of an image when one exists.

   tools/optimize-images.py makes small WebP copies of everything in
   assets/ and lists them in assets/_small/manifest.js. This module reads
   that list. An image that is not in the list (a new photo, before the
   script has been run) simply uses its original file, so nothing breaks.
   ========================================================================= */

/* If the manifest is missing altogether, carry on with originals. */
const MANIFEST = await import("../../assets/_small/manifest.js")
  .then(m => m.default || {})
  .catch(() => ({}));

function copyPath(path, width) {
  const cut = path.lastIndexOf(".");
  const rest = path.slice("assets/".length, cut);
  return `assets/_small/${rest}-${width}.webp`;
}

/**
 * The best file for showing `path` about `want` pixels wide.
 * Returns { src, w, h, ph } where w/h are the original's size and ph is a
 * tiny preview to show while the real image loads (both may be undefined).
 */
export function small(path, want) {
  const entry = MANIFEST[path];
  if (!entry || !entry.sizes?.length) return { src: path };
  const width = entry.sizes.find(s => s >= want) ?? entry.sizes[entry.sizes.length - 1];
  return { src: copyPath(path, width), w: entry.w, h: entry.h, ph: entry.ph };
}

/**
 * Every size of `path`, for <img srcset>, so each screen downloads only
 * what it can show. Returns null when there are no small copies.
 */
export function sources(path) {
  const entry = MANIFEST[path];
  if (!entry || !entry.sizes?.length) return null;
  return {
    src: copyPath(path, entry.sizes[entry.sizes.length - 1]),
    srcset: entry.sizes.map(s => `${copyPath(path, s)} ${s}w`).join(", "),
    w: entry.w, h: entry.h, ph: entry.ph
  };
}

/**
 * Load errors, in two steps: if a small copy fails, try the original once;
 * if the original fails too, call onFail (show initials, remove the frame).
 */
export function guard(img, original, onFail) {
  let triedOriginal = img.getAttribute("src") === original && !img.hasAttribute("srcset");
  img.addEventListener("error", () => {
    if (!triedOriginal) {
      triedOriginal = true;
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.src = original;
      return;
    }
    onFail?.();
  });
}

/**
 * Blur-up: paint the tiny preview behind the image, and fade the image in
 * over it once it has loaded. `frame` is the element that holds the image.
 */
export function blurUp(frame, img, preview) {
  if (preview) frame.style.backgroundImage = `url("${preview}")`;
  frame.classList.add("blur-up");
  const done = () => img.classList.add("is-loaded");
  if (img.complete && img.naturalWidth) done();
  else img.addEventListener("load", done, { once: true });
}
