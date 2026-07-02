(() => {
  const { Storage, MAX_PER_SECTION } = window.QL;
  const I18N = window.QLI18N;
  const MAX = MAX_PER_SECTION || 10;

  let lang = "en";
  const tr = (key, vars) => I18N.t(lang, key, vars);

  const sectionsEl = document.getElementById("sections");
  const addSectionBtn = document.getElementById("add-section-btn");
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");
  const engineIcon = document.getElementById("engine-icon");

  // Search engines the user can pick. `default` uses the browser's configured
  // engine via chrome.search and shows a generic magnifier icon.
  const MAGNIFIER_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5 1.5-1.5-5-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z"/></svg>';
  const SEARCH_ENGINES = {
    default: { label: "Browser default", url: null, domain: null },
    google: { label: "Google", url: "https://www.google.com/search?q=", domain: "google.com" },
    bing: { label: "Bing", url: "https://www.bing.com/search?q=", domain: "bing.com" },
    duckduckgo: { label: "DuckDuckGo", url: "https://duckduckgo.com/?q=", domain: "duckduckgo.com" },
    yahoo: { label: "Yahoo", url: "https://search.yahoo.com/search?p=", domain: "search.yahoo.com" },
    ecosia: { label: "Ecosia", url: "https://www.ecosia.org/search?q=", domain: "ecosia.org" },
    brave: { label: "Brave", url: "https://search.brave.com/search?q=", domain: "search.brave.com" },
  };

  // Section dialog
  const sectionDialog = document.getElementById("section-dialog");
  const sectionForm = document.getElementById("section-form");
  const sectionDialogTitle = document.getElementById("section-dialog-title");
  const fieldSectionTitle = document.getElementById("field-section-title");
  const sectionDelete = document.getElementById("section-delete");
  const sectionCancel = document.getElementById("section-cancel");

  // Shortcut dialog
  const shortcutDialog = document.getElementById("shortcut-dialog");
  const shortcutForm = document.getElementById("shortcut-form");
  const dialogTitle = document.getElementById("dialog-title");
  const fieldTitle = document.getElementById("field-title");
  const fieldUrl = document.getElementById("field-url");
  const fieldIcon = document.getElementById("field-icon");
  const dialogDelete = document.getElementById("dialog-delete");
  const dialogCancel = document.getElementById("dialog-cancel");

  // Settings dialog
  const settingsBtn = document.getElementById("settings-btn");
  const settingsDialog = document.getElementById("settings-dialog");
  const settingsForm = document.getElementById("settings-form");
  const fieldTheme = document.getElementById("field-theme");
  const fieldShowTitles = document.getElementById("field-show-titles");
  const fieldSearchEngine = document.getElementById("field-search-engine");
  const fieldLanguage = document.getElementById("field-language");
  const settingsCancel = document.getElementById("settings-cancel");
  const settingsReset = document.getElementById("settings-reset");

  let state = { sections: [], settings: {} };
  let editingSectionId = null; // section being edited (null = adding)
  let scCtx = { sectionId: null, shortcutId: null }; // shortcut dialog context
  let drag = { sectionId: null, shortcutId: null };

  const uid = (p) =>
    `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  function findSection(id) {
    return state.sections.find((s) => s.id === id);
  }

  function normalizeUrl(raw) {
    const value = raw.trim();
    if (!value) return "";
    if (/^[a-z][\w+.-]*:\/\//i.test(value)) return value; // already has a scheme
    const isHostLike =
      /^([\w-]+\.)+[a-z]{2,}(:\d+)?([/?#]|$)/i.test(value) || // domain[:port]
      /^localhost(:\d+)?([/?#]|$)/i.test(value) || // localhost[:port]
      /^\d{1,3}(\.\d{1,3}){3}(:\d+)?([/?#]|$)/.test(value); // IPv4[:port]
    if (!isHostLike) return value;
    const isLocal =
      /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(value);
    return `${isLocal ? "http" : "https"}://${value}`;
  }

  function isLocalHost(host) {
    return (
      host === "localhost" ||
      !host.includes(".") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  }

  // Ordered list of icon sources to try for a shortcut. Local/intranet hosts
  // aren't reachable by Google's favicon service (it would return a generic
  // globe), so we read their own /favicon.ico directly first.
  function iconCandidates(url) {
    try {
      const u = new URL(url);
      const { origin, hostname } = u;
      if (isLocalHost(hostname)) {
        return [`${origin}/favicon.ico`, `${origin}/favicon.png`];
      }
      return [
        `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
        `${origin}/favicon.ico`,
      ];
    } catch {
      return [];
    }
  }

  function attachIcon(thumb, shortcut) {
    const candidates = [];
    if (shortcut.icon) candidates.push(shortcut.icon);
    candidates.push(...iconCandidates(shortcut.url));
    if (!candidates.length) {
      thumb.appendChild(letterNode(shortcut.title));
      return;
    }
    let i = 0;
    const img = document.createElement("img");
    img.alt = "";
    img.addEventListener("error", () => {
      i += 1;
      if (i < candidates.length) {
        img.src = candidates[i];
      } else {
        thumb.innerHTML = "";
        thumb.appendChild(letterNode(shortcut.title));
      }
    });
    img.src = candidates[0];
    thumb.appendChild(img);
  }

  function applyLanguage() {
    lang = I18N.normLang(state.settings.language || I18N.pickDefault());
    I18N.applyStatic(lang);
  }

  function applySettings() {
    const s = state.settings;
    const theme = s.theme === "day" ? "day" : "night";
    document.body.classList.toggle("theme-day", theme === "day");
    document.body.classList.toggle("theme-night", theme === "night");
    document.body.classList.toggle("no-titles", !s.showTitles);
    applyLanguage();
    applyEngineIcon();
  }

  function currentEngine() {
    return SEARCH_ENGINES[state.settings.searchEngine] || SEARCH_ENGINES.default;
  }

  function applyEngineIcon() {
    const engine = currentEngine();
    const label = engine.domain ? engine.label : tr("browserDefault");
    engineIcon.title = tr("searchEngineTitle", { label });
    if (engine.domain) {
      engineIcon.innerHTML = "";
      const img = document.createElement("img");
      img.src = `https://www.google.com/s2/favicons?domain=${engine.domain}&sz=64`;
      img.alt = "";
      img.addEventListener("error", () => {
        engineIcon.innerHTML = MAGNIFIER_SVG;
      });
      engineIcon.appendChild(img);
    } else {
      engineIcon.innerHTML = MAGNIFIER_SVG;
    }
  }

  function letterNode(title) {
    const span = document.createElement("span");
    span.className = "letter";
    span.textContent = (title || "?").trim().charAt(0) || "?";
    return span;
  }

  function makeTile(section, shortcut) {
    const tile = document.createElement("a");
    tile.className = "tile";
    tile.href = shortcut.url;
    tile.draggable = true;
    tile.dataset.id = shortcut.id;
    tile.dataset.section = section.id;

    const thumb = document.createElement("div");
    thumb.className = "tile-thumb";
    attachIcon(thumb, shortcut);

    const edit = document.createElement("button");
    edit.className = "tile-edit";
    edit.title = tr("edit");
    edit.textContent = "\u22ee";
    edit.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openShortcutDialog(section.id, shortcut);
    });

    const title = document.createElement("span");
    title.className = "tile-title";
    title.textContent = shortcut.title;

    tile.append(thumb, edit, title);
    addDragHandlers(tile);
    return tile;
  }

  function makeAddTile(section) {
    const tile = document.createElement("button");
    tile.className = "tile add";
    tile.title = tr("addShortcut");
    const thumb = document.createElement("div");
    thumb.className = "tile-thumb";
    const plus = document.createElement("span");
    plus.className = "plus";
    plus.textContent = "+";
    thumb.appendChild(plus);
    const title = document.createElement("span");
    title.className = "tile-title";
    title.textContent = tr("addShortcut");
    tile.append(thumb, title);
    tile.addEventListener("click", () => openShortcutDialog(section.id, null));
    return tile;
  }

  function makeSection(section) {
    const wrap = document.createElement("section");
    wrap.className = "section";
    wrap.classList.toggle("collapsed", !!section.collapsed);
    wrap.dataset.id = section.id;

    const head = document.createElement("div");
    head.className = "section-head";

    const toggle = document.createElement("button");
    toggle.className = "section-toggle";
    toggle.title = section.collapsed ? tr("expandSection") : tr("collapseSection");
    toggle.setAttribute("aria-expanded", String(!section.collapsed));
    toggle.textContent = "\u25be"; // ▾
    toggle.addEventListener("click", () => toggleSection(section.id));

    const h2 = document.createElement("h2");
    h2.className = "section-title";
    h2.textContent = section.title;
    h2.addEventListener("click", () => toggleSection(section.id));

    const count = document.createElement("span");
    count.className = "section-count";
    count.textContent = `${section.shortcuts.length}/${MAX}`;

    const editBtn = document.createElement("button");
    editBtn.className = "section-edit";
    editBtn.title = tr("editSection");
    editBtn.textContent = "\u22ee";
    editBtn.addEventListener("click", () => openSectionDialog(section));

    head.append(toggle, h2, count, editBtn);

    const grid = document.createElement("div");
    grid.className = "grid";
    section.shortcuts.forEach((s) => grid.appendChild(makeTile(section, s)));
    if (section.shortcuts.length < MAX) grid.appendChild(makeAddTile(section));

    wrap.append(head, grid);
    return wrap;
  }

  async function toggleSection(id) {
    const sec = findSection(id);
    if (!sec) return;
    sec.collapsed = !sec.collapsed;
    await persist();
    render();
  }

  function render() {
    sectionsEl.innerHTML = "";
    state.sections.forEach((sec) => sectionsEl.appendChild(makeSection(sec)));
  }

  // Drag & drop reordering (within the same section only)
  function addDragHandlers(tile) {
    tile.addEventListener("dragstart", (e) => {
      drag = { sectionId: tile.dataset.section, shortcutId: tile.dataset.id };
      tile.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    tile.addEventListener("dragend", () => {
      drag = { sectionId: null, shortcutId: null };
      tile.classList.remove("dragging");
      document
        .querySelectorAll(".drag-over")
        .forEach((el) => el.classList.remove("drag-over"));
    });
    tile.addEventListener("dragover", (e) => {
      if (drag.sectionId !== tile.dataset.section) return;
      e.preventDefault();
      if (drag.shortcutId && drag.shortcutId !== tile.dataset.id) {
        tile.classList.add("drag-over");
      }
    });
    tile.addEventListener("dragleave", () => tile.classList.remove("drag-over"));
    tile.addEventListener("drop", async (e) => {
      e.preventDefault();
      tile.classList.remove("drag-over");
      if (drag.sectionId !== tile.dataset.section) return;
      const section = findSection(tile.dataset.section);
      if (!section) return;
      const targetId = tile.dataset.id;
      if (!drag.shortcutId || drag.shortcutId === targetId) return;
      const list = section.shortcuts;
      const from = list.findIndex((s) => s.id === drag.shortcutId);
      const to = list.findIndex((s) => s.id === targetId);
      if (from === -1 || to === -1) return;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      await persist();
      render();
    });
  }

  // Section dialog
  function openSectionDialog(section) {
    editingSectionId = section ? section.id : null;
    sectionDialogTitle.textContent = section ? tr("editSection") : tr("addSection");
    fieldSectionTitle.value = section ? section.title : "";
    sectionDelete.hidden = !section;
    sectionDialog.showModal();
    fieldSectionTitle.focus();
  }

  sectionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = fieldSectionTitle.value.trim();
    if (!title) return;
    if (editingSectionId) {
      const sec = findSection(editingSectionId);
      if (sec) sec.title = title;
    } else {
      state.sections.push({ id: uid("sec"), title, shortcuts: [] });
    }
    await persist();
    render();
    sectionDialog.close();
  });

  sectionDelete.addEventListener("click", async () => {
    if (!editingSectionId) return;
    const sec = findSection(editingSectionId);
    const label = sec ? sec.title : tr("thisSection");
    if (!confirm(tr("confirmDeleteSection", { name: label }))) return;
    state.sections = state.sections.filter((s) => s.id !== editingSectionId);
    await persist();
    render();
    sectionDialog.close();
  });

  sectionCancel.addEventListener("click", () => sectionDialog.close());
  addSectionBtn.addEventListener("click", () => openSectionDialog(null));

  // Shortcut dialog
  function openShortcutDialog(sectionId, shortcut) {
    scCtx = { sectionId, shortcutId: shortcut ? shortcut.id : null };
    dialogTitle.textContent = shortcut ? tr("editShortcut") : tr("addShortcut");
    fieldTitle.value = shortcut ? shortcut.title : "";
    fieldUrl.value = shortcut ? shortcut.url : "";
    fieldIcon.value = shortcut ? shortcut.icon || "" : "";
    dialogDelete.hidden = !shortcut;
    shortcutDialog.showModal();
    fieldTitle.focus();
  }

  shortcutForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const section = findSection(scCtx.sectionId);
    if (!section) return;
    const title = fieldTitle.value.trim();
    const url = normalizeUrl(fieldUrl.value);
    const icon = normalizeUrl(fieldIcon.value);
    if (!title || !url) return;
    if (scCtx.shortcutId) {
      const item = section.shortcuts.find((s) => s.id === scCtx.shortcutId);
      if (item) {
        item.title = title;
        item.url = url;
        item.icon = icon;
      }
    } else {
      if (section.shortcuts.length >= MAX) {
        alert(tr("maxShortcuts", { max: MAX }));
        return;
      }
      section.shortcuts.push({ id: uid("s"), title, url, icon });
    }
    await persist();
    render();
    shortcutDialog.close();
  });

  dialogDelete.addEventListener("click", async () => {
    const section = findSection(scCtx.sectionId);
    if (!section || !scCtx.shortcutId) return;
    section.shortcuts = section.shortcuts.filter((s) => s.id !== scCtx.shortcutId);
    await persist();
    render();
    shortcutDialog.close();
  });

  dialogCancel.addEventListener("click", () => shortcutDialog.close());

  // Settings dialog
  function openSettings() {
    const s = state.settings;
    fieldLanguage.value = lang;
    fieldTheme.value = s.theme === "day" ? "day" : "night";
    fieldShowTitles.checked = s.showTitles !== false;
    fieldSearchEngine.value = SEARCH_ENGINES[s.searchEngine] ? s.searchEngine : "default";
    settingsDialog.showModal();
  }

  settingsBtn.addEventListener("click", openSettings);
  settingsCancel.addEventListener("click", () => settingsDialog.close());

  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    state.settings = {
      language: I18N.normLang(fieldLanguage.value),
      theme: fieldTheme.value === "day" ? "day" : "night",
      showTitles: fieldShowTitles.checked,
      searchEngine: fieldSearchEngine.value,
    };
    await persist();
    applySettings();
    render();
    settingsDialog.close();
  });

  settingsReset.addEventListener("click", async () => {
    if (!confirm(tr("confirmReset"))) return;
    state = await Storage.reset();
    applySettings();
    render();
    settingsDialog.close();
  });

  // Search: treat input as URL if it looks like one, otherwise search with the
  // engine chosen in settings. "Browser default" uses chrome.search (the
  // browser's configured engine); a specific engine navigates to its search URL.
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
    const engine = currentEngine();
    if (engine.url) {
      window.location.href = engine.url + encodeURIComponent(q);
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
