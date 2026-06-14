import { GAME_NAME } from '../../data'
import sharedStyles from '../OverlayShared.module.scss'

type MenuScreenProps = {
  onStart: () => void
  onContinue: () => void
  hasSave: boolean
}

export function MenuScreen({ onStart, onContinue, hasSave }: MenuScreenProps) {
  return (
    <>
      <h2 className={sharedStyles.title}>{GAME_NAME}</h2>
      <p className={sharedStyles.subtitle}>
        You are a cosmic guardian. Shepherd the ship through hostile sectors.
      </p>
      {/* Returning players (with a save) skip the onboarding blurb — it keeps the
          menu from cramming the extra Continue button into the same space. */}
      {!hasSave && (
        <p className={sharedStyles.hint}>
          The ship auto-pilots forward through each sector and fights on its own — your job is to
          bend space itself: click anywhere to drop meteorites and clear the path ahead, unlocking
          more powers as you advance. Press the settings menu to get to the help screen in-game any
          time for the full controls.
        </p>
      )}
      {hasSave && (
        <button className={sharedStyles.primaryBtn} onClick={onContinue}>
          Continue
        </button>
      )}
      <button
        className={hasSave ? sharedStyles.secondaryBtn : sharedStyles.primaryBtn}
        onClick={onStart}
      >
        {hasSave ? 'New Game' : 'Start Game'}
      </button>
    </>
  )
}
