# Reglas del proyecto DIETÉTICA

Sitio estático publicado en GitHub Pages. Trabajan en paralelo Claude y Codex:
**antes de editar, traé la versión fresca del archivo** (el otro pudo haberlo tocado).

## Marca
- La marca definida es **La Natural** y su subtítulo es **dietetica**.
- **Nunca usar MUNA.** Era el nombre ficticio de las maquetas de referencia.
- Todo lo del negocio (nombre, WhatsApp, dirección, horarios, textos) vive en
  `CONFIG`, dentro de `js/datos.js`. No hardcodear datos en el HTML ni en `app.js`.

## Identidad visual (viene de las maquetas en ../referencia/)
- Marrón cálido `#7a4423` (header, franjas, acentos fuertes), medido en las maquetas.
- Champán `#f4ead9` / crema `#fbf6ec` (fondos y tarjetas).
- Oliva `#6f7a52` (botones, categorías, estados activos).
- Títulos en Playfair Display; textos, precios y controles en Karla.
- Estética artesanal y ordenada: tarjetas suaves, bordes discretos, poco movimiento.
  Nada de animaciones llamativas.

## Precios
Nunca se escribe un precio a mano. Se carga costo, margen y descuento:

    precio_venta = costo × (1 + margen/100)
    precio_final = precio_venta × (1 − descuento/100)
    y después se redondea a múltiplos de CONFIG.redondeo

- `tipo: 'granel'` → `costoKg`, y cada presentación se calcula por sus gramos.
- `tipo: 'envasado'` → `costoUnidad`, presentación `unidad`.

## Reparto de archivos
- `js/datos.js` → catálogo, categorías, presentaciones, combos, reglas del mix, CONFIG.
- `js/app.js` → lógica y vistas. `css/estilos.css` → diseño. `index.html` → cáscara.
- Cambios chicos y dirigidos. No reformatear código ajeno al cambio pedido.

## Reglas duras
- Mobile-first, dos columnas en el catálogo en celular.
- Ningún botón decorativo: si algo se ve, funciona.
- Peso: SVG en línea, nada de librerías externas ni imágenes pesadas.
- Español de Argentina y formato de moneda argentino.
- Sin afirmaciones medicinales ni promesas de cura en productos naturales.
- Datos de demostración siempre marcados como tales (`DEMO = true` en `js/datos.js`).

## Estado visual actual — 2026-09-02
- Prioridad vigente: terminar la fidelidad visual mobile contra las seis maquetas de
  `../referencia/`; la adaptación desktop se refina después.
- Hero mobile: título `Elegí lo natural.`, en dos líneas, superpuesto a la foto sin
  invadir los productos.
- Las fotos de productos se muestran completas (`object-fit: contain`) sobre el
  crema fotográfico compartido `#f5e6d4`, también usado en categorías, mix y combos.
- Se repararon `salsa-de-tomate.jpg` y `harina-integral.jpg`: antes contenían una
  composición de varias fotos. Sus URLs llevan versión para evitar caché viejo.
- Las tarjetas de productos con presentación única conservan el mismo ritmo vertical
  que las que tienen selector.
- En mobile, `Cómo comprar` está solo en la hamburguesa; la barra inferior tiene
  Inicio, Catálogo, Mi mix y Combos.
- No volver a agregar círculos, manchas ni decoraciones de fondo ausentes en las
  maquetas.
- Sitio y repo definitivos: `https://lanatural-dietetica.github.io/` y
  `https://github.com/lanatural-dietetica/lanatural-dietetica.github.io`, en la cuenta de la clienta.
  El viejo `paladear/dietetica-test` quedó como prueba (remote `prueba` en la carpeta local).

