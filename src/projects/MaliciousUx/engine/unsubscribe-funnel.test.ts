import { describe, expect, it } from 'vitest'
import {
  advanceFunnel,
  FUNNEL_ORDER,
  FunnelAnswer,
  FunnelStep,
  questionsRemaining,
} from './unsubscribe-funnel'

describe('advanceFunnel', () => {
  it('takes every question in the catalogue to reach the exit', () => {
    let step: FunnelStep = FunnelStep.start
    let asked = 0

    while (step !== FunnelStep.gone) {
      step = advanceFunnel(step, FunnelAnswer.leave)
      asked += 1
    }

    expect(asked).toBe(FUNNEL_ORDER.length)
  })

  it('lets one press keep you subscribed, from any step', () => {
    for (const step of FUNNEL_ORDER) {
      expect(advanceFunnel(step, FunnelAnswer.stay)).toBe(FunnelStep.kept)
    }
  })

  it('reports how many questions are left, counting the current one', () => {
    expect(questionsRemaining(FunnelStep.start)).toBe(FUNNEL_ORDER.length)
    expect(questionsRemaining(FunnelStep.confirm)).toBe(1)
  })

  it('has nothing left to ask once the funnel has ended', () => {
    expect(questionsRemaining(FunnelStep.gone)).toBe(0)
    expect(questionsRemaining(FunnelStep.kept)).toBe(0)
  })
})
