// RF-12: «Mis viajes». Los itinerarios guardados en el móvil (localStorage), sin cuentas: se abren
// para seguir ajustándolos o se borran.
import { ArrowRight, Trash } from 'lucide-react';
import type { Guardado, ViajeConId } from '../cuaderno/guardados';
import { DESTINOS_PORTADA } from '../datos/destinos';
import { resumenViaje } from '../viaje/postal';
import '../estilos/cuaderno-pantallas.css';

interface Props {
  guardados: Guardado[];
  onAbrir: (viaje: ViajeConId) => void;
  onQuitar: (id: string) => void;
}

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

export function MisViajes({ guardados, onAbrir, onQuitar }: Props) {
  return (
    <div className="pantalla cuaderno-pantalla">
      <header className="cuaderno-cabecera">
        <div>
          <p className="antetitulo">Guardados en tu móvil</p>
          <h1 className="subtitulo">Mis viajes</h1>
        </div>
      </header>

      {guardados.length === 0 ? (
        <div className="nota" style={{ ['--giro' as string]: '-0.6deg' }}>
          <p>Aún no has guardado ningún viaje. Cuando tengas un itinerario, pulsa el marcapáginas para guardarlo aquí.</p>
          <a className="boton" href="#/">
            Planear un viaje <ArrowRight className="icono" aria-hidden="true" />
          </a>
        </div>
      ) : (
        <ul className="mis-viajes">
          {guardados.map(({ viaje, guardado }) => {
            const foto = DESTINOS_PORTADA.find((d) => d.nombre === viaje.perfil.destino)?.foto;
            return (
              <li key={viaje.id} className="tarjeta viaje-guardado">
                <button type="button" className="viaje-guardado-abrir" onClick={() => onAbrir(viaje)}>
                  {foto && <img src={foto} alt="" loading="lazy" decoding="async" />}
                  <span className="viaje-guardado-texto">
                    <span className="viaje-guardado-destino">{viaje.perfil.destino}</span>
                    <span className="suave">{resumenViaje(viaje.perfil)}</span>
                    <span className="viaje-guardado-fecha">Guardado el {fecha(guardado)}</span>
                  </span>
                </button>
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
