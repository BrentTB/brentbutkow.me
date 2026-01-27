import { useEffect, useRef } from 'react'
import styles from './SpiralCanvas.module.scss'

const MAX_RIPPLES = 20

const vertexShaderSource = `
precision highp float;

attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5; // map clip space to 0..1
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const fragmentShaderSource = `
precision highp float;

varying vec2 v_uv;
uniform float u_time;
uniform int u_rippleCount;
uniform vec2 u_centers[${MAX_RIPPLES}];
uniform float u_startTimes[${MAX_RIPPLES}];

// expanding ripple: propagates outward with age and fades
float ripple(vec2 uv, vec2 center, float age) {
  if (age < 0.0) return 0.0;
  float dist = distance(uv, center);
  float speed = 0.1;          // wave speed
  float thickness = 0.02;      // band thickness
  float radius = age * speed;

  // only render near the advancing ring
  float ring = 1.0 - smoothstep(radius, radius + thickness, dist);

  float wave = sin(180.0 * (dist - radius));
  float decay = exp(-0.5 * age);
  return wave * ring * decay;
}

void main() {
  float intensity = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    if (i >= u_rippleCount) break;
    float age = u_time - u_startTimes[i];
    intensity += ripple(v_uv, u_centers[i], age);
  }

  // base background gradient
  vec3 base = mix(vec3(0.08, 0.1, 0.16), vec3(0.12, 0.16, 0.22), v_uv.y);
  // color shift based on intensity
  vec3 accentA = vec3(0.3, 0.9, 0.95);
  vec3 accentB = vec3(0.9, 0.4, 0.9);
  float glow = clamp(0.5 + intensity * 0.6, 0.0, 1.0);
  vec3 color = mix(base, mix(accentA, accentB, v_uv.x), glow);

  gl_FragColor = vec4(color, 0.9);
}
`

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

function SpiralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { antialias: true })
    if (!gl) return

    const program = buildProgram(gl, vertexShaderSource, fragmentShaderSource)
    if (!program) return

    const positionLoc = gl.getAttribLocation(program, 'a_position')
    const timeLoc = gl.getUniformLocation(program, 'u_time')
    const rippleCountLoc = gl.getUniformLocation(program, 'u_rippleCount')
    const centersLoc = gl.getUniformLocation(program, 'u_centers')
    const startTimesLoc = gl.getUniformLocation(program, 'u_startTimes')
    if (positionLoc === -1 || !timeLoc || !rippleCountLoc || !centersLoc || !startTimesLoc) return

    // full-screen quad
    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    const buffer = gl.createBuffer()
    if (!buffer) return
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW)

    let animationId = 0
    const ripples: Array<{ x: number; y: number; start: number }> = []

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const { clientWidth, clientHeight } = canvas
      canvas.width = clientWidth * dpr
      canvas.height = clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    const addRipple = (clientX: number, clientY: number, now: number) => {
      const rect = canvas.getBoundingClientRect()
      const x = (clientX - rect.left) / rect.width
      const y = 1 - (clientY - rect.top) / rect.height
      ripples.unshift({ x, y, start: now })
      if (ripples.length > MAX_RIPPLES) ripples.pop()
    }

    const handlePointerDown = (event: PointerEvent) => {
      addRipple(event.clientX, event.clientY, performance.now() * 0.001)
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 0) return
      const touch = event.touches[0]
      addRipple(touch.clientX, touch.clientY, performance.now() * 0.001)
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
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    animationId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.canvas} aria-label="Spiral webgl animation" />
}

export default SpiralCanvas
