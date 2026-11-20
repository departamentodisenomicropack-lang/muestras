# Stock diseño · sistema de diseño y especificación

Guía para mantener la app pareja cuando se agreguen pantallas. Todo vive en `index.html`: los tokens están en `:root` y los componentes son clases CSS.

## Tokens

### Color
| Token | Valor | Uso |
|---|---|---|
| `--paper` | #ffffff | Fondo de la app, interior de tarjetas sobre gris |
| `--fill` | #f2f2f2 | Tarjetas, listas, buscador |
| `--fill-2` | #e8e8e8 | Botón secundario, segmentado |
| `--line` | #dcdcdc | Separadores, borde inferior de campos |
| `--ink` | #000000 | Texto principal, botón principal, tarjeta oscura |
| `--ink-2` | #464646 | Texto secundario |
| `--ink-3` | #6f6d6d | Texto terciario, íconos apagados (pasa 4.5:1 sobre blanco y #f2f2f2) |
| `--on-dark` | #c9c7c7 | Texto secundario **solo sobre negro** |
| `--acc` | #a35e47 | Terracota: forma del FAB, acción "Agregar", lo último escaneado |
| `--acc-ink` | #8c4e3a | Links y texto en acento (contraste para texto chico) |
| `--acc-soft` | #f6ece8 | Fondo de resaltado (línea nueva, apartados) |
| `--red` / `--red-ink` / `--red-soft` | #b3261e / #8c1d18 / #f9dedc | Errores y vencidos |

Regla: en los templates usar siempre `var(--token)`, nunca el hex. Excepción: atributos SVG `fill="…"`, que no aceptan variables.

### Tipografía
Archivo (Google Fonts), un solo family.
| Rol | Tamaño / peso | Ejemplo |
|---|---|---|
| Título de app | 44px · 900 · font-stretch 125% | "Stock diseño" |
| Título de pantalla (`h1.md`) | 32px · 900 · 125% | "Producto nuevo" |
| Sección (`.sec h2`) | 18px · 800 | "Cajas", "Actividad" |
| Cuerpo | 15px · 400–700 | filas, campos |
| Secundario | 13px | lugar de la caja, metadatos |
| Mínimo | 12.5px | solo metadatos, nunca acciones |

Pendiente: hoy conviven 12.5, 13, 13.5, 14, 14.5 y 15 px. Al tocar una pantalla, llevar todo a 12.5 / 13 / 15 / 18.

### Forma y espacio
- Radios: 999px (pastillas y botones), 28px (tarjeta grande / oscura), 20px (fila y tarjeta), 12–14px (miniaturas). No usar otros.
- Formas M3: GALLETA (FAB y burbujas de caja) y SOL (spinner).
- Separación entre filas 6–8px; entre secciones 18–26px; margen lateral 20px.
- Zona táctil mínima 44×44 (stepper de lista 40×40 dentro de una fila de 44+).

## Componentes

| Componente | Clase | Variantes / estados |
|---|---|---|
| Botón | `.btn` | `.pri` negro (una sola acción principal por pantalla), base gris; `disabled` = opacidad; `.save` = fijo abajo |
| FAB | `.fab` | Negro con GALLETA terracota. Inicio: **Agregar producto**. Caja: **Agregar acá**. Siempre una línea |
| Fila de lista | `.item`, `.row-p` | Ícono/foto 44px + título + subtítulo + número a la derecha |
| Línea de tanda | `.linea` | Normal · `.nuevo` (lo último escaneado, resaltado 4 s) · `.pend` (apartado, borde punteado) · buscando (spinner SOL) |
| Pregunta de foto | `.fotopreg` | Miniatura + "¿Usás esta foto?" + Usar / Sacar otra |
| Stepper | `.mini` | − cantidad +; nunca baja de 1; tope = stock de la caja de origen |
| Segmentado | `.seg` / `.seg4` | Agregar · Sacar · Mover · Devolver |
| Chips | `.chip` | `aria-pressed` para el elegido |
| Tarjeta oscura | `.d-card` | Para la decisión de destino (caja) |
| Aviso de cámara | `#camOk` | Verde = leído, rojo = error, desaparece a los 1,8 s, con pip |
| Toast | `toast()` | Confirma lo hecho con el mismo verbo del botón |
| Pantalla de carga | `#splash` | Mismo encabezado que el inicio (no salta al desaparecer) + SOL girando + "Cargando las muestras…". A los 6 s: "Está tardando un poco más de lo normal…". Error: mensaje + Reintentar. Se va con fundido de 0,3 s, mínimo 0,5 s en pantalla |