## Decisiones de Claude — 2026-09-02
- Hero: la foto es `assets/hero-lanatural.webp` (con `.jpg` de respaldo en un
  `<picture>`). Tiene todo el lado izquierdo vacío a propósito: ahí va el texto.
  Juani pidió expresamente más aire, así que no achicar los márgenes del hero ni
  agrandar el botón (`.btn--hero`), que antes tapaba el bol de flor de jamaica.
- Categorías del inicio: la foto va **centrada** dentro de la tarjeta (pedido de
  Juani), completa y sin círculos, respetando la regla de arriba.
- Armá tu mix funciona como el creador de blends de Paladear: paso 1 tamaño,
  paso 2 ingredientes por gramos con pestañas de categoría y buscador, paso 3
  resumen. Cada ingrediente se cobra por sus gramos (`precioKgVenta`) y al final
  se suma `MIX.recargo`. Las pestañas y el scroll propio de la lista existen para
  cuando el catálogo crezca: no mostrar todos los productos juntos.
- Carrito: las presentaciones de un mismo producto van **agrupadas en un bloque**
  (`agruparCarrito()`), con una fila por peso y un subtotal. El mensaje de
  WhatsApp respeta ese agrupado. No volver a listarlas como productos sueltos.

## Mecánica traída de Paladear — 2026-09-02
Juani pidió adaptar La Natural a cómo funciona Paladear, **manteniendo la estética propia**
(marrón russet, oliva, champán, Playfair + Karla). Se copió la mecánica, no el estilo azul.

- **Tarjetas**: botones de peso (`.peso-btn`) en lugar del desplegable, stepper de cantidad
  dentro de la tarjeta, botón "Agregar" ancho, y cuando el producto ya está en el pedido
  aparece "En tu pedido: 500 g · $X" con los botones de quitar y ver en el carrito.
  Lo elegido en cada tarjeta vive en `estado.cards`; `repintarCard()` redibuja una sola.
- **Checkout en tres pasos** dentro del panel del carrito: productos → entrega
  (retiro / envío, dos botones grandes) → datos. El botón de volver del panel es `#co-volver`.
- **Datos recordados**: `dietetica_perfil_v1` guarda nombre, teléfono y hasta 3 direcciones;
  se precargan y hay botón para borrarlos. `dietetica_ultimo_v1` guarda el último pedido y
  habilita "Volver a pedir lo último" con el carrito vacío.
- **Carrito flotante** (`#cart-fab`): aparece solo cuando hay productos.
- **Movimiento**: la foto vuela al carrito al agregar (`volarAlCarrito`), onda al tocar
  botones (`onda`), confirmación en verde (`confirmarBoton`), header compacto al bajar
  (clase `compacto` en el body) y pastilla deslizante + rebote del ícono en la barra inferior.
  Todo respeta `prefers-reduced-motion`.

## Regla de caché (importante, se olvidó una vez)
GitHub Pages sirve los archivos con `cache-control: max-age=600`, así que el navegador se
queda con la versión vieja. **Cada vez que se toca `css/estilos.css`, `js/app.js` o
`js/datos.js` hay que subir el `?v=` de esa etiqueta en `index.html`.** Si no, los cambios
están publicados pero nadie los ve. Al tocar css/ o js/, bumpear la versión en el mismo commit.

## Tarjetas: medidas y precios — 2026-09-02
- **Cada producto tiene como máximo 3 medidas**, definidas en su campo `presentaciones` de
  `js/datos.js` según el volumen con que se vende: los que salen por kilo llevan
  250 g / 500 g / 1 kg, y los livianos o caros (flor de jamaica, tisana) 50 g / 100 g / 250 g.
  Las tres entran en una sola fila (grid de 3 columnas). No agregar una cuarta.
- **La medida que viene elegida es la más grande** que tenga el producto: 1 kg donde existe,
  si no 500 g o 250 g. Pedido de Juani.
- **El precio grande de la tarjeta es siempre el precio por kilo** (`$ 4.150 / kg`), y debajo,
  en chico, el de la medida elegida (`500 g · $ 2.100`). Es un pedido explícito de Juani.
  Los productos envasados muestran el precio de la unidad.
