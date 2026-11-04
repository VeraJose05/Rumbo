// RF-12: pasaporte de Rumbo. Sellos por ciudad e insignias según los check-in («¡Estuve aquí!»)
// guardados en el móvil, sin cuentas. Se puede exportar a un archivo e importarlo en otro móvil.
import { Award, Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { copiaPasaporte, hacerCheckIn, insignias, leerCopiaPasaporte, sellosDeCiudad, type Visita } from '../cuaderno/pasaporte';
import '../estilos/cuaderno-pantallas.css';

interface Props {
  visitas: Visita[];
  onCambiar: (cambio: (anterior: Visita[]) => Visita[]) => void;
}

export function Pasaporte({ visitas, onCambiar }: Props) {
  const archivo = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const sellos = sellosDeCiudad(visitas);
  const lista = insignias(visitas);

  const exportar = () => {
    const url = URL.createObjectURL(new Blob([copiaPasaporte(visitas)], { type: 'application/json' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'pasaporte-rumbo.json';
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const importar = async (fichero: File) => {
    try {
      const traidas = leerCopiaPasaporte(await fichero.text());
      // Se suman a las que ya hay, sin duplicar lugares.
      onCambiar((actuales) => traidas.reduce(hacerCheckIn, actuales));
      setAviso({ texto: `Pasaporte importado: ${traidas.length} ${traidas.length === 1 ? 'lugar' : 'lugares'}.` });
    } catch {
      setAviso({ texto: 'Ese archivo no es una copia del pasaporte de Rumbo.', error: true });
    }
  };

  return (
    <div className="pantalla cuaderno-pantalla">
      <header className="cuaderno-cabecera">
        <div>
          <p className="antetitulo">Sin registro, en tu móvil</p>
          <h1 className="subtitulo">Mi pasaporte</h1>
        </div>
      </header>

      {visitas.length === 0 && (
        <div className="nota" style={{ ['--giro' as string]: '-0.6deg' }}>
          <p>
            Aún no tienes sellos. Abre un lugar de tu itinerario y pulsa <strong>«¡Estuve aquí!»</strong> cuando lo visites.
          </p>
        </div>
      )}

      <section aria-labelledby="titulo-sellos">
        <h2 id="titulo-sellos" className="antetitulo">
          Ciudades
        </h2>
        <ul className="pasaporte-sellos">
          {sellos.map((s, i) => (
            <li key={s.destino}>
              <span
                className={`sello${s.conseguido ? '' : ' sello-pendiente'}`}
                style={{ ['--tam' as string]: '92px', ['--giro' as string]: `${(i % 3) * 7 - 7}deg` }}
                aria-label={s.conseguido ? `${s.destino}: ${s.lugares} ${s.lugares === 1 ? 'lugar' : 'lugares'}` : `${s.destino}: sin sello`}
              >
                {s.destino}
              </span>
              {s.conseguido && <span className="pasaporte-cuenta">{s.lugares} ✓</span>}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titulo-insignias">
        <h2 id="titulo-insignias" className="antetitulo">
          Insignias
        </h2>
        <ul className="pasaporte-insignias">
          {lista.map((ins) => (
            <li key={ins.id} className={`tarjeta insignia${ins.conseguida ? ' conseguida' : ''}`}>
              <Award className="icono insignia-icono" aria-hidden="true" />
              <div>
                <p className="insignia-nombre">{ins.nombre}</p>
                <p className="suave">{ins.descripcion}</p>
                <progress max={ins.meta} value={ins.actual} aria-label={`${ins.actual} de ${ins.meta}`} />
              </div>
              <span className="insignia-cuenta">
                {ins.actual}/{ins.meta}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="pasaporte-copia" aria-labelledby="titulo-copia">
        <h2 id="titulo-copia" className="antetitulo">
          Copia de seguridad
        </h2>
        <p className="suave">Tu pasaporte vive solo en este navegador. Guarda una copia para no perderlo o pasarlo a otro móvil.</p>
        <div className="pasaporte-botones">
          <button className="boton boton-papel" type="button" onClick={exportar} disabled={!visitas.length}>
            <Download className="icono" aria-hidden="true" /> Exportar
          </button>
          <button className="boton boton-papel" type="button" onClick={() => archivo.current?.click()}>
            <Upload className="icono" aria-hidden="true" /> Importar
          </button>
          <input
            ref={archivo}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="Archivo del pasaporte"
            onChange={(e) => {
              const fichero = e.target.files?.[0];
              if (fichero) void importar(fichero);
              e.target.value = '';
            }}
          />
        </div>
        {aviso && (
          <p className={aviso.error ? 'pasaporte-aviso error' : 'pasaporte-aviso'} role="status">
            {aviso.texto}
          </p>
        )}
      </section>
    </div>
  );
}