## Lenguaje (UX copy)

Un verbo por acción, en botón, aviso y actividad:
| Acción | Botón | Aviso | Actividad |
|---|---|---|---|
| Meter en una caja | Agregar / Listo · Agregar 3 a CAJA | Agregaste 3 | Agregó 3 × … a CAJA |
| Sacar | Listo · Sacar 2 unidades | Sacaste 2 unidades | Usó / Descartó |
| Mover | Listo · Mover 2 a CAJA | Moviste 2 unidades | Movió 2 × … de A a B |
| Devolver al cliente | Listo · Devolver 1 unidad | Devolviste 1 unidad | Devolvió 1 × … al cliente |

- No decir de dónde salen los datos (tiendas, catálogos): "Completado solo. Revisalo."
- Errores = qué pasó + qué hacer: "No se pudo subir la foto. Revisá la conexión y probá de nuevo."
- Vacíos = qué es + cómo empezar: "Está vacía. Tocá “Agregar acá” y escaneá…".
- Voseo, frases cortas, sin signos de exclamación.

## Flujos y estados (handoff)

### Agregar productos (tanda)
1. Entrada: FAB del inicio, "Agregar acá" en una caja o "Agregar" en la ficha.
2. Cámara continua (BarcodeDetector o ZXing). Mismo código dentro de 1,5 s se ignora.
3. Cada lectura: pip + vibración + aviso + la línea sube arriba y se resalta.
4. QR de caja: fija el destino.
5. Código desconocido → línea "Buscando…" → si aparece: se crea el producto y, si hay foto, se pregunta → si no: "Apartado".
6. Listo: agrega lo completo; lo apartado va a la lista de Apartados (por celular).
Bloqueos: sin caja → aviso y foco en el selector; búsquedas en curso → "Esperá un segundo…".

### Casos borde
- Nombre largo: 2 líneas y "…".
- Sin conexión: el aviso de error de `escribir()`; la tanda no se pierde hasta tocar Listo.
- Sin cámara: "Agregar sin escanear" acepta texto o un código de 8–14 dígitos.
- Foto de tienda que no carga: queda sin foto, se puede sacar después.

### Accesibilidad
- Botones reales (`<button>`), `aria-label` en íconos solos (×, −, +).
- `aria-selected` en el segmentado, `aria-pressed` en chips.
- Movimiento reducido: sin animación de entrada en `.linea.nuevo`.
- Cada lectura se anuncia a lectores de pantalla (`#camOk` con `role=status`, `aria-live=polite`).

## Formato de nombre y marca

Todo producto se muestra igual, venga del código de barras o se escriba a mano (`ordenarProducto` en index.html):

- **Marca** en Tipo Título: `DOVE` → `Dove`. Si ya viene con mayúsculas a propósito (`L'Oréal Paris`, `e.l.f.`) se respeta.
- **Nombre** sin la marca, en Tipo Título, con las palabras chicas en minúscula (de, con, para, x…): `SHAMPOO DOVE CERAMIDAS X 400ML` → `Shampoo Ceramidas 400 ml`.
- **Siglas** en mayúscula: FPS, UV, BB, XG, Q10. `SPF 50` se escribe `FPS 50`. `pH` queda así.
- **Contenido** siempre al final, con espacio y unidad corta: `400 ml`, `1,5 l`, `90 g`, `1 kg`, `30 u.`.

## v3 · Mismo universo que Brief POP (13/11/2026)

- **Carga:** mosaico de formas de la marca girando en ola, con STOCK DISEÑO y Micropack debajo.
- **Inicio:** logo de Micropack Americas (`logo-micropack.svg`, el mismo de Brief POP), galleta terracota con la inicial (tocándola se cambia de usuario), "¡Hola, Nombre!" y "¿Qué buscamos hoy en el estudio?".
- **Por completar:** una sola bandeja con fichas sin foto o medidas y códigos que no se encontraron.
- **Agregar (carrito):** escáner en modo oscuro, contador que rebota, la última lectura destacada y la caja elegida al final, en una hoja con las cajas recientes o escaneando su QR. Termina en la pantalla "¡Listo!" con el check verde.
- **Sacar, Mover y Devolver:** desde la ficha del producto, en una hoja; para varios productos, desde la caja.
- **Foto oficial por defecto:** si el código trae foto de tienda se usa sola; solo si no hay se pide la del estudio.
- **Deslizar a la izquierda** (como en iPhone): en Por completar, *No completar* / *Borrar*; en las cajas y en los resultados de búsqueda, *Mover* / *Borrar* (borra solo de esa caja, con confirmación). Deslizar hasta el final hace la acción principal.

