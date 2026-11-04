// RF-05, RF-06, RF-11, RF-12: el itinerario como un camino por días, con una parada por actividad
// (mañana, tarde y noche) al estilo de los niveles de un juego. Cada parada abre su postal con la
// cita de la guía, y la barra de abajo ajusta el plan por mensaje.
import { ArrowRight, BookOpen, Flag, Hand, Moon, PartyPopper, Send, Sun, Sunrise, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { DESTINOS_PORTADA } from '../datos/destinos';
import { ajustar, type Viaje } from '../viaje/ajustar';
import { FRANJAS, type Actividad } from '../viaje/itinerario';
import { INTERESES } from '../viaje/perfil';
import { PlanificarError } from '../viaje/planificar';
import { etiquetaVerificacion, resumenViaje } from '../viaje/postal';
import type { Visita } from '../cuaderno/pasaporte';
import { PostalLugar } from './PostalLugar';
import '../estilos/itinerario.css';

const ICONO_FRANJA: Record<(typeof FRANJAS)[number]['id'], LucideIcon> = { manana: Sunrise, tarde: Sun, noche: Moon };
const SUGERENCIAS = ['Más tranquilo', 'Más intenso', 'Un día más', 'Añade museos'];

export interface Parada {
  actividad: Actividad;
  franja: (typeof FRANJAS)[number];
  dia: number;
}

interface Props {
  viaje: Viaje;
  onCambiar: (viaje: Viaje) => void;
  /** Botones extra de la cabecera (guardar, exportar…). */
  acciones?: React.ReactNode;
  /** Qué hacer al acabar el último día (guardar, pasaporte, otro viaje). */
  final?: React.ReactNode;
  /** Check-ins del pasaporte, para marcar los lugares visitados. */
  visitas?: Visita[];
  onCheckIn?: (visita: Visita) => void;
}

const CLAVE_AYUDA = 'rumbo-ayuda-itinerario';

function useAyuda(): [boolean, () => void] {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_AYUDA) !== 'vista';
    } catch {
      return true;
    }
  });
  const cerrar = () => {
    setVisible(false);
    try {
      localStorage.setItem(CLAVE_AYUDA, 'vista');
    } catch {
      // Sin almacenamiento: volverá a salir la próxima vez.
    }
  };
  return [visible, cerrar];
}

