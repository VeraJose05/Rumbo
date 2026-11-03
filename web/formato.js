// RF-12, RNF-07: convierte los mensajes y el itinerario de la API en HTML para la web.
// Todo el texto viene del modelo o de la guía, así que se escapa antes de insertarlo.

const FRANJAS = [
  ['manana', 'Mañana'],
  ['tarde', 'Tarde'],
  ['noche', 'Noche'],
];

// Nombres de los intereses para el aviso de cobertura (RF-07).
const INTERESES = {
  monumentos: 'monumentos',
  museos: 'museos',
  gastronomia: 'gastronomía',
  naturaleza: 'naturaleza',
  'ocio-nocturno': 'ocio nocturno',
  compras: 'compras',
  playa: 'playa',
  ninos: 'niños',
};

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

  // RF-07: lo que la guía no cubre no se ha planificado; se dice en vez de rellenarlo.
  const sin = itinerario.interesesSinCobertura ?? [];
  const aviso = sin.length
    ? `<p class="nota-cobertura">La guía de ${escapar(perfil.destino)} no habla de ${sin.map((i) => escapar(INTERESES[i] ?? i)).join(' ni de ')}, así que no lo he incluido.</p>`
    : '';

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

  return `<article class="itinerario">${cabecera}${aviso}${bloques.join('')}${pie}</article>`;
}

// Nombre legible de cada servicio a partir de su host; si no se conoce, el propio host.
const SERVICIOS = { 'api.groq.com': 'Groq', 'api.cloudflare.com': 'Cloudflare' };

/** RNF-09: texto del pie sobre adónde van los mensajes del viajero (HTML escapado). */
export function avisoPrivacidad(proveedores) {
  if (!proveedores.length) return 'Todo se ejecuta en tu equipo';
  const lista = proveedores.map((p) => {
    const modelo = p.modelo.split('/').pop();
    return escapar(`${SERVICIOS[p.servicio] ?? p.servicio} (${modelo})`);
  });
  return `Versión pública: tus mensajes se procesan en ${lista.join(' y ')}, modelos abiertos. No escribas datos personales`;
}
