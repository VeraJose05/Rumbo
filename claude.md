# Rumbo

Planificador turístico conversacional con RAG y modelos open source. TFM de máster en desarrollo con IA.

## Stack
- TypeScript + Genkit (flows)
- Ollama (LLM y embeddings en local)
- Base vectorial: Chroma (alternativa: Qdrant)
- Corpus: Wikivoyage y Wikipedia, destinos españoles

## Estructura
- src/flows: entrevista, recuperación, planificación
- src/ingest: descarga e indexado del corpus
- src/eval: perfiles de prueba y métricas
- src/config: modelos y modo de ejecución (C0 LLM solo, C1 RAG básico, C2 RAG avanzado)
- docs/requisitos.md: requisitos (RF-xx, RNF-xx) y plan por fases

## Forma de trabajar
- Trabajar por fase y por requisito; indicar siempre qué RF/RNF se implementa.
- TDD en la lógica determinista (troceado, parseo, esquemas Zod, métricas, configuración): escribir el test primero, verlo fallar y luego implementar.
- Los flows con LLM se prueban con un modelo simulado; la calidad real se mide en src/eval, no con tests unitarios.
- Framework de tests: Vitest.
- Antes de cada commit: tests y tipos (tsc) en verde.
- Todo open source y ejecutable en local; sin APIs de pago.
- Comentarios y mensajes de commit en español.
- Prioridad: evaluación antes que extras de interfaz.