// Storage layer for QuickLinks. Uses chrome.storage.sync when available so
// shortcuts follow the user across devices, and falls back to localStorage
// (handy for opening newtab.html directly during development).

const STORAGE_KEY = "quicklinks";

const DEFAULT_SETTINGS = {
  bgColor: "#1a1a2e",
  bgImage: "",
  columns: 6,
  showTitles: true,
};

const DEFAULT_STATE = {
  shortcuts: [
    { id: "s1", title: "Google", url: "https://www.google.com" },
    { id: "s2", title: "YouTube", url: "https://www.youtube.com" },
    { id: "s3", title: "GitHub", url: "https://github.com" },
    { id: "s4", title: "Gmail", url: "https://mail.google.com" },
    { id: "s5", title: "Wikipedia", url: "https://www.wikipedia.org" },
  ],
  settings: { ...DEFAULT_SETTINGS },
};

const hasChromeStorage =
  typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;

function normalize(state) {
  const safe = state && typeof state === "object" ? state : {};
  return {
    shortcuts: Array.isArray(safe.shortcuts)
      ? safe.shortcuts
      : DEFAULT_STATE.shortcuts,
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

const QL = { Storage, DEFAULT_SETTINGS, DEFAULT_STATE };
if (typeof window !== "undefined") window.QL = QL;
