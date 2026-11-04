// RF-06, RF-12: lo que enseña la postal de cada lugar: si está en la guía y la cita de donde sale.
import { describe, expect, it } from 'vitest';
import type { Actividad, Fuente, Recuperado } from './itinerario';
import { perfilInicial } from './perfil';
import { citaDeLugar, etiquetaVerificacion, recortarCita, resumenViaje } from './postal';

const recuperados: Recuperado[] = [
  { cita: 1, id: 's:1', seccion: 'Comprender', texto: 'Sevilla es famosa por su Semana Santa.' },
  {
    cita: 2,
    id: 's:2',
    seccion: 'Ver',
    texto: '* Reales Alcázares - Palacio árabe que data del siglo X. La entrada cuesta 8,75 euros.\n* Torre del Oro - Torre vigía del siglo XIII.',
  },
];
const fuentes: Fuente[] = [
  { cita: 2, seccion: 'Ver', fuente: 'Wikivoyage', url: 'https://es.wikivoyage.org/wiki/Sevilla', licencia: 'CC BY-SA 4.0' },
];
const actividad = (lugar: string, citas: number[], verificacion: Actividad['verificacion']): Actividad => ({ lugar, descripcion: '', citas, verificacion });

describe('etiquetaVerificacion', () => {
  it('un lugar de la guía (en el texto citado o en otro recuperado) lleva la insignia de la guía', () => {
    expect(etiquetaVerificacion('verificada')).toEqual({ tipo: 'guia', texto: 'Está en la guía' });
    expect(etiquetaVerificacion('cita-erronea')).toEqual({ tipo: 'guia', texto: 'Está en la guía' });
  });

  it('un lugar sin fuente se dice tal cual', () => {
    expect(etiquetaVerificacion('sin-fuente')).toEqual({ tipo: 'sin-fuente', texto: 'Sin fuente en la guía' });
  });

  it('sin guía (C0) no hay etiqueta', () => {
    expect(etiquetaVerificacion(null)).toBeNull();
  });
});

describe('citaDeLugar', () => {
  it('saca la línea de la guía que habla del lugar, con su fuente', () => {
    expect(citaDeLugar(actividad('Real Alcázar', [2], 'verificada'), recuperados, fuentes)).toEqual({
      texto: 'Reales Alcázares - Palacio árabe que data del siglo X. La entrada cuesta 8,75 euros.',
      seccion: 'Ver',
      url: 'https://es.wikivoyage.org/wiki/Sevilla',
      licencia: 'CC BY-SA 4.0',
    });
  });

  it('si la cita era errónea, busca el lugar en los demás textos recuperados', () => {
    expect(citaDeLugar(actividad('Torre del Oro', [1], 'cita-erronea'), recuperados, fuentes)?.texto).toBe(
      'Torre del Oro - Torre vigía del siglo XIII.',
    );
  });

  it('sin mención del lugar no hay cita', () => {
    expect(citaDeLugar(actividad('Isla Mágica', [1], 'sin-fuente'), recuperados, fuentes)).toBeNull();
  });
});

describe('resumenViaje', () => {
  it('días, compañía y ritmo', () => {
    expect(resumenViaje({ ...perfilInicial('Sevilla'), compania: 'pareja' })).toBe('3 días · en pareja · ritmo normal');
    expect(resumenViaje({ ...perfilInicial('Sevilla'), dias: 1 })).toBe('1 día · solo · ritmo normal');
  });
});

describe('recortarCita', () => {
  it('deja las citas cortas tal cual', () => {
    expect(recortarCita('Torre vigía del siglo XIII.', 280)).toBe('Torre vigía del siglo XIII.');
  });

  it('corta las largas al final de una frase y añade puntos suspensivos', () => {
    const texto = 'Primera frase corta. Segunda frase algo más larga que la primera. Tercera frase que ya no cabe.';
    expect(recortarCita(texto, 70)).toBe('Primera frase corta. Segunda frase algo más larga que la primera. […]');
  });

  it('si la primera frase ya es demasiado larga, corta por palabras', () => {
    expect(recortarCita('una dos tres cuatro cinco seis', 15)).toBe('una dos tres […]');
  });
});
