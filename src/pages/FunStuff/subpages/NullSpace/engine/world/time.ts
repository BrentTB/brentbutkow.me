export const MAX_DT = 0.1

export type GameTime = {
  lastFrameMs: number
  initialized: boolean
  paused: boolean
  speed: number
}

export function createGameTime(): GameTime {
  return { lastFrameMs: 0, initialized: false, paused: false, speed: 1 }
}

export function tickGameTime(time: GameTime, nowMs: number): { time: GameTime; dt: number } {
  if (time.paused) {
    return { time: { ...time, lastFrameMs: nowMs, initialized: true }, dt: 0 }
  }

  if (!time.initialized) {
    return { time: { ...time, lastFrameMs: nowMs, initialized: true }, dt: 0 }
  }

  const rawSeconds = (nowMs - time.lastFrameMs) / 1000
  const capped = Math.min(Math.max(0, rawSeconds), MAX_DT)
  const dt = capped * time.speed

  return { time: { ...time, lastFrameMs: nowMs }, dt }
}

export function pauseGameTime(time: GameTime): GameTime {
  return { ...time, paused: true }
}

export function resumeGameTime(time: GameTime, nowMs: number): GameTime {
  return { ...time, paused: false, lastFrameMs: nowMs, initialized: true }
}

export function setGameSpeed(time: GameTime, speed: number): GameTime {
  return { ...time, speed }
}
