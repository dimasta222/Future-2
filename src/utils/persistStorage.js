const DB_NAME = "future-studio";
const DB_VERSION = 1;
const IMG_STORE = "images";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IMG_STORE)) {
        db.createObjectStore(IMG_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveImage(key, dataUrl) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IMG_STORE, "readwrite");
      tx.objectStore(IMG_STORE).put(dataUrl, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* quota or access error — silently skip */ }
}

export async function loadImage(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IMG_STORE, "readonly");
      const req = tx.objectStore(IMG_STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
}

export async function clearImages() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IMG_STORE, "readwrite");
      tx.objectStore(IMG_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

const CALC_KEY = "future-calc-state";
const CONSTRUCTOR_KEY = "future-constructor-state";

export function saveCalcState(state) {
  try { localStorage.setItem(CALC_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function loadCalcState() {
  try {
    const raw = localStorage.getItem(CALC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearCalcState() {
  try { localStorage.removeItem(CALC_KEY); } catch { /* ignore */ }
}

export function saveConstructorMeta(state) {
  try { localStorage.setItem(CONSTRUCTOR_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function loadConstructorMeta() {
  try {
    const raw = localStorage.getItem(CONSTRUCTOR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearConstructorMeta() {
  try { localStorage.removeItem(CONSTRUCTOR_KEY); } catch { /* ignore */ }
}
