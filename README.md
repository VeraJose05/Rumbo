# Rumbo
Planificador turístico conversacional con RAG y modelos open source (Genkit + Ollama). TFM de máster en desarrollo con IA.

## Probarlo

**Versión pública:** https://rumbo-8drk.onrender.com (coste 0: Render, Groq y Cloudflare Workers AI
en sus planes gratuitos). Si lleva un rato sin uso, la primera visita tarda 30-60 s en despertar.

### En local

Con Ollama y Chroma en marcha y el corpus indexado (`npm run ingesta`):

```sh
npm run api
```

y abre http://127.0.0.1:3400. La web y la API solo escuchan en el propio equipo.
