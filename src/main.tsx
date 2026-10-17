import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import maplibregl, { type Map as MapLibreMap, type PaddingOptions } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { corridors, type Corridor } from './corridors';
import { Path, smooth } from './geo';
import { addTrailLayers, createTrails, TRAIL_LAYERS } from './trails';
import './style.css';

const BASEMAP = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const paths = new Map(corridors.map((c) => [c.name, new Path(smooth(c.coords))]));

const collection: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: corridors.map((c) => ({
    type: 'Feature',
    properties: { name: c.name },
    geometry: { type: 'LineString', coordinates: paths.get(c.name)!.coords },
  })),
};

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.innerWidth <= 640;

/** Espaço livre do mapa descontando a placa (à esquerda no desktop, embaixo no celular). */
function mapPadding(): PaddingOptions {
  const sign = document.querySelector('.sign')?.getBoundingClientRect();
  if (isMobile()) {
    const covered = sign ? window.innerHeight - sign.top : window.innerHeight * 0.5;
    return { top: 24, right: 16, bottom: Math.round(covered) + 16, left: 16 };
  }
  return { top: 60, right: 70, bottom: 60, left: Math.round((sign?.right ?? 400) + 40) };
}

/** Inclinação da câmera: no celular a tela é estreita e a inclinação só encolhe o Brasil. */
const tilt = (value: number) => (isMobile() ? 0 : value);

function boundsOf(names: string[]) {
  const bounds = new maplibregl.LngLatBounds();
  for (const name of names) for (const point of paths.get(name)!.coords) bounds.extend(point);
  return bounds;
}

const ALL = corridors.map((c) => c.name);

