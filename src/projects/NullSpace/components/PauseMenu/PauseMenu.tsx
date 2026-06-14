import sharedStyles from '../OverlayShared.module.scss'

interface PauseMenuProps {
  onResume: () => void
  onSettings: () => void
  onRestart: () => void
  onHelp: () => void
  onSaveAndExit: () => void
}

export const PauseMenu = ({
  onResume,
  onSettings,
  onRestart,
  onHelp,
  onSaveAndExit,
}: PauseMenuProps) => {
  return (
    <>
      <h2 className={sharedStyles.title}>Paused</h2>
      <button className={sharedStyles.primaryBtn} onClick={onResume}>
        Resume
      </button>
      <button className={sharedStyles.secondaryBtn} onClick={onSettings}>
        Settings
      </button>
      <button className={sharedStyles.secondaryBtn} onClick={onRestart}>
        Restart
      </button>
      <button className={sharedStyles.secondaryBtn} onClick={onHelp}>
        Help
      </button>
      <button className={sharedStyles.secondaryBtn} onClick={onSaveAndExit}>
        Save &amp; Exit
      </button>
      <p className={sharedStyles.hint}>Press P to resume</p>
    </>
  )
}
