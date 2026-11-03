// RF-12: lógica de la web de Rumbo. La API no guarda estado: aquí se guarda el de la entrevista y
// se envía en cada mensaje. Al confirmar el perfil se planifica con C1 (RAG básico): en la
// evaluación, C2 no mejoraba los resultados y tardaba 2,5 veces más. Con el itinerario hecho, los
// mensajes son ajustes («más tranquilo», «quita la Catedral»: RF-11).
import { escapar, itinerarioAHtml, textoAHtml } from './formato.js';

const MODO = 'C1';

const mensajes = document.querySelector('#mensajes');
const conversacion = document.querySelector('#conversacion');
const sugerencias = document.querySelector('#sugerencias');
const formulario = document.querySelector('#formulario');
const entrada = document.querySelector('#entrada');
const enviar = document.querySelector('#enviar');

let estado = null;
let ocupado = false;
// Con el itinerario hecho se guardan el perfil y el itinerario para ajustarlos.
let viaje = null;
// Cada conversación tiene un número: si se pulsa «Nuevo viaje» con una respuesta en camino, esa
// respuesta llega a una conversación que ya no existe y se descarta.
let conversacionActual = 0;

async function llamar(flow, data) {
  const respuesta = await fetch(`/${flow}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || !('result' in cuerpo)) {
    // Genkit responde {status, message}; con 429 (cuota gratuita agotada, RNF-10) el mensaje es para el viajero.
    const error = new Error(cuerpo.message ?? cuerpo.error?.message ?? `error ${respuesta.status}`);
    error.cuota = respuesta.status === 429;
    throw error;
  }
  return cuerpo.result;
}

function bajar() {
  conversacion.scrollTo({ top: conversacion.scrollHeight, behavior: 'smooth' });
}

function anadir(rol, html, clase = '') {
  const elemento = document.createElement('div');
  elemento.className = `mensaje ${rol} ${clase}`.trim();
  elemento.innerHTML = `<div class="burbuja">${html}</div>`;
  mensajes.append(elemento);
  bajar();
  return elemento;
}

const ESCRIBIENDO = '<span class="escribiendo" aria-label="Rumbo está escribiendo"><span></span><span></span><span></span></span>';

function actualizarControles() {
  enviar.disabled = ocupado || !entrada.value.trim();
  entrada.placeholder = viaje ? '¿Quieres cambiar algo del itinerario?' : 'Escribe tu mensaje…';
}

/** Hace una llamada mostrando el indicador; si falla, deja un aviso con «Reintentar». */
async function conIndicador(accion, reintentar, nota = '') {
  const numero = conversacionActual;
  const indicador = anadir('rumbo', ESCRIBIENDO + (nota ? `<span class="nota">${nota}</span>` : ''));
  ocupado = true;
  actualizarControles();
  try {
    const resultado = await accion();
    return numero === conversacionActual ? resultado : null;
  } catch (error) {
    if (numero !== conversacionActual) return null;
    const texto = error.cuota ? escapar(error.message) : `No he podido contactar con el servidor de Rumbo (${escapar(error.message)}).`;
    const aviso = anadir('rumbo', texto, 'error');
    const boton = document.createElement('button');
    boton.className = 'boton-secundario';
    boton.textContent = 'Reintentar';
    boton.onclick = () => {
      aviso.remove();
      reintentar();
    };
    aviso.querySelector('.burbuja').append(boton);
    return null;
  } finally {
    indicador.remove();
    if (numero === conversacionActual) {
      ocupado = false;
      actualizarControles();
    }
  }
}

async function empezar() {
  conversacionActual += 1;
  estado = null;
  viaje = null;
  ocupado = false;
  mensajes.replaceChildren();
  sugerencias.hidden = true;
  entrada.value = '';
  ajustarAltura();
  actualizarControles();

  const turno = await conIndicador(() => llamar('entrevistaFlow', { mensaje: '' }), empezar);
  if (!turno) return;
  estado = turno.estado;
  anadir('rumbo', textoAHtml(turno.respuesta));
  sugerencias.hidden = false;
  entrada.focus();
}

async function responder(texto) {
  const turno = await conIndicador(() => llamar('entrevistaFlow', { estado, mensaje: texto }), () => responder(texto));
  if (!turno) return;
  estado = turno.estado;
  anadir('rumbo', textoAHtml(turno.respuesta));
  if (turno.perfil) await planificar(turno.perfil);
}

async function planificar(perfil) {
  const itinerario = await conIndicador(
    () => llamar('planificacionFlow', { perfil, modo: MODO }),
    () => planificar(perfil),
    'Preparando tu itinerario con las guías de viaje; tarda unos segundos…',
  );
  if (!itinerario) return;
  anadir('rumbo', itinerarioAHtml(perfil, itinerario), 'tarjeta');
  anadir('rumbo', '¿Quieres cambiar algo? Por ejemplo, «más tranquilo», «quita la Catedral», «añade museos» o «un día más». Si no, ¡buen viaje!');
  viaje = { perfil, itinerario, quitados: [] };
  actualizarControles();
}

async function ajustar(texto) {
  const resultado = await conIndicador(
    () => llamar('ajusteFlow', { ...viaje, mensaje: texto }),
    () => ajustar(texto),
    'Ajustando el itinerario…',
  );
  if (!resultado) return;
  anadir('rumbo', textoAHtml(resultado.respuesta));
  // Solo se vuelve a mostrar la tarjeta si ha cambiado algo.
  if (JSON.stringify(resultado.itinerario) !== JSON.stringify(viaje.itinerario)) {
    anadir('rumbo', itinerarioAHtml(resultado.perfil, resultado.itinerario), 'tarjeta');
  }
  viaje = { perfil: resultado.perfil, itinerario: resultado.itinerario, quitados: resultado.quitados };
}

function mandar(texto) {
  texto = texto.trim();
  if (!texto || ocupado) return;
  sugerencias.hidden = true;
  anadir('viajero', escapar(texto).replace(/\n/g, '<br>'));
  entrada.value = '';
  ajustarAltura();
  if (viaje) ajustar(texto);
  else responder(texto);
}

function ajustarAltura() {
  entrada.style.height = 'auto';
  entrada.style.height = `${entrada.scrollHeight}px`;
  actualizarControles();
}

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  mandar(entrada.value);
});

// Intro envía; Mayúsculas+Intro hace un salto de línea.
entrada.addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter' && !evento.shiftKey && !evento.isComposing) {
    evento.preventDefault();
    mandar(entrada.value);
  }
});

entrada.addEventListener('input', ajustarAltura);

sugerencias.addEventListener('click', (evento) => {
  if (evento.target instanceof HTMLButtonElement) mandar(evento.target.textContent);
});

document.querySelector('#nuevo').addEventListener('click', empezar);

empezar();
