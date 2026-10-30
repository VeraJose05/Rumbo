// F5 (RNF-03): LLM como juez de relevancia y viabilidad, probado con un modelo simulado.
import { genkit, type GenerateRequest } from 'genkit';
import { describe, expect, it } from 'vitest';
import { PerfilSchema } from '../flows/perfil.js';
import type { Itinerario } from '../flows/planificacion.js';
import { construirPromptJuez, definirJuez, JuicioSchema } from './juez.js';

const perfil = PerfilSchema.parse({ destino: 'Sevilla', dias: 1, intereses: ['gastronomia'], ritmo: 'tranquilo', compania: 'familia' });

const itinerario: Itinerario = {
  modo: 'C1',
  hayInformacion: true,
  dias: [
    {
      dia: 1,
      manana: [{ lugar: 'Mercado de Triana', descripcion: 'Desayuno entre puestos.', citas: [3], verificacion: 'verificada' }],
      tarde: [],
      noche: [{ lugar: 'Bodeguita Romero', descripcion: 'Cena de tapas.', citas: [7], verificacion: 'sin-fuente' }],
    },
  ],
  fuentes: [],
  recuperados: [{ cita: 3, id: 's:3', seccion: 'Comer', texto: 'Texto recuperado secreto.' }],
};

describe('construirPromptJuez', () => {
  it('incluye el perfil, la rúbrica de la métrica y el itinerario por franjas', () => {
    const { system, prompt } = construirPromptJuez('relevancia', perfil, itinerario);

    expect(system).toContain('relevancia');
    expect(system).toContain('5:');
    expect(prompt).toContain('Viaje: Sevilla, 1 día');
    expect(prompt).toContain('Día 1');
    expect(prompt).toContain('- Mañana: Mercado de Triana: Desayuno entre puestos.');
    expect(prompt).toContain('- Tarde: libre');
    expect(prompt).toContain('- Noche: Bodeguita Romero: Cena de tapas.');
  });

  it('es a ciegas: no dice el modo, ni las citas, ni la verificación, ni los textos recuperados', () => {
    const { system, prompt } = construirPromptJuez('viabilidad', perfil, itinerario);
    const todo = `${system}\n${prompt}`;

    for (const oculto of ['C1', '[3]', '[7]', 'verificada', 'sin-fuente', 'Texto recuperado secreto']) {
      expect(todo).not.toContain(oculto);
    }
  });

  it('cada métrica tiene su propia rúbrica', () => {
    expect(construirPromptJuez('relevancia', perfil, itinerario).system).not.toBe(
      construirPromptJuez('viabilidad', perfil, itinerario).system,
    );
  });
});

describe('JuicioSchema', () => {
  it('pide el razonamiento antes que la nota, que va de 1 a 5', () => {
    expect(Object.keys(JuicioSchema.shape)).toEqual(['razonamiento', 'nota']);
    expect(JuicioSchema.safeParse({ razonamiento: 'x', nota: 6 }).success).toBe(false);
    expect(JuicioSchema.safeParse({ razonamiento: 'x', nota: 2.5 }).success).toBe(false);
  });
});

describe('definirJuez', () => {
  it('pide la nota con el modelo juez, a temperatura 0 y con semilla fija', async () => {
    const peticiones: GenerateRequest[] = [];
    const ai = genkit({});
    ai.defineModel({ name: 'juez-simulado', supports: { constrained: 'all', output: ['json'] } }, async (peticion) => {
      peticiones.push(peticion);
      return { message: { role: 'model', content: [{ text: '{"razonamiento":"Cubre la gastronomía.","nota":4}' }] } };
    });

    const juicio = await definirJuez(ai, 'juez-simulado')('relevancia', perfil, itinerario);

    expect(juicio).toEqual({ razonamiento: 'Cubre la gastronomía.', nota: 4 });
    expect(peticiones[0]?.config).toEqual({ temperature: 0, seed: 1 });
  });
});
