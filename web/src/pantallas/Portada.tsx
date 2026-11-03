// RF-12: portada. Los destinos pasan solos como historias (o tocando a los lados / deslizando);
// mantener el dedo pulsado las pausa. Con «reducir movimiento» no avanzan solas (no hay animación).
import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DESTINOS_PORTADA, creditoFoto, otraHistoria } from '../datos/destinos';
import { avisoPrivacidad, useProveedores } from '../datos/privacidad';
import '../estilos/portada.css';

export function Portada({ onEmpezar }: { onEmpezar: (destino: string) => void }) {
  const [actual, setActual] = useState(0);
  const [pausa, setPausa] = useState(false);
  const inicioX = useRef<number | null>(null);
  const billete = useRef<HTMLDivElement>(null);
  const proveedores = useProveedores();
  const destino = DESTINOS_PORTADA[actual]!;

  const pasar = (sentido: 1 | -1) => setActual((a) => otraHistoria(a, DESTINOS_PORTADA.length, sentido));

  // Flechas del teclado.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') pasar(1);
      if (e.key === 'ArrowLeft') pasar(-1);
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, []);

  // El crédito de la foto se coloca justo encima del billete, mida lo que mida.
  useEffect(() => {
    const elemento = billete.current;
    if (!elemento) return;
    const observador = new ResizeObserver(() =>
      document.documentElement.style.setProperty('--alto-billete', `${elemento.offsetHeight}px`),
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return (
    <div className="portada">
      <main className="inicio">
        <section
          className={`historias${pausa ? ' pausa' : ''}`}
          aria-roledescription="carrusel"
          aria-label="Destinos con guía"
          onPointerDown={(e) => {
            inicioX.current = e.clientX;
            setPausa(true);
          }}
          onPointerUp={(e) => {
            setPausa(false);
            if (inicioX.current === null) return;
            const dx = e.clientX - inicioX.current;
            inicioX.current = null;
            if (Math.abs(dx) > 50) pasar(dx < 0 ? 1 : -1);
          }}
          onPointerCancel={() => {
            setPausa(false);
            inicioX.current = null;
          }}
        >
          <div className="historias-fotos">
            {DESTINOS_PORTADA.map((d, i) => (
              <img key={d.nombre} src={d.foto} alt={d.nombre} className={i === actual ? 'activa' : ''} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
            ))}
          </div>
          <div className="historias-velo" />
          {/* La barra actual se llena con una animación CSS; al acabar, pasa a la siguiente. */}
          <ol className="historias-progreso" aria-hidden="true" onAnimationEnd={() => pasar(1)}>
            {DESTINOS_PORTADA.map((d, i) => (
              <li key={d.nombre} className={i < actual ? 'vista' : i === actual ? 'actual' : ''} />
            ))}
          </ol>

          <header className="inicio-barra">
            <a className="inicio-marca" href="#/" aria-label="Rumbo, inicio">
              <img src="/marca/simbolo.svg" alt="" width={34} height={34} />
              <span>rumbo</span>
            </a>
          </header>

          <div className="historia-texto" aria-live="polite">
            <span className="historia-region pegatina">{destino.region}</span>
            {/* La key nueva vuelve a montar el título y repite su animación de entrada. */}
            <h1 key={destino.nombre} className="titulo-xl historia-nombre aparece">
              {destino.nombre}
            </h1>
          </div>

          <button className="historias-zona historias-anterior" type="button" aria-label="Destino anterior" onClick={() => pasar(-1)} />
          <button className="historias-zona historias-siguiente" type="button" aria-label="Destino siguiente" onClick={() => pasar(1)} />
          <a className="historia-credito" href={destino.credito.fuente} target="_blank" rel="noopener">
            {creditoFoto(destino.credito)}
          </a>
        </section>

        <div ref={billete} className="billete inicio-billete aparece">
          <p className="antetitulo">Billete de viaje</p>
          <h2 className="titulo">¿A dónde vamos?</h2>
          <p className="suave inicio-lema">Arma tu ruta sin prisas y a tu rollo.</p>
          <button className="boton boton-ancho" type="button" onClick={() => onEmpezar(destino.nombre)}>
            Empezar mi viaje <ArrowRight className="icono" aria-hidden="true" />
          </button>
          <a className="inicio-chat" href="/chat.html">
            o cuéntamelo por chat
          </a>
          <div className="billete-talon">
            <span>Sin registro ni cuentas</span>
            {proveedores?.length ? <span className="inicio-privacidad">{avisoPrivacidad(proveedores)}</span> : null}
          </div>
        </div>
      </main>
    </div>
  );
}
