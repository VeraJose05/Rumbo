# Rumbo

**Planifica conversando. Viaja con fundamento.**

Rumbo es un planificador de viajes por España que arma itinerarios día a día **solo con lugares que
aparecen en sus fuentes** (Wikivoyage, Wikipedia y OpenStreetMap), y cada uno con su sitio en el mapa. Cada parada lleva la cita literal de la guía de la que sale, y si
la guía no cubre lo que pides, Rumbo lo dice en vez de inventárselo. Funciona como una web móvil
instalable (PWA) con estética de cuaderno de viaje: billete, postales, pasaporte con sellos e
insignias.

TFM del máster de Desarrollo con IA (BIG school).

- **Demo pública:** https://rumbo-8drk.onrender.com — coste 0 (planes gratuitos de Render, Groq y
  Cloudflare Workers AI). Si lleva un rato sin uso, la primera visita tarda 30-60 s en despertar.
- **Credenciales de prueba:** no hacen falta. Rumbo no tiene registro ni cuentas: los viajes guardados
  y el pasaporte viven en el navegador del usuario (con copia exportable).

## El problema

Un LLM pide sitios con soltura, pero se los inventa o los cambia de ciudad: en la evaluación, el
modelo sin datos propuso la Casa de Pilatos (Sevilla) en un plan de Granada y el Café Gijón (Madrid)
en uno de Sevilla. Rumbo usa **RAG** (generación aumentada con recuperación) sobre las guías de
Wikivoyage para que cada actividad salga de una fuente que se puede comprobar.

## Funcionalidades

- **Dos formas de empezar:** un recorrido guiado (destino y días → gustos con cartas → ritmo,
  presupuesto y compañía → billete) o una **charla con Rumbo** que completa el perfil conversando y
  responde dudas con la guía.
- **Itinerario como un camino:** días en etiquetas de equipaje y una parada por actividad (mañana,
  tarde y noche). Cada parada abre una **postal** con la cita de la guía, su sección, su fuente y
  su licencia, y marca si el lugar está verificado en la guía.
- **Ajustes por mensaje:** «más tranquilo», «un día más», «quita la Catedral»… Solo se regeneran los
  días afectados.
- **Honestidad ante la falta de datos:** destinos fuera de la guía o intereses que la guía no cubre
  (p. ej. playa en Madrid) se avisan, no se rellenan.
- **Mapa del día** a pantalla completa: paradas numeradas en orden y un carrusel enlazado con
  ellas; «Cómo llegar» y «Ruta del día» abren Google Maps a pie. El planificador cambia los lugares
  que no se pueden situar (locales cerrados, zonas genéricas) y no repite el mismo sitio con otro nombre.
- **Mis viajes:** guarda itinerarios en el móvil y vuelve a ellos (los ajustes actualizan la copia).
- **Pasaporte:** «¡Estuve aquí!» en cada lugar; sellos por ciudad e insignias (Tapeador, Noctámbulo,
  Explorador, Trotamundos…) según la sección de la guía del lugar. Exportar/importar en un archivo.
- **PWA:** instalable en el móvil y usable sin conexión para lo ya guardado.
- **Privacidad:** sin cuentas; la web avisa de qué proveedores externos procesan los mensajes en la
  versión pública. En local, nada sale del equipo.

Destinos con guía: **Sevilla, Madrid, Barcelona, Granada y Valencia**.

### Fuentes

