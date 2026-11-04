// RF-12: «Viajes». Arriba, el viaje abierto aunque no esté guardado (así nunca hay que adivinar
// cuál es «mi viaje»); debajo, los guardados en el móvil (localStorage, sin cuentas).
import { ArrowRight, Bookmark, Trash } from 'lucide-react';
import type { Guardado, ViajeConId } from '../cuaderno/guardados';
import { DESTINOS_PORTADA } from '../datos/destinos';
import { resumenViaje } from '../viaje/postal';
import '../estilos/cuaderno-pantallas.css';

interface Props {
  guardados: Guardado[];
  /** El viaje abierto ahora (el último planificado o abierto), si lo hay. */
  actual: ViajeConId | null;
  onAbrir: (viaje: ViajeConId) => void;
  onGuardar: (viaje: ViajeConId) => void;
  onQuitar: (id: string) => void;
}

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

function TarjetaViaje({ viaje, detalle, onAbrir, accion }: { viaje: ViajeConId; detalle: React.ReactNode; onAbrir: () => void; accion: React.ReactNode }) {
  const foto = DESTINOS_PORTADA.find((d) => d.nombre === viaje.perfil.destino)?.foto;
  return (
    <li className="tarjeta viaje-guardado">
      <button type="button" className="viaje-guardado-abrir" onClick={onAbrir}>
        {foto && <img src={foto} alt="" loading="lazy" decoding="async" />}
        <span className="viaje-guardado-texto">
          <span className="viaje-guardado-destino">{viaje.perfil.destino}</span>
          <span className="suave">{resumenViaje(viaje.perfil)}</span>
          <span className="viaje-guardado-fecha">{detalle}</span>
        </span>
      </button>
      {accion}
    </li>
  );
}

export function MisViajes({ guardados, actual, onAbrir, onGuardar, onQuitar }: Props) {
  const actualSinGuardar = actual && !guardados.some((g) => g.viaje.id === actual.id) ? actual : null;
  return (
    <div className="pantalla cuaderno-pantalla">
      <header className="cuaderno-cabecera">
        <div>
          <p className="antetitulo">Guardados en tu móvil</p>
          <h1 className="subtitulo">Viajes</h1>
        </div>
      </header>

      {actualSinGuardar && (
        <section aria-labelledby="titulo-abierto">
          <h2 id="titulo-abierto" className="antetitulo">
            Abierto ahora · sin guardar
          </h2>
          <ul className="mis-viajes">
            <TarjetaViaje
              viaje={actualSinGuardar}
              detalle="Si planificas otro, este se perderá"
              onAbrir={() => onAbrir(actualSinGuardar)}
              accion={
                <button
                  type="button"
                  className="boton boton-redondo boton-papel viaje-guardado-quitar"
                  aria-label={`Guardar el viaje a ${actualSinGuardar.perfil.destino}`}
                  onClick={() => onGuardar(actualSinGuardar)}
                >
                  <Bookmark className="icono" />
                </button>
              }
            />
          </ul>
        </section>
      )}

      {guardados.length === 0 && !actualSinGuardar ? (
        <div className="nota" style={{ ['--giro' as string]: '-0.6deg' }}>
          <p>Aún no tienes viajes. Planea uno con el botón del centro y guárdalo para tenerlo aquí.</p>
          <a className="boton" href="#/">
            Nuevo viaje <ArrowRight className="icono" aria-hidden="true" />
          </a>
        </div>
      ) : (
        guardados.length > 0 && (
          <section aria-labelledby="titulo-guardados">
            <h2 id="titulo-guardados" className="antetitulo">
              Guardados
            </h2>
            <ul className="mis-viajes">
              {guardados.map(({ viaje, guardado }) => (
                <TarjetaViaje
                  key={viaje.id}
                  viaje={viaje}
                  detalle={viaje.id === actual?.id ? 'Abierto ahora' : `Guardado el ${fecha(guardado)}`}
                  onAbrir={() => onAbrir(viaje)}
                  accion={
                    <button
                      type="button"
                      className="boton boton-redondo boton-papel viaje-guardado-quitar"
                      aria-label={`Borrar el viaje a ${viaje.perfil.destino}`}
                      onClick={() => {
                        if (confirm(`¿Borrar el viaje a ${viaje.perfil.destino}?`)) onQuitar(viaje.id);
                      }}
                    >
                      <Trash className="icono" />
                    </button>
                  }
                />
              ))}
            </ul>
          </section>
        )
      )}
    </div>
  );
}
