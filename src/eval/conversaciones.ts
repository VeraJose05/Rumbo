// RF-01: conversaciones de prueba para evaluar la entrevista. Muchas salen de fallos reales
// encontrados al probar la demo (ver docs/diario.md, F6).
import type { Persona } from './entrevista-sim.js';

export const CONVERSACIONES: Persona[] = [
  // Todo dicho en el primer mensaje: debe ir directo a confirmar.
  {
    id: 'todo-sevilla',
    grupo: 'todo-junto',
    primero: '4 días a Sevilla con mi mujer y mis dos hijos, monumentos y tapas, tranquilos y sin gastar mucho',
    respuestas: {},
    esperado: { destino: 'Sevilla', dias: 4, intereses: ['monumentos', 'gastronomia'], ritmo: 'tranquilo', presupuesto: 'bajo', compania: 'familia' },
    toleraIntereses: ['ninos'],
  },
  {
    id: 'todo-madrid',
    grupo: 'todo-junto',
    primero: 'Quiero ir 3 días a Madrid con mi pareja a ver museos, a tope y con presupuesto alto',
    respuestas: {},
    esperado: { destino: 'Madrid', dias: 3, intereses: ['museos'], ritmo: 'intenso', presupuesto: 'alto', compania: 'pareja' },
  },
  {
    id: 'todo-valencia',
    grupo: 'todo-junto',
    primero: 'Somos un grupo de amigos, 2 días en Valencia, playa y salir de fiesta, sin gastar mucho',
    respuestas: { opcionales: ['nada más'] },
    esperado: { destino: 'Valencia', dias: 2, intereses: ['playa', 'ocio-nocturno'], presupuesto: 'bajo', compania: 'amigos' },
  },

  // Un dato por mensaje.
  {
    id: 'poco-granada',
    grupo: 'poco-a-poco',
    primero: 'hola',
    respuestas: { destino: ['Granada'], dias: ['3'], intereses: ['monumentos y comer bien'], opcionales: ['con mi pareja, tranquilos'] },
    esperado: { destino: 'Granada', dias: 3, intereses: ['monumentos', 'gastronomia'], ritmo: 'tranquilo', compania: 'pareja' },
  },
  {
    id: 'poco-barcelona',
    grupo: 'poco-a-poco',
    primero: 'Hola, quiero hacer un viaje',
    respuestas: { destino: ['Barcelona'], dias: ['un fin de semana'], intereses: ['compras y playa'], opcionales: ['nada más'] },
    esperado: { destino: 'Barcelona', dias: 2, intereses: ['compras', 'playa'] },
  },
  {
    id: 'poco-madrid-corto',
    grupo: 'poco-a-poco',
    primero: 'Madrid',
    respuestas: { dias: ['2'], intereses: ['museos'], opcionales: ['voy solo, ritmo intenso'] },
    esperado: { destino: 'Madrid', dias: 2, intereses: ['museos'], ritmo: 'intenso', compania: 'solo' },
  },

  // Preguntas del viajero a mitad: se contestan y se vuelve a lo pendiente.
  {
    id: 'pregunta-dias-granada',
    grupo: 'con-preguntas',
    primero: 'Me apetece Granada',
    preguntas: { dias: 'no sé, ¿cuántos días hacen falta para verla bien?' },
    respuestas: { dias: ['vale, 3 días'], intereses: ['la Alhambra y las tapas'], opcionales: ['nada más'] },
    esperado: { destino: 'Granada', dias: 3, intereses: ['monumentos', 'gastronomia'] },
  },
  {
    id: 'pregunta-comer-sevilla',
    grupo: 'con-preguntas',
    primero: '4 días en Sevilla con mi pareja',
    preguntas: { opcionales: '¿qué se puede comer allí?' },
    respuestas: { intereses: ['monumentos'], opcionales: ['tranquilo'] },
    esperado: { destino: 'Sevilla', dias: 4, intereses: ['monumentos'], ritmo: 'tranquilo', compania: 'pareja' },
  },
  {
    id: 'pregunta-intereses-valencia',
    grupo: 'con-preguntas',
    primero: 'Valencia, 3 días',
    preguntas: { intereses: '¿qué me recomiendas hacer allí?' },
    respuestas: { intereses: ['playa y paella'], opcionales: ['en familia'] },
    esperado: { destino: 'Valencia', dias: 3, intereses: ['playa', 'gastronomia'], compania: 'familia' },
  },

  // Intereses que se deducen de nombres propios.
  {
    id: 'nombres-madrid',
    grupo: 'nombres-propios',
    primero: 'quiero ver el Prado, 3 días en Madrid',
    respuestas: { opcionales: ['con mi novia'] },
    esperado: { destino: 'Madrid', dias: 3, intereses: ['museos'], compania: 'pareja' },
  },
  {
    id: 'nombres-barcelona',
    grupo: 'nombres-propios',
    primero: 'Barcelona',
    respuestas: { dias: ['4'], intereses: ['Gaudí y la Sagrada Familia'], opcionales: ['nada más'] },
    esperado: { destino: 'Barcelona', dias: 4, intereses: ['monumentos'] },
  },

  // Expresiones que se traducían mal.
  {
    id: 'cultura-granada',
    grupo: 'ambiguo',
    primero: 'quiero viajar a granada con mi familia, 4 dias y nos gusta la comida y la cultura',
    respuestas: { opcionales: ['nada más'] },
    esperado: { destino: 'Granada', dias: 4, intereses: ['gastronomia', 'monumentos', 'museos'], compania: 'familia' },
  },
  {
    id: 'barato-sevilla',
    grupo: 'ambiguo',
    primero: 'Sevilla 2 días, que sea barato',
    respuestas: { intereses: ['salir de noche y tapas'], opcionales: ['con amigos'] },
    esperado: { destino: 'Sevilla', dias: 2, intereses: ['ocio-nocturno', 'gastronomia'], presupuesto: 'bajo', compania: 'amigos' },
  },
  {
    id: 'fin-semana-granada',
    grupo: 'ambiguo',
    primero: 'Un fin de semana en Granada',
    respuestas: { intereses: ['monumentos'], opcionales: ['nada más'] },
    esperado: { destino: 'Granada', dias: 2, intereses: ['monumentos'] },
  },
  {
    id: 'ninos-barcelona',
    grupo: 'ambiguo',
    primero: 'Barcelona con niños, sin gastar mucho',
    respuestas: { dias: ['3'], intereses: ['playa'], opcionales: ['vamos en familia'] },
    esperado: { destino: 'Barcelona', dias: 3, intereses: ['playa', 'ninos'], presupuesto: 'bajo', compania: 'familia' },
  },

  // Primero un destino sin guía: lo dice y vuelve a pedir el destino.
  {
    id: 'fuera-bilbao',
    grupo: 'fuera-corpus',
    primero: 'Quiero ir a Bilbao',
    respuestas: { destino: ['vale, pues Madrid'], dias: ['2'], intereses: ['museos'], opcionales: ['nada más'] },
    esperado: { destino: 'Madrid', dias: 2, intereses: ['museos'] },
  },
];
