# FreeFeed brand assets

The SVG files in this folder are the reusable masters for the FreeFeed identity. `freefeed-mark.svg` is the default product mark, `freefeed-lockup.svg` pairs it with the wordmark, and the monochrome variants support single-color production.

`freefeed-app-icon.svg` is the source for Chrome’s PNG icons. Regenerate all required sizes from the repository root with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File extension/assets/brand/render-icons.ps1
```

Generated PNGs are written to `extension/assets/icons/`.
