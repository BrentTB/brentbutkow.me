import { useEffect, useRef } from 'react'
import styles from './WaterRipple.module.scss'

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

// water-like ripple with multiple frequencies
float ripple(vec2 uv, vec2 center, float age) {
  if (age < 0.0) return 0.0;
  float dist = distance(uv, center);
  float speed = 0.2;
  float radius = age * speed;
  
  // multiple wave frequencies for realistic water
  float wave1 = sin(100.0 * (dist - radius)) * 0.4;
  float wave2 = sin(140.0 * (dist - radius) + age * 3.0) * 0.5;
  float wave3 = sin(180.0 * (dist - radius) - age * 2.0) * 0.3;
  float ring1 = 1.0 - smoothstep(radius, radius+0.02, dist);
    wave1 *= ring1;
    float ring2 = 1.0 - smoothstep(radius - 0.015, radius, dist);
    wave2 *= ring2;
    float ring3 = 1.0 - smoothstep(radius - 0.01, radius, dist);
    wave3 *= ring3;
  float wave = wave1 + wave2 + wave3;
  
  // softer falloff for water-like spread
  float falloff = exp(-2.0 * dist);
  float ageFade = exp(-0.9 * age);
  
  return wave * falloff * ageFade;
}

void main() {
  float displacement = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    if (i >= u_rippleCount) break;
    float age = u_time - u_startTimes[i];
    displacement += ripple(v_uv, u_centers[i], age);
  }

  // water colors: deep blue base with lighter blue highlights
  vec3 deepWater = vec3(0.02, 0.15, 0.28);
  vec3 shallowWater = vec3(0.08, 0.35, 0.52);
  vec3 waterHighlight = vec3(0.35, 0.65, 0.85);
  
  // base gradient from deep to shallow
  vec3 baseColor = mix(deepWater, shallowWater, v_uv.y * 0.6 + 0.4);
  
  // add wave highlights with subtle refraction effect
  float highlight = clamp(displacement * 0.4, -0.3, 0.5);
  vec3 color = mix(baseColor, waterHighlight, highlight);
  
  // add subtle shimmer
  float shimmer = sin(v_uv.x * 40.0 + u_time * 2.0) * sin(v_uv.y * 40.0 + u_time * 1.5) * 0.01;
  color += shimmer;

  gl_FragColor = vec4(color, 0.95);
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

function WaterRipple() {
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
      const x = clientX / window.innerWidth
      const y = 1 - clientY / window.innerHeight
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

  return (
    <canvas ref={canvasRef} className={styles.canvas} aria-label="water ripple webgl animation" />
  )
}

export default WaterRipple
