import { useCallback, useEffect, useRef, useState } from 'react'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { ToggleableSection } from '../../components/ToggleableSection/ToggleableSection'
import { useNullSpace } from './useNullSpace'
import { usePseudoFullscreenChrome } from './usePseudoFullscreenChrome'
import { usePreventPinchZoom } from './usePreventPinchZoom'
import { resetPinchZoom } from './reset-pinch-zoom'
import { GameHUD } from './components/GameHUD/GameHUD'
import { GameControls } from './components/GameHUD/GameControls'
import { GameOverlay } from './components/GameOverlay'
import { GameUIStateProvider } from './useGameUIState'
import { TutorialOverlay } from './components/Tutorial/TutorialOverlay'
import { DevConsole } from './components/Development/DevConsole'
import { ChangelogFilters } from './components/ChangelogFilters/ChangelogFilters'
import { GAME_NAME, GAME_VERSION, CHANGELOG } from './data'
import { TutorialEntry } from './engine/tutorial/tutorial-machine'
import { computeHudScale } from './renderer/camera'
import {
  getVisibleChangelogEntries,
  loadChangelogFilters,
  loadTutorialSeen,
  saveChangelogFilters,
  type ChangelogFilters as ChangelogFiltersState,
} from './engine/world/persistence'
import styles from './NullSpace.module.scss'

// Shows the dev mode console for easier dev testing
const DEV_MODE = import.meta.env.VITE_NULL_SPACE_DEV_MODE === 'true'