function RadarMap({ selected, trails, onSelect }: { selected: string | null; trails: boolean; onSelect: (name: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const trailsRef = useRef<ReturnType<typeof createTrails> | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const trailsOnRef = useRef(trails);
  trailsOnRef.current = trails;
  const ready = useRef(false);

  useEffect(() => {
    if (!container.current) return;
    const reduced = prefersReducedMotion();
    const map = new maplibregl.Map({
      container: container.current,
      style: BASEMAP,
      // Abertura: o globo visto de longe, sobre o Atlântico.
      center: reduced ? [-52, -15] : [-24, -8],
      zoom: reduced ? 3.4 : 1.25,
      canvasContextAttributes: { antialias: true },
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('style.load', () => {
      map.setProjection({ type: 'globe' });
      map.setSky({
        'sky-color': '#0b1d33',
        'horizon-color': '#1f4766',
        'fog-color': '#0b1d33',
        'sky-horizon-blend': 0.6,
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
      });
    });

    map.on('load', () => {
      map.addSource('corridors', { type: 'geojson', data: collection });
      map.addLayer({
        id: 'corridor-base',
        type: 'line',
        source: 'corridors',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#55606b', 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 1, 6, 2.5], 'line-opacity': 0.7 },
      });
      // Faixa amarela tracejada, como a pintura central da pista, no corredor escolhido.
      map.addLayer({
        id: 'corridor-selected',
        type: 'line',
        source: 'corridors',
        filter: ['==', ['get', 'name'], ''],
        layout: { 'line-join': 'round' },
        paint: { 'line-color': '#f2c200', 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 1.5, 6, 3], 'line-dasharray': [2.5, 1.5] },
      });
      addTrailLayers(map);
      // Camada invisível e larga só para facilitar o clique.
      map.addLayer({
        id: 'corridor-hit',
        type: 'line',
        source: 'corridors',
        paint: { 'line-color': '#000', 'line-width': 22, 'line-opacity': 0 },
      });
      map.on('click', 'corridor-hit', (event) => {
        const name = event.features?.[0]?.properties?.name;
        if (typeof name === 'string') onSelectRef.current(name);
      });
      map.on('mouseenter', 'corridor-hit', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'corridor-hit', () => { map.getCanvas().style.cursor = ''; });

      const animation = createTrails(map, ALL.map((name) => ({
        name,
        path: paths.get(name)!,
        intensity: corridors.find((c) => c.name === name)!.intensity,
      })), () => selectedRef.current);
      trailsRef.current = animation;
      ready.current = true;

      if (reduced) {
        animation.renderStill();
        map.fitBounds(boundsOf(ALL), { padding: mapPadding(), animate: false });
      } else {
        // O único momento coreografado: do globo até o Brasil, com os rastros já correndo.
        animation.play();
        map.fitBounds(boundsOf(ALL), { padding: mapPadding(), pitch: tilt(38), bearing: isMobile() ? 0 : -8, duration: 5200, curve: 1.6 });
      }
      if (!trailsOnRef.current) {
        animation.stop();
        for (const id of TRAIL_LAYERS) map.setLayoutProperty(id, 'visibility', 'none');
      }
    });

    return () => {
      trailsRef.current?.stop();
      trailsRef.current = null;
      ready.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const animation = trailsRef.current;
    if (!map || !animation || !ready.current) return;
    for (const id of TRAIL_LAYERS) map.setLayoutProperty(id, 'visibility', trails ? 'visible' : 'none');
    if (trails && !prefersReducedMotion()) animation.play();
    else {
      animation.stop();
      animation.refresh();
    }
  }, [trails]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    map.setFilter('corridor-selected', ['==', ['get', 'name'], selected ?? '']);
    trailsRef.current?.refresh();
    const reduced = prefersReducedMotion();
    map.fitBounds(boundsOf(selected ? [selected] : ALL), {
      padding: mapPadding(),
      maxZoom: 6.2,
      pitch: tilt(selected ? 45 : 38),
      duration: reduced ? 0 : 1400,
    });
  }, [selected]);

  return <div ref={container} className="map" role="region" aria-label="Mapa dos corredores rodoviários do Brasil" />;
}

function Shield({ number }: { number: string }) {
  return (
    <svg className="shield-art" viewBox="0 0 60 66" aria-hidden="true">
      <path d="M5 4 H55 V30 C55 47 44 57 30 63 C16 57 5 47 5 30 Z" />
      <line x1="5" y1="24" x2="55" y2="24" />
      <text x="30" y="18.5" className="shield-br">BR</text>
      <text x="30" y="46" className="shield-number">{number}</text>
    </svg>
  );
}

function IntensityPaint({ value }: { value: number }) {
  return (
    <div className="paint" role="img" aria-label={`Intensidade ilustrativa ${Math.round(value * 100)} de 100`}>
      <div className="paint-fill" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

function Detail({ corridor }: { corridor: Corridor | undefined }) {
  if (!corridor) {
    return (
      <div className="detail" aria-live="polite">
        <p className="detail-empty">Escolha uma rodovia no escudo ou clique nela no mapa.</p>
      </div>
    );
  }
  return (
    <div className="detail" aria-live="polite">
      <h2>{corridor.name}</h2>
      <p className="stretch">{corridor.stretch}</p>
      <p>{corridor.description}</p>
      <div className="intensity">
        <span>Intensidade ilustrativa</span>
        <strong>{Math.round(corridor.intensity * 100)}</strong>
      </div>
      <IntensityPaint value={corridor.intensity} />
    </div>
  );
}

function RoadSign({
  selected,
  trails,
  onSelect,
  onTrailsChange,
}: {
  selected: string | null;
  trails: boolean;
  onSelect: (name: string | null) => void;
  onTrailsChange: (value: boolean) => void;
}) {
  const current = corridors.find((c) => c.name === selected);
  return (
    <aside className="sign">
      <div className="sign-face">
        <h1>BR Truck Radar</h1>
        <p className="lede">Os grandes corredores de carga do Brasil, vistos de noite.</p>

        <div className="shields" role="group" aria-label="Rodovias">
          {corridors.map((c) => (
            <button
              type="button"
              key={c.name}
              className="shield"
              aria-pressed={selected === c.name}
              aria-label={c.name}
              onClick={() => onSelect(selected === c.name ? null : c.name)}
            >
              <Shield number={c.number} />
            </button>
          ))}
        </div>

        <Detail corridor={current} />

        <div className="controls">
          <label className="switch">
            <input type="checkbox" checked={trails} onChange={(e) => onTrailsChange(e.target.checked)} />
            <span className="switch-track" aria-hidden="true" />
            Rastros de luz
          </label>
          <button type="button" className="overview" onClick={() => onSelect(null)} disabled={selected === null}>
            Ver o Brasil inteiro
          </button>
        </div>

        <p className="legend">
          <span className="streak streak-white" aria-hidden="true" /> um sentido
          <span className="streak streak-red" aria-hidden="true" /> sentido oposto
        </p>
      </div>
      <p className="disclaimer">Traçados esquemáticos e intensidades fictícias. Não é tráfego ao vivo.</p>
    </aside>
  );
}

function App() {
  const [selected, setSelected] = useState<string | null>(null);
  const [trails, setTrails] = useState(true);
  return (
    <>
      <RadarMap selected={selected} trails={trails} onSelect={setSelected} />
      <RoadSign selected={selected} trails={trails} onSelect={setSelected} onTrailsChange={setTrails} />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
