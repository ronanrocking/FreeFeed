const settingCheckboxes = document.querySelectorAll("[data-setting]");

async function loadSettings() {
  const storedSettings = await chrome.storage.local.get(DEFAULT_VISIBILITY);

  for (const checkbox of settingCheckboxes) {
    checkbox.checked = storedSettings[checkbox.dataset.setting];
  }
}

for (const checkbox of settingCheckboxes) {
  checkbox.addEventListener("change", async () => {
    await chrome.storage.local.set({
      [checkbox.dataset.setting]: checkbox.checked
    });
  });
}

loadSettings();
