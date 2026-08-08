const settings = { ...DEFAULT_SETTINGS };
const HIDDEN_CLASS = "freefeed-hidden";
const FEED_HIDDEN_CLASS = "freefeed-hide-feed";
const LOADING_CLASS = "freefeed-loading";
const DASHBOARD_ID = "freefeed-dashboard";
const ACTIVE_CLASS = "freefeed-active";
const NATIVE_DIALOG_CLASS = "freefeed-native-dialog-open";

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
  { name: "search", label: "Search", setting: "allowSearch", nav: "search", row: "primary" },
  { name: "notifications", label: "Notifications", setting: "allowNotifications", nav: "notifications", row: "primary" },
  { name: "create", label: "Create", setting: "allowCreate", nav: "create", row: "primary" },
  { name: "stories", label: "Stories", setting: "allowStories", row: "secondary" },
  { name: "reels", label: "Reels", setting: "allowReels", nav: "reels", row: "secondary", fallback: "/reels/" },
  { name: "professionalDashboard", label: "Dashboard", setting: "allowProfessionalDashboard", nav: "professionalDashboard", row: "secondary", optional: true },
  { name: "profile", label: "Profile", nav: "profile", row: "secondary" }
];

let unrestrictedMode = false;
let dashboardSignature = "";
let updateScheduled = false;

document.documentElement.classList.add(LOADING_CLASS);

function findControl(label, root = document) {
  return Array.from(root.querySelectorAll("[aria-label]"))
    .filter((element) => !element.closest(`#${DASHBOARD_ID}`))
    .find((element) => element.getAttribute("aria-label") === label)
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
  let panel = Object.values(core).filter(Boolean).length >= 2
    ? commonAncestor(Object.values(core))
    : null;

  while (panel && panel !== document.body) {
    if (findControl("Instagram", panel) && findControl("Settings", panel)) {
      break;
    }
    panel = panel.parentElement;
  }

  if (!panel || panel === document.body) {
    return { panel: null, items: {} };
  }

  const items = {
    instagramLogo: findControl("Instagram", panel),
    home: findControl("Home", panel),
    ...core,
    notifications: findControl("Notifications", panel),
    create: findControl("New post", panel),
    professionalDashboard: findControl("Professional dashboard", panel),
    settings: findControl("Settings", panel),
    alsoFromMeta: findControl("Also from Meta", panel)
  };
  const knownRoutes = new Set(["/", "/reels/", "/direct/inbox/", "/explore/"]);

  items.profile = Array.from(panel.querySelectorAll("a[href]"))
    .find((link) => {
      const href = link.getAttribute("href");
      return /^\/[^/]+\/$/.test(href) && !knownRoutes.has(href) && link.querySelector("img");
    }) ?? null;

  return { panel, items };
}

function firstStoryButton() {
  return document.querySelector('main [role="button"][aria-label^="Story by "]');
}

function storiesIcon(size = 32) {
  const wrapper = document.createElement("span");
  wrapper.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none"><circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="2"></circle><path d="m10 8.5 5.5 3.5-5.5 3.5v-7Z" fill="currentColor"></path></svg>`;
  return wrapper.firstElementChild;
}

