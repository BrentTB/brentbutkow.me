import { SHIP_ORDER, SHIP_VARIANTS } from '../../engine/ship/ship-data'
import { GamePhase, ShipKind } from '../../engine/types'
import type { DevPatch, GameUIState } from '../../useNullSpace'
import styles from './DevConsole.module.scss'

type DevConsoleProps = {
  uiState: GameUIState
  onPatch: (patch: DevPatch) => void
  onJumpToUpgrades: () => void
  onQuickStart: (kind: ShipKind) => void
}

export function DevConsole({ uiState, onPatch, onJumpToUpgrades, onQuickStart }: DevConsoleProps) {
  const inGame = uiState.phase !== GamePhase.menu && uiState.phase !== GamePhase.shipSelection

  return (
    <aside className={styles.console}>
      <h3 className={styles.title}>Dev Console</h3>

      <Section label="Ship Type">
        <div className={styles.shipGrid}>
          {SHIP_ORDER.map((kind) => (
            <button
              key={kind}
              type="button"
              className={`${styles.shipBtn} ${uiState.shipKind === kind ? styles.shipBtnActive : ''}`}
              onClick={() => (inGame ? onPatch({ shipKind: kind }) : onQuickStart(kind))}
            >
              {SHIP_VARIANTS[kind].label}
            </button>
          ))}
        </div>
        {!inGame && <p className={styles.hint}>Not in game — clicking a ship will quick-start.</p>}
      </Section>

      <Section label="Progression">
        <NumField
          label="Wave"
          value={uiState.wave}
          onCommit={(v) => onPatch({ wave: v })}
          disabled={!inGame}
        />
        <div className={styles.readonlyRow}>
          <span className={styles.readonlyLabel}>Level</span>
          <span className={styles.readonlyValue}>{uiState.level}</span>
        </div>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={onJumpToUpgrades}
          disabled={!inGame}
        >
          Skip to Upgrade Menu
        </button>
      </Section>

      <Section label="Currency">
        <NumField
          label="Score"
          value={uiState.score}
          onCommit={(v) => onPatch({ score: v })}
          disabled={!inGame}
        />
        <NumField
          label="Stardust"
          value={uiState.currency}
          onCommit={(v) => onPatch({ currency: v })}
          disabled={!inGame}
        />
        <NumField
          label="Space Metal"
          value={uiState.spaceMetal}
          onCommit={(v) => onPatch({ spaceMetal: v })}
          disabled={!inGame}
        />
      </Section>

      <Section label="Ship Health">
        <NumField
          label="HP"
          value={uiState.shipHp}
          onCommit={(v) => onPatch({ shipHp: v })}
          disabled={!inGame}
        />
        <NumField
          label="Max HP"
          value={uiState.shipMaxHp}
          onCommit={(v) => onPatch({ shipMaxHp: v })}
          disabled={!inGame}
        />
        <NumField
          label="Shield"
          value={uiState.shipShield}
          onCommit={(v) => onPatch({ shipShield: v })}
          disabled={!inGame}
        />
        <NumField
          label="Max Shield"
          value={uiState.shipMaxShield}
          onCommit={(v) => onPatch({ shipMaxShield: v })}
          disabled={!inGame}
        />
      </Section>

      <Section label="Combat Stats">
        <NumField
          label="Damage"
          value={uiState.shipDamage}
          onCommit={(v) => onPatch({ shipDamage: v })}
          disabled={!inGame}
        />
        <NumField
          label="Fire Rate"
          value={uiState.shipFireRate}
          onCommit={(v) => onPatch({ shipFireRate: v })}
          disabled={!inGame}
          step="0.1"
        />
        <NumField
          label="Speed"
          value={uiState.shipSpeed}
          onCommit={(v) => onPatch({ shipSpeed: v })}
          disabled={!inGame}
        />
      </Section>

      <Section label="Power">
        <NumField
          label="Power"
          value={uiState.power}
          onCommit={(v) => onPatch({ power: v })}
          disabled={!inGame}
        />
        <NumField
          label="Max Power"
          value={uiState.maxPower}
          onCommit={(v) => onPatch({ maxPower: v })}
          disabled={!inGame}
        />
      </Section>
    </aside>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>{label}</div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

function NumField({
  label,
  value,
  onCommit,
  disabled,
  step,
}: {
  label: string
  value: number
  onCommit: (v: number) => void
  disabled?: boolean
  step?: string
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="number"
        className={styles.fieldInput}
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        step={step ?? '1'}
        disabled={disabled}
        onChange={(e) => {
          const parsed = Number(e.target.value)
          if (Number.isFinite(parsed)) onCommit(parsed)
        }}
      />
    </label>
  )
}
