/*
 * FreeFeed visibility experiment
 *
 * true  = show the element normally
 * false = hide the element
 *
 * Defaults come from settings.js. Saved values are loaded from Chrome storage
 * and can be changed live from the extension popup.
 */
const elementVisibility = { ...DEFAULT_VISIBILITY };
const HIDDEN_CLASS = "freefeed-hidden";
const FEED_HIDDEN_CLASS = "freefeed-hide-feed";
const LOADING_CLASS = "freefeed-loading";
const SCROLL_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
  " "
]);

// content.js runs at document_start, before Instagram can paint its interface.
// Keep the page invisible until saved settings have been applied once.
document.documentElement.classList.add(LOADING_CLASS);

const NAVIGATION_SETTING_KEYS = {
  instagramLogo: "navigationInstagramLogo",
  home: "navigationHome",
  reels: "navigationReels",
  messages: "navigationMessages",
  search: "navigationSearch",
  notifications: "navigationNotifications",
  create: "navigationCreate",
  professionalDashboard: "navigationProfessionalDashboard",
  profile: "navigationProfile",
  settings: "navigationSettings",
  alsoFromMeta: "navigationAlsoFromMeta"
};

function findInteractiveElementByLabel(label, root = document) {
  const labelledElement = Array.from(
    root.querySelectorAll("[aria-label]")
  ).find((element) => element.getAttribute("aria-label") === label);

  return labelledElement?.closest('a, button, [role="button"]') ?? null;
}

function findCommonAncestor(elements) {
  const existingElements = elements.filter(Boolean);
  let commonAncestor = existingElements[0] ?? null;

  while (
    commonAncestor &&
    existingElements.some((element) => !commonAncestor.contains(element))
  ) {
    commonAncestor = commonAncestor.parentElement;
  }

  return commonAncestor;
}

function findSideNavigation() {
  // These routes are stable product URLs and identify the central group of
  // sidebar controls without depending on Instagram's generated class names.
  const coreItems = {
    reels: document.querySelector('a[href="/reels/"]'),
    messages: document.querySelector('a[href="/direct/inbox/"]'),
    search: document.querySelector('a[href="/explore/"]')
  };

  const existingCoreItems = Object.values(coreItems).filter(Boolean);
  let panel =
    existingCoreItems.length >= 2
      ? findCommonAncestor(existingCoreItems)
      : null;

  // The first ancestor containing both ends of the sidebar is the complete
  // panel. If that structure cannot be confirmed, return null rather than
  // risk hiding a broad page container.
  while (panel && panel !== document.body) {
    const containsLogo = findInteractiveElementByLabel("Instagram", panel);
    const containsSettings = findInteractiveElementByLabel("Settings", panel);

    if (containsLogo && containsSettings) {
      break;
    }

    panel = panel.parentElement;
  }

  if (!panel || panel === document.body) {
    return { panel: null, items: {} };
  }

  const items = {
    instagramLogo: findInteractiveElementByLabel("Instagram", panel),
    home: findInteractiveElementByLabel("Home", panel),
    ...coreItems,
    notifications: findInteractiveElementByLabel("Notifications", panel),
    create: findInteractiveElementByLabel("New post", panel),
    professionalDashboard: findInteractiveElementByLabel(
      "Professional dashboard",
      panel
    ),
    settings: findInteractiveElementByLabel("Settings", panel),
    alsoFromMeta: findInteractiveElementByLabel("Also from Meta", panel)
  };

  // A profile link has a one-segment account URL and a real image. Excluding
  // the known product routes avoids hard-coding a username or English alt text.
  const knownNavigationHrefs = new Set([
    "/",
    "/reels/",
    "/direct/inbox/",
    "/explore/"
  ]);
  items.profile =
    Array.from(panel.querySelectorAll("a[href]")).find((link) => {
      const href = link.getAttribute("href");

      return (
        /^\/[^/]+\/$/.test(href) &&
        !knownNavigationHrefs.has(href) &&
        link.querySelector("img")
      );
    }) ?? null;

  return { panel, items };
}

function findStories() {
  const pagelets = document.querySelectorAll('[data-pagelet="story_tray"]');

  if (pagelets.length > 0) {
    return pagelets;
  }

  // Semantic fallback for a minor pagelet rename: story controls remain a
  // list of buttons whose accessible labels begin with "Story by".
  const storyButton = document.querySelector(
    'main [role="button"][aria-label^="Story by "]'
  );
  const storyList = storyButton?.closest("ul");

  return storyList ? [storyList] : [];
}

function findSuggestedUsers() {
  const seeAllLink = document.querySelector('a[href="/explore/people/"]');
  let candidate = seeAllLink;

  // Climb from the stable "See all" URL until the container also includes a
  // Follow button. On the inspected homepage, this is the suggestions block.
  while (candidate && candidate !== document.body) {
    const containsFollowButton = Array.from(
      candidate.querySelectorAll('button, [role="button"]')
    ).some((button) => button.textContent.trim() === "Follow");

    if (containsFollowButton) {
      return candidate;
    }

    candidate = candidate.parentElement;
  }

  return null;
}

