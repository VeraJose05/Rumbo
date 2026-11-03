# Marca de Rumbo

Guía breve de identidad para la interfaz (RF-12) y para generar los diseños con Stitch (`stitch.md`).

## Idea

**Rumbo** es la dirección que tomas. El símbolo es una aguja de brújula inclinada hacia el noreste: un viaje que ya ha arrancado. Y lo que diferencia a Rumbo de otros planificadores es que **todo lo que propone está en una guía real y se puede comprobar**.

**Lema:** *Planifica conversando. Viaja con fundamento.*

## Personalidad y tono

Rumbo habla como **un amigo de allí que se ha leído la guía**:

| Es | No es |
|---|---|
| Cercano: tutea y usa frases cortas | Un folleto con superlativos («¡increíble!», «¡imperdible!») |
| Honesto: si la guía no cubre algo, lo dice | Un vendedor que se lo inventa para quedar bien |
| Concreto: lugares, precios y horarios de la fuente | Vago («disfruta de la gastronomía local») |
| Tranquilo: propone y deja elegir | Insistente |

Ejemplos:
- ✅ «La entrada al Alcázar cuesta 8,75 €, según Wikivoyage. ¿Lo pongo el primer día por la mañana?»
- ✅ «La guía de Valencia no habla de rutas en bici, así que no te las propongo.»
- ❌ «¡Sevilla te va a enamorar! 😍 Descubre sus rincones mágicos.»

Emojis: no en los textos; los iconos ya hacen ese trabajo.

## Colores

Inspirados en la España mediterránea: tejas y barro, azulejo, azafrán, olivo y arena.

| Nombre | Hex | Uso |
|---|---|---|
| Terracota | `#C4553A` | Logo, superficies grandes, ilustraciones |
| Terracota profunda | `#A8432B` | **Botones principales** y texto en terracota (contraste 6,0 con blanco) |
| Azul azulejo | `#1E4C7A` | Mapa y rutas, enlaces, elementos secundarios |
| Azafrán | `#F2B544` | Acento puntual: día seleccionado, marcador activo. **Nunca como color de texto** |
| Olivo | `#4F6B3F` | «Verificado en la guía» (✓) y estados correctos |
| Arena | `#FAF7F2` | Fondo de la app |
| Crema | `#FFF6EC` | Tarjetas cálidas, burbujas de Rumbo |
| Blanco | `#FFFFFF` | Tarjetas y campos |
| Tinta | `#2B2622` | Texto principal |
| Piedra | `#766B62` | Texto secundario |
| Borde | `#E6DDD1` | Líneas y separadores |

**Modo oscuro:** fondo `#171412`, superficie `#221E1B`, texto `#F1EBE4`, texto secundario `#A89C91`, terracota `#E07A5F`, azul `#7FA8D9`, olivo `#9DBB86`, azafrán igual.

Contrastes comprobados (WCAG AA, mínimo 4,5 para texto): tinta 14,0; azul 8,3; terracota profunda 5,6; olivo 5,6; piedra 4,9 sobre arena. La terracota del logo (4,2) no se usa para texto pequeño.

## Tipografía

Ambas de Google Fonts, licencia OFL (se pueden servir desde la propia app, sin depender de internet):

- **Fraunces** SemiBold, ejes *SOFT 100* y *opsz* alto: títulos, nombre de los destinos y el logotipo. Es una serif cálida y redondeada, con aire de guía de viajes.
- **Inter**: texto, botones y datos. Legible en pantallas pequeñas.

## Concepto visual: «cuaderno de viaje»

Rumbo es para viajar, no una herramienta de gestión: la primera prueba con tarjetas limpias quedó genérica. La interfaz es un diario de viajero y un pasaporte:

- Fotos de destino a sangre con luz cálida, papel crema con textura, sellos de tinta, billetes de tren con borde troquelado, postales y cinta washi.
- Planificar es un juego: postales para elegir destino, cartas que se deslizan para los gustos, una tortuga y una liebre para el ritmo, un billete que se sella al confirmar, y un panel de salidas de estación mientras se genera el plan.
- El itinerario es un camino con paradas, como los niveles de un juego.
- **Pasaporte** con sellos por ciudad e insignias («Tapeador», «Catedralista») al hacer check-in en los lugares. **Sin login**: el pasaporte y los viajes se guardan en el móvil (privacidad, RNF-09).
- Microinteracciones con rebote; iconos de línea de 2 px redondeados.
- Detalles manuscritos con **Caveat** (Google Fonts, OFL), con moderación.

Datos reales, nunca inventados: ni temperaturas, ni horarios de cena, ni promesas que la app no cumple.

## Archivos

| Archivo | Uso |
|---|---|
| `rumbo-logo.svg` / `.png` | Logo horizontal sobre fondo claro |
| `rumbo-logo-oscuro.svg` / `.png` | Logo sobre fondo oscuro |
| `rumbo-simbolo.svg` / `.png` | Símbolo solo (favicon, avatar de Rumbo en el chat) |
| `rumbo-icono-1024.png` | Icono de la app (PWA, tiendas) |
| `generar-logo.py` | Regenera los SVG desde la fuente Fraunces |
