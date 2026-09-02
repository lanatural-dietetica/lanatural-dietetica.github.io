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
- Tester y repo: `https://paladear.github.io/dietetica-test/` y
  `https://github.com/paladear/dietetica-test`.

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
