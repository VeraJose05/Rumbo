// RF-02, RF-04, RF-12: chat con Rumbo (entrevista y preguntas a la guía).
import { describe, expect, it } from 'vitest';
import { peticionEntrevista, trozosDeTexto } from './chat';

describe('trozosDeTexto', () => {
  it('separa el texto y los enlaces Markdown a la guía', () => {
    expect(trozosDeTexto('Cuesta 8,75 €. ([Wikivoyage](https://es.wikivoyage.org/wiki/Sevilla))')).toEqual([
      { tipo: 'texto', texto: 'Cuesta 8,75 €. (' },
      { tipo: 'enlace', texto: 'Wikivoyage', url: 'https://es.wikivoyage.org/wiki/Sevilla' },
      { tipo: 'texto', texto: ')' },
    ]);
  });

  it('admite paréntesis equilibrados en la URL, como «Granada_(España)»', () => {
    const trozos = trozosDeTexto('[Guía](https://es.wikivoyage.org/wiki/Granada_(Espa%C3%B1a))');
    expect(trozos).toEqual([{ tipo: 'enlace', texto: 'Guía', url: 'https://es.wikivoyage.org/wiki/Granada_(Espa%C3%B1a)' }]);
  });

  it('no convierte enlaces que no sean http o https', () => {
    expect(trozosDeTexto('[pulsa](javascript:alert(1))')).toEqual([{ tipo: 'texto', texto: '[pulsa](javascript:alert(1))' }]);
  });
});

describe('peticionEntrevista', () => {
  it('la primera vez va sin estado, después con el que devolvió el servidor', () => {
    expect(peticionEntrevista(null, '')).toEqual({ data: { mensaje: '' } });
    const estado = { perfil: { destino: 'Sevilla' }, preguntados: ['dias'] };
    expect(peticionEntrevista(estado, ' 3 días ')).toEqual({ data: { estado, mensaje: '3 días' } });
  });
});
