const KEYS = {
  workflows: "restflow_workflows",
  endpoints: "restflow_endpoints",
  active: "restflow_active",
} as const;

export function loadFromStorage<T>(key: keyof typeof KEYS, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(KEYS[key]);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage(key: keyof typeof KEYS, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEYS[key], JSON.stringify(value));
  } catch {
    console.warn(`Failed to save ${key} to localStorage`);
  }
}
