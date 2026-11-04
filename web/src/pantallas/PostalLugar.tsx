// RF-06, RF-12: postal de un lugar del itinerario: qué hacer, la línea literal de la guía de donde
// sale (con su fuente y licencia) y la opción de quitarlo del plan.
import { Check, Stamp, Trash, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Itinerario as TipoItinerario } from '../viaje/itinerario';
import { citaDeLugar, etiquetaVerificacion, recortarCita } from '../viaje/postal';
import type { Parada } from './Itinerario';

interface Props {
  parada: Parada;
  itinerario: TipoItinerario;
  onCerrar: () => void;
  onQuitar: () => void;
  /** Ya tiene check-in en el pasaporte. */
  visitado: boolean;
  /** «¡Estuve aquí!»: se guarda con la sección de la guía (para las insignias). */
  onCheckIn: (seccion: string) => void;
}

export function PostalLugar({ parada, itinerario, onCerrar, onQuitar, visitado, onCheckIn }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const { actividad } = parada;
  const cita = citaDeLugar(actividad, itinerario.recuperados ?? [], itinerario.fuentes);
  const etiqueta = etiquetaVerificacion(actividad.verificacion);

  // <dialog> nativo: atrapa el foco, se cierra con Escape y oscurece el fondo.
  useEffect(() => {
    dialogo.current?.showModal?.();
  }, []);

  return (
    <dialog
      ref={dialogo}
      className="postal-lugar"
      aria-labelledby="postal-titulo"
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === dialogo.current) onCerrar(); // clic fuera de la postal
      }}
    >
      <div className="postal-lugar-papel">
        <button type="button" className="postal-cerrar" aria-label="Cerrar" onClick={onCerrar}>
          <X className="icono" />
        </button>
        <p className="antetitulo">
          Día {parada.dia} · {parada.franja.nombre}
        </p>
        <div className="postal-lugar-cabecera">
          <h2 id="postal-titulo" className="titulo">
            {actividad.lugar}
          </h2>
          {/* Al lado del título, no encima: el sello no tapa nada. */}
          {visitado && (
            <span className="sello sello-visitado" aria-hidden="true">
              <Check className="icono" />
              visitado
            </span>
          )}
        </div>
        {etiqueta && <span className={etiqueta.tipo === 'guia' ? 'verificado' : 'sin-fuente'}>{etiqueta.tipo === 'guia' ? `✓ ${etiqueta.texto}` : etiqueta.texto}</span>}
        <p className="postal-que-hacer">{actividad.descripcion}</p>

        {cita ? (
          <blockquote className="postal-cita">
            {/* El planificador no lo dio por verificado (nombre distinto), pero la guía habla de algo parecido. */}
            {etiqueta?.tipo === 'sin-fuente' && <p className="postal-parecido">La guía habla de algo parecido:</p>}
            <p>«{recortarCita(cita.texto, 280)}»</p>
            <footer>
              <a href={cita.url} target="_blank" rel="noopener">
                Wikivoyage
              </a>{' '}
              · {cita.seccion} · {cita.licencia}
            </footer>
          </blockquote>
        ) : (
          <p className="postal-sin-cita">
            {etiqueta?.tipo === 'sin-fuente'
              ? 'La guía no menciona este lugar: es una sugerencia sin fuente, compruébalo antes de ir.'
              : 'No he encontrado la línea exacta de la guía para este lugar.'}
          </p>
        )}

        <div className="postal-botones">
          <button type="button" className="boton" onClick={() => onCheckIn(cita?.seccion ?? 'Otro')} disabled={visitado}>
            <Stamp className="icono" aria-hidden="true" /> {visitado ? 'Sellado' : '¡Estuve aquí!'}
          </button>
          <button type="button" className="boton boton-papel" onClick={onQuitar}>
            <Trash className="icono" aria-hidden="true" /> Quitar
          </button>
        </div>
      </div>
    </dialog>
  );
}
