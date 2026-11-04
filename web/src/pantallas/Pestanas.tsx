// RF-12: barra de pestañas fija abajo, como en una app móvil: Inicio, Mi viaje, Mis viajes y
// Pasaporte. Sale en las pantallas «de destino»; no en el recorrido, «preparando» ni el chat, que
// tienen su propio botón de volver.
import { BookMarked, Compass, Map, Stamp, type LucideIcon } from 'lucide-react';
import type { Ruta } from '../ruta';
import '../estilos/pestanas.css';

interface Pestana {
  pantalla: Ruta['pantalla'];
  href: string;
  nombre: string;
  Icono: LucideIcon;
}

const PESTANAS: Pestana[] = [
  { pantalla: 'portada', href: '#/', nombre: 'Inicio', Icono: Compass },
  { pantalla: 'itinerario', href: '#/itinerario', nombre: 'Mi viaje', Icono: Map },
  { pantalla: 'viajes', href: '#/viajes', nombre: 'Mis viajes', Icono: BookMarked },
  { pantalla: 'pasaporte', href: '#/pasaporte', nombre: 'Pasaporte', Icono: Stamp },
];

export const PANTALLAS_CON_PESTANAS: Ruta['pantalla'][] = PESTANAS.map((p) => p.pantalla);

interface Props {
  activa: Ruta['pantalla'];
  /** Sin un viaje planificado, «Mi viaje» no lleva a ningún sitio y no se enseña. */
  hayViaje: boolean;
  guardados: number;
}

export function Pestanas({ activa, hayViaje, guardados }: Props) {
  return (
    <nav className="pestanas" aria-label="Secciones">
      {PESTANAS.filter((p) => p.pantalla !== 'itinerario' || hayViaje).map(({ pantalla, href, nombre, Icono }) => (
        <a key={pantalla} href={href} className="pestana" aria-current={pantalla === activa ? 'page' : undefined}>
          <span className="pestana-icono">
            <Icono className="icono" aria-hidden="true" />
            {pantalla === 'viajes' && guardados > 0 && <span className="pestana-cuenta">{guardados}</span>}
          </span>
          {nombre}
        </a>
      ))}
    </nav>
  );
}
