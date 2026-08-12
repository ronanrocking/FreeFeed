const settings = { ...DEFAULT_SETTINGS };
const HIDDEN_CLASS = "freefeed-hidden";
const LOADING_CLASS = "freefeed-loading";
const LOCKED_CLASS = "freefeed-page-locked";
const FEED_HIDDEN_CLASS = "freefeed-feed-hidden";
const RESTRICTED_CLASS = "freefeed-route-restricted";
const ACTIVE_CLASS = "freefeed-active";
const NATIVE_DIALOG_CLASS = "freefeed-native-dialog-open";
const DASHBOARD_ID = "freefeed-dashboard";

const NAV_SETTINGS = {
  reels: "allowReels",
  messages: "allowMessages",
  search: "allowSearch",
  notifications: "allowNotifications",
  create: "allowCreate",
  professionalDashboard: "allowProfessionalDashboard"
};

const ACTIONS = [
  { name: "messages", label: "Messages", setting: "allowMessages", nav: "messages", row: "primary", fallback: "/direct/inbox/" },
  { name: "search", label: "Search", setting: "allowSearch", nav: "search", row: "primary", fallback: "/explore/" },
  { name: "notifications", label: "Notifications", setting: "allowNotifications", nav: "notifications", row: "primary" },
  { name: "create", label: "Create", setting: "allowCreate", nav: "create", row: "primary" },
  { name: "stories", label: "Stories", setting: "allowStories", row: "secondary" },
  { name: "reels", label: "Reels", setting: "allowReels", nav: "reels", row: "secondary", fallback: "/reels/" },
  { name: "professionalDashboard", label: "Dashboard", setting: "allowProfessionalDashboard", nav: "professionalDashboard", row: "secondary", optional: true },
  { name: "profile", label: "Profile", nav: "profile", row: "secondary" }
];

let instagramUnlockUntil = 0;
let unlockTimer = 0;
let dashboardSignature = "";
let currentMode = "native";
let permittedNativeAction = null;
let nativeActionOpeningUntil = 0;
let updateScheduled = false;
let inertElements = new Map();
let hiddenSearchNodes = new Set();

document.documentElement.classList.add(LOADING_CLASS);

function findControl(label, root = document) {
  return Array.from(root.querySelectorAll("[aria-label]"))
    .find((element) => !element.closest(`#${DASHBOARD_ID}`) && element.getAttribute("aria-label") === label)
    ?.closest('a, button, [role="button"]') ?? null;
}

function commonAncestor(elements) {
  const existing = elements.filter(Boolean);
  let ancestor = existing[0] ?? null;

  while (ancestor && existing.some((element) => !ancestor.contains(element))) {
    ancestor = ancestor.parentElement;
  }
  return ancestor;
}

function findSideNavigation() {
  const core = {
    reels: document.querySelector('a[href="/reels/"]:not([data-freefeed-nav-action])'),
    messages: document.querySelector('a[href="/direct/inbox/"]'),
    search: document.querySelector('a[href="/explore/"]:not([data-freefeed-nav-action])')
  };
  let panel = commonAncestor(Object.values(core));

  while (panel && panel !== document.body) {
    const links = Array.from(panel.querySelectorAll("a[href]"));
    const hasProfile = links.some((link) => /^\/[^/]+\/$/.test(link.getAttribute("href")) && link.querySelector("img"));
    if (links.some((link) => link.getAttribute("href") === "/") && hasProfile && links.length >= 7) break;
    panel = panel.parentElement;
  }

  if (!panel || panel === document.body) return { panel: null, items: {} };

  const links = Array.from(panel.querySelectorAll("a[href]"));
  const homeLinks = links.filter((link) => link.getAttribute("href") === "/");
  const knownRoutes = new Set(["/", "/reels/", "/direct/inbox/", "/explore/"]);
  const profile = links.find((link) => {
    const href = link.getAttribute("href");
    return /^\/[^/]+\/$/.test(href) && !knownRoutes.has(href) && link.querySelector("img");
  }) ?? null;
  const searchIndex = links.indexOf(core.search);
  const profileIndex = links.indexOf(profile);
  const beforeProfile = links.slice(searchIndex + 1, profileIndex).filter((link) => link.getAttribute("href") === "#");
  const afterProfile = links.slice(profileIndex + 1).filter((link) => link.getAttribute("href") === "#");

  return {
    panel,
    items: {
      instagramLogo: homeLinks[0] ?? null,
      home: homeLinks.at(-1) ?? null,
      ...core,
      notifications: findControl("Notifications", panel) ?? beforeProfile[0] ?? null,
      create: findControl("New post", panel) ?? beforeProfile[1] ?? null,
      professionalDashboard: findControl("Professional dashboard", panel) ?? beforeProfile[2] ?? null,
      profile,
      settings: findControl("Settings", panel) ?? afterProfile[0] ?? null,
      alsoFromMeta: findControl("Also from Meta", panel) ?? afterProfile[1] ?? null
    }
  };
}

