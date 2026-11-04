// RF-01, RF-12: paso 1, destino (postales sobre la mesa) y días (un tren con un vagón por día).
import { Minus, Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { DESTINOS_PORTADA } from '../../datos/destinos';
import { DIAS_MAX, DIAS_MIN, cambiarDias, etiquetaDias, type Perfil } from '../../viaje/perfil';

const GIROS = ['-3deg', '2deg', '-1.5deg', '3deg', '-2.5deg'];
const COLORES_VAGON = ['var(--azul)', 'var(--azafran)', 'var(--olivo)'];

interface Props {
  perfil: Perfil;
  onCambiar: (perfil: Perfil) => void;
}

export function PasoDestino({ perfil, onCambiar }: Props) {
  const mesa = useRef<HTMLFieldSetElement>(null);
  const primeraVez = useRef(true);

  // Centra la postal elegida desplazando solo la mesa (scrollIntoView movía también la página).
  useEffect(() => {
    const elegida = mesa.current?.querySelector<HTMLElement>('input:checked')?.closest<HTMLElement>('.postal-opcion');
    if (!mesa.current || !elegida) return;
    mesa.current.scrollTo?.({
      left: elegida.offsetLeft - (mesa.current.clientWidth - elegida.offsetWidth) / 2,
      behavior: primeraVez.current ? 'auto' : 'smooth',
    });
    primeraVez.current = false;
  }, [perfil.destino]);

  return (
    <section className="paso">
      <h1 className="titulo">
        ¿Por dónde <span className="manuscrito acento">empezamos?</span>
      </h1>
      <p className="suave">Elige la ciudad que te llama hoy.</p>

      <fieldset ref={mesa} className="postales-mesa">
        <legend className="visualmente-oculto">Destino</legend>
        {DESTINOS_PORTADA.map((d, i) => (
          <label key={d.nombre} className="postal-opcion">
            <input
              type="radio"
              name="destino"
              value={d.nombre}
              checked={perfil.destino === d.nombre}
              onChange={() => onCambiar({ ...perfil, destino: d.nombre })}
            />
            <figure className="postal" style={{ ['--giro' as string]: GIROS[i], margin: 0 }}>
              <img src={d.foto} alt="" loading="lazy" />
              <figcaption>
                <p className="postal-pie">{d.nombre}</p>
                <p className="postal-pista">{d.pista}</p>
              </figcaption>
            </figure>
            <span className="sello" aria-hidden="true">
              ¡Esta!
            </span>
          </label>
        ))}
      </fieldset>

      <div className="tarjeta dias">
        <div className="dias-cabecera">
          <h2 className="subtitulo">¿Cuántos días?</h2>
          <span className="pegatina dias-etiqueta">{etiquetaDias(perfil.dias)}</span>
        </div>
        {/* Cada vagón tiene su key: React solo monta los nuevos, que son los que se animan al engancharse. */}
        <div className="tren" aria-hidden="true">
          <Locomotora />
          {Array.from({ length: perfil.dias }, (_, i) => (
            <Vagon key={i} color={COLORES_VAGON[i % 3]!} />
          ))}
        </div>
        <div className="dias-control">
          <button
            className="boton boton-redondo boton-papel"
            type="button"
            aria-label="Un día menos"
            disabled={perfil.dias <= DIAS_MIN}
            onClick={() => onCambiar(cambiarDias(perfil, -1))}
          >
            <Minus className="icono" />
          </button>
          <p className="dias-numero" aria-live="polite">
            <span>{perfil.dias}</span> {perfil.dias === 1 ? 'día' : 'días'}
          </p>
          <button
            className="boton boton-redondo"
            type="button"
            aria-label="Un día más"
            disabled={perfil.dias >= DIAS_MAX}
            onClick={() => onCambiar(cambiarDias(perfil, 1))}
          >
            <Plus className="icono" />
          </button>
        </div>
      </div>
    </section>
  );
}

function Locomotora() {
  return (
    <svg viewBox="0 0 56 40">
      <rect x="4" y="10" width="34" height="20" rx="4" fill="var(--terracota)" />
      <rect x="30" y="2" width="20" height="28" rx="4" fill="var(--terracota-profunda)" />
      <rect x="34" y="7" width="12" height="9" rx="2" fill="var(--crema)" />
      <rect x="10" y="2" width="7" height="10" rx="2" fill="var(--tinta)" />
      <circle cx="14" cy="33" r="5" fill="var(--tinta)" />
      <circle cx="40" cy="33" r="5" fill="var(--tinta)" />
    </svg>
  );
}

function Vagon({ color }: { color: string }) {
  return (
    <svg className="vagon" viewBox="0 0 40 40">
      <rect x="2" y="8" width="36" height="22" rx="4" fill={color} />
      <rect x="7" y="12" width="10" height="8" rx="2" fill="var(--crema)" />
      <rect x="23" y="12" width="10" height="8" rx="2" fill="var(--crema)" />
      <circle cx="11" cy="33" r="4.5" fill="var(--tinta)" />
      <circle cx="29" cy="33" r="4.5" fill="var(--tinta)" />
    </svg>
  );
}
