const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = vm.createContext({});
const settingsSource = fs.readFileSync(path.join(__dirname, "..", "extension", "settings.js"), "utf8");
vm.runInContext(settingsSource, context);

function run(expression, values = {}) {
  Object.assign(context, values);
  return vm.runInContext(expression, context);
}

test("creates deadlines only for supported unlock durations", () => {
  assert.equal(run("unlockDeadline(duration, now)", { duration: 2, now: 1_000 }), 121_000);
  assert.equal(run("unlockDeadline(duration, now)", { duration: 5, now: 1_000 }), 301_000);
  assert.equal(run("unlockDeadline(duration, now)", { duration: 15, now: 1_000 }), 901_000);
  assert.equal(run("unlockDeadline(duration, now)", { duration: 10, now: 1_000 }), 0);
});

test("accepts only finite future unlock deadlines", () => {
  assert.equal(run("activeUnlockDeadline(value, now)", { value: 20_000, now: 10_000 }), 20_000);
  assert.equal(run("activeUnlockDeadline(value, now)", { value: 10_000, now: 10_000 }), 0);
  assert.equal(run("activeUnlockDeadline(value, now)", { value: Infinity, now: 10_000 }), 0);
  assert.equal(run("activeUnlockDeadline(value, now)", { value: "20000", now: 10_000 }), 0);
});

test("remaining unlock time reaches zero at expiry", () => {
  assert.equal(run("remainingUnlockMilliseconds(value, now)", { value: 20_000, now: 12_500 }), 7_500);
  assert.equal(run("remainingUnlockMilliseconds(value, now)", { value: 20_000, now: 20_000 }), 0);
  assert.equal(run("remainingUnlockMilliseconds(value, now)", { value: 20_000, now: 30_000 }), 0);
});

test("normal Instagram can only be unlocked from the popup", () => {
  const content = fs.readFileSync(path.join(__dirname, "..", "extension", "content.js"), "utf8");
  const popup = fs.readFileSync(path.join(__dirname, "..", "extension", "popup.html"), "utf8");

  assert.doesNotMatch(content, /Switch to normal Instagram|data-freefeed-switch/);
  assert.match(popup, /data-unlock/);
  assert.match(popup, /value="2"/);
  assert.match(popup, /value="5"/);
  assert.match(popup, /value="15"/);
});

test("unlock expiry revokes native dialogs and panels", () => {
  const content = fs.readFileSync(path.join(__dirname, "..", "extension", "content.js"), "utf8");

  assert.match(content, /instagramUnlockUntil = 0;\s+permittedNativeAction = null;\s+nativeActionOpeningUntil = 0;/);
  assert.match(content, /const nativeActionPermitted = dashboardActive && Boolean\(permittedNativeAction\)/);
  assert.match(content, /findNativeActionSurfaces\(permittedNativeAction\)/);
});

test("notifications keep the FreeFeed home visible beside Instagram's panel", () => {
  const content = fs.readFileSync(path.join(__dirname, "..", "extension", "content.js"), "utf8");

  assert.match(content, /if \(actionName === "notifications" && detectedDialog\) \{\s+return \{ nativeDialog: null, nativePanel: detectedDialog \};/);
  assert.match(content, /dashboard\.classList\.toggle\(NATIVE_DIALOG_CLASS, Boolean\(nativeDialog\)\)/);
  assert.match(content, /const nativePanelWidth = nativePanel\?\.getBoundingClientRect\(\)\.right \?\? 0/);
  assert.match(content, /!element\.contains\(nativePanel\)/);
});

test("unlock expiry is centrally scheduled and reconciled when tabs wake", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "extension", "manifest.json"), "utf8"));
  const background = fs.readFileSync(path.join(__dirname, "..", "extension", "background.js"), "utf8");
  const content = fs.readFileSync(path.join(__dirname, "..", "extension", "content.js"), "utf8");

  assert.ok(manifest.permissions.includes("alarms"));
  assert.match(background, /chrome\.alarms\.create\(INSTAGRAM_UNLOCK_ALARM, \{ when: value \}\)/);
  assert.match(background, /chrome\.alarms\.onAlarm\.addListener/);
  assert.match(background, /chrome\.storage\.local\.remove\(INSTAGRAM_UNLOCK_KEY\)/);
  assert.match(content, /window\.addEventListener\("pageshow", reconcilePageState\)/);
  assert.match(content, /document\.addEventListener\("visibilitychange"/);
  assert.match(content, /window\.navigation\?\.addEventListener\("navigatesuccess", reconcilePageState\)/);
});

