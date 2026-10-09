import { useEffect, useRef } from "react";
import { animate } from "../lib/motion";

/** A triangle that covers the screen, with no vertex buffer. */
const vertex = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * The aurora (T6.151), written for Overlune and tuned in Unicorn Studio (the owner's "Overlune" design there): a night
 * sky with two curtains whose lower edge ripples, glowing Signal Cyan and fading up into Lune Violet, dimmer on the
 * left where the headline sits, over twinkling stars and fine grain. Its controls are baked in as constants.
 */
const fragment = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uResolution;
uniform float uTime;
out vec4 fragColor;

const vec2 POS = vec2(0.66, 0.55);
const float SIZE = 1.0;
const float BRIGHTNESS = 0.6;
const float WAVINESS = 0.6;
const float HEIGHT = 0.5;
const vec3 EDGE = vec3(0.094, 0.824, 0.961);
const vec3 CROWN = vec3(0.643, 0.369, 0.988);
const vec3 SKY_TOP = vec3(0.02, 0.024, 0.102);
const vec3 SKY_HORIZON = vec3(0.043, 0.059, 0.235);
const float STARS = 0.5;
const float GRAIN = 0.3;

uvec2 pcg2d(uvec2 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.y * 1664525u + 1013904223u;
  v.y += v.x * v.x * 1664525u + 1013904223u;
  v ^= v >> 16;
  v.x += v.y * v.y * 1664525u + 1013904223u;
  v.y += v.x * v.x * 1664525u + 1013904223u;
  return v;
}

float randFibo(vec2 p) {
  uvec2 v = pcg2d(floatBitsToUint(p));
  return float(v.x ^ v.y) / float(0xffffffffu);
}

float hash12(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 x) {
  vec2 p = floor(x);
  vec2 w = x - p;
  vec2 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
  float a = hash12(p);
  float b = hash12(p + vec2(1.0, 0.0));
  float c = hash12(p + vec2(0.0, 1.0));
  float d = hash12(p + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm3(vec2 x) {
  float v = 0.0;
  float amp = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    v += amp * vnoise(x);
    x = r * x * 2.03 + vec2(1.7, 9.2);
    amp *= 0.5;
  }
  return v;
}

// One curtain: its glow, and how far up it the point is (0 at the edge, 1 at the top).
vec2 curtain(vec2 p, float base, float seed, float time) {
  float warp = fbm3(vec2(p.x * 0.9 + seed, time * 0.6 + seed * 3.1)) - 0.5;
  float fold = sin(p.x * 2.1 + seed * 2.0 + time * 0.35) * 0.06;
  float d = p.y - (base + (warp * 0.9 + fold) * WAVINESS);
  float rays = 0.62 + 0.38 * vnoise(vec2(p.x * 14.0 + warp * 6.0 - time * 1.3 + seed * 5.0, time * 0.4));
  float height = 0.08 + 0.42 * HEIGHT;
  float up = max(d, 0.0);
  float down = min(d, 0.0);
  float body = exp(-up / height) * exp(-down * down / 0.0045) + exp(-down * down / 0.03) * 0.12;
  float along = smoothstep(0.25, 0.75, vnoise(vec2(p.x * 1.6 + seed * 7.0 - time * 0.5, seed)));
  return vec2(body * rays * (0.35 + 0.65 * along), clamp(up / height, 0.0, 1.0));
}

float stars(vec2 uv, float aspect, float time) {
  vec2 g = vec2(uv.x * aspect, uv.y) * 90.0;
  vec2 cell = floor(g);
  vec2 f = g - cell;
  float h = hash12(cell);
  vec2 c = vec2(hash12(cell + 7.1), hash12(cell + 3.7)) * 0.7 + 0.15;
  float on = step(1.0 - 0.12 * STARS, h);
  float dotShape = 1.0 - smoothstep(0.0, 0.2, length(f - c));
  float twinkle = 0.55 + 0.45 * sin(time * 4.0 + h * 61.0);
  return on * dotShape * twinkle * (0.35 + 0.65 * hash12(cell + 1.3));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  float time = uTime * 0.01;

  vec3 sky = mix(SKY_HORIZON, SKY_TOP, smoothstep(-0.3, 1.0, uv.y));
  vec2 p = vec2((uv.x - POS.x) * aspect, uv.y - POS.y) / SIZE;
  vec2 a = curtain(p, -0.06, 0.0, time);
  vec2 b = curtain(p * vec2(0.8, 1.0) + vec2(0.4, 0.0), 0.07, 4.3, time * 0.8);
  float env = exp(-p.x * p.x / 0.32);
  vec3 aur = (mix(EDGE, CROWN, smoothstep(0.0, 0.6, a.y)) * a.x
    + mix(EDGE, CROWN, smoothstep(0.0, 0.4, b.y)) * b.x * 0.55) * env * BRIGHTNESS * 1.4;
  float glow = dot(aur, vec3(0.3, 0.5, 0.2));
  float s = stars(uv, aspect, time) * smoothstep(0.15, 0.6, uv.y) * (1.0 - smoothstep(0.05, 0.4, glow));

  vec3 col = sky + (1.0 - exp(-aur * 1.2)) + vec3(0.85, 0.86, 1.0) * s * 1.5;
  col += (randFibo(gl_FragCoord.xy + vec2(mod(floor(uTime), 64.0) * 17.0, 3.0)) - 0.5) * 0.035 * GRAIN;
  fragColor = vec4(col, 1.0);
}`;

/** Unicorn Studio's clock at the scene's speed: 30 units a second. The still was taken 72 units in, so the live sky
 *  starts on the same frame and replaces it without a jump. */
const UNITS_PER_SECOND = 30;
const START = 72;
/** A soft, slow scene: three quarters of the pixels at 30 fps looks the same and spares low-end PCs. */
const SCALE = 0.75;
const FRAME_MS = 1000 / 30;

/** WebGL drawn on the CPU (no GPU, or a blocked one): far too slow for a background. Headless test browsers too. */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/** Draws the aurora into a new canvas in `host` until the returned stop is called. Without WebGL 2 on a GPU it does
 *  nothing, and the still stays. */
function run(host: HTMLElement): () => void {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    powerPreference: "low-power",
  });
  if (!gl) return () => {};
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  if (info && SOFTWARE.test(String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)))) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return () => {};
  }
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return () => {};
  gl.useProgram(program);
  const resolution = gl.getUniformLocation(program, "uResolution");
  const time = gl.getUniformLocation(program, "uTime");

  let frame = 0;
  let last = 0;
  let visible = false;
  const born = performance.now();
  const draw = (now: number) => {
    frame = requestAnimationFrame(draw);
    if (now - last < FRAME_MS - 1) return;
    last = now;
    gl.uniform1f(time, START + ((now - born) / 1000) * UNITS_PER_SECOND);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!canvas.isConnected) host.append(canvas); // only once it has a frame, so the still never flashes black
  };
  const play = () => {
    if (visible && !frame) frame = requestAnimationFrame(draw);
  };
  const pause = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const size = new ResizeObserver(([entry]) => {
    const { width, height } = entry!.contentRect;
    canvas.width = Math.max(1, Math.round(width * SCALE));
    canvas.height = Math.max(1, Math.round(height * SCALE));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resolution, canvas.width, canvas.height);
  });
  // Scrolled out of view it stops drawing (a hidden tab gets no animation frames anyway).
  const seen = new IntersectionObserver(([entry]) => {
    visible = entry!.isIntersecting;
    if (visible) play();
    else pause();
  });
  const lost = () => {
    pause();
    canvas.remove(); // the still shows again
  };
  canvas.addEventListener("webglcontextlost", lost);
  size.observe(host);
  seen.observe(host);
  return () => {
    pause();
    size.disconnect();
    seen.disconnect();
    canvas.removeEventListener("webglcontextlost", lost);
    canvas.remove();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}

/**
 * The hero's sky (T6.151): the aurora drawn live over a still of itself. The still is the version for reduced
 * motion and for no WebGL. It starts through animate() so every reduced-motion route (the OS setting, ?rm=1, Still)
 * stops it the same way as the page's GSAP motion.
 */
export default function HeroSky() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => animate(el.current!, { "": () => run(el.current!) }), []);
  return <div ref={el} aria-hidden className="landing-aurora" />;
}
