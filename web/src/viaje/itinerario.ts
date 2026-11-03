// RF-05: itinerario tal como lo devuelve el planificador (ItinerarioSchema en src/flows/planificacion.ts).
// Se repite aquí como tipos de TypeScript porque el esquema del servidor depende de Genkit.

export type Verificacion = 'verificada' | 'cita-erronea' | 'sin-fuente' | null;

export interface Actividad {
  lugar: string;
  descripcion: string;
  citas: number[];
  verificacion: Verificacion;
}

export interface Dia {
  dia: number;
  manana: Actividad[];
  tarde: Actividad[];
  noche: Actividad[];
}

export interface Fuente {
  cita: number;
  seccion: string;
  fuente: string;
  url: string;
  licencia: string;
}

/** Fragmento de la guía entregado al modelo, con el número con el que se cita. */
export interface Recuperado {
  cita: number;
  id: string;
  seccion: string;
  texto: string;
}

export interface Itinerario {
  modo: 'C0' | 'C1' | 'C2';
  hayInformacion: boolean;
  dias: Dia[];
  fuentes: Fuente[];
  interesesSinCobertura?: string[];
  /** Todo lo recuperado; lo necesita el ajuste (RF-11) y da la cita literal de cada lugar. */
  recuperados: Recuperado[];
}

export const FRANJAS = [
  { id: 'manana', nombre: 'Mañana' },
  { id: 'tarde', nombre: 'Tarde' },
  { id: 'noche', nombre: 'Noche' },
] as const;
