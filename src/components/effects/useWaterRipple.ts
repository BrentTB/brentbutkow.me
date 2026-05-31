import { RefObject, useEffect } from 'react'
import { vertexShaderSource } from './shaders/waterRipple.vert'
import { createFragmentShaderSource } from './shaders/waterRipple.frag'

const MAX_RIPPLES = 20

const fragmentShaderSource = createFragmentShaderSource(MAX_RIPPLES)

const buildShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('WebGL shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

const buildProgram = (gl: WebGLRenderingContext, vsSource: string, fsSource: string) => {
  const vs = buildShader(gl, gl.VERTEX_SHADER, vsSource)
  const fs = buildShader(gl, gl.FRAGMENT_SHADER, fsSource)
  if (!vs || !fs) return null
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('WebGL program link error:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}

// Drives the full-screen WebGL water surface: builds the shader program, runs
// the render loop, and spawns a ripple on each pointer press. No-ops gracefully
// when the canvas is missing or WebGL is unavailable, and tears down the rAF
// loop and listeners on unmount.
export function useWaterRipple(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { antialias: true })
    if (!gl) return

    const program = buildProgram(gl, vertexShaderSource, fragmentShaderSource)
    if (!program) return

    const positionLoc = gl.getAttribLocation(program, 'a_position')
    const timeLoc = gl.getUniformLocation(program, 'u_time')
    const aspectLoc = gl.getUniformLocation(program, 'u_aspect')
    const rippleCountLoc = gl.getUniformLocation(program, 'u_rippleCount')
    const centersLoc = gl.getUniformLocation(program, 'u_centers')
    const startTimesLoc = gl.getUniformLocation(program, 'u_startTimes')
    if (
      positionLoc === -1 ||
      !timeLoc ||
      !aspectLoc ||
      !rippleCountLoc ||
      !centersLoc ||
      !startTimesLoc
    )
      return

    // full-screen quad
    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    const buffer = gl.createBuffer()
    if (!buffer) return
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW)

    let animationId = 0
    const ripples: Array<{ x: number; y: number; start: number }> = []

    const resize = () => {
      // Cap DPR — this shader is fairly heavy, and the soft water hides the lower res.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const { clientWidth, clientHeight } = canvas
      canvas.width = clientWidth * dpr
      canvas.height = clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    const addRipple = (clientX: number, clientY: number, now: number) => {
      const x = clientX / window.innerWidth
      const y = 1 - clientY / window.innerHeight
      ripples.unshift({ x, y, start: now })
      if (ripples.length > MAX_RIPPLES) ripples.pop()
    }

    // One ripple per press — covers mouse and touch. Dragging a finger no longer
    // spams a stream of ripples (which looked bad against the MAX_RIPPLES cap).
    const handlePointerDown = (event: PointerEvent) => {
      addRipple(event.clientX, event.clientY, performance.now() * 0.001)
    }

    const render = (timeMs: number) => {
      const time = timeMs * 0.001

      // drop old ripples (age > 6s)
      for (let i = ripples.length - 1; i >= 0; i--) {
        if (time - ripples[i].start > 6) {
          ripples.splice(i, 1)
        }
      }

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(positionLoc)
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)

      gl.uniform1f(timeLoc, time)
      gl.uniform1f(aspectLoc, canvas.width / canvas.height)
      gl.uniform1i(rippleCountLoc, ripples.length)

      // pack ripple data into flat arrays
      const centers = new Float32Array(MAX_RIPPLES * 2)
      const starts = new Float32Array(MAX_RIPPLES)
      for (let i = 0; i < ripples.length && i < MAX_RIPPLES; i++) {
        centers[i * 2] = ripples[i].x
        centers[i * 2 + 1] = ripples[i].y
        starts[i] = ripples[i].start
      }
      gl.uniform2fv(centersLoc, centers)
      gl.uniform1fv(startTimesLoc, starts)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      animationId = requestAnimationFrame(render)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointerdown', handlePointerDown)
    animationId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [canvasRef])
}
