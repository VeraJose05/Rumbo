// RF-12: pasaporte de Rumbo (gamificación sin login): sellos por ciudad e insignias por check-in.
import { describe, expect, it } from 'vitest';
import { copiaPasaporte, hacerCheckIn, insignias, leerCopiaPasaporte, sellosDeCiudad, tipoDeSeccion, type Visita } from './pasaporte';

const visita = (destino: string, lugar: string, seccion: string): Visita => ({ destino, lugar, seccion, fecha: '2026-11-03' });

describe('tipoDeSeccion', () => {
  it('agrupa las secciones de Wikivoyage', () => {
    expect(tipoDeSeccion('Comer')).toBe('comer');
    expect(tipoDeSeccion('Beber y salir')).toBe('noche');
    expect(tipoDeSeccion('Beber')).toBe('noche');
    expect(tipoDeSeccion('Ver › Museos')).toBe('ver');
    expect(tipoDeSeccion('Lugares de interés')).toBe('ver');
    expect(tipoDeSeccion('Comprar')).toBe('comprar');
    expect(tipoDeSeccion('Comprender')).toBe('otro');
  });
});

describe('hacerCheckIn', () => {
  it('añade la visita una sola vez por lugar y destino', () => {
    const una = hacerCheckIn([], visita('Sevilla', 'Real Alcázar', 'Ver'));
    expect(hacerCheckIn(una, visita('Sevilla', 'Real Alcázar', 'Ver'))).toHaveLength(1);
    expect(hacerCheckIn(una, visita('Granada', 'Real Alcázar', 'Ver'))).toHaveLength(2);
  });
});

describe('sellosDeCiudad', () => {
  it('una ciudad tiene sello con al menos un check-in', () => {
    const sellos = sellosDeCiudad([visita('Sevilla', 'Real Alcázar', 'Ver'), visita('Sevilla', 'Triana', 'Ver')]);
    expect(sellos.find((s) => s.destino === 'Sevilla')).toMatchObject({ conseguido: true, lugares: 2 });
    expect(sellos.find((s) => s.destino === 'Madrid')).toMatchObject({ conseguido: false, lugares: 0 });
    expect(sellos).toHaveLength(5);
  });
});

describe('insignias', () => {
  it('«Tapeador» con 3 sitios de la sección Comer, con progreso mientras tanto', () => {
    const dos = [visita('Sevilla', 'Bar A', 'Comer'), visita('Sevilla', 'Bar B', 'Comer')];
    expect(insignias(dos).find((i) => i.id === 'tapeador')).toMatchObject({ conseguida: false, actual: 2, meta: 3 });
    const tres = [...dos, visita('Madrid', 'Bar C', 'Comer')];
    expect(insignias(tres).find((i) => i.id === 'tapeador')).toMatchObject({ conseguida: true, actual: 3 });
  });

  it('«Trotamundos» con sellos de 3 ciudades y «Primer sello» con el primer check-in', () => {
    const visitas = [visita('Sevilla', 'A', 'Ver'), visita('Madrid', 'B', 'Ver'), visita('Granada', 'C', 'Ver')];
    const lista = insignias(visitas);
    expect(lista.find((i) => i.id === 'trotamundos')?.conseguida).toBe(true);
    expect(lista.find((i) => i.id === 'primer-sello')?.conseguida).toBe(true);
    expect(insignias([]).every((i) => !i.conseguida)).toBe(true);
  });
});

describe('copia del pasaporte', () => {
  it('se exporta y se vuelve a importar igual', () => {
    const visitas = [visita('Sevilla', 'Real Alcázar', 'Ver')];
    expect(leerCopiaPasaporte(copiaPasaporte(visitas))).toEqual(visitas);
  });

  it('rechaza archivos que no son una copia del pasaporte', () => {
    expect(() => leerCopiaPasaporte('no es json')).toThrow();
    expect(() => leerCopiaPasaporte(JSON.stringify({ app: 'otra', visitas: [] }))).toThrow();
    expect(() => leerCopiaPasaporte(JSON.stringify({ app: 'rumbo-pasaporte', visitas: [{ destino: 1 }] }))).toThrow();
  });
});
