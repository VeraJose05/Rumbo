# F6 (RF-12, RNF-07): formato del itinerario para la demo (demo/.venv/bin/pytest demo).
from formato import formatear_itinerario

PERFIL = {"destino": "Sevilla", "dias": 1, "intereses": ["monumentos"], "ritmo": "tranquilo", "presupuesto": "medio", "compania": "pareja"}


def actividad(lugar, citas=(), verificacion=None):
    return {"lugar": lugar, "descripcion": f"Visita {lugar}.", "citas": list(citas), "verificacion": verificacion}


def itinerario(modo, manana, noche=(), fuentes=(), hay_informacion=True):
    return {
        "modo": modo,
        "hayInformacion": hay_informacion,
        "dias": [{"dia": 1, "manana": list(manana), "tarde": [], "noche": list(noche)}] if hay_informacion else [],
        "fuentes": list(fuentes),
        "recuperados": [],
    }


FUENTE = {"cita": 1, "seccion": "Ver", "fuente": "Wikivoyage", "url": "https://es.wikivoyage.org/wiki/Sevilla", "licencia": "CC BY-SA 4.0"}


def test_cabecera_con_destino_dias_modo_y_tiempo():
    texto = formatear_itinerario(PERFIL, itinerario("C1", [actividad("Torre del Oro", [1], "verificada")], fuentes=[FUENTE]), 12.4)
    assert texto.startswith("## Sevilla · 1 día")
    assert "C1 · RAG básico" in texto
    assert "12 s" in texto


def test_marca_cada_actividad_con_su_verificacion_y_sus_citas():
    texto = formatear_itinerario(
        PERFIL,
        itinerario(
            "C1",
            [actividad("Torre del Oro", [1], "verificada"), actividad("Plaza de España", [1], "cita-erronea")],
            noche=[actividad("Callejón de las Flores", [1], "sin-fuente")],
            fuentes=[FUENTE],
        ),
        1,
    )
    assert "**Torre del Oro** ✓ [1]" in texto
    assert "**Plaza de España** ~ [1]" in texto
    assert "**Callejón de las Flores** ✗ [1]" in texto
    assert "**Mañana**" in texto and "**Noche**" in texto
    assert "**Tarde**" not in texto  # las franjas vacías no se muestran


def test_lista_las_fuentes_con_enlace_y_licencia():
    texto = formatear_itinerario(PERFIL, itinerario("C2", [actividad("Torre del Oro", [1], "verificada")], fuentes=[FUENTE]), 1)
    assert "[1] [Wikivoyage › Ver](https://es.wikivoyage.org/wiki/Sevilla) · CC BY-SA 4.0" in texto
    assert "C2 · RAG avanzado" in texto


def test_en_c0_avisa_de_que_no_hay_fuentes():
    texto = formatear_itinerario(PERFIL, itinerario("C0", [actividad("Torre del Oro")]), 1)
    assert "**Torre del Oro**" in texto
    assert "sin fuentes" in texto.lower()
    assert "Fuentes" not in texto


def test_si_no_hay_informacion_lo_dice():
    texto = formatear_itinerario({**PERFIL, "destino": "Bilbao"}, itinerario("C1", [], hay_informacion=False), 0)
    assert "No tengo información de Bilbao" in texto
