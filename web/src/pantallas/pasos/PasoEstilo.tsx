// RF-01, RF-12: paso 3, estilo: ritmo (tortuga o liebre), presupuesto (huchas) y compañía.
import { Backpack, Baby, HeartHandshake, PartyPopper, PiggyBank, Rabbit, Turtle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { COMPANIAS, PRESUPUESTOS, RITMOS, elegir, type Compania, type Perfil } from '../../viaje/perfil';

const PERSONAJES: Record<Compania, LucideIcon> = { solo: Backpack, pareja: HeartHandshake, familia: Baby, amigos: PartyPopper };

interface Props {
  perfil: Perfil;
  onCambiar: (perfil: Perfil) => void;
}

export function PasoEstilo({ perfil, onCambiar }: Props) {
  const indiceRitmo = RITMOS.findIndex((r) => r.id === perfil.ritmo);
  const ritmo = RITMOS[indiceRitmo]!;

  return (
    <section className="paso">
      <h1 className="titulo">
        ¿Cómo te gusta <span className="manuscrito acento">viajar?</span>
      </h1>
      <p className="suave">Mueve las fichas a tu manera.</p>

      <div className="tarjeta ficha">
        <div className="ficha-cabecera">
          <h2 className="subtitulo">Ritmo</h2>
          <span className="antetitulo">Ficha 1</span>
        </div>
        <div className="ritmo">
          <Turtle className="ritmo-animal" aria-hidden="true" />
          <input
            className="ritmo-control"
            type="range"
            min={0}
            max={RITMOS.length - 1}
            step={1}
            value={indiceRitmo}
            aria-label="Ritmo"
            aria-valuetext={ritmo.nombre}
            onChange={(e) => onCambiar(elegir(perfil, 'ritmo', RITMOS[Number(e.target.value)]!.id))}
          />
          <Rabbit className="ritmo-animal" aria-hidden="true" />
        </div>
        <div className="ritmo-etiquetas">
          {RITMOS.map((r) => (
            <button key={r.id} type="button" aria-pressed={r.id === perfil.ritmo} onClick={() => onCambiar(elegir(perfil, 'ritmo', r.id))}>
              {r.nombre}
            </button>
          ))}
        </div>
        <p className="ritmo-planes">
          <span className="manuscrito acento">{ritmo.planes} planes</span> <span className="suave">al día</span>
        </p>
      </div>

      <fieldset className="tarjeta ficha">
        <div className="ficha-cabecera">
          <legend className="subtitulo">Presupuesto</legend>
          <span className="antetitulo">Ficha 2</span>
        </div>
        <div className="opciones opciones-3">
          {PRESUPUESTOS.map((p) => (
            <Opcion key={p.id} campo="presupuesto" valor={p.id} perfil={perfil} onCambiar={onCambiar}>
              <span className="monedas" aria-hidden="true">
                {Array.from({ length: p.monedas }, (_, i) => (
                  <i key={i} />
                ))}
              </span>
              <PiggyBank aria-hidden="true" />
              <strong>{p.nombre}</strong>
              <small>{p.descripcion}</small>
            </Opcion>
          ))}
        </div>
      </fieldset>

      <fieldset className="tarjeta ficha">
        <div className="ficha-cabecera">
          <legend className="subtitulo">¿Con quién vas?</legend>
          <span className="antetitulo">Ficha 3</span>
        </div>
        <div className="opciones opciones-2">
          {COMPANIAS.map((c) => {
            const Personaje = PERSONAJES[c.id];
            return (
              <Opcion key={c.id} campo="compania" valor={c.id} perfil={perfil} onCambiar={onCambiar}>
                <Personaje aria-hidden="true" />
                <strong>{c.nombre}</strong>
              </Opcion>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}

interface PropsOpcion {
  campo: 'presupuesto' | 'compania';
  valor: string;
  perfil: Perfil;
  onCambiar: (perfil: Perfil) => void;
  children: ReactNode;
}

function Opcion({ campo, valor, perfil, onCambiar, children }: PropsOpcion) {
  return (
    <label className="opcion">
      <input type="radio" name={campo} value={valor} checked={perfil[campo] === valor} onChange={() => onCambiar(elegir(perfil, campo, valor))} />
      {children}
    </label>
  );
}