export function NullSpace() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const {
    uiState,
    hasSave,
    handleStart,
    handleContinue,
    handleSaveAndExit,
    handleSelectShip,
    handleRestart,
    handleSubmitScore,
    setSelectedAbility,
    handlePurchaseUpgrade,
    handlePurchaseUltimate,
    handleSalvageAbility,
    handleFinishUpgrades,
    handlePause,
    handleResume,
    handleSetSpeed,
    handleUseSpaceMetalAbility,
    handleStartTutorial,
    handleSkipTutorial,
    handleTutorialAck,
    handleDevPatch,
    handleDevJumpToUpgrades,
    handleDevJumpToBoss,
    handleDevQuickStart,
    handleDevSpawnCalamity,
  } = useNullSpace(canvasRef)

  // Start Game routes a first-ever player (never seen the tutorial) through the
  // onboarding demo wave first; it flows into ship selection when done. Returning
  // players go straight to ship selection.
  const handleMenuStart = useCallback(() => {
    if (loadTutorialSeen()) handleStart()
    else handleStartTutorial(TutorialEntry.firstPlay)
  }, [handleStart, handleStartTutorial])

  const handleReplayTutorial = useCallback(
    () => handleStartTutorial(TutorialEntry.replay),
    [handleStartTutorial]
  )

  const [isRealFullscreen, setIsRealFullscreen] = useState(false)
  // Pseudo-fullscreen fallback for browsers without the Fullscreen API
  // (most notably iPhone Safari). Toggled when requestFullscreen is unavailable
  // or rejects.
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false)
  const isFullscreen = isRealFullscreen || pseudoFullscreen
  const [gameSpeed, setGameSpeedState] = useState(1)
  const [changelogFilters, setChangelogFilters] = useState<ChangelogFiltersState>(() =>
    loadChangelogFilters()
  )

  const handleChangelogFiltersChange = useCallback((next: ChangelogFiltersState) => {
    setChangelogFilters(next)
    saveChangelogFilters(next)
  }, [])

  const visibleChangelog = getVisibleChangelogEntries(CHANGELOG, changelogFilters)

  const handleSetSpeedAndSync = useCallback(
    (speed: number) => {
      handleSetSpeed(speed)
      setGameSpeedState(speed)
    },
    [handleSetSpeed]
  )

  const handleToggleFullscreen = useCallback(() => {
    const el = gameContainerRef.current
    if (!el) return

    // Exit path: handle whichever mode is currently active.
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
      return
    }
    if (pseudoFullscreen) {
      setPseudoFullscreen(false)
      return
    }

    // Enter path: snap any browser pinch-zoom back to normal first (the canvas's
    // touch-action blocks pinching it out mid-play), then try the real API; if it
    // doesn't exist or rejects, fall back to the CSS pseudo-fullscreen.
    resetPinchZoom()
    if (typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(() => setPseudoFullscreen(true))
    } else {
      setPseudoFullscreen(true)
    }
  }, [pseudoFullscreen])

  useEffect(() => {
    const onChange = () => setIsRealFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Keep Safari's URL / tab bar hidden in pseudo-fullscreen — on entry and
  // after each rotate (Safari re-shows the bars when the phone turns).
  usePseudoFullscreenChrome(pseudoFullscreen)

  // Stop browser pinch-zoom while the game is open — the canvas eats touches, so
  // a zoomed-in page can't be pinched back out mid-play.
  usePreventPinchZoom()

  // HUD scaling — keep overlay text/buttons proportional to the gameplay area
  // so fullscreen doesn't leave a 28px pause icon stranded on a 1080p screen.
  // ResizeObserver covers window resizes; the isFullscreen dep covers the
  // CSS-class-driven fullscreen toggle, which can otherwise miss observers
  // in some environments.
  useEffect(() => {
    const el = gameContainerRef.current
    if (!el) return
    const apply = () => {
      const scale = computeHudScale(el.clientWidth, el.clientHeight)
      el.style.setProperty('--hud-scale', scale.toFixed(3))
    }
    apply()
    // Layout may still be settling for the class-driven fullscreen toggle.
    const raf = requestAnimationFrame(apply)
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [isFullscreen])

  return (
    <div className={styles.wrapper}>
      <div className={styles.pageIntro}>
        <PageHeader title={GAME_NAME} />
        <p className={styles.intro}>
          A space-defense game where you bend space itself: sling meteors, open black holes, and
          warp reality to keep your ship alive. It runs right here in your browser and saves
          locally, so you can pick your run back up later.
        </p>
      </div>
      <div className={styles.gameRow}>
        <GameUIStateProvider value={uiState}>
          <div
            ref={gameContainerRef}
            className={`${styles.gameContainer} ${pseudoFullscreen ? styles.pseudoFullscreen : ''}`}
          >
            <div className={styles.playArea}>
              <canvas ref={canvasRef} className={styles.canvas} />
              <GameHUD
                onPause={handlePause}
                onToggleFullscreen={handleToggleFullscreen}
                isFullscreen={isFullscreen}
                gameSpeed={gameSpeed}
              />
              {uiState.tutorialActive && (
                <TutorialOverlay
                  copy={uiState.tutorialCopy}
                  awaitingAck={uiState.tutorialAwaitingAck}
                  ackLabel={uiState.tutorialAckLabel}
                  isFinal={uiState.tutorialIsFinal}
                  onAck={handleTutorialAck}
                  onSkip={handleSkipTutorial}
                />
              )}
            </div>
            <div className={styles.controlBar}>
              <GameControls
                onAbilitySelect={setSelectedAbility}
                onUseSpaceMetalAbility={handleUseSpaceMetalAbility}
              />
            </div>
            <GameOverlay
              onStart={handleMenuStart}
              onContinue={handleContinue}
              hasSave={hasSave}
              onSaveAndExit={handleSaveAndExit}
              onSelectShip={handleSelectShip}
              onRestart={handleRestart}
              onSubmitScore={handleSubmitScore}
              onPurchaseUpgrade={handlePurchaseUpgrade}
              onPurchaseUltimate={handlePurchaseUltimate}
              onSalvageAbility={handleSalvageAbility}
              onFinishUpgrades={handleFinishUpgrades}
              onResume={handleResume}
              onSetSpeed={handleSetSpeedAndSync}
              onReplayTutorial={handleReplayTutorial}
              gameSpeed={gameSpeed}
            />
          </div>
          {DEV_MODE && (
            <DevConsole
              onPatch={handleDevPatch}
              onJumpToUpgrades={handleDevJumpToUpgrades}
              onJumpToBoss={handleDevJumpToBoss}
              onQuickStart={handleDevQuickStart}
              onSpawnCalamity={handleDevSpawnCalamity}
            />
          )}
        </GameUIStateProvider>
      </div>
      <div className={styles.changelog}>
        <ToggleableSection title={`Release Notes (v${GAME_VERSION})`} allowOverflow>
          <ChangelogFilters filters={changelogFilters} onChange={handleChangelogFiltersChange} />
          {visibleChangelog.length === 0 ? (
            <p className={styles.changelogEmpty}>No release notes match the current filters.</p>
          ) : (
            visibleChangelog.map((entry) => (
              <div key={entry.version} className={styles.version}>
                <h4 className={styles.versionTitle}>
                  v{entry.version} <span className={styles.versionDate}>— {entry.date}</span>
                </h4>
                {entry.groups.map((g) => (
                  <div key={g.key} className={styles.changeGroup}>
                    <span className={styles.changeLabel}>{g.label}</span>
                    <ul className={styles.changeList}>
                      {g.items.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))
          )}
        </ToggleableSection>
      </div>
    </div>
  )
}
