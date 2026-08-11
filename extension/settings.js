const DEFAULT_SETTINGS = {
  allowFeed: true,
  allowMessages: true,
  allowReels: false,
  allowSearch: true,
  allowNotifications: true,
  allowCreate: true,
  allowStories: true,
  allowProfessionalDashboard: true
};

const ROUTE_RESTRICTIONS = [
  { setting: "allowReels", pattern: /^\/reels?(?:\/|$)/, title: "Reels are blocked", message: "FreeFeed is keeping you out of the Reels feed." },
  { setting: "allowStories", pattern: /^\/stories(?:\/|$)/, title: "Stories are turned off", message: "Stories are disabled in your FreeFeed settings." },
  { setting: "allowMessages", pattern: /^\/direct(?:\/|$)/, title: "Messages are turned off", message: "Messages are disabled in your FreeFeed settings." },
  { setting: "allowSearch", pattern: /^\/explore(?:\/|$)/, title: "Search is turned off", message: "Search and Explore are disabled in your FreeFeed settings." },
  { setting: "allowProfessionalDashboard", pattern: /^\/ad_tools(?:\/|$)/, title: "Dashboard is turned off", message: "The professional dashboard is disabled in your FreeFeed settings." }
];

function routeRestriction(pathname, currentSettings = DEFAULT_SETTINGS) {
  return ROUTE_RESTRICTIONS.find(({ setting, pattern }) => !currentSettings[setting] && pattern.test(pathname)) ?? null;
}

function feedVisible(pathname, currentSettings = DEFAULT_SETTINGS) {
  return pathname !== "/" || currentSettings.allowFeed;
}
