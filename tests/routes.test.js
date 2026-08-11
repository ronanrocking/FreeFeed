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

test("allows ordinary Instagram routes", () => {
  assert.equal(restriction("/"), null);
  assert.equal(restriction("/some-profile/"), null);
  assert.equal(restriction("/p/example/"), null);
});

test("controls only the homepage feed", () => {
  assert.equal(showsFeed("/"), true);
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
  assert.equal(restriction("/ad_tools/", { allowProfessionalDashboard: false }).setting, "allowProfessionalDashboard");
});

test("allows enabled route-based activities", () => {
  assert.equal(restriction("/direct/inbox/"), null);
  assert.equal(restriction("/explore/"), null);
  assert.equal(restriction("/stories/example/"), null);
  assert.equal(restriction("/ad_tools/"), null);
});
