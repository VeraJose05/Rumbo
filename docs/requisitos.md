# Rumbo · Planificador turístico con RAG (Genkit) – Plan y requisitos

Fecha del documento: 2026-10-13

## Resumen y objetivo

El TFM construye un planificador turístico conversacional que entrevista al viajero y genera un itinerario apoyado en fuentes abiertas, y mide cuánto mejora un RAG frente al mismo modelo sin recuperación.

**Pregunta de investigación:** ¿cuánto mejora un RAG la fidelidad y la relevancia de un itinerario turístico generado por un LLM abierto, frente al mismo LLM sin recuperación?

**Hipótesis**

- H1: el RAG reduce los lugares y datos inventados (mayor fidelidad).
- H2: la búsqueda híbrida con reranking mejora la relevancia respecto a un RAG básico.

**Objetivos**

- OBJ-1: construir un prototipo funcional con Genkit y modelos open source.
- OBJ-2: construir un corpus abierto para 3-5 destinos.
- OBJ-3: evaluar tres configuraciones (LLM solo, RAG básico, RAG avanzado) con métricas y perfiles de viajero de prueba.

## Alcance

El alcance se limita a un prototipo con pocos destinos y una evaluación rigurosa; la cobertura global y la producción quedan fuera.

**Dentro del TFM**

- Entrevista guiada al viajero con perfil estructurado.
- RAG sobre Wikivoyage y Wikipedia para 3-5 destinos españoles.
- Generación de itinerario por días, con fuentes citadas.
- Evaluación comparativa de tres configuraciones.
- Demo web sencilla.

**Fuera del TFM**

- Reservas, pagos o precios en tiempo real.
- Cobertura mundial de destinos.
- Cuentas de usuario, historial persistente y app móvil.
- Optimización de rutas con mapas de pago.

## Requisitos funcionales

13 requisitos funcionales: 8 imprescindibles (Must) para el núcleo del RAG y la evaluación, 3 Should y 2 Could que se recortan si falta tiempo. Los criterios de aceptación son una primera propuesta para ir afinando.

| ID | Requisito | Prioridad | Criterio de aceptación | Estado |
| --- | --- | --- | --- | --- |
| RF-01 | Entrevista guiada: el sistema pregunta destino, días, intereses, ritmo, presupuesto y compañía hasta completar el perfil. | Must | El perfil queda completo en la mayoría de conversaciones de prueba sin intervención manual. | Borrador |
| RF-02 | Perfil estructurado del viajero validado con un esquema (Zod). | Must | Un perfil inválido o incompleto no pasa a la fase de planificación. | Borrador |
| RF-03 | Ingesta de Wikivoyage y Wikipedia: descarga, limpieza, troceado y embeddings por destino. | Must | Cada destino inicial queda indexado y consultable con sus metadatos (destino, fuente, URL). | Borrador |
| RF-04 | Recuperación de fragmentos relevantes según el perfil, con top-k configurable. | Must | Para un perfil de prueba devuelve fragmentos del destino correcto. | Borrador |
| RF-05 | Generación del itinerario día a día en JSON estructurado (mañana, tarde, noche). | Must | La salida valida contra el esquema y cubre todos los días pedidos. | Borrador |
| RF-06 | Cada recomendación cita el fragmento fuente del que procede. | Must | Toda actividad del itinerario enlaza a una fuente recuperada. | Borrador |
| RF-07 | Si no hay datos suficientes, el sistema lo indica en vez de inventar. | Should | Ante un destino fuera del corpus responde que no tiene información. | Borrador |
| RF-08 | Modelo de lenguaje y de embeddings intercambiables por configuración (Ollama). | Must | Cambiar de modelo solo requiere modificar la configuración. | Borrador |
| RF-09 | Tres modos de ejecución para el experimento: LLM solo, RAG básico y RAG avanzado. | Must | El mismo perfil se puede ejecutar en los tres modos desde un parámetro. | Borrador |
| RF-10 | Herramienta de clima (Open-Meteo) para adaptar las actividades. | Could | El itinerario menciona el clima previsto y ajusta actividades al aire libre. | Borrador |
| RF-11 | Ajuste del itinerario por chat («más tranquilo», «quita museos»). | Should | Una petición de cambio modifica solo las partes afectadas. | Borrador |
| RF-12 | Interfaz web de demo. | Should | Se puede completar entrevista y ver el itinerario sin usar la consola. | Borrador |
| RF-13 | Exportar el itinerario a Markdown o PDF. | Could | El archivo exportado contiene el itinerario completo y sus fuentes. | Borrador |

## Requisitos no funcionales

Fijan las restricciones que hacen defendible el trabajo: stack abierto, ejecución local y experimentos reproducibles.

