import { useRef } from 'react'
import { BackButton } from '../../../../components/PageFormatting/BackButton'
import ToggleableSection from '../../../../components/ToggleableSection/ToggleableSection'
import { useNullSpace } from './useNullSpace'
import { GameHUD } from './components/GameHUD'
import { GameOverlay } from './components/GameOverlay'
import { GAME_VERSION, CHANGELOG } from './data'
import styles from './NullSpace.module.scss'

function NullSpace() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    uiState,
    handleStart,
    handleNextWave,
    handleRestart,
    setSelectedAbility,
    handlePurchaseUpgrade,
    handleFinishUpgrades,
  } = useNullSpace(canvasRef)

  return (
    <div className={styles.wrapper}>
      <BackButton />
      <div className={styles.gameContainer}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <GameHUD uiState={uiState} onAbilitySelect={setSelectedAbility} />
        <GameOverlay
          uiState={uiState}
          onStart={handleStart}
          onNextWave={handleNextWave}
          onRestart={handleRestart}
          onPurchaseUpgrade={handlePurchaseUpgrade}
          onFinishUpgrades={handleFinishUpgrades}
        />
      </div>
      <div className={styles.changelog}>
        <ToggleableSection title={`Release Notes (v${GAME_VERSION})`}>
          {CHANGELOG.map((entry) => (
            <div key={entry.version} className={styles.version}>
              <h4 className={styles.versionTitle}>
                v{entry.version} <span className={styles.versionDate}>— {entry.date}</span>
              </h4>
              {entry.changes.breaking && (
                <div className={styles.changeGroup}>
                  <span className={styles.changeLabel}>Breaking</span>
                  <ul className={styles.changeList}>
                    {entry.changes.breaking.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {entry.changes.features && (
                <div className={styles.changeGroup}>
                  <span className={styles.changeLabel}>Features</span>
                  <ul className={styles.changeList}>
                    {entry.changes.features.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {entry.changes.balance && (
                <div className={styles.changeGroup}>
                  <span className={styles.changeLabel}>Balance</span>
                  <ul className={styles.changeList}>
                    {entry.changes.balance.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {entry.changes.fixes && (
                <div className={styles.changeGroup}>
                  <span className={styles.changeLabel}>Fixes</span>
                  <ul className={styles.changeList}>
                    {entry.changes.fixes.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </ToggleableSection>
      </div>
    </div>
  )
}

export default NullSpace
