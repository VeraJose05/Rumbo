// RF-02, RF-04, RF-12: charla con Rumbo como una libreta. La entrevista completa el perfil
// conversando (y contesta preguntas con la guía); al terminar, se prepara el viaje como en el
// recorrido. La conversación se guarda en la sesión.
import { ArrowLeft, PencilLine, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { hablar, trozosDeTexto, type EstadoEntrevista } from '../chat/chat';
import { avisoPrivacidad, useProveedores } from '../datos/privacidad';
import type { Perfil } from '../viaje/perfil';
import { PlanificarError } from '../viaje/planificar';
import '../estilos/chat.css';

interface Mensaje {
  rol: 'rumbo' | 'viajero';
  texto: string;
  error?: boolean;
}

interface Conversacion {
  estado: EstadoEntrevista | null;
  mensajes: Mensaje[];
}

const CLAVE = 'rumbo-chat';
const SUGERENCIAS = ['4 días en Sevilla con mi pareja', 'Un fin de semana en Granada', 'Barcelona con niños, sin gastar mucho'];

function leer(): Conversacion {
  try {
    const guardada = JSON.parse(sessionStorage.getItem(CLAVE) ?? 'null') as Conversacion | null;
    if (guardada?.mensajes.length) return guardada;
  } catch {
    // Sin almacenamiento: se empieza de cero.
  }
  return { estado: null, mensajes: [] };
}

export function Chat({ onPerfil }: { onPerfil: (perfil: Perfil) => void }) {
  const [conversacion, setConversacion] = useState(leer);
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [pendiente, setPendiente] = useState<string | null>(null); // último mensaje, para «Reintentar»
  const final = useRef<HTMLDivElement>(null);
  const proveedores = useProveedores();

  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(conversacion));
    } catch {
      // Sin almacenamiento: la conversación vive en memoria.
    }
    final.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [conversacion]);

  const enviar = async (mensaje: string, estado: EstadoEntrevista | null, conVistaPrevia = true) => {
    setOcupado(true);
    setPendiente(null);
    if (conVistaPrevia && mensaje.trim()) {
      setConversacion((c) => ({ ...c, mensajes: [...c.mensajes, { rol: 'viajero', texto: mensaje.trim() }] }));
    }
    try {
      const turno = await hablar(estado, mensaje);
      setConversacion((c) => ({ estado: turno.estado, mensajes: [...c.mensajes, { rol: 'rumbo', texto: turno.respuesta }] }));
      // Con el perfil completo, a preparar el viaje (un instante para leer la respuesta).
      if (turno.perfil) setTimeout(() => onPerfil(turno.perfil!), 1400);
    } catch (e) {
      setPendiente(mensaje);
      const aviso = e instanceof PlanificarError ? e.message : 'No he podido contestar.';
      setConversacion((c) => ({ ...c, mensajes: [...c.mensajes, { rol: 'rumbo', texto: aviso, error: true }] }));
    } finally {
      setOcupado(false);
    }
  };

  // Al abrir una libreta nueva, Rumbo saluda.
  const saludado = useRef(false);
  useEffect(() => {
    if (saludado.current || conversacion.mensajes.length) return;
    saludado.current = true;
    void enviar('', null, false);
  }, []);

  const mandar = (mensaje: string) => {
    if (!mensaje.trim() || ocupado) return;
    setTexto('');
    void enviar(mensaje, conversacion.estado);
  };

  const empezarDeNuevo = () => {
    saludado.current = true;
    setConversacion({ estado: null, mensajes: [] });
    void enviar('', null, false);
  };

  const soloSaludo = conversacion.mensajes.length === 1 && conversacion.mensajes[0]!.rol === 'rumbo';

  return (
    <div className="chat">
      <header className="chat-cabecera">
        <a className="boton boton-redondo boton-papel viaje-atras" href="#/" aria-label="Volver a la portada">
          <ArrowLeft className="icono" />
        </a>
        <div>
          <p className="antetitulo">Libreta de viaje</p>
          <h1 className="subtitulo">Charla con Rumbo</h1>
        </div>
        <button className="boton boton-redondo boton-papel chat-reiniciar" type="button" onClick={empezarDeNuevo} aria-label="Empezar de nuevo" disabled={ocupado}>
          <RotateCcw className="icono" />
        </button>
      </header>

      <main className="libreta" aria-live="polite">
        {conversacion.mensajes.map((m, i) => (
          <div key={i} className={`apunte ${m.rol}${m.error ? ' error' : ''}`}>
            {m.rol === 'rumbo' && <img className="apunte-avatar" src="/marca/simbolo.svg" alt="Rumbo" width={30} height={30} />}
            <p>
              {trozosDeTexto(m.texto).map((t, j) =>
                t.tipo === 'enlace' ? (
                  <a key={j} href={t.url} target="_blank" rel="noopener">
                    {t.texto}
                  </a>
                ) : (
                  <span key={j}>{t.texto}</span>
                ),
              )}
            </p>
            {m.error && pendiente !== null && i === conversacion.mensajes.length - 1 && (
              <button className="boton boton-papel" type="button" onClick={() => void enviar(pendiente, conversacion.estado, false)}>
                <RotateCcw className="icono" aria-hidden="true" /> Reintentar
              </button>
            )}
          </div>
        ))}
        {ocupado && (
          <div className="apunte rumbo escribiendo" aria-label="Rumbo está escribiendo">
            <img className="apunte-avatar" src="/marca/simbolo.svg" alt="" width={30} height={30} />
            <p>
              <span />
              <span />
              <span />
            </p>
          </div>
        )}
        {soloSaludo && !ocupado && (
          <div className="chat-sugerencias">
            {SUGERENCIAS.map((s) => (
              <button key={s} type="button" className="pegatina" onClick={() => mandar(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={final} />
      </main>

      <form
        className="chat-compositor"
        onSubmit={(e) => {
          e.preventDefault();
          mandar(texto);
        }}
      >
        <div className="ajuste-campo">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe en la libreta…" aria-label="Tu mensaje" disabled={ocupado} />
          <button className="boton boton-redondo" type="submit" aria-label="Enviar" disabled={ocupado || !texto.trim()}>
            <PencilLine className="icono" />
          </button>
        </div>
        {proveedores && <p className="chat-privacidad">{avisoPrivacidad(proveedores)}</p>}
      </form>
    </div>
  );
}
