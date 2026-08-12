const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = vm.createContext({});
const settingsSource = fs.readFileSync(path.join(__dirname, "..", "extension", "settings.js"), "utf8");
vm.runInContext(settingsSource, context);

function restriction(pathname, overrides = {}) {
  context.pathname = pathname;
  context.overrides = overrides;
  return vm.runInContext("routeRestriction(pathname, { ...DEFAULT_SETTINGS, ...overrides })", context);
}

function showsFeed(pathname, overrides = {}) {
  context.pathname = pathname;
  context.overrides = overrides;
  return vm.runInContext("feedVisible(pathname, { ...DEFAULT_SETTINGS, ...overrides })", context);
}

function disabledByChange(pathname, overrides = {}, changedSettings = {}) {
  context.pathname = pathname;
  context.overrides = overrides;
  context.changedSettings = changedSettings;
  return vm.runInContext("newlyDisabledRoute(pathname, { ...DEFAULT_SETTINGS, ...overrides }, changedSettings)", context);
}

function sessionState(pathname, signedOutSurface = false, signedInSurface = false) {
  context.pathname = pathname;
  context.signedOutSurface = signedOutSurface;
  context.signedInSurface = signedInSurface;
  return vm.runInContext("instagramSessionState(pathname, signedOutSurface, signedInSurface)", context);
}

function showsFreeFeedHome(pathname, state, previousMode = "native") {
  context.pathname = pathname;
  context.state = state;
  context.previousMode = previousMode;
  return vm.runInContext("freeFeedHomeAvailable(pathname, state, previousMode)", context);
}

function notificationsKeepHome(pathname, state, nativeAction) {
  context.pathname = pathname;
  context.state = state;
  context.nativeAction = nativeAction;
  return vm.runInContext("notificationPanelKeepsHome(pathname, state, nativeAction)", context);
}

test("allows ordinary Instagram routes", () => {
  assert.equal(restriction("/"), null);
  assert.equal(restriction("/some-profile/"), null);
  assert.equal(restriction("/p/example/"), null);
});

test("controls only the homepage feed", () => {
  assert.equal(showsFeed("/"), false);
  assert.equal(showsFeed("/", { allowFeed: true }), true);
  assert.equal(showsFeed("/", { allowFeed: false }), false);
  assert.equal(showsFeed("/some-profile/", { allowFeed: false }), true);
});

test("blocks both Reel URL forms by default", () => {
  assert.equal(restriction("/reels/").setting, "allowReels");
  assert.equal(restriction("/reels/example/").setting, "allowReels");
  assert.equal(restriction("/reel/example/").setting, "allowReels");
  assert.equal(restriction("/reels/", { allowReels: true }), null);
});

test("enforces disabled route-based activities", () => {
  assert.equal(restriction("/direct/inbox/", { allowMessages: false }).setting, "allowMessages");
  assert.equal(restriction("/explore/", { allowSearch: false }).setting, "allowSearch");
  assert.equal(restriction("/stories/example/", { allowStories: false }).setting, "allowStories");
});

test("allows enabled route-based activities", () => {
  assert.equal(restriction("/direct/inbox/"), null);
  assert.equal(restriction("/explore/"), null);
  assert.equal(restriction("/stories/example/"), null);
  assert.equal(restriction("/ad_tools/"), null);
  assert.equal(restriction("/ad_tools/", { allowProfessionalDashboard: false }), null);
});

test("recognizes authentication and account-recovery routes", () => {
  assert.equal(sessionState("/accounts/login/"), "signed-out");
  assert.equal(sessionState("/accounts/password/reset/"), "signed-out");
  assert.equal(sessionState("/challenge/example/"), "signed-out");
  assert.equal(sessionState("/checkpoint/example/"), "signed-out");
});

test("requires positive authentication evidence before replacing the root page", () => {
  assert.equal(sessionState("/"), "unknown");
  assert.equal(sessionState("/", true, false), "signed-out");
  assert.equal(sessionState("/", false, true), "signed-in");
  assert.equal(sessionState("/", true, true), "signed-out");
});

test("preserves a confirmed FreeFeed home through transient unknown Instagram UI", () => {
  assert.equal(showsFreeFeedHome("/", "signed-in", "native"), true);
  assert.equal(showsFreeFeedHome("/", "unknown", "home"), true);
  assert.equal(showsFreeFeedHome("/", "unknown", "native"), false);
  assert.equal(showsFreeFeedHome("/", "signed-out", "home"), false);
  assert.equal(showsFreeFeedHome("/explore/", "signed-in", "home"), false);
});

test("keeps notifications beside home when Instagram navigation signals disappear", () => {
  assert.equal(notificationsKeepHome("/", "signed-in", "notifications"), true);
  assert.equal(notificationsKeepHome("/", "unknown", "notifications"), true);
  assert.equal(notificationsKeepHome("/", "signed-out", "notifications"), false);
  assert.equal(notificationsKeepHome("/", "unknown", "search"), false);
  assert.equal(notificationsKeepHome("/explore/", "signed-in", "notifications"), false);
});

test("signed-out surfaces override restrictions so login remains usable", () => {
  context.pathname = "/reels/";
  assert.equal(vm.runInContext(
    "routeRestrictionForSession(pathname, DEFAULT_SETTINGS, 'signed-out')",
    context
  ), null);
  assert.equal(vm.runInContext(
    "routeRestrictionForSession(pathname, DEFAULT_SETTINGS, 'unknown').setting",
    context
  ), "allowReels");
});

test("exits only when the active route was just disabled", () => {
  assert.equal(disabledByChange("/direct/inbox/", { allowMessages: false }, { allowMessages: false }).setting, "allowMessages");
  assert.equal(disabledByChange("/explore/", { allowSearch: false }, { allowSearch: false }).setting, "allowSearch");
  assert.equal(disabledByChange("/direct/inbox/", { allowMessages: false }, { allowStories: false }), null);
  assert.equal(disabledByChange("/some-profile/", {}, { allowMessages: false }), null);
});
