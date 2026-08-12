# FreeFeed Design System

## Direction

FreeFeed is calm, minimal interface chrome for intentional Instagram use. The system stays visually quiet and lets the broken-loop “F” mark carry the brand. It preserves familiar controls and avoids gamification, dense decoration, or shame-based intervention.

## Brand Assets

- Primary mark: `extension/assets/brand/freefeed-mark.svg`
- Horizontal lockup: `extension/assets/brand/freefeed-lockup.svg`
- Monochrome marks: `freefeed-mark-mono.svg` and `freefeed-mark-white.svg`
- App-icon master: `freefeed-app-icon.svg`
- Chrome raster icons: `extension/assets/icons/freefeed-{16,32,48,128}.png`

Keep clear space around the mark equal to at least the thickness of the broken loop. Do not recolor the gradient, add effects to the standalone mark, place text inside it, or distort its aspect ratio.

## Color

The interface uses restrained neutrals and Instagram’s standard action blue. The gradient is reserved for the FreeFeed mark.

- Light background: `#fbfaf9`
- Light surface: `#ffffff`
- Light foreground: `#101218`
- Light secondary text: `#626775`
- Light divider: `#e5e2e0`
- Dark background: `#111318`
- Dark surface: `#181b21`
- Dark foreground: `#f7f7f8`
- Dark secondary text: `#b1b4bd`
- Dark divider: `#2b2f38`
- Action blue: `#0095f6`
- Mark gradient: `#fd9507` → `#fc5f45` → `#f32e80` → `#c004d1` → `#9b00f5`

Use the gradient only inside the FreeFeed mark. Enabled controls, focus states, and the primary recovery action use action blue. Never use the gradient for text or interface chrome.

## Typography

Use Instagram’s platform UI stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. The FreeFeed wordmark treatment uses weight 700 with tight tracking (`-0.025em` to `-0.03em`). Interface copy remains compact, sentence case, and direct.

## Components and Surfaces

- Popup: 340px wide, with Temporary access as the only control surface and understated text links below it. About replaces the main popup view in place, using a compact Back control, direct body copy, and a quiet small-text quotation.
- Settings page: a focused full-tab Operate surface with one restrained activity list, explanatory secondary copy, 43px minimum targets, blue switches, and concise save/error status. Restrictive changes are immediate; enabling an activity opens a protected-focus confirmation with a waiting period, acknowledgement, and exact phrase.
- Privacy policy: a full-tab Read surface with the shared header, a narrow prose measure, plain section dividers, scannable permission definitions, and no card-based decoration.
- Welcome page: a concise first-run surface that pairs a direct value proposition and primary Instagram action with the real default setup and local-only privacy disclosure. Semantic state labels use green for Active/Available and red for Blocked, always retaining text labels.
- Status language: Active means restrictions are enforced, Paused means temporary normal-Instagram access is running, and Inactive is reserved for a serious state or storage error.
- Dashboard: centered existing action groups, transparent actions at rest, restrained surface response on hover, no additional navigation or cards.
- Blocked state: mark, existing title and explanation, and one blue recovery button. Temporary access is never offered inside Instagram.
- Corners: 10–14px for interactive surfaces; pills are reserved for switches.
- Focus: 2px violet/pink outline with 3px offset.
- Motion: short state transitions only, disabled when reduced motion is requested.

## Accessibility

Retain native checkboxes, fieldset/legend semantics, status live regions, keyboard focus, route heading focus, forced-colors fallbacks, and light/dark contrast. Brand images that accompany a visible FreeFeed label use empty alternative text; standalone exported marks keep their SVG title.
