// RF-12: web de Rumbo. Elige la pantalla según la ruta del hash y guarda el perfil del viaje.
import { useCallback, useEffect } from 'react';
import { Chat } from './pantallas/Chat';
import { Itinerario } from './pantallas/Itinerario';
import { Portada } from './pantallas/Portada';
import { Preparando } from './pantallas/Preparando';
import { Viaje } from './pantallas/Viaje';
import { rutaPaso, useRuta } from './ruta';
import type { Itinerario as TipoItinerario } from './viaje/itinerario';
import { pasoPendiente } from './viaje/pasos';
import { perfilInicial } from './viaje/perfil';
import { usePerfil, useViaje } from './viaje/usePerfil';

export function App() {
  const [ruta, navegar] = useRuta();
  const [perfil, setPerfil] = usePerfil();
  const [viaje, setViaje] = useViaje();

  // Sin un perfil completo no se puede preparar el viaje, y sin itinerario no hay nada que enseñar.
  const sinPerfil = ruta.pantalla === 'preparando' && pasoPendiente('billete', perfil);
  const sinItinerario = ruta.pantalla === 'itinerario' && !viaje;
  useEffect(() => {
    if (sinPerfil) navegar(rutaPaso(sinPerfil), true);
    else if (sinItinerario) navegar('#/', true);
  }, [sinPerfil, sinItinerario, navegar]);

  const alListo = useCallback(
    (itinerario: TipoItinerario) => {
      setViaje({ perfil, itinerario, quitados: [] });
      navegar('#/itinerario', true); // sin volver a «preparando» con el botón atrás
    },
    [perfil, setViaje, navegar],
  );

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
    return viaje ? <Itinerario viaje={viaje} onCambiar={setViaje} /> : null;
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
