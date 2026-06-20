// Ordered script for the onboarding demo wave. Pure data — the machine
// (tutorial-machine.ts) walks these steps and the UI projects them. The core
// lesson is that the player is independent from the ship: the ship flies on its
// own; the player defends it by clicking (abilities + allies) and can only nudge
// the ship with a slingshot fling.

export const TutorialTriggerKind = {
  // Advances once the beat has been shown for `durationSeconds`.
  time: 'time',
  // Advances when the player clicks/taps to cast.
  click: 'click',
  // Advances when the player flings the ship via the slingshot.
  fling: 'fling',
  // Advances when power has drained to POWER_LOW_FRACTION.
  powerLow: 'powerLow',
  // Advances when the player selects a different ability (hotkey or toolbar tap).
  abilitySwap: 'abilitySwap',
  // Advances once the player has actually cast the swapped-to ability.
  swapAbilityUsed: 'swapAbilityUsed',
  // Advances once the player has picked up at least one space metal.
  spaceMetalCollected: 'spaceMetalCollected',
  // Advances when the shield has been restored (the shield space-metal ability).
  shieldRestored: 'shieldRestored',
  // Advances once the ship has taken damage (shield dropped below full) — the
  // mine beat, where the player slingshots into a mine and feels the hit.
  shipDamaged: 'shipDamaged',
  // Advances only when the player presses the Next / Finish button.
  acknowledge: 'acknowledge',
} as const
export type TutorialTriggerKind = (typeof TutorialTriggerKind)[keyof typeof TutorialTriggerKind]