| ID | Requisito | Criterio de aceptación | Estado |
| --- | --- | --- | --- |
| RNF-01 | Todo el stack usa software con licencia abierta. | Cada dependencia principal figura con su licencia en la memoria. | Borrador |
| RNF-02 | Ejecución local con modelos abiertos, sin depender de APIs de pago. | El sistema completo funciona con Ollama en el equipo (hardware por confirmar). | Borrador |
| RNF-03 | Experimentos reproducibles. | Versiones fijadas, semillas y un comando que repite la evaluación completa. | Borrador |
| RNF-04 | Trazabilidad de cada ejecución. | Se registran configuración, fragmentos recuperados y salida (trazas de Genkit). | Borrador |
| RNF-05 | Idioma español en entrevista, corpus de prueba e itinerario. | Los embeddings elegidos rinden bien en español. | Borrador |
| RNF-06 | Latencia aceptable en la demo. | Umbral por definir tras medir en el equipo real. | Borrador |
| RNF-07 | Cumplimiento de licencias de los datos. | Atribución visible a Wikivoyage, Wikipedia (CC BY-SA) y OpenStreetMap (ODbL). | Borrador |
| RNF-08 | Código mantenible. | Flows separados por responsabilidad, README y pruebas mínimas. | Borrador |
| RNF-09 | Privacidad del viajero. | Los datos del perfil no salen del equipo. | Borrador |

## Datos y fuentes

El corpus se construye solo con fuentes abiertas; Wikivoyage es la base porque ya está escrita como guía de viaje. Licencias pendientes de verificar antes de citarlas en la memoria.

| Fuente | Uso en el proyecto | Licencia | En el RAG |
| --- | --- | --- | --- |
| Wikivoyage | Corpus principal: qué ver, hacer, comer y moverse por destino. | CC BY-SA | Sí |
| Wikipedia | Contexto histórico y cultural de cada destino. | CC BY-SA | Sí |
| OpenStreetMap | Coordenadas y tipo de lugar para comprobar que los sitios existen. | ODbL | Opcional |
| Open-Meteo | Previsión del clima como herramienta de consulta. | Uso gratuito sin clave | No (tool) |

**Destinos iniciales (propuesta, a confirmar):** Madrid, Barcelona, Sevilla, Granada y Valencia. Con 3 es suficiente si el tiempo aprieta; los otros 2 son ampliación.

**Metadatos por fragmento:** destino, fuente, URL, sección y fecha de descarga, para poder citar y filtrar por destino.

## Arquitectura y stack

La aplicación son tres flows de Genkit que comparten una base vectorial y unos modelos locales; la ingesta se ejecuta aparte, una vez por destino.

```
Interfaz web de demo
   │ mensajes                         ▲ itinerario
   ▼                                  │
Flow 1 · Entrevista ──perfil──▶ Flow 2 · Recuperación ──textos──▶ Flow 3 · Planificación ◀── Clima (Open-Meteo, opcional)
                                      ▲
                                      │ top-k
Ingesta (offline) ──índice──▶ Base vectorial (Chroma o Qdrant)

Todos los flows y la ingesta usan Ollama (LLM y embeddings).
```

El flow de recuperación es el núcleo del RAG y lo que cambia entre las configuraciones que se evaluarán.

| Capa | Opción propuesta | Alternativa |
| --- | --- | --- |
| Orquestación | Genkit (TypeScript) | LlamaIndex |
| LLM | Llama, Mistral o Qwen con Ollama | vLLM si hay GPU |
| Embeddings | BGE-M3 o multilingual-e5 | multilingual-e5-small (más ligero) |
| Base vectorial | Chroma | Qdrant |
| Reranking | Cross-encoder tipo bge-reranker | Sin reranker (configuración base) |
| Evaluación | Evaluadores de Genkit | RAGAS o DeepEval en un script Python aparte |
| Interfaz | Web sencilla + Genkit Developer UI | Streamlit si se pasa a Python |

RAGAS y DeepEval son librerías de Python: con Genkit en TypeScript, la evaluación se hace con los evaluadores de Genkit o con un script Python aparte que lea las trazas.

## Evaluación

Compara tres configuraciones con el mismo modelo y los mismos perfiles de viajero, de modo que la única diferencia sea la recuperación.

| Configuración | Recuperación | Reranking | Qué aporta a la comparación |
| --- | --- | --- | --- |
| C0 · LLM solo | Ninguna | No | Línea base: cuánto inventa el modelo sin datos |
| C1 · RAG básico | Búsqueda vectorial, top-k fijo | No | Efecto de anclar el itinerario a fuentes |
| C2 · RAG avanzado | Híbrida (vectorial + palabras clave) | Cross-encoder | Efecto de mejorar la recuperación |

