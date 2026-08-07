# FreeFeed — Initial Thoughts and MVP Scope

## Product vision

FreeFeed is a Chrome extension that simplifies the Instagram web experience by replacing Instagram's distracting home feed with a focused task dashboard.

The goal is to make Instagram intentional: users choose what they came to do instead of being exposed to Instagram's full navigation and infinite recommendations.

The initial target is desktop Chrome and Instagram Web.

## Core MVP experience

When the user opens Instagram's home page, they should initially see the FreeFeed dashboard instead of Instagram's normal home feed.

The dashboard should be a full-screen landing page with the primary Instagram actions:

- Messages
- Search
- Notifications
- Upload
- Stories
- Dashboard, if applicable
- Profile

There should be no normal Instagram home feed in the default experience.

## Dashboard behavior

The dashboard is a task launcher rather than another social feed.

Users select the activity they want to perform, and FreeFeed redirects them to the corresponding Instagram page.

The dashboard should be visually simple and focused, with primary uses more prominent than secondary options.

The Instagram/FreeFeed home action should return users to the FreeFeed dashboard rather than Instagram's normal feed.

## Focused Instagram pages

After a user selects an action, the relevant Instagram page should open normally enough to preserve Instagram's familiar functionality.

Examples:

- Messages opens the normal Instagram messages page.
- Search opens search functionality without exposing the Explore landing page.
- Notifications opens the normal notifications page.
- Upload opens Instagram's upload flow.
- Stories opens the normal stories experience.
- Profile opens the normal profile page.

On these pages, FreeFeed should simplify Instagram's standard left-side navigation and remove selected distracting options, such as Reels.

The goal is not to redesign every Instagram page in the MVP. The first version should primarily control entry, navigation, and distracting sections while preserving the selected Instagram workflow.

## Deep links

Deep links should generally remain accessible through normal navigation.

Examples include:

- Profiles
- Individual posts
- Messages
- Search results

Deep links should make it possible to navigate naturally from one intentional Instagram page to another.

However, access to restricted sections should depend on FreeFeed settings and restrictions.

## Restricted sections

Reels should be blocked in the MVP.

If the user navigates directly to Reels or reaches it through another page, FreeFeed should show a static FreeFeed interface instead of the Reels content.

The same restriction model may later be extended to other distracting areas, but the MVP should focus on Reels and the normal home feed first.

Potential future restrictions include Explore, suggested content, and other recommendation-heavy surfaces.

## Unrestricted Instagram mode

The user should have a small, deliberately low-prominence control that restores the normal Instagram UI for the current session.

This is an escape hatch, not part of the primary dashboard.

Unrestricted mode should be temporary. Reloading Instagram should return the user to the FreeFeed experience.

The exact placement and confirmation behavior of this control will be decided during UI design and technical implementation.

## Settings

Settings should eventually allow the user to configure restrictions, including which Instagram areas are blocked.

Settings are not a major MVP priority. The first version should establish the core behavior with sensible default restrictions.

Remembering the user's last-used mode or adding more advanced session preferences can be considered after the core experience works.

## MVP boundaries

The MVP should:

1. Target desktop Chrome.
2. Work with Instagram Web.
3. Replace the Instagram home entry point with the FreeFeed dashboard.
4. Provide the primary actions listed above.
5. Redirect users to the corresponding Instagram pages.
6. Preserve the normal selected Instagram workflow where practical.
7. Simplify the Instagram left-side navigation.
8. Keep deep links generally usable.
9. Block Reels with a static FreeFeed screen.
10. Provide a temporary escape hatch to restore the normal Instagram UI.
11. Return to FreeFeed after a reload.

## Explicitly out of scope for the first version

- Rebuilding all of Instagram's UI from scratch.
- Creating a replacement Instagram client.
- Building a custom messages interface.
- Building a custom stories interface.
- Supporting mobile browsers.
- Advanced user profiles or synchronization.
- A complete settings system.
- Complex usage analytics or timed restrictions.

## Open decisions for later

- Whether Explore should be blocked in addition to Reels.
- Whether suggested posts and suggested accounts should be removed.
- Whether Upload should allow Reels or only posts and Stories.
- The exact Search behavior and allowed result types.
- The exact meaning and label of the Dashboard action.
- What areas of the Profile page should be hidden.
- The visual hierarchy of the dashboard.
- The exact design of the blocked Reels screen.
- The location and interaction of the unrestricted-session control.

## Product principle

FreeFeed should help users access Instagram deliberately without making them fight the interface.

The default experience should be focused, reversible, and understandable: users choose a task, complete it in Instagram's familiar environment, and are protected from unrelated distraction.