## Motion (desde el prototipo de Framer, nov 2026)
Un solo sistema de movimiento, sin librerías (módulo "Motion" en index.html):
- **Resortes** generados en JS y aplicados como `linear()` en CSS: `--spring` (suave, sin rebote) para casi todo, `--snappy` para respuestas rápidas, `--bouncy` solo para lo físico (el visor que engancha al leer).
- **Las cosas viajan, no aparecen**: el botón "Agregar producto" se agranda hasta ser el escáner y vuelve a achicarse al cerrar; la fila de una caja se abre hasta ser su página y se cierra sobre su fila.
- **Fotos que vuelan**: las miniaturas escaneadas viajan hasta el ¡Listo! (`data-flip="t-<código>"`). Las líneas del escáner se reacomodan solas cuando entra una nueva (`data-flip="l-<código>"`).
- **Números que ruedan**: `roll(clave, valor)` en el contador del escáner y en las unidades de cada caja; recuerdan el último valor visto, así al volver al inicio el número de la caja sube.
- **Textos que se transforman**: `morphText()` en el botón de guardar del escáner.
- **Deslizar con física**: decide por recorrido o velocidad del dedo; los botones aparecen de a poco; "No completar" se puede deshacer.
- **Sobriedad**: sin confeti en el ¡Listo! (es algo frecuente); el adorno queda para lo raro.
- Respeta "reducir movimiento" del sistema.
- **Mazo en profundidad** (inspirado en "Depth Flow Carousel" de Framer): en una caja con 2 o más productos, la vista "Fichas" muestra los productos como un mazo. Las que vienen esperan apiladas atrás, la de adelante se lee entera y las que pasan caen hacia vos. Bajar el dedo va más profundo (la de adelante cae con el dedo), subirlo vuelve; se recorre arrastrando (con velocidad y resorte), con la rueda o las flechas; tocar la de adelante abre el producto. "Lista" sigue teniendo el deslizar para mover/borrar (con confirmación).
- **Fichero** (nov 2026, inspirado también en "Card Stack Reveal"): tarjetas apaisadas — foto del producto a la izquierda (80 px, sobre blanco), nombre en una sola línea y la marca debajo, y la cantidad en un círculo negro a la derecha. Las de atrás asoman arriba, más chicas y desenfocadas; la que pasa cae y se desvanece. Al cambiar a **Lista**, la foto de la tarjeta de adelante vuela a su fila y las filas entran escalonadas; al volver, vuela de la fila a la tarjeta.
- En la caja: selector **Fichero | Lista** (una sola vista a la vez, sin repetir productos) y, debajo, el **Historial** de la caja en texto (como en la ficha del producto). La ficha de adelante del fichero también se desliza a la izquierda para **Mover** o **Borrar**; borrar siempre pide confirmación (igual que en la lista).
- **Agregar más unidades** (ficha del producto): ya no abre el escáner. Se despliega ahí mismo un panel con la caja (las que ya lo tienen, o "Otra caja…"), la cantidad (el número rueda) y el botón "Agregar N unidades a CAJA".
- **Orden por clase de producto** (no se muestra): cabello, maquillaje, uñas, piel, limpieza, higiene, perfumes, bucal, bebé, golosinas, snacks, bebidas, almacén, mascotas y el resto; dentro de cada clase, por nombre. Se reconoce por palabras del nombre y la marca (`CLASES` en index.html; sumar palabras ahí cuando aparezcan productos nuevos).
- El texto que se transforma ya no usa desenfoque: en iPhone dejaba un fondo blanco dentro del botón negro.
- **Sacar / Mover / Devolver** viven solo en la ficha de cada producto (ya no en la caja). Si entrás al producto desde una caja, esa caja queda elegida como origen.
- Fichas del fichero agrandadas (nov 2026): 184 px de alto, foto de 156 px a la izquierda, nombre hasta 3 líneas, cantidad en círculo arriba a la derecha.
- **Cajas de cartón 3D** (nov 2026): en el inicio cada caja se dibuja como una caja de cartón kraft cerrada, con la galleta estampada en la tapa (CSS 3D, `cubo()`). Al tocarla crece al centro con su nombre impreso al frente, se abre la tapa, asoman tres fichas y se pasa al fichero (`abrirCaja()`, ~1 s). Con 'reducir movimiento' entra directo.
- **Cajas vistas desde arriba** (reemplaza la caja 3D; ref. Dribbble "Shoe Boxes Swipe Transition"): en el inicio cada caja es una caja de cartón cerrada vista desde arriba — dos solapas con cinta, nombre estampado arriba, lugar y unidades abajo, galleta como sello. Al tocar: las solapas se abren hacia vos, se ven las fichas adentro y la cámara se mete en la caja hasta que la ficha del centro llena la pantalla de blanco; ahí aparece el fichero (`cajaArriba()`, `abrirCaja()`, ~1 s). Al volver, la pantalla se achica hasta la caja cerrada.
- Cajas en perspectiva (nov 2026): la lista tiene perspectiva (700 px, punto de vista arriba) y cada caja está inclinada 44° con su **pared frontal** visible (con troquel de manija), así se leen como cajas apoyadas en una mesa. Al tocar, la caja se endereza hacia vos mientras abre las solapas, y después la cámara entra.

