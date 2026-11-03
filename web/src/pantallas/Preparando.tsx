// RF-05, RF-12: mientras el planificador trabaja, un panel de salidas de estación. Es honesto: no
// inventa un progreso por días (la API responde de una vez); muestra el tiempo real que lleva.
import { ArrowLeft, Clock, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Itinerario } from '../viaje/itinerario';
import type { Perfil } from '../viaje/perfil';
import { PlanificarError, planificar, type ErrorPlanificar } from '../viaje/planificar';
import '../estilos/preparando.css';

const CONSEJOS = [
  'Cada lugar de tu plan sale de la guía y lleva su fuente.',
  'Si la guía no habla de alguno de tus gustos, te lo diré en vez de inventármelo.',
  'Cuando esté listo, podrás ajustarlo: «más tranquilo», «quita la Catedral»…',
];

// En desarrollo, React monta dos veces los componentes para detectar fallos (StrictMode). Para no
// pedir dos itinerarios (y gastar cuota), la petición en curso se reutiliza si el perfil es el mismo.
let enCurso: { clave: string; promesa: Promise<Itinerario> } | null = null;
function planificarUnaVez(perfil: Perfil) {
  const clave = JSON.stringify(perfil);
  if (enCurso?.clave !== clave) {
    enCurso = { clave, promesa: planificar(perfil) };
    enCurso.promesa.catch(() => (enCurso = null));
  }
  return enCurso.promesa;
}

interface Props {
  perfil: Perfil;
  onListo: (itinerario: Itinerario) => void;
  onVolver: () => void;
}

export function Preparando({ perfil, onListo, onVolver }: Props) {
  const [segundos, setSegundos] = useState(0);
  const [consejo, setConsejo] = useState(0);
  const [error, setError] = useState<ErrorPlanificar | null>(null);
  const [intento, setIntento] = useState(0);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vigente = true;
    setError(null);
    planificarUnaVez(perfil)
      .then((itinerario) => {
        if (!vigente) return;
        enCurso = null;
        setListo(true);
        setTimeout(() => onListo(itinerario), 700); // un instante para ver «LISTO» en el panel
      })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof PlanificarError ? e.detalle : { cuota: false, mensaje: String(e) });
      });
    return () => {
      vigente = false;
    };
  }, [perfil, intento, onListo]);

  useEffect(() => {
    if (error || listo) return;
    const reloj = setInterval(() => setSegundos((s) => s + 1), 1000);
    const rotar = setInterval(() => setConsejo((c) => (c + 1) % CONSEJOS.length), 4500);
    return () => {
      clearInterval(reloj);
      clearInterval(rotar);
    };
  }, [error, listo]);

  const estado = error ? 'EN PAUSA' : listo ? 'LISTO' : 'EN CAMINO';

  return (
    <div className="pantalla preparando">
      <header className="viaje-cabecera">
        <button className="boton boton-redondo boton-papel viaje-atras" type="button" onClick={onVolver} aria-label="Volver al billete">
          <ArrowLeft className="icono" />
        </button>
        <div>
          <p className="antetitulo">Cuaderno de ruta</p>
          <p className="viaje-paso">Preparando tu viaje</p>
        </div>
      </header>

      <h1 className="titulo">
        Leyendo la guía de <span className="manuscrito acento">{perfil.destino}…</span>
      </h1>

      <div className="panel-salidas" role="status" aria-live="polite" aria-label={`${perfil.destino}: ${estado.toLowerCase()}`}>
        <div className="panel-cabecera">
          <span>Destino</span>
          <span>Día</span>
          <span>Estado</span>
        </div>
        {Array.from({ length: perfil.dias }, (_, i) => (
          <div key={i} className="panel-fila">
            <Letras texto={(perfil.destino ?? '').toUpperCase().slice(0, 9)} girando={!listo && !error} retraso={i} />
            <span className="panel-dia">{String(i + 1).padStart(2, '0')}</span>
            <span className={`panel-estado${listo ? ' listo' : ''}`}>{estado}</span>
          </div>
        ))}
        <p className="panel-pie">
          <Clock className="icono icono-pequeno" aria-hidden="true" /> {segundos} s
        </p>
      </div>

      {error ? (
        <div className="nota aviso-preparando" style={{ ['--giro' as string]: '-1deg' }}>
          <span className="washi" />
          <p className="manuscrito">{error.cuota ? 'Volvemos enseguida' : 'Algo ha fallado'}</p>
          <p>{error.mensaje}</p>
          <button className="boton" type="button" onClick={() => setIntento((n) => n + 1)}>
            <RotateCcw className="icono" aria-hidden="true" /> Reintentar
          </button>
        </div>
      ) : (
        <div className="nota" style={{ ['--giro' as string]: '1deg' }}>
          <span className="washi" />
          <p key={consejo} className="aparece">
            {CONSEJOS[consejo]}
          </p>
        </div>
      )}
    </div>
  );
}

/** Letras del panel: mientras se prepara, la última va girando (cada fila con un desfase). */
function Letras({ texto, girando, retraso }: { texto: string; girando: boolean; retraso: number }) {
  return (
    <span className="panel-letras" aria-hidden="true">
      {[...texto].map((letra, i) => (
        <span
          key={i}
          className={`panel-letra${girando && i === texto.length - 1 ? ' girando' : ''}`}
          style={{ animationDelay: `${retraso * 0.07}s` }}
        >
          {letra}
        </span>
      ))}
    </span>
  );
}
