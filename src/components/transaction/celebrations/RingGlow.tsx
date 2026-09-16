/**
 * The light behind the badge — the same gradient-mesh shader motif as the
 * flight porthole's BrandGlow, sitting behind 8C's filled circle. Five
 * sites in the clubs' palettes orbit the circle's silhouette; the
 * fragment shader blends them inverse-square and leaks the light around
 * the disc's edge — never a wash across the wall. It breathes in on the
 * beat, as the ball hands the moment to the badge.
 *
 * If WebGL isn't available the glow simply doesn't appear.
 */
import { useEffect, useRef } from 'react'
import { hexToHsl, hslToRgb, palette } from './BrandGlow'
import { clamp01, GAME_T as T } from './gameTimeline'

/** The disc's silhouette radius (px) and the glow's reach past its edge. */
const R = 90
const BLEED = 52
export const GLOW_BOX = (R + BLEED) * 2

/** Club colors lifted to a luminous range — the glow must read as light. */
export function luminous(colors: string[]): string[] {
  return colors.map((hex) => {
    const [h, s, l] = hexToHsl(hex)
    const [r, g, b] = hslToRgb(h, Math.max(s, 0.35), Math.max(l, 0.62))
    const to = (v: number) =>
      Math.round(v * 255)
        .toString(16)
        .padStart(2, '0')
    return `#${to(r)}${to(g)}${to(b)}`
  })
}

const VERT = `
attribute vec2 aP;
void main() { gl_Position = vec4(aP, 0.0, 1.0); }
`

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uT;
// Overall presence: breathes in on the beat.
uniform float uG;
uniform vec3 uC[5];

// A color site orbiting just outside the disc.
vec2 site(float ph, float sp) {
  float a = ph + uT * sp;
  return vec2(cos(a), sin(a)) * ${(R + 10).toFixed(1)};
}

void main() {
  vec2 q = (gl_FragCoord.xy - uRes * 0.5) / uDpr;
  // Signed distance (px) to the disc's silhouette.
  float d = length(q) - ${R.toFixed(1)};

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

  // The settled rim: angular noise drifting with time — some stretches
  // leak a wide bloom, others barely a sliver (BrandGlow's grammar).
  float ang = atan(q.y, q.x);
  float n = 0.42
    + 0.30 * sin(ang * 3.0 + uT * 0.50 + 1.7)
    + 0.22 * sin(ang * 5.0 - uT * 0.73 + 4.2)
    + 0.14 * sin(ang * 2.0 + uT * 0.31);
  float organic = clamp(n, 0.10, 1.0);
  float reach = ${BLEED.toFixed(1)} * organic;

  // Brightest at the disc's edge, tight falloff, nothing inside it.
  float halo = 1.0 - smoothstep(-2.0, reach, d);
  halo *= halo * smoothstep(-18.0, -1.0, d);
  float flare = 0.5 + 0.5 * clamp(wSum * 2200.0 - 0.45, 0.0, 1.0);
  gl_FragColor = vec4(col, halo * flare * uG * 0.9);
}
`

export function RingGlow({
  colors,
  t0,
  at = T.beat + 0.25,
}: {
  colors: string[]
  t0: number
  /** When the glow breathes in (seconds from t0). Defaults to 8C's beat. */
  at?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Cleanup only stops the loop — see BrandGlow on StrictMode contexts.
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
        console.error('RingGlow shader:', gl.getShaderInfoLog(sh))
      }
      return sh
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aP = gl.getAttribLocation(prog, 'aP')
    gl.enableVertexAttribArray(aP)
    gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0)

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = GLOW_BOX * dpr
    canvas.height = GLOW_BOX * dpr
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(gl.getUniformLocation(prog, 'uRes'), canvas.width, canvas.height)
    gl.uniform1f(gl.getUniformLocation(prog, 'uDpr'), dpr)
    gl.uniform3fv(gl.getUniformLocation(prog, 'uC'), palette(luminous(colors)))
    const uT = gl.getUniformLocation(prog, 'uT')
    const uG = gl.getUniformLocation(prog, 'uG')

    let raf = 0
    const draw = () => {
      const t = (performance.now() - t0) / 1000
      // Breathes in a beat after the flare, alongside the disc.
      gl.uniform1f(uG, clamp01((t - at) / 0.7))
      gl.uniform1f(uT, t + 40)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [colors, t0, at])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{
        left: `calc(50% - ${GLOW_BOX / 2}px)`,
        top: `calc(50% - ${GLOW_BOX / 2}px)`,
        width: GLOW_BOX,
        height: GLOW_BOX,
        mixBlendMode: 'screen',
      }}
    />
  )
}
