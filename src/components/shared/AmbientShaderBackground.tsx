import { useEffect, useRef } from 'react'
import { auraBus } from './auraBus'

/**
 * Theme palette: muted mesh over white — slate blue-gray, warm greige, and a
 * rich violet. The hues are interleaved so their gaussians overlap and blend
 * into each other rather than reading as separate blobs. Values are 0..1 sRGB
 * triples.
 */
const THEME_COLORS: [number, number, number][] = [
  [1.0, 1.0, 1.0], // #FFFFFF white base
  [0.553, 0.624, 0.651], // #8D9FA6 slate blue-gray
  [0.827, 0.776, 0.733], // #D3C6BB warm greige
  [0.42, 0.31, 0.627], // #6B4FA0 rich violet
  [0.553, 0.624, 0.651], // #8D9FA6 slate blue-gray (second bloom)
  [0.827, 0.776, 0.733], // #D3C6BB warm greige (second bloom)
]

const VERTEX_SRC = `attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

// "Mesh drift" — made with the 21st.dev Shader Builder (verbatim).
const FRAGMENT_SRC = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 u_colors[8];
// Eight packed vectors + eight colour vectors = 16 fragment uniform vectors,
// exactly WebGL1's guaranteed minimum. Macros preserve the public u_* API.
uniform vec4 u_scene;      // resolution.xy, time, colour count
uniform vec4 u_shape;      // scale, intensity, paramA, warp
uniform vec4 u_surface;    // detail, contrast, brightness, saturation
uniform vec4 u_finish;     // hue, vignette, blur, grain
uniform vec4 u_transform;  // seed, rotation, drift, OKLab toggle
uniform vec4 u_space;      // offset.xy, pointer.xy
uniform vec4 u_cursor;
uniform vec4 u_aura;       // voice parting 0..1, rest unused

#define u_resolution u_scene.xy
#define u_time u_scene.z
#define u_colorCount u_scene.w
#define u_scale u_shape.x
#define u_intensity u_shape.y
#define u_paramA u_shape.z
#define u_warp u_shape.w
#define u_detail u_surface.x
#define u_contrast u_surface.y
#define u_brightness u_surface.z
#define u_saturation u_surface.w
#define u_hue u_finish.x
#define u_vignette u_finish.y
#define u_blur u_finish.z
#define u_grain u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed u_transform.x
#else
// Keep hash inputs inside mediump's guaranteed ±2^14 range.
#define u_seed mod(u_transform.x, 31.0)
#endif
#define u_rotate u_transform.y
#define u_drift u_transform.z
#define u_oklab u_transform.w
#define u_offset u_space.xy
#define u_mouse u_space.zw
#define u_cursorPresence u_cursor.x
#define u_cursorEffect u_cursor.y
#define u_cursorStrength u_cursor.z
#define u_cursorRadius u_cursor.w
#define u_part u_aura.x

float hash21(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

// Even, un-structured white noise for film grain (Dave Hoskins hash12). The
// multiply hash above is fine for value noise but shows a faint axis-aligned
// mesh at integer fragment coords, which reads as a net over flat areas.
float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  float n = sin(dot(p, vec2(41.0, 289.0)));
  return fract(vec2(15731.743, 7892.321) * n);
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
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

// --- OKLab colour mixing (perceptual), gated by u_oklab -----------------------
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)),
    step(0.04045, c));
}
vec3 linearToSrgb(vec3 c) {
  // max() guards the sRGB branch: out-of-gamut OKLab interpolations can send a
  // channel negative, and pow(negative, …) is NaN which mix()/step() would
  // then propagate. The linear branch clips such channels to 0 downstream.
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, c));
}
vec3 linToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  l = pow(max(l, 0.0), 1.0 / 3.0);
  m = pow(max(m, 0.0), 1.0 / 3.0);
  s = pow(max(s, 0.0), 1.0 / 3.0);
  return vec3(
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 oklabToLin(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}
vec3 mixColour(vec3 a, vec3 b, float t) {
  if (u_oklab > 0.5) {
    vec3 la = linToOklab(srgbToLinear(a));
    vec3 lb = linToOklab(srgbToLinear(b));
    return clamp(linearToSrgb(oklabToLin(mix(la, lb, t))), 0.0, 1.0);
  }
  return mix(a, b, t);
}

// Mix through the recipe colours; x is clamped to 0..1. WebGL1 forbids
// dynamic uniform indexing in fragment shaders, hence the constant loop.
vec3 palette(float x) {
  float n = max(u_colorCount - 1.0, 1.0);
  float f = clamp(x, 0.0, 1.0) * n;
  vec3 col = u_colors[0];
  for (int i = 0; i < 7; i++) {
    if (float(i) < n)
      col = mixColour(col, u_colors[i + 1],
        smoothstep(0.0, 1.0, clamp(f - float(i), 0.0, 1.0)));
  }
  return col;
}

vec3 hueRotate(vec3 col, float a) {
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211,
                          0.587, -0.274, -0.523,
                          0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0,
                          0.956, -0.272, -1.106,
                          0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * col;
  float ca = cos(a), sa = sin(a);
  yiq = vec3(yiq.x, yiq.y * ca - yiq.z * sa, yiq.y * sa + yiq.z * ca);
  return toRGB * yiq;
}

vec3 shade(vec2 uv, vec2 p, float t) {
  vec3 acc = u_colors[0] * 0.15;
  float total = 0.15;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= u_colorCount) break;
    float fi = float(i);
    vec2 c = vec2(
      sin(t * (0.21 + fi * 0.071) + fi * 2.4 + u_seed),
      cos(t * (0.17 + fi * 0.093) + fi * 1.7)) * (0.45 + u_intensity * 0.35);
    float w = exp(-dot(p - c, p - c) * 6.0);
    acc += u_colors[i] * w;
    total += w;
  }
  return acc / total;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 screenUv = uv;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy)
    / min(u_resolution.x, u_resolution.y);
  float cursorMask = 0.0;

  // Cursor modes 1–3 are local distortions. Push shifts the same screen-space
  // coordinates before field transforms, so Zoom/Rotate don't change its feel.
  if (u_cursorPresence > 0.001) {
    // u_mouse is normalized to -1..1 in canvas space. Convert it to the same
    // aspect-corrected screen space as p so effects stay under the cursor.
    vec2 cursor = (0.5 * u_mouse * u_resolution.xy)
      / min(u_resolution.x, u_resolution.y);
    vec2 cursorDelta = p - cursor;
    if (u_cursorEffect < 0.5) {
      p += cursor * u_cursorPresence * u_cursorStrength * 0.55;
    } else {
      float cursorDistance = length(cursorDelta);
      vec2 cursorDirection = cursorDelta / max(cursorDistance, 0.0001);
      cursorMask = u_cursorPresence
        * (1.0 - smoothstep(0.0, u_cursorRadius, cursorDistance));
      if (u_cursorEffect < 1.5) {
        p -= cursorDirection * cursorMask * u_cursorStrength * 0.24;
      } else if (u_cursorEffect < 2.5) {
        float cursorAngle = cursorMask * u_cursorStrength * 2.2;
        float cc = cos(cursorAngle), cs = sin(cursorAngle);
        p = cursor + mat2(cc, -cs, cs, cc) * cursorDelta;
      } else if (u_cursorEffect < 3.5) {
        float ripple = sin(
          cursorDistance / max(u_cursorRadius, 0.001) * 18.0 - u_time * 5.0);
        p -= cursorDirection * ripple * cursorMask * u_cursorStrength * 0.07;
      }
    }
  }

  // Keep presets that read uv (rather than p) in the same warped space.
  uv = p * min(u_resolution.x, u_resolution.y) / u_resolution.xy + 0.5;
  p *= u_scale;
  // Field transform: rotate, pan, pointer push, slow drift.
  if (abs(u_rotate) > 0.0001) {
    float cr = cos(u_rotate), sr = sin(u_rotate);
    p = mat2(cr, -sr, sr, cr) * p;
  }
  p += u_offset;
  if (u_drift > 0.0001)
    p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));
  // Voice aura parting: while the edge glow pours, the field stretches away
  // from the centerline and sinks — liquid parting around the press, feeding
  // the two streams that climb the frame edges. The bump (x·e^-3x²) is zero
  // at the centerline so the split stays seamless.
  if (u_part > 0.001) {
    p.x -= u_part * 1.1 * p.x * exp(-p.x * p.x * 3.0);
    p.y += u_part * 0.18;
  }
  // Organic domain warp.
  if (u_warp > 0.0) {
    p += u_warp * (vec2(
      fbm(p * u_detail + u_seed),
      fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);
  }
  // Shade, with an optional soft 5-tap blur.
  vec3 col;
  if (u_blur > 0.0) {
    float e = u_blur;
    float pe = e * u_scale;
    vec2 uvE = vec2(e) * min(u_resolution.x, u_resolution.y) / u_resolution.xy;
    col  = shade(uv, p, u_time) * 0.36;
    col += shade(uv + vec2(uvE.x, 0.0), p + vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv - vec2(uvE.x, 0.0), p - vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv + vec2(0.0, uvE.y), p + vec2(0.0, pe), u_time) * 0.16;
    col += shade(uv - vec2(0.0, uvE.y), p - vec2(0.0, pe), u_time) * 0.16;
  } else {
    col = shade(uv, p, u_time);
  }
  // Post: contrast, saturation, hue, brightness, vignette, grain.
  if (abs(u_contrast - 1.0) > 0.0001)
    col = (col - 0.5) * u_contrast + 0.5;
  if (abs(u_saturation - 1.0) > 0.0001) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, u_saturation);
  }
  if (abs(u_hue) > 0.0001)
    col = hueRotate(col, u_hue);
  if (abs(u_brightness) > 0.0001)
    col += u_brightness;
  if (u_vignette > 0.0001) {
    float vd = length(screenUv - 0.5) * 1.41421356;
    col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd);
  }
  if (u_cursorPresence > 0.001 && u_cursorEffect > 3.5)
    col += (vec3(0.18) + col * 0.12) * cursorMask * u_cursorStrength;
  if (u_grain > 0.0001)
    col += (grainHash(
      gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  src: string,
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * Animated WebGL "Mesh drift" blue-sky background (ported from Aidfinder),
 * rendered in a plain WebGL1 context with a fullscreen triangle and no
 * libraries. Mounted behind all content, ignores pointer events, caps
 * devicePixelRatio at 2, pauses when the tab is hidden, and holds a static
 * frame under prefers-reduced-motion.
 */
export function AmbientShaderBackground({ veil = true }: { veil?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // antialias off: a fullscreen triangle has no geometric edges to smooth,
    // so MSAA on a ~1.3M px framebuffer is pure overhead.
    const gl = (canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
    }) ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return // No WebGL: the white canvas remains as a graceful fallback.

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC)
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC)
    if (!vert || !frag) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    // Fullscreen triangle.
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    const aPos = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const u = (name: string) => gl.getUniformLocation(program, name)
    const uColors = u('u_colors')
    const uScene = u('u_scene')
    const uShape = u('u_shape')
    const uSurface = u('u_surface')
    const uFinish = u('u_finish')
    const uTransform = u('u_transform')
    const uSpace = u('u_space')
    const uCursor = u('u_cursor')
    const uAura = u('u_aura')

    // u_colors[8] — first four are the theme ramp, the rest zeroed.
    const colorData = new Float32Array(24)
    THEME_COLORS.forEach((c, i) => {
      colorData[i * 3] = c[0]
      colorData[i * 3 + 1] = c[1]
      colorData[i * 3 + 2] = c[2]
    })
    gl.uniform3fv(uColors, colorData)

    // Static packed uniforms. Motion/shape kept as tuned; the finish is
    // lightened for the white scheme: brightness 0 (whites stay white) and
    // vignette 0 (no gray corners).
    // Lower scale widens each colour bloom relative to the viewport so the
    // orange and indigo fields overlap and mesh instead of sitting apart;
    // the higher blur softens the remaining seams.
    gl.uniform4f(uShape, 0.75, 0.34, 0.5, 0.0) // scale, intensity, paramA, warp
    gl.uniform4f(uSurface, 2.4, 0.96, 0.0, 0.96) // detail, contrast, brightness, saturation
    gl.uniform4f(uFinish, 0.0, 0.0, 0.05, 0.07) // hue, vignette, blur, grain
    gl.uniform4f(uTransform, 1453.0, 0.0, 0.0, 0.0) // seed, rotation, drift, oklab
    gl.uniform4f(uSpace, 0.0, 0.0, 0.0, 0.0) // offset.xy, pointer.xy
    gl.uniform4f(uCursor, 0.0, 2.0, 0.65, 0.46) // presence(off), effect, strength, radius
    gl.uniform4f(uAura, 0.0, 0.0, 0.0, 0.0) // voice parting (rest state)

    let vw = 0
    let vh = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (w === vw && h === vh) return
      vw = w
      vh = h
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
    }
    // Defer to rAF to avoid the benign "ResizeObserver loop completed with
    // undelivered notifications" warning that Vite surfaces as an error overlay.
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(resize)
    })
    observer.observe(canvas)
    resize()

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let elapsed = 0
    let last = performance.now()
    // Voice-aura parting, eased toward the shared flag each frame — quick
    // suck outward on press, gentler flow back on release.
    let part = 0

    const draw = (seconds: number) => {
      // u_scene = vec4(width, height, seconds * 0.73, colorCount)
      gl.uniform4f(uScene, vw, vh, seconds * 0.73, THEME_COLORS.length)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const frameLoop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      elapsed += now - last
      last = now
      const target = auraBus.active ? 1 : 0
      part += (target - part) * (1 - Math.exp(-dt * (target > part ? 5 : 3)))
      gl.uniform4f(uAura, part, 0.0, 0.0, 0.0)
      draw(elapsed / 1000)
      raf = requestAnimationFrame(frameLoop)
    }

    const onVisibility = () => {
      if (document.hidden) {
        if (raf) {
          cancelAnimationFrame(raf)
          raf = 0
        }
      } else if (!reducedMotion && !raf) {
        last = performance.now() // avoid a time jump after being paused
        raf = requestAnimationFrame(frameLoop)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    if (reducedMotion) {
      draw(10.0) // single static frame
    } else {
      raf = requestAnimationFrame(frameLoop)
    }

    return () => {
      if (raf) cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
      observer.disconnect()
      gl.deleteBuffer(buffer)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
      gl.deleteProgram(program)
      // Note: intentionally not calling WEBGL_lose_context.loseContext() here —
      // it permanently kills the context on this canvas, which breaks the shader
      // after an HMR re-run. The context is freed when the canvas is removed.
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] bg-white"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {/* Full-frame mode only: white veils that keep content readable over
          the mesh. Band/composer mode skips them so the color stays present. */}
      {veil && (
        <>
          {/* Downward white fade so the lower content resolves toward white and
              stays readable around the composer. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.12) 40%, rgba(255,255,255,0.72) 74%, #ffffff 100%)',
            }}
          />

          {/* Subtle radial white mask that keeps contrast behind the conversation. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 45% at 50% 60%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)',
            }}
          />
        </>
      )}
    </div>
  )
}