function firstStoryButton() {
  return document.querySelector('main a[href^="/stories/"]')?.closest('button, [role="button"]')
    ?? document.querySelector('[data-pagelet="story_tray"] [role="button"]')
    ?? document.querySelector('main [role="button"][aria-label^="Story by "]');
}

function storyTray() {
  const story = firstStoryButton();
  return story?.closest('[data-pagelet="story_tray"], [role="presentation"]')
    ?? story?.closest("ul")
    ?? null;
}

function storiesIcon(size = 32) {
  const wrapper = document.createElement("span");
  wrapper.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none"><circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="2"></circle><path d="m10 8.5 5.5 3.5-5.5 3.5v-7Z" fill="currentColor"></path></svg>`;
  return wrapper.firstElementChild;
}

function cloneVisual(action, sideNavigation, size = 32) {
  if (action.name === "stories") return storiesIcon(size);

  const source = sideNavigation.items[action.nav];
  const visual = source?.querySelector(action.name === "profile" ? "img" : "svg")?.cloneNode(true);
  if (!visual) return null;

  visual.removeAttribute("class");
  visual.removeAttribute("aria-label");
  visual.setAttribute("aria-hidden", "true");
  visual.setAttribute("width", size);
  visual.setAttribute("height", size);
  visual.querySelector("title")?.remove();
  if (visual.tagName === "IMG") visual.alt = "";
  return visual;
}

function actionAvailable(action, sideNavigation) {
  if (action.name === "stories") return Boolean(firstStoryButton());
  return Boolean(sideNavigation.items[action.nav] || action.fallback);
}

function createDashboard() {
  const dashboard = document.createElement("section");
  dashboard.id = DASHBOARD_ID;
  dashboard.setAttribute("aria-label", "FreeFeed home");
  dashboard.innerHTML = `
    <div class="freefeed-content" data-freefeed-view="home">
      <div class="freefeed-brand" aria-label="Instagram FreeFeed">
        <span class="freefeed-brand-icon" aria-hidden="true"><img src="${chrome.runtime.getURL("assets/brand/freefeed-mark.svg")}" alt=""></span>
        <span class="freefeed-brand-divider" aria-hidden="true"></span>
        <span class="freefeed-brand-name">FreeFeed</span>
      </div>
      <div class="freefeed-actions" data-freefeed-row="primary"></div>
      <div class="freefeed-actions freefeed-actions-secondary" data-freefeed-row="secondary"></div>
      <blockquote class="freefeed-quote">
        <p>“Time is that which God uses to separate the idle from the industrious.” <cite>— Amor Towles</cite></p>
      </blockquote>
      <p class="freefeed-status" role="status" hidden></p>
    </div>
    <div class="freefeed-blocked" data-freefeed-view="blocked" hidden>
      <img class="freefeed-blocked-mark" src="${chrome.runtime.getURL("assets/brand/freefeed-mark.svg")}" alt="">
      <h1 tabindex="-1"></h1>
      <p></p>
      <button class="freefeed-primary" type="button" data-freefeed-home>Back to FreeFeed</button>
    </div>
  `;
  dashboard.addEventListener("click", handleDashboardClick);
  document.body.append(dashboard);
  return dashboard;
}