function cloneVisual(action, sideNavigation, size = 32) {
  if (action.name === "stories") {
    return storiesIcon(size);
  }

  const source = sideNavigation.items[action.nav];
  const visual = source?.querySelector(action.name === "profile" ? "img" : "svg");

  if (!visual) {
    return null;
  }

  const clone = visual.cloneNode(true);
  clone.removeAttribute("class");
  clone.removeAttribute("aria-label");
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("width", size);
  clone.setAttribute("height", size);
  clone.querySelector("title")?.remove();

  if (clone.tagName === "IMG") {
    clone.alt = "";
  }

  return clone;
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
    <!--
      THESIS: A native Instagram task launcher replaces the feed without replacing Instagram.
      OWN-WORLD: Instagram's live theme, typography, spacing, and exact native action glyphs.
      STORY: Choose an allowed task, complete it natively, and return without entering the feed.
      FIRST VIEWPORT: A centered Instagram/FreeFeed mark above two quiet rows of task controls.
      FORM: Instagram-native Operate surface; canon pinned by the user.
      FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
    -->
    <div class="freefeed-content">
      <div class="freefeed-brand" aria-label="Instagram FreeFeed">
        <span class="freefeed-brand-icon" aria-hidden="true"></span>
        <span class="freefeed-brand-divider" aria-hidden="true"></span>
        <span class="freefeed-brand-name">FreeFeed</span>
      </div>
      <div class="freefeed-actions" data-freefeed-row="primary"></div>
      <div class="freefeed-actions freefeed-actions-secondary" data-freefeed-row="secondary"></div>
    </div>
    <button class="freefeed-switch" type="button">Switch to normal Instagram</button>
  `;
  dashboard.addEventListener("click", handleDashboardClick);
  dashboard.querySelector(".freefeed-switch").addEventListener("click", () => {
    unrestrictedMode = true;
    applyRules();
  });
  document.body.append(dashboard);
  return dashboard;
}

function brandIcon(sideNavigation) {
  const svg = sideNavigation.items.instagramLogo?.querySelector("svg")?.cloneNode(true);

  if (!svg) {
    return null;
  }

  svg.removeAttribute("class");
  svg.removeAttribute("aria-label");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "42");
  svg.setAttribute("height", "42");
  svg.setAttribute("fill", "url(#freefeed-instagram-gradient)");
  svg.querySelector("title")?.remove();
  svg.insertAdjacentHTML("afterbegin", `<defs><radialGradient id="freefeed-instagram-gradient" cx="30%" cy="105%" r="120%"><stop offset="0" stop-color="#ffd600"></stop><stop offset=".32" stop-color="#ff7a00"></stop><stop offset=".58" stop-color="#ff0169"></stop><stop offset=".78" stop-color="#d300c5"></stop><stop offset="1" stop-color="#7638fa"></stop></radialGradient></defs>`);
  return svg;
}

function renderDashboard(dashboard, sideNavigation) {
  const activeActions = ACTIONS.filter((action) => {
    if (action.setting && !settings[action.setting]) {
      return false;
    }
    return !action.optional || sideNavigation.items[action.nav];
  });
  const signature = JSON.stringify({
    actions: activeActions.map((action) => [
      action.name,
      Boolean(cloneVisual(action, sideNavigation)),
      actionAvailable(action, sideNavigation)
    ]),
    logo: Boolean(sideNavigation.items.instagramLogo),
    profile: sideNavigation.items.profile?.querySelector("img")?.src
  });

  if (signature === dashboardSignature) {
    return;
  }
  dashboardSignature = signature;

  const brand = dashboard.querySelector(".freefeed-brand-icon");
  brand.replaceChildren(...[brandIcon(sideNavigation)].filter(Boolean));

  for (const row of ["primary", "secondary"]) {
    const container = dashboard.querySelector(`[data-freefeed-row="${row}"]`);
    const buttons = activeActions.filter((action) => action.row === row).map((action) => {
      const button = document.createElement("button");
      const visual = cloneVisual(action, sideNavigation);
      button.className = "freefeed-action";
      button.type = "button";
      button.dataset.freefeedAction = action.name;
      button.setAttribute("aria-label", action.label);
      button.title = action.label;
      button.disabled = !visual || !actionAvailable(action, sideNavigation);
      if (visual) button.append(visual);
      button.append(Object.assign(document.createElement("span"), { textContent: action.label }));
      return button;
    });
    container.replaceChildren(...buttons);
  }
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
    control.click();
    if (action.name === "create") {
      (await waitForControl("Post"))?.click();
    }
  } else if (action.fallback) {
    location.assign(action.fallback);
  }
}

function handleDashboardClick(event) {
  const button = event.target.closest("[data-freefeed-action]");
  const action = ACTIONS.find((candidate) => candidate.name === button?.dataset.freefeedAction);
  if (action) openAction(action, findSideNavigation());
}

function setVisible(element, visible) {
  element?.classList.toggle(HIDDEN_CLASS, !visible);
}

function findNotificationPanel() {
  const heading = Array.from(document.querySelectorAll('[role="heading"]'))
    .find((element) => element.textContent.trim() === "Notifications");

  for (let element = heading; element && element !== document.body; element = element.parentElement) {
    const rect = element.getBoundingClientRect();
    if (rect.left === 0 && rect.width >= 320 && rect.width <= 600 && rect.height >= innerHeight * 0.8) {
      return element;
    }
  }
  return null;
}

function applyRules() {
  const sideNavigation = findSideNavigation();
  const dashboard = document.getElementById(DASHBOARD_ID) ?? createDashboard();
  const isHome = location.pathname === "/";
  const dashboardActive = isHome && !unrestrictedMode;
  const navigationReady = Boolean(sideNavigation.panel
    && sideNavigation.items.instagramLogo
    && sideNavigation.items.notifications
    && sideNavigation.items.create);

  if (navigationReady) {
    setVisible(sideNavigation.panel, unrestrictedMode || !isHome);
    for (const [item, setting] of Object.entries(NAV_SETTINGS)) {
      setVisible(sideNavigation.items[item], unrestrictedMode || settings[setting]);
    }
    renderDashboard(dashboard, sideNavigation);
  }

  const sidebarWidth = dashboardActive
    ? 0
    : sideNavigation.panel?.getBoundingClientRect().width ?? 0;
  const notificationWidth = findNotificationPanel()?.getBoundingClientRect().right ?? 0;
  const nativeDialogOpen = Array.from(document.querySelectorAll('[role="dialog"]'))
    .some((dialog) => !dialog.closest(`#${DASHBOARD_ID}`));
  dashboard.style.setProperty("--freefeed-sidebar-width", `${Math.round(sidebarWidth)}px`);
  dashboard.style.setProperty("--freefeed-native-panel-width", `${Math.round(notificationWidth)}px`);
  dashboard.classList.toggle(ACTIVE_CLASS, dashboardActive);
  dashboard.classList.toggle(NATIVE_DIALOG_CLASS, nativeDialogOpen);
  document.documentElement.classList.toggle(FEED_HIDDEN_CLASS, dashboardActive);
  document.body.classList.toggle(FEED_HIDDEN_CLASS, dashboardActive);
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
    if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) {
      return true;
    }
  }
  return false;
}

function blockFeedScroll(event) {
  if (document.documentElement.classList.contains(FEED_HIDDEN_CLASS) && !canScroll(event.target)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

window.addEventListener("wheel", blockFeedScroll, { capture: true, passive: false });
window.addEventListener("touchmove", blockFeedScroll, { capture: true, passive: false });

const pageObserver = new MutationObserver(scheduleUpdate);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  let changed = false;

  for (const [key, change] of Object.entries(changes)) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    settings[key] = typeof change.newValue === "boolean" ? change.newValue : DEFAULT_SETTINGS[key];
    changed = true;
  }
  if (changed) {
    dashboardSignature = "";
    applyRules();
  }
});

async function startFreeFeed() {
  const storedSettings = chrome.storage.local.get(DEFAULT_SETTINGS)
    .catch((error) => {
      console.error("FreeFeed could not load its settings.", error);
      return DEFAULT_SETTINGS;
    });

  try {
    if (!document.body) {
      await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          if (document.body) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(document.documentElement, { childList: true });
      });
    }

    Object.assign(settings, await storedSettings);
    pageObserver.observe(document.body, { childList: true, subtree: true });
    applyRules();
  } finally {
    document.documentElement.classList.remove(LOADING_CLASS);
  }
}

startFreeFeed();
