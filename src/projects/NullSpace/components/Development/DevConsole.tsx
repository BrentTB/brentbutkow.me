import { useState } from 'react'
import { ABILITY_META, BASE_KIND_OF, ULTIMATE_KIND_OF } from '../../engine/abilities'
import { BOSS_KINDS, getBossDefinition } from '../../engine/bosses/index'
import { SHIP_ORDER, SHIP_VARIANTS } from '../../engine/ship/ship-data'
import { WEAPON_ORDER } from '../../data'
import { GamePhase, ShipKind } from '../../engine/types'
import type { DevPatch } from '../../engine/dev-tools'
import type { GameUIState } from '../../useNullSpace'
import styles from './DevConsole.module.scss'

type DevConsoleProps = {
  uiState: GameUIState
  onPatch: (patch: DevPatch) => void
  onJumpToUpgrades: () => void
  onJumpToBoss: () => void
  onQuickStart: (kind: ShipKind) => void
}

// Base abilities only (ultimates are reached by clicking their already-unlocked base).
const BASE_ABILITIES = WEAPON_ORDER.filter((kind) => BASE_KIND_OF[kind] === undefined)

export function DevConsole({
  uiState,
  onPatch,
  onJumpToUpgrades,
  onJumpToBoss,
  onQuickStart,
}: DevConsoleProps) {
  const inGame = uiState.phase !== GamePhase.menu && uiState.phase !== GamePhase.shipSelection
  const [showAdvanced, setShowAdvanced] = useState(false)

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
        <button
          type="button"
          className={styles.actionBtn}
          onClick={onJumpToBoss}
          disabled={!inGame}
        >
          Skip to Boss Wave
        </button>
      </Section>

      <Section label="Boss">
        <div className={styles.readonlyRow}>
          <span className={styles.readonlyLabel}>Next Boss</span>
          <span className={styles.readonlyValue}>
            {getBossDefinition(uiState.nextBoss)?.hpBarLabel ?? uiState.nextBoss}
          </span>
        </div>
        <div className={styles.shipGrid}>
          {BOSS_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className={`${styles.shipBtn} ${uiState.nextBoss === kind ? styles.shipBtnActive : ''}`}
              onClick={() => onPatch({ nextBoss: kind })}
              disabled={!inGame}
            >
              {getBossDefinition(kind)?.hpBarLabel ?? kind}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Quick Actions">
        <div className={styles.shipGrid}>
          <button
            type="button"
            className={styles.shipBtn}
            disabled={!inGame}
            onClick={() => onPatch({ currency: 9999, spaceMetal: 9999, singularityShard: 9999 })}
          >
            Max Currencies
          </button>
          <button
            type="button"
            className={styles.shipBtn}
            disabled={!inGame}
            onClick={() => onPatch({ power: uiState.maxPower })}
          >
            Full Power
          </button>
          <button
            type="button"
            className={styles.shipBtn}
            disabled={!inGame}
            onClick={() =>
              onPatch({
                shipDamage: uiState.shipDamage * 5,
                shipFireRate: uiState.shipFireRate * 5,
              })
            }
          >
            Make Ship OP
          </button>
          <button
            type="button"
            className={styles.shipBtn}
            disabled={!inGame}
            onClick={() => onPatch({ shipShield: 5000, shipMaxShield: 5000 })}
          >
            Super Shield
          </button>
        </div>
      </Section>

      <Section label="Abilities">
        <div className={styles.shipGrid}>
          {BASE_ABILITIES.map((kind) => {
            const ability = uiState.abilities.find((a) => a.kind === kind)
            const unlocked = ability?.unlocked ?? false
            const ultimateKind = ULTIMATE_KIND_OF[kind]
            const ultimateOwned = ultimateKind
              ? uiState.ultimatesOwned.includes(ultimateKind)
              : false
            // The single click action this button offers: unlock a locked
            // ability, grant the ultimate of an unlocked one, else nothing left.
            const action = !unlocked ? 'unlock' : ultimateKind && !ultimateOwned ? 'grant' : 'done'
            return (
              <button
                key={kind}
                type="button"
                className={`${styles.shipBtn} ${unlocked ? styles.shipBtnActive : ''}`}
                disabled={!inGame || action === 'done'}
                title={
                  action === 'unlock' ? 'Unlock' : action === 'grant' ? 'Grant ultimate' : 'Owned'
                }
                onClick={() => {
                  if (action === 'unlock') onPatch({ unlockWeapon: kind })
                  else if (action === 'grant') onPatch({ grantUltimate: kind })
                }}
              >
                {ABILITY_META[kind].label}
                {ultimateOwned ? ' ★' : unlocked ? ' ✓' : ''}
              </button>
            )
          })}
        </div>
        <p className={styles.hint}>Click to unlock; click again to grant its ultimate (★).</p>
      </Section>

      <button type="button" className={styles.actionBtn} onClick={() => setShowAdvanced((v) => !v)}>
        {showAdvanced ? '▾ Hide detailed values' : '▸ Show detailed values'}
      </button>

      {showAdvanced && (
        <>
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
            <NumField
              label="Singularity Shard"
              value={uiState.singularityShard}
              onCommit={(v) => onPatch({ singularityShard: v })}
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
        </>
      )}
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
