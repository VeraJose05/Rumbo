# F6 (RF-12): demo web de Rumbo con Gradio. Cliente de la API de Genkit (npm run api), que hace
# todo el trabajo; aquí solo se guarda el estado de la conversación y se muestra el resultado.
# Arrancar: npm run api (en otra terminal) y demo/.venv/bin/python demo/app.py
import os
import time

import gradio as gr
import requests

from formato import formatear_itinerario

API = os.environ.get("RUMBO_API", "http://127.0.0.1:3400")
MODOS = [("C0 · LLM solo (sin fuentes)", "C0"), ("C1 · RAG básico", "C1"), ("C2 · RAG avanzado (más lento)", "C2")]
SIN_ITINERARIO = "*El itinerario aparecerá aquí cuando completes la entrevista.*"


def llamar(flow: str, datos: dict) -> dict:
    """Llama a un flow de la API; los errores se muestran en la interfaz en vez de romperla."""
    try:
        respuesta = requests.post(f"{API}/{flow}", json={"data": datos}, timeout=900)
    except requests.ConnectionError:
        raise gr.Error(f"No puedo conectar con la API de Rumbo en {API}. Arráncala con: npm run api")
    cuerpo = respuesta.json() if respuesta.headers.get("content-type", "").startswith("application/json") else {}
    if not respuesta.ok or "result" not in cuerpo:
        raise gr.Error(f"La API respondió {respuesta.status_code}: {cuerpo.get('error') or respuesta.text[:200]}")
    return cuerpo["result"]


def planificar(perfil: dict, modo: str) -> str:
    inicio = time.perf_counter()
    itinerario = llamar("planificacionFlow", {"perfil": perfil, "modo": modo})
    return formatear_itinerario(perfil, itinerario, time.perf_counter() - inicio)


def empezar():
    turno = llamar("entrevistaFlow", {"mensaje": ""})
    return [{"role": "assistant", "content": turno["respuesta"]}], turno["estado"], None, SIN_ITINERARIO


def responder(mensaje: str, historial: list, estado: dict, perfil: dict | None, modo: str, itinerario: str):
    if not mensaje.strip():
        yield "", historial, estado, perfil, itinerario
        return
    historial = historial + [{"role": "user", "content": mensaje}]
    yield "", historial, estado, perfil, itinerario

    turno = llamar("entrevistaFlow", {"estado": estado, "mensaje": mensaje})
    historial = historial + [{"role": "assistant", "content": turno["respuesta"]}]
    if not turno["perfil"]:
        yield "", historial, turno["estado"], perfil, itinerario
        return

    # Perfil confirmado: se planifica con el modo elegido.
    aviso = f"Preparando tu itinerario con {modo}…" + (" (C2 puede tardar un minuto)" if modo == "C2" else "")
    yield "", historial + [{"role": "assistant", "content": aviso}], turno["estado"], turno["perfil"], f"*{aviso}*"
    yield "", historial, turno["estado"], turno["perfil"], planificar(turno["perfil"], modo)


def replanificar(perfil: dict | None, modo: str):
    if not perfil:
        gr.Warning("Primero completa la entrevista.")
        yield SIN_ITINERARIO
        return
    yield f"*Preparando el itinerario con {modo}…*"
    yield planificar(perfil, modo)


with gr.Blocks(title="Rumbo", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# Rumbo\nPlanificador de viajes por España con RAG y modelos abiertos, ejecutado en local.")
    estado = gr.State(None)
    perfil = gr.State(None)
    with gr.Row():
        with gr.Column(scale=5):
            chat = gr.Chatbot(type="messages", height=520, label="Entrevista")
            entrada = gr.Textbox(placeholder="Escribe tu respuesta y pulsa Intro", show_label=False, autofocus=True)
            nueva = gr.Button("Empezar de nuevo", variant="secondary")
        with gr.Column(scale=6):
            modo = gr.Radio(MODOS, value="C1", label="Configuración", info="Puedes cambiarla y volver a planificar el mismo perfil.")
            otra_vez = gr.Button("Volver a planificar con esta configuración")
            itinerario = gr.Markdown(SIN_ITINERARIO)
    gr.Markdown(
        "<small>Guías de viaje de [Wikivoyage](https://es.wikivoyage.org), con licencia "
        "[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.es). "
        "Los datos del viaje no salen de este equipo.</small>"
    )

    demo.load(empezar, outputs=[chat, estado, perfil, itinerario])
    entrada.submit(responder, [entrada, chat, estado, perfil, modo, itinerario], [entrada, chat, estado, perfil, itinerario])
    nueva.click(empezar, outputs=[chat, estado, perfil, itinerario])
    otra_vez.click(replanificar, [perfil, modo], [itinerario])

if __name__ == "__main__":
    # Solo en local (RNF-09).
    demo.launch(server_name="127.0.0.1", server_port=int(os.environ.get("RUMBO_DEMO_PUERTO", 7860)))
