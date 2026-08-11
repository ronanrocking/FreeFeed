const settingCheckboxes = document.querySelectorAll("[data-setting]");
const status = document.querySelector(".status");
let statusTimer;

function showStatus(message, isError = false) {
  clearTimeout(statusTimer);
  status.textContent = message;
  status.classList.toggle("error", isError);
  if (!isError) statusTimer = setTimeout(() => status.textContent = "", 1200);
}

async function loadSettings() {
  try {
    const storedSettings = await chrome.storage.local.get(DEFAULT_SETTINGS);
    for (const checkbox of settingCheckboxes) checkbox.checked = storedSettings[checkbox.dataset.setting];
  } catch (error) {
    console.error("FreeFeed could not load its settings.", error);
    for (const checkbox of settingCheckboxes) checkbox.checked = DEFAULT_SETTINGS[checkbox.dataset.setting];
    showStatus("Couldn’t load saved settings. Defaults are shown.", true);
  }
}

for (const checkbox of settingCheckboxes) {
  checkbox.addEventListener("change", async () => {
    const checked = checkbox.checked;
    checkbox.disabled = true;
    try {
      await chrome.storage.local.set({ [checkbox.dataset.setting]: checked });
      showStatus("Saved");
    } catch (error) {
      console.error("FreeFeed could not save a setting.", error);
      checkbox.checked = !checked;
      showStatus("Couldn’t save this setting. Try again.", true);
    } finally {
      checkbox.disabled = false;
    }
  });
}

void loadSettings();
