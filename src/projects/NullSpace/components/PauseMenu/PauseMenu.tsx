import sharedStyles from '../OverlayShared.module.scss'

interface PauseMenuProps {
  onResume: () => void
  onSettings: () => void
  onRestart: () => void
  onHelp: () => void
  onSaveAndExit: () => void
  // Only offered once a save exists (after the first shop) — before that there's
  // nothing to return to, so exiting would just lose the run.
  canSaveAndExit: boolean
}

export const PauseMenu = ({
  onResume,
  onSettings,
  onRestart,
  onHelp,
  onSaveAndExit,
  canSaveAndExit,
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
      {canSaveAndExit && (
        <button className={sharedStyles.secondaryBtn} onClick={onSaveAndExit}>
          Save &amp; Exit
        </button>
      )}
      <p className={sharedStyles.hint}>Press P to resume</p>
    </>
  )
}
