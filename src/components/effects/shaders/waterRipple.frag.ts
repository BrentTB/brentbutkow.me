// Fragment shader for the WaterRipple effect. Built with the ripple-buffer size so
// the uniform array sizes and loop bound stay in sync with the component.
export const createFragmentShaderSource = (maxRipples: number) => `
precision highp float;

varying vec2 v_uv;
uniform float u_time;
uniform float u_aspect;
uniform int u_rippleCount;
uniform vec2 u_centers[${maxRipples}];
uniform float u_startTimes[${maxRipples}];

// ── value noise + fbm ──────────────────────────────────────────────
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.02 + 17.0;
    a *= 0.5;
  }
  return v;
}

// ── interactive ripples, folded into the surface height ────────────
// A drop sends a ring outward from the impact point: the energy stays at the
// expanding wavefront (with a soft trailing tail of rings behind it), ramps in
// from nothing, and settles as it spreads — so there's no sharp centre and no
// instant pop-in.
float rippleField(vec2 p, float t) {
  float sum = 0.0;
  for (int i = 0; i < ${maxRipples}; i++) {
    if (i >= u_rippleCount) break;
    float age = t - u_startTimes[i];
    if (age >= 0.0) {
      vec2 c = vec2(u_centers[i].x * u_aspect, u_centers[i].y);
      float d = distance(p, c);
      float front = age * 0.3;                  // wavefront expands out from the point
      float fd = d - front;                     // <0 behind the front, >0 ahead of it
      float ahead = max(fd, 0.0);
      float behind = max(-fd, 0.0);
      float env = exp(-ahead * ahead * 250.0) * exp(-behind * 7.0); // ring + trailing tail
      float wave = sin(fd * 50.0);              // a crest + a trailing ring, not a dense stack
      float onset = smoothstep(0.0, 0.6, age);  // grow out of the point — no pop-in
      float decay = exp(-0.9 * age);            // settle as it spreads
      sum += wave * env * onset * decay;
    }
  }
  return sum * 0.2;
}

// ── idle flowing surface (animated on its own) ─────────────────────
float surface(vec2 p, float t) {
  // domain warp for organic, swirling flow — kept low-frequency so it reads as
  // broad gentle swells rather than busy, photoreal chop.
  vec2 w = vec2(fbm(p * 1.2 + vec2(0.0, t * 0.05)), fbm(p * 1.2 + vec2(t * 0.045, 0.0)));
  float h = fbm(p * 1.7 + w * 0.7 + vec2(t * 0.045, -t * 0.035));
  h += 0.22 * fbm(p * 3.2 - vec2(t * 0.09, t * 0.065));  // softer, broader detail
  return h;
}

float height(vec2 p, float t) {
  return surface(p, t) * 0.5 + rippleField(p, t);
}

void main() {
  float t = u_time;
  vec2 p = vec2(v_uv.x * u_aspect, v_uv.y);

  // surface normal from the height gradient (finite differences)
  float e = 0.0016;
  float h = height(p, t);
  float hx = height(p + vec2(e, 0.0), t);
  float hy = height(p + vec2(0.0, e), t);
  float bump = 0.05;
  vec3 n = normalize(vec3((h - hx) * bump / e, (h - hy) * bump / e, 1.0));

  // lighting — kept gentle so the water reads as a calm tinted surface, not an ocean
  vec3 lightDir = normalize(vec3(-0.35, 0.45, 0.82));
  vec3 halfDir = normalize(lightDir + vec3(0.0, 0.0, 1.0));
  float diff = clamp(dot(n, lightDir) * 0.5 + 0.5, 0.0, 1.0);   // wrapped diffuse
  float spec = pow(max(dot(n, halfDir), 0.0), 60.0);           // soft, broad highlights
  float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 3.0);           // subtle sheen at grazing angles

  // depth-graded blue water — leans on position so it stays smooth
  vec3 deep = vec3(0.015, 0.11, 0.21);
  vec3 shallow = vec3(0.06, 0.30, 0.46);
  vec3 sky = vec3(0.50, 0.74, 0.95);
  float depth = clamp(v_uv.y * 0.6 + h * 0.36 + 0.18, 0.0, 1.0);
  vec3 color = mix(deep, shallow, depth);
  color *= 0.82 + 0.26 * diff;
  color = mix(color, sky, fres * 0.22);
  color += spec * vec3(1.0, 0.97, 0.9) * 0.3;

  // very faint sparkle on the crests
  float crest = pow(clamp(h * 1.4 + 0.4, 0.0, 1.0), 4.0);
  color += crest * 0.02 * vec3(0.6, 0.85, 1.0);

  gl_FragColor = vec4(color, 0.97);
}
`
