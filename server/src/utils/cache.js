/**
 * Lightweight bounded in-memory TTL cache with in-flight request coalescing
 * (stampede protection). Keeps Render → Supabase latency under ~200ms.
 */
const MAX_ENTRIES = 1000;
const store = new Map(); // key -> { value, expiresAt }
const inflight = new Map(); // key -> Promise

const pruneIfNeeded = () => {
  if (store.size < MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, entry] of store) {
    if (entry.expiresAt <= now) store.delete(k);
  }
  while (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
};

export const cache = {
  get(key) {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      store.delete(key);
      return undefined;
    }
    return entry.value;
  },

  set(key, value, ttlMs) {
    pruneIfNeeded();
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  },

  del(key) {
    store.delete(key);
  },

  invalidatePrefix(prefix) {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },

  /** Returns cached value or runs `fn()` once for concurrent callers with the same key. */
  async remember(key, ttlMs, fn) {
    const hit = this.get(key);
    if (hit !== undefined) return hit;

    const pending = inflight.get(key);
    if (pending) return pending;

    const promise = Promise.resolve()
      .then(fn)
      .then((val) => {
        if (val !== undefined) this.set(key, val, ttlMs);
        return val;
      })
      .finally(() => {
        inflight.delete(key);
      });

    inflight.set(key, promise);
    return promise;
  },
};
