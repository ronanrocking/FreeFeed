const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function extensionEvent() {
  return {
    listener: null,
    addListener(listener) {
      this.listener = listener;
    }
  };
}

function createBackgroundContext(storedDeadline = 0) {
  const calls = { created: [], cleared: [], removed: [], tabs: [] };
  const events = {
    installed: extensionEvent(),
    startup: extensionEvent(),
    storageChanged: extensionEvent(),
    alarm: extensionEvent()
  };
  const chrome = {
    runtime: {
      onInstalled: events.installed,
      onStartup: events.startup,
      getURL: (resource) => `chrome-extension://freefeed/${resource}`
    },
    tabs: {
      create: async (options) => calls.tabs.push(options)
    },
    storage: {
      local: {
        get: async () => ({ instagramUnlockUntil: storedDeadline }),
        remove: async (key) => calls.removed.push(key)
      },
      onChanged: events.storageChanged
    },
    alarms: {
      clear: async (name) => calls.cleared.push(name),
      create: (name, options) => calls.created.push({ name, options }),
      onAlarm: events.alarm
    }
  };
  const context = vm.createContext({ chrome, console, Date, Number });
  const source = fs.readFileSync(path.join(__dirname, "..", "extension", "background.js"), "utf8");
  vm.runInContext(source, context);
  return { context, calls, events };
}

test("the service worker schedules one alarm at the stored absolute deadline", async () => {
  const { context, calls } = createBackgroundContext();
  const deadline = Date.now() + 60_000;

  await vm.runInContext(`scheduleUnlockExpiryAlarm(${deadline})`, context);

  assert.equal(calls.created.at(-1).name, "freefeed-instagram-unlock-expiry");
  assert.equal(calls.created.at(-1).options.when, deadline);
});

test("the expiry alarm clears temporary access from shared storage", async () => {
  const { calls, events } = createBackgroundContext(Date.now() - 1_000);

  events.alarm.listener({ name: "freefeed-instagram-unlock-expiry" });
  await new Promise((resolve) => setImmediate(resolve));

  assert.ok(calls.removed.length >= 1);
  assert.ok(calls.removed.every((key) => key === "instagramUnlockUntil"));
});

test("a delayed old alarm cannot clear a newer unlock deadline", async () => {
  const newDeadline = Date.now() + 120_000;
  const { calls, events } = createBackgroundContext(newDeadline);

  events.alarm.listener({ name: "freefeed-instagram-unlock-expiry" });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(calls.removed, []);
  assert.equal(calls.created.at(-1).options.when, newDeadline);
});
