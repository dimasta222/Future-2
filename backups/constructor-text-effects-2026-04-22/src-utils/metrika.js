// Yandex.Metrika helper. Counter is initialized in index.html.
// Use reachGoal() for events and hit() for SPA navigation.

const COUNTER_ID = 108719738;

function ymCall(...args) {
  if (typeof window === "undefined" || typeof window.ym !== "function") return;
  try {
    window.ym(COUNTER_ID, ...args);
  } catch {
    /* ignore — metrika failures must not break the app */
  }
}

export function reachGoal(name, params) {
  if (!name) return;
  if (params && Object.keys(params).length > 0) {
    ymCall("reachGoal", name, params);
  } else {
    ymCall("reachGoal", name);
  }
}

export function hit(url) {
  ymCall("hit", url || (typeof window !== "undefined" ? window.location.href : "/"));
}
