// RF-01: lógica determinista de la entrevista (qué guardar, qué preguntar y cuándo terminar).
import { describe, expect, it } from 'vitest';
import { avisoDestino, fusionarPerfil, resumirPerfil, siguientePaso } from './entrevista-logica.js';
import { PerfilSchema } from './perfil.js';

const sinDatos = { destino: null, dias: null, intereses: [], ritmo: null, presupuesto: null, compania: null };

describe('fusionarPerfil', () => {
  it('añade los datos nuevos y conserva los que ya había', () => {
    expect(fusionarPerfil({ destino: 'Sevilla' }, { ...sinDatos, dias: 3, compania: 'familia' })).toEqual({
      destino: 'Sevilla',
      dias: 3,
      compania: 'familia',
    });
  });

  it('un dato nuevo sustituye al anterior, pero un null no borra nada', () => {
    expect(fusionarPerfil({ destino: 'Sevilla', dias: 2 }, { ...sinDatos, dias: 4 })).toEqual({
      destino: 'Sevilla',
      dias: 4,
    });
  });

  it('acumula los intereses sin repetir', () => {
    expect(
      fusionarPerfil({ intereses: ['museos'] }, { ...sinDatos, intereses: ['naturaleza', 'museos'] }).intereses,
    ).toEqual(['museos', 'naturaleza']);
  });

  it('escribe el destino como en el catálogo', () => {
    expect(fusionarPerfil({}, { ...sinDatos, destino: 'granada' }).destino).toBe('Granada');
  });

  it('no guarda un destino sin guía, para que se vuelva a preguntar', () => {
    expect(fusionarPerfil({}, { ...sinDatos, destino: 'Japón', dias: 5 })).toEqual({ dias: 5 });
    expect(fusionarPerfil({ destino: 'Sevilla' }, { ...sinDatos, destino: 'Japón' }).destino).toBe('Sevilla');
  });

  it('descarta los valores inválidos para que se vuelvan a preguntar', () => {
    expect(fusionarPerfil({}, { ...sinDatos, destino: 'Sevilla', dias: 15 })).toEqual({ destino: 'Sevilla' });
  });
});

describe('siguientePaso', () => {
  it('pregunta el primer campo obligatorio que falta', () => {
    expect(siguientePaso({ perfil: {}, preguntados: [] })).toEqual({ tipo: 'preguntar', campo: 'destino' });
    expect(siguientePaso({ perfil: { destino: 'Sevilla', dias: 2 }, preguntados: ['destino', 'dias'] })).toEqual({
      tipo: 'preguntar',
      campo: 'intereses',
    });
  });

  it('pregunta por los intereses aunque ya se haya deducido alguno', () => {
    const perfil = { destino: 'Sevilla', dias: 2, intereses: ['ninos'] };
    expect(siguientePaso({ perfil, preguntados: ['destino'] })).toEqual({ tipo: 'preguntar', campo: 'intereses' });
  });

  it('con lo obligatorio completo y los intereses preguntados, pregunta una vez por los opcionales', () => {
    const perfil = { destino: 'Sevilla', dias: 2, intereses: ['museos'] };
    expect(siguientePaso({ perfil, preguntados: ['intereses'] })).toEqual({ tipo: 'preguntar', campo: 'opcionales' });
  });

  it('después termina con el perfil validado y los valores por defecto', () => {
    const perfil = { destino: 'Sevilla', dias: 2, intereses: ['museos'], ritmo: 'tranquilo' };
    expect(siguientePaso({ perfil, preguntados: ['intereses', 'opcionales'] })).toEqual({
      tipo: 'terminar',
      perfil: { ...perfil, presupuesto: 'medio', compania: 'solo' },
    });
  });
});

describe('avisoDestino', () => {
  it('si el destino no tiene guía, lo dice y pregunta por uno de los disponibles', () => {
    expect(avisoDestino('Bilbao')).toBe(
      'Lo siento, todavía no tengo información de Bilbao. Puedo ayudarte con Sevilla, Madrid, Barcelona, Granada y Valencia. ¿A cuál te gustaría ir?',
    );
  });

  it('no avisa si el destino está en el catálogo', () => {
    expect(avisoDestino('Granada')).toBeNull();
  });
});

describe('resumirPerfil', () => {
  it('describe el perfil en una frase legible', () => {
    const perfil = PerfilSchema.parse({
      destino: 'Sevilla',
      dias: 3,
      intereses: ['naturaleza', 'ninos'],
      ritmo: 'tranquilo',
      presupuesto: 'bajo',
      compania: 'familia',
    });

    expect(resumirPerfil(perfil)).toBe(
      'Sevilla, 3 días, en familia, ritmo tranquilo, presupuesto bajo. Intereses: naturaleza, niños.',
    );
  });

  it('usa singular para un día', () => {
    const perfil = PerfilSchema.parse({ destino: 'Sevilla', dias: 1, intereses: ['museos'] });

    expect(resumirPerfil(perfil)).toBe('Sevilla, 1 día, viajando solo, ritmo normal, presupuesto medio. Intereses: museos.');
  });
});
