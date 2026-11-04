// RF-12: barra de navegación flotante con tres destinos: Viajes, Nuevo viaje (botón central
// elevado) y Pasaporte. Sale en las pantallas principales; no en el recorrido, «preparando» ni el
// chat, que tienen su propio botón de volver.
import { BookMarked, Plus, Stamp, type LucideIcon } from 'lucide-react';
import type { Ruta } from '../ruta';
import '../estilos/pestanas.css';

/** Pantallas que llevan la barra (el itinerario abierto cuenta como «Viajes»). */
export const PANTALLAS_CON_PESTANAS: Ruta['pantalla'][] = ['portada', 'itinerario', 'viajes', 'pasaporte'];

interface Props {
  activa: Ruta['pantalla'];
  guardados: number;
}

function Lateral({ href, nombre, Icono, activa, cuenta }: { href: string; nombre: string; Icono: LucideIcon; activa: boolean; cuenta?: number }) {
  return (
    <a href={href} className="pestana" aria-current={activa ? 'page' : undefined}>
      <span className="pestana-icono">
        <Icono className="icono" aria-hidden="true" />
        {cuenta ? <span className="pestana-cuenta">{cuenta}</span> : null}
      </span>
      {nombre}
    </a>
  );
}

export function Pestanas({ activa, guardados }: Props) {
  const nuevo = activa === 'portada';
  return (
    <nav className="pestanas" aria-label="Secciones">
      <Lateral href="#/viajes" nombre="Viajes" Icono={BookMarked} activa={activa === 'viajes' || activa === 'itinerario'} cuenta={guardados} />
      <a href="#/" className="pestana-nuevo" aria-label="Nuevo viaje" aria-current={nuevo ? 'page' : undefined}>
        <Plus className="icono" aria-hidden="true" strokeWidth={2.6} />
      </a>
      <Lateral href="#/pasaporte" nombre="Pasaporte" Icono={Stamp} activa={activa === 'pasaporte'} />
    </nav>
  );
}
