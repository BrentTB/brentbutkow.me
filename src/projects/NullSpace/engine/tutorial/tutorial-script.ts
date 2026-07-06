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

// Pacing rules the script follows (the old cut of this tutorial tested badly —
// too much forced watching): a "watch" beat runs 2.6s or less, every lesson the
// player can act out is act-triggered rather than narrated, and the world only
// freezes on beats that wait for a specific input.
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'intro',
    trigger: TutorialTriggerKind.time,
    spotlight: TutorialSpotlightKind.ship,
    freeze: false,
    durationSeconds: 2.6,
    copyDesktop:
      "This is your ship. It flies itself — you don't pilot it. You're the guardian: keep it alive.",
    copyTouch:
      "This is your ship. It flies itself — you don't pilot it. You're the guardian: keep it alive.",
  },
  {
    id: 'attackPrompt',
    trigger: TutorialTriggerKind.click,
    spotlight: TutorialSpotlightKind.enemy,
    freeze: true,
    allowCast: true,
    keepEnemyAlive: true,
    copyDesktop: 'Click the marked enemy to call down a meteorite.',
    copyTouch: 'Tap the marked enemy to call down a meteorite.',
  },
  {
    id: 'attackResolve',
    trigger: TutorialTriggerKind.time,
    spotlight: TutorialSpotlightKind.none,
    freeze: false,
    durationSeconds: 1.8,
    copyDesktop: 'Direct hit. You can strike anywhere, no matter where the ship is.',
    copyTouch: 'Direct hit. You can strike anywhere, no matter where the ship is.',
  },
  {
    id: 'powerSpend',
    trigger: TutorialTriggerKind.powerLow,
    spotlight: TutorialSpotlightKind.none,
    freeze: false,
    allowCast: true,
    keepEnemyAlive: true,
    copyDesktop: 'Keep firing. Every cast spends power — run the bar down.',
    copyTouch: 'Keep firing. Every cast spends power — run the bar down.',
  },
  {
    id: 'powerRecharge',
    trigger: TutorialTriggerKind.time,
    spotlight: TutorialSpotlightKind.none,
    freeze: false,
    durationSeconds: 2.6,
    copyDesktop: "Power's out. It refills on its own — spend it wisely.",
    copyTouch: "Power's out. It refills on its own — spend it wisely.",
  },
  {
    id: 'flingPrompt',
    trigger: TutorialTriggerKind.fling,
    spotlight: TutorialSpotlightKind.ship,
    freeze: true,
    allowFling: true,
    copyDesktop:
      "You can't steer the ship, but you can fling it: drag it and let go. Fling too often and it overheats.",
    copyTouch:
      "You can't steer the ship, but you can fling it: drag it and let go. Fling too often and it overheats.",
  },
  {
    // Also settle time: the mine row on the next beat is laid relative to the
    // ship, so the fling needs to decay before the row is placed in its path.
    id: 'flingResolve',
    trigger: TutorialTriggerKind.time,
    spotlight: TutorialSpotlightKind.none,
    freeze: false,
    durationSeconds: 2.5,
    copyDesktop: "That's your only steering — use it to yank the ship out of danger.",
    copyTouch: "That's your only steering — use it to yank the ship out of danger.",
  },
  {
    id: 'mineWatch',
    trigger: TutorialTriggerKind.shipDamaged,
    spotlight: TutorialSpotlightKind.mine,
    freeze: false,
    spawnsMine: true,
    copyDesktop:
      "Mines ahead. They damage anything that touches them, and the ship won't dodge. Watch.",
    copyTouch:
      "Mines ahead. They damage anything that touches them, and the ship won't dodge. Watch.",
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
    copyDesktop: 'That dented your shield. Enemies drop ⬢ space metal — click a piece to grab it.',
    copyTouch: 'That dented your shield. Enemies drop ⬢ space metal — tap a piece to grab it.',
  },
  {
    id: 'shieldRefresh',
    trigger: TutorialTriggerKind.shieldRestored,
    spotlight: TutorialSpotlightKind.ship,
    freeze: true,
    allowSpaceMetalKeys: true,
    copyDesktop: 'Spend that ⬢ space metal to patch the shield: press F.',
    copyTouch: 'Spend that ⬢ space metal to patch the shield: tap the Shield button.',
  },
  {
    id: 'swapAbility',
    trigger: TutorialTriggerKind.abilitySwap,
    spotlight: TutorialSpotlightKind.none,
    freeze: true,
    allowAbilityKeys: true,
    copyDesktop: 'You unlock more powers as you level up. Press 2 to switch to Black Hole.',
    copyTouch: 'You unlock more powers as you level up. Tap Black Hole in your toolbar.',
  },
  {
    id: 'useBlackHole',
    trigger: TutorialTriggerKind.swapAbilityUsed,
    spotlight: TutorialSpotlightKind.enemy,
    freeze: false,
    allowCast: true,
    keepEnemyAlive: true,
    refillsPower: true,
    copyDesktop: 'Click beside the enemy to drop your Black Hole and watch it pull everything in.',
    copyTouch: 'Tap beside the enemy to drop your Black Hole and watch it pull everything in.',
  },
  {
    // Unfrozen so the Black Hole from the previous beat plays out behind the card.
    id: 'outro',
    trigger: TutorialTriggerKind.acknowledge,
    spotlight: TutorialSpotlightKind.none,
    freeze: false,
    copyDesktop:
      "That's the loop, guardian: clear waves, grab upgrades, keep the ship alive. Good luck.",
    copyTouch:
      "That's the loop, guardian: clear waves, grab upgrades, keep the ship alive. Good luck.",
  },
]
