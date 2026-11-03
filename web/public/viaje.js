// RF-01, RF-12: recorrido para armar el viaje. Cada paso es una sección de viaje.html y se elige con
// el hash (#destino, #gustos…), así el botón «atrás» del navegador funciona. El perfil se guarda en
// sessionStorage para no perderlo al recargar.
import { DESTINOS_PORTADA, creditoFoto } from './destinos.js';
import { escapar } from './formato.js';
import {
  COMPANIAS,
  INTERESES,
  PRESUPUESTOS,
  RITMOS,
  cambiarDias,
  decidirInteres,
  elegir,
  etiquetaDias,
  perfilInicial,
} from './viaje-estado.js';

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

// ---------- Paso 2: gustos (mazo de cartas) ----------

const mazo = document.querySelector('.mazo');
const mazoFin = document.querySelector('.mazo-fin');
let carta = 0; // índice de la carta de arriba
const historial = []; // para «deshacer»: [{ carta, intereses }]

const htmlCarta = (interes, pos) => `
  <article class="carta" data-pos="${pos}" data-id="${interes.id}" style="--color: ${interes.color}" ${pos ? 'aria-hidden="true"' : ''}>
    <div class="carta-ilustracion">
      <img src="${interes.foto}" alt="" draggable="false" ${pos > 1 ? 'loading="lazy"' : ''} />
      <span class="carta-numero">${INTERESES.indexOf(interes) + 1}/${INTERESES.length}</span>
      ${perfil.intereses.includes(interes.id) ? '<span class="carta-elegida">✓ En tu lista</span>' : ''}
      <span class="carta-icono"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${interes.icono}" /></svg></span>
      <a class="carta-credito" href="${interes.credito.fuente}" target="_blank" rel="noopener">${escapar(creditoFoto(interes.credito))}</a>
    </div>
    <div class="carta-texto">
      <h2 class="subtitulo">${escapar(interes.nombre)}</h2>
      <p>${escapar(interes.descripcion)}</p>
    </div>
    <span class="sello carta-marca meva" aria-hidden="true">¡Me va!</span>
    <span class="sello carta-marca paso" aria-hidden="true">Paso</span>
  </article>`;

function pintarGustos() {
  const terminado = carta >= INTERESES.length;
  mazo.hidden = terminado;
  mazoFin.hidden = !terminado;
  // Se pintan de abajo arriba para que la de encima quede la última en el DOM.
  mazo.innerHTML = INTERESES.slice(carta, carta + 3)
    .map((interes, pos) => htmlCarta(interes, pos))
    .reverse()
    .join('');
  document.querySelector('.gustos-contador').textContent = terminado ? 'Mazo completo' : `Carta ${carta + 1} de ${INTERESES.length}`;
  document.querySelectorAll('[data-decision]').forEach((b) => {
    b.disabled = terminado;
  });
  document.querySelector('[data-deshacer]').disabled = historial.length === 0;
  const n = perfil.intereses.length;
  document.querySelector('.mazo-fin-texto').textContent = n
    ? `Te llevas ${n} ${n === 1 ? 'pegatina' : 'pegatinas'}. Puedes seguir o repasar las cartas.`
    : 'No te has quedado ninguna: repasa las cartas y elige al menos una.';

  const lista = document.querySelector('.pegatinas-lista');
  lista.innerHTML = n
    ? perfil.intereses
        .map((id) => INTERESES.find((i) => i.id === id))
        .map((i) => `<li><button class="pegatina pegatina-activa" type="button" data-quitar="${i.id}" aria-label="Quitar ${escapar(i.nombre)}">${escapar(i.nombre)} ✕</button></li>`)
        .join('')
    : '<li class="vacio">Aún ninguna: desliza a la derecha lo que te apetezca.</li>';
  activarArrastre();
}

function decidir(meVa) {
  const arriba = mazo.querySelector('.carta[data-pos="0"]');
  if (!arriba || carta >= INTERESES.length) return;
  historial.push({ carta, intereses: perfil.intereses });
  // La carta sale volando hacia su lado y, al terminar, se actualiza el perfil.
  arriba.style.transform = `translateX(${meVa ? 140 : -140}%) rotate(${meVa ? 24 : -24}deg)`;
  arriba.style.opacity = '0';
  arriba.querySelector(meVa ? '.meva' : '.paso').style.opacity = '1';
  setTimeout(() => {
    carta++;
    actualizar(decidirInteres(perfil, arriba.dataset.id, meVa));
  }, 230);
}

function activarArrastre() {
  const arriba = mazo.querySelector('.carta[data-pos="0"]');
  if (!arriba) return;
  let inicio = null;
  arriba.addEventListener('pointerdown', (e) => {
    inicio = e.clientX;
    arriba.setPointerCapture(e.pointerId);
    arriba.classList.add('arrastrando');
  });
  arriba.addEventListener('pointermove', (e) => {
    if (inicio === null) return;
    const dx = e.clientX - inicio;
    arriba.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
    arriba.querySelector('.meva').style.opacity = String(Math.max(0, Math.min(1, dx / 90)));
    arriba.querySelector('.paso').style.opacity = String(Math.max(0, Math.min(1, -dx / 90)));
  });
  const soltar = (e) => {
    if (inicio === null) return;
    const dx = e.clientX - inicio;
    inicio = null;
    arriba.classList.remove('arrastrando');
    if (Math.abs(dx) > 90) return decidir(dx > 0);
    // No ha llegado: vuelve a su sitio con un rebote.
    arriba.style.transform = '';
    arriba.querySelectorAll('.carta-marca').forEach((m) => (m.style.opacity = '0'));
  };
  arriba.addEventListener('pointerup', soltar);
  arriba.addEventListener('pointercancel', soltar);
}

