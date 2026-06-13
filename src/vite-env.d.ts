/// <reference types="vite/client" />

// Merges with vite/client's ImportMetaEnv (which keeps its string index signature),
// so this just adds a typed key without affecting other VITE_* vars.
interface ImportMetaEnv {
  readonly VITE_RECALL_API_URL?: string
}
