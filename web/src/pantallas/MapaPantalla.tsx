// RF-14: el día en un mapa a pantalla completa. Arriba, los días y la vuelta al camino; abajo, un
// carrusel con las paradas. Tocar una tarjeta lleva el mapa a su chincheta y tocar una chincheta
// trae su tarjeta. Las paradas sin ubicar también salen en el carrusel, marcadas como tales.
import { ArrowLeft, Navigation, Route } from 'lucide-react';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { urlComoLlegar, urlRutaDelDia, type CoordenadasDestino } from '../viaje/mapa';
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
        {paradas.length > 0 && (
          <a className="mapa-ruta" href={urlRutaDelDia(paradas.map((p) => p.actividad.lugar), destino)} target="_blank" rel="noopener">
            <Route className="icono" aria-hidden="true" /> Ruta del día en Google Maps
          </a>
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
                        <span className="mapa-sin-ubicar">No está en este mapa: ábrelo en Google Maps</span>
                      )}
                    </span>
                  </button>
                  <div className="mapa-acciones">
                    <button type="button" className="mapa-ver-postal" onClick={() => onAbrirPostal(parada)}>
                      Ver postal
                    </button>
                    <a className="mapa-como-llegar" href={urlComoLlegar(parada.actividad.lugar, destino)} target="_blank" rel="noopener">
                      <Navigation className="icono icono-pequeno" aria-hidden="true" /> Cómo llegar
                    </a>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
