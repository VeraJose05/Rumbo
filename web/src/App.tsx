// RF-12: web de Rumbo. Elige la pantalla según la ruta del hash y guarda el perfil del viaje.
import { Bookmark, BookmarkCheck, Compass, Stamp } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { useGuardados, usePasaporte } from './cuaderno/almacen';
import { estaGuardado, guardarViaje, quitarViaje, type ViajeConId } from './cuaderno/guardados';
import { hacerCheckIn } from './cuaderno/pasaporte';
import { Chat } from './pantallas/Chat';
import { Itinerario } from './pantallas/Itinerario';
import { Legal } from './pantallas/Legal';
import { MisViajes } from './pantallas/MisViajes';
import { Pasaporte } from './pantallas/Pasaporte';
import { PANTALLAS_CON_PESTANAS, Pestanas } from './pantallas/Pestanas';
import { Portada } from './pantallas/Portada';
import { Preparando } from './pantallas/Preparando';
import { Viaje } from './pantallas/Viaje';
import { rutaPaso, useRuta } from './ruta';
import type { Viaje as TipoViaje } from './viaje/ajustar';
import type { Itinerario as TipoItinerario } from './viaje/itinerario';
import { pasoPendiente } from './viaje/pasos';
import { perfilInicial } from './viaje/perfil';
import { usePerfil, useViaje } from './viaje/usePerfil';

export function App() {
  const [ruta, navegar] = useRuta();
  const [perfil, setPerfil] = usePerfil();
  const [viaje, setViaje] = useViaje();
  const [guardados, cambiarGuardados] = useGuardados();
  const [visitas, cambiarVisitas] = usePasaporte();
  const ahora = () => new Date().toISOString();

  // Sin un perfil completo no se puede preparar el viaje, y sin itinerario no hay nada que enseñar.
  const sinPerfil = ruta.pantalla === 'preparando' && pasoPendiente('billete', perfil);
  const sinItinerario = ruta.pantalla === 'itinerario' && !viaje;
  useEffect(() => {
    if (sinPerfil) navegar(rutaPaso(sinPerfil), true);
    else if (sinItinerario) navegar('#/', true);
  }, [sinPerfil, sinItinerario, navegar]);

  const alListo = useCallback(
    (itinerario: TipoItinerario) => {
      setViaje({ id: crypto.randomUUID(), perfil, itinerario, quitados: [] });
      navegar('#/itinerario', true); // sin volver a «preparando» con el botón atrás
    },
    [perfil, setViaje, navegar],
  );

  const pantalla = (() => {
    if (ruta.pantalla === 'viaje') {
      return (
        <Viaje paso={ruta.paso} perfil={perfil} onCambiar={setPerfil} navegar={navegar} onSellar={() => navegar('#/preparando')} />
      );
    }
    if (ruta.pantalla === 'preparando') {
      return sinPerfil ? null : <Preparando perfil={perfil} onListo={alListo} onVolver={() => navegar(rutaPaso('billete'), true)} />;
    }
    if (ruta.pantalla === 'chat') {
      return (
        <Chat
          onPerfil={(completo) => {
            // La entrevista ha completado el perfil: a preparar el viaje, como desde el billete.
            setPerfil(completo);
            navegar('#/preparando');
          }}
        />
      );
    }
    if (ruta.pantalla === 'itinerario') {
      if (!viaje) return null;
      const guardado = estaGuardado(guardados, viaje.id);
      // Un ajuste conserva el id del viaje; si estaba guardado, la copia guardada se actualiza.
      const alCambiar = (cambiado: TipoViaje) => {
        const conId = { ...cambiado, id: viaje.id };
        setViaje(conId);
        if (guardado) cambiarGuardados((lista) => guardarViaje(lista, conId, ahora()));
      };
      const alternarGuardado = () =>
        cambiarGuardados((lista) => (guardado ? quitarViaje(lista, viaje.id) : guardarViaje(lista, viaje, ahora())));
      return (
        <Itinerario
          viaje={viaje}
          onCambiar={alCambiar}
          visitas={visitas}
          onCheckIn={(visita) => cambiarVisitas((lista) => hacerCheckIn(lista, visita))}
          acciones={
            <button type="button" className="boton boton-papel boton-guardar" aria-pressed={guardado} onClick={alternarGuardado}>
              {guardado ? <BookmarkCheck className="icono" aria-hidden="true" /> : <Bookmark className="icono" aria-hidden="true" />}
              {guardado ? 'Guardado' : 'Guardar'}
            </button>
          }
          final={
            <>
              {guardado ? (
                <a className="boton boton-ancho" href="#/viajes">
                  <BookmarkCheck className="icono" aria-hidden="true" /> Ver mis viajes
                </a>
              ) : (
                <button type="button" className="boton boton-ancho" onClick={alternarGuardado}>
                  <Bookmark className="icono" aria-hidden="true" /> Guardar este viaje
                </button>
              )}
              <a className="boton boton-papel boton-ancho" href="#/pasaporte">
                <Stamp className="icono" aria-hidden="true" /> Mi pasaporte
              </a>
              <a className="boton boton-papel boton-ancho" href="#/">
                <Compass className="icono" aria-hidden="true" /> Planear otro viaje
              </a>
            </>
          }
        />
      );
    }
    if (ruta.pantalla === 'legal') return <Legal />;
    if (ruta.pantalla === 'pasaporte') {
      return <Pasaporte visitas={visitas} onCambiar={cambiarVisitas} />;
    }
    if (ruta.pantalla === 'viajes') {
      return (
        <MisViajes
          guardados={guardados}
          actual={viaje}
          onGuardar={(abierto) => cambiarGuardados((lista) => guardarViaje(lista, abierto, ahora()))}
          onAbrir={(guardadoAbierto: ViajeConId) => {
            setViaje(guardadoAbierto);
            navegar('#/itinerario');
          }}
          onQuitar={(id) => cambiarGuardados((lista) => quitarViaje(lista, id))}
        />
      );
    }
    return (
      <Portada
        onEmpezar={(destino) => {
          // Empezar desde la portada es un viaje nuevo, con la ciudad que se estaba viendo.
          setPerfil(perfilInicial(destino));
          navegar(rutaPaso('destino'));
        }}
      />
    );
  })();

  // En las pantallas principales, barra de pestañas abajo para moverse sin adivinar.
  if (!PANTALLAS_CON_PESTANAS.includes(ruta.pantalla)) return pantalla;
  return (
    <div className="con-pestanas">
      {pantalla}
      <Pestanas activa={ruta.pantalla} guardados={guardados.length} />
    </div>
  );
}
