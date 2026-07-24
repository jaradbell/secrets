import { useEffect, useRef, type MutableRefObject } from 'react'

/**
 * Siri-style edge glow for the voice session. A transparent WebGL layer over
 * the whole device frame draws the ambient palette masked to a rounded-rect
 * ring hugging the frame edge. On activation the glow doesn't fade in — it
 * *pours*: coverage starts at bottom-center (where the composer shader band
 * lives), splits down the middle, and two liquid streams race up the left
 * and right edges until they meet at the top. While held, the ring breathes
 * on a slow swell and blooms with the live mic level.
 */

const VERTEX_SRC = `attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FRAGMENT_SRC = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec4 u_a; // resolution.xy, time, reveal
uniform vec4 u_b; // mic level, corner radius(px), base thickness(px), unused
uniform vec3 u_colors[6];

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

// Signed distance to a rounded rectangle centered at the origin; negative
// inside. b = half-size, r = corner radius.
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 res = u_a.xy;
  float time = u_a.z;
  float reveal = u_a.w;
  float level = u_b.x;
  float radius = u_b.y;
  float thick = u_b.z;

  vec2 p = gl_FragCoord.xy - 0.5 * res;
  // Distance inward from the frame edge, in device px.
  float edgeDist = -sdRoundBox(p, 0.5 * res, radius);

  // Most pixels sit deep inside the frame — leave them transparent.
  if (reveal <= 0.001 || edgeDist > thick * 5.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Perimeter path coordinates. The signed loop coordinate tt (-1..1 around
  // the ring) drives colour; its mirrored magnitude s drives the reveal so
  // the two parted streams stay symmetric.
  float tt = atan(p.x, -p.y) / 3.14159265;
  float s = abs(tt);

  // The liquid front. Coverage advances from the bottom split point up both
  // sides; fbm wobbles the meniscus so it pours instead of wiping, settling
  // as the reveal completes.
  float wob = (fbm(vec2(s * 3.2 + 7.0, time * 0.8)) - 0.5) * (0.26 - reveal * 0.18);
  float front = reveal * 1.14;
  float cov = smoothstep(front, front - 0.2, s + wob);

  // Breathing: slow swell plus the live mic level blooming the ring.
  float breathe = 1.0 + 0.18 * sin(time * 4.6) + level * 1.1;
  float w1 = max(thick * breathe, 1.0);
  float body = exp(-edgeDist / w1); // colored bloom
  float core = exp(-edgeDist / (w1 * 0.3)); // bright rim highlight

  // Ring gradient: tight palette gaussians circling the perimeter. Each hue
  // orbits the loop at its own pace, and distances wrap across the top seam
  // so colours travel around the ring continuously instead of mirroring.
  vec3 acc = vec3(0.0);
  float tot = 1e-4;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    // Centre in loop space (-1..1): a steady orbit plus a gentle sway.
    float c = fract(time * (0.026 + fi * 0.009) + fi / 6.0
      + 0.08 * sin(time * 0.5 + fi * 1.9)) * 2.0 - 1.0;
    // Shortest wrapped distance around the loop.
    float d = tt - c;
    d -= 2.0 * floor(d * 0.5 + 0.5);
    float wgt = exp(-pow(d * 3.6, 2.0)) + 0.015;
    acc += u_colors[i] * wgt;
    tot += wgt;
  }
  vec3 col = acc / tot;

  float a = cov * min(body * (0.85 + level * 0.5), 1.0);
  // Premultiplied output: colored bloom plus a white-hot rim at the edge.
  vec3 rgb = col * a + vec3(0.92) * core * cov * 0.55;
  gl_FragColor = vec4(rgb, min(a + core * cov * 0.55, 1.0));
}`

/** Aura ramp — strictly the ambient shader family: violets leading, slate
    blue on the cool side, the #D3C6BB tan as the warm accent, and a
    lavender-white for the hot spots. Six positions spaced around the ring so
    the glow reads as a travelling gradient. */
