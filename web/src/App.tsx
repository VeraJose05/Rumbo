// RF-12: web de Rumbo. Elige la pantalla según la ruta del hash y guarda el perfil del viaje.
import { useCallback, useEffect } from 'react';
import { ItinerarioProvisional } from './pantallas/ItinerarioProvisional';
import { Portada } from './pantallas/Portada';
import { Preparando } from './pantallas/Preparando';
import { Viaje } from './pantallas/Viaje';
import { rutaPaso, useRuta } from './ruta';
import type { Itinerario } from './viaje/itinerario';
import { pasoPendiente } from './viaje/pasos';
import { perfilInicial } from './viaje/perfil';
import { useItinerario, usePerfil } from './viaje/usePerfil';

export function App() {
  const [ruta, navegar] = useRuta();
  const [perfil, setPerfil] = usePerfil();
  const [itinerario, setItinerario] = useItinerario();

  // Sin un perfil completo no se puede preparar el viaje, y sin itinerario no hay nada que enseñar.
  const sinPerfil = ruta.pantalla === 'preparando' && pasoPendiente('billete', perfil);
  const sinItinerario = ruta.pantalla === 'itinerario' && !itinerario;
  useEffect(() => {
    if (sinPerfil) navegar(rutaPaso(sinPerfil), true);
    else if (sinItinerario) navegar('#/', true);
  }, [sinPerfil, sinItinerario, navegar]);

  const alListo = useCallback(
    (nuevo: Itinerario) => {
      setItinerario(nuevo);
      navegar('#/itinerario', true); // sin volver a «preparando» con el botón atrás
    },
    [setItinerario, navegar],
  );

  if (ruta.pantalla === 'viaje') {
    return (
      <Viaje paso={ruta.paso} perfil={perfil} onCambiar={setPerfil} navegar={navegar} onSellar={() => navegar('#/preparando')} />
    );
  }
  if (ruta.pantalla === 'preparando') {
    return sinPerfil ? null : <Preparando perfil={perfil} onListo={alListo} onVolver={() => navegar(rutaPaso('billete'), true)} />;
  }
  if (ruta.pantalla === 'itinerario') {
    return itinerario ? <ItinerarioProvisional itinerario={itinerario} perfil={perfil} /> : null;
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
}
