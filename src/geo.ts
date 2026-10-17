export type LngLat = [number, number];

/** Suaviza uma polilinha (Chaikin) para os traçados parecerem estrada, não régua. */
export function smooth(coords: LngLat[], iterations = 4): LngLat[] {
  let pts = coords;
  for (let i = 0; i < iterations; i++) {
    const next: LngLat[] = [pts[0]];
    for (let j = 0; j < pts.length - 1; j++) {
      const [x0, y0] = pts[j];
      const [x1, y1] = pts[j + 1];
      next.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25]);
      next.push([x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

/** Polilinha com distâncias acumuladas, para posicionar pontos por fração (0–1) do percurso. */
export class Path {
  readonly coords: LngLat[];
  private readonly cumulative: number[];
  readonly length: number;

  constructor(coords: LngLat[]) {
    this.coords = coords;
    this.cumulative = [0];
    for (let i = 1; i < coords.length; i++) {
      const [x0, y0] = coords[i - 1];
      const [x1, y1] = coords[i];
      this.cumulative.push(this.cumulative[i - 1] + Math.hypot(x1 - x0, y1 - y0));
    }
    this.length = this.cumulative[this.cumulative.length - 1];
  }

  private indexAt(distance: number): number {
    let lo = 0;
    let hi = this.cumulative.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (this.cumulative[mid] <= distance) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  pointAt(fraction: number): LngLat {
    const d = Math.min(Math.max(fraction, 0), 1) * this.length;
    const i = this.indexAt(d);
    const segment = this.cumulative[i + 1] - this.cumulative[i] || 1;
    const t = (d - this.cumulative[i]) / segment;
    const [x0, y0] = this.coords[i];
    const [x1, y1] = this.coords[i + 1] ?? this.coords[i];
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
  }

  /** Trecho entre duas frações, sempre do início (from) para o fim (to). */
  slice(from: number, to: number): LngLat[] {
    const a = Math.max(0, Math.min(from, to));
    const b = Math.min(1, Math.max(from, to));
    const out: LngLat[] = [this.pointAt(a)];
    const ia = this.indexAt(a * this.length);
    const ib = this.indexAt(b * this.length);
    for (let i = ia + 1; i <= ib; i++) out.push(this.coords[i]);
    out.push(this.pointAt(b));
    return from <= to ? out : out.reverse();
  }
}
