# RF-12: genera el logo de Rumbo. La palabra se convierte a trazos con la fuente Fraunces
# (licencia OFL), así el SVG no depende de tener la fuente instalada.
# Uso: python generar-logo.py Fraunces.ttf <carpeta>  (requiere fonttools)
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

fuente, salida = sys.argv[1], sys.argv[2]
f = instantiateVariableFont(TTFont(fuente), {"wght": 620, "opsz": 144, "SOFT": 100, "WONK": 0})
gs, cmap = f.getGlyphSet(), f.getBestCmap()
upm = f["head"].unitsPerEm

def palabra(texto, tam, x0, base, track=0):
    """Trazos SVG de la palabra; devuelve (d, ancho)."""
    e = tam / upm
    pen = SVGPathPen(gs)
    x = 0
    for c in texto:
        g = cmap[ord(c)]
        tp = TransformPen(pen, (e, 0, 0, -e, x0 + x * e, base))
        gs[g].draw(tp)
        x += gs[g].width + track
    return pen.getCommands(), x * e

# Colores de marca
TERRACOTA, AZUL, CREMA, AZAFRAN, TINTA = "#C4553A", "#1E4C7A", "#FFF6EC", "#F2B544", "#2B2622"

def simbolo(x=0, y=0, s=128):
    k = s / 128
    t = lambda v: v * k
    # Aguja de brújula en rombo, inclinada hacia el noreste: el «rumbo» que se toma.
    return f'''<g transform="translate({x} {y}) scale({k})">
    <rect width="128" height="128" rx="34" fill="{TERRACOTA}"/>
    <circle cx="64" cy="64" r="43" fill="none" stroke="{CREMA}" stroke-opacity=".28" stroke-width="3"/>
    <g transform="rotate(40 64 64)">
      <path d="M64 16 L80 64 L48 64 Z" fill="{CREMA}"/>
      <path d="M64 112 L80 64 L48 64 Z" fill="{AZUL}"/>
    </g>
    <circle cx="64" cy="64" r="6" fill="{AZAFRAN}"/>
  </g>'''

def svg(ancho, alto, cuerpo, fondo=None):
    f = f'<rect width="{ancho}" height="{alto}" fill="{fondo}"/>' if fondo else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} {alto}" width="{ancho}" height="{alto}">{f}{cuerpo}</svg>\n'

open(f"{salida}/rumbo-simbolo.svg", "w").write(svg(128, 128, simbolo()))
for nombre, tinta in (("rumbo-logo.svg", TINTA), ("rumbo-logo-oscuro.svg", CREMA)):
    d, w = palabra("rumbo", 120, 172, 118, track=-10)
    cuerpo = simbolo(0, 8, 144) + f'<path d="{d}" fill="{tinta}"/>'
    open(f"{salida}/{nombre}", "w").write(svg(int(172 + w + 8), 160, cuerpo))
print("ok", w)
