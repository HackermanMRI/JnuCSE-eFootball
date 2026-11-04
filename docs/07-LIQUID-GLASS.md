# Look and motion: liquid glass, animation, mobile

Everything in this guide is visual. It never touches your tournament data, and
you never enter anything for it.

## The idea in one paragraph

The site follows Apple's Liquid Glass rule: **glass is only for the controls that
float above the content.** The header capsule, the phone tab bar, the sticky tabs
on the tier pages and the back-to-top button are glass. Cards, tables, match rows
and search fields are content, so they are solid. That is deliberate: glass over
glass muddies both, and solid content behind the bars is what makes the glass
read as glass when things scroll underneath.

## Where it lives

| File | What it does |
|---|---|
| `css/tokens.css` | Every colour, size and timing. "Liquid glass" and "Motion" blocks are the knobs |
| `css/layout.css` | Header, desktop nav, phone tab bar, page title, footer, edge effects |
| `css/components.css` | The content: cards, table, match rows, search, player cards |
| `css/glass.css` | The glass itself, the moving background, and the accessibility fallbacks |
| `css/animations.css` | Entrances, reveals, page-to-page transitions |
| `js/ui/glass.js` | Refraction maps, press glow, pointer light, the transparency switch |
| `js/ui/shell.js` | Scroll behaviour: collapsing title, tab bar tucking in, back to top |
| `js/ui/motion.js` | Springs, count-ups, list reflow, rows appearing as you scroll |
| `js/ui/interactions.js` | Tabs (the sliding lens) and the expanding cards |
| each page's `<head>` | The transparency preference and the page-transition switch, before first paint |

## What happens where

- **Between pages** (Chrome, Edge, Safari 18.2+): the page crossfades, the
  selection lens in the nav glides to the new tab, and the big title morphs into
  the next one. Other browsers just load the page.
- **Header**: a floating glass capsule. On a phone, once the big title scrolls
  away, a small title appears in the middle of the bar.
- **Phone tab bar**: icons and labels. Scrolling down tucks it in (labels hide,
  the bar narrows); scrolling up, reaching the end or touching it brings it back.
  Tapping the tab you are already on scrolls to the top.
- **Tier tabs**: stick under the header while you scroll a long list. The lens
  stretches toward the new tab and settles with a small wobble. Switching tabs
  after scrolling starts the new tab at its top.
- **Edge effect**: content fades and blurs softly where it slides under a bar.
- **Lists**: match rows load in batches as you scroll (see `docs/02`) and each row
  slides in only when it reaches the screen. Player search reflows the cards
  smoothly instead of jumping.
- **Cards**: open on a spring; player numbers count up the first time; photos
  settle in from a soft blur. A player's name in the points table opens their
  card on the Players page.

## Refraction

In Chrome, Edge, Brave and other Chromium browsers, the glass bars bend the
background at their rim, like a lens, and stay clear in the middle. The bend is
built from each bar's own shape when the page loads (`js/ui/glass.js`), so it fits
any screen size. Safari and Firefox get the same frosted glass without the bend.

## Tweak it

In `css/tokens.css`:

- **More or less see-through:** change the alpha in `--glass-tint`
  (`.66` now). Going below about `.55` can make the tab bar labels hard to read
  over bright news banners; that was measured, not guessed.
- **More frost:** raise the blur in `--glass-filter` (`10px` now). Apple keeps
  this light on purpose; heavy blur is the older, flatter look.
- **Brighter edge:** raise the first alpha in `--glass-rim`.
- **Faster or slower motion:** the `--dur-*` values. The springs (`--spring-*`)
  are generated from real spring physics; leave those alone unless you
  regenerate them.

## Accessibility

- **Reduce transparency**: the switch in the footer (or the system setting, where
  the browser reports it) makes every bar solid and stops the moving background.
  Safari never reports the system setting, which is why the switch exists. The
  choice is remembered on that device.
- **Increase contrast** (system setting): darker bars, white labels, visible borders.
- **Reduce motion** (system setting): no page transitions, no springs, no
  count-ups; everything appears instantly. Nothing is hidden behind an animation.
- Text on glass was measured against the real pixels behind it at the worst
  scroll positions, on phone and desktop: every label passes WCAG AA (4.5:1).

## Turn the glass off

Delete the line `<link rel="stylesheet" href="css/glass.css">` from the five pages
(`index.html`, `premium.html`, `second-tier.html`, `history.html`,
`players.html`). The bars become plain and the moving background disappears; the
rest of the site, including the motion, keeps working.
