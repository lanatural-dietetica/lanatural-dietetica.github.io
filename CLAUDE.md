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
- El color oficial es **#FAE6D0** (`--foto-crema` en `css/estilos.css`). Antes era #f5e6d4;
  se cambió para que coincida con lo que devuelve el generador de imágenes, que nunca
  respeta el hex exacto que se le pide.
- Toda foto nueva se prepara con `scripts/foto-producto.py`, que mide el fondo real en el
  marco, lo lleva a #FAE6D0 sin tocar el bowl ni dejar halo, redimensiona a 800x800 y guarda
  `.webp` y `.jpg`. Uso: `python3 scripts/foto-producto.py <entrada> <nombre>`.
- El procesador local y el del panel fijan a #FAE6D0 los píxeles de fondo cercanos al tono
  del marco, incluso si el promedio ya coincide. Así elimina variaciones y degradados leves.
- Si se vuelve a cambiar `--foto-crema`, hay que reprocesar todas las fotos con ese script,
  porque si no se ve el recuadro de la imagen contra la tarjeta.
- El 2026-09-03 se renovaron 14 fotos a granel usando como molde exacto el bowl, encuadre y
  escala de `semillas-de-zapallo.webp`. Esa foto quedó intacta. También se quitaron los
  frascos rotulados Paladear de Nuez Mariposa y Castaña de Cajú; ahora ambas usan el bowl.

## Íconos del inicio — 2026-09-02
Los generó Juani con el mismo criterio que las fotos de producto (fondo plano #FAE6D0).
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
  emparejado con `#FAE6D0` y WebP (de 3 MB a ~65 KB). Si la foto ya viene con el fondo
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

**Peso.** Fotos de producto a 800x800 webp (~60 KB). Íconos del inicio a 260x260 (~12 KB).
Hero móvil ~110 KB, hero escritorio ~120 KB. Antes de subir una imagen, pasarla por
`scripts/foto-producto.py`. Si una imagen deja de usarse, **borrarla**: había 793 KB de heros
viejos sin referencia.

**CSS.** Hoy hay selectores definidos hasta once veces (`.cat-card__fig`, `.cat-card`, `.hero`).
La mayoría son legítimos, uno por tamaño de pantalla, pero conviene **editar la regla que ya
existe en el bloque que corresponde en vez de apilar otra corrección al final del archivo**.
Si un cambio no se ve, es porque una capa posterior lo está pisando.

**Antes de dar algo por terminado**: abrir el catálogo, la ficha, el mix, los combos y el
carrito en celular y en escritorio, y mirar la consola. La auditoría completa está en el
historial de la conversación del 2026-09-03.