export const TutorialSpotlightKind = {
  ship: 'ship',
  enemy: 'enemy',
  // A dropped space metal pickup / a hazard mine — resolved to its world pos.
  metal: 'metal',
  mine: 'mine',
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
  // Touch copy — shown on touch devices in place of copyDesktop.
  copyTouch: string
  // For `time` beats: seconds before advancing.
  durationSeconds?: number
  // Whether the player's clicks reach the engine (cast abilities) on this beat.
  // Off everywhere except the beats that teach casting, so stray clicks during
  // a "watch"/"freeze" beat don't fire a meteorite. Defaults false.
  allowCast?: boolean
  // Whether the player can grab + fling the ship on this beat. Off everywhere
  // except the slingshot beat, so a frozen beat can't be flung past. Defaults false.
  allowFling?: boolean
  // Keep a target enemy alive on this beat (respawn a tougher drone if it's
  // destroyed), so there's always something to aim at. Defaults false.
  keepEnemyAlive?: boolean
  // Let ability hotkeys (1-9) / toolbar taps select on this beat (the swap beat).
  // Other beats swallow them so the player can't drift off the guided path. Defaults false.
  allowAbilityKeys?: boolean
  // Let the space-metal hotkeys (F/G) fire on this beat (the shield-refresh beat). Defaults false.
  allowSpaceMetalKeys?: boolean
  // One-shot setup applied when this beat opens: drop a space metal pickup, place
  // a mine in the ship's path to fly into, park shield regen (so the mine's hit
  // sticks until repaired), or refill power (so a costly ability is affordable).
  spawnsMetal?: boolean
  spawnsMine?: boolean
  parksShieldRegen?: boolean
  refillsPower?: boolean
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'intro',
    trigger: TutorialTriggerKind.time,
    spotlight: TutorialSpotlightKind.ship,
    freeze: false,
    durationSeconds: 2.8,
    copyDesktop:
      "Watch the ship. It flies on its own, you don't pilot it. You're its guardian: keep it alive.",
    copyTouch:
      "Watch the ship. It flies on its own, you don't pilot it. You're its guardian: keep it alive.",
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
    copyDesktop: 'Boom. You attack independently of the ship, anywhere, any time.',
    copyTouch: 'Boom. You attack independently of the ship, anywhere, any time.',
  },
  {
    id: 'flingPrompt',
    trigger: TutorialTriggerKind.fling,
    spotlight: TutorialSpotlightKind.ship,
    freeze: true,
    allowFling: true,
    copyDesktop:
      "You can't steer the ship, but you can fling it. Drag the ship to slingshot it. Be careful: fling too much and it overheats.",
    copyTouch:
      "You can't steer the ship, but you can fling it. Drag the ship to slingshot it. Be careful: fling too much and it overheats.",
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
    copyDesktop: 'Keep firing: click to launch meteorites until your power bar runs low.',
    copyTouch: 'Keep firing: tap to launch meteorites until your power bar runs low.',
  },
  {
    id: 'powerRecharge',
    trigger: TutorialTriggerKind.time,
    spotlight: TutorialSpotlightKind.none,
    freeze: false,
    durationSeconds: 3.2,
    copyDesktop: 'Out of power. The bar refills on its own over time, so spend it wisely.',
    copyTouch: 'Out of power. The bar refills on its own over time, so spend it wisely.',
  },
  {
    id: 'swapAbility',
    trigger: TutorialTriggerKind.abilitySwap,
    spotlight: TutorialSpotlightKind.none,
    freeze: true,
    allowAbilityKeys: true,
    copyDesktop: 'You unlock more powers as you advance. Press 2 to switch to Black Hole.',
    copyTouch: 'You unlock more powers as you advance. Tap Black Hole in your toolbar to switch.',
  },
  {
    id: 'useBlackHole',
    trigger: TutorialTriggerKind.swapAbilityUsed,
    spotlight: TutorialSpotlightKind.enemy,
    freeze: false,
    allowCast: true,
    keepEnemyAlive: true,
    refillsPower: true,
    copyDesktop: 'Now click beside the enemy to drop your Black Hole. It pulls enemies in.',
    copyTouch: 'Now tap beside the enemy to drop your Black Hole. It pulls enemies in.',
  },
  {
    id: 'blackHoleResolve',
    trigger: TutorialTriggerKind.time,
    spotlight: TutorialSpotlightKind.none,
    freeze: false,
    durationSeconds: 4,
    keepEnemyAlive: true,
    copyDesktop: 'Watch the Black Hole drag everything caught in it toward the centre.',
    copyTouch: 'Watch the Black Hole drag everything caught in it toward the centre.',
  },
  {
    id: 'mineIntro',
    trigger: TutorialTriggerKind.acknowledge,
    spotlight: TutorialSpotlightKind.mine,
    freeze: true,
    spawnsMine: true,
    copyDesktop:
      "Those blinking objects are mines, and they damage anything that touches them. The ship flies on its own and won't dodge them.",
    copyTouch:
      "Those blinking objects are mines, and they damage anything that touches them. The ship flies on its own and won't dodge them.",
  },
  {
    id: 'mineHit',
    trigger: TutorialTriggerKind.shipDamaged,
    spotlight: TutorialSpotlightKind.mine,
    freeze: false,
    copyDesktop: 'Watch: with no input from you, it drifts straight into one.',
    copyTouch: 'Watch: with no input from you, it drifts straight into one.',
  },
  {
    id: 'collectMetal',
    trigger: TutorialTriggerKind.spaceMetalCollected,
    spotlight: TutorialSpotlightKind.metal,
    freeze: false,
    allowCast: true,
    spawnsMetal: true,
    // Park the shield's regen so the mine's hit sticks until the player repairs
    // it on the next beat — otherwise it would quietly heal on its own here.
    parksShieldRegen: true,
    // Anchor the ship (orbit a target) so it doesn't drift off and carry the
    // camera away from the static pickup before the player clicks it.
    keepEnemyAlive: true,
    copyDesktop:
      'The mine dented your shield. Some enemies drop ⬢ space metal — click it to grab some.',
    copyTouch:
      'The mine dented your shield. Some enemies drop ⬢ space metal — tap it to grab some.',
  },
  {
    id: 'shieldRefresh',
    trigger: TutorialTriggerKind.shieldRestored,
    spotlight: TutorialSpotlightKind.ship,
    freeze: true,
    allowSpaceMetalKeys: true,
    copyDesktop: 'Now spend that ⬢ space metal to repair your shield: press F.',
    copyTouch: 'Now spend that ⬢ space metal to repair your shield: tap the Shield button.',
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
