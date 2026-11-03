/* =========================================================================
   GLASS
   =========================================================================
   Two progressive enhancements for css/glass.css. The site works without
   either; they only add polish.

     1. Flags Chromium, the one engine where backdrop-filter can take an
        SVG filter (the refraction on the bars).
     2. Feeds the pointer position to glass panels so their specular
        highlight follows the cursor.
   ========================================================================= */

const PANELS = ".table-wrap, .acc, .record, .season-card, .setup";

export function initGlass() {
  const brands = navigator.userAgentData?.brands;
  if (brands?.some(b => b.brand === "Chromium")) {
    document.documentElement.classList.add("glass-refract");
  }

  /* No hover on touch devices, so there is no pointer light to move. */
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  let frame = 0;
  let x = 0, y = 0, target = null;

  document.addEventListener("pointermove", e => {
    const panel = e.target instanceof Element ? e.target.closest(PANELS) : null;
    if (!panel) return;
    target = panel; x = e.clientX; y = e.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const r = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${x - r.left}px`);
      target.style.setProperty("--my", `${y - r.top}px`);
    });
  }, { passive: true });
}
