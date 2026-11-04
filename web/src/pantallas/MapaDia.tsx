// RF-14: las paradas del día en un mapa (MapLibre con los mapas vectoriales de OpenFreeMap, datos
// de OpenStreetMap; gratis y sin clave), numeradas en el orden del día y unidas por la ruta. Tocar
// una parada abre su postal. Se carga aparte (React.lazy) para que MapLibre no pese en el resto.
import { AttributionControl, LngLatBounds, Map as MapaGL, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre dibuja en un worker aparte: Vite lo empaqueta y aquí se le dice dónde está.
import urlWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useEffect, useRef } from 'react';
import type { LugarEnMapa } from '../viaje/mapa';
import type { Parada } from './Itinerario';
import '../estilos/mapa.css';

export interface ParadaUbicada {
  parada: Parada;
  numero: number;
  lugar: LugarEnMapa;
}

interface Props {
  ubicadas: ParadaUbicada[];
  centro: [number, number];
  /** Número de la parada elegida en el carrusel: el mapa vuela a ella y la resalta. */
  activa: number | null;
  onSeleccionar: (numero: number) => void;
}

setWorkerUrl(urlWorker);

const estilo = (oscuro: boolean) => `https://tiles.openfreemap.org/styles/${oscuro ? 'dark' : 'positron'}`;
const RUTA = 'ruta-del-dia';
// Margen para que las chinchetas no queden bajo los días (arriba) ni bajo el carrusel (abajo).
const ENCUADRE = { top: 100, bottom: 220, left: 64, right: 64 };

function lineaDeRuta(ubicadas: ParadaUbicada[]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates: ubicadas.map((u) => [u.lugar.lon, u.lugar.lat]) },
  };
}

/** La ruta va en una capa del estilo: hay que volver a ponerla cada vez que cambia el estilo. */
function pintarRuta(mapa: MapaGL, ubicadas: ParadaUbicada[]) {
  const fuente = mapa.getSource(RUTA) as GeoJSONSource | undefined;
  if (fuente) {
    fuente.setData(lineaDeRuta(ubicadas));
    return;
  }
  mapa.addSource(RUTA, { type: 'geojson', data: lineaDeRuta(ubicadas) });
  mapa.addLayer({
    id: RUTA,
    type: 'line',
    source: RUTA,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#c4553a', 'line-width': 4, 'line-opacity': 0.85, 'line-dasharray': [0.2, 2] },
  });
}

/** Rótulos en español cuando OpenStreetMap tiene el nombre (si no, el local): «Sevilla», no «Seville». */
function rotulosEnEspanol(mapa: MapaGL) {
  for (const capa of mapa.getStyle().layers) {
    if (capa.type === 'symbol' && mapa.getLayoutProperty(capa.id, 'text-field') !== undefined) {
      mapa.setLayoutProperty(capa.id, 'text-field', ['coalesce', ['get', 'name:es'], ['get', 'name']]);
    }
  }
}

function chincheta(numero: number, franja: string, lugar: string, alPulsar: () => void): HTMLElement {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'pin';
  boton.setAttribute('aria-label', `${numero}. ${lugar}`);
  boton.innerHTML = `<span class="pin-gota franja-${franja}"><span>${numero}</span></span>`;
  boton.addEventListener('click', alPulsar);
  return boton;
}

export default function MapaDia({ ubicadas, centro, activa, onSeleccionar }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaGL | null>(null);
  const chinchetas = useRef<Marker[]>([]);
  const actuales = useRef(ubicadas);
  actuales.current = ubicadas;
  const seleccionar = useRef(onSeleccionar);
  seleccionar.current = onSeleccionar;

  // El mapa se crea una vez; el estilo sigue al tema claro u oscuro del sistema.
  useEffect(() => {
    const oscuro = matchMedia('(prefers-color-scheme: dark)');
    const nuevo = new MapaGL({
      container: contenedor.current!,
      style: estilo(oscuro.matches),
      center: [centro[1], centro[0]],
      zoom: 13,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    nuevo.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    // Los créditos de OpenStreetMap arriba: abajo los taparía el carrusel.
    nuevo.addControl(new AttributionControl({ compact: true }), 'top-right');
    nuevo.touchZoomRotate.disableRotation();
    // Créditos plegados en la «i» (se despliegan al tocarla): abiertos tapaban el mapa.
    nuevo.once('load', () => contenedor.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'));
    nuevo.on('style.load', () => {
      rotulosEnEspanol(nuevo);
      pintarRuta(nuevo, actuales.current);
    });
    const alCambiarTema = () => nuevo.setStyle(estilo(oscuro.matches));
    oscuro.addEventListener('change', alCambiarTema);
    mapa.current = nuevo;
    return () => {
      oscuro.removeEventListener('change', alCambiarTema);
      nuevo.remove();
      mapa.current = null;
    };
  }, []);

  // Paradas y ruta del día: se repintan al cambiar de día o tras un ajuste.
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    for (const c of chinchetas.current) c.remove();
    chinchetas.current = ubicadas.map((u) =>
      new Marker({ element: chincheta(u.numero, u.parada.franja.id, u.parada.actividad.lugar, () => seleccionar.current(u.numero)), anchor: 'bottom' })
        .setLngLat([u.lugar.lon, u.lugar.lat])
        .addTo(m),
    );
    if (m.isStyleLoaded()) pintarRuta(m, ubicadas);
    if (ubicadas.length > 1) {
      const caja = new LngLatBounds();
      for (const u of ubicadas) caja.extend([u.lugar.lon, u.lugar.lat]);
      m.fitBounds(caja, { padding: ENCUADRE, maxZoom: 16, duration: 600 });
    } else if (ubicadas.length === 1) {
      m.easeTo({ center: [ubicadas[0]!.lugar.lon, ubicadas[0]!.lugar.lat], zoom: 15 });
    } else {
      m.easeTo({ center: [centro[1], centro[0]], zoom: 13 });
    }
  }, [ubicadas, centro]);

  // La parada elegida: el mapa vuela a ella y su chincheta se resalta.
  useEffect(() => {
    chinchetas.current.forEach((c, i) => c.getElement().classList.toggle('activa', ubicadas[i]?.numero === activa));
    const elegida = ubicadas.find((u) => u.numero === activa);
    if (elegida && mapa.current) {
      mapa.current.flyTo({ center: [elegida.lugar.lon, elegida.lugar.lat], zoom: Math.max(mapa.current.getZoom(), 15), padding: ENCUADRE, duration: 700 });
    }
  }, [activa, ubicadas]);

  return <div ref={contenedor} className="mapa-dia" role="region" aria-label="Mapa del día" />;
}
