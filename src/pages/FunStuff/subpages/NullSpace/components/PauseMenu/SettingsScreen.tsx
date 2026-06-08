import sharedStyles from '../OverlayShared.module.scss'

const SPEED_OPTIONS = [0.5, 1, 2] as const

type SettingsScreenProps = {
  gameSpeed: number
  onSetSpeed: (speed: number) => void
  onClose: () => void
}

export function SettingsScreen({ gameSpeed, onSetSpeed, onClose }: SettingsScreenProps) {
  return (
    <>
      <h2 className={sharedStyles.title}>Settings</h2>
      <div className={sharedStyles.settingRow}>
        <span className={sharedStyles.settingLabel}>Game speed</span>
        <div className={sharedStyles.segmented} role="group" aria-label="Game speed">
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={`${sharedStyles.segment} ${gameSpeed === speed ? sharedStyles.segmentActive : ''}`}
              aria-pressed={gameSpeed === speed}
              onClick={() => onSetSpeed(speed)}
            >
              {speed}×
            </button>
          ))}
        </div>
      </div>
      <button className={sharedStyles.primaryBtn} onClick={onClose}>
        Back
      </button>
    </>
  )
}
