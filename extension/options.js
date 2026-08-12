const settingCheckboxes = document.querySelectorAll("[data-setting]");
const status = document.querySelector(".settings-status");
const enableDialog = document.querySelector("[data-enable-dialog]");
const enableFeature = document.querySelector("[data-enable-feature]");
const enableWait = document.querySelector("[data-enable-wait]");
const enablePhrase = document.querySelector("[data-enable-phrase]");
const enableAcknowledgement = document.querySelector("[data-enable-acknowledgement]");
const enableConfirmation = document.querySelector("[data-enable-confirmation]");
const enableStatus = document.querySelector("[data-enable-status]");
const enableCancel = document.querySelector("[data-enable-cancel]");
const enableSubmit = document.querySelector("[data-enable-submit]");
const aboutLink = document.querySelector("[data-open-about]");
let statusTimer;
let enableTimer;
let pendingCheckbox = null;
let enableAvailableAt = 0;
let expectedEnablePhrase = "";

function showStatus(message, isError = false) {
  clearTimeout(statusTimer);
  status.textContent = message;
  status.classList.toggle("error", isError);
  if (!isError) statusTimer = setTimeout(() => status.textContent = "", 1600);
}

function featureName(checkbox) {
  return checkbox.closest("label").querySelector("strong").textContent;
}

function renderEnableConfirmation() {
  const now = Date.now();
  const remainingSeconds = Math.max(0, Math.ceil((enableAvailableAt - now) / 1000));
  const ready = enableConfirmationReady(
    enableAvailableAt,
    enableAcknowledgement.checked,
    enableConfirmation.value,
    expectedEnablePhrase,
    now
  );

  enableWait.textContent = remainingSeconds
    ? `Wait ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"} before continuing`
    : "Waiting period complete";
  enableSubmit.disabled = !ready;

  clearTimeout(enableTimer);
  if (remainingSeconds) enableTimer = setTimeout(renderEnableConfirmation, 250);
}

function closeEnableDialog() {
  clearTimeout(enableTimer);
  const checkbox = pendingCheckbox;
  pendingCheckbox = null;
  enableDialog.close();
  checkbox?.focus();
}

function openEnableDialog(checkbox) {
  pendingCheckbox = checkbox;
  const name = featureName(checkbox);
  expectedEnablePhrase = enableConfirmationPhrase(name);
  enableAvailableAt = Date.now() + FEATURE_ENABLE_DELAY_MS;
  enableFeature.textContent = name;
  enablePhrase.textContent = expectedEnablePhrase;
  enableAcknowledgement.checked = false;
  enableConfirmation.value = "";
  enableStatus.textContent = "";
  enableSubmit.textContent = `Enable ${name}`;
  renderEnableConfirmation();
  enableDialog.showModal();
  enableCancel.focus();
}

async function saveDisabledSetting(checkbox) {
  checkbox.disabled = true;
  try {
    await chrome.storage.local.set({ [checkbox.dataset.setting]: false });
    showStatus(`${featureName(checkbox)} turned off`);
  } catch (error) {
    console.error("FreeFeed could not save a setting.", error);
    checkbox.checked = true;
    showStatus("Couldn’t save this setting. Try again.", true);
  } finally {
    checkbox.disabled = false;
  }
}

async function loadSettings() {
  try {
    const storedSettings = await chrome.storage.local.get(DEFAULT_SETTINGS);
    for (const checkbox of settingCheckboxes) {
      const key = checkbox.dataset.setting;
      checkbox.checked = typeof storedSettings[key] === "boolean" ? storedSettings[key] : DEFAULT_SETTINGS[key];
    }
  } catch (error) {
    console.error("FreeFeed could not load its settings.", error);
    for (const checkbox of settingCheckboxes) checkbox.checked = DEFAULT_SETTINGS[checkbox.dataset.setting];
    showStatus("Couldn’t load saved settings. Defaults are shown.", true);
  }
}

for (const checkbox of settingCheckboxes) {
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      checkbox.checked = false;
      openEnableDialog(checkbox);
      return;
    }
    void saveDisabledSetting(checkbox);
  });
}

enableAcknowledgement.addEventListener("change", renderEnableConfirmation);
enableConfirmation.addEventListener("input", renderEnableConfirmation);
enableCancel.addEventListener("click", closeEnableDialog);

enableDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeEnableDialog();
});

enableSubmit.addEventListener("click", async () => {
  if (!pendingCheckbox || !enableConfirmationReady(
    enableAvailableAt,
    enableAcknowledgement.checked,
    enableConfirmation.value,
    expectedEnablePhrase
  )) return;

  const checkbox = pendingCheckbox;
  enableSubmit.disabled = true;
  enableCancel.disabled = true;
  enableStatus.textContent = "";
  try {
    await chrome.storage.local.set({ [checkbox.dataset.setting]: true });
    checkbox.checked = true;
    closeEnableDialog();
    showStatus(`${featureName(checkbox)} enabled`);
  } catch (error) {
    console.error("FreeFeed could not enable a setting.", error);
    enableStatus.textContent = "Couldn’t enable this activity. Try again.";
    renderEnableConfirmation();
  } finally {
    enableCancel.disabled = false;
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  for (const checkbox of settingCheckboxes) {
    const change = changes[checkbox.dataset.setting];
    if (change) {
      checkbox.checked = typeof change.newValue === "boolean"
        ? change.newValue
        : DEFAULT_SETTINGS[checkbox.dataset.setting];
    }
  }
});

aboutLink.addEventListener("click", async () => {
  try {
    const setViewRequest = chrome.storage.session.set({ [POPUP_INITIAL_VIEW_KEY]: "about" });
    const openPopupRequest = chrome.action.openPopup();
    await Promise.all([setViewRequest, openPopupRequest]);
  } catch (error) {
    console.error("FreeFeed could not open About.", error);
    void chrome.storage.session.remove(POPUP_INITIAL_VIEW_KEY);
    showStatus("Couldn’t open About. Use About from the extension popup.", true);
  }
});

void loadSettings();
