// Ordered script for the onboarding demo wave. Pure data — the machine
// (tutorial-machine.ts) walks these steps and the UI projects them. The core
// lesson is that the player is independent from the ship: the ship flies and
// fires on its own; the player attacks by clicking and can only nudge the ship
// with a slingshot fling.

export const TutorialTriggerKind = {
  // Advances once the beat has been shown for `durationSeconds`.
  time: 'time',
  // Advances when the player clicks/taps to cast.
  click: 'click',
  // Advances when the player flings the ship via the slingshot.
  fling: 'fling',
  // Advances when the player presses a movement key — or, as a fallback so
  // nobody gets stuck, after `durationSeconds`.
  movementKey: 'movementKey',
  // Advances when power has drained to POWER_LOW_FRACTION.
  powerLow: 'powerLow',
  // Advances only when the player presses the Next / Finish button.
  acknowledge: 'acknowledge',
} as const
export type TutorialTriggerKind = (typeof TutorialTriggerKind)[keyof typeof TutorialTriggerKind]

export const TutorialSpotlightKind = {
  ship: 'ship',
  enemy: 'enemy',
  none: 'none',
} as const
export type TutorialSpotlightKind =
  (typeof TutorialSpotlightKind)[keyof typeof TutorialSpotlightKind]

// Power fraction (0..1) at which the "power runs low" beat is satisfied.
export const POWER_LOW_FRACTION = 0.15

export type TutorialStep = {
  id: string
  trigger: TutorialTriggerKind
  spotlight: TutorialSpotlightKind
  // Whether the simulation is frozen (dt forced to 0) while this beat shows.
  freeze: boolean
  copyDesktop: string
  // Touch copy — keyboard-only steps are dropped on touch (appliesOnTouch), so
  // their touch copy is empty.
  copyTouch: string
  // For `time` beats: seconds before advancing. For the `movementKey` beat: the
  // no-stuck fallback after which it advances even if no key was pressed.
  durationSeconds?: number
  // Keyboard-only steps are filtered out on touch devices (false). Defaults true.
  appliesOnTouch?: boolean
  // Whether the player's clicks reach the engine (cast abilities) on this beat.
  // Off everywhere except the beats that teach casting, so stray clicks during
  // a "watch"/"freeze" beat don't fire a meteorite. Defaults false.
  allowCast?: boolean
  // Whether the player can grab + fling the ship on this beat. Off everywhere
  // except the slingshot beat, so a frozen beat can't be flung past. Defaults false.
  allowFling?: boolean
  // Keep a target enemy alive on this beat (respawn a tougher drone if the
  // ship's own fire clears them), so there's always something to shoot. Defaults false.
  keepEnemyAlive?: boolean
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'intro',
    trigger: TutorialTriggerKind.time,
    spotlight: TutorialSpotlightKind.ship,
    freeze: false,
    durationSeconds: 2.8,
    copyDesktop: 'Watch your ship — it flies and fires entirely on its own.',
    copyTouch:
      "Watch your ship — it flies and fires on its own. You don't control it; you're its guardian.",
  },
  {
    id: 'tryControls',
    trigger: TutorialTriggerKind.movementKey,
    spotlight: TutorialSpotlightKind.ship,
    freeze: true,
    durationSeconds: 4,
    appliesOnTouch: false,
    copyDesktop: 'Try to steer it — press W A S D or the arrow keys.',
    copyTouch: '',
  },
  {
    id: 'controlsRejected',
    trigger: TutorialTriggerKind.acknowledge,
    spotlight: TutorialSpotlightKind.ship,
    freeze: true,
    appliesOnTouch: false,
    copyDesktop:
      "Nothing happens. You don't pilot this ship — it's automated. You are its guardian, not its pilot.",
    copyTouch: '',
  },
  {
    id: 'attackPrompt',
    trigger: TutorialTriggerKind.click,
    spotlight: TutorialSpotlightKind.enemy,
    freeze: true,
    allowCast: true,
    keepEnemyAlive: true,
    copyDesktop: "Here's your power: click the marked enemy to call down a meteorite.",
    copyTouch: "Here's your power: tap the marked enemy to call down a meteorite.",
  },
  {
    id: 'attackResolve',
    trigger: TutorialTriggerKind.time,
    spotlight: TutorialSpotlightKind.none,
    freeze: false,
    durationSeconds: 2.6,
    copyDesktop: 'Boom. You attack independently of the ship — anywhere, any time.',
    copyTouch: 'Boom. You attack independently of the ship — anywhere, any time.',
  },
  {
    id: 'flingPrompt',
    trigger: TutorialTriggerKind.fling,
    spotlight: TutorialSpotlightKind.ship,
    freeze: true,
    allowFling: true,
    copyDesktop:
      "You can't steer the ship — but you can fling it. Drag the ship to slingshot it. Just watch your heat level (top-left) — fling too much and it overheats.",
    copyTouch:
      "You can't steer the ship — but you can fling it. Drag the ship to slingshot it. Just watch your heat level (top-left) — fling too much and it overheats.",
  },
  {
    id: 'flingResolve',
    trigger: TutorialTriggerKind.time,
    spotlight: TutorialSpotlightKind.none,
    freeze: false,
    durationSeconds: 2,
    copyDesktop: 'Slingshot the ship to dodge danger or reposition.',
    copyTouch: 'Slingshot the ship to dodge danger or reposition.',
  },
  {
    id: 'powerSpend',
    trigger: TutorialTriggerKind.powerLow,
    spotlight: TutorialSpotlightKind.none,
    freeze: false,
    allowCast: true,
    keepEnemyAlive: true,
    copyDesktop: 'Keep firing — click to launch meteorites until your power bar runs low.',
    copyTouch: 'Keep firing — tap to launch meteorites until your power bar runs low.',
  },
  {
    id: 'powerRecharge',
    trigger: TutorialTriggerKind.time,
    spotlight: TutorialSpotlightKind.none,
    freeze: false,
    durationSeconds: 3.2,
    copyDesktop: 'Out of power — the bar refills on its own over time. Spend it wisely.',
    copyTouch: 'Out of power — the bar refills on its own over time. Spend it wisely.',
  },
  {
    id: 'outro',
    trigger: TutorialTriggerKind.acknowledge,
    spotlight: TutorialSpotlightKind.none,
    freeze: true,
    copyDesktop:
      "That's the core of it, guardian. Clear each sector, grab upgrades between waves, and survive. Good luck.",
    copyTouch:
      "That's the core of it, guardian. Clear each sector, grab upgrades between waves, and survive. Good luck.",
  },
]
