import { describe, it, expect } from 'vitest'
import { advanceTutorial, createTutorialState, TutorialEntry } from './tutorial-machine'
import type { TutorialSignals, TutorialState } from './tutorial-machine'
import { POWER_LOW_FRACTION } from './tutorial-script'

function signals(over: Partial<TutorialSignals> = {}): TutorialSignals {
  return {
    realDt: 0,
    clicked: false,
    flung: false,
    movementKeyPressed: false,
    powerFraction: 1,
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
  it('keeps the keyboard-only steps on desktop', () => {
    const state = createTutorialState(TutorialEntry.firstPlay, false)
    const ids = state.steps.map((s) => s.id)
    expect(ids).toContain('tryControls')
    expect(ids).toContain('controlsRejected')
  })

  it('drops the keyboard-only steps on touch', () => {
    const state = createTutorialState(TutorialEntry.firstPlay, true)
    const ids = state.steps.map((s) => s.id)
    expect(ids).not.toContain('tryControls')
    expect(ids).not.toContain('controlsRejected')
    expect(state.steps.length).toBe(
      createTutorialState(TutorialEntry.firstPlay, false).steps.length - 2
    )
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
    expect(currentId(state)).toBe('tryControls')
  })

  it('does not advance a time beat before its duration', () => {
    const view = advanceTutorial(at(0), signals({ realDt: 0.1 }))
    expect(currentId(view.state)).toBe('intro')
    expect(view.copy).toContain('on its own')
  })

  it('advances the controls beat when a movement key is pressed', () => {
    const { state } = advanceTutorial(
      atId('tryControls'),
      signals({ realDt: 0.1, movementKeyPressed: true })
    )
    expect(currentId(state)).toBe('controlsRejected')
  })

  it('advances the controls beat on the no-stuck fallback even without a key', () => {
    const { state } = advanceTutorial(atId('tryControls'), signals({ realDt: 4 }))
    expect(currentId(state)).toBe('controlsRejected')
  })

  it('advances an acknowledge beat only on a button press', () => {
    const stay = advanceTutorial(atId('controlsRejected'), signals({ realDt: 5 }))
    expect(currentId(stay.state)).toBe('controlsRejected')
    expect(stay.awaitingAck).toBe(true)
    expect(stay.ackLabel).toBe('Next')
    const { state } = advanceTutorial(atId('controlsRejected'), signals({ acknowledged: true }))
    expect(currentId(state)).toBe('attackPrompt')
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
    expect(view.copy).toContain("you're its guardian")
  })
})
