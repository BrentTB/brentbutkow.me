import { useCallback, useEffect, useRef, useState } from 'react'
import { BackButton } from '../../../../components/PageFormatting/BackButton'
import { ToggleableSection } from '../../../../components/ToggleableSection/ToggleableSection'
import { useNullSpace } from './useNullSpace'
import { usePseudoFullscreenChrome } from './usePseudoFullscreenChrome'
import { GameHUD } from './components/GameHUD/GameHUD'
import { GameOverlay } from './components/GameOverlay'
import { DevConsole } from './components/Development/DevConsole'
import { ChangelogFilters } from './components/ChangelogFilters/ChangelogFilters'
import { GAME_VERSION, CHANGELOG } from './data'
import { computeHudScale } from './renderer/camera'
import {
  loadChangelogFilters,
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
    handleStart,
    handleSelectShip,
    handleNextWave,
    handleRestart,
    setSelectedAbility,
    handlePurchaseUpgrade,
    handleFinishUpgrades,
    handlePause,
    handleResume,
    handleSetSpeed,
    handleUseSpaceMetalAbility,
    handleDevPatch,
    handleDevJumpToUpgrades,
    handleDevQuickStart,
  } = useNullSpace(canvasRef)

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

    // Enter path: try the real API; if it doesn't exist or it rejects,
    // fall back to the CSS pseudo-fullscreen.
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
      <BackButton />
      <div className={styles.gameRow}>
        <div
          ref={gameContainerRef}
          className={`${styles.gameContainer} ${pseudoFullscreen ? styles.pseudoFullscreen : ''}`}
        >
          <canvas ref={canvasRef} className={styles.canvas} />
          <GameHUD
            uiState={uiState}
            onAbilitySelect={setSelectedAbility}
            onPause={handlePause}
            onToggleFullscreen={handleToggleFullscreen}
            onUseSpaceMetalAbility={handleUseSpaceMetalAbility}
            isFullscreen={isFullscreen}
            gameSpeed={gameSpeed}
          />
          <GameOverlay
            uiState={uiState}
            onStart={handleStart}
            onSelectShip={handleSelectShip}
            onNextWave={handleNextWave}
            onRestart={handleRestart}
            onPurchaseUpgrade={handlePurchaseUpgrade}
            onFinishUpgrades={handleFinishUpgrades}
            onResume={handleResume}
            onSetSpeed={handleSetSpeedAndSync}
            gameSpeed={gameSpeed}
          />
        </div>
        {DEV_MODE && (
          <DevConsole
            uiState={uiState}
            onPatch={handleDevPatch}
            onJumpToUpgrades={handleDevJumpToUpgrades}
            onQuickStart={handleDevQuickStart}
          />
        )}
      </div>
      <div className={styles.changelog}>
        <ToggleableSection title={`Release Notes (v${GAME_VERSION})`}>
          <ChangelogFilters filters={changelogFilters} onChange={handleChangelogFiltersChange} />
          {CHANGELOG.map((entry) => {
            const groups: { key: keyof typeof entry.changes; label: string; items?: string[] }[] = [
              { key: 'breaking', label: 'Breaking', items: entry.changes.breaking },
              { key: 'features', label: 'Features', items: entry.changes.features },
              { key: 'balance', label: 'Balance', items: entry.changes.balance },
              { key: 'fixes', label: 'Fixes', items: entry.changes.fixes },
              { key: 'ui', label: 'User Interface', items: entry.changes.ui },
              {
                key: 'architecture',
                label: 'Internal Architecture',
                items: entry.changes.architecture,
              },
            ]
            const visible = groups.filter((g) => changelogFilters[g.key] && g.items?.length)
            if (visible.length === 0) return null
            return (
              <div key={entry.version} className={styles.version}>
                <h4 className={styles.versionTitle}>
                  v{entry.version} <span className={styles.versionDate}>— {entry.date}</span>
                </h4>
                {visible.map((g) => (
                  <div key={g.key} className={styles.changeGroup}>
                    <span className={styles.changeLabel}>{g.label}</span>
                    <ul className={styles.changeList}>
                      {g.items!.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )
          })}
        </ToggleableSection>
      </div>
    </div>
  )
}