function renderHome(dashboard, sideNavigation) {
  const actions = ACTIONS.filter((action) => {
    if (action.setting && !settings[action.setting]) return false;
    return !action.optional || sideNavigation.items[action.nav];
  });
  const signature = JSON.stringify({
    actions: actions.map((action) => [action.name, Boolean(cloneVisual(action, sideNavigation)), actionAvailable(action, sideNavigation)]),
    profile: sideNavigation.items.profile?.querySelector("img")?.src,
    ready: Boolean(sideNavigation.panel),
    timedOut: !sideNavigation.panel && performance.now() >= 3000
  });
  if (signature === dashboardSignature) return;
  dashboardSignature = signature;

  for (const row of ["primary", "secondary"]) {
    const buttons = actions.filter((action) => action.row === row).map((action) => {
      const button = document.createElement("button");
      const visual = cloneVisual(action, sideNavigation);
      button.className = `freefeed-action${visual ? "" : " freefeed-action-no-icon"}`;
      button.type = "button";
      button.dataset.freefeedAction = action.name;
      button.setAttribute("aria-label", action.label);
      button.title = action.label;
      button.disabled = !actionAvailable(action, sideNavigation);
      if (visual) button.append(visual);
      button.append(Object.assign(document.createElement("span"), { textContent: action.label }));
      return button;
    });
    dashboard.querySelector(`[data-freefeed-row="${row}"]`).replaceChildren(...buttons);
  }

  const unavailable = actions.filter((action) => !actionAvailable(action, sideNavigation));
  const status = dashboard.querySelector(".freefeed-status");
  const stillLoading = !sideNavigation.panel && performance.now() < 3000;
  status.textContent = stillLoading ? "" : !sideNavigation.panel
    ? "Instagram’s controls could not be found. Reload the page and try again."
    : unavailable.length
      ? "Some Instagram actions are unavailable right now."
      : "";
  status.hidden = !status.textContent;
}

function renderBlocked(dashboard, restriction) {
  const blocked = dashboard.querySelector('[data-freefeed-view="blocked"]');
  blocked.querySelector("h1").textContent = restriction.title;
  blocked.querySelector("p").textContent = restriction.message;
  dashboard.setAttribute("aria-label", restriction.title);
}

function waitForControl(label, timeout = 2000) {
  const existing = findControl(label);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const control = findControl(label);
      if (!control) return;
      clearTimeout(timer);
      observer.disconnect();
      resolve(control);
    });
    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

async function openAction(action, sideNavigation) {
  if (action.name === "stories") {
    firstStoryButton()?.click();
    return;
  }

  const control = sideNavigation.items[action.nav];
  if (control) {
    permittedNativeAction = action.name;
    nativeActionOpeningUntil = performance.now() + 2500;
    setTimeout(scheduleUpdate, 2500);
    control.click();
    if (action.name === "create") (await waitForControl("Post"))?.click();
  } else if (action.fallback) {
    location.assign(action.fallback);
  }
}

function handleDashboardClick(event) {
  if (event.target.closest("[data-freefeed-home]")) {
    location.assign("/");
    return;
  }

  const button = event.target.closest("[data-freefeed-action]");
  const action = ACTIONS.find((candidate) => candidate.name === button?.dataset.freefeedAction);
  if (action) void openAction(action, findSideNavigation());
}

function setVisible(element, visible) {
  element?.classList.toggle(HIDDEN_CLASS, !visible);
}

function findNativePanel() {
  const markers = document.querySelectorAll('[role="heading"], input[aria-label="Search input"], input[placeholder="Search"]');

  for (const marker of markers) {
    if (marker.closest(`#${DASHBOARD_ID}`)) continue;
    for (let element = marker; element && element !== document.body; element = element.parentElement) {
      const rect = element.getBoundingClientRect();
      if (Math.round(rect.left) === 0 && rect.width >= 320 && rect.width <= 600 && rect.height >= innerHeight * 0.8) return element;
    }
  }
  return null;
}

function findNativeDialog() {
  return Array.from(document.querySelectorAll('[role="dialog"]'))
    .find((dialog) => !dialog.closest(`#${DASHBOARD_ID}`) && dialog.getBoundingClientRect().width > 0) ?? null;
}

function findSearchRecommendations() {
  const input = document.querySelector('main input[aria-label="Search input"], main input[placeholder="Search"], main input[type="text"]');
  if (!input) return [];

  for (let ancestor = input.parentElement; ancestor && ancestor.tagName !== "MAIN"; ancestor = ancestor.parentElement) {
    const inputBranch = Array.from(ancestor.children).find((child) => child.contains(input));
    const recommendations = Array.from(ancestor.children)
      .filter((child) => child !== inputBranch && child.querySelector('a[href^="/p/"], video, [role="progressbar"]'));
    if (recommendations.length) return recommendations;
  }
  return [];
}

function updateSearchVisibility(elements) {
  const next = new Set(elements);
  for (const element of hiddenSearchNodes) if (!next.has(element)) element.classList.remove(HIDDEN_CLASS);
  for (const element of next) element.classList.add(HIDDEN_CLASS);
  hiddenSearchNodes = next;
}

