const extensionStatus = document.querySelector(".extension-status");
const extensionStatusText = document.querySelector("[data-extension-status]");

function renderWelcomeStatus(unlockUntil) {
  const paused = remainingUnlockMilliseconds(unlockUntil) > 0;
  extensionStatus.dataset.state = paused ? "paused" : "active";
  extensionStatusText.textContent = paused ? "Paused" : "Active";
}

async function loadWelcomeStatus() {
  try {
    const stored = await chrome.storage.local.get({ [INSTAGRAM_UNLOCK_KEY]: 0 });
    renderWelcomeStatus(stored[INSTAGRAM_UNLOCK_KEY]);
  } catch (error) {
    console.error("FreeFeed could not confirm its status.", error);
    extensionStatus.dataset.state = "inactive";
    extensionStatusText.textContent = "Inactive";
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[INSTAGRAM_UNLOCK_KEY]) return;
  renderWelcomeStatus(changes[INSTAGRAM_UNLOCK_KEY].newValue);
});

void loadWelcomeStatus();