- El chip verde "carrito · 250 g · $850" es lo que ya hay de ese producto en el pedido.
- En el carrito, cada fila lleva la medida, el precio por kilo abajo en gris, la cantidad,
  el monto a la derecha en negrita y la papelera; el subtotal por producto aparece cuando
  hay más de una medida. Es el formato de Paladear.

## Fondo de las fotos — 2026-09-02
- El color oficial es **#F6EEE3** (`--foto-crema` en `css/estilos.css`). Pasó por #f5e6d4 y
  por #FAE6D0; el 2026-09-05 se llevó al crema de la maqueta que pasó Juani, más neutro y
  menos durazno. **Al cambiarlo hay que reprocesar todas las fotos**, y también los
  `cat-*`, `acceso-*` y `combo-*` de `assets/`, o se ve el recuadro de la foto contra la
  tarjeta. El script para eso quedó documentado abajo.
- Toda foto nueva se prepara con `scripts/foto-producto.py`, que mide el fondo real en el
  marco, lo lleva a #F6EEE3 sin tocar el bowl ni dejar halo, redimensiona a 800x800 y guarda
  `.webp` y `.jpg`. Uso: `python3 scripts/foto-producto.py <entrada> <nombre>`.
- El procesador local y el del panel fijan a #F6EEE3 los píxeles de fondo cercanos al tono
  del marco, incluso si el promedio ya coincide. Así elimina variaciones y degradados leves.
- Si se vuelve a cambiar `--foto-crema`, hay que reprocesar todas las fotos con ese script,
  porque si no se ve el recuadro de la imagen contra la tarjeta.
- El 2026-09-03 se renovaron 14 fotos a granel usando como molde exacto el bowl, encuadre y
  escala de `semillas-de-zapallo.webp`. Esa foto quedó intacta. También se quitaron los
  frascos rotulados Paladear de Nuez Mariposa y Castaña de Cajú; ahora ambas usan el bowl.

