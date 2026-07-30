import { Player, PlayerProfile } from '../../tic-tac-toe.types'
import { cssVars } from '../../css-vars'
import { MAX_NAME_LENGTH, PLAYER_COLOURS, gameCopy } from '../../data'
import styles from './PlayerSetup.module.scss'

interface PlayerSetupProps {
  players: Record<Player, PlayerProfile>
  /** Which seat the computer holds, if any, so the row can say so. The name is still yours to change. */
  computer: Player | null
  onRename: (player: Player, name: string) => void
  onRecolour: (player: Player, rgb: string) => void
}

const SLOTS: readonly Player[] = [Player.one, Player.two]

export function PlayerSetup({ players, computer, onRename, onRecolour }: PlayerSetupProps) {
  return (
    <section className={styles.setup} aria-labelledby="players-heading">
      <h2 id="players-heading" className={styles.heading}>
        {gameCopy.playersTitle}
      </h2>

      {SLOTS.map((slot, index) => {
        const profile = players[slot]
        const takenByOther = players[SLOTS[1 - index]].rgb
        const isComputer = slot === computer

        return (
          <div key={slot} className={styles.row}>
            <label className={styles.field} htmlFor={`${slot}-name`}>
              <span className={styles.label}>
                {gameCopy.nameLabel(index + 1)}
                {isComputer && <span className={styles.tag}>{gameCopy.computerTag}</span>}
              </span>
              <input
                id={`${slot}-name`}
                type="text"
                value={profile.name}
                maxLength={MAX_NAME_LENGTH}
                onChange={(event) => onRename(slot, event.target.value)}
                className={styles.input}
                style={cssVars({ '--bead-rgb': profile.rgb })}
              />
            </label>

            <div
              className={styles.colours}
              role="radiogroup"
              aria-label={gameCopy.colourLabel(profile.name)}
            >
              {PLAYER_COLOURS.map((colour) => (
                <button
                  key={colour.id}
                  type="button"
                  role="radio"
                  aria-checked={profile.rgb === colour.rgb}
                  aria-label={colour.name}
                  // Two players sharing a colour would make the board unreadable.
                  disabled={colour.rgb === takenByOther}
                  className={styles.swatch}
                  style={cssVars({ '--bead-rgb': colour.rgb })}
                  onClick={() => onRecolour(slot, colour.rgb)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
