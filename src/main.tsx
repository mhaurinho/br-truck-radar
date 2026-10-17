import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

const corridors = [
 {name:'BR-153',coords:[[-49.3,-16.7],[-49.2,-18.5],[-49.8,-20.8],[-49.4,-25.4]],intensity:0.8},
 {name:'BR-116',coords:[[-38.5,-3.7],[-39.2,-8.0],[-42.8,-16.7],[-43.9,-19.9],[-46.6,-23.5],[-49.3,-25.4],[-51.2,-29.8]],intensity:0.95},
 {name:'BR-163',coords:[[-54.7,-2.4],[-55.5,-11.9],[-54.6,-20.4],[-54.5,-24.0]],intensity:0.72},
 {name:'BR-101',coords:[[-34.9,-7.1],[-35.1,-9.7],[-37.1,-10.9],[-39.1,-14.8],[-40.3,-20.3],[-43.2,-22.9],[-47.5,-26.3],[-48.5,-27.6]],intensity:0.88},
 {name:'BR-364',coords:[[-49.3,-16.7],[-54.6,-15.6],[-60.0,-12.7],[-63.9,-8.8],[-67.8,-9.9]],intensity:0.6}
];
function App(){const ref=useRef<HTMLDivElement>(null);const [selected,setSelected]=useState('BR-116');const [heat,setHeat]=useState(true);
 useEffect(()=>{if(!ref.current)return;const map=new maplibregl.Map({container:ref.current,style:'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',center:[-52,-14],zoom:3.6,pitch:42,antialias:true});map.addControl(new maplibregl.NavigationControl(),'top-right');map.on('load',()=>{map.addSource('corridors',{type:'geojson',data:{type:'FeatureCollection',features:corridors.map(c=>({type:'Feature',properties:{name:c.name,intensity:c.intensity},geometry:{type:'LineString',coordinates:c.coords}}))} as GeoJSON.FeatureCollection});map.addLayer({id:'glow',type:'line',source:'corridors',paint:{'line-color':['interpolate',['linear'],['get','intensity'],0,'#00b8ff',1,'#ff9c3b'],'line-width':heat?13:5,'line-blur':heat?9:1,'line-opacity':0.8}});map.addLayer({id:'roads',type:'line',source:'corridors',paint:{'line-color':'#6ce8ff','line-width':3}});map.on('click','roads',e=>{const name=e.features?.[0]?.properties?.name;if(name)setSelected(name)});map.on('mouseenter','roads',()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave','roads',()=>map.getCanvas().style.cursor='');});return()=>map.remove()},[]);
 return <><div ref={ref} className="map"/><div className="top"><span className="dot"/> BR TRUCK RADAR <small>EXPLORAÇÃO GEOGRÁFICA</small></div><aside><div className="eyebrow">BRASIL · MALHA RODOVIÁRIA</div><h1>Fluxos que movem o país.</h1><p>Explore corredores logísticos em um mapa imersivo.</p><div className="warning">PROTÓTIPO DEMONSTRATIVO · Traçados simplificados, não são rotas precisas nem tráfego em tempo real.</div><h3>Corredores</h3>{corridors.map(c=><button key={c.name} className={selected===c.name?'active':''} onClick={()=>setSelected(c.name)}>{c.name}<span>↗</span></button>)}<div className="foot"><label><input type="checkbox" checked={heat} onChange={e=>setHeat(e.target.checked)}/> Visualização de calor (demonstrativa)</label><p>Intensidades ilustrativas. Integração com fontes verificáveis planejada.</p></div></aside><div className="bottom">MAPA INTERATIVO · Arraste para explorar · Clique nas rodovias</div></>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