### Cajas tipo caja de zapatillas (perspectiva militar)
- Inicio: cada caja se ve desde arriba en proyección militar (sin punto de fuga): tapa terracota con el nombre, lugar y unidades; debajo, el canto de la tapa y el frente de cartón de la caja. La tapa sobresale un poco del cuerpo.
- Al tocar: la tapa se da vuelta hacia arriba (queda parada detrás, mostrando su cara interna de cartón, como en el video de referencia), se ve el interior con fichas blancas y la cámara entra al interior hasta el fichero.
- Volver: la vista se contrae hasta la tapa de la caja.

### Cajas 3D en el inicio (Three.js)
- El inicio muestra las cajas como un carrusel 3D real (Three.js + WebGL): caja de zapatillas de cartón corrugado con tapa articulada atrás, nombre, lugar y unidades impresos en la tapa. Punto de vista casi cenital, como las fotos de referencia.
- Textura real: sacada de las fotos de una caja de cartón corrugado de Micropack (superficie, cara interna más clara y canto con la onda). Materiales PBR (color, relieve y rugosidad), oclusión ambiental horneada en el interior, luz de estudio con sombras suaves.
- Deslizar: la caja sigue al dedo, se levanta y se inclina; la siguiente entra con un resorte (transición tipo Dribbble "Shoe Boxes Swipe"). Puntos debajo para saltar a una caja.
- Tocar: la tapa se abre sobre la bisagra con un rebote, la cámara (PerspectiveCamera real) entra al interior vacío, el fondo llena la pantalla, la luz sube a blanco y aparece la pantalla de la caja. Volver hace todo al revés; al cerrar, la tapa rebota contra el borde sin atravesar la caja.
- Arquitectura: un único canvas fijo fuera de #app (render() nunca lo destruye); el inicio solo dibuja un escenario (#c3dStage) que el motor sigue. El motor (vendor/caja3d.js, ~500 KB) se carga cuando la app está ociosa; solo dibuja mientras hay movimiento.
- Respaldo: sin WebGL, si falla la carga o con "reducir movimiento", el inicio vuelve a la lista de cajas anterior.
- Fuente del motor y de las texturas en vendor/cajas3d-src/.
- Corrección: al buscar, la caja 3D quedaba dibujada encima de los resultados. Ahora la búsqueda avisa al motor y, además, el motor esconde el canvas solo si el escenario desaparece de la pantalla.

### Modelos 3D (integración con Rhino)
- Los productos modelados se guardan desde el sistema integral de Rhino (herramienta **Stock diseño**) en `\\192.168.80.72\Public2TB\Stock diseño` (Modelos, Miniaturas, Web, catalogo.json). La llave es el código de barras, el mismo que lee la app.
- El sistema sube a la app (hoja **Modelos** de la planilla, carpeta de Drive "Stock diseño · modelos 3D") la miniatura, las medidas, la ruta del .3dm y una copia .glb. Si no hay internet queda pendiente y se reintenta.
- En la app: botón "Modelos 3D" en el inicio, lista de modelos, ficha con visor 3D (se gira con el dedo, mismo motor Three.js de las cajas), ruta del archivo para copiar, y bloque "Modelo 3D" en la ficha del producto cuando existe. La búsqueda también encuentra modelos.
- Backend: `Codigo.gs` suma la hoja Modelos y las funciones registrarModelo, borrarModelo (Eliminar desde Rhino, sistema integral v2.0.33: saca la fila, no borra archivos de Drive), glbModelo y datosProducto. Hay que pegarlo en Apps Script y publicar una versión nueva de la implementación.