function updateInert(elements) {
  const next = new Set(elements.filter(Boolean));

  for (const [element, state] of inertElements) {
    if (next.has(element)) continue;
    element.inert = state.inert;
    if (state.ariaHidden === null) element.removeAttribute("aria-hidden");
    else element.setAttribute("aria-hidden", state.ariaHidden);
    inertElements.delete(element);
  }

  for (const element of next) {
    if (!inertElements.has(element)) {
      inertElements.set(element, { inert: element.inert, ariaHidden: element.getAttribute("aria-hidden") });
    }
    element.inert = true;
    element.setAttribute("aria-hidden", "true");
  }
}

function pauseRestrictedMedia(restriction) {
  if (restriction?.setting !== "allowReels") return;
  for (const media of document.querySelectorAll("video, audio")) {
    media.pause();
    media.muted = true;
  }
}

function scheduleUnlockExpiry() {
  clearTimeout(unlockTimer);
  unlockTimer = 0;

  const remaining = remainingUnlockMilliseconds(instagramUnlockUntil);
  if (!remaining) return;

  unlockTimer = setTimeout(() => {
    instagramUnlockUntil = 0;
    permittedNativeAction = null;
    nativeActionOpeningUntil = 0;
    void chrome.storage.local.remove(INSTAGRAM_UNLOCK_KEY).catch((error) => {
      console.error("FreeFeed could not clear an expired unlock.", error);
    });
    if (routeRestriction(location.pathname, settings)) {
      location.replace("/");
      return;
    }
    dashboardSignature = "";
    applyRules();
  }, remaining);
}

function focusDashboard(dashboard, mode) {
  if (mode === currentMode) return;
  const activeInNativePage = document.activeElement && document.activeElement !== document.body && !dashboard.contains(document.activeElement);
  if (mode === "blocked" || activeInNativePage) {
    (mode === "blocked"
      ? dashboard.querySelector(".freefeed-blocked h1")
      : dashboard.querySelector(".freefeed-action:not(:disabled)"))?.focus();
  }
}

function applyRules() {
  const sideNavigation = findSideNavigation();
  const dashboard = document.getElementById(DASHBOARD_ID) ?? createDashboard();
  const instagramUnlocked = activeUnlockDeadline(instagramUnlockUntil) > 0;
  const restriction = instagramUnlocked ? null : routeRestriction(location.pathname, settings);
  const mode = instagramUnlocked ? "native" : restriction ? "blocked" : location.pathname === "/" ? "home" : "native";
  const dashboardActive = mode !== "native";
  const focusedSearch = !instagramUnlocked && settings.allowSearch && /^\/explore(?:\/|$)/.test(location.pathname);
  const nativeActionPermitted = dashboardActive && Boolean(permittedNativeAction);
  const nativeDialog = nativeActionPermitted ? findNativeDialog() : null;
  const nativePanel = nativeActionPermitted && !nativeDialog ? findNativePanel() : null;

  if (!dashboardActive) {
    permittedNativeAction = null;
    nativeActionOpeningUntil = 0;
  } else if (permittedNativeAction && !nativeDialog && !nativePanel && performance.now() >= nativeActionOpeningUntil) {
    permittedNativeAction = null;
    nativeActionOpeningUntil = 0;
  }

  setVisible(sideNavigation.panel, instagramUnlocked || mode === "native");
  for (const [item, setting] of Object.entries(NAV_SETTINGS)) {
    setVisible(sideNavigation.items[item], instagramUnlocked || settings[setting]);
  }
  setVisible(storyTray(), instagramUnlocked || settings.allowStories);

  if (!nativeDialog && !nativePanel) renderHome(dashboard, sideNavigation);
  if (restriction) renderBlocked(dashboard, restriction);
  dashboard.querySelector('[data-freefeed-view="home"]').hidden = mode !== "home";
  dashboard.querySelector('[data-freefeed-view="blocked"]').hidden = mode !== "blocked";
  dashboard.setAttribute("aria-label", restriction?.title ?? "FreeFeed home");
  dashboard.classList.toggle(ACTIVE_CLASS, dashboardActive);

  dashboard.classList.toggle(NATIVE_DIALOG_CLASS, Boolean(nativeDialog));
  const recommendations = focusedSearch ? findSearchRecommendations() : [];

  focusDashboard(dashboard, mode);
  const nativeRoots = Array.from(document.body.children)
    .filter((element) => element !== dashboard && !["SCRIPT", "STYLE"].includes(element.tagName));
  const inertTargets = dashboardActive && !nativeDialog
    ? nativePanel
      ? [document.querySelector("main"), document.querySelector('[role="contentinfo"]')]
      : nativeRoots
    : recommendations;
  updateSearchVisibility(recommendations);
  updateInert([...inertTargets, ...recommendations]);
  pauseRestrictedMedia(restriction);

  const sidebarWidth = dashboardActive ? 0 : sideNavigation.panel?.getBoundingClientRect().width ?? 0;
  const nativePanelWidth = nativePanel?.getBoundingClientRect().right ?? 0;
  dashboard.style.setProperty("--freefeed-sidebar-width", `${Math.round(sidebarWidth)}px`);
  dashboard.style.setProperty("--freefeed-native-panel-width", `${Math.round(nativePanelWidth)}px`);
  document.documentElement.classList.toggle(LOCKED_CLASS, dashboardActive);
  document.body.classList.toggle(LOCKED_CLASS, dashboardActive);
  document.documentElement.classList.toggle(FEED_HIDDEN_CLASS, !feedVisible(location.pathname, settings));
  document.documentElement.classList.toggle(RESTRICTED_CLASS, Boolean(restriction));
  document.body.classList.toggle(RESTRICTED_CLASS, Boolean(restriction));
  currentMode = mode;
}

