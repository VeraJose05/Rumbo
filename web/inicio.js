// RF-12: portada. Los destinos pasan solos como historias (o tocando a los lados / deslizando);
// mantener el dedo pulsado las pausa. Con «reducir movimiento» no avanzan solas.
import { DESTINOS_PORTADA, creditoFoto, otraHistoria } from './destinos.js';
import { avisoPrivacidad } from './formato.js';

const historias = document.querySelector('.historias');
const fotos = document.querySelector('.historias-fotos');
const progreso = document.querySelector('.historias-progreso');
const region = document.querySelector('.historia-region');
const nombre = document.querySelector('.historia-nombre');
const credito = document.querySelector('.historia-credito');
const billete = document.querySelector('.inicio-billete');

let actual = 0;

// La primera foto se carga ya; el resto, cuando el navegador esté libre.
const imagenes = DESTINOS_PORTADA.map((d, i) => {
  const img = document.createElement('img');
  img.src = d.foto;
  img.alt = `${d.nombre}`;
  img.loading = i === 0 ? 'eager' : 'lazy';
  img.decoding = 'async';
  fotos.append(img);
  const barra = document.createElement('li');
  progreso.append(barra);
  return { img, barra };
});

function mostrar(indice) {
  actual = indice;
  const destino = DESTINOS_PORTADA[indice];
  imagenes.forEach(({ img, barra }, i) => {
    img.classList.toggle('activa', i === indice);
    barra.classList.toggle('vista', i < indice);
    barra.classList.remove('actual');
  });
  // Reiniciar la animación de la barra actual.
  const barra = imagenes[indice].barra;
  void barra.offsetWidth;
  barra.classList.add('actual');

  region.textContent = destino.region;
  nombre.textContent = destino.nombre;
  nombre.classList.remove('aparece');
  void nombre.offsetWidth;
  nombre.classList.add('aparece');
  credito.textContent = creditoFoto(destino.credito);
  // «Empezar mi viaje» lleva la ciudad que se está viendo.
  document.querySelector('#empezar').href = `viaje.html?destino=${encodeURIComponent(destino.nombre)}`;
  credito.href = destino.credito.fuente;
}

const pasar = (sentido) => mostrar(otraHistoria(actual, DESTINOS_PORTADA.length, sentido));

// La barra de progreso marca el tiempo: al llenarse, pasa a la siguiente.
progreso.addEventListener('animationend', () => pasar(+1));
document.querySelector('.historias-anterior').addEventListener('click', () => pasar(-1));
document.querySelector('.historias-siguiente').addEventListener('click', () => pasar(+1));

// Deslizar de lado cambia de destino; mantener pulsado pausa.
let inicioX = null;
historias.addEventListener('pointerdown', (e) => {
  inicioX = e.clientX;
  historias.classList.add('pausa');
});
historias.addEventListener('pointerup', (e) => {
  historias.classList.remove('pausa');
  if (inicioX === null) return;
  const dx = e.clientX - inicioX;
  inicioX = null;
  if (Math.abs(dx) > 50) {
    e.preventDefault();
    pasar(dx < 0 ? +1 : -1);
  }
});
historias.addEventListener('pointercancel', () => {
  historias.classList.remove('pausa');
  inicioX = null;
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') pasar(+1);
  if (e.key === 'ArrowLeft') pasar(-1);
});

// El crédito de la foto se coloca justo encima del billete, mida lo que mida.
const medirBillete = () => document.documentElement.style.setProperty('--alto-billete', `${billete.offsetHeight}px`);
new ResizeObserver(medirBillete).observe(billete);

// RNF-09: en la versión pública, el talón dice a qué servicios van los mensajes.
fetch('/info')
  .then((r) => r.json())
  .then(({ proveedores }) => {
    if (proveedores?.length) document.querySelector('#privacidad').innerHTML = avisoPrivacidad(proveedores);
  })
  .catch(() => {});

mostrar(0);
