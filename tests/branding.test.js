const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const extensionRoot = path.join(__dirname, "..", "extension");
const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, "manifest.json"), "utf8"));

function pngDimensions(filePath) {
  const header = fs.readFileSync(filePath).subarray(0, 24);
  assert.deepEqual([...header.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

test("packages every declared FreeFeed extension icon at the correct size", () => {
  for (const size of [16, 32, 48, 128]) {
    const relativePath = manifest.icons[String(size)];
    assert.equal(relativePath, `assets/icons/freefeed-${size}.png`);
    assert.deepEqual(pngDimensions(path.join(extensionRoot, relativePath)), { width: size, height: size });
  }
});

test("exposes the reusable brand mark to the Instagram content surface", () => {
  const resourceGroups = manifest.web_accessible_resources.flatMap(({ resources }) => resources);
  assert.ok(resourceGroups.includes("assets/brand/freefeed-mark.svg"));
  assert.ok(fs.existsSync(path.join(extensionRoot, "assets", "brand", "freefeed-mark.svg")));
});
