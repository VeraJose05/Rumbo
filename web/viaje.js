// RF-01, RF-12: recorrido para armar el viaje. Cada paso es una sección de viaje.html y se elige con
// el hash (#destino, #gustos…), así el botón «atrás» del navegador funciona. El perfil se guarda en
// sessionStorage para no perderlo al recargar.
import { DESTINOS_PORTADA } from './destinos.js';
import { escapar } from './formato.js';
import { cambiarDias, etiquetaDias, perfilInicial } from './viaje-estado.js';

const PASOS = ['destino', 'gustos', 'estilo', 'billete'];
const NOMBRES = { destino: 'Destino', gustos: 'Gustos', estilo: 'Estilo', billete: 'Billete' };
const CLAVE = 'rumbo-viaje';

// ---------- Estado ----------

function leer() {
  const desdePortada = new URLSearchParams(location.search).get('destino');
  // El destino de la portada se usa una vez: se quita de la URL para que recargar no lo reponga.
  if (desdePortada) history.replaceState(null, '', location.pathname + location.hash);
  try {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE));
    if (guardado && !desdePortada) return guardado;
  } catch {
    // Sin almacenamiento (modo privado estricto): se empieza de cero.
  }
  return perfilInicial(desdePortada);
}

let perfil = leer();

function actualizar(nuevo) {
  perfil = nuevo;
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(perfil));
  } catch {
    // Sin almacenamiento: el perfil vive solo en memoria.
  }
  pintar();
}

// ---------- Paso 1: destino y días ----------

const mesa = document.querySelector('.postales-mesa');
const GIROS = ['-3deg', '2deg', '-1.5deg', '3deg', '-2.5deg'];

mesa.insertAdjacentHTML(
  'beforeend',
  DESTINOS_PORTADA.map(
    (d, i) => `
    <label class="postal-opcion">
      <input type="radio" name="destino" value="${escapar(d.nombre)}" />
      <figure class="postal" style="--giro: ${GIROS[i]}; margin: 0">
        <img src="${d.foto}" alt="" loading="lazy" />
        <figcaption>
          <p class="postal-pie">${escapar(d.nombre)}</p>
          <p class="postal-pista">${escapar(d.pista)}</p>
        </figcaption>
      </figure>
      <span class="sello" aria-hidden="true">¡Esta!</span>
    </label>`,
  ).join(''),
);

mesa.addEventListener('change', (e) => {
  actualizar({ ...perfil, destino: e.target.value });
  centrarPostal('smooth');
});

// Centra la postal elegida desplazando solo la mesa (scrollIntoView movía también la página).
function centrarPostal(behavior = 'auto') {
  const elegida = mesa.querySelector('input:checked')?.closest('.postal-opcion');
  if (!elegida) return;
  mesa.scrollTo({ left: elegida.offsetLeft - (mesa.clientWidth - elegida.offsetWidth) / 2, behavior });
}

document.querySelectorAll('[data-dias]').forEach((boton) => {
  boton.addEventListener('click', () => actualizar(cambiarDias(perfil, Number(boton.dataset.dias))));
});

// El tren: una locomotora y un vagón por día.
const LOCOMOTORA = `<svg viewBox="0 0 56 40"><rect x="4" y="10" width="34" height="20" rx="4" fill="var(--terracota)"/>
  <rect x="30" y="2" width="20" height="28" rx="4" fill="var(--terracota-profunda)"/><rect x="34" y="7" width="12" height="9" rx="2" fill="var(--crema)"/>
  <rect x="10" y="2" width="7" height="10" rx="2" fill="var(--tinta)"/><circle cx="14" cy="33" r="5" fill="var(--tinta)"/>
  <circle cx="40" cy="33" r="5" fill="var(--tinta)"/></svg>`;
const COLORES_VAGON = ['var(--azul)', 'var(--azafran)', 'var(--olivo)'];
const vagon = (i) => `<svg class="vagon" viewBox="0 0 40 40"><rect x="2" y="8" width="36" height="22" rx="4" fill="${COLORES_VAGON[i % 3]}"/>
  <rect x="7" y="12" width="10" height="8" rx="2" fill="var(--crema)"/><rect x="23" y="12" width="10" height="8" rx="2" fill="var(--crema)"/>
  <circle cx="11" cy="33" r="4.5" fill="var(--tinta)"/><circle cx="29" cy="33" r="4.5" fill="var(--tinta)"/></svg>`;

const tren = document.querySelector('.tren');
let vagonesPintados = 0;
function pintarTren() {
  // Solo se añaden o quitan los vagones que cambian, para que la animación sea la del enganche.
  if (!tren.firstChild) tren.innerHTML = LOCOMOTORA;
  while (vagonesPintados < perfil.dias) tren.insertAdjacentHTML('beforeend', vagon(vagonesPintados++));
  while (vagonesPintados > perfil.dias) {
    tren.lastElementChild.remove();
    vagonesPintados--;
  }
}

function pintarDestino() {
  mesa.querySelectorAll('input').forEach((input) => {
    input.checked = input.value === perfil.destino;
  });
  pintarTren();
  document.querySelector('.dias-numero span').textContent = perfil.dias;
  document.querySelector('.dias-numero').lastChild.textContent = perfil.dias === 1 ? ' día' : ' días';
  document.querySelector('.dias-etiqueta').textContent = etiquetaDias(perfil.dias);
  document.querySelector('[data-dias="-1"]').disabled = perfil.dias <= 1;
  document.querySelector('[data-dias="1"]').disabled = perfil.dias >= 7;
}

// ---------- Navegación entre pasos ----------

const pasoActual = () => (PASOS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'destino');

const PUEDE_SEGUIR = {
  destino: () => Boolean(perfil.destino),
  gustos: () => perfil.intereses.length > 0,
  estilo: () => true,
  billete: () => true,
};

function pintar() {
  const paso = pasoActual();
  const indice = PASOS.indexOf(paso);
  document.querySelectorAll('section.paso').forEach((s) => {
    s.hidden = s.dataset.paso !== paso;
  });
  document.querySelectorAll('.via li').forEach((li, i) => {
    li.className = i < indice ? 'hecha' : i === indice ? 'actual' : '';
  });
  document.querySelector('.viaje-paso').textContent = `Paso ${indice + 1} de ${PASOS.length} · ${NOMBRES[paso]}`;
  document.querySelector('.viaje-atras').href = indice === 0 ? './' : `#${PASOS[indice - 1]}`;

  if (paso === 'destino') pintarDestino();

  const resumen = [perfil.destino ?? 'Elige destino', `${perfil.dias} ${perfil.dias === 1 ? 'día' : 'días'}`];
  document.querySelector('.viaje-resumen strong').textContent = resumen.join(' · ');
  const siguiente = PASOS[indice + 1];
  const boton = document.querySelector('.viaje-siguiente');
  boton.querySelector('span').textContent = siguiente ? NOMBRES[siguiente] : 'Preparar mi viaje';
  boton.setAttribute('aria-label', siguiente ? `Siguiente paso: ${NOMBRES[siguiente]}` : 'Preparar mi viaje');
  boton.disabled = !PUEDE_SEGUIR[paso]();
}

document.querySelector('.viaje-siguiente').addEventListener('click', () => {
  const siguiente = PASOS[PASOS.indexOf(pasoActual()) + 1];
  if (siguiente) location.hash = siguiente;
});
window.addEventListener('hashchange', () => {
  pintar();
  window.scrollTo({ top: 0 });
});

pintar();
centrarPostal();
