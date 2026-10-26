// RNF-02: conexión con la base vectorial Chroma (docker compose up -d).
import { z } from 'genkit';

export interface ConfigChroma {
  host: string;
  port: number;
  ssl: boolean;
  coleccion: string;
}

type Entorno = Record<string, string | undefined>;

export function cargarConfigChroma(env: Entorno = process.env): ConfigChroma {
  const url = new URL(z.string().url().parse(env.CHROMA_URL || 'http://localhost:8000'));
  const ssl = url.protocol === 'https:';
  return {
    host: url.hostname,
    port: Number(url.port) || (ssl ? 443 : 80),
    ssl,
    coleccion: env.CHROMA_COLECCION || 'destinos',
  };
}
