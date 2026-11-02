// RF-12, RNF-07: convierte los mensajes y el itinerario de la API en HTML para la web.
// Todo el texto viene del modelo o de la guía, así que se escapa antes de insertarlo.

const FRANJAS = [
  ['manana', 'Mañana'],
  ['tarde', 'Tarde'],
  ['noche', 'Noche'],
];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa un texto para insertarlo en HTML (también en atributos). */
export function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

const enlace = (url, texto) => `<a href="${url}" target="_blank" rel="noopener">${texto}</a>`;

// [texto](url), solo http(s). La URL admite paréntesis equilibrados, como en «Granada_(España)».
const ENLACE_MARKDOWN = /\[([^\]]+)\]\((https?:\/\/(?:[^\s()]|\([^\s()]*\))+)\)/g;

/** Mensaje de chat a HTML: escapado, con los enlaces Markdown de la guía y los saltos de línea. */
export function textoAHtml(texto) {
  return escapar(texto)
    .replace(ENLACE_MARKDOWN, (_, t, url) => enlace(url, t))
    .replace(/\n/g, '<br>');
}

function actividadAHtml(actividad, fuentes) {
  const citas = actividad.citas
    .map((n) => fuentes.get(n))
    .filter(Boolean)
    .map((f) => {
      const titulo = escapar(`${f.fuente} › ${f.seccion}`);
      return `<a class="cita" href="${escapar(f.url)}" target="_blank" rel="noopener" title="${titulo}">${f.cita}</a>`;
    })
    .join('');
  // Lo que no aparece en ninguna fuente puede ser una invención del modelo: se avisa.
  const aviso = actividad.verificacion === 'sin-fuente' ? ' <span class="aviso">sin comprobar</span>' : '';
  return `<li><strong>${escapar(actividad.lugar)}</strong>${citas}${aviso}<p>${escapar(actividad.descripcion)}</p></li>`;
}

/** Itinerario de la API a HTML: cabecera, un bloque por día con sus franjas y las fuentes con su licencia. */
export function itinerarioAHtml(perfil, itinerario) {
  const dias = `${perfil.dias} ${perfil.dias === 1 ? 'día' : 'días'}`;
  const cabecera = `<header><h2>${escapar(perfil.destino)}</h2><p class="subtitulo">${dias}</p></header>`;

  if (!itinerario.hayInformacion) {
    const texto = `No tengo información de ${escapar(perfil.destino)} en mis guías, así que prefiero no inventarme el viaje.`;
    return `<article class="itinerario">${cabecera}<p>${texto}</p></article>`;
  }

  const fuentes = new Map(itinerario.fuentes.map((f) => [f.cita, f]));
  const bloques = itinerario.dias.map((dia) => {
    const franjas = FRANJAS.filter(([clave]) => dia[clave].length)
      .map(([clave, nombre]) => `<div class="franja"><h4>${nombre}</h4><ul>${dia[clave].map((a) => actividadAHtml(a, fuentes)).join('')}</ul></div>`)
      .join('');
    return `<section class="dia"><h3>Día ${dia.dia}</h3>${franjas}</section>`;
  });

  const lista = itinerario.fuentes
    .map((f) => `<li value="${f.cita}">${enlace(escapar(f.url), escapar(`${f.fuente} › ${f.seccion}`))} · ${escapar(f.licencia)}</li>`)
    .join('');
  const pie = lista ? `<details class="fuentes"><summary>Fuentes (${itinerario.fuentes.length})</summary><ol>${lista}</ol></details>` : '';

  return `<article class="itinerario">${cabecera}${bloques.join('')}${pie}</article>`;
}