function scheduleUpdate() {
  if (updateScheduled) return;
  updateScheduled = true;
  queueMicrotask(() => {
    updateScheduled = false;
    applyRules();
  });
}

function canScroll(element) {
  for (let current = element instanceof Element ? element : null; current && current !== document.body; current = current.parentElement) {
    const style = getComputedStyle(current);
    if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) return true;
  }
  return false;
}

function blockPageScroll(event) {
  if (document.documentElement.classList.contains(LOCKED_CLASS) && !canScroll(event.target)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

function keepFocusInDashboard(event) {
  if (event.key !== "Tab" || currentMode === "native") return;
  const dashboard = document.getElementById(DASHBOARD_ID);
  if (!dashboard || findNativePanel() || findNativeDialog()) return;

  const focusable = Array.from(dashboard.querySelectorAll('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'))
    .filter((element) => !element.closest("[hidden]") && element.getBoundingClientRect().width > 0);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first) return;

  if (event.shiftKey && document.activeElement === first) last.focus();
  else if (!event.shiftKey && document.activeElement === last) first.focus();
  else if (!dashboard.contains(document.activeElement)) first.focus();
  else return;
  event.preventDefault();
}

window.addEventListener("wheel", blockPageScroll, { capture: true, passive: false });
window.addEventListener("touchmove", blockPageScroll, { capture: true, passive: false });
document.addEventListener("keydown", keepFocusInDashboard, true);

const pageObserver = new MutationObserver(scheduleUpdate);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  let changed = false;
  let lockActivated = false;
  const changedSettings = {};

  for (const [key, change] of Object.entries(changes)) {
    if (key === INSTAGRAM_UNLOCK_KEY) {
      instagramUnlockUntil = activeUnlockDeadline(change.newValue);
      lockActivated = !instagramUnlockUntil;
      permittedNativeAction = null;
      nativeActionOpeningUntil = 0;
      scheduleUnlockExpiry();
      changed = true;
      continue;
    }
    if (!(key in DEFAULT_SETTINGS)) continue;
    settings[key] = typeof change.newValue === "boolean" ? change.newValue : DEFAULT_SETTINGS[key];
    changedSettings[key] = settings[key];
    changed = true;
  }

  if (!changed) return;
  const exitRestriction = !instagramUnlockUntil && (lockActivated
    ? routeRestriction(location.pathname, settings)
    : newlyDisabledRoute(location.pathname, settings, changedSettings));
  if (exitRestriction) {
    location.replace("/");
    return;
  }
  dashboardSignature = "";
  applyRules();
});

async function startFreeFeed() {
  const storageDefaults = { ...DEFAULT_SETTINGS, [INSTAGRAM_UNLOCK_KEY]: 0 };
  const storedSettings = chrome.storage.local.get(storageDefaults).catch((error) => {
    console.error("FreeFeed could not load its settings.", error);
    return storageDefaults;
  });

  try {
    if (!document.body) {
      await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          if (!document.body) return;
          observer.disconnect();
          resolve();
        });
        observer.observe(document.documentElement, { childList: true });
      });
    }

    const stored = await storedSettings;
    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
      settings[key] = typeof stored[key] === "boolean" ? stored[key] : defaultValue;
    }
    instagramUnlockUntil = activeUnlockDeadline(stored[INSTAGRAM_UNLOCK_KEY]);
    scheduleUnlockExpiry();
    pageObserver.observe(document.body, { childList: true, subtree: true });
    setTimeout(scheduleUpdate, 3000);
    applyRules();
  } finally {
    document.documentElement.classList.remove(LOADING_CLASS);
  }
}

startFreeFeed();
