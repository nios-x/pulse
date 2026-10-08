// Organic SVG paths, generated from a seed so server and client draw the same shape.
// Everything lives in a 200 x 200 box centred on (100, 100).

type Point = [number, number];

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Closed Catmull-Rom spline through the points, as cubic Béziers. */
function smoothClosed(points: Point[]): string {
  const n = points.length;
  let d = `M${r1(points[0][0])} ${r1(points[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return `${d}Z`;
}

/** A soft pebble: a few low harmonics around a circle. */
export function blobPath(seed: number, { wobble = 0.18, points = 8 } = {}): string {
  const rand = rng(seed);
  const phase = [rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2];
  const amp = [wobble, wobble * 0.6, wobble * 0.35].map((a) => a * (0.6 + rand() * 0.6));
  const pts: Point[] = [];
  for (let i = 0; i < points; i++) {
    const t = (i / points) * Math.PI * 2;
    const r =
      78 *
      (1 +
        amp[0] * Math.sin(2 * t + phase[0]) +
        amp[1] * Math.sin(3 * t + phase[1]) +
        amp[2] * Math.sin(5 * t + phase[2]) +
        (rand() - 0.5) * wobble * 0.3);
    pts.push([100 + r * Math.cos(t), 100 + r * Math.sin(t)]);
  }
  return smoothClosed(pts);
}

/** A ruffled leaf edge, like a lettuce or a marigold: many small lobes on a slow wave. */
export function frillPath(seed: number, { lobes = 15, depth = 0.09 } = {}): string {
  const rand = rng(seed);
  const slow = rand() * Math.PI * 2;
  const pts: Point[] = [];
  const steps = lobes * 4;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const lobe = Math.abs(Math.sin((lobes / 2) * t));
    const r = 74 * (1 + 0.12 * Math.sin(2 * t + slow) + depth * (lobe - 0.5) * 2 + (rand() - 0.5) * 0.03);
    pts.push([100 + r * Math.cos(t), 100 + r * Math.sin(t)]);
  }
  return smoothClosed(pts);
}

/** Veins radiating from the leaf's base, drawn as open strokes. */
export function veinPaths(seed: number, count = 5): string[] {
  const rand = rng(seed * 7 + 3);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = -Math.PI * 0.9 + (i / (count - 1)) * Math.PI * 0.8 + (rand() - 0.5) * 0.12;
    const len = 46 + rand() * 18;
    const bend = (rand() - 0.5) * 14;
    const x = 100 + Math.cos(a) * len;
    const y = 100 + Math.sin(a) * len;
    const mx = 100 + Math.cos(a) * len * 0.5 - Math.sin(a) * bend;
    const my = 100 + Math.sin(a) * len * 0.5 + Math.cos(a) * bend;
    out.push(`M100 100Q${r1(mx)} ${r1(my)} ${r1(x)} ${r1(y)}`);
  }
  return out;
}

/** The lower edge of a header field: a long, uneven wave across `width` at `height`. */
export function wavePath(seed: number, width = 400, height = 200, amplitude = 18): string {
  const rand = rng(seed);
  const segments = 4;
  const ys = Array.from({ length: segments + 1 }, () => height - amplitude + (rand() - 0.5) * amplitude * 2);
  let d = `M0 0H${width}V${r1(ys[segments])}`;
  for (let i = segments; i > 0; i--) {
    const x0 = (i / segments) * width;
    const x1 = ((i - 1) / segments) * width;
    const mid = (x0 + x1) / 2;
    d += `C${r1(mid)} ${r1(ys[i])} ${r1(mid)} ${r1(ys[i - 1])} ${r1(x1)} ${r1(ys[i - 1])}`;
  }
  return `${d}Z`;
}