test("temporary access clearly applies to every open tab", () => {
  const popup = fs.readFileSync(path.join(__dirname, "..", "extension", "popup.html"), "utf8");
  assert.match(popup, /normal Instagram in every open tab/);
});

test("settings use the proven pre-audit storage refresh path", () => {
  const content = fs.readFileSync(path.join(__dirname, "..", "extension", "content.js"), "utf8");
  const popup = fs.readFileSync(path.join(__dirname, "..", "extension", "popup.js"), "utf8");
  const options = fs.readFileSync(path.join(__dirname, "..", "extension", "options.js"), "utf8");

  assert.match(options, /await chrome\.storage\.local\.set\(\{ \[checkbox\.dataset\.setting\]: false \}\)/);
  assert.match(options, /await chrome\.storage\.local\.set\(\{ \[checkbox\.dataset\.setting\]: true \}\)/);
  assert.match(content, /chrome\.storage\.onChanged\.addListener/);
  assert.match(content, /dashboardSignature = "";\s+applyRules\(\)/);
  assert.doesNotMatch(content, /chrome\.runtime\.onMessage|navigationCache/);
  assert.doesNotMatch(popup, /chrome\.tabs\.sendMessage/);
});

test("high-distraction features are unavailable by default", () => {
  const defaults = run("DEFAULT_SETTINGS");

  assert.equal(defaults.allowFeed, false);
  assert.equal(defaults.allowReels, false);
  assert.equal(defaults.allowProfessionalDashboard, undefined);
});

test("enabling requires the delay, acknowledgement, and exact phrase", () => {
  const phrase = run("enableConfirmationPhrase(name)", { name: "Reels" });

  assert.equal(phrase, "ENABLE REELS");
  assert.equal(run("enableConfirmationReady(availableAt, true, phrase, phrase, now)", { availableAt: 20_000, phrase, now: 19_999 }), false);
  assert.equal(run("enableConfirmationReady(availableAt, false, phrase, phrase, now)", { availableAt: 20_000, phrase, now: 20_000 }), false);
  assert.equal(run("enableConfirmationReady(availableAt, true, 'enable reels', phrase, now)", { availableAt: 20_000, phrase, now: 20_000 }), false);
  assert.equal(run("enableConfirmationReady(availableAt, true, phrase, phrase, now)", { availableAt: 20_000, phrase, now: 20_000 }), true);
});

test("professional dashboard is optional and always allowed when Instagram exposes it", () => {
  const content = fs.readFileSync(path.join(__dirname, "..", "extension", "content.js"), "utf8");
  const options = fs.readFileSync(path.join(__dirname, "..", "extension", "options.html"), "utf8");
  const welcome = fs.readFileSync(path.join(__dirname, "..", "extension", "welcome.html"), "utf8");

  assert.match(content, /\{ name: "professionalDashboard", label: "Dashboard", nav: "professionalDashboard", row: "secondary", optional: true \}/);
  assert.doesNotMatch(content, /professionalDashboard: "allowProfessionalDashboard"/);
  assert.match(content, /panel\.querySelector\('a\[href\^="\/professional_dashboard"\], a\[href\^="\/ad_tools"\]'\)/);
  assert.doesNotMatch(content, /professionalDashboard:[^\n]*beforeProfile/);
  assert.doesNotMatch(options, /Professional dashboard|allowProfessionalDashboard/i);
  assert.doesNotMatch(welcome, /Professional dashboard/i);
});

test("settings page makes disabling immediate and enabling deliberate", () => {
  const options = fs.readFileSync(path.join(__dirname, "..", "extension", "options.js"), "utf8");
  const page = fs.readFileSync(path.join(__dirname, "..", "extension", "options.html"), "utf8");

  assert.match(options, /checkbox\.checked = false;\s+openEnableDialog\(checkbox\);\s+return;/);
  assert.match(options, /FEATURE_ENABLE_DELAY_MS/);
  assert.match(page, /data-enable-acknowledgement/);
  assert.match(page, /data-enable-confirmation/);
  assert.match(page, /data-enable-submit disabled/);
});

