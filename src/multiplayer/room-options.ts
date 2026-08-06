import { Seat } from './multiplayer.types'

// The room settings a player can choose, shared by every game's online panel: who opens, and how long
// a move may take. These are about the room, not any game's rules, so they live in the multiplayer
// layer rather than being redeclared per game.

/** Who opens an online game, from the point of view of whoever is setting the room up. */
export const ONLINE_STARTERS: readonly { seat: Seat; label: string }[] = [
  { seat: Seat.first, label: 'You' },
  { seat: Seat.second, label: 'Them' },
]

/** What no clock at all reads as, wherever a limit is shown. */
export const NO_MOVE_LIMIT_LABEL = 'None'

/**
 * How long a move may take. Unlimited stays first because it is the friendly default; the rest are
 * short enough to keep a game moving in one sitting. Add a new limit here and it appears in every
 * game's settings dialog — the server validates any value in [5s, room TTL], not an enumerated set.
 */
export const MOVE_LIMITS: readonly { seconds: number | null; label: string }[] = [
  { seconds: null, label: NO_MOVE_LIMIT_LABEL },
  { seconds: 30, label: '30s' },
  { seconds: 60, label: '1 min' },
  { seconds: 180, label: '3 min' },
]
