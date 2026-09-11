/**
 * The light behind the window frame: a gradient-mesh shader in the
 * airline's own palette, blooming as the check completes. A tiny raw-WebGL
 * fragment shader (no three.js) computes the signed distance to the
 * porthole's silhouette, so the glow is a rim peeking out from behind the
 * frame — and how far it peeks varies around the frame and drifts with
 * time (angular noise plus a flare wherever a color site currently is),
 * so it reads as light escaping unevenly, not a stamped halo.
 *
 * Colors are the airline's real brand palette (flightData glowColors —
 * e.g. Southwest's bold blue / warm red / sunrise yellow), cycled across
 * five sites orbiting the perimeter at different speeds; repeats get a
 * lightness offset so no two sites are identical. Reduced motion renders
 * a single still frame. If WebGL isn't available the glow simply doesn't
 * appear — it's a garnish, not content.
 */
import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { CELEBRATION_EASE as EASE } from './flightTimeline'
import { PORTHOLE_H, PORTHOLE_W } from './portholeGeometry'

/** The glow's maximum reach past the frame, in px (most of the rim shows far less). */
const BLEED = 48
const BOX_W = PORTHOLE_W + BLEED * 2
const BOX_H = PORTHOLE_H + BLEED * 2

// The frame silhouette in CSS px: half-extents, elliptical corner radii
// (border-radius 50% / 40%), and the straight side segment that leaves.
const HX = PORTHOLE_W / 2 // 118
const RY = PORTHOLE_H * 0.4 // 124
const SY = PORTHOLE_H / 2 - RY // 31

const VERT = `
attribute vec2 aP;
void main() { gl_Position = vec4(aP, 0.0, 1.0); }
`

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uT;
uniform vec3 uC[5];

// Signed distance (approx, px) to the porthole silhouette: an ellipse with
// a straight vertical segment spliced into its sides.
float frameDist(vec2 q) {
  vec2 a = vec2(q.x, max(abs(q.y) - ${SY.toFixed(1)}, 0.0));
  return (length(a / vec2(${HX.toFixed(1)}, ${RY.toFixed(1)})) - 1.0) * ${HX.toFixed(1)};
}

// A color site orbiting just outside the frame.
vec2 site(float ph, float sp) {
  float a = ph + uT * sp;
  return vec2(cos(a) * ${(HX + 12).toFixed(1)}, sin(a) * ${(PORTHOLE_H / 2 + 6).toFixed(1)});
}

void main() {
  vec2 q = (gl_FragCoord.xy - uRes * 0.5) / uDpr;
  float d = frameDist(q);

  // Mesh: inverse-square blend of the five orbiting sites.
  vec2 s0 = site(0.4, 0.45);
  vec2 s1 = site(1.66, -0.34);
  vec2 s2 = site(2.91, 0.56);
  vec2 s3 = site(4.17, -0.48);
  vec2 s4 = site(5.42, 0.38);
  float w0 = 1.0 / (dot(q - s0, q - s0) + 2200.0);
  float w1 = 1.0 / (dot(q - s1, q - s1) + 2200.0);
  float w2 = 1.0 / (dot(q - s2, q - s2) + 2200.0);
  float w3 = 1.0 / (dot(q - s3, q - s3) + 2200.0);
  float w4 = 1.0 / (dot(q - s4, q - s4) + 2200.0);
  float wSum = w0 + w1 + w2 + w3 + w4;
  vec3 col = (w0 * uC[0] + w1 * uC[1] + w2 * uC[2] + w3 * uC[3] + w4 * uC[4]) / wSum;

  // How far the light escapes here: angular noise drifting with time —
  // some stretches of frame leak a wide bloom, others barely a sliver.
  float ang = atan(q.y, q.x);
  float n = 0.42
    + 0.30 * sin(ang * 3.0 + uT * 0.50 + 1.7)
    + 0.22 * sin(ang * 5.0 - uT * 0.73 + 4.2)
    + 0.14 * sin(ang * 2.0 + uT * 0.31);
  float reach = ${BLEED.toFixed(1)} * clamp(n, 0.10, 1.0);

  // The rim: brightest at the frame's edge, squared for a tight falloff.
  float halo = 1.0 - smoothstep(-2.0, reach, d);
  halo *= halo * smoothstep(-22.0, -1.0, d);
  // Flare where a color site currently is — the leak follows the color.
  float flare = 0.5 + 0.5 * clamp(wSum * 2200.0 - 0.45, 0.0, 1.0);
  gl_FragColor = vec4(col, halo * flare * 0.95);
}
`

/** #rrggbb → [h 0-360, s 0-1, l 0-1] */
function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [r + m, g + m, b + m]
}

/**
 * The brand palette, cycled across the five sites. Second-lap repeats get
 * a lightness offset (tint, then shade) so no two sites read identical.
 */
function palette(colors: string[]): Float32Array {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const out: number[] = []
  for (let i = 0; i < 5; i++) {
    const [h, s, l] = hexToHsl(colors[i % colors.length])
    const lap = Math.floor(i / colors.length)
    const dl = lap === 0 ? 0 : lap === 1 ? 0.14 : -0.12
    out.push(...hslToRgb(h, s, clamp(l + dl, 0.06, 0.88)))
  }
  return new Float32Array(out)
}

export function BrandGlow({
  colors,
  at,
  reduced,
}: {
  /** The airline's brand palette (flightData glowColors). */
  colors: string[]
  /** Seconds from mount at which the glow blooms. */
  at: number
  reduced: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Note: the context must not be lost on cleanup — under StrictMode the
    // effect re-runs on the same canvas element, and getContext would hand
    // back the same, dead context. Cleanup only stops the loop.
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    })
    if (!gl) return
    if (gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.restoreContext()

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (import.meta.env.DEV && !gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('BrandGlow shader:', gl.getShaderInfoLog(sh))
      }
      return sh
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)

    // One triangle that covers the canvas.
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aP = gl.getAttribLocation(prog, 'aP')
    gl.enableVertexAttribArray(aP)
    gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0)

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = BOX_W * dpr
    canvas.height = BOX_H * dpr
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(gl.getUniformLocation(prog, 'uRes'), canvas.width, canvas.height)
    gl.uniform1f(gl.getUniformLocation(prog, 'uDpr'), dpr)
    gl.uniform3fv(gl.getUniformLocation(prog, 'uC'), palette(colors))
    const uT = gl.getUniformLocation(prog, 'uT')

    let raf = 0
    const t0 = performance.now()
    const draw = () => {
      // Offset so the sites start scattered, not aligned at their phases.
      gl.uniform1f(uT, (performance.now() - t0) / 1000 + 40)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!reduced) raf = requestAnimationFrame(draw)
    }
    draw()

    return () => cancelAnimationFrame(raf)
  }, [colors, reduced])

  return (
    <motion.canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ left: -BLEED, top: -BLEED, width: BOX_W, height: BOX_H }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: at, duration: reduced ? 0.6 : 1.3, ease: EASE }}
    />
  )
}
