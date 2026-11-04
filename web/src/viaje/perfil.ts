// RF-01, RF-12: perfil del viajero que se construye en los pasos del recorrido (pantallas/Viaje). Los valores y límites
// son los del esquema del planificador (src/flows/perfil.ts), para que el perfil llegue válido.
import { DESTINOS_PORTADA, type Credito } from '../datos/destinos';

export type Ritmo = 'tranquilo' | 'normal' | 'intenso';
export type Presupuesto = 'bajo' | 'medio' | 'alto';
export type Compania = 'solo' | 'pareja' | 'familia' | 'amigos';
export type IdInteres = 'monumentos' | 'museos' | 'gastronomia' | 'naturaleza' | 'ocio-nocturno' | 'compras' | 'playa' | 'ninos';

/** Lo que recibe el planificador (PerfilSchema en src/flows/perfil.ts), con el destino aún por elegir. */
export interface Perfil {
  destino: string | null;
  dias: number;
  intereses: IdInteres[];
  ritmo: Ritmo;
  presupuesto: Presupuesto;
  compania: Compania;
}

export const DIAS_MIN = 1;
export const DIAS_MAX = 7;

const normalizar = (texto: unknown) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase();

export function perfilInicial(destino?: string | null): Perfil {
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

export function cambiarDias(perfil: Perfil, delta: number): Perfil {
  return { ...perfil, dias: Math.min(DIAS_MAX, Math.max(DIAS_MIN, perfil.dias + delta)) };
}

export function etiquetaDias(dias: number): string {
  if (dias === 1) return 'Escapada de un día';
  if (dias === 2) return 'Fin de semana';
  if (dias <= 4) return 'Escapada larga';
  if (dias <= 6) return 'Viaje con calma';
  return 'Una semana entera';
}

// Los 8 intereses del planificador (src/flows/perfil.ts), en su orden, con lo que se ve en cada carta.
// Cada carta lleva una foto de Wikimedia Commons (con su crédito) y un color de marca; el icono lo pone la interfaz.
export interface Interes {
  id: IdInteres;
  nombre: string;
  descripcion: string;
  color: string;
  foto: string;
  credito: Credito;
}

export const INTERESES: Interes[] = [
  { id: 'monumentos', nombre: 'Monumentos', descripcion: 'Catedrales, palacios y murallas', color: 'var(--terracota)',
    foto: '/fotos/gustos/monumentos.webp',
    credito: { autor: "Diliff", licencia: 'CC BY-SA 3.0', fuente: 'https://commons.wikimedia.org/wiki/File:La_Giralda,_Seville,_Spain_-_Sep_2009.jpg' } },
  { id: 'museos', nombre: 'Museos', descripcion: 'Arte, historia y exposiciones', color: 'var(--azul)',
    foto: '/fotos/gustos/museos.webp',
    credito: { autor: "iurikothe", licencia: 'CC BY 2.0', fuente: 'https://commons.wikimedia.org/wiki/File:Sala_en_el_Museo_del_Prado.jpg' } },
  { id: 'gastronomia', nombre: 'Gastronomía', descripcion: 'Tapeo, mercados y bares de toda la vida', color: '#d9902a',
    foto: '/fotos/gustos/gastronomia.webp',
    credito: { autor: "David Adam Kess", licencia: 'CC BY-SA 4.0', fuente: 'https://commons.wikimedia.org/wiki/File:(_Madrid,_Spain,_Tapas_)_best_of_the_best_of_the_best.jpg' } },
  { id: 'naturaleza', nombre: 'Naturaleza', descripcion: 'Parques, jardines y miradores', color: 'var(--olivo)',
    foto: '/fotos/gustos/naturaleza.webp',
    credito: { autor: "Carlos Delgado", licencia: 'CC BY-SA 4.0', fuente: 'https://commons.wikimedia.org/wiki/File:Estanque_del_Parque_del_Retiro_-_01.jpg' } },
  { id: 'ocio-nocturno', nombre: 'Ocio nocturno', descripcion: 'Bares, música y vida de noche', color: '#3d3550',
    foto: '/fotos/gustos/ocio-nocturno.webp',
    credito: { autor: "Noeliv", licencia: 'CC BY-SA 4.0', fuente: 'https://commons.wikimedia.org/wiki/File:Espect%C3%A1culo_flamenco_en_Tablao_Flamenco_El_Arenal.jpg' } },
  { id: 'compras', nombre: 'Compras', descripcion: 'Mercados, tiendas y calles comerciales', color: 'var(--terracota-profunda)',
    foto: '/fotos/gustos/compras.webp',
    credito: { autor: "Juan Antonio Flores Segal from Madrid (Spain)", licencia: 'CC BY 2.0', fuente: 'https://commons.wikimedia.org/wiki/File:Mercado_de_San_Miguel_(Madrid)_04.jpg' } },
  { id: 'playa', nombre: 'Playa', descripcion: 'Arena, paseo marítimo y chiringuito', color: '#2f7fa8',
    foto: '/fotos/gustos/playa.webp',
    credito: { autor: "DimiTalen", licencia: 'CC0', fuente: 'https://commons.wikimedia.org/wiki/File:Promenade_and_beach,_Platja_de_la_Barceloneta,_Barcelona,_2015.jpg' } },
  { id: 'ninos', nombre: 'Con niños', descripcion: 'Planes para ir con peques', color: '#c0703a',
    foto: '/fotos/gustos/ninos.webp',
    credito: { autor: "Esniom", licencia: 'CC BY-SA 4.0', fuente: 'https://commons.wikimedia.org/wiki/File:Rhizostoma_pulmo_in_Oceanogr%C3%A0fic_Valencia.jpg' } },
];

const ORDEN: string[] = INTERESES.map((i) => i.id);

/** «Me va» (true) añade el interés y «paso» (false) lo quita; siempre en el orden del planificador. */
export function decidirInteres(perfil: Perfil, id: string, meVa: boolean): Perfil {
  if (!ORDEN.includes(id)) return perfil;
  const elegidos = new Set<string>(perfil.intereses);
  if (meVa) elegidos.add(id);
  else elegidos.delete(id);
  return { ...perfil, intereses: INTERESES.map((i) => i.id).filter((i) => elegidos.has(i)) };
}

// Estilo de viaje: los valores del planificador. «planes» es lo que hace con cada ritmo
// (ACTIVIDADES_POR_RITMO en src/flows/itinerario.ts).
export const RITMOS: { id: Ritmo; nombre: string; planes: number }[] = [
  { id: 'tranquilo', nombre: 'Tranquilo', planes: 2 },
  { id: 'normal', nombre: 'Normal', planes: 3 },
  { id: 'intenso', nombre: 'Intenso', planes: 4 },
];

export const PRESUPUESTOS: { id: Presupuesto; nombre: string; monedas: number; descripcion: string }[] = [
  { id: 'bajo', nombre: 'Bajo', monedas: 1, descripcion: 'Tapeo y planes gratis' },
  { id: 'medio', nombre: 'Medio', monedas: 2, descripcion: 'Algún capricho' },
  { id: 'alto', nombre: 'Alto', monedas: 3, descripcion: 'Sin mirar la cuenta' },
];

export const COMPANIAS: { id: Compania; nombre: string }[] = [
  { id: 'solo', nombre: 'Solo' },
  { id: 'pareja', nombre: 'En pareja' },
  { id: 'familia', nombre: 'En familia' },
  { id: 'amigos', nombre: 'Con amigos' },
];

const OPCIONES: Record<string, { id: string }[]> = { ritmo: RITMOS, presupuesto: PRESUPUESTOS, compania: COMPANIAS };

/** Cambia ritmo, presupuesto o compañía si el valor es uno de los que acepta el planificador. */
export function elegir(perfil: Perfil, campo: string, valor: string): Perfil {
  if (!OPCIONES[campo]?.some((o) => o.id === valor)) return perfil;
  return { ...perfil, [campo]: valor };
}
