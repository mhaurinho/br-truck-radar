# BR Truck Radar 🚛

Aplicação geoespacial experimental para explorar corredores rodoviários do Brasil.

## Executar

```bash
npm install
npm run dev
```

## Stack
React 19, TypeScript, Vite e MapLibre GL (projeção de globo e rastros de luz animados em camadas GeoJSON). Fonte Overpass, derivada da tipografia de placas rodoviárias.

## Transparência dos dados
**Atenção:** os cinco corredores são traçados simplificados e a intensidade é inteiramente ilustrativa. Não há dados ao vivo, GPS de caminhões, medições de tráfego, nem heatmap estatístico neste MVP. Nunca use o protótipo como fonte de decisões operacionais.

## Roadmap
1. Geometrias reais de rodovias a partir de fonte licenciada (OSM/DNIT).
2. Ingestão documentada de contagens de veículos pesados (DNIT/ANTT/concessionárias), com data e proveniência.
3. Heatmap baseado em medições, distinguindo observado, estimado e demonstrativo.
4. Animação de fluxo agregada sem alegar rastreamento de veículos individuais.
5. Visualização 3D e otimização WebGL, testes e deploy.

## Licenças
Verifique atribuição e termos das fontes cartográficas antes da publicação em produção.
