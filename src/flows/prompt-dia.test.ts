// RF-05, RF-09: prompt para generar un día del itinerario, igual en todos los modos salvo los textos.
import { describe, expect, it } from 'vitest';
import { PerfilSchema } from './perfil.js';
import { construirPromptDia } from './prompt-dia.js';

const perfil = PerfilSchema.parse({
  destino: 'Sevilla',
  dias: 3,
  intereses: ['naturaleza'],
  ritmo: 'tranquilo',
  compania: 'familia',
});
const fragmentos = [
  { texto: 'Parque de María Luisa, donado en 1893.', seccion: 'Ver' },
  { texto: 'Paseos en barco por el Guadalquivir.', seccion: 'Pasear › En barco' },
];

describe('construirPromptDia', () => {
  it('describe el viaje, el día, cuántas actividades hacen falta y qué lugares no repetir', () => {
    const { prompt } = construirPromptDia({ perfil, dia: 2, usados: ['Catedral', 'Triana'], fragmentos });

    expect(prompt).toContain('Viaje: Sevilla, 3 días, en familia, ritmo tranquilo, presupuesto medio. Intereses: naturaleza.');
    expect(prompt).toContain('Planifica el día 2 de 3 con 2 actividades en total.');
    expect(prompt).toContain('No repitas estos lugares, ya incluidos en días anteriores: Catedral, Triana.');
  });

  it('con fragmentos (C1, C2) los numera y exige usarlos y citarlos', () => {
    const { system, prompt } = construirPromptDia({ perfil, dia: 1, usados: [], fragmentos });

    expect(prompt).toContain('[1] (Sevilla › Ver) Parque de María Luisa, donado en 1893.');
    expect(prompt).toContain('[2] (Sevilla › Pasear › En barco) Paseos en barco por el Guadalquivir.');
    expect(system).toMatch(/SOLO lugares que aparezcan en los textos/);
    expect(system).toMatch(/citas/);
  });

  it('sin fragmentos (C0) no menciona textos ni citas, y el resto del prompt es igual', () => {
    const conTextos = construirPromptDia({ perfil, dia: 1, usados: [], fragmentos });
    const sinTextos = construirPromptDia({ perfil, dia: 1, usados: [], fragmentos: null });

    expect(sinTextos.prompt).not.toContain('Textos:');
    expect(sinTextos.system).not.toMatch(/textos|citas/i);
    // Las reglas comunes se mantienen, para que la única diferencia entre modos sea la recuperación.
    for (const regla of ['Escribe en español', 'No repitas lugares', 'franjas que no uses']) {
      expect(conTextos.system).toContain(regla);
      expect(sinTextos.system).toContain(regla);
    }
  });

  it('no menciona lugares usados el primer día', () => {
    expect(construirPromptDia({ perfil, dia: 1, usados: [], fragmentos }).prompt).not.toContain('No repitas');
  });
});
