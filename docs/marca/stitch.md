# Prompts para Stitch

Para generar los diseños móviles de Rumbo en [Stitch](https://stitch.withgoogle.com).

**Cómo usarlo**
1. Elige el modo **App (móvil)**.
2. Adjunta `rumbo-simbolo.png` (y `rumbo-logo.png` si lo permite) para que respete el logo.
3. Pega primero el **prompt base**: fija la marca y genera la pantalla de inicio.
4. Después, **una pantalla por mensaje** con los prompts de abajo. Stitch funciona mejor pantalla a pantalla que con todo de golpe.
5. Si una pantalla se desvía del estilo, recuérdale: «Mantén la paleta, la tipografía y el estilo de la pantalla de inicio».

---

## Prompt base

```
Diseña una app móvil llamada "Rumbo": un planificador de viajes por España que funciona como una conversación. El viajero cuenta a dónde quiere ir, cuántos días, qué le interesa, su ritmo, su presupuesto y con quién viaja, y Rumbo le prepara un itinerario día a día (mañana, tarde y noche). Lo que la hace distinta: cada lugar propuesto sale de una guía real (Wikivoyage) y lleva su fuente, con una marca de "Verificado en la guía". Toda la interfaz va en español.

Tono: cercano, honesto y concreto, como un amigo de allí que se ha leído la guía. Nada de superlativos de folleto ni emojis en los textos.

Identidad visual (respétala en todas las pantallas):
- Colores: fondo arena #FAF7F2; tarjetas en blanco #FFFFFF y crema #FFF6EC; texto tinta #2B2622; texto secundario piedra #766B62; bordes #E6DDD1. Botón principal en terracota profunda #A8432B con texto blanco. Terracota #C4553A para superficies grandes e ilustraciones. Azul azulejo #1E4C7A para el mapa, las rutas y los enlaces. Azafrán #F2B544 solo como acento puntual (día seleccionado, marcador activo), nunca como color de texto. Olivo #4F6B3F para la insignia "Verificado en la guía".
- Tipografía: Fraunces SemiBold (serif cálida y redondeada) para títulos y nombres de destinos; Inter para el resto.
- Forma: esquinas muy redondeadas (16–20 px en tarjetas, píldora en chips y botones), sombras suaves y cálidas, iconos de línea de 2 px redondeados. Fotos de destinos con luz cálida.
- Logo: el símbolo adjunto (aguja de brújula sobre un cuadrado redondeado terracota) y la palabra "rumbo" en minúsculas con Fraunces.

Primera pantalla: INICIO.
- Arriba, el logo pequeño y un botón de perfil/viajes guardados.
- Título grande en Fraunces: "¿A dónde vamos?" y debajo: "Cuéntamelo como se lo contarías a un amigo".
- Un campo de texto grande y amable, tipo mensaje, con el placeholder "4 días en Sevilla con mi pareja…" y un botón de enviar redondo en terracota.
- Chips de sugerencias: "Un fin de semana en Granada", "Barcelona con niños, sin gastar mucho", "Madrid de museos".
- Sección "Destinos con guía": carrusel horizontal de tarjetas con foto y nombre en Fraunces: Sevilla, Madrid, Barcelona, Granada, Valencia.
- Abajo, una línea pequeña: "Guías de Wikivoyage (CC BY-SA)".
```

---

## Pantalla 2 · Entrevista (chat)

```
Pantalla de CONVERSACIÓN, mismo estilo. Cabecera con el símbolo de Rumbo, el destino ("Sevilla") y un botón "Nuevo viaje".
Burbujas: las de Rumbo en crema #FFF6EC alineadas a la izquierda con el símbolo como avatar; las del viajero en terracota profunda #A8432B con texto blanco a la derecha.
Conversación de ejemplo:
- Viajero: "Quiero ir a Sevilla 3 días con mi pareja"
- Rumbo: "¡Buen plan! ¿Qué os apetece más: monumentos, gastronomía, vida nocturna, naturaleza…?"
- Viajero: "Monumentos y tapas. ¿Cuánto cuesta entrar al Alcázar?"
- Rumbo: "Según Wikivoyage, la entrada al Alcázar cuesta 8,75 €." con un pequeño enlace "Fuente: Wikivoyage". Y sigue: "¿Qué ritmo preferís?"
Encima del campo de texto, chips de respuesta rápida: "Tranquilo", "Normal", "Intenso".
Campo de mensaje fijo abajo con botón de enviar.
```

## Pantalla 3 · Resumen del viaje

```
Pantalla de CONFIRMACIÓN dentro del chat, mismo estilo. Rumbo muestra una tarjeta "Tu viaje" con iconos de línea: Destino Sevilla · 3 días · Intereses: monumentos, gastronomía · Ritmo normal · Presupuesto medio · En pareja. Cada dato se puede tocar para cambiarlo (icono de lápiz pequeño).
Debajo de la tarjeta, la pregunta "¿Está todo bien?" y dos botones: principal "Preparar mi itinerario" (terracota profunda) y secundario "Cambiar algo".
```

## Pantalla 4 · Preparando el itinerario

```
Pantalla de CARGA, mismo estilo. Ilustración sencilla de la aguja de brújula del logo girando suavemente. Título en Fraunces: "Preparando tu viaje a Sevilla". Lista de pasos con estado: "Leyendo la guía de Sevilla" (hecho, ✓ en olivo), "Día 1" (hecho), "Día 2" (en curso, con indicador), "Día 3" (pendiente). Nota pequeña: "Cada lugar sale de la guía y lleva su fuente".
```

## Pantalla 5 · Itinerario (la principal)

```
Pantalla de ITINERARIO, la más importante, mismo estilo.
- Cabecera: "Sevilla" en Fraunces grande, debajo "3 días · en pareja · ritmo normal", y acciones: guardar (marcador), compartir y exportar.
- Selector de días en píldoras: "Día 1" (seleccionado, fondo azafrán #F2B544 con texto tinta), "Día 2", "Día 3".
- Mapa en la mitad superior, de estilo claro y cálido, con la ruta del día en azul azulejo #1E4C7A uniendo marcadores numerados 1, 2, 3.
- Debajo, una línea de tiempo vertical con tres bloques: MAÑANA, TARDE y NOCHE. En cada uno, una tarjeta de lugar con: número del marcador, nombre en Fraunces ("Real Alcázar"), una frase de descripción, la sección de la guía como etiqueta pequeña ("Ver") y la insignia "✓ Verificado en la guía" en olivo #4F6B3F.
- Un aviso discreto en crema al final: "La guía no cubre 'rutas en bici' en Sevilla, así que no las he incluido".
- Barra fija abajo tipo chat: "Ajusta tu plan: 'más tranquilo', 'quita la Catedral'…" con botón de enviar.
```

## Pantalla 6 · Detalle de un lugar

```
Hoja inferior (bottom sheet) de DETALLE DE LUGAR sobre el itinerario, mismo estilo. Nombre "Real Alcázar" en Fraunces, etiquetas "Día 1 · Mañana" y "✓ Verificado en la guía". Bloque de cita con borde izquierdo en terracota: el texto literal de la guía ("Palacio árabe que data del siglo X. La entrada cuesta 8,75 euros…") y debajo "Wikivoyage · Sevilla · Ver · CC BY-SA 4.0" con enlace. Botones: "Cambiar por otro" (secundario) y "Quitar del plan" (texto en terracota profunda).
```

## Pantalla 7 · Mis viajes

```
Pantalla MIS VIAJES, mismo estilo. Título "Mis viajes" en Fraunces. Tarjetas con foto del destino, nombre, "3 días · guardado el 3 nov" y una etiqueta "Disponible sin conexión" con icono de nube tachada. Menú de cada tarjeta: abrir, exportar PDF, añadir al calendario, borrar. Estado vacío: ilustración de la brújula y el texto "Aún no tienes viajes guardados. ¿A dónde vamos?" con botón "Planificar un viaje".
```

## Pantalla 8 · Avisos

```
Dos estados de aviso, mismo estilo, como tarjetas amables dentro del chat (no como errores rojos):
1. Cuota del servicio agotada: icono de reloj, "Rumbo está descansando un momento", texto "Hemos agotado por ahora la cuota gratuita del modelo. Inténtalo de nuevo en unos minutos." y botón "Reintentar".
2. Sin conexión: icono de nube tachada, "Estás sin conexión", texto "Puedes ver tus viajes guardados; para planificar uno nuevo necesitas internet." y botón "Ver mis viajes".
```

## Modo oscuro (opcional)

```
Genera la versión en modo oscuro de la pantalla de itinerario: fondo #171412, superficies #221E1B, texto #F1EBE4, texto secundario #A89C91, terracota #E07A5F, azul #7FA8D9, olivo #9DBB86 y azafrán #F2B544. Mapa en estilo oscuro cálido.
```
