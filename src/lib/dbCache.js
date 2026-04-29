export function readCache(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : null
  } catch { return null }
}

export function writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}
