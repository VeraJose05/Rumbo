// RF-01, RF-12: paso 2, gustos. Un mazo con las 8 cartas de intereses del planificador: se
// arrastran (derecha «¡Me va!», izquierda «Paso»), se decide con botones o flechas y se puede deshacer.
import { FerrisWheel, Frame, Heart, Landmark, MoonStar, ShoppingBag, Trees, Umbrella, Undo2, UtensilsCrossed, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { creditoFoto } from '../../datos/destinos';
import { INTERESES, decidirInteres, type IdInteres, type Interes, type Perfil } from '../../viaje/perfil';

export const ICONOS_INTERES: Record<IdInteres, LucideIcon> = {
  monumentos: Landmark,
  museos: Frame,
  gastronomia: UtensilsCrossed,
  naturaleza: Trees,
  'ocio-nocturno': MoonStar,
  compras: ShoppingBag,
  playa: Umbrella,
  ninos: FerrisWheel,
};

/** Distancia (px) que hay que arrastrar para decidir. */
const UMBRAL = 90;

interface Props {
  perfil: Perfil;
  onCambiar: (perfil: Perfil) => void;
}

export function PasoGustos({ perfil, onCambiar }: Props) {
  const [carta, setCarta] = useState(0);
  const [historial, setHistorial] = useState<{ carta: number; intereses: IdInteres[] }[]>([]);
  const [dx, setDx] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [saliendo, setSaliendo] = useState<boolean | null>(null); // true = «me va», false = «paso»
  const inicioX = useRef<number | null>(null);
  const terminado = carta >= INTERESES.length;

  const decidir = (meVa: boolean) => {
    const interes = INTERESES[carta];
    if (!interes || saliendo !== null) return;
    // La carta sale volando hacia su lado y, al terminar, se actualiza el perfil.
    setSaliendo(meVa);
    setTimeout(() => {
      setHistorial((h) => [...h, { carta, intereses: perfil.intereses }]);
      onCambiar(decidirInteres(perfil, interes.id, meVa));
      setCarta((c) => c + 1);
      setSaliendo(null);
      setDx(0);
    }, 230);
  };

  const deshacer = () => {
    const anterior = historial.at(-1);
    if (!anterior) return;
    setHistorial((h) => h.slice(0, -1));
    setCarta(anterior.carta);
    onCambiar({ ...perfil, intereses: anterior.intereses });
  };

  // Flechas del teclado para decidir la carta de arriba.
  const decidirRef = useRef(decidir);
  decidirRef.current = decidir;
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') decidirRef.current(true);
      if (e.key === 'ArrowLeft') decidirRef.current(false);
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, []);

  const arrastre = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      inicioX.current = e.clientX;
      e.currentTarget.setPointerCapture(e.pointerId);
      setArrastrando(true);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (inicioX.current !== null) setDx(e.clientX - inicioX.current);
    },
    onPointerUp: () => {
      inicioX.current = null;
      setArrastrando(false);
      if (Math.abs(dx) > UMBRAL) decidir(dx > 0);
      else setDx(0); // no ha llegado: vuelve a su sitio con un rebote
    },
  };

  const n = perfil.intereses.length;

  return (
    <section className="paso">
      <div className="gustos-cabecera">
        <h1 className="titulo">
          ¿Te va <span className="manuscrito acento">esto?</span>
        </h1>
        <span className="pegatina gustos-contador" aria-live="polite">
          {terminado ? 'Mazo completo' : `Carta ${carta + 1} de ${INTERESES.length}`}
        </span>
      </div>
      <p className="suave">Desliza a la derecha si te apetece y a la izquierda si pasas.</p>

      {terminado ? (
        <div className="mazo-fin tarjeta">
          <p className="manuscrito acento">¡Mazo terminado!</p>
          <p className="suave">
            {n
              ? `Te llevas ${n} ${n === 1 ? 'pegatina' : 'pegatinas'}. Puedes seguir o repasar las cartas.`
              : 'No te has quedado ninguna: repasa las cartas y elige al menos una.'}
          </p>
          <button
            className="boton boton-papel"
            type="button"
            onClick={() => {
              setCarta(0);
              setHistorial([]);
            }}
          >
            Repasar las cartas
          </button>
        </div>
      ) : (
        <div className="mazo" aria-live="polite">
          {/* Se pintan de abajo arriba para que la de encima quede la última en el DOM. */}
          {INTERESES.slice(carta, carta + 3)
            .map((interes, pos) => (
              <Carta
                key={interes.id}
                interes={interes}
                pos={pos}
                elegida={perfil.intereses.includes(interes.id)}
                dx={pos === 0 ? dx : 0}
                arrastrando={pos === 0 && arrastrando}
                saliendo={pos === 0 ? saliendo : null}
                arrastre={pos === 0 ? arrastre : undefined}
              />
            ))
            .reverse()}
        </div>
      )}

      <div className="mazo-botones">
        <button className="boton boton-redondo boton-papel" type="button" aria-label="Paso" disabled={terminado} onClick={() => decidir(false)}>
          <X className="icono" />
        </button>
        <button
          className="boton boton-redondo boton-papel mazo-deshacer"
          type="button"
          aria-label="Deshacer la última carta"
          disabled={!historial.length}
          onClick={deshacer}
        >
          <Undo2 className="icono" />
        </button>
        <button className="boton boton-redondo" type="button" aria-label="Me va" disabled={terminado} onClick={() => decidir(true)}>
          <Heart className="icono" />
        </button>
      </div>

      <div className="pegatinas-elegidas">
        <p className="antetitulo">Tus pegatinas</p>
        <ul className="pegatinas-lista">
          {n ? (
            perfil.intereses.map((id) => {
              const interes = INTERESES.find((i) => i.id === id)!;
              return (
                <li key={id}>
                  <button
                    className="pegatina pegatina-activa"
                    type="button"
                    aria-label={`Quitar ${interes.nombre}`}
                    onClick={() => onCambiar(decidirInteres(perfil, id, false))}
                  >
                    {interes.nombre} ✕
                  </button>
                </li>
              );
            })
          ) : (
            <li className="vacio">Aún ninguna: desliza a la derecha lo que te apetezca.</li>
          )}
        </ul>
      </div>
    </section>
  );
}

