const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const extensionRoot = path.join(__dirname, "..", "extension");

test("opens the welcome page only on a first installation", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, "manifest.json"), "utf8"));
  const background = fs.readFileSync(path.join(extensionRoot, "background.js"), "utf8");

  assert.equal(manifest.background.service_worker, "background.js");
  assert.deepEqual(manifest.permissions, ["storage", "alarms"]);
  assert.match(background, /chrome\.runtime\.onInstalled\.addListener/);
  assert.match(background, /reason !== "install"/);
  assert.match(background, /chrome\.tabs\.create/);
  assert.match(background, /chrome\.runtime\.getURL\("welcome\.html"\)/);
});

test("welcome page presents the real setup and all first-run actions", () => {
  const welcome = fs.readFileSync(path.join(extensionRoot, "welcome.html"), "utf8");

  assert.match(welcome, /Instagram, with less pull\./);
  assert.match(welcome, /href="https:\/\/www\.instagram\.com\/">Open Instagram/);
  assert.match(welcome, /href="options\.html">Review settings/);
  assert.match(welcome, /<strong>Feed<\/strong>[\s\S]*?<span class="blocked-state">Blocked<\/span>/);
  assert.match(welcome, /<strong>Reels<\/strong>[\s\S]*?<span class="blocked-state">Blocked<\/span>/);
  assert.match(welcome, /<strong>Professional dashboard<\/strong>[\s\S]*?<span class="blocked-state">Blocked<\/span>/);
  assert.doesNotMatch(welcome, /How FreeFeed works/);
  assert.match(welcome, /class="extension-status" data-state="active"/);
  assert.match(welcome, /class="blocked-state">Blocked/);
  assert.match(welcome, /has no analytics or advertising trackers/);
  assert.match(welcome, /href="privacy\.html"/);
  assert.match(welcome, /href="https:\/\/github\.com\/ronanrocking\/FreeFeed"/);
  assert.match(welcome, /About is available from the extension popup/);
});

test("welcome status reflects active, paused, and inactive states", () => {
  const welcomeScript = fs.readFileSync(path.join(extensionRoot, "welcome.js"), "utf8");

  assert.match(welcomeScript, /paused \? "paused" : "active"/);
  assert.match(welcomeScript, /paused \? "Paused" : "Active"/);
  assert.match(welcomeScript, /dataset\.state = "inactive"/);
  assert.match(welcomeScript, /textContent = "Inactive"/);
});
