import type { Map as MapLibreMap, GeoJSONSource, LineLayerSpecification } from 'maplibre-gl';
import { Path, type LngLat } from './geo';

/**
 * Rastros de luz em movimento ao longo dos corredores, no estilo de uma foto de
 * estrada em longa exposição: faróis (brancos) num sentido, lanternas (vermelhas)
 * no outro. É animação ilustrativa: não representa veículos nem contagens reais.
 */

type Particle = {
  corridor: string;
  path: Path;
  reverse: boolean;
  phase: number;
  speed: number; // fração do percurso por segundo
  trail: number; // comprimento do rastro, em fração do percurso
};

export type TrailCorridor = { name: string; path: Path; intensity: number };

const HEAD_SOURCE = 'trails-headlights';
const TAIL_SOURCE = 'trails-taillights';
const DOTS_SOURCE = 'trails-dots';
export const TRAIL_LAYERS = ['trails-headlights-glow', 'trails-taillights-glow', 'trails-headlights', 'trails-taillights', 'trails-dots'];

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

// Gerador determinístico, para o desenho estático (movimento reduzido) ser sempre o mesmo.
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function buildParticles(corridors: TrailCorridor[]): Particle[] {
  const random = seeded(42);
  const particles: Particle[] = [];
  for (const c of corridors) {
    const perDirection = Math.round(4 + c.intensity * 9);
    for (const reverse of [false, true]) {
      for (let i = 0; i < perDirection; i++) {
        const degreesPerSecond = 2 + random() * 1.6;
        particles.push({
          corridor: c.name,
          path: c.path,
          reverse,
          phase: random(),
          speed: degreesPerSecond / c.path.length,
          trail: (2.4 + random() * 2.4) / c.path.length,
        });
      }
    }
  }
  return particles;
}

export function addTrailLayers(map: MapLibreMap) {
  map.addSource(HEAD_SOURCE, { type: 'geojson', data: EMPTY, lineMetrics: true });
  map.addSource(TAIL_SOURCE, { type: 'geojson', data: EMPTY, lineMetrics: true });
  map.addSource(DOTS_SOURCE, { type: 'geojson', data: EMPTY });

  // line-offset desloca cada sentido para a sua "pista"; como o rastro de volta é
  // desenhado no sentido inverso, o mesmo deslocamento o leva para o outro lado.
  const lineBase: LineLayerSpecification['paint'] = {
    'line-width': ['interpolate', ['linear'], ['zoom'], 2, 1.6, 6, 3.4],
    'line-offset': ['interpolate', ['linear'], ['zoom'], 2, 1.2, 6, 3],
    'line-opacity': ['case', ['get', 'dim'], 0.28, 1],
  };

  // Halo largo e desfocado embaixo de cada rastro: é ele que dá o efeito de luz estourada.
  const glowBase: LineLayerSpecification['paint'] = {
    'line-width': ['interpolate', ['linear'], ['zoom'], 2, 7, 6, 16],
    'line-blur': ['interpolate', ['linear'], ['zoom'], 2, 5, 6, 12],
    'line-offset': ['interpolate', ['linear'], ['zoom'], 2, 1.2, 6, 3],
    'line-opacity': ['case', ['get', 'dim'], 0.12, 0.55],
  };
  map.addLayer({
    id: 'trails-headlights-glow',
    type: 'line',
    source: HEAD_SOURCE,
    layout: { 'line-cap': 'round' },
    paint: {
      ...glowBase,
      'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(255,214,140,0)', 1, 'rgba(255,214,140,0.9)'],
    },
  });
  map.addLayer({
    id: 'trails-taillights-glow',
    type: 'line',
    source: TAIL_SOURCE,
    layout: { 'line-cap': 'round' },
    paint: {
      ...glowBase,
      'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(255,40,30,0)', 1, 'rgba(255,40,30,0.9)'],
    },
  });
  map.addLayer({
    id: 'trails-headlights',
    type: 'line',
    source: HEAD_SOURCE,
    layout: { 'line-cap': 'round' },
    paint: {
      ...lineBase,
      'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(255,231,176,0)', 0.7, 'rgba(255,231,176,0.55)', 1, 'rgba(255,250,235,1)'],
    },
  });
  map.addLayer({
    id: 'trails-taillights',
    type: 'line',
    source: TAIL_SOURCE,
    layout: { 'line-cap': 'round' },
    paint: {
      ...lineBase,
      'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(255,59,48,0)', 0.7, 'rgba(255,59,48,0.5)', 1, 'rgba(255,120,100,1)'],
    },
  });
  map.addLayer({
    id: 'trails-dots',
    type: 'circle',
    source: DOTS_SOURCE,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 1.6, 6, 3.2],
      'circle-blur': 0.6,
      'circle-color': ['case', ['get', 'reverse'], '#ff6a5c', '#fffaf0'],
      'circle-opacity': ['case', ['get', 'dim'], 0.3, 0.95],
    },
  });
}

export function createTrails(map: MapLibreMap, corridors: TrailCorridor[], getSelected: () => string | null) {
  const particles = buildParticles(corridors);
  let frame = 0;
  let start = 0;
  let running = false;

  function render(seconds: number) {
    const selected = getSelected();
    const heads: GeoJSON.Feature[] = [];
    const tails: GeoJSON.Feature[] = [];
    const dots: GeoJSON.Feature[] = [];

    for (const p of particles) {
      const progress = (p.phase + seconds * p.speed) % 1;
      const dim = selected !== null && selected !== p.corridor;
      let coords: LngLat[];
      let head: LngLat;
      if (p.reverse) {
        const h = 1 - progress;
        coords = p.path.slice(Math.min(1, h + p.trail), h);
        head = p.path.pointAt(h);
      } else {
        coords = p.path.slice(Math.max(0, progress - p.trail), progress);
        head = p.path.pointAt(progress);
      }
      if (coords.length < 2) continue;
      const line: GeoJSON.Feature = { type: 'Feature', properties: { dim }, geometry: { type: 'LineString', coordinates: coords } };
      (p.reverse ? tails : heads).push(line);
      dots.push({ type: 'Feature', properties: { dim, reverse: p.reverse }, geometry: { type: 'Point', coordinates: head } });
    }

    (map.getSource(HEAD_SOURCE) as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: heads });
    (map.getSource(TAIL_SOURCE) as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: tails });
    (map.getSource(DOTS_SOURCE) as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: dots });
  }

  function tick(now: number) {
    if (!running) return;
    if (!start) start = now;
    if (!document.hidden) render((now - start) / 1000);
    frame = requestAnimationFrame(tick);
  }

  return {
    play() {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
    },
    /** Um quadro parado, para quem prefere movimento reduzido. */
    renderStill() {
      render(7.5);
    },
    /** Redesenha já, para a mudança de seleção aparecer mesmo com a animação parada. */
    refresh() {
      if (!running) render(7.5);
    },
  };
}