export function Itinerario({ viaje, onCambiar, acciones, final, visitas = [], onCheckIn }: Props) {
  const { perfil, itinerario } = viaje;
  const [dia, setDia] = useState(1);
  const [abierta, setAbierta] = useState<Parada | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [ajustando, setAjustando] = useState(false);
  const [respuesta, setRespuesta] = useState<{ texto: string; error?: boolean } | null>(null);
  const [ayuda, cerrarAyuda] = useAyuda();
  const foto = DESTINOS_PORTADA.find((d) => d.nombre === perfil.destino)?.foto;
  const diaActual = itinerario.dias.find((d) => d.dia === dia) ?? itinerario.dias[0];
  const paradas: Parada[] = diaActual
    ? FRANJAS.flatMap((franja) => diaActual[franja.id].map((actividad) => ({ actividad, franja, dia: diaActual.dia })))
    : [];
  const visitado = (lugar: string) => visitas.some((v) => v.destino === perfil.destino && v.lugar === lugar);
  const sinCobertura = (itinerario.interesesSinCobertura ?? []).map((id) => INTERESES.find((i) => i.id === id)?.nombre ?? id);

  const pedirAjuste = async (texto: string) => {
    if (!texto.trim() || ajustando) return;
    setAjustando(true);
    setRespuesta(null);
    setAbierta(null);
    try {
      const resultado = await ajustar(viaje, texto);
      onCambiar(resultado.viaje);
      setRespuesta({ texto: resultado.respuesta });
      setMensaje('');
      // Si el viaje ha perdido días, que no se quede en uno que ya no existe.
      if (!resultado.viaje.itinerario.dias.some((d) => d.dia === dia)) setDia(1);
    } catch (e) {
      setRespuesta({ texto: e instanceof PlanificarError ? e.message : 'No he podido ajustar el plan.', error: true });
    } finally {
      setAjustando(false);
    }
  };

  return (
    <div className="itinerario">
      <header className="itinerario-cabecera" style={foto ? { backgroundImage: `url(${foto})` } : undefined}>
        <div className="itinerario-cabecera-velo">
          <div className="itinerario-barra">
            <a className="inicio-marca" href="#/" aria-label="Rumbo, inicio">
              <img src="/marca/simbolo.svg" alt="" width={30} height={30} />
              <span>rumbo</span>
            </a>
            <div className="itinerario-acciones">{acciones}</div>
          </div>
          <p className="antetitulo itinerario-ante">Tu cuaderno de viaje</p>
          <h1 className="titulo-xl">{perfil.destino}</h1>
          <p className="itinerario-resumen">{resumenViaje(perfil)}</p>
        </div>
      </header>

      <main className="pantalla itinerario-cuerpo">
        {!itinerario.hayInformacion ? (
          <div className="nota">
            <p>La guía no tiene información suficiente para planificar este viaje: prefiero no inventármelo.</p>
          </div>
        ) : (
          <>
            <nav className="etiquetas-dias" aria-label="Días">
              {itinerario.dias.map((d) => (
                <button key={d.dia} type="button" className={`etiqueta-dia${d.dia === dia ? ' activa' : ''}`} aria-pressed={d.dia === dia} onClick={() => setDia(d.dia)}>
                  Día {d.dia}
                </button>
              ))}
            </nav>

            {ayuda && (
              <div className="nota ayuda-itinerario" role="note" style={{ ['--giro' as string]: '-0.5deg' }}>
                <Hand className="icono" aria-hidden="true" />
                <p>
                  <strong>Toca una parada</strong> para ver qué dice la guía y marcarla con «¡Estuve aquí!». Abajo puedes pedirme
                  cambios, y con <strong>Guardar</strong> lo tendrás en Mis viajes.
                </p>
                <button type="button" className="respuesta-cerrar" aria-label="Entendido, cerrar la ayuda" onClick={cerrarAyuda}>
                  <X className="icono icono-pequeno" />
                </button>
              </div>
            )}

            <ol className={`camino${ajustando ? ' ajustando' : ''}`} aria-label={`Día ${dia}`} aria-busy={ajustando}>
              <li className="camino-salida">
                <span className="sello" style={{ ['--tam' as string]: '74px', ['--giro' as string]: '-8deg' }}>
                  Día {dia}
                </span>
              </li>
              {paradas.map((p, i) => (
                <ParadaCamino
                  key={`${p.franja.id}-${p.actividad.lugar}`}
                  parada={p}
                  lado={i % 2 ? 'derecha' : 'izquierda'}
                  visitado={visitado(p.actividad.lugar)}
                  onAbrir={() => setAbierta(p)}
                />
              ))}
              <li className="camino-meta">
                <Flag className="icono" aria-hidden="true" />
                <span>Fin del día {dia}</span>
                {itinerario.dias.some((d) => d.dia === dia + 1) && (
                  <button className="boton boton-papel" type="button" onClick={() => setDia(dia + 1)}>
                    Día {dia + 1} <ArrowRight className="icono" aria-hidden="true" />
                  </button>
                )}
              </li>
            </ol>

            {final && !itinerario.dias.some((d) => d.dia === dia + 1) && (
              <section className="tarjeta fin-viaje aparece" aria-labelledby="fin-viaje-titulo">
                <PartyPopper className="icono fin-viaje-icono" aria-hidden="true" />
                <h2 id="fin-viaje-titulo" className="subtitulo">
                  ¡Ruta completa!
                </h2>
                <p className="suave">
                  {itinerario.dias.length} {itinerario.dias.length === 1 ? 'día' : 'días'} por {perfil.destino}. ¿Y ahora?
                </p>
                <div className="fin-viaje-acciones">{final}</div>
              </section>
            )}

            {sinCobertura.length > 0 && (
              <div className="nota aviso-cobertura" style={{ ['--giro' as string]: '-0.6deg' }}>
                <TriangleAlert className="icono" aria-hidden="true" />
                <p>
                  La guía no cubre <strong>{sinCobertura.join(', ').toLowerCase()}</strong> en {perfil.destino}, así que no lo he incluido.
                </p>
              </div>
            )}

            <section className="fuentes">
              <h2 className="antetitulo">
                <BookOpen className="icono icono-pequeno" aria-hidden="true" /> Fuentes de este plan
              </h2>
              <ul>
                {itinerario.fuentes.map((f) => (
                  <li key={f.cita}>
                    [{f.cita}] {f.seccion} ·{' '}
                    <a href={f.url} target="_blank" rel="noopener">
                      {f.fuente}
                    </a>{' '}
                    ({f.licencia})
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>

      {itinerario.hayInformacion && (
        <form
          className="barra-ajuste"
          onSubmit={(e) => {
            e.preventDefault();
            void pedirAjuste(mensaje);
          }}
        >
          {respuesta && (
            <div className={`nota respuesta-rumbo${respuesta.error ? ' error' : ''}`} role="status">
              <span className="washi" />
              <p className="manuscrito">{respuesta.error ? 'Vaya…' : 'Hecho'}</p>
              <p>{respuesta.texto}</p>
              <button type="button" className="respuesta-cerrar" aria-label="Cerrar" onClick={() => setRespuesta(null)}>
                ✕
              </button>
            </div>
          )}
          <div className="ajuste-sugerencias">
            {SUGERENCIAS.map((s) => (
              <button key={s} type="button" className="pegatina" disabled={ajustando} onClick={() => void pedirAjuste(s)}>
                {s}
              </button>
            ))}
          </div>
          <div className="ajuste-campo">
            <input
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder={ajustando ? 'Ajustando tu plan…' : 'Ajusta tu plan: «quita la Catedral»…'}
              aria-label="Ajusta tu plan"
              disabled={ajustando}
            />
            <button className="boton boton-redondo" type="submit" aria-label="Ajustar" disabled={ajustando || !mensaje.trim()}>
              <Send className="icono" />
            </button>
          </div>
        </form>
      )}

      {abierta && (
        <PostalLugar
          parada={abierta}
          itinerario={itinerario}
          onCerrar={() => setAbierta(null)}
          onQuitar={() => void pedirAjuste(`quita ${abierta.actividad.lugar}`)}
          visitado={visitado(abierta.actividad.lugar)}
          onCheckIn={(seccion) =>
            onCheckIn?.({ destino: perfil.destino!, lugar: abierta.actividad.lugar, seccion, fecha: new Date().toISOString().slice(0, 10) })
          }
        />
      )}
    </div>
  );
}

interface PropsParada {
  parada: Parada;
  lado: 'izquierda' | 'derecha';
  visitado: boolean;
  onAbrir: () => void;
}

function ParadaCamino({ parada, lado, visitado, onAbrir }: PropsParada) {
  const Icono = ICONO_FRANJA[parada.franja.id];
  const etiqueta = etiquetaVerificacion(parada.actividad.verificacion);
  return (
    <li className={`parada ${lado}`}>
      <span className={`parada-hito franja-${parada.franja.id}`} aria-hidden="true">
        <Icono />
      </span>
      <button type="button" className="parada-postal" onClick={onAbrir}>
        <span className="washi" />
        <span className="parada-franja">{parada.franja.nombre}</span>
        <span className="parada-lugar">{parada.actividad.lugar}</span>
        <span className="parada-descripcion">{parada.actividad.descripcion}</span>
        {etiqueta && <span className={etiqueta.tipo === 'guia' ? 'verificado' : 'sin-fuente'}>{etiqueta.tipo === 'guia' ? `✓ ${etiqueta.texto}` : etiqueta.texto}</span>}
        {visitado && (
          <span className="sello parada-visitada" aria-label="Visitado">
            ¡Visitado!
          </span>
        )}
      </button>
    </li>
  );
}