| Métrica | Qué mide | Cómo se calcula |
| --- | --- | --- |
| Fidelidad | Que los lugares del itinerario existan y salgan de las fuentes | Lugares verificados en los fragmentos recuperados u OpenStreetMap, entre lugares citados |
| Relevancia | Que el plan encaje con los intereses del perfil | Rúbrica de 1 a 5 aplicada por un LLM como juez |
| Viabilidad | Que el plan sea realizable en tiempo y distancia | Rúbrica de 1 a 5 más una regla simple de actividades por día según el ritmo |
| Cobertura de citas | Que cada actividad tenga fuente | Actividades con cita, entre actividades totales |
| Latencia | Coste de cada configuración | Segundos por itinerario en el mismo equipo |

**Conjunto de prueba:** 20-30 perfiles sintéticos de viajero que varían destino, días, intereses, ritmo y compañía, con algunos casos difíciles (destino fuera del corpus, intereses contradictorios).

**Validación del juez:** revisar a mano una muestra de itinerarios (por ejemplo 10) y comparar con la nota del LLM juez, para poder defender que la métrica es fiable.

**Análisis:** medias por configuración y por destino, y una selección de casos concretos donde el RAG acierta y donde falla. Con tan pocos perfiles no se promete significación estadística; se reportan diferencias y ejemplos.

## Plan de desarrollo

El orden prioriza tener cuanto antes un sistema completo y medible: la interfaz y los extras van después de la evaluación, no antes. Las fases no llevan duración hasta confirmar la fecha de entrega.

| Fase | Qué se hace | Requisitos | Criterio de salida |
| --- | --- | --- | --- |
| F0 · Preparación | Instalar Ollama y Genkit, crear el repositorio, elegir modelos y destinos | RNF-02, RNF-03 | Un flow de prueba responde con un modelo local |
| F1 · Corpus e ingesta | Descargar Wikivoyage y Wikipedia de los destinos, limpiar, trocear, generar embeddings e indexar | RF-03, RNF-07 | Cada destino se puede consultar en la base vectorial |
| F2 · RAG básico | Flow de recuperación y generación con fuentes | RF-04, RF-06 | Una pregunta sobre un destino devuelve respuesta con citas |
| F3 · Entrevista | Flow que pregunta hasta completar el perfil validado | RF-01, RF-02 | La entrevista produce un perfil válido |
| F4 · Planificación completa | Itinerario JSON día a día en los tres modos de ejecución | RF-05, RF-07, RF-08, RF-09 | Sistema de extremo a extremo (MVP) funcionando |
| F5 · Evaluación | Crear los perfiles de prueba, implementar métricas, ejecutar C0, C1 y C2 | RNF-03, RNF-04 | Tabla de resultados por configuración y por métrica |
| F6 · Demo y extras | Interfaz web, ajuste por chat, clima y exportación, según tiempo | RF-10, RF-11, RF-12, RF-13 | Demo utilizable sin consola |
| F7 · Memoria | Redactar en paralelo desde F2 y cerrar con los resultados | Todos | Memoria completa con resultados y conclusiones |

**Regla de recorte:** si el tiempo aprieta, se sacrifica F6 antes que F5. Sin evaluación no hay TFM; sin demo bonita, sí.

## Riesgos

Los dos riesgos que más pueden costar tiempo son el hardware limitado y el crecimiento del alcance; ambos se atajan con decisiones tempranas.

| Riesgo | Efecto | Mitigación |
| --- | --- | --- |
| Sin GPU o con poca memoria | Respuestas lentas, evaluación larga | Modelos pequeños cuantizados, probar en F0 y reducir perfiles si hace falta |
| El modelo pequeño no respeta el JSON | Itinerarios que no validan | Salida estructurada de Genkit, validación con Zod y reintentos |
| Embeddings flojos en español | Recuperación irrelevante | Comparar BGE-M3 y multilingual-e5 con unas pocas consultas antes de fijar |
| Destino con poco contenido en Wikivoyage | Itinerarios pobres y evaluación sesgada | Elegir ciudades con buena cobertura |
| Juez LLM poco fiable | Métricas discutibles | Mismo juez en las tres configuraciones y revisión manual de una muestra |
| El alcance crece (entrevista, interfaz) | La evaluación se queda sin tiempo | Requisitos Could/Should se recortan primero |
| Herramientas de evaluación en Python con Genkit en TypeScript | Retraso en F5 | Decidir en F0 entre evaluadores de Genkit o script Python aparte |

## Estructura propuesta de la memoria

1. Introducción, motivación y objetivos
2. Estado del arte: RAG, LLM abiertos y asistentes de planificación turística
3. Diseño: requisitos y arquitectura
4. Implementación: ingesta, flows y decisiones técnicas
5. Evaluación y resultados
6. Conclusiones y trabajo futuro
7. Anexos: prompts, esquemas y perfiles de prueba

## Registro de mejoras por requisito

Una fila por cambio en un requisito.

| Fecha | Requisito | Qué cambia | Motivo |
| --- | --- | --- | --- |