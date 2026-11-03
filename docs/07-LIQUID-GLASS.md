# Liquid glass look

The frosted, iOS-style look is purely visual. It never touches your tournament
data, and you never enter anything for it.

## Where it lives

| File | What it does |
|---|---|
| `css/tokens.css` (section "Liquid glass") | The knobs: tint, blur, rim light, shadow |
| `css/glass.css` | Applies the look to the header, tabs, tables, cards, mobile nav |
| `js/ui/glass.js` | Pointer-following highlight, and the refraction switch for Chromium |
| each page's `<div class="ambient">` and `<svg>` | The coloured light behind the glass, and the refraction filter |

## Tweak it

Open `css/tokens.css` and change a value in the "Liquid glass" block:

- **More see-through:** lower the last number in `--glass-bg` (for example `.64` to `.5`).
  Keep it above about `.55` or small grey text becomes hard to read.
- **Stronger frost:** raise the blur in `--glass-bf` (for example `22px` to `30px`).
- **Brighter edge:** raise `--glass-top` and `--glass-line`.

## Turn it off

Delete the line `<link rel="stylesheet" href="css/glass.css">` from the four
pages (`index.html`, `premium.html`, `second-tier.html`, `history.html`).
The site goes back to its flat look. (The two text colours `--muted` and
`--faint` in `tokens.css` were lightened slightly and stay that way.)

## Good to know

- Visitors who set "reduce transparency" (or whose browser cannot blur what is
  behind an element) get solid surfaces instead. "Reduce motion" stops the
  drifting background.
- The light-bending refraction on the header, tabs and mobile bar only shows in
  Chromium browsers (Chrome, Edge, Brave). Safari and Firefox get the frosted
  blur without the bending, which is the same look minus one effect.
- Only large cards use real blur. Match rows and stat boxes are translucent
  only, on purpose: stacking blur inside blur does nothing and slows phones.
