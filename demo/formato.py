# F6 (RF-12, RNF-07): itinerario de la API en Markdown para la demo, con la verificación de cada
# actividad y las fuentes citadas con su licencia (atribución visible a Wikivoyage).

NOMBRES_MODO = {"C0": "C0 · LLM solo", "C1": "C1 · RAG básico", "C2": "C2 · RAG avanzado"}
FRANJAS = [("manana", "Mañana"), ("tarde", "Tarde"), ("noche", "Noche")]
MARCAS = {"verificada": "✓", "cita-erronea": "~", "sin-fuente": "✗"}

LEYENDA = "✓ el lugar está en la fuente que cita · ~ está en otra fuente recuperada · ✗ no está en ninguna (posible invención)"


def formatear_itinerario(perfil: dict, itinerario: dict, segundos: float) -> str:
    dias = perfil["dias"]
    cabecera = f"## {perfil['destino']} · {dias} {'día' if dias == 1 else 'días'}"
    lineas = [cabecera, f"*{NOMBRES_MODO.get(itinerario['modo'], itinerario['modo'])} · {segundos:.0f} s*", ""]

    if not itinerario["hayInformacion"]:
        lineas.append(f"No tengo información de {perfil['destino']} en mis guías, así que no planifico para no inventar.")
        return "\n".join(lineas)

    con_fuentes = itinerario["modo"] != "C0"
    for dia in itinerario["dias"]:
        lineas.append(f"### Día {dia['dia']}")
        for clave, nombre in FRANJAS:
            if not dia[clave]:
                continue
            lineas.append(f"**{nombre}**")
            for a in dia[clave]:
                marca = f" {MARCAS[a['verificacion']]}" if a.get("verificacion") in MARCAS else ""
                citas = f" [{', '.join(str(c) for c in a['citas'])}]" if a["citas"] else ""
                lineas.append(f"- **{a['lugar']}**{marca}{citas}: {a['descripcion']}")
            lineas.append("")

    if not con_fuentes:
        lineas.append("> Generado sin fuentes (C0): los lugares no están comprobados en ninguna guía.")
        return "\n".join(lineas)

    lineas += ["---", "### Fuentes", f"*{LEYENDA}*", ""]
    for f in itinerario["fuentes"]:
        lineas.append(f"[{f['cita']}] [{f['fuente']} › {f['seccion']}]({f['url']}) · {f['licencia']}  ")
    return "\n".join(lineas)
