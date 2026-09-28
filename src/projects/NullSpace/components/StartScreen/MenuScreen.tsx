import { GAME_NAME } from '../../data'
import { loadTutorialSeen } from '../../engine/world/persistence'
import sharedStyles from '../OverlayShared.module.scss'
import { useStoredState } from '../../../../utils/useStoredState'

type MenuScreenProps = {
  onStart: () => void
  onContinue: () => void
  hasSave: boolean
  onShowLeaderboard: () => void
  onReplayTutorial: () => void
}

export function MenuScreen({
  onStart,
  onContinue,
  hasSave,
  onShowLeaderboard,
  onReplayTutorial,
}: MenuScreenProps) {
  const [tutorialSeen] = useStoredState(loadTutorialSeen, false)
  return (
    <>
      <h2 className={sharedStyles.title}>{GAME_NAME}</h2>
      <p className={sharedStyles.subtitle}>
        You are a cosmic guardian. Guide the ship through enemy territory.
      </p>
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
      <button className={sharedStyles.secondaryBtn} onClick={onShowLeaderboard}>
        Leaderboard
      </button>
      {/* Replay the tutorial — hidden for first-timers, whose Start Game already
          runs it, so it isn't a redundant second entry point. */}
      {tutorialSeen && (
        <button className={sharedStyles.secondaryBtn} onClick={onReplayTutorial}>
          How to Play
        </button>
      )}
    </>
  )
}
