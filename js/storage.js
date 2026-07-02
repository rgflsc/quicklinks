// Storage layer for QuickLinks. Uses chrome.storage.sync when available so
// shortcuts follow the user across devices, and falls back to localStorage
// (handy for opening newtab.html directly during development).

const STORAGE_KEY = "quicklinks";

const MAX_PER_SECTION = 10;

const DEFAULT_SETTINGS = {
  bgColor: "#1a1a2e",
  bgImage: "",
  columns: 6,
  showTitles: true,
  searchEngine: "default",
};

const DEFAULT_STATE = {
  sections: [
    {
      id: "sec1",
      title: "Shortcuts",
      shortcuts: [
        { id: "s1", title: "Google", url: "https://www.google.com" },
        { id: "s2", title: "YouTube", url: "https://www.youtube.com" },
        { id: "s3", title: "GitHub", url: "https://github.com" },
        { id: "s4", title: "Gmail", url: "https://mail.google.com" },
        { id: "s5", title: "Wikipedia", url: "https://www.wikipedia.org" },
      ],
    },
  ],
  settings: { ...DEFAULT_SETTINGS },
};

const hasChromeStorage =
  typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;

function normalizeShortcut(s) {
  return {
    id: s && s.id ? String(s.id) : `s_${Math.random().toString(36).slice(2, 9)}`,
    title: s && typeof s.title === "string" ? s.title : "",
    url: s && typeof s.url === "string" ? s.url : "",
  };
}

function normalizeSection(sec, index) {
  const shortcuts = Array.isArray(sec && sec.shortcuts) ? sec.shortcuts : [];
  return {
    id: sec && sec.id ? String(sec.id) : `sec_${index}_${Math.random().toString(36).slice(2, 7)}`,
    title: sec && typeof sec.title === "string" ? sec.title : "Shortcuts",
    shortcuts: shortcuts.slice(0, MAX_PER_SECTION).map(normalizeShortcut),
  };
}

function normalize(state) {
  const safe = state && typeof state === "object" ? state : {};
  let sections;
  if (Array.isArray(safe.sections)) {
    sections = safe.sections;
  } else if (Array.isArray(safe.shortcuts)) {
    // Migrate the old flat-shortcuts format into a single section.
    sections = [{ id: "sec1", title: "Shortcuts", shortcuts: safe.shortcuts }];
  } else {
    sections = DEFAULT_STATE.sections;
  }
  return {
    sections: sections.map(normalizeSection),
    settings: { ...DEFAULT_SETTINGS, ...(safe.settings || {}) },
  };
}

const Storage = {
  async load() {
    if (hasChromeStorage) {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      const stored = result[STORAGE_KEY];
      if (!stored) return normalize(DEFAULT_STATE);
      return normalize(stored);
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalize(JSON.parse(raw)) : normalize(DEFAULT_STATE);
    } catch {
      return normalize(DEFAULT_STATE);
    }
  },

  async save(state) {
    const value = normalize(state);
    if (hasChromeStorage) {
      await chrome.storage.sync.set({ [STORAGE_KEY]: value });
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  },

  async reset() {
    if (hasChromeStorage) {
      await chrome.storage.sync.remove(STORAGE_KEY);
      return normalize(DEFAULT_STATE);
    }
    localStorage.removeItem(STORAGE_KEY);
    return normalize(DEFAULT_STATE);
  },
};

const QL = { Storage, DEFAULT_SETTINGS, DEFAULT_STATE, MAX_PER_SECTION };
if (typeof window !== "undefined") window.QL = QL;
