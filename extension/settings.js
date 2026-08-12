const DEFAULT_SETTINGS = {
  allowFeed: false,
  allowMessages: true,
  allowReels: false,
  allowSearch: true,
  allowNotifications: true,
  allowCreate: true,
  allowStories: true
};

const INSTAGRAM_UNLOCK_KEY = "instagramUnlockUntil";
const POPUP_INITIAL_VIEW_KEY = "popupInitialView";
const UNLOCK_DURATION_OPTIONS = Object.freeze([2, 5, 15]);
const FEATURE_ENABLE_DELAY_MS = 10_000;

function enableConfirmationPhrase(featureName) {
  return `ENABLE ${featureName.toLocaleUpperCase("en-US")}`;
}

function enableConfirmationReady(availableAt, acknowledged, typedValue, expectedPhrase, now = Date.now()) {
  return now >= availableAt && acknowledged && typedValue.trim() === expectedPhrase;
}

function unlockDeadline(durationMinutes, now = Date.now()) {
  return UNLOCK_DURATION_OPTIONS.includes(durationMinutes)
    ? now + durationMinutes * 60 * 1000
    : 0;
}

function activeUnlockDeadline(value, now = Date.now()) {
  return typeof value === "number" && Number.isFinite(value) && value > now ? value : 0;
}

function remainingUnlockMilliseconds(value, now = Date.now()) {
  return Math.max(0, activeUnlockDeadline(value, now) - now);
}

const ROUTE_RESTRICTIONS = [
  { setting: "allowReels", pattern: /^\/reels?(?:\/|$)/, title: "Reels are blocked", message: "FreeFeed is keeping you out of the Reels feed." },
  { setting: "allowStories", pattern: /^\/stories(?:\/|$)/, title: "Stories are turned off", message: "Stories are disabled in your FreeFeed settings." },
  { setting: "allowMessages", pattern: /^\/direct(?:\/|$)/, title: "Messages are turned off", message: "Messages are disabled in your FreeFeed settings." },
  { setting: "allowSearch", pattern: /^\/explore(?:\/|$)/, title: "Search is turned off", message: "Search and Explore are disabled in your FreeFeed settings." }
];

const AUTHENTICATION_ROUTE_PATTERN = /^\/(?:accounts|challenge|checkpoint)(?:\/|$)/;

function isAuthenticationRoute(pathname) {
  return AUTHENTICATION_ROUTE_PATTERN.test(pathname);
}

function instagramSessionState(pathname, signedOutSurface, signedInSurface) {
  if (isAuthenticationRoute(pathname) || signedOutSurface) return "signed-out";
  if (signedInSurface) return "signed-in";
  return "unknown";
}

function freeFeedHomeAvailable(pathname, sessionState, previousMode = "native") {
  return pathname === "/"
    && sessionState !== "signed-out"
    && (sessionState === "signed-in" || previousMode === "home");
}

function notificationPanelKeepsHome(pathname, sessionState, nativeAction) {
  return pathname === "/"
    && sessionState !== "signed-out"
    && nativeAction === "notifications";
}

function routeRestriction(pathname, currentSettings = DEFAULT_SETTINGS) {
  return ROUTE_RESTRICTIONS.find(({ setting, pattern }) => !currentSettings[setting] && pattern.test(pathname)) ?? null;
}

function routeRestrictionForSession(pathname, currentSettings, sessionState) {
  return sessionState === "signed-out" ? null : routeRestriction(pathname, currentSettings);
}

function newlyDisabledRoute(pathname, currentSettings, changedSettings) {
  const restriction = routeRestriction(pathname, currentSettings);
  return restriction && changedSettings[restriction.setting] === false ? restriction : null;
}

function feedVisible(pathname, currentSettings = DEFAULT_SETTINGS) {
  return pathname !== "/" || currentSettings.allowFeed;
}
