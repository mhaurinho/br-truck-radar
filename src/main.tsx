import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { corridors, type Corridor } from './corridors';
import './style.css';

const collection: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: corridors.map((corridor) => ({
    type: 'Feature',
    properties: { name: corridor.name, intensity: corridor.intensity },
    geometry: { type: 'LineString', coordinates: corridor.coords },
  })),
};

function RadarMap({
  selected,
  heat,
  onSelect,
}: {
  selected: string;
  heat: boolean;
  onSelect: (name: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const callbackRef = useRef(onSelect);
  callbackRef.current = onSelect;
  const isFirstSelection = useRef(true);

  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-52, -14],
      zoom: 3.6,
      pitch: 42,
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => {
      map.addSource('corridors', { type: 'geojson', data: collection });
      map.addLayer({
        id: 'corridor-glow',
        type: 'line',
        source: 'corridors',
        paint: {
          'line-color': ['interpolate', ['linear'], ['get', 'intensity'], 0, '#00b8ff', 1, '#ff9c3b'],
          'line-width': 13,
          'line-blur': 9,
          'line-opacity': 0.8,
        },
      });
      map.addLayer({
        id: 'corridor-lines',
        type: 'line',
        source: 'corridors',
        paint: {
          'line-color': '#6ce8ff',
          'line-width': 3,
          'line-opacity': 0.8,
        },
      });
      map.addLayer({
        id: 'selected-line',
        type: 'line',
        source: 'corridors',
        filter: ['==', ['get', 'name'], selected],
        paint: { 'line-color': '#fff5ad', 'line-width': 7, 'line-opacity': 1 },
      });
      // Camada invisível e larga só para facilitar o clique (a linha visível tem 3px).
      map.addLayer({
        id: 'corridor-hit',
        type: 'line',
        source: 'corridors',
        paint: { 'line-color': '#000', 'line-width': 20, 'line-opacity': 0 },
      });
      map.on('click', 'corridor-hit', (event) => {
        const name = event.features?.[0]?.properties?.name;
        if (typeof name === 'string') callbackRef.current(name);
      });
      map.on('mouseenter', 'corridor-hit', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'corridor-hit', () => { map.getCanvas().style.cursor = ''; });
    });
    return () => { mapRef.current = null; map.remove(); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (!map.getLayer('corridor-glow')) return;
      map.setLayoutProperty('corridor-glow', 'visibility', heat ? 'visible' : 'none');
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [heat]);

  useEffect(() => {
    const map = mapRef.current;
    const corridor = corridors.find((item) => item.name === selected);
    if (!map || !corridor) return;
    const apply = () => {
      if (!map.getLayer('selected-line')) return;
      map.setFilter('selected-line', ['==', ['get', 'name'], selected]);
      // Na abertura, mantém a visão do Brasil inteiro; só aproxima após uma escolha do usuário.
      if (isFirstSelection.current) {
        isFirstSelection.current = false;
        return;
      }
      const bounds = corridor.coords.reduce(
        (acc, point) => acc.extend(point),
        new maplibregl.LngLatBounds(corridor.coords[0], corridor.coords[0]),
      );
      // Mesmo breakpoint do CSS (600px): no celular o painel fica embaixo, ocupando até 43vh.
      const mobile = window.innerWidth <= 600;
      const padding = mobile
        ? { top: 60, right: 30, bottom: Math.round(window.innerHeight * 0.45) + 20, left: 30 }
        : { top: 90, right: 70, bottom: 90, left: 380 };
      map.fitBounds(bounds, { padding, maxZoom: 6.5, duration: 900 });
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [selected]);

  return <div ref={container} className="map" aria-label="Mapa interativo dos corredores rodoviários brasileiros" />;
}

function CorridorPanel({
  selected,
  heat,
  onSelect,
  onHeatChange,
}: {
  selected: string;
  heat: boolean;
  onSelect: (name: string) => void;
  onHeatChange: (value: boolean) => void;
}) {
  const current: Corridor = corridors.find((corridor) => corridor.name === selected) ?? corridors[0];
  return (
    <aside>
      <div className="eyebrow">BRASIL · MALHA RODOVIÁRIA</div>
      <h1>Fluxos que movem o país.</h1>
      <p>Explore corredores logísticos em um mapa imersivo.</p>
      <div className="warning">DEMONSTRAÇÃO: traçados simplificados e intensidades fictícias. Não representa tráfego ao vivo.</div>
      <h3>Corredores</h3>
      {corridors.map((corridor) => (
        <button
          type="button"
          key={corridor.name}
          className={selected === corridor.name ? 'active' : ''}
          aria-pressed={selected === corridor.name}
          onClick={() => onSelect(corridor.name)}
        >
          {corridor.name}<span>↗</span>
        </button>
      ))}
      <section className="corridor-detail" aria-live="polite">
        <div className="eyebrow">CORREDOR SELECIONADO</div>
        <strong>{current.name}</strong>
        <p>{current.description}</p>
        <small>Índice ilustrativo: {Math.round(current.intensity * 100)}/100 · Não é medição.</small>
      </section>
      <div className="foot">
        <label><input type="checkbox" checked={heat} onChange={(event) => onHeatChange(event.target.checked)} /> Brilho de intensidade ilustrativa</label>
        <p>Desative para ver somente os traçados. Fonte e precisão reais serão incorporadas em etapas futuras.</p>
      </div>
    </aside>
  );
}

function App() {
  const [selected, setSelected] = useState('BR-116');
  const [heat, setHeat] = useState(true);
  return (
    <>
      <RadarMap selected={selected} heat={heat} onSelect={setSelected} />
      <header className="top"><span className="dot" /> BR TRUCK RADAR <small>EXPLORAÇÃO GEOGRÁFICA</small></header>
      <CorridorPanel selected={selected} heat={heat} onSelect={setSelected} onHeatChange={setHeat} />
      <div className="bottom">MAPA INTERATIVO · Arraste para explorar · Clique nas rodovias</div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
