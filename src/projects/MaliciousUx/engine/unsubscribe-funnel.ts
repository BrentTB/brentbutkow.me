/**
 * The unsubscribe that keeps asking. Each step is a real question with a real answer; the answer just
 * leads to another question. `stay` is always the roomier, friendlier button — the machine only tracks
 * which step you are on, so the styling can stay in the component where it belongs.
 */

export const FunnelStep = {
  start: 'start',
  guilt: 'guilt',
  bargain: 'bargain',
  survey: 'survey',
  confirm: 'confirm',
  gone: 'gone',
  kept: 'kept',
} as const
export type FunnelStep = (typeof FunnelStep)[keyof typeof FunnelStep]

/** The steps that ask a question, i.e. every step that is not an ending. */
export type FunnelQuestionStep = Exclude<
  FunnelStep,
  typeof FunnelStep.gone | typeof FunnelStep.kept
>

/** Questions in the order they are asked; `gone` and `kept` are endings, not steps. */
export const FUNNEL_ORDER: readonly FunnelStep[] = [
  FunnelStep.start,
  FunnelStep.guilt,
  FunnelStep.bargain,
  FunnelStep.survey,
  FunnelStep.confirm,
]

export const FunnelAnswer = { leave: 'leave', stay: 'stay' } as const
export type FunnelAnswer = (typeof FunnelAnswer)[keyof typeof FunnelAnswer]

const nextAfter: Record<FunnelQuestionStep, FunnelStep> = {
  [FunnelStep.start]: FunnelStep.guilt,
  [FunnelStep.guilt]: FunnelStep.bargain,
  [FunnelStep.bargain]: FunnelStep.survey,
  [FunnelStep.survey]: FunnelStep.confirm,
  [FunnelStep.confirm]: FunnelStep.gone,
}

/** One press of one of the two buttons. Saying you want to leave advances; anything else drops you out. */
export function advanceFunnel(step: FunnelStep, answer: FunnelAnswer): FunnelStep {
  if (answer === FunnelAnswer.stay) return FunnelStep.kept
  if (step === FunnelStep.gone || step === FunnelStep.kept) return FunnelStep.gone
  return nextAfter[step]
}

/** How many questions remain, counting the one on screen — the number the page never shows you. */
export function questionsRemaining(step: FunnelStep): number {
  const index = FUNNEL_ORDER.indexOf(step)
  return index === -1 ? 0 : FUNNEL_ORDER.length - index
}
