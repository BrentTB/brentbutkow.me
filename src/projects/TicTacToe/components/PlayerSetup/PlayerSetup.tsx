import { useRovingRadio } from '../../../../components/utils/useRovingRadio'
import { Player, PlayerProfile } from '../../tic-tac-toe.types'
import { cssVars } from '../../css-vars'
import { MAX_NAME_LENGTH, PLAYER_COLOURS, PLAYER_SLOTS, gameCopy } from '../../data'
import styles from './PlayerSetup.module.scss'

interface PlayerSetupProps {
  /** The profiles as typed, so an emptied name field stays empty while it is being edited. */
  players: Record<Player, PlayerProfile>
  /** The same names with the default filled in for a blank one, for anything that reads them out. */
  displayNames: Record<Player, string>
  /** Which seat the computer holds, if any, so the row can say so. The name is still yours to change. */
  computer: Player | null
  /** Online, the one seat that is yours: the other player's name and colour are theirs to set. */
  ownSlot?: Player | null
  /** Replaces the numbered name label, for when the row is yours rather than a numbered seat. */
  ownLabel?: string
  /** Colour already taken by the other player, when it is not held in `players` (an online opponent). */
  reservedColour?: string
  onRename: (player: Player, name: string) => void
  onRecolour: (player: Player, rgb: string) => void
}

const COLOUR_VALUES = PLAYER_COLOURS.map((colour) => colour.rgb)

export function PlayerSetup({
  players,
  displayNames,
  computer,
  ownSlot = null,
  ownLabel,
  reservedColour,
  onRename,
  onRecolour,
}: PlayerSetupProps) {
  const shown = ownSlot === null ? PLAYER_SLOTS : [ownSlot]

  return (
    <section className={styles.setup} aria-labelledby="players-heading">
      <h2 id="players-heading" className={styles.heading}>
        {gameCopy.playersTitle}
      </h2>

      {shown.map((slot) => {
        const index = PLAYER_SLOTS.indexOf(slot)
        return (
          <PlayerRow
            key={slot}
            slot={slot}
            profile={players[slot]}
            displayName={displayNames[slot]}
            nameLabel={ownLabel ?? gameCopy.nameLabel(index + 1)}
            takenByOther={reservedColour ?? players[PLAYER_SLOTS[1 - index]].rgb}
            isComputer={slot === computer}
            onRename={onRename}
            onRecolour={onRecolour}
          />
        )
      })}
    </section>
  )
}

type PlayerRowProps = {
  slot: Player
  profile: PlayerProfile
  displayName: string
  nameLabel: string
  takenByOther: string
  isComputer: boolean
  onRename: (player: Player, name: string) => void
  onRecolour: (player: Player, rgb: string) => void
}

/** One seat: what it is called, and which colour it plays in. */
function PlayerRow({
  slot,
  profile,
  displayName,
  nameLabel,
  takenByOther,
  isComputer,
  onRename,
  onRecolour,
}: PlayerRowProps) {
  const colourKeys = useRovingRadio(COLOUR_VALUES, profile.rgb, (rgb) => onRecolour(slot, rgb))

  return (
    <div className={styles.row}>
      <label className={styles.field} htmlFor={`${slot}-name`}>
        <span className={styles.label}>
          {nameLabel}
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
        aria-label={gameCopy.colourLabel(displayName)}
      >
        {PLAYER_COLOURS.map((colour, colourIndex) => {
          // Two players sharing a colour would make the board unreadable.
          const taken = colour.rgb === takenByOther
          return (
            <button
              key={colour.id}
              type="button"
              role="radio"
              aria-checked={profile.rgb === colour.rgb}
              /* The reason travels with the label: "disabled" on its own leaves a screen reader with no
                 idea the colour is simply the other player's. */
              aria-label={taken ? gameCopy.colourTakenLabel(colour.name) : colour.name}
              title={taken ? gameCopy.colourTakenLabel(colour.name) : undefined}
              disabled={taken}
              className={styles.swatch}
              style={cssVars({ '--bead-rgb': colour.rgb })}
              onClick={() => onRecolour(slot, colour.rgb)}
              {...colourKeys(colourIndex)}
            />
          )
        })}
      </div>
    </div>
  )
}
