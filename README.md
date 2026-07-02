# QuickLinks

A Chrome extension that replaces the new tab page with a customizable grid of
visual shortcuts.

## Features

- **Custom new tab** — overrides `chrome://newtab` with sections of shortcut tiles.
- **Sections** — create, rename, and delete sections; each holds up to 10 shortcuts.
- **Add / edit / delete** shortcuts, each with a name and URL.
- **Favicons** automatically fetched per site, with a letter fallback.
- **Drag to reorder** tiles.
- **Search bar** — types that look like URLs open directly; anything else runs a search. The chosen engine's icon is shown inside the bar so you know where you're searching.
- **Search engine picker** — choose Browser default (uses `chrome.search`) or Google/Bing/DuckDuckGo/Yahoo/Ecosia/Brave.
- **Customization** — Day/Night theme (adjusts background and font colors), optional background image, number of columns, and toggling titles.
- **Synced storage** — shortcuts and settings persist via `chrome.storage.sync`
  (falls back to `localStorage` when opened outside the extension context).

## Install (load unpacked)

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder.
4. Open a new tab to see QuickLinks.

## Project structure

```
manifest.json      Manifest V3 config (newtab override)
newtab.html        New tab page markup + dialogs
css/style.css      Styling
js/storage.js      Storage layer (chrome.storage.sync + fallback)
js/newtab.js       Rendering, dialogs, drag-and-drop, search
icons/             Extension icons
```

## Notes

The extension requests only the `storage` permission. Favicons are loaded from
Google's public favicon service (`s2/favicons`).