test("permanent activity controls live only on the dedicated settings page", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "extension", "manifest.json"), "utf8"));
  const popup = fs.readFileSync(path.join(__dirname, "..", "extension", "popup.html"), "utf8");
  const popupScript = fs.readFileSync(path.join(__dirname, "..", "extension", "popup.js"), "utf8");
  const options = fs.readFileSync(path.join(__dirname, "..", "extension", "options.html"), "utf8");

  assert.equal(manifest.options_page, "options.html");
  assert.doesNotMatch(popup, /data-setting=/);
  assert.match(popup, />Settings<|>Settings<\/a>/);
  assert.match(popup, />Privacy Policy<\/a>/);
  assert.match(popup, />About<\/a>/);
  assert.match(popupScript, /chrome\.runtime\.openOptionsPage\(\)/);
  for (const key of Object.keys(run("DEFAULT_SETTINGS"))) {
    assert.match(options, new RegExp(`data-setting="${key}"`));
  }
});

test("popup links to the privacy policy and keeps About inside the popup", () => {
  const popup = fs.readFileSync(path.join(__dirname, "..", "extension", "popup.html"), "utf8");
  const popupScript = fs.readFileSync(path.join(__dirname, "..", "extension", "popup.js"), "utf8");
  const privacy = fs.readFileSync(path.join(__dirname, "..", "extension", "privacy.html"), "utf8");

  assert.match(popup, /href="privacy\.html" target="_blank"/);
  assert.match(popup, /data-popup-view="about" hidden/);
  assert.match(popup, /data-about-back/);
  assert.match(popup, /data-open-about/);
  assert.match(popup, /I designed this software to soften the overwhelming control/);
  assert.match(popup, /href="https:\/\/github\.com\/ronanrocking\/FreeFeed"/);
  assert.match(popup, /What the worthy endeavor requires is planning, effort, attentiveness, and the willingness to clean up/);
  assert.match(popupScript, /showPopupView\("about"\)/);
  assert.match(popupScript, /showPopupView\("main"\)/);
  assert.match(popupScript, /Active · restrictions enforced/);
  assert.match(popupScript, /Paused · normal Instagram/);
  assert.match(popupScript, /Inactive · protection status unavailable/);
  assert.match(privacy, /No analytics, advertising trackers, or telemetry are included/);
  assert.match(privacy, /Chrome Web Store Limited Use/);
  assert.match(privacy, /mailto:ronanrocking@gmail\.com/);
});

test("settings links back to welcome and opens About in the popup", () => {
  const options = fs.readFileSync(path.join(__dirname, "..", "extension", "options.html"), "utf8");
  const optionsScript = fs.readFileSync(path.join(__dirname, "..", "extension", "options.js"), "utf8");

  assert.match(options, /class="header-inner" href="welcome\.html"/);
  assert.match(options, /<footer class="settings-footer">/);
  assert.match(options, /href="privacy\.html">Privacy Policy/);
  assert.match(options, /data-open-about>About/);
  assert.match(options, /href="https:\/\/github\.com\/ronanrocking\/FreeFeed"/);
  assert.match(optionsScript, /const setViewRequest = chrome\.storage\.session\.set\(\{ \[POPUP_INITIAL_VIEW_KEY\]: "about" \}\)/);
  assert.match(optionsScript, /const openPopupRequest = chrome\.action\.openPopup\(\)/);
  assert.match(optionsScript, /Promise\.all\(\[setViewRequest, openPopupRequest\]\)/);
});

test("each refresh rediscovers and reclones live sidebar icons", () => {
  const content = fs.readFileSync(path.join(__dirname, "..", "extension", "content.js"), "utf8");

  assert.match(content, /const sideNavigation = findSideNavigation\(\)/);
  assert.match(content, /Boolean\(cloneVisual\(action, sideNavigation\)\)/);
  assert.match(content, /queueMicrotask/);
  assert.doesNotMatch(content, /requestAnimationFrame/);
});

test("disabling the current restricted route exits before applying DOM rules", () => {
  const content = fs.readFileSync(path.join(__dirname, "..", "extension", "content.js"), "utf8");

  assert.match(content, /const exitRestriction = !instagramUnlockUntil && sessionState !== "signed-out" && \(lockActivated\s+\? routeRestriction\(location\.pathname, settings\)\s+: newlyDisabledRoute\(location\.pathname, settings, changedSettings\)\);/);
  assert.match(content, /if \(exitRestriction\) \{\s+location\.replace\("\/"\);\s+return;/);
});

test("unlock expiry safely exits a route that becomes restricted", () => {
  const content = fs.readFileSync(path.join(__dirname, "..", "extension", "content.js"), "utf8");

  assert.match(content, /if \(routeRestrictionForSession\(location\.pathname, settings, currentInstagramSessionState\(\)\)\) \{\s+location\.replace\("\/"\);\s+return;\s+\}\s+dashboardSignature = "";/);
});
