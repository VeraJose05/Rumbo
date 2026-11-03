// RF-05, RF-12: vista provisional del itinerario (lista por días) para comprobar que el recorrido
// llega al planificador. La sustituirá el camino ilustrado del diseño.
import { BadgeCheck } from 'lucide-react';
import { FRANJAS, type Itinerario } from '../viaje/itinerario';
import type { Perfil } from '../viaje/perfil';

export function ItinerarioProvisional({ itinerario, perfil }: { itinerario: Itinerario; perfil: Perfil }) {
  return (
    <main className="pantalla">
      <p className="antetitulo">Tu itinerario</p>
      <h1 className="titulo-xl">{perfil.destino}</h1>
      {!itinerario.hayInformacion && <p className="nota">La guía no tiene información suficiente para planificar este viaje.</p>}
      {itinerario.dias.map((dia) => (
        <section key={dia.dia} className="tarjeta">
          <h2 className="subtitulo">Día {dia.dia}</h2>
          {FRANJAS.map((f) =>
            dia[f.id].map((a, i) => (
              <p key={`${f.id}-${i}`}>
                <strong>
                  {f.nombre} · {a.lugar}
                </strong>{' '}
                {a.verificacion === 'verificada' && (
                  <span className="verificado">
                    <BadgeCheck className="icono icono-pequeno" aria-hidden="true" /> Está en la guía
                  </span>
                )}
                <br />
                <span className="suave">{a.descripcion}</span>
              </p>
            )),
          )}
        </section>
      ))}
      {itinerario.interesesSinCobertura?.length ? (
        <p className="nota">La guía no cubre: {itinerario.interesesSinCobertura.join(', ')}. No los he incluido.</p>
      ) : null}
      <a className="boton boton-papel" href="#/">
        Nuevo viaje
      </a>
    </main>
  );
}
