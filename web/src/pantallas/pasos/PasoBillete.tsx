// RF-01, RF-12: paso 4, el billete: resumen del viaje (cada dato se puede cambiar) y botón para
// sellarlo y preparar el itinerario.
import { Pencil, Stamp } from 'lucide-react';
import { useState } from 'react';
import { rutaPaso } from '../../ruta';
import type { Paso } from '../../viaje/pasos';
import { COMPANIAS, INTERESES, PRESUPUESTOS, RITMOS, type Perfil } from '../../viaje/perfil';

/** Lo que dura la animación del sello antes de pasar a preparar el viaje. */
const DURACION_SELLO = 900;

interface Props {
  perfil: Perfil;
  onSellar: () => void;
}

export function PasoBillete({ perfil, onSellar }: Props) {
  const [sellado, setSellado] = useState(false);
  const ritmo = RITMOS.find((r) => r.id === perfil.ritmo)!;
  const datos: { etiqueta: string; valor: string; paso: Paso }[] = [
    { etiqueta: 'Duración', valor: `${perfil.dias} ${perfil.dias === 1 ? 'día' : 'días'}`, paso: 'destino' },
    { etiqueta: 'Compañía', valor: COMPANIAS.find((c) => c.id === perfil.compania)!.nombre, paso: 'estilo' },
    { etiqueta: 'Ritmo', valor: `${ritmo.nombre} · ${ritmo.planes} planes al día`, paso: 'estilo' },
    { etiqueta: 'Presupuesto', valor: PRESUPUESTOS.find((p) => p.id === perfil.presupuesto)!.nombre, paso: 'estilo' },
  ];

  const sellar = () => {
    if (sellado) return;
    setSellado(true);
    setTimeout(onSellar, DURACION_SELLO);
  };

  return (
    <section className="paso">
      <h1 className="titulo">
        Todo listo para <span className="manuscrito acento">partir</span>
      </h1>
      <p className="suave">Revisa tu billete; puedes cambiar cualquier dato con el lápiz.</p>

      <div className={`billete billete-viaje${sellado ? ' sellado' : ''}`}>
        <p className="antetitulo">Billete de viaje · Rumbo</p>
        <div className="billete-destino">
          <div>
            <p className="billete-etiqueta">Destino</p>
            <p className="billete-ciudad">{perfil.destino}</p>
          </div>
          <a className="billete-editar" href={rutaPaso('destino')} aria-label="Cambiar destino o días">
            <Pencil className="icono" />
          </a>
        </div>

        <dl className="billete-datos">
          {datos.map((d) => (
            <div key={d.etiqueta}>
              <dt className="billete-etiqueta">{d.etiqueta}</dt>
              <dd>{d.valor}</dd>
              <a className="billete-editar" href={rutaPaso(d.paso)} aria-label={`Cambiar ${d.etiqueta.toLowerCase()}`}>
                <Pencil className="icono" />
              </a>
            </div>
          ))}
        </dl>

        <div className="billete-gustos">
          <p className="billete-etiqueta">
            Gustos{' '}
            <a href={rutaPaso('gustos')} aria-label="Cambiar gustos">
              <Pencil className="icono icono-pequeno" />
            </a>
          </p>
          <ul>
            {perfil.intereses.map((id, i) => {
              const interes = INTERESES.find((x) => x.id === id)!;
              return (
                <li key={id} className="sello sello-gusto" style={{ color: interes.color, ['--giro' as string]: `${(i % 3) * 5 - 5}deg` }}>
                  {interes.nombre}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="billete-talon">Cada lugar saldrá de la guía de Wikivoyage, con su fuente.</div>
        <span className="sello sello-marcha" aria-hidden="true">
          ¡En marcha!
        </span>
      </div>

      <button className="boton boton-ancho" type="button" onClick={sellar} disabled={sellado}>
        <Stamp className="icono" aria-hidden="true" /> Sellar y preparar mi viaje
      </button>
    </section>
  );
}
