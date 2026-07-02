(() => {
  const { Storage } = window.QL;

  const grid = document.getElementById("grid");
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");

  // Shortcut dialog
  const shortcutDialog = document.getElementById("shortcut-dialog");
  const shortcutForm = document.getElementById("shortcut-form");
  const dialogTitle = document.getElementById("dialog-title");
  const fieldTitle = document.getElementById("field-title");
  const fieldUrl = document.getElementById("field-url");
  const dialogDelete = document.getElementById("dialog-delete");
  const dialogCancel = document.getElementById("dialog-cancel");

  // Settings dialog
  const settingsBtn = document.getElementById("settings-btn");
  const settingsDialog = document.getElementById("settings-dialog");
  const settingsForm = document.getElementById("settings-form");
  const fieldBgColor = document.getElementById("field-bg-color");
  const fieldBgImage = document.getElementById("field-bg-image");
  const fieldColumns = document.getElementById("field-columns");
  const fieldShowTitles = document.getElementById("field-show-titles");
  const settingsCancel = document.getElementById("settings-cancel");
  const settingsReset = document.getElementById("settings-reset");

  let state = { shortcuts: [], settings: {} };
  let editingId = null;
  let dragId = null;

  const uid = () =>
    `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  function normalizeUrl(raw) {
    const value = raw.trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$|:)/i.test(value)) return `https://${value}`;
    return value;
  }

  function faviconUrl(url) {
    try {
      const host = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
    } catch {
      return "";
    }
  }

  function applySettings() {
    const s = state.settings;
    document.body.style.backgroundColor = s.bgColor || "#1a1a2e";
    document.body.style.backgroundImage = s.bgImage
      ? `url("${s.bgImage}")`
      : "none";
    document.body.classList.toggle("no-titles", !s.showTitles);
    grid.style.setProperty("--columns", String(s.columns || 6));
  }

  function makeTile(shortcut) {
    const tile = document.createElement("a");
    tile.className = "tile";
    tile.href = shortcut.url;
    tile.draggable = true;
    tile.dataset.id = shortcut.id;

    const thumb = document.createElement("div");
    thumb.className = "tile-thumb";
    const icon = faviconUrl(shortcut.url);
    if (icon) {
      const img = document.createElement("img");
      img.src = icon;
      img.alt = "";
      img.addEventListener("error", () => {
        thumb.innerHTML = "";
        thumb.appendChild(letterNode(shortcut.title));
      });
      thumb.appendChild(img);
    } else {
      thumb.appendChild(letterNode(shortcut.title));
    }

    const edit = document.createElement("button");
    edit.className = "tile-edit";
    edit.title = "Edit";
    edit.textContent = "\u22ee";
    edit.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openShortcutDialog(shortcut);
    });

    const title = document.createElement("span");
    title.className = "tile-title";
    title.textContent = shortcut.title;

    tile.append(thumb, edit, title);
    addDragHandlers(tile);
    return tile;
  }

  function letterNode(title) {
    const span = document.createElement("span");
    span.className = "letter";
    span.textContent = (title || "?").trim().charAt(0) || "?";
    return span;
  }

  function makeAddTile() {
    const tile = document.createElement("button");
    tile.className = "tile add";
    tile.title = "Add shortcut";
    const thumb = document.createElement("div");
    thumb.className = "tile-thumb";
    const plus = document.createElement("span");
    plus.className = "plus";
    plus.textContent = "+";
    thumb.appendChild(plus);
    const title = document.createElement("span");
    title.className = "tile-title";
    title.textContent = "Add shortcut";
    tile.append(thumb, title);
    tile.addEventListener("click", () => openShortcutDialog(null));
    return tile;
  }

  function render() {
    grid.innerHTML = "";
    state.shortcuts.forEach((s) => grid.appendChild(makeTile(s)));
    grid.appendChild(makeAddTile());
  }

  // Drag & drop reordering
  function addDragHandlers(tile) {
    tile.addEventListener("dragstart", (e) => {
      dragId = tile.dataset.id;
      tile.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    tile.addEventListener("dragend", () => {
      dragId = null;
      tile.classList.remove("dragging");
      document
        .querySelectorAll(".drag-over")
        .forEach((el) => el.classList.remove("drag-over"));
    });
    tile.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (dragId && dragId !== tile.dataset.id) tile.classList.add("drag-over");
    });
    tile.addEventListener("dragleave", () => tile.classList.remove("drag-over"));
    tile.addEventListener("drop", async (e) => {
      e.preventDefault();
      tile.classList.remove("drag-over");
      const targetId = tile.dataset.id;
      if (!dragId || dragId === targetId) return;
      const list = state.shortcuts;
      const from = list.findIndex((s) => s.id === dragId);
      const to = list.findIndex((s) => s.id === targetId);
      if (from === -1 || to === -1) return;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      await persist();
      render();
    });
  }

  // Shortcut dialog
  function openShortcutDialog(shortcut) {
    editingId = shortcut ? shortcut.id : null;
    dialogTitle.textContent = shortcut ? "Edit shortcut" : "Add shortcut";
    fieldTitle.value = shortcut ? shortcut.title : "";
    fieldUrl.value = shortcut ? shortcut.url : "";
    dialogDelete.hidden = !shortcut;
    shortcutDialog.showModal();
    fieldTitle.focus();
  }

  shortcutForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = fieldTitle.value.trim();
    const url = normalizeUrl(fieldUrl.value);
    if (!title || !url) return;
    if (editingId) {
      const item = state.shortcuts.find((s) => s.id === editingId);
      if (item) {
        item.title = title;
        item.url = url;
      }
    } else {
      state.shortcuts.push({ id: uid(), title, url });
    }
    await persist();
    render();
    shortcutDialog.close();
  });

  dialogDelete.addEventListener("click", async () => {
    if (!editingId) return;
    state.shortcuts = state.shortcuts.filter((s) => s.id !== editingId);
    await persist();
    render();
    shortcutDialog.close();
  });

  dialogCancel.addEventListener("click", () => shortcutDialog.close());

  // Settings dialog
  function openSettings() {
    const s = state.settings;
    fieldBgColor.value = s.bgColor || "#1a1a2e";
    fieldBgImage.value = s.bgImage || "";
    fieldColumns.value = s.columns || 6;
    fieldShowTitles.checked = s.showTitles !== false;
    settingsDialog.showModal();
  }

  settingsBtn.addEventListener("click", openSettings);
  settingsCancel.addEventListener("click", () => settingsDialog.close());

  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    state.settings = {
      bgColor: fieldBgColor.value,
      bgImage: fieldBgImage.value.trim(),
      columns: Math.min(10, Math.max(3, Number(fieldColumns.value) || 6)),
      showTitles: fieldShowTitles.checked,
    };
    await persist();
    applySettings();
    settingsDialog.close();
  });

  settingsReset.addEventListener("click", async () => {
    if (!confirm("Reset all shortcuts and settings to defaults?")) return;
    state = await Storage.reset();
    applySettings();
    render();
    settingsDialog.close();
  });

  // Search: treat input as URL if it looks like one, otherwise search using the
  // browser's configured default search engine (chrome.search), falling back to
  // Google when that API is unavailable (e.g. opened outside the extension).
  const hasSearchApi =
    typeof chrome !== "undefined" && chrome.search && chrome.search.query;

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) return;
    const looksLikeUrl =
      /^https?:\/\//i.test(q) || /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(q);
    if (looksLikeUrl) {
      window.location.href = normalizeUrl(q);
      return;
    }
    if (hasSearchApi) {
      chrome.search.query({ text: q, disposition: "CURRENT_TAB" });
      return;
    }
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  });

  async function persist() {
    await Storage.save(state);
  }

  async function init() {
    state = await Storage.load();
    applySettings();
    render();
  }

  init();
})();
