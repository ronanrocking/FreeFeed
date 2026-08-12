const durationRadios = document.querySelectorAll('input[name="unlock-duration"]');
const unlockButton = document.querySelector("[data-unlock]");
const unlockStatus = document.querySelector(".unlock-status");
const unlockStatusText = document.querySelector("[data-unlock-status]");
const saveStatus = document.querySelector(".save-status");
const settingsLink = document.querySelector("[data-open-settings]");
const mainView = document.querySelector('[data-popup-view="main"]');
const aboutView = document.querySelector('[data-popup-view="about"]');
const aboutLink = document.querySelector("[data-open-about]");
const aboutBackButton = document.querySelector("[data-about-back]");
let statusTimer;
let countdownTimer;
let instagramUnlockUntil = 0;
let popupStateError = false;

function showStatus(message, isError = false) {
  clearTimeout(statusTimer);
  saveStatus.textContent = message;
  saveStatus.classList.toggle("error", isError);
  if (!isError) statusTimer = setTimeout(() => saveStatus.textContent = "", 1200);
}

function formatRemaining(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function renderUnlockState() {
  clearTimeout(countdownTimer);
  if (popupStateError) return;
  const remaining = remainingUnlockMilliseconds(instagramUnlockUntil);
  const unlocked = remaining > 0;

  unlockStatus.dataset.state = unlocked ? "paused" : "active";
  unlockStatusText.textContent = unlocked
    ? `Paused · normal Instagram · ${formatRemaining(remaining)} remaining`
    : "Active · restrictions enforced";
  unlockButton.textContent = unlocked ? "Lock Instagram now" : "Unlock Instagram";
  for (const radio of durationRadios) radio.disabled = unlocked;

  if (unlocked) {
    countdownTimer = setTimeout(renderUnlockState, Math.min(1000, remaining));
  }
}

function renderInactiveState(message) {
  popupStateError = true;
  clearTimeout(countdownTimer);
  unlockStatus.dataset.state = "inactive";
  unlockStatusText.textContent = message;
}

async function setUnlockState() {
  const activeDeadline = activeUnlockDeadline(instagramUnlockUntil);
  unlockButton.disabled = true;

  try {
    popupStateError = false;
    if (activeDeadline) {
      await chrome.storage.local.remove(INSTAGRAM_UNLOCK_KEY);
      instagramUnlockUntil = 0;
    } else {
      const selected = document.querySelector('input[name="unlock-duration"]:checked');
      const deadline = unlockDeadline(Number(selected?.value));
      if (!deadline) throw new Error("Invalid unlock duration");
      await chrome.storage.local.set({ [INSTAGRAM_UNLOCK_KEY]: deadline });
      instagramUnlockUntil = deadline;
    }
    renderUnlockState();
  } catch (error) {
    console.error("FreeFeed could not update temporary access.", error);
    showStatus("Couldn’t update access. Try again.", true);
    renderInactiveState("Inactive · access status unavailable");
  } finally {
    unlockButton.disabled = false;
  }
}

async function loadSettings() {
  try {
    const storedSettings = await chrome.storage.local.get({ [INSTAGRAM_UNLOCK_KEY]: 0 });
    instagramUnlockUntil = activeUnlockDeadline(storedSettings[INSTAGRAM_UNLOCK_KEY]);
    if (!instagramUnlockUntil && storedSettings[INSTAGRAM_UNLOCK_KEY]) {
      void chrome.storage.local.remove(INSTAGRAM_UNLOCK_KEY);
    }
    renderUnlockState();
  } catch (error) {
    console.error("FreeFeed could not load its settings.", error);
    showStatus("Couldn’t load temporary access. Try again.", true);
    renderInactiveState("Inactive · protection status unavailable");
  }
}

unlockButton.addEventListener("click", () => void setUnlockState());

settingsLink.addEventListener("click", async (event) => {
  event.preventDefault();
  try {
    await chrome.runtime.openOptionsPage();
    window.close();
  } catch (error) {
    console.error("FreeFeed could not open settings.", error);
    showStatus("Couldn’t open Settings. Try again.", true);
  }
});

function showPopupView(view) {
  const showAbout = view === "about";
  mainView.hidden = showAbout;
  aboutView.hidden = !showAbout;

  if (showAbout) {
    aboutView.querySelector("h1").focus();
  } else {
    aboutLink.focus();
  }
}

aboutLink.addEventListener("click", (event) => {
  event.preventDefault();
  showPopupView("about");
});

aboutBackButton.addEventListener("click", () => showPopupView("main"));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !aboutView.hidden) showPopupView("main");
});

async function loadInitialPopupView() {
  try {
    const storedView = await chrome.storage.session.get({ [POPUP_INITIAL_VIEW_KEY]: "main" });
    await chrome.storage.session.remove(POPUP_INITIAL_VIEW_KEY);
    if (storedView[POPUP_INITIAL_VIEW_KEY] === "about") showPopupView("about");
  } catch (error) {
    console.error("FreeFeed could not load the requested popup view.", error);
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[INSTAGRAM_UNLOCK_KEY]) return;
  popupStateError = false;
  instagramUnlockUntil = activeUnlockDeadline(changes[INSTAGRAM_UNLOCK_KEY].newValue);
  renderUnlockState();
});

void Promise.all([loadSettings(), loadInitialPopupView()]);