### Mudanza a la cuenta de Diseño (17/11/2026)
- Planilla, Apps Script y Drive pasaron a la cuenta departamentodisenomicropack (copia de la planilla + función mudanza() que copió fotos y modelos a su Drive). La planilla vieja de la cuenta personal queda como respaldo.
- API nueva: AKfycbxd5GjM… (index.html y sistema integral de Rhino v2.0.29).
- 17/11/2026: el repo pasó a la cuenta de GitHub de Diseño (departamentodisenomicropack-lang/muestras), junto a Brief POP (pedido).

### Fotos para el modelo (18/11/2026)
- En la ficha del producto: bloque **Fotos para el modelo**. Paso a paso guiado por las 6 caras: Frente → Lateral derecho → Lateral izquierdo → Dorso → Arriba → Abajo. Cada paso muestra el desplegado de la caja con la cara a sacar en terracota y un marco con la proporción real de esa cara (sale de las medidas; sin medidas no arranca y lleva a completarlas). Se puede saltear una cara o repetir una sola tocándola en la ficha.
- Después de la foto se ajustan las 4 esquinas y la app endereza la cara (homografía, corrige la perspectiva) y la deja a la proporción exacta: lado largo 1400 px, JPEG.
- Backend: columnas fotoFrente, fotoDerecha, fotoIzquierda, fotoDorso, fotoArriba, fotoAbajo al final de Productos (las hojas viejas suman los títulos solas) y `subirCara(codigo, cara, base64)`.
- Orientación de cada foto (Rhino la usa así): frente y dorso con el producto parado; laterales = su lado derecho / izquierdo mirándolo de frente, parado; arriba = visto desde arriba con el frente hacia abajo de la foto; abajo = la base, inclinándolo hacia atrás, con el frente hacia arriba de la foto. Ancho × alto en mm de cada foto: frente y dorso ancho × alto; laterales prof × alto; arriba y abajo ancho × prof.

### Versión para la compu (20/11/2026)
- Misma app y mismo link. Con pantalla de 900 px o más y mouse (`(min-width:900px) and (hover:hover) and (pointer:fine)`) se pone la clase `compu` en `<html>` (ojo: `.pc` ya era otra cosa, la tarjeta "Por completar").
- Como Brief POP en PC: barra arriba (76 px) con el logo, las secciones Inicio · Productos · Por completar · Actividad (la elegida en acc-soft / acc-ink), el botón negro **Agregar producto** y el usuario con su galleta. Contenido de hasta 1180 px con 64 px de margen.
- Inicio: el saludo grande; las cajas en grilla (en la compu no va el carrusel 3D). Ficha del producto en dos columnas: foto y datos a la izquierda (fija al bajar), dónde está, acciones, fotos para el modelo (las 6 en una fila), modelo e historial a la derecha.
- Pistola de códigos USB o tipeo fuera de un campo: dígitos + Enter abren el producto (o lo suman, en Agregar producto). En Agregar producto hay además un campo "Código de barras + Enter". En el buscador, un código de 8 a 14 dígitos + Enter también abre el producto (en el celular también). "/" va al buscador.
- Fotos para el modelo: en la compu se elige el archivo o se arrastra la foto sobre la cámara.
- Instalada en la compu, abre ocupando toda la pantalla (mismo truco que el envoltorio de Brief POP).

### Modelos 3D (20/11/2026)
- Ya no están en el inicio ni en la búsqueda: el modelo se ve solo desde la ficha del producto (bloque "Modelo 3D").
- En la vista del modelo: **Eliminar modelo** (confirma; llama `borrarModelo`, saca la fila; en el servidor queda la copia; en Rhino se elimina desde Stock diseño).
- Visor: tope de 45 s con mensaje y "Probar de nuevo". Para modelos con la gráfica de la muestra: sin tono de cine (`tono:0`), entorno .6 y luz .35, y los materiales con textura van sin metal y sin color encima, así la foto se ve con sus colores. Cambio hecho en `vendor/cajas3d-src/visor.js` y parcheado igual en el `vendor/caja3d.js` armado.
- Al terminar las caras: "Listo. Ahora en Rhino: Stock diseño → Importar muestra". La ficha dice si falta importarla o si el modelo ya está.
- 20/11: fotos de las caras a 1000 px de lado largo y JPEG al 80 % (antes 1400 px / 86 %): alrededor de 35–150 KB por cara. Miniaturas de la ficha a 300 px. El .glb se baja una sola vez y queda guardado en el aparato (Cache Storage `mpk-glb`, por id de Drive), y se empieza a bajar al abrir la ficha del producto, junto con el visor.