## Íconos del inicio — 2026-09-02
Los generó Juani con el mismo criterio que las fotos de producto (fondo plano #F6EEE3).
Están en `assets/`, a 260x260 webp, y pesan cerca de 107 KB los nueve juntos.
- Categorías (campo `img` en `CATEGORIAS`, `js/datos.js`): `cat-frutos.webp`,
  `cat-infusiones.webp`, `cat-legumbres.webp`, `cat-sintacc.webp`,
  `cat-dulces.webp` y `cat-despensa.webp`.
- Accesos de la sección "También podés" (en `vistaHome()`, `js/app.js`):
  `acceso-mix.webp`, `acceso-combos.webp`, `acceso-info.webp`.
Se procesan igual que las fotos: `python3 scripts/foto-producto.py <entrada> <nombre> 260 assets`.

## Carrusel de categorías del inicio — 2026-09-03
- La portada muestra todas las categorías en orden alfabético, agrupadas de a cuatro.
- En mobile cada página conserva la grilla 2x2 validada; en desktop son cuatro tarjetas en
  una fila. La pista se desplaza horizontalmente con scroll-snap y también se puede navegar
  con los indicadores inferiores. Las páginas incompletas quedan centradas en desktop.
- Al sumar categorías nuevas en el panel no hay que editar la portada: el carrusel crea las
  páginas automáticamente desde `categoriasVisibles()`.

## Panel de administración — 2026-09-03
- Vive en `admin.html` + `css/panel.css` + `js/panel.js`, en el mismo repo y con la misma
  identidad visual que la tienda. URL: `https://lanatural-dietetica.github.io/admin.html`.
- **No hay servidor ni base de datos.** El panel lee y escribe `data/catalogo.json` con la API
  de GitHub. La clave (token fine-grained con permiso Contents) la pega la clienta una sola vez
  y queda en el localStorage de su celular (`lanatural_clave_panel`). Nunca va en el código.
- **El catálogo ya no vive en `js/datos.js`**: ese archivo ahora sólo carga
  `data/catalogo.json` y deja una copia en el navegador por si falla la descarga.
  Para cambiar productos o precios se edita el JSON (a mano o desde el panel), NO el JS.
- Guardar hace un commit en `main`, así que hay historial de precios gratis y la tienda
  se actualiza en un minuto (GitHub Pages).
- Los precios se calculan igual que en la tienda: costo → ganancia → descuento → redondeo.
- Estados: En venta (`estado:'publicado'`, `disponible:true`), Sin stock (`publicado` +
  `disponible:false`) y Oculto (`estado:'borrador'`).
- **Fotos**: el panel las achica en el propio celular antes de subirlas — 800x800, fondo
  emparejado con `#F6EEE3` y WebP (de 3 MB a ~65 KB). Si la foto ya viene con el fondo
  correcto, se saltea ese paso para no hacerla esperar. Se guardan en
  `assets/productos/<slug>.webp` y el campo `img` lleva `?v=` para saltar el caché.
- **Alta y edición completa**: botón "+ Nuevo" en la lista; el editor maneja nombre, bajada,
  categoría, marca, granel/envasado, medidas (hasta 3, con la más grande como predeterminada),
  costo/ganancia/descuento, etiquetas, destacado, si entra en el mix, los textos de la ficha
  (descripción, preparación, origen, ingredientes, alérgenos) y el estado. El slug se genera
  solo desde el nombre y se controla que no se repita. No deja borrar un producto que esté
  dentro de un combo. **El producto nuevo nace En venta**, no oculto (pedido de Juani).
- Arriba a la derecha hay **Guardar** (aparece sólo dentro de un producto). No hay botón de
  salir a propósito: la clave se pide una sola vez y queda en el celular. Si la clave dejara
  de servir, el panel la borra solo y vuelve a pedirla.
- Falta (etapas siguientes): combos y configuración del negocio.

## Ajuste visual de escritorio — 2026-09-03
- La composición mobile validada contra las maquetas no se toca. Los ajustes nuevos viven
  dentro de `@media (min-width:960px)` al final de `css/estilos.css`.
- En desktop, el hero lleva el texto superpuesto sobre la foto panorámica v2:
  `assets/hero-lanatural-desktop-v2.webp` (con `.jpg` de respaldo). La escena agrupa bowls,
  chocolate, canela y semillas con mayor presencia, sin recortar ningún producto. Mobile
  conserva `assets/hero-lanatural.webp` y su composición validada.
- El hero usa `Elegí lo natural.` como título y `Sabores para disfrutar.` como bajada en
  `data/catalogo.json`.
- Las tarjetas de categoría son más compactas y usan `#FAE7D0` sólo en desktop para coincidir
  con el promedio visual de sus imágenes. La imagen lleva `filter:none`; el drop-shadow previo
  sombreaba el rectángulo opaco y hacía parecer que el fondo era de otro color.
- También se compactaron en desktop las cards de producto, combos, el creador de mix y la
  pantalla Cómo comprar. No replicar estas escalas en mobile.

## Catálogo, búsqueda, carrito y mix — 2026-09-03
- Los productos y las categorías se presentan en orden alfabético. En el mix, el orden de
  categorías es una excepción deliberada: `Todos`, `Frutos y semillas` y luego el resto
  alfabético.
- El buscador ya no es un filtro pequeño dentro del catálogo: abre una pantalla propia,
  predice categorías y productos desde dos letras y conserva el campo fijo al desplazar.
- Al bajar por el catálogo aparece `#header-compacta`, con buscador y una hamburguesa que
  abre únicamente categorías. Mantener esa barra separada del menú general.
- El carrito conserva las distintas presentaciones porque son más cómodas para compras
  grandes. Al editar muestra el peso total del producto y la cuenta por variante
  (`3 × 250 g = 750 g`); no reemplazar esto por incrementos únicos de la medida mínima.
- El mix no tiene límite de ingredientes: el único límite es el peso elegido. Al elegir el
  tamaño baja al paso 2 y, al completar el peso, baja al resumen del paso 3.
- Al sumar o quitar gramos del mix se actualiza cada fila sin reconstruir la lista: así las
  imágenes no titilan. Toda fila elegida usa un fondo verde oliva claro para distinguirla.
- El catálogo no tiene filtro de disponibilidad. Su único selector combina orden y filtros:
  nombre A-Z, precio ascendente/descendente, sólo destacados, sólo Sin TACC y sólo veganos.
- En mobile todos los campos editables tienen al menos 16 px para que Safari no haga zoom
  automático al enfocarlos. `html` usa `touch-action:manipulation` para evitar el zoom por
  doble toque, pero el viewport no bloquea el zoom manual con dos dedos. Esto también aplica
  al panel de administración.
- El hero desktop es una pieza contenida de hasta 1320 px, con márgenes laterales, esquinas
  suaves y altura determinada por la proporción 1983/793 de la foto v2. El texto queda
  centrado ópticamente y los productos comienzan cerca del mensaje. Estos ajustes siguen
  dentro de `@media (min-width:960px)` y no modifican mobile.

## Reglas que salieron de la auditoría — 2026-09-03
Se auditó todo el sitio (funcionamiento, datos, accesibilidad, peso y coherencia visual).
No había bugs; sí desprolijidades acumuladas por trabajar en capas. Para no volver a ellas:

**Colores.** Usar SIEMPRE las variables de `:root`. No inventar cremas nuevos: había 16 tonos
separados por 2 a 5 puntos, invisibles a ojo, que sólo ensuciaban. Se unificaron (63 → 54
colores). Si hace falta un tono que no existe, agregarlo como variable, no suelto en una regla.

**Tamaños mínimos.** Nada que se toque puede medir menos de 36 px, y lo que se toca seguido
(favoritos, stepper, medidas) va en 40. Ningún texto por debajo de 10,5 px: la clientela de una
dietética no tiene veinte años. El contraste mínimo es 4,5 — el oliva `--oliva` sobre blanco da
4,58, así que **no aclarar ese verde** para textos en blanco.

**Peso.** Fotos de producto a 800x800 webp (~60 KB). Íconos del inicio a 260x260.
Hero móvil ~110 KB, hero escritorio ~120 KB. Antes de subir una imagen, pasarla por
`scripts/foto-producto.py`. Si una imagen deja de usarse, **borrarla**: había 793 KB de heros
viejos sin referencia.

**Íconos del inicio.** Hay ocho categorías visibles, ordenadas alfabéticamente y paginadas de
cuatro en cuatro. Mobile conserva la grilla 2×2, el swipe y los puntos; desde 640 px se usan
flechas laterales y no se muestran puntos. Todos los íconos, incluidos `acceso-mix.webp`,
`acceso-combos.webp` y `acceso-info.webp`, llevan lienzo 260×260, contenido visual de hasta
226 px y fondo plano exacto `--foto-crema` (`#F6EEE3`). Normalizarlos con
`scripts/icono-categoria.py`; no corregir diferencias de fondo agregando otro crema en CSS.
Las categorías incorporadas para la demo son `Conservas` y `Suplementos naturales`.

**CSS.** Hoy hay selectores definidos hasta once veces (`.cat-card__fig`, `.cat-card`, `.hero`).
La mayoría son legítimos, uno por tamaño de pantalla, pero conviene **editar la regla que ya
existe en el bloque que corresponde en vez de apilar otra corrección al final del archivo**.
Si un cambio no se ve, es porque una capa posterior lo está pisando.

**Antes de dar algo por terminado**: abrir el catálogo, la ficha, el mix, los combos y el
carrito en celular y en escritorio, y mirar la consola. La auditoría completa está en el
historial de la conversación del 2026-09-03.

## Categorías — definidas por Juani el 2026-09-04
Son ocho y **no se agregan más sin pedirlo**: Frutos y semillas, Infusiones, Granos y
legumbres, Sin TACC, Dulces y cacao, Despensa, Conservas y Suplementos naturales.
- Las **semillas van con los frutos secos**, no en una categoría propia.
- Las **harinas y las especias van en Despensa**.
Entran justas en dos páginas de cuatro en el carrusel del inicio, que lleva 16 px de
separación entre páginas para que se vea el corte al pasar de una a otra.

## Logotipo — 2026-09-04 (cambios hechos por Claude)
Los logos salieron del PDF que pasó Juani (4 variantes). Están en `assets/logo/`,
ya recortados, en el color de la marca y con fondo transparente:

| Archivo | Qué es | Dónde se usa |
|---|---|---|
| `lockup-crema.webp` | óvalo "LA" + "Natural" | header de la tienda |
| `lockup-taupe.webp` | ídem, en marrón | pantalla de acceso del panel |
| `wordmark-*.webp` | sólo "LA Natural" | libre |
| `sello-crema.webp` | sello circular con "NATURAL" alrededor | pie de página |
| `sello-taupe.webp` | ídem, en marrón | libre |
| `monograma-*.webp` | sólo el óvalo con la "LA" | libre (sirve para tamaños chicos) |
| `vertical-taupe.webp` | monograma + "Natural" | libre |
| `og.png` | 1200×630 para compartir | metatags `og:image` |
| `icono-192/512.png`, `apple-touch-icon.png`, `favicon-32/64.png` | ícono cuadrado | favicon, manifest, celular |

- El color de la tinta del logo es **taupe `#7a6a5a`**: no es el marrón del sitio.
  Sobre fondos oscuros va en champán `#f4ead9`.
- El `<h1>` de marca del header sigue existiendo como texto oculto
  (`#marca-nombre` con `.visually-hidden`) para SEO y lectores de pantalla:
  **no lo borres**, `app.js` lo escribe desde `CONFIG.marca`.
- Tamaños del logo del header: `.marca__logo` con altura por breakpoint
  (36 px mobile, 42 base, 44 ≥640, 44/46 desktop, 26 en header compacto).
- **La bajada "productos saludables" va como texto, no como imagen.** En el lockup
  original es tan chica que a la altura del header quedaría en 2 px. Se escribe con
  Karla en versalitas (`.marca__bajada`, `CONFIG.bajada`), liviana y con poca opacidad
  para que el logo siga mandando. Si la agrandás o la ponés en negrita, tapa al logo.

## Salir en internet (SEO) — 2026-09-04 (cambios hechos por Claude)
- `index.html` lleva title/description propios, canonical absoluto, Open Graph y
  Twitter Card apuntando a `assets/logo/og.png`.
- `site.webmanifest` (instalable en el celular), `robots.txt` (bloquea `admin.html`)
  y `sitemap.xml`. La URL del sitio es `https://lanatural-dietetica.github.io/`:
  si algún día se compra un dominio, hay que cambiarla en esos tres archivos y en
  los metatags.
- `fichaGoogle()` en `app.js` arma el JSON-LD de `GroceryStore` con lo que hay en
  `CONFIG`. **No inventa datos**: si el WhatsApp sigue siendo el de ejemplo o la
  dirección dice "completar", esos campos no salen.

## WhatsApp — 2026-09-04 (cambios hechos por Claude)
- Todos los links pasan por `waLink(texto)`, que limpia el número (acepta espacios,
  guiones y `+`). No armar URLs de `wa.me` a mano.
- `waValido()` decide si se muestran los links: pide 12 dígitos o más y descarta el
  número de ejemplo. Mientras `CONFIG.whatsapp` sea `5492610000000` no aparece el
  link ni en el pie ni en el menú, a propósito.
- **Falta el número real de la clienta.** Cuando esté, se carga en
  `data/catalogo.json` → `config.whatsapp`, en formato `549261...` sin `+` ni espacios.


## Fondo de las fotos, segunda vuelta — 2026-09-04 (cambios hechos por Claude)
El primer algoritmo corría el color de **cualquier** píxel parecido al fondo, en
cualquier parte de la imagen. Resultado: los envases blancos se volvían crema y se
fundían con la tarjeta. Juani lo marcó: "me gusta lo del fondo pero es peligroso".

Ahora, tanto en `js/panel.js` (`emparejarFondo`) como en `scripts/foto-producto.py`
(`pegado_al_borde`), el fondo se pinta **avanzando desde el marco de la foto**:
- Sólo se corrige lo que está conectado con el borde, así una etiqueta blanca en el
  medio del envase no se toca.
- La corrida frena en cuanto hay un **escalón de color de 3 o más** entre dos píxeles
  vecinos (`PASO = 3`). Eso deja pasar el degradé del fondo y de la sombra —que suben
  de a un punto por píxel— y frena en el borde del producto. **No suavices la imagen
  antes de medir el escalón**: se probó y aplasta el borde, la mancha se escapa y el
  envase se vuelve a lavar.
- Red de seguridad: si el fondo igual se metió en el centro (más del 35 % del cuadro
  central), es porque el producto es casi del color del fondo. Ahí **no se corrige
  nada**: se deja la foto como está y el panel se lo avisa a la clienta.

Fotos ya reparadas desde el original de Paladear: plata coloidal, probióticos, rhodiola
rosea, sal dietética, tomate condimentado y tomate triturado. Al cambiar el archivo hay
que subir el `?v=` del campo `img` de ese producto en `data/catalogo.json`.

Quedan dos casos sin resolver, no los toqué:
- Los **bowls generados** (los 84 de Codex) tienen productos blancos —harinas, porotos
  alubia, panko— con el centro en crema exacto. No tengo el original para rehacerlos.
  Si los regenerás, revisá que el blanco siga siendo blanco.
- `salsa-de-tomate-crema.webp` y `harina-integral-de-trigo.webp` los subió la clienta
  desde el panel con el algoritmo viejo: hay que volver a subirlos.

## Ajustes visuales — 2026-09-04, segunda tanda (cambios hechos por Claude)
- **Logo del header engrosado.** Los trazos finos del lockup desaparecían a 36 px.
  Se engordó la máscara con un `MaxFilter(5)` a 1200 px de alto y después se bajó a
  200: queda legible sin cerrar los ojales del óvalo. El "grueso" (radio 9) ya
  emborrona la N, no subir de ahí.
- **Corazón de favoritos** sin plato de fondo (`background:transparent`) para no tapar
  la foto; el área táctil sigue en 40 px. Activo se pinta de `--russet` con
  `fill:currentColor`, y lleva `drop-shadow` para que se lea sobre cualquier foto.
- **Fondo de página más oscuro**: variable nueva `--fondo:#d5dcc6` (oliva claro; el arena `#e4d3b8` se probó y no combinaba con el crema), sólo para `body`.
  Las tarjetas siguen en `--crema-card` y las fotos en `--foto-crema`, así el producto
  salta en vez de fundirse. El hero sigue en `#f4ead9` a propósito, para que la foto
  del hero no corte contra el fondo.
- **Franja de arriba del catálogo** (`.cat-cabecera`): el título "Nuestra selección", el
  buscador, los chips y el orden van sobre el mismo fondo arena `--arena:#d2ae83`, de
  punta a punta de la pantalla y cerrado con una línea abajo. **No es una caja**: se probó
  encerrar sólo los filtros en un recuadro redondeado y Juani lo rechazó. Los elementos de
  adentro conservan el formato que ya tenían. La franja arranca pegada al header
  (`.seccion.catalogo{padding-top:0}`, con dos clases porque si no la pisan las reglas de
  `.catalogo` de los breakpoints).
- La franja lleva un **grano de papel** en `::before` (SVG feTurbulence, `opacity:.085`).
  Es la textura que pidió Juani. Si sube mucho, ensucia el color.
  Ojo: `body` está definido **dos veces** sin media query (líneas ~36 y ~503). La segunda
  gana. Si tocás el fondo de la página hay que cambiar **las dos** o el escritorio queda
  con el color viejo (ya pasó una vez).
- **Filtro "Solo ofertas"** en el desplegable del catálogo, al lado de "Solo destacados"
  (filtra `descuento > 0`). Juani lo pidió ahí y no como sección aparte ni vista propia.
- **Favoritos: se sacaron por completo el 2026-09-05.** El corazón guardaba productos en
  `localStorage` pero no había dónde verlos; se probó un chip "Favoritos" entre las
  categorías y Juani decidió que era demasiado para esta tienda. Se borró el corazón de la
  tarjeta, el chip, el filtro y el `LS_FAVS`. **No volver a agregarlo sin que lo pida.**

## Maqueta del catálogo — 2026-09-05 (cambios hechos por Claude)
Juani pasó `maquetafondocatalogo.PNG`. De ahí salieron, medidos sobre la imagen:
- Franja de arriba `--arena:#f6eee4`, grilla `--fondo:#d7dcc9`, tarjetas `#fbf6ed`.
- **Fondo de las fotos `--foto-crema:#f6eee3`** (antes #FAE6D0, más durazno). Se
  reprocesaron las 145 fotos de producto y los `cat-*`, `acceso-*` y `combo-*`; ocho
  quedaron fuera del algoritmo normal (producto del color del fondo) y se hicieron con
  un margen más chico (LEJOS 32 / CERCA 14).
- Las **hojas** (`assets/hojas-izq.webp`, `hojas-der.webp`) están recortadas de esa
  misma maqueta, no dibujadas: se les sacó el fondo por distancia de color y se borró
  lo marrón (líneas y texto) filtrando `r - b > 35` con `r < 200`. Van en
  `.cat-cabecera::before/::after`, medidas **en proporción** (15 % y 8 % del ancho): la
  primera vez se usaron los píxeles de la captura como si fueran píxeles de pantalla y
  quedaron al doble de tamaño. En la maqueta las hojas seguían por debajo del buscador y
  de los chips, así que **el borde de adentro va desvanecido** (rampa de alfa al recortar):
  si se corta en seco se nota. Los bordes que tocan el costado de la pantalla sí se cortan,
  y está bien: se leen como que siguen fuera de cuadro.
- La fila de abajo de la franja (`.orden-fila`) lleva "N productos" a la izquierda y el
  orden a la derecha, separada por una línea, como en la maqueta.

## Datos reales y checkout — 2026-09-05
- WhatsApp real: **5492622724422**. Dirección: **Libertad 1241, Villa Nueva, Mendoza**.
- El checkout **ya no pide teléfono**: el pedido llega por WhatsApp, así que el número ya
  lo tiene el local. No volver a agregarlo.

## Volver y posición del scroll — 2026-09-05
- La ficha de producto tiene un botón **Volver** pegajoso arriba a la izquierda.
- Cada pantalla se acuerda de su scroll (`posiciones`, en `app.js`). Al volver —con ese
  botón o con el del celular— se vuelve al punto donde estabas; al entrar a una pantalla
  nueva, arranca arriba. La posición se guarda al principio de `render()`, antes de
  reemplazar el HTML, **no** sólo en el evento de scroll.
- El botón "Ver productos" del hero apunta a `#/catalogo?cat=todos` para que no arrastre
  la categoría que estaba filtrada.
