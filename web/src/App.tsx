// RF-12: web de Rumbo. Elige la pantalla según la ruta del hash y guarda el perfil del viaje.
import { Portada } from './pantallas/Portada';
import { Viaje } from './pantallas/Viaje';
import { rutaPaso, useRuta } from './ruta';
import { perfilInicial } from './viaje/perfil';
import { usePerfil } from './viaje/usePerfil';

export function App() {
  const [ruta, navegar] = useRuta();
  const [perfil, setPerfil] = usePerfil();

  if (ruta.pantalla === 'viaje') {
    return <Viaje paso={ruta.paso} perfil={perfil} onCambiar={setPerfil} navegar={navegar} />;
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
