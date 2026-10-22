/**
 * Projeção Web Mercator e grade de tiles "slippy map" (z/x/y) para desenhar a rota
 * sobre mapas raster. Funções puras: o mesmo viewport posiciona tiles e o SVG da rota,
 * então trechos, viradas e o veículo ficam alinhados ao mapa.
 */
import type { Coordinates } from '../engine/types';

export type MapStyle = 'clean' | 'map' | 'satellite';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

/**
 * Camadas por estilo, de baixo para cima. Usamos os serviços públicos da Esri, que não
 * exigem chave (os basemaps raster da CARTO passaram a devolver "API KEY REQUIRED").
 */
export const TILE_LAYERS: Record<Exclude<MapStyle, 'clean'>, string[]> = {
  map: [`${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`],
  satellite: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`],
};

/** Créditos exigidos pelos provedores de tiles. */
export const TILE_ATTRIBUTION: Record<Exclude<MapStyle, 'clean'>, string> = {
  map: 'Esri, HERE, Garmin, USGS · © OpenStreetMap',
  satellite: 'Esri, Maxar, Earthstar Geographics',
};

const MAX_LAT = 85.05112878;
const TILE_PX = 256;

export function tileUrl(template: string, z: number, x: number, y: number): string {
  return template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
}

/** Coordenadas Mercator normalizadas: x, y ∈ [0, 1] (y cresce para o Sul). */
export function mercator(c: Coordinates): [number, number] {
  const lat = Math.max(-MAX_LAT, Math.min(MAX_LAT, c.lat)) * (Math.PI / 180);
  const x = (c.lon + 180) / 360;
  const y = (1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2;
  return [x, y];
}

export interface MapViewport {
  width: number;
  height: number;
  /** Tamanho do mundo em pixels (escala contínua). */
  worldSize: number;
  /** Canto superior esquerdo do viewport em pixels do mundo. */
  left: number;
  top: number;
  /** Zoom inteiro dos tiles e o tamanho (px) com que cada tile é desenhado. */
  tileZoom: number;
  tileSize: number;
}

/** Enquadra todos os pontos no retângulo, com margem, numa escala contínua. */
export function fitViewport(points: readonly Coordinates[], width: number, height: number, pad = 24, maxZoom = 16): MapViewport {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    const [x, y] = mercator(p);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const fit = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
  const worldSize = Math.max(TILE_PX, Math.min(fit, TILE_PX * 2 ** maxZoom));
  const tileZoom = Math.max(0, Math.min(maxZoom, Math.floor(Math.log2(worldSize / TILE_PX))));
  return {
    width,
    height,
    worldSize,
    left: ((minX + maxX) / 2) * worldSize - width / 2,
    top: ((minY + maxY) / 2) * worldSize - height / 2,
    tileZoom,
    tileSize: worldSize / 2 ** tileZoom,
  };
}

/** Pixel do viewport para a coordenada. */
export function projectToViewport(c: Coordinates, vp: MapViewport): [number, number] {
  const [x, y] = mercator(c);
  return [x * vp.worldSize - vp.left, y * vp.worldSize - vp.top];
}

export interface VisibleTile {
  key: string;
  z: number;
  /** Índices do tile para a URL (x já normalizado no antimeridiano). */
  x: number;
  y: number;
  left: number;
  top: number;
  size: number;
}

/** Tiles que cobrem o viewport. */
export function visibleTiles(vp: MapViewport): VisibleTile[] {
  const n = 2 ** vp.tileZoom;
  const s = vp.tileSize;
  const x0 = Math.floor(vp.left / s);
  const x1 = Math.floor((vp.left + vp.width - 1) / s);
  const y0 = Math.max(0, Math.floor(vp.top / s));
  const y1 = Math.min(n - 1, Math.floor((vp.top + vp.height - 1) / s));
  const out: VisibleTile[] = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const x = ((tx % n) + n) % n;
      out.push({ key: `${vp.tileZoom}/${tx}/${ty}`, z: vp.tileZoom, x, y: ty, left: tx * s - vp.left, top: ty * s - vp.top, size: s });
    }
  }
  return out;
}
