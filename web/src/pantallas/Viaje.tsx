// RF-01, RF-12: recorrido para armar el viaje sin chat. Este componente pone el marco común
// (cabecera, vía de progreso y barra inferior) y cada paso es un componente propio.
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { rutaPaso } from '../ruta';
import { NOMBRES_PASO, PASOS, pasoPendiente, puedeSeguir, type Paso } from '../viaje/pasos';
import type { Perfil } from '../viaje/perfil';
import { PasoBillete } from './pasos/PasoBillete';
import { PasoDestino } from './pasos/PasoDestino';
import { PasoEstilo } from './pasos/PasoEstilo';
import { PasoGustos } from './pasos/PasoGustos';
import '../estilos/viaje.css';

interface Props {
  paso: Paso;
  perfil: Perfil;
  onCambiar: (perfil: Perfil) => void;
  navegar: (hash: string, reemplazar?: boolean) => void;
  onSellar: () => void;
}

export function Viaje({ paso, perfil, onCambiar, navegar, onSellar }: Props) {
  // Si falta algo de un paso anterior (p. ej. se entra por la URL a #/viaje/estilo sin gustos), se vuelve a él.
  const pendiente = pasoPendiente(paso, perfil);
  useEffect(() => {
    if (pendiente) navegar(rutaPaso(pendiente), true);
  }, [pendiente, navegar]);
  if (pendiente) return null;

  const indice = PASOS.indexOf(paso);
  const siguiente = PASOS[indice + 1];
  const n = perfil.intereses.length;
  const resumen = [perfil.destino ?? 'Elige destino', `${perfil.dias} ${perfil.dias === 1 ? 'día' : 'días'}`];
  if (indice >= 1) resumen.push(n ? `${n} ${n === 1 ? 'gusto' : 'gustos'}` : 'sin gustos');

  return (
    <div className="pantalla viaje">
      <header className="viaje-cabecera">
        <a className="boton boton-redondo boton-papel viaje-atras" href={indice === 0 ? '#/' : rutaPaso(PASOS[indice - 1]!)} aria-label="Volver">
          <ArrowLeft className="icono" />
        </a>
        <div>
          <p className="antetitulo">Cuaderno de ruta</p>
          <p className="viaje-paso" aria-live="polite">
            Paso {indice + 1} de {PASOS.length} · {NOMBRES_PASO[paso]}
          </p>
        </div>
      </header>

      <ol className="via" aria-label="Pasos">
        {PASOS.map((p, i) => (
          <li key={p} className={i < indice ? 'hecha' : i === indice ? 'actual' : ''}>
            {NOMBRES_PASO[p]}
          </li>
        ))}
      </ol>

      {paso === 'destino' && <PasoDestino perfil={perfil} onCambiar={onCambiar} />}
      {paso === 'gustos' && <PasoGustos perfil={perfil} onCambiar={onCambiar} />}
      {paso === 'estilo' && <PasoEstilo perfil={perfil} onCambiar={onCambiar} />}
      {paso === 'billete' && <PasoBillete perfil={perfil} onSellar={onSellar} />}

      {/* En el billete no hace falta: el resumen es el propio billete y el botón es «Sellar». */}
      {siguiente && (
        <footer className="barra-inferior viaje-barra">
          <p className="viaje-resumen">
            <span className="antetitulo">Tu elección</span>
            <strong>{resumen.join(' · ')}</strong>
          </p>
          <button
            className="boton viaje-siguiente"
            type="button"
            disabled={!puedeSeguir(paso, perfil)}
            aria-label={`Siguiente paso: ${NOMBRES_PASO[siguiente]}`}
            onClick={() => navegar(rutaPaso(siguiente))}
          >
            {NOMBRES_PASO[siguiente]} <ArrowRight className="icono" aria-hidden="true" />
          </button>
        </footer>
      )}
    </div>
  );
}
