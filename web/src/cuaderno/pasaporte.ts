// RF-12: pasaporte de Rumbo. Gamificación sin login: cada check-in («¡Estuve aquí!») se guarda en el
// móvil; una ciudad con algún check-in tiene su sello, y las insignias salen de la sección de la guía
// de cada lugar (Comer, Beber, Ver…), no de datos inventados.
import { DESTINOS_PORTADA } from '../datos/destinos';

export interface Visita {
  destino: string;
  lugar: string;
  /** Sección de la guía de donde sale el lugar («Comer», «Beber y salir», «Ver»…). */
  seccion: string;
  fecha: string;
}

export type TipoLugar = 'ver' | 'comer' | 'noche' | 'comprar' | 'otro';

export function tipoDeSeccion(seccion: string): TipoLugar {
  const principal = seccion.split('›')[0]!.trim().toLowerCase();
  if (principal === 'comer') return 'comer';
  if (principal.startsWith('beber') || principal === 'salir') return 'noche';
  if (principal === 'ver' || principal === 'lugares de interés' || principal === 'hacer') return 'ver';
  if (principal === 'comprar') return 'comprar';
  return 'otro';
}

const mismaVisita = (a: Visita, b: Visita) => a.destino === b.destino && a.lugar === b.lugar;

export function hacerCheckIn(visitas: Visita[], nueva: Visita): Visita[] {
  return visitas.some((v) => mismaVisita(v, nueva)) ? visitas : [...visitas, nueva];
}

export function sellosDeCiudad(visitas: Visita[]) {
  return DESTINOS_PORTADA.map((d) => {
    const lugares = visitas.filter((v) => v.destino === d.nombre).length;
    return { destino: d.nombre, region: d.region, lugares, conseguido: lugares > 0 };
  });
}

export interface Insignia {
  id: string;
  nombre: string;
  descripcion: string;
  actual: number;
  meta: number;
  conseguida: boolean;
}

export function insignias(visitas: Visita[]): Insignia[] {
  const de = (tipo: TipoLugar) => visitas.filter((v) => tipoDeSeccion(v.seccion) === tipo).length;
  const ciudades = new Set(visitas.map((v) => v.destino)).size;
  const definiciones: Omit<Insignia, 'conseguida'>[] = [
    { id: 'primer-sello', nombre: 'Primer sello', descripcion: 'Tu primer «¡Estuve aquí!»', actual: visitas.length, meta: 1 },
    { id: 'tapeador', nombre: 'Tapeador', descripcion: '3 sitios de la sección «Comer»', actual: de('comer'), meta: 3 },
    { id: 'noctambulo', nombre: 'Noctámbulo', descripcion: '3 sitios de «Beber y salir»', actual: de('noche'), meta: 3 },
    { id: 'explorador', nombre: 'Explorador', descripcion: '5 sitios de la sección «Ver»', actual: de('ver'), meta: 5 },
    { id: 'trotamundos', nombre: 'Trotamundos', descripcion: 'Sellos de 3 ciudades', actual: ciudades, meta: 3 },
  ];
  return definiciones.map((d) => ({ ...d, actual: Math.min(d.actual, d.meta), conseguida: d.actual >= d.meta }));
}

// Copia del pasaporte en un archivo, para no perderlo al cambiar de móvil o borrar el navegador.
const MARCA = 'rumbo-pasaporte';

export function copiaPasaporte(visitas: Visita[]): string {
  return JSON.stringify({ app: MARCA, version: 1, visitas }, null, 1);
}

/** Lee una copia exportada; lanza un error si el archivo no lo es (viene de fuera: se valida todo). */
export function leerCopiaPasaporte(texto: string): Visita[] {
  const datos = JSON.parse(texto) as { app?: unknown; visitas?: unknown };
  if (datos?.app !== MARCA || !Array.isArray(datos.visitas)) throw new Error('No es una copia del pasaporte de Rumbo');
  const textos = ['destino', 'lugar', 'seccion', 'fecha'] as const;
  return datos.visitas.map((v: Record<string, unknown>) => {
    if (!textos.every((campo) => typeof v?.[campo] === 'string')) throw new Error('Copia del pasaporte dañada');
    return { destino: v.destino, lugar: v.lugar, seccion: v.seccion, fecha: v.fecha } as Visita;
  });
}
