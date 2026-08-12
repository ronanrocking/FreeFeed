const INSTAGRAM_UNLOCK_KEY = "instagramUnlockUntil";
const INSTAGRAM_UNLOCK_ALARM = "freefeed-instagram-unlock-expiry";

async function scheduleUnlockExpiryAlarm(value) {
  await chrome.alarms.clear(INSTAGRAM_UNLOCK_ALARM);

  if (typeof value === "number" && Number.isFinite(value) && value > Date.now()) {
    chrome.alarms.create(INSTAGRAM_UNLOCK_ALARM, { when: value });
    return;
  }

  if (value !== undefined && value !== 0) {
    await chrome.storage.local.remove(INSTAGRAM_UNLOCK_KEY);
  }
}

async function restoreUnlockExpiryAlarm() {
  const stored = await chrome.storage.local.get({ [INSTAGRAM_UNLOCK_KEY]: 0 });
  await scheduleUnlockExpiryAlarm(stored[INSTAGRAM_UNLOCK_KEY]);
}

function restoreUnlockExpiryAlarmSafely() {
  void restoreUnlockExpiryAlarm().catch((error) => {
    console.error("FreeFeed could not synchronize temporary access expiry.", error);
  });
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  restoreUnlockExpiryAlarmSafely();
  if (reason !== "install") return;

  void chrome.tabs.create({
    url: chrome.runtime.getURL("welcome.html")
  });
});

chrome.runtime.onStartup.addListener(() => {
  restoreUnlockExpiryAlarmSafely();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[INSTAGRAM_UNLOCK_KEY]) return;
  void scheduleUnlockExpiryAlarm(changes[INSTAGRAM_UNLOCK_KEY].newValue).catch((error) => {
    console.error("FreeFeed could not update temporary access expiry.", error);
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== INSTAGRAM_UNLOCK_ALARM) return;
  restoreUnlockExpiryAlarmSafely();
});

restoreUnlockExpiryAlarmSafely();
