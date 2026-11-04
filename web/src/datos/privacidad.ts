// RNF-09: texto sobre adónde van los mensajes del viajero, a partir de lo que declara el servidor
// en /info (ProveedorExterno en src/config/modelos.ts). React escapa el texto al pintarlo.
import { useEffect, useState } from 'react';

export interface ProveedorExterno {
  uso: string;
  servicio: string;
  modelo: string;
}

// Nombre legible de cada servicio a partir de su host; si no se conoce, el propio host.
const SERVICIOS: Record<string, string> = { 'api.groq.com': 'Groq', 'api.cloudflare.com': 'Cloudflare' };

export const nombreServicio = (p: ProveedorExterno) => SERVICIOS[p.servicio] ?? p.servicio;

/** Versión de una línea (chat, portada); el detalle está en la página de privacidad (#/legal). */
export function avisoCorto(proveedores: ProveedorExterno[]): string {
  if (!proveedores.length) return 'Todo se ejecuta en tu equipo';
  return `Tus mensajes se procesan en ${proveedores.map(nombreServicio).join(' y ')}`;
}

/** Proveedores externos que declara el servidor; null mientras no ha respondido (o si falla). */
export function useProveedores(): ProveedorExterno[] | null {
  const [proveedores, setProveedores] = useState<ProveedorExterno[] | null>(null);
  useEffect(() => {
    fetch('/info')
      .then((r) => r.json())
      .then((info: { proveedores?: ProveedorExterno[] }) => setProveedores(info.proveedores ?? []))
      .catch(() => {});
  }, []);
  return proveedores;
}
