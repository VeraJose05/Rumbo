// RNF-09: en local nada sale del equipo; en la versión pública se dice a qué servicios van los mensajes.
import { describe, expect, it } from 'vitest';
import { avisoPrivacidad } from './privacidad';

describe('avisoPrivacidad', () => {
  it('en local dice que todo se ejecuta en el equipo', () => {
    expect(avisoPrivacidad([])).toBe('Todo se ejecuta en tu equipo');
  });

  it('en la versión pública nombra los servicios y pide no escribir datos personales', () => {
    const aviso = avisoPrivacidad([
      { uso: 'modelo de lenguaje', servicio: 'api.groq.com', modelo: 'openai/gpt-oss-120b' },
      { uso: 'búsqueda en la guía', servicio: 'api.cloudflare.com', modelo: 'bge-m3' },
    ]);
    expect(aviso).toBe(
      'Versión pública: tus mensajes se procesan en Groq (gpt-oss-120b) y Cloudflare (bge-m3), modelos abiertos. No escribas datos personales',
    );
  });
});
