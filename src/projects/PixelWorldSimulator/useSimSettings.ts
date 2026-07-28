import { useCallback, useRef, useState } from 'react'
import { SimSetting, SimSettings } from './pixel-world.types'
import { DEFAULT_SETTINGS, SETTINGS_KEY } from './data'

/**
 * Reads the saved settings a field at a time, defaulting anything missing or the wrong type. Whatever is
 * in storage came from an older build or a hand-edited value, so nothing in it is trusted: a stray string
 * where a boolean belongs would otherwise reach the renderer as a truthy value.
 */
function readSettings(): SimSettings {
  let stored: unknown
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    stored = raw === null ? null : JSON.parse(raw)
  } catch {
    // Unreadable storage (private mode, a quota error, malformed JSON) is the same as none.
    return { ...DEFAULT_SETTINGS }
  }

  if (stored === null || typeof stored !== 'object') return { ...DEFAULT_SETTINGS }

  const saved: Record<string, unknown> = { ...stored }
  const settings = { ...DEFAULT_SETTINGS }
  for (const setting of Object.values(SimSetting)) {
    const value = saved[setting]
    if (typeof value === 'boolean') settings[setting] = value
  }
  return settings
}

function writeSettings(settings: SimSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // A world that renders is worth more than a saved preference: a full or blocked store is ignored.
  }
}

export type SimSettingsControl = {
  settings: SimSettings
  toggle(setting: SimSetting): void
  /**
   * Applies one setting for this session without saving it, for a world arriving from a shared link: it
   * changes what you are looking at, not the preference you come back to.
   */
  apply(setting: SimSetting, value: boolean): void
}

/** The viewer's picture settings, kept in `localStorage` so a world looks the way they left it. */
export function useSimSettings(): SimSettingsControl {
  const [settings, setSettings] = useState<SimSettings>(readSettings)
  // The saved preferences. Only a deliberate toggle writes here, so a shared world can change the live
  // settings for one session without ever overwriting what the viewer chose for themselves.
  const savedRef = useRef(settings)

  const toggle = useCallback((setting: SimSetting) => {
    setSettings((current) => {
      const next = { ...current, [setting]: !current[setting] }
      savedRef.current = { ...savedRef.current, [setting]: next[setting] }
      writeSettings(savedRef.current)
      return next
    })
  }, [])

  const apply = useCallback((setting: SimSetting, value: boolean) => {
    setSettings((current) =>
      current[setting] === value ? current : { ...current, [setting]: value }
    )
  }, [])

  return { settings, toggle, apply }
}