const AURA_COLORS: [number, number, number][] = [
  [0.42, 0.31, 0.627], // #6B4FA0 rich violet
  [0.35, 0.55, 0.95], // azure blue
  [0.62, 0.47, 0.92], // bright violet
  [0.827, 0.776, 0.733], // #D3C6BB warm tan
  [0.45, 0.62, 0.78], // slate blue
  [0.93, 0.9, 1.0], // lavender white
]

/** Seconds for the parting pour to travel bottom → top. */
const OPEN_S = 0.65
/** Seconds for the drain back down on release. */
const CLOSE_S = 0.4
/** Glow thickness at rest, CSS px. */
const THICKNESS = 22

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('EdgeAura shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export function EdgeAura({
  active,
  levelRef,
}: {
  active: boolean
  levelRef: MutableRefObject<number>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)
  /** Kicks the draw loop awake; set up by the mount effect. */
  const wakeRef = useRef<() => void>(() => {})

  useEffect(() => {
    activeRef.current = active
    // Wake on every change: activation starts the pour, deactivation needs
    // the loop running to drain (or, under reduced motion, to clear).
    wakeRef.current()
  }, [active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    }) as WebGLRenderingContext | null
    if (!gl) return

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC)
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC)
    if (!vert || !frag) return
    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('EdgeAura link error:', gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uA = gl.getUniformLocation(program, 'u_a')
    const uB = gl.getUniformLocation(program, 'u_b')
    const uColors = gl.getUniformLocation(program, 'u_colors')
    const colorData = new Float32Array(AURA_COLORS.length * 3)
    AURA_COLORS.forEach((c, i) => colorData.set(c, i * 3))
    gl.uniform3fv(uColors, colorData)

    let vw = 0
    let vh = 0
    let dpr = 1
    let radius = 0
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      // The glow ring follows the device frame's corner radius.
      const vp = canvas.closest('#app-viewport')
      radius = vp ? parseFloat(getComputedStyle(vp).borderTopLeftRadius) || 0 : 0
      if (w === vw && h === vh) return
      vw = w
      vh = h
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
    }
    const observer = new ResizeObserver(() => window.requestAnimationFrame(resize))
    observer.observe(canvas)
    resize()

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    gl.clearColor(0, 0, 0, 0)

    let raf = 0
    let reveal = 0
    let elapsed = 0
    let last = 0

    const draw = () => {
      gl.uniform4f(uA, vw, vh, elapsed, reveal)
      gl.uniform4f(uB, levelRef.current, radius * dpr, THICKNESS * dpr, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const frameLoop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      elapsed += dt

      const target = activeRef.current ? 1 : 0
      reveal += (target > reveal ? dt / OPEN_S : -dt / CLOSE_S)
      reveal = Math.min(Math.max(reveal, 0), 1)

      if (reveal <= 0 && !activeRef.current) {
        // Fully drained — clear once and sleep until the next activation.
        gl.clear(gl.COLOR_BUFFER_BIT)
        raf = 0
        return
      }
      draw()
      raf = requestAnimationFrame(frameLoop)
    }

    wakeRef.current = () => {
      if (raf) return
      if (reducedMotion) {
        // Static ring when active, cleared when not — no pour, no pulse.
        reveal = activeRef.current ? 1 : 0
        elapsed = 10
        if (reveal > 0) draw()
        else gl.clear(gl.COLOR_BUFFER_BIT)
        return
      }
      last = performance.now()
      raf = requestAnimationFrame(frameLoop)
    }
    if (activeRef.current) wakeRef.current()

    return () => {
      if (raf) cancelAnimationFrame(raf)
      wakeRef.current = () => {}
      observer.disconnect()
      gl.deleteBuffer(buffer)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
      gl.deleteProgram(program)
    }
  }, [levelRef])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-50">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  )
}
