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
  const fieldLocation = document.getElementById("field-location");
  const fieldLocationLabel = document.getElementById("field-location-label");
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
  // Section dialog context: parentId null = top-level section, otherwise a
  // subsection under parentId. id null = adding a new one.
  let secCtx = { parentId: null, id: null };
  // Shortcut dialog context. subsectionId null = the section's own shortcuts.
  let scCtx = { sectionId: null, subsectionId: null, shortcutId: null };
  let drag = { sectionId: null, subsectionId: null, shortcutId: null };

  const uid = (p) =>
    `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  function findSection(id) {
    return state.sections.find((s) => s.id === id);
  }

  function findSubsection(section, subId) {
    if (!section || !Array.isArray(section.subsections)) return null;
    return section.subsections.find((s) => s.id === subId) || null;
  }

  // Returns the object that holds a shortcuts[] array for the given context:
  // the section itself, or one of its subsections.
  function findContainer(sectionId, subsectionId) {
    const section = findSection(sectionId);
    if (!section) return null;
    if (!subsectionId) return section;
    return findSubsection(section, subsectionId);
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

  // The browser's own favicon store (needs the "favicon" permission). It knows
  // the real icon of any page you've visited — including localhost/intranet
  // apps whose icon lives at a non-standard path (e.g. Superset). Falls back to
  // a generic globe for pages it has never seen.
  function faviconApiUrl(url) {
    try {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.getURL) {
        return null;
      }
      return chrome.runtime.getURL(
        `/_favicon/?pageUrl=${encodeURIComponent(url)}&size=64`
      );
    } catch {
      return null;
    }
  }

  // Ordered list of icon sources to try for a shortcut. Local/intranet hosts
  // aren't reachable by Google's favicon service (it would return a generic
  // globe), so we read their own /favicon.ico directly and rely on the
  // browser's favicon store for non-standard icon paths.
  function iconCandidates(url) {
    try {
      const u = new URL(url);
      const { origin, hostname } = u;
      const api = faviconApiUrl(url);
      if (isLocalHost(hostname)) {
        return [`${origin}/favicon.ico`, `${origin}/favicon.png`, api].filter(Boolean);
      }
      return [
        `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
        `${origin}/favicon.ico`,
        api,
      ].filter(Boolean);
    } catch {
      return [];
    }
  }

  function attachIcon(thumb, shortcut) {
    const candidates = [];
    if (shortcut.icon) candidates.push(shortcut.icon);
    candidates.push(...iconCandidates(normalizeUrl(shortcut.url)));
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

  function makeTile(shortcut, sectionId, subsectionId) {
    const tile = document.createElement("a");
    tile.className = "tile";
    tile.href = normalizeUrl(shortcut.url);
    tile.draggable = true;
    tile.dataset.id = shortcut.id;
    tile.dataset.section = sectionId;
    tile.dataset.sub = subsectionId || "";

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
      openShortcutDialog(sectionId, subsectionId, shortcut);
    });

    const title = document.createElement("span");
    title.className = "tile-title";
    title.textContent = shortcut.title;

    tile.append(thumb, edit, title);
    addDragHandlers(tile);
    return tile;
  }

  function makeAddTile(sectionId, subsectionId) {
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
    tile.addEventListener("click", () =>
      openShortcutDialog(sectionId, subsectionId, null)
    );
    return tile;
  }

  function makeGrid(container, sectionId, subsectionId) {
    const grid = document.createElement("div");
    grid.className = "grid";
    container.shortcuts.forEach((s) =>
      grid.appendChild(makeTile(s, sectionId, subsectionId))
    );
    if (container.shortcuts.length < MAX) {
      grid.appendChild(makeAddTile(sectionId, subsectionId));
    }
    return grid;
  }

  function makeHeadAddBtn(container, sectionId, subsectionId) {
    const btn = document.createElement("button");
    btn.className = "section-add";
    btn.title = tr("addShortcut");
    btn.textContent = "+";
    btn.disabled = container.shortcuts.length >= MAX;
    btn.addEventListener("click", () =>
      openShortcutDialog(sectionId, subsectionId, null)
    );
    return btn;
  }

  function makeSubsection(section, sub) {
    const wrap = document.createElement("div");
    wrap.className = "subsection";
    wrap.classList.toggle("collapsed", !!sub.collapsed);
    wrap.dataset.id = sub.id;

    const head = document.createElement("div");
    head.className = "subsection-head";

    const toggle = document.createElement("button");
    toggle.className = "section-toggle";
    toggle.title = sub.collapsed ? tr("expandSection") : tr("collapseSection");
    toggle.setAttribute("aria-expanded", String(!sub.collapsed));
    toggle.textContent = "\u25be";
    toggle.addEventListener("click", () => toggleSubsection(section.id, sub.id));

    const h3 = document.createElement("h3");
    h3.className = "subsection-title";
    h3.textContent = sub.title;
    h3.addEventListener("click", () => toggleSubsection(section.id, sub.id));

    const count = document.createElement("span");
    count.className = "section-count";
    count.textContent = `${sub.shortcuts.length}/${MAX}`;

    const editBtn = document.createElement("button");
    editBtn.className = "section-edit";
    editBtn.title = tr("editSubsection");
    editBtn.textContent = "\u22ee";
    editBtn.addEventListener("click", () => openSectionDialog(section.id, sub));

    head.append(
      toggle,
      h3,
      count,
      makeHeadAddBtn(sub, section.id, sub.id),
      editBtn
    );
    wrap.append(head, makeGrid(sub, section.id, sub.id));
    return wrap;
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
    editBtn.addEventListener("click", () => openSectionDialog(null, section));

    head.append(
      toggle,
      h2,
      count,
      makeHeadAddBtn(section, section.id, null),
      editBtn
    );

    const body = document.createElement("div");
    body.className = "section-body";
    body.appendChild(makeGrid(section, section.id, null));

    (section.subsections || []).forEach((sub) =>
      body.appendChild(makeSubsection(section, sub))
    );

    const addSub = document.createElement("button");
    addSub.className = "add-subsection";
    addSub.textContent = tr("addSubsectionBtn");
    addSub.addEventListener("click", () => openSectionDialog(section.id, null));
    body.appendChild(addSub);

    wrap.append(head, body);
    return wrap;
  }

  async function toggleSection(id) {
    const sec = findSection(id);
    if (!sec) return;
    sec.collapsed = !sec.collapsed;
    await persist();
    render();
  }

  async function toggleSubsection(sectionId, subId) {
    const sub = findSubsection(findSection(sectionId), subId);
    if (!sub) return;
    sub.collapsed = !sub.collapsed;
    await persist();
    render();
  }

  function render() {
    sectionsEl.innerHTML = "";
    state.sections.forEach((sec) => sectionsEl.appendChild(makeSection(sec)));
  }

  // Drag & drop reordering (within the same section or subsection only)
  function sameContainer(tile) {
    return (
      drag.sectionId === tile.dataset.section &&
      (drag.subsectionId || "") === tile.dataset.sub
    );
  }

  function addDragHandlers(tile) {
    tile.addEventListener("dragstart", (e) => {
      drag = {
        sectionId: tile.dataset.section,
        subsectionId: tile.dataset.sub || null,
        shortcutId: tile.dataset.id,
      };
      tile.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    tile.addEventListener("dragend", () => {
      drag = { sectionId: null, subsectionId: null, shortcutId: null };
      tile.classList.remove("dragging");
      document
        .querySelectorAll(".drag-over")
        .forEach((el) => el.classList.remove("drag-over"));
    });
    tile.addEventListener("dragover", (e) => {
      if (!sameContainer(tile)) return;
      e.preventDefault();
      if (drag.shortcutId && drag.shortcutId !== tile.dataset.id) {
        tile.classList.add("drag-over");
      }
    });
    tile.addEventListener("dragleave", () => tile.classList.remove("drag-over"));
    tile.addEventListener("drop", async (e) => {
      e.preventDefault();
      tile.classList.remove("drag-over");
      if (!sameContainer(tile)) return;
      const container = findContainer(tile.dataset.section, tile.dataset.sub || null);
      if (!container) return;
      const targetId = tile.dataset.id;
      if (!drag.shortcutId || drag.shortcutId === targetId) return;
      const list = container.shortcuts;
      const from = list.findIndex((s) => s.id === drag.shortcutId);
      const to = list.findIndex((s) => s.id === targetId);
      if (from === -1 || to === -1) return;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      await persist();
      render();
    });
  }

  // Section dialog — shared by sections and subsections.
  // parentId null = top-level section; otherwise a subsection under parentId.
  // item is the section/subsection being edited, or null when adding.
  function openSectionDialog(parentId, item) {
    secCtx = { parentId: parentId || null, id: item ? item.id : null };
    const isSub = !!parentId;
    const addKey = isSub ? "addSubsection" : "addSection";
    const editKey = isSub ? "editSubsection" : "editSection";
    sectionDialogTitle.textContent = item ? tr(editKey) : tr(addKey);
    fieldSectionTitle.value = item ? item.title : "";
    sectionDelete.hidden = !item;
    sectionDialog.showModal();
    fieldSectionTitle.focus();
  }

  sectionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = fieldSectionTitle.value.trim();
    if (!title) return;
    if (secCtx.parentId) {
      const parent = findSection(secCtx.parentId);
      if (!parent) return;
      if (!Array.isArray(parent.subsections)) parent.subsections = [];
      if (secCtx.id) {
        const sub = findSubsection(parent, secCtx.id);
        if (sub) sub.title = title;
      } else {
        parent.subsections.push({ id: uid("sub"), title, collapsed: false, shortcuts: [] });
      }
    } else if (secCtx.id) {
      const sec = findSection(secCtx.id);
      if (sec) sec.title = title;
    } else {
      state.sections.push({ id: uid("sec"), title, shortcuts: [], subsections: [] });
    }
    await persist();
    render();
    sectionDialog.close();
  });

  sectionDelete.addEventListener("click", async () => {
    if (!secCtx.id) return;
    if (secCtx.parentId) {
      const parent = findSection(secCtx.parentId);
      const sub = findSubsection(parent, secCtx.id);
      const label = sub ? sub.title : tr("thisSubsection");
      if (!confirm(tr("confirmDeleteSubsection", { name: label }))) return;
      parent.subsections = parent.subsections.filter((s) => s.id !== secCtx.id);
    } else {
      const sec = findSection(secCtx.id);
      const label = sec ? sec.title : tr("thisSection");
      if (!confirm(tr("confirmDeleteSection", { name: label }))) return;
      state.sections = state.sections.filter((s) => s.id !== secCtx.id);
    }
    await persist();
    render();
    sectionDialog.close();
  });

  sectionCancel.addEventListener("click", () => sectionDialog.close());
  addSectionBtn.addEventListener("click", () => openSectionDialog(null, null));

  function locationValue(sectionId, subsectionId) {
    return subsectionId ? `${sectionId}::${subsectionId}` : sectionId;
  }

  function parseLocation(value) {
    const [secId, subId] = String(value || "").split("::");
    return { sectionId: secId, subsectionId: subId || null };
  }

  function populateLocations(selectedValue) {
    fieldLocation.innerHTML = "";
    state.sections.forEach((sec) => {
      const opt = document.createElement("option");
      opt.value = sec.id;
      opt.textContent = sec.title;
      fieldLocation.appendChild(opt);
      (sec.subsections || []).forEach((sub) => {
        const o = document.createElement("option");
        o.value = `${sec.id}::${sub.id}`;
        o.textContent = `${sec.title} \u203a ${sub.title}`;
        fieldLocation.appendChild(o);
      });
    });
    fieldLocation.value = selectedValue;
  }

  // Shortcut dialog
  function openShortcutDialog(sectionId, subsectionId, shortcut) {
    scCtx = {
      sectionId,
      subsectionId: subsectionId || null,
      shortcutId: shortcut ? shortcut.id : null,
    };
    dialogTitle.textContent = shortcut ? tr("editShortcut") : tr("addShortcut");
    fieldTitle.value = shortcut ? shortcut.title : "";
    fieldUrl.value = shortcut ? shortcut.url : "";
    fieldIcon.value = shortcut ? shortcut.icon || "" : "";
    // The location selector only makes sense when editing an existing shortcut.
    fieldLocationLabel.hidden = !shortcut;
    if (shortcut) populateLocations(locationValue(sectionId, subsectionId || null));
    dialogDelete.hidden = !shortcut;
    shortcutDialog.showModal();
    fieldTitle.focus();
  }

  shortcutForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const container = findContainer(scCtx.sectionId, scCtx.subsectionId);
    if (!container) return;
    const title = fieldTitle.value.trim();
    const url = normalizeUrl(fieldUrl.value);
    const icon = normalizeUrl(fieldIcon.value);
    if (!title || !url) return;
    if (scCtx.shortcutId) {
      const item = container.shortcuts.find((s) => s.id === scCtx.shortcutId);
      if (!item) return;
      item.title = title;
      item.url = url;
      item.icon = icon;
      const dest = parseLocation(fieldLocation.value);
      const moved =
        dest.sectionId !== scCtx.sectionId ||
        dest.subsectionId !== scCtx.subsectionId;
      if (moved) {
        const target = findContainer(dest.sectionId, dest.subsectionId);
        if (!target) return;
        if (target.shortcuts.length >= MAX) {
          alert(tr("maxShortcuts", { max: MAX }));
          return;
        }
        container.shortcuts = container.shortcuts.filter((s) => s.id !== item.id);
        target.shortcuts.push(item);
      }
    } else {
      if (container.shortcuts.length >= MAX) {
        alert(tr("maxShortcuts", { max: MAX }));
        return;
      }
      container.shortcuts.push({ id: uid("s"), title, url, icon });
    }
    await persist();
    render();
    shortcutDialog.close();
  });

  dialogDelete.addEventListener("click", async () => {
    const container = findContainer(scCtx.sectionId, scCtx.subsectionId);
    if (!container || !scCtx.shortcutId) return;
    container.shortcuts = container.shortcuts.filter((s) => s.id !== scCtx.shortcutId);
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
