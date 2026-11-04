// Small helpers for localStorage, the storage space each website gets in your browser.
// They never crash the page: some browsers block storage, for example in some private windows.

export function readJSON(key, fallback) {
  try {
    const text = localStorage.getItem(key);
    return text === null ? fallback : JSON.parse(text);
  } catch {
    return fallback;
  }
}

// Returns true if it worked, false if the browser refused.
export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
