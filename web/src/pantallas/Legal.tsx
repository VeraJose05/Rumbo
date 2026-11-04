// RNF-07, RNF-09: privacidad y créditos. Todo lo que antes iba en avisos largos (adónde van los
// mensajes, qué se guarda, licencias de la guía, las fotos, las fuentes y el código) en una página.
import { ArrowLeft } from 'lucide-react';
import { DESTINOS_PORTADA, creditoFoto } from '../datos/destinos';
import { nombreServicio, useProveedores } from '../datos/privacidad';
import { INTERESES } from '../viaje/perfil';
import '../estilos/cuaderno-pantallas.css';

const FOTOS = [
  ...DESTINOS_PORTADA.map((d) => ({ que: d.nombre, credito: d.credito })),
  ...INTERESES.map((i) => ({ que: i.nombre, credito: i.credito })),
];

export function Legal() {
  const proveedores = useProveedores();
  return (
    <div className="pantalla cuaderno-pantalla legal">
      <header className="cuaderno-cabecera">
        <a className="boton boton-redondo boton-papel viaje-atras" href="#/" aria-label="Volver">
          <ArrowLeft className="icono" />
        </a>
        <div>
          <p className="antetitulo">La letra pequeña, en grande</p>
          <h1 className="subtitulo">Privacidad y créditos</h1>
        </div>
      </header>

      <section aria-labelledby="legal-datos">
        <h2 id="legal-datos" className="antetitulo">
          Tus datos
        </h2>
        <ul className="legal-lista">
          <li>
            <strong>Sin registro, sin cuentas y sin cookies.</strong> Rumbo no sabe quién eres.
          </li>
          {proveedores === null ? null : proveedores.length === 0 ? (
            <li>
              <strong>Todo se ejecuta en este equipo:</strong> los modelos y la guía funcionan en local y tus mensajes no salen de aquí.
            </li>
          ) : (
            <li>
              <strong>Lo que escribes</strong> (destino, gustos, mensajes del chat y ajustes) se envía para preparar el viaje a:
              <ul>
                {proveedores.map((p) => (
                  <li key={p.servicio}>
                    <strong>{nombreServicio(p)}</strong>: {p.uso} (modelo abierto <code>{p.modelo}</code>).
                  </li>
                ))}
              </ul>
              Se usan en sus planes gratuitos y se rigen por sus condiciones. <strong>No escribas datos personales.</strong>
            </li>
          )}
          <li>
            <strong>En tu navegador se guardan</strong> el viaje en curso (hasta cerrar la pestaña), tus viajes guardados y el
            pasaporte. No salen del móvil; si borras los datos del navegador se pierden, así que exporta el pasaporte desde su
            pantalla.
          </li>
        </ul>
      </section>

      <section aria-labelledby="legal-guia">
        <h2 id="legal-guia" className="antetitulo">
          De dónde salen los lugares
        </h2>
        <p>
          Los itinerarios se basan en las guías de{' '}
          <a href="https://es.wikivoyage.org" target="_blank" rel="noopener">
            Wikivoyage en español
          </a>{' '}
          (licencia{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noopener">
            CC BY-SA 4.0
          </a>
          ). Cada postal enlaza a su artículo. Rumbo puede equivocarse: comprueba horarios y precios antes de ir.
        </p>
        <p>
          El mapa usa datos de{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">
            © colaboradores de OpenStreetMap
          </a>{' '}
          (ODbL): las ubicaciones se buscaron una vez con Nominatim (y, si no estaban, en los artículos de{' '}
          <a href="https://es.wikipedia.org" target="_blank" rel="noopener">
            Wikipedia
          </a>
          ) y el fondo es de{' '}
          <a href="https://openfreemap.org" target="_blank" rel="noopener">
            OpenFreeMap
          </a>{' '}
          (OpenMapTiles). Los lugares que no se encontraron no salen en el mapa, en vez de ponerlos donde no son.
        </p>
      </section>

      <section aria-labelledby="legal-fotos">
        <h2 id="legal-fotos" className="antetitulo">
          Fotos
        </h2>
        <p className="suave">De Wikimedia Commons, con sus autores y licencias:</p>
        <ul className="legal-creditos">
          {FOTOS.map(({ que, credito }) => (
            <li key={que}>
              {que}:{' '}
              <a href={credito.fuente} target="_blank" rel="noopener">
                {creditoFoto(credito).replace(/^Foto: /, '')}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="legal-software">
        <h2 id="legal-software" className="antetitulo">
          Software
        </h2>
        <p>
          Código abierto bajo licencia MIT, © 2026 Jose Vera Castillo:{' '}
          <a href="https://github.com/VeraJose05/Rumbo" target="_blank" rel="noopener">
            github.com/VeraJose05/Rumbo
          </a>
          . Tipografías Fraunces, Inter y Caveat (SIL Open Font License), iconos Lucide (ISC) y mapas con MapLibre (BSD-3).
        </p>
      </section>
    </div>
  );
}