interface PropsCarta {
  interes: Interes;
  pos: number;
  elegida: boolean;
  dx: number;
  arrastrando: boolean;
  saliendo: boolean | null;
  arrastre?: Record<string, (e: React.PointerEvent<HTMLElement>) => void>;
}

function Carta({ interes, pos, elegida, dx, arrastrando, saliendo, arrastre }: PropsCarta) {
  const Icono = ICONOS_INTERES[interes.id];
  // Posición de la carta de arriba: siguiendo el dedo, saliendo volando o en su sitio.
  let transform: string | undefined;
  if (saliendo !== null) transform = `translateX(${saliendo ? 140 : -140}%) rotate(${saliendo ? 24 : -24}deg)`;
  else if (dx) transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
  const marca = (lado: number) => String(saliendo !== null ? Number(saliendo === lado > 0) : Math.max(0, Math.min(1, (lado * dx) / UMBRAL)));

  return (
    <article
      className={`carta${arrastrando ? ' arrastrando' : ''}`}
      data-pos={pos}
      aria-hidden={pos ? true : undefined}
      style={{ ['--color' as string]: interes.color, transform, opacity: saliendo !== null ? 0 : undefined }}
      {...arrastre}
    >
      <div className="carta-ilustracion">
        <img src={interes.foto} alt="" draggable={false} loading={pos > 1 ? 'lazy' : undefined} />
        <span className="carta-numero">
          {INTERESES.indexOf(interes) + 1}/{INTERESES.length}
        </span>
        {elegida && <span className="carta-elegida">✓ En tu lista</span>}
        <span className="carta-icono">
          <Icono aria-hidden="true" />
        </span>
        <a className="carta-credito" href={interes.credito.fuente} target="_blank" rel="noopener">
          {creditoFoto(interes.credito)}
        </a>
      </div>
      <div className="carta-texto">
        <h2 className="subtitulo">{interes.nombre}</h2>
        <p>{interes.descripcion}</p>
      </div>
      <span className="sello carta-marca meva" aria-hidden="true" style={{ opacity: marca(1) }}>
        ¡Me va!
      </span>
      <span className="sello carta-marca paso" aria-hidden="true" style={{ opacity: marca(-1) }}>
        Paso
      </span>
    </article>
  );
}
