import {
  POWER_LOW_FRACTION,
  TUTORIAL_STEPS,
  TutorialSpotlightKind,
  TutorialTriggerKind,
} from './tutorial-script'
import type { TutorialStep } from './tutorial-script'

// How the tutorial was entered — decides where finishing/skipping returns to.
export const TutorialEntry = {
  // Very first run: flows into the real game (ship selection) when done.
  firstPlay: 'firstPlay',
  // Replayed from the menu: returns to the menu when done.
  replay: 'replay',
} as const
export type TutorialEntry = (typeof TutorialEntry)[keyof typeof TutorialEntry]

// Per-frame inputs the machine reads. `realDt` is wall-clock seconds — NOT the
// simulation dt, which is forced to 0 while a beat is frozen. Timers run on real
// time so they keep ticking during a freeze.
export type TutorialSignals = {
  realDt: number
  clicked: boolean
  flung: boolean
  powerFraction: number
  // True once the selected ability is no longer the starting meteorite.
  abilitySwapped: boolean
  // True once the swapped-to ability has actually been cast.
  swapAbilityUsed: boolean
  // Current space metal count, and shield as a 0..1 fraction of max.
  spaceMetal: number
  shieldFraction: number
  // Set the frame the player presses the overlay's Next / Finish button.
  acknowledged: boolean
}

export type TutorialState = {
  entry: TutorialEntry
  isTouch: boolean
  // Full ordered script; only the copy differs by device.
  steps: TutorialStep[]
  stepIndex: number
  elapsedInStep: number
  done: boolean
}

// Everything the UI + loop need for a frame, derived from the (new) state.
export type TutorialView = {
  state: TutorialState
  frozen: boolean
  finished: boolean
  copy: string
  spotlight: TutorialSpotlightKind
  // True when the only way forward is the Next / Finish button.
  awaitingAck: boolean
  // Button label while awaiting acknowledgement ('Finish' on the last step).
  ackLabel: string | null
  // The last beat — the UI hides Skip here (Finish already ends the tutorial).
  isFinalStep: boolean
}

export function createTutorialState(entry: TutorialEntry, isTouch: boolean): TutorialState {
  // isTouch only swaps copy (click ↔ tap); every beat applies on both.
  return { entry, isTouch, steps: [...TUTORIAL_STEPS], stepIndex: 0, elapsedInStep: 0, done: false }
}

function stepCopy(step: TutorialStep, isTouch: boolean): string {
  return isTouch ? step.copyTouch : step.copyDesktop
}

function isSatisfied(step: TutorialStep, elapsedInStep: number, signals: TutorialSignals): boolean {
  switch (step.trigger) {
    case TutorialTriggerKind.time:
      // No duration → never auto-advance (don't satisfy on frame 0 with `?? 0`).
      return elapsedInStep >= (step.durationSeconds ?? Infinity)
    case TutorialTriggerKind.click:
      return signals.clicked
    case TutorialTriggerKind.fling:
      return signals.flung
    case TutorialTriggerKind.powerLow:
      return signals.powerFraction <= POWER_LOW_FRACTION
    case TutorialTriggerKind.abilitySwap:
      return signals.abilitySwapped
    case TutorialTriggerKind.swapAbilityUsed:
      return signals.swapAbilityUsed
    case TutorialTriggerKind.spaceMetalCollected:
      return signals.spaceMetal >= 1
    case TutorialTriggerKind.shieldRestored:
      return signals.shieldFraction >= 0.99
    case TutorialTriggerKind.shipDamaged:
      return signals.shieldFraction < 0.99
    case TutorialTriggerKind.acknowledge:
      return signals.acknowledged
    default:
      return false
  }
}

const FINISHED_VIEW = (state: TutorialState): TutorialView => ({
  state,
  frozen: false,
  finished: true,
  copy: '',
  spotlight: TutorialSpotlightKind.none,
  awaitingAck: false,
  ackLabel: null,
  isFinalStep: false,
})

function view(state: TutorialState, step: TutorialStep): TutorialView {
  const awaitingAck = step.trigger === TutorialTriggerKind.acknowledge
  const isLast = state.stepIndex === state.steps.length - 1
  return {
    state,
    frozen: step.freeze,
    finished: false,
    copy: stepCopy(step, state.isTouch),
    spotlight: step.spotlight,
    awaitingAck,
    ackLabel: awaitingAck ? (isLast ? 'Finish' : 'Next') : null,
    isFinalStep: isLast,
  }
}

// Advances at most one step per call: a single frame's signals can satisfy the
// current beat, but never cascade through several. Returns the new state plus
// the projection the loop and overlay render this frame.
export function advanceTutorial(state: TutorialState, signals: TutorialSignals): TutorialView {
  if (state.done) return FINISHED_VIEW(state)

  const step = state.steps[state.stepIndex]
  if (!step) return FINISHED_VIEW({ ...state, done: true })

  const elapsedInStep = state.elapsedInStep + signals.realDt

  if (isSatisfied(step, elapsedInStep, signals)) {
    const nextIndex = state.stepIndex + 1
    if (nextIndex >= state.steps.length) return FINISHED_VIEW({ ...state, done: true })
    const nextState = { ...state, stepIndex: nextIndex, elapsedInStep: 0 }
    return view(nextState, state.steps[nextIndex])
  }

  return view({ ...state, elapsedInStep }, step)
}