| Fuente | Qué aporta | Lugares |
| --- | --- | --- |
| [Wikivoyage](https://es.wikivoyage.org) | La guía: qué ver, comer, salir, cómo moverse | 337 fragmentos |
| [Wikipedia](https://es.wikipedia.org) (vía Wikidata) | Monumentos, museos, parques y barrios, con coordenadas | 1002 |
| [OpenStreetMap](https://www.openstreetmap.org) (vía Overpass) | Restaurantes, bares, cafeterías y ocio nocturno actuales | 822 |

Las coordenadas de los lugares de Wikivoyage se buscaron una vez con Nominatim (OSM) y Wikipedia.

## Cómo funciona

```
Perfil (entrevista o recorrido)
   │
   ▼
Recuperación ── bge-m3 (embeddings) ─▶ índice vectorial (2161 fragmentos de 3 fuentes)
   │                                    C2: + búsqueda por palabras + reranker
   ▼
Planificación día a día (LLM, salida JSON validada con Zod)
   │
   ▼
Verificación: cada lugar se busca en los fragmentos ─▶ ✓ guía / ~ parecido / sin fuente
   │                y en el mapa: si no se puede situar, se pide otro
```

Tres modos de ejecución, para medir qué aporta la recuperación con el mismo modelo y los mismos
perfiles (`src/config`):

| Modo | Recuperación | Fidelidad¹ con qwen2.5:3b | Fidelidad¹ con gpt-oss-120b | Notas |
| --- | --- | --- | --- | --- |
| C0 · LLM solo | ninguna | 0,51–0,60 | 0,58–0,70 | planifica incluso destinos fuera del corpus |
| C1 · RAG básico | vectorial, top-k | 0,99 | 1,00 | **el que usa la web**; se niega fuera del corpus |
| C2 · RAG avanzado | híbrida + reranker | ≈ C1² | — | 2,5× más lento; comparte el 68 % de los fragmentos con C1 |

¹ Proporción de lugares del itinerario que aparecen en alguna fuente del destino (Wikivoyage,
Wikipedia u OpenStreetMap, 2161 fragmentos), sobre 25 perfiles de prueba (intervalo entre una regla
estricta y una laxa; incluye 3 destinos fuera del corpus, donde C0 lo inventa todo y C1 se niega).
Un modelo grande conoce más sitios reales, pero incluso en los destinos del corpus, sin fuentes, entre
un 21 % y un 34 % de sus lugares no aparecen en ninguna (32–41 % con qwen2.5:3b). Con RAG existen el 99–100 %
y cada uno lleva su cita. Detalle en `docs/requisitos.md` y `src/eval`.

² Medido con el corpus inicial (solo Wikivoyage); con ese corpus, C0 daba 0,36–0,44 y C1 0,93–0,96.

## Stack

| Parte | Tecnología |
| --- | --- |
| Lógica de IA | TypeScript, [Genkit](https://genkit.dev) (flows), Zod |
| LLM | Local: Ollama (`qwen2.5:3b`). Público: `openai/gpt-oss-120b` en Groq (API compatible con OpenAI) |
| Embeddings | `bge-m3`. Local: Ollama. Público: Cloudflare Workers AI (mismo modelo, mismos vectores) |
| Base vectorial | Chroma (local) o índice exportado en memoria (`indice/destinos.json`, en producción) |
| Reranker (C2) | `BAAI/bge-reranker-v2-m3` con Text Embeddings Inference (Docker) |
| Servidor | Express 4 (sirve la API de los flows y la web) |
| Web | React 19, TypeScript, Vite, iconos Lucide; PWA con service worker propio |
| Mapa | MapLibre GL con mapas vectoriales de OpenFreeMap (gratis, sin clave); navegación con Google Maps (enlaces) |
| Tests | Vitest, Testing Library (jsdom) |
| Despliegue | Render (plan gratuito, `render.yaml`) |

Todo el software y los modelos son abiertos. Datos de OpenStreetMap bajo ODbL; textos de Wikivoyage y Wikipedia y fotos de Wikimedia Commons bajo
CC BY-SA, con atribución visible en la web.

## Instalación

Requisitos: **Node 24** o superior.

```sh
git clone https://github.com/VeraJose05/Rumbo.git
cd Rumbo
npm ci
cp .env.example .env
```

### Opción A · sin GPU ni Docker (como la demo pública)

Usa el índice ya exportado del repositorio y proveedores gratuitos. En `.env`:

```sh
RUMBO_INDICE=indice/destinos.json
RUMBO_LLM=openai/gpt-oss-120b
RUMBO_LLM_URL=https://api.groq.com/openai/v1
RUMBO_LLM_CLAVE=<clave de Groq>
RUMBO_EMBEDDER_URL=https://api.cloudflare.com/client/v4/accounts/<cuenta>/ai/run/@cf/baai/bge-m3
RUMBO_EMBEDDER_CLAVE=<token de Cloudflare Workers AI>
```

Las claves de Groq y de Cloudflare son gratuitas y no piden tarjeta. Van solo en `.env`, que git
ignora.

### Opción B · todo en local, sin salir del equipo

Con [Ollama](https://ollama.com) y Docker:

```sh
ollama pull qwen2.5:3b && ollama pull bge-m3
docker compose up -d chroma        # y «reranker» para el modo C2
npm run ingesta                    # descarga Wikivoyage, trocea e indexa en Chroma
npm run ingesta:wikipedia          # lugares de Wikipedia (Wikidata) con su resumen
npm run ingesta:osm                # restaurantes, bares y noche de OpenStreetMap
npm run coordenadas                # sitúa en el mapa los lugares de Wikivoyage
```

### Arrancar

```sh
npm run api        # compila y sirve web + API en http://127.0.0.1:3400
```

Para desarrollar la web con recarga en caliente: `npm run api` en una terminal y `npm run web` en
otra (http://127.0.0.1:5173).

### Otros comandos

| Comando | Qué hace |
| --- | --- |
| `npm test` | tests (backend y web) |
| `npm run typecheck` | tipos de backend, web y configuración |
| `npm run evaluar` | ejecuta los perfiles de prueba en C0, C1 y C2 |
| `npm run juzgar` / `npm run tabla` | puntúa con un LLM juez y muestra la tabla de resultados |
| `npm run exportar-indice` | exporta Chroma a `indice/destinos.json` para producción |
| `npm run dev` | Genkit Developer UI para inspeccionar flows y trazas |

## Estructura

```
src/
  flows/       entrevista, recuperación (C1/C2), planificación, ajuste y verificación de citas
  ingest/      descarga de Wikivoyage, limpieza del wikitexto, troceado e indexado
  almacen/     base vectorial: Chroma o índice en memoria
  modelos/     Ollama, LLM remoto (OpenAI-compatible) y embedder remoto, reranker
  config/      modelos, modo de ejecución, destinos y cobertura destino × interés
  eval/        perfiles de prueba, métricas, juez LLM y tablas
  servidor.ts  Express: API de los flows y la web compilada
web/
  src/pantallas/   portada, recorrido, preparando, itinerario, postal, chat, pasaporte, Mis viajes
  src/viaje/       perfil, pasos y llamadas a la API
  src/cuaderno/    viajes guardados y pasaporte (localStorage)
  pwa/             service worker y plugin de Vite que genera su lista de caché
  public/          fotos (Commons), fuentes (OFL), marca, iconos y manifest
indice/        índice vectorial exportado (producción)
docs/          requisitos y plan por fases; marca (logo, colores, diseño)
render.yaml    despliegue en Render
```

## Despliegue

`render.yaml` describe el servicio (Blueprint de Render). Cada push a `main` lo redespliega. Las
claves (`RUMBO_LLM_CLAVE`, `RUMBO_EMBEDDER_URL`, `RUMBO_EMBEDDER_CLAVE`) se introducen en el panel
de Render. Si se agota la cuota gratuita de Groq, la web lo avisa en lugar de fallar.

## Licencia

Código bajo licencia MIT (`LICENSE`), © 2026 Jose Vera Castillo. Contenidos de Wikivoyage y fotos de Wikimedia Commons: CC BY-SA, con sus
autores citados en la web. Fuentes Fraunces, Inter y Caveat: SIL Open Font License.
