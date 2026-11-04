// RNF-09: en local nada sale del equipo; en la versión pública se dice a qué servicios van los mensajes
// (en una línea; el detalle, en la página de privacidad).
import { describe, expect, it } from 'vitest';
import { avisoCorto, type ProveedorExterno } from './privacidad';

const PUBLICOS: ProveedorExterno[] = [
  { uso: 'modelo de lenguaje', servicio: 'api.groq.com', modelo: 'openai/gpt-oss-120b' },
  { uso: 'búsqueda en la guía', servicio: 'api.cloudflare.com', modelo: 'bge-m3' },
];

describe('avisoCorto', () => {
  it('nombra los servicios externos en una línea', () => {
    expect(avisoCorto(PUBLICOS)).toBe('Tus mensajes se procesan en Groq y Cloudflare');
  });

  it('en local, nada sale del equipo', () => {
    expect(avisoCorto([])).toBe('Todo se ejecuta en tu equipo');
  });
});
