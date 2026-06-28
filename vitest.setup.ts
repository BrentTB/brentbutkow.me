// Node 22+ exposes a native global `localStorage` that stays disabled unless `--localstorage-file` is
// passed. In the Vitest jsdom environment that inert global shadows jsdom's Web Storage, leaving
// `localStorage`/`sessionStorage` undefined and breaking any save/load test. Install a real in-memory
// Storage so tests behave the same on every Node version.
class MemoryStorage {
  private store = new Map<string, string>()

  get length() {
    return this.store.size
  }

  clear() {
    this.store.clear()
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  key(index: number) {
    return [...this.store.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.store.delete(key)
  }

  setItem(key: string, value: string) {
    this.store.set(String(key), String(value))
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(globalThis, name, {
    value: new MemoryStorage() as unknown as Storage,
    configurable: true,
    writable: true,
  })
}
