import { describe, it, expect } from 'vitest'
import { advanceTutorial, createTutorialState, TutorialEntry } from './tutorial-machine'
import type { TutorialSignals, TutorialState } from './tutorial-machine'
import { POWER_LOW_FRACTION } from './tutorial-script'

function signals(over: Partial<TutorialSignals> = {}): TutorialSignals {
  return {
    realDt: 0,
    clicked: false,
    flung: false,
    powerFraction: 1,
    abilitySwapped: false,
    swapAbilityUsed: false,
    spaceMetal: 0,
    shieldFraction: 1,
    acknowledged: false,
    ...over,
  }
}

// A fresh desktop state parked at a given step, for focused trigger tests.
function at(stepIndex: number, isTouch = false): TutorialState {
  return { ...createTutorialState(TutorialEntry.firstPlay, isTouch), stepIndex }
}

// Same, but parked at the step with the given id — survives reordering the script.
function atId(id: string, isTouch = false): TutorialState {
  const base = createTutorialState(TutorialEntry.firstPlay, isTouch)
  return { ...base, stepIndex: base.steps.findIndex((s) => s.id === id) }
}

function currentId(state: TutorialState): string {
  return state.steps[state.stepIndex].id
}

describe('createTutorialState', () => {
  it('uses the same beats on touch and desktop (only the copy differs)', () => {
    const desktop = createTutorialState(TutorialEntry.firstPlay, false).steps.map((s) => s.id)
    const touch = createTutorialState(TutorialEntry.firstPlay, true).steps.map((s) => s.id)
    expect(touch).toEqual(desktop)
  })

  it('starts at the intro, not done', () => {
    const state = createTutorialState(TutorialEntry.replay, false)
    expect(currentId(state)).toBe('intro')
    expect(state.done).toBe(false)
  })
})

describe('advanceTutorial — triggers', () => {
  it('advances a time beat once its duration elapses', () => {
    const { state } = advanceTutorial(at(0), signals({ realDt: 2.8 }))
    expect(currentId(state)).toBe('attackPrompt')
  })

  it('does not advance a time beat before its duration', () => {
    const view = advanceTutorial(at(0), signals({ realDt: 0.1 }))
    expect(currentId(view.state)).toBe('intro')
    expect(view.copy).toContain('flies itself')
  })

  it('advances the mine beat once the ship takes damage (flew into the mine)', () => {
    const stay = advanceTutorial(atId('mineWatch'), signals({ shieldFraction: 1 }))
    expect(currentId(stay.state)).toBe('mineWatch')
    expect(stay.frozen).toBe(false)
    const { state } = advanceTutorial(atId('mineWatch'), signals({ shieldFraction: 0.6 }))
    expect(currentId(state)).toBe('collectMetal')
  })

  it('advances the attack beat on a click and freezes until then', () => {
    const frozen = advanceTutorial(atId('attackPrompt'), signals())
    expect(frozen.frozen).toBe(true)
    expect(frozen.spotlight).toBe('enemy')
    const { state } = advanceTutorial(atId('attackPrompt'), signals({ clicked: true }))
    expect(currentId(state)).toBe('attackResolve')
  })

  it('advances the fling beat on a fling', () => {
    const { state } = advanceTutorial(atId('flingPrompt'), signals({ flung: true }))
    expect(currentId(state)).toBe('flingResolve')
  })

  it('advances the power beat when power drops to the low fraction', () => {
    const stay = advanceTutorial(
      atId('powerSpend'),
      signals({ powerFraction: POWER_LOW_FRACTION + 0.1 })
    )
    expect(currentId(stay.state)).toBe('powerSpend')
    const { state } = advanceTutorial(
      atId('powerSpend'),
      signals({ powerFraction: POWER_LOW_FRACTION })
    )
    expect(currentId(state)).toBe('powerRecharge')
  })

  it('advances the swap beat when a different ability is selected', () => {
    const stay = advanceTutorial(atId('swapAbility'), signals({ abilitySwapped: false }))
    expect(currentId(stay.state)).toBe('swapAbility')
    const { state } = advanceTutorial(atId('swapAbility'), signals({ abilitySwapped: true }))
    expect(currentId(state)).toBe('useBlackHole')
  })

  it('advances the use-ability beat straight to the outro once the swapped ability is cast', () => {
    const stay = advanceTutorial(atId('useBlackHole'), signals({ swapAbilityUsed: false }))
    expect(currentId(stay.state)).toBe('useBlackHole')
    const { state } = advanceTutorial(atId('useBlackHole'), signals({ swapAbilityUsed: true }))
    expect(currentId(state)).toBe('outro')
  })

  it('leaves the outro unfrozen so the black hole plays out behind the card', () => {
    const view = advanceTutorial(atId('outro'), signals({ realDt: 5 }))
    expect(currentId(view.state)).toBe('outro')
    expect(view.frozen).toBe(false)
    expect(view.awaitingAck).toBe(true)
  })

  it('advances the collect beat once space metal is picked up', () => {
    const stay = advanceTutorial(atId('collectMetal'), signals({ spaceMetal: 0 }))
    expect(currentId(stay.state)).toBe('collectMetal')
    const { state } = advanceTutorial(atId('collectMetal'), signals({ spaceMetal: 1 }))
    expect(currentId(state)).toBe('shieldRefresh')
  })

  it('advances the shield beat once the shield is restored', () => {
    const stay = advanceTutorial(atId('shieldRefresh'), signals({ shieldFraction: 0 }))
    expect(currentId(stay.state)).toBe('shieldRefresh')
    const { state } = advanceTutorial(atId('shieldRefresh'), signals({ shieldFraction: 1 }))
    expect(currentId(state)).toBe('swapAbility')
  })
})

describe('advanceTutorial — completion + framing', () => {
  it('finishes after the last (outro) beat is acknowledged', () => {
    const lastIndex = createTutorialState(TutorialEntry.firstPlay, false).steps.length - 1
    const stay = advanceTutorial(at(lastIndex), signals({ realDt: 10 }))
    expect(stay.finished).toBe(false)
    expect(stay.ackLabel).toBe('Finish')
    const done = advanceTutorial(at(lastIndex), signals({ acknowledged: true }))
    expect(done.finished).toBe(true)
    expect(done.state.done).toBe(true)
  })

  it('stays finished once done', () => {
    const lastIndex = createTutorialState(TutorialEntry.firstPlay, false).steps.length - 1
    const done = advanceTutorial(at(lastIndex), signals({ acknowledged: true }))
    const again = advanceTutorial(done.state, signals({ realDt: 5 }))
    expect(again.finished).toBe(true)
  })

  it('advances at most one step per frame even with a huge dt', () => {
    const { state } = advanceTutorial(at(0), signals({ realDt: 1000 }))
    expect(state.stepIndex).toBe(1)
  })

  it('resolves touch copy for the intro', () => {
    const view = advanceTutorial(at(0, true), signals({ realDt: 0.1 }))
    expect(view.copy).toContain('the guardian')
  })

  it('reports 1-based progress that tracks the step index', () => {
    const total = createTutorialState(TutorialEntry.firstPlay, false).steps.length
    const first = advanceTutorial(at(0), signals({ realDt: 0.1 }))
    expect(first.stepNumber).toBe(1)
    expect(first.stepCount).toBe(total)
    const third = advanceTutorial(at(2), signals())
    expect(third.stepNumber).toBe(3)
  })
})