document.querySelector('[data-decision="meva"]').addEventListener('click', () => decidir(true));
document.querySelector('[data-decision="paso"]').addEventListener('click', () => decidir(false));
document.querySelector('[data-deshacer]').addEventListener('click', () => {
  const anterior = historial.pop();
  if (!anterior) return;
  carta = anterior.carta;
  actualizar({ ...perfil, intereses: anterior.intereses });
});
document.querySelector('[data-barajar]').addEventListener('click', () => {
  carta = 0;
  historial.length = 0;
  pintar();
});
document.querySelector('.pegatinas-lista').addEventListener('click', (e) => {
  const id = e.target.closest('[data-quitar]')?.dataset.quitar;
  if (id) actualizar(decidirInteres(perfil, id, false));
});
// Con el teclado: flechas para decidir la carta de arriba.
document.addEventListener('keydown', (e) => {
  if (pasoActual() !== 'gustos') return;
  if (e.key === 'ArrowRight') decidir(true);
  if (e.key === 'ArrowLeft') decidir(false);
});

// ---------- Paso 3: estilo ----------

const ritmo = document.querySelector('.ritmo-control');
document.querySelector('.ritmo-etiquetas').innerHTML = RITMOS.map(
  (r) => `<button type="button" data-ritmo="${r.id}" aria-pressed="false">${r.nombre}</button>`,
).join('');
ritmo.addEventListener('input', () => actualizar(elegir(perfil, 'ritmo', RITMOS[Number(ritmo.value)].id)));
document.querySelector('.ritmo-etiquetas').addEventListener('click', (e) => {
  const id = e.target.closest('[data-ritmo]')?.dataset.ritmo;
  if (id) actualizar(elegir(perfil, 'ritmo', id));
});

const HUCHA = 'M5 13a6 5 0 0 1 11-3h2.5l.5 2 1.5.5v3l-2 .5-1 2.5h-2v-2h-6v2H7.5l-1-2.5A5 5 0 0 1 5 13zM10 8.5h3M16.5 12.5h.01';
const PERSONAJES = {
  solo: 'M12 3.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM6.5 21v-2.5a5.5 5.5 0 0 1 11 0V21M15.5 12.5l2.5-1 1 5-2 .5',
  pareja: 'M8 6a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM16 6a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 20v-1.5a5 5 0 0 1 9 0M12 18.5a5 5 0 0 1 9 0V20M12 4.2c-.5-.8-1.8-.6-1.8.4 0 .9 1.8 1.9 1.8 1.9s1.8-1 1.8-1.9c0-1-1.3-1.2-1.8-.4',
  familia: 'M8 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 20v-2a5 5 0 0 1 10 0v2M17.5 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM14.5 20v-1a3 3 0 0 1 6 0v1',
  amigos: 'M12 5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM5 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM19 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM8 20v-1.5a4 4 0 0 1 8 0V20M2 19a3.5 3.5 0 0 1 5-3M22 19a3.5 3.5 0 0 0-5-3',
};
const opcion = (campo, id, contenido) => `
  <label class="opcion">
    <input type="radio" name="${campo}" value="${id}" />
    ${contenido}
  </label>`;
document.querySelector('[data-campo="presupuesto"]').innerHTML = PRESUPUESTOS.map((p) =>
  opcion('presupuesto', p.id, `
    <span class="monedas" aria-hidden="true">${'<i></i>'.repeat(p.monedas)}</span>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${HUCHA}" /></svg>
    <strong>${p.nombre}</strong><small>${escapar(p.descripcion)}</small>`),
).join('');
document.querySelector('[data-campo="compania"]').innerHTML = COMPANIAS.map((c) =>
  opcion('compania', c.id, `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${PERSONAJES[c.id]}" /></svg><strong>${c.nombre}</strong>`),
).join('');
document.querySelectorAll('.opciones').forEach((grupo) =>
  grupo.addEventListener('change', (e) => actualizar(elegir(perfil, grupo.dataset.campo, e.target.value))),
);

function pintarEstilo() {
  const indice = RITMOS.findIndex((r) => r.id === perfil.ritmo);
  ritmo.value = String(indice);
  ritmo.setAttribute('aria-valuetext', RITMOS[indice].nombre);
  document.querySelectorAll('[data-ritmo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ritmo === perfil.ritmo)));
  document.querySelector('.ritmo-planes .manuscrito').textContent = `${RITMOS[indice].planes} planes`;
  document.querySelectorAll('.opciones input').forEach((input) => {
    input.checked = perfil[input.name] === input.value;
  });
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
  // Si falta algo de un paso anterior (p. ej. se entra por la URL a #estilo sin gustos), se vuelve a él.
  const pendiente = PASOS.slice(0, PASOS.indexOf(pasoActual())).find((p) => !PUEDE_SEGUIR[p]());
  if (pendiente) {
    history.replaceState(null, '', `#${pendiente}`);
  }
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
  if (paso === 'gustos') pintarGustos();
  if (paso === 'estilo') pintarEstilo();

  const resumen = [perfil.destino ?? 'Elige destino', `${perfil.dias} ${perfil.dias === 1 ? 'día' : 'días'}`];
  const n = perfil.intereses.length;
  if (indice >= 1) resumen.push(n ? `${n} ${n === 1 ? 'gusto' : 'gustos'}` : 'sin gustos');
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
