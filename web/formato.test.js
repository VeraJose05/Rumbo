// RF-12, RNF-07: formato de los mensajes y del itinerario en la web.
import { describe, expect, it } from 'vitest';
import { itinerarioAHtml, textoAHtml } from './formato.js';

describe('textoAHtml', () => {
  it('escapa el HTML: el texto viene del modelo y de la guía', () => {
    expect(textoAHtml('<img src=x onerror=alert(1)> & "ya"')).toBe('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;ya&quot;');
  });

  it('convierte los enlaces Markdown a la guía en enlaces que se abren aparte', () => {
    expect(textoAHtml('Tapas en el centro. ([Wikivoyage](https://es.wikivoyage.org/wiki/Granada_(Espa%C3%B1a)))')).toBe(
      'Tapas en el centro. (<a href="https://es.wikivoyage.org/wiki/Granada_(Espa%C3%B1a)" target="_blank" rel="noopener">Wikivoyage</a>)',
    );
  });

  it('no convierte enlaces que no sean http o https', () => {
    expect(textoAHtml('[pulsa](javascript:alert(1))')).toBe('[pulsa](javascript:alert(1))');
  });

  it('respeta los saltos de línea', () => {
    expect(textoAHtml('Hola\nqué tal')).toBe('Hola<br>qué tal');
  });
});

const fuente = { cita: 1, fuente: 'Wikivoyage', seccion: 'Ver', url: 'https://es.wikivoyage.org/wiki/Granada', licencia: 'CC BY-SA 4.0' };
const actividad = (lugar, verificacion = 'verificada', citas = [1]) => ({ lugar, descripcion: `Visita a ${lugar}.`, citas, verificacion });
const perfil = { destino: 'Granada', dias: 1 };
const itinerario = (dias, extra = {}) => ({ modo: 'C1', hayInformacion: true, dias, fuentes: [fuente], ...extra });

describe('itinerarioAHtml', () => {
  it('pone de cabecera el destino y los días', () => {
    const html = itinerarioAHtml({ destino: 'Granada', dias: 3 }, itinerario([]));
    expect(html).toContain('<h2>Granada</h2>');
    expect(html).toContain('3 días');
  });

  it('dice «1 día» en singular', () => {
    expect(itinerarioAHtml(perfil, itinerario([]))).toContain('1 día<');
  });

  it('muestra cada día con sus franjas y actividades, y salta las franjas vacías', () => {
    const html = itinerarioAHtml(perfil, itinerario([{ dia: 1, manana: [actividad('Alhambra')], tarde: [], noche: [actividad('Albaicín')] }]));
    expect(html).toContain('Día 1');
    expect(html).toContain('Mañana');
    expect(html).not.toContain('Tarde');
    expect(html).toContain('Noche');
    expect(html).toContain('<strong>Alhambra</strong>');
    expect(html).toContain('Visita a Albaicín.');
  });

  it('enlaza cada cita a su fuente', () => {
    const html = itinerarioAHtml(perfil, itinerario([{ dia: 1, manana: [actividad('Alhambra')], tarde: [], noche: [] }]));
    expect(html).toContain('<a class="cita" href="https://es.wikivoyage.org/wiki/Granada" target="_blank" rel="noopener" title="Wikivoyage › Ver">1</a>');
  });

  it('marca como «sin comprobar» lo que no aparece en ninguna fuente', () => {
    const html = itinerarioAHtml(perfil, itinerario([{ dia: 1, manana: [actividad('Sitio raro', 'sin-fuente', [])], tarde: [], noche: [] }]));
    expect(html).toContain('sin comprobar');
  });

  it('escapa lo que escribe el modelo', () => {
    const html = itinerarioAHtml(perfil, itinerario([{ dia: 1, manana: [actividad('<script>x</script>')], tarde: [], noche: [] }]));
    expect(html).not.toContain('<script>');
  });

  it('lista las fuentes con su licencia (atribución, RNF-07)', () => {
    const html = itinerarioAHtml(perfil, itinerario([]));
    expect(html).toContain('Wikivoyage › Ver');
    expect(html).toContain('CC BY-SA 4.0');
  });

  it('sin información del destino, lo dice en vez de planificar', () => {
    const html = itinerarioAHtml(perfil, itinerario([], { hayInformacion: false, fuentes: [] }));
    expect(html).toContain('No tengo información de Granada');
  });
});
