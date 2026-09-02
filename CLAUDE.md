# Reglas del proyecto DIETÉTICA

Sitio estático publicado en GitHub Pages. Trabajan en paralelo Claude y Codex:
**antes de editar, traé la versión fresca del archivo** (el otro pudo haberlo tocado).

## Marca
- La marca real todavía no está definida. Se muestra **DIETÉTICA** como provisional.
- **Nunca usar MUNA.** Era el nombre ficticio de las maquetas de referencia.
- Todo lo del negocio (nombre, WhatsApp, dirección, horarios, textos) vive en
  `CONFIG`, dentro de `js/datos.js`. No hardcodear datos en el HTML ni en `app.js`.

## Identidad visual (viene de las maquetas en ../referencia/)
- Russet `#7b3f1d` (header, franjas, acentos fuertes).
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
