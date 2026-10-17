export type Corridor = {
  name: string;
  /** Número da rodovia, usado no escudo BR. */
  number: string;
  coords: [number, number][];
  intensity: number;
  description: string;
  /** Pontas do trecho desenhado no mapa (não necessariamente as pontas oficiais da rodovia). */
  stretch: string;
};

// Coordenadas esquemáticas apenas para demonstração. Não usar para navegação.
export const corridors: Corridor[] = [
  { name: 'BR-116', number: '116', coords: [[-38.5,-3.7],[-39.2,-8.0],[-42.8,-16.7],[-43.9,-19.9],[-46.6,-23.5],[-49.3,-25.4],[-51.2,-29.8]], intensity: 0.95, description: 'Um dos principais eixos rodoviários longitudinais do país.', stretch: 'Fortaleza a Porto Alegre' },
  { name: 'BR-101', number: '101', coords: [[-34.9,-7.1],[-35.1,-9.7],[-37.1,-10.9],[-39.1,-14.8],[-40.3,-20.3],[-43.2,-22.9],[-47.5,-26.3],[-48.5,-27.6]], intensity: 0.88, description: 'Eixo próximo ao litoral, conectando polos industriais e urbanos.', stretch: 'João Pessoa a Florianópolis' },
  { name: 'BR-153', number: '153', coords: [[-49.3,-16.7],[-49.2,-18.5],[-49.8,-20.8],[-49.4,-25.4]], intensity: 0.8, description: 'Eixo norte–sul central, com conexões logísticas entre regiões.', stretch: 'Goiânia a Curitiba' },
  { name: 'BR-163', number: '163', coords: [[-54.7,-2.4],[-55.5,-11.9],[-54.6,-20.4],[-54.5,-24.0]], intensity: 0.72, description: 'Corredor importante para escoamento de produção agrícola.', stretch: 'Santarém ao oeste do Paraná' },
  { name: 'BR-364', number: '364', coords: [[-49.3,-16.7],[-54.6,-15.6],[-60.0,-12.7],[-63.9,-8.8],[-67.8,-9.9]], intensity: 0.6, description: 'Ligação logística entre Centro-Oeste e parte da região Norte.', stretch: 'Goiânia a Rio Branco' },
];
