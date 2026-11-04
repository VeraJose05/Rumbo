// RF-14: el día en un mapa a pantalla completa. Arriba, los días y la vuelta al camino; abajo, un
// carrusel con las paradas. Tocar una tarjeta lleva el mapa a su chincheta y tocar una chincheta
// trae su tarjeta. Las paradas sin ubicar también salen en el carrusel, marcadas como tales.
import { ArrowLeft, MapPinOff } from 'lucide-react';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import type { CoordenadasDestino } from '../viaje/mapa';
import type { Parada } from './Itinerario';
import type { ParadaUbicada } from './MapaDia';
import '../estilos/mapa.css';

// MapLibre solo se descarga al abrir el mapa.
const MapaDia = lazy(() => import('./MapaDia'));

interface Props {
  destino: string;
  dias: number[];
  dia: number;
  onDia: (dia: number) => void;
  paradas: Parada[];
  ubicadas: ParadaUbicada[];
  /** undefined mientras cargan; null si el destino no tiene mapa. */
  coordenadas: CoordenadasDestino | null | undefined;
  onCerrar: () => void;
  onAbrirPostal: (parada: Parada) => void;
}

export function MapaPantalla({ destino, dias, dia, onDia, paradas, ubicadas, coordenadas, onCerrar, onAbrirPostal }: Props) {
  const [activa, setActiva] = useState<number | null>(null);
  const carrusel = useRef<HTMLOListElement>(null);

  // Mientras el mapa ocupa la pantalla, la página de debajo no se desplaza; Escape vuelve al camino.
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) onCerrar();
    };
    document.addEventListener('keydown', alPulsar);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener('keydown', alPulsar);
    };
  }, [onCerrar]);

  useEffect(() => setActiva(null), [dia]);

  // Al elegir una chincheta, su tarjeta se pone a la vista en el carrusel.
  const seleccionar = (numero: number) => {
    setActiva(numero);
    carrusel.current?.querySelector(`[data-numero="${numero}"]`)?.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  return (
    <div className="mapa-pantalla" role="dialog" aria-modal="true" aria-label={`Mapa de ${destino}, día ${dia}`}>
      <div className="mapa-lienzo">
        {coordenadas === undefined ? (
          <div className="mapa-aviso">Cargando el mapa…</div>
        ) : coordenadas === null ? (
          <div className="mapa-aviso">No tengo el mapa de {destino}.</div>
        ) : (
          <Suspense fallback={<div className="mapa-aviso">Cargando el mapa…</div>}>
            <MapaDia ubicadas={ubicadas} centro={coordenadas.centro} activa={activa} onSeleccionar={seleccionar} />
          </Suspense>
        )}
      </div>

      <header className="mapa-arriba">
        <button type="button" className="boton boton-redondo boton-papel mapa-volver" onClick={onCerrar} aria-label="Volver al camino">
          <ArrowLeft className="icono" />
        </button>
        <nav className="mapa-dias" aria-label="Días">
          {dias.map((d) => (
            <button key={d} type="button" className={`etiqueta-dia${d === dia ? ' activa' : ''}`} aria-pressed={d === dia} onClick={() => onDia(d)}>
              Día {d}
            </button>
          ))}
        </nav>
      </header>

      <div className="mapa-abajo">
        {coordenadas && (
          <p className="mapa-cuenta">
            {ubicadas.length} de {paradas.length} lugares en el mapa
          </p>
        )}
        <ol ref={carrusel} className="mapa-carrusel" aria-label={`Paradas del día ${dia}`}>
          {paradas.map((parada, i) => {
            const numero = i + 1;
            const ubicada = ubicadas.some((u) => u.numero === numero);
            return (
              <li key={`${parada.franja.id}-${parada.actividad.lugar}`} data-numero={numero}>
                <article className={`mapa-tarjeta${activa === numero ? ' activa' : ''}${ubicada ? '' : ' sin-ubicar'}`}>
                  <button type="button" className="mapa-tarjeta-centrar" onClick={() => ubicada && setActiva(numero)} disabled={!ubicada} aria-label={ubicada ? `Ver ${parada.actividad.lugar} en el mapa` : undefined}>
                    <span className={`mapa-numero franja-${parada.franja.id}`}>{numero}</span>
                    <span className="mapa-tarjeta-texto">
                      <span className="mapa-franja">{parada.franja.nombre}</span>
                      <span className="mapa-lugar">{parada.actividad.lugar}</span>
                      {ubicada ? (
                        <span className="mapa-descripcion">{parada.actividad.descripcion}</span>
                      ) : (
                        <span className="mapa-sin-ubicar">
                          <MapPinOff className="icono icono-pequeno" aria-hidden="true" /> Sin ubicar en el mapa
                        </span>
                      )}
                    </span>
                  </button>
                  <button type="button" className="mapa-ver-postal" onClick={() => onAbrirPostal(parada)}>
                    Ver postal
                  </button>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
