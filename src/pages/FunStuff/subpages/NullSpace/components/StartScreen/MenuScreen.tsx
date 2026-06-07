import { GAME_NAME } from '../../data'
import sharedStyles from '../OverlayShared.module.scss'

type MenuScreenProps = {
  onStart: () => void
}

export function MenuScreen({ onStart }: MenuScreenProps) {
  return (
    <>
      <h2 className={sharedStyles.title}>{GAME_NAME}</h2>
      <p className={sharedStyles.subtitle}>You are a cosmic guardian. Protect the ship.</p>
      <p className={sharedStyles.hint}>
        The ship flies and fights on its own, your job is to bend space itself: click anywhere to
        drop meteors, unlock more powers as you level up, and tap the <strong>?</strong> in-game any
        time for the full controls.
      </p>
      <button className={sharedStyles.primaryBtn} onClick={onStart}>
        Start Game
      </button>
    </>
  )
}
