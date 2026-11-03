// RF-01, RF-12: perfil del viajero que se construye en los pasos de viaje.html. Los valores y límites
// son los del esquema del planificador (src/flows/perfil.ts), para que el perfil llegue válido.
import { DESTINOS_PORTADA } from './destinos.js';

export const DIAS_MIN = 1;
export const DIAS_MAX = 7;

const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase();

export function perfilInicial(destino) {
  const conGuia = DESTINOS_PORTADA.find((d) => normalizar(d.nombre) === normalizar(destino));
  return {
    destino: conGuia?.nombre ?? null,
    dias: 3,
    intereses: [],
    ritmo: 'normal',
    presupuesto: 'medio',
    compania: 'solo',
  };
}

export function cambiarDias(perfil, delta) {
  return { ...perfil, dias: Math.min(DIAS_MAX, Math.max(DIAS_MIN, perfil.dias + delta)) };
}

export function etiquetaDias(dias) {
  if (dias === 1) return 'Escapada de un día';
  if (dias === 2) return 'Fin de semana';
  if (dias <= 4) return 'Escapada larga';
  if (dias <= 6) return 'Viaje con calma';
  return 'Una semana entera';
}

// Los 8 intereses del planificador (src/flows/perfil.ts), en su orden, con lo que se ve en cada carta.
// Cada carta lleva una foto de Wikimedia Commons (con su crédito), un icono SVG de 24×24 y un color de marca.
export const INTERESES = [
  { id: 'monumentos', nombre: 'Monumentos', descripcion: 'Catedrales, palacios y murallas', color: 'var(--terracota)',
    foto: 'fotos/gustos/monumentos.webp',
    credito: { autor: "Diliff", licencia: 'CC BY-SA 3.0', fuente: 'https://commons.wikimedia.org/wiki/File:La_Giralda,_Seville,_Spain_-_Sep_2009.jpg' },
    icono: 'M3 21h18M5 21V11M9.5 21V11M14.5 21V11M19 21V11M2 11l10-7 10 7z' },
  { id: 'museos', nombre: 'Museos', descripcion: 'Arte, historia y exposiciones', color: 'var(--azul)',
    foto: 'fotos/gustos/museos.webp',
    credito: { autor: "iurikothe", licencia: 'CC BY 2.0', fuente: 'https://commons.wikimedia.org/wiki/File:Sala_en_el_Museo_del_Prado.jpg' },
    icono: 'M4 4h16v16H4zM7 16l3.5-4 2.5 3 2-2 2 3M15 8.5h.01' },
  { id: 'gastronomia', nombre: 'Gastronomía', descripcion: 'Tapeo, mercados y bares de toda la vida', color: '#d9902a',
    foto: 'fotos/gustos/gastronomia.webp',
    credito: { autor: "David Adam Kess", licencia: 'CC BY-SA 4.0', fuente: 'https://commons.wikimedia.org/wiki/File:(_Madrid,_Spain,_Tapas_)_best_of_the_best_of_the_best.jpg' },
    icono: 'M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 3c-2.5 2-2.5 6 0 8v10' },
  { id: 'naturaleza', nombre: 'Naturaleza', descripcion: 'Parques, jardines y miradores', color: 'var(--olivo)',
    foto: 'fotos/gustos/naturaleza.webp',
    credito: { autor: "Carlos Delgado", licencia: 'CC BY-SA 4.0', fuente: 'https://commons.wikimedia.org/wiki/File:Estanque_del_Parque_del_Retiro_-_01.jpg' },
    icono: 'M12 22v-5M12 17H6l6-14 6 14zM3 22h18' },
  { id: 'ocio-nocturno', nombre: 'Ocio nocturno', descripcion: 'Bares, música y vida de noche', color: '#3d3550',
    foto: 'fotos/gustos/ocio-nocturno.webp',
    credito: { autor: "Noeliv", licencia: 'CC BY-SA 4.0', fuente: 'https://commons.wikimedia.org/wiki/File:Espect%C3%A1culo_flamenco_en_Tablao_Flamenco_El_Arenal.jpg' },
    icono: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5zM17 3v3M15.5 4.5h3' },
  { id: 'compras', nombre: 'Compras', descripcion: 'Mercados, tiendas y calles comerciales', color: 'var(--terracota-profunda)',
    foto: 'fotos/gustos/compras.webp',
    credito: { autor: "Juan Antonio Flores Segal from Madrid (Spain)", licencia: 'CC BY 2.0', fuente: 'https://commons.wikimedia.org/wiki/File:Mercado_de_San_Miguel_(Madrid)_04.jpg' },
    icono: 'M5 8h14l-1.2 13H6.2zM9 8V6.5a3 3 0 0 1 6 0V8' },
  { id: 'playa', nombre: 'Playa', descripcion: 'Arena, paseo marítimo y chiringuito', color: '#2f7fa8',
    foto: 'fotos/gustos/playa.webp',
    credito: { autor: "DimiTalen", licencia: 'CC0', fuente: 'https://commons.wikimedia.org/wiki/File:Promenade_and_beach,_Platja_de_la_Barceloneta,_Barcelona,_2015.jpg' },
    icono: 'M2 19c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M12 3v2M5.6 5.6 7 7M18.4 5.6 17 7M7 14a5 5 0 0 1 10 0' },
  { id: 'ninos', nombre: 'Con niños', descripcion: 'Planes para ir con peques', color: '#c0703a',
    foto: 'fotos/gustos/ninos.webp',
    credito: { autor: "Esniom", licencia: 'CC BY-SA 4.0', fuente: 'https://commons.wikimedia.org/wiki/File:Rhizostoma_pulmo_in_Oceanogr%C3%A0fic_Valencia.jpg' },
    icono: 'M12 3a5 5 0 0 1 5 5c0 3.6-5 7-5 7s-5-3.4-5-7a5 5 0 0 1 5-5zM12 15c0 2-1.5 3-1.5 4.5S12 21 12 21' },
];

const ORDEN = INTERESES.map((i) => i.id);

/** «Me va» (true) añade el interés y «paso» (false) lo quita; siempre en el orden del planificador. */
export function decidirInteres(perfil, id, meVa) {
  if (!ORDEN.includes(id)) return perfil;
  const elegidos = new Set(perfil.intereses);
  if (meVa) elegidos.add(id);
  else elegidos.delete(id);
  return { ...perfil, intereses: ORDEN.filter((i) => elegidos.has(i)) };
}