function findMessagesOverlay() {
  const pagelets = document.querySelectorAll(
    '[data-pagelet="IGDChatTabsRootContentOffMsys"]'
  );

  if (pagelets.length > 0) {
    return pagelets;
  }

  // Semantic fallback for a minor pagelet rename. Exclude the sidebar link,
  // then hide the Messages tray's button-shaped root.
  const overlayLabel = Array.from(
    document.querySelectorAll('[aria-label="Messages"]')
  ).find((element) => !element.closest('a[href="/direct/inbox/"]'));
  const overlayButton = overlayLabel?.closest('[role="button"]');

  return overlayButton ? [overlayButton] : [];
}

function setVisibility(elements, isVisible) {
  for (const element of elements) {
    if (element) {
      element.classList.toggle(HIDDEN_CLASS, !isVisible);
    }
  }
}

function applyVisibilityRules() {
  const sideNavigation = findSideNavigation();
  const shouldHideFeed =
    location.pathname === "/" && !elementVisibility.feed;

  // Feed visibility is a page-level CSS state. New infinite-scroll articles
  // match the rule immediately, before the MutationObserver runs. Restrict it
  // to the homepage so opening an individual post still works normally.
  document.documentElement.classList.toggle(
    FEED_HIDDEN_CLASS,
    shouldHideFeed
  );
  document.body.classList.toggle(FEED_HIDDEN_CLASS, shouldHideFeed);

  setVisibility(
    [sideNavigation.panel],
    elementVisibility.navigationPanel
  );

  for (const [elementName, settingKey] of Object.entries(
    NAVIGATION_SETTING_KEYS
  )) {
    setVisibility(
      [sideNavigation.items[elementName]],
      elementVisibility[settingKey]
    );
  }

  setVisibility(
    findStories(),
    elementVisibility.stories
  );
  setVisibility([findSuggestedUsers()], elementVisibility.suggestedUsers);
  setVisibility(
    findMessagesOverlay(),
    elementVisibility.messagesOverlay
  );
}

let updateScheduled = false;

function scheduleVisibilityUpdate() {
  if (updateScheduled) {
    return;
  }

  updateScheduled = true;
  queueMicrotask(() => {
    updateScheduled = false;
    applyVisibilityRules();
  });
}

function waitForBody() {
  if (document.body) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const bodyObserver = new MutationObserver(() => {
      if (!document.body) {
        return;
      }

      bodyObserver.disconnect();
      resolve();
    });

    bodyObserver.observe(document.documentElement, { childList: true });
  });
}

function isFeedScrollBlocked() {
  return document.documentElement.classList.contains(FEED_HIDDEN_CLASS);
}

function blockFeedScroll(event) {
  if (!isFeedScrollBlocked()) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
}

function blockFeedScrollKey(event) {
  if (!isFeedScrollBlocked() || !SCROLL_KEYS.has(event.key)) {
    return;
  }

  const target = event.target;
  const isEditing =
    target instanceof Element &&
    target.closest('input, textarea, select, [contenteditable="true"]');

  if (!isEditing) {
    blockFeedScroll(event);
  }
}

// Register before Instagram's application scripts. CSS prevents movement;
// these listeners also stop scroll input from triggering feed pagination.
window.addEventListener("wheel", blockFeedScroll, {
  capture: true,
  passive: false
});
window.addEventListener("touchmove", blockFeedScroll, {
  capture: true,
  passive: false
});
window.addEventListener("keydown", blockFeedScrollKey, { capture: true });

// Instagram is a React single-page application. Parts of the page are added
// and replaced after the initial load, so reapply the rules after DOM changes.
const pageObserver = new MutationObserver(scheduleVisibilityUpdate);
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  let visibilityChanged = false;

  for (const [settingKey, change] of Object.entries(changes)) {
    if (!(settingKey in DEFAULT_VISIBILITY)) {
      continue;
    }

    elementVisibility[settingKey] =
      typeof change.newValue === "boolean"
        ? change.newValue
        : DEFAULT_VISIBILITY[settingKey];
    visibilityChanged = true;
  }

  if (visibilityChanged) {
    applyVisibilityRules();
  }
});

async function startFreeFeed() {
  const storedSettingsPromise = chrome.storage.local
    .get(DEFAULT_VISIBILITY)
    .catch((error) => {
      console.error("FreeFeed could not load its saved settings.", error);
      return DEFAULT_VISIBILITY;
    });

  try {
    await waitForBody();
    const storedSettings = await storedSettingsPromise;

    for (const settingKey of Object.keys(DEFAULT_VISIBILITY)) {
      const storedValue = storedSettings[settingKey];
      elementVisibility[settingKey] =
        typeof storedValue === "boolean"
          ? storedValue
          : DEFAULT_VISIBILITY[settingKey];
    }

    pageObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    applyVisibilityRules();
  } finally {
    document.documentElement.classList.remove(LOADING_CLASS);
  }
}

startFreeFeed();
