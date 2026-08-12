# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who want to use Instagram intentionally while avoiding parts of the product that pull them into unplanned browsing.

## Product Purpose

FreeFeed is a Chrome extension that lets people choose which Instagram activities remain available. On Instagram’s home route, it can replace the feed with a focused launcher for the activities the user has kept enabled. Success means the intended activity remains easy to reach while disabled or distracting surfaces stay out of the way.

## Positioning

FreeFeed preserves selected Instagram utilities instead of treating Instagram as all-or-nothing: users configure the activities they want, and the extension enforces those choices inside Instagram itself.

## Operating Context

FreeFeed runs as a Manifest V3 Chrome extension on `instagram.com`. A first-install welcome tab explains the default protections and provides direct next steps. Users configure allowed activities from a dedicated extension settings tab, use temporary access from the popup, encounter the FreeFeed dashboard on Instagram’s home route, and see a focused blocked state when navigating to a disabled route.

## Capabilities and Constraints

- Preserve the activity settings, dashboard action groups, route restrictions, and focus management while keeping permanent settings out of the popup.
- Keep the existing UI structure; branding work must not introduce a major information-architecture or layout remap.
- Supported activity controls are Feed, Messages, Search, Notifications, Create, Stories, Reels, and Professional dashboard.
- Feed, Reels, and Professional dashboard are disabled by default; the other current defaults remain enabled.
- Disabling an activity remains immediate. Enabling one requires a 10-second waiting period, explicit acknowledgement, and an exact activity-specific confirmation phrase.
- Normal Instagram can only be entered from the extension popup through a temporary 2, 5, or 15 minute unlock. Settings must automatically resume when the deadline expires in every open Instagram tab.
- The extension must remain dependency-free and compatible with the current Manifest V3 architecture.
- FreeFeed stores activity choices and temporary-access timing only in Chrome's local extension storage. It processes the current Instagram route and limited interface elements locally, with no analytics, advertising trackers, developer server, or outbound user-data transmission.
- The welcome page opens only for a true first installation, never for ordinary extension updates or browser restarts.

## Brand Commitments

- Product name: FreeFeed.
- The supplied brand board is binding: use the broken-loop “F” mark, black wordmark, Instagram-inspired orange-to-pink-to-violet gradient, white surfaces, restrained dividers, and calm, minimal presentation.
- Brand intent: intentional Instagram use, reduced distraction, clarity, balance, and user control.
- Brand implementation must cover the extension popup, in-page dashboard, blocked states, and extension/app icons.

## Evidence on Hand

- Approved brand reference: `C:/Users/Hp-/AppData/Local/Temp/codex-clipboard-b2357d8a-1a46-426e-a14d-2ee9a36fd41e.png`.
- Existing product behavior and copy: `extension/`.
- Route behavior tests: `tests/routes.test.js`.
- No testimonials, usage metrics, commercial claims, or external proof are available and none should be fabricated.

## Product Principles

- Keep intentional actions easy to reach.
- Preserve user choice instead of imposing a single definition of distraction.
- Intervene calmly and clearly, without shame or gamification.
- Prefer dependable native behavior over ornamental complexity.
- Keep the interface quiet enough to support the user’s original intent.

## Accessibility & Inclusion

Retain semantic controls, keyboard navigation, visible focus, status announcements, reduced-motion support, forced-colors compatibility, and readable light/dark contrast.
