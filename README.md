# DIETÉTICA — tienda online (versión de prueba)

Tienda estática mobile-first para una dietética de Mendoza. El pedido termina en
**WhatsApp**: no hay pago online.

**Demo:** https://paladear.github.io/dietetica-test/

> **DIETÉTICA es un nombre provisional.** Las maquetas originales decían "MUNA",
> que era ficticio. Cuando esté el nombre real se cambia en `js/datos.js` → `CONFIG.marca`.

## Archivos

| Archivo | Qué tiene |
|---|---|
| `index.html` | Cáscara: header, menú, carrito, pie, barra inferior |
| `css/estilos.css` | Todo el diseño (paleta russet / champán / oliva) |
| `js/datos.js` | **Datos editables**: config del negocio, categorías, presentaciones, productos, combos, reglas del mix |
| `js/app.js` | Lógica: precios, catálogo, ficha, mix, combos, carrito y mensaje de WhatsApp |

Para cambiar el catálogo, los precios o los datos del local se toca **solo `js/datos.js`**.

## Cómo se calculan los precios

Nunca se escribe el precio a mano. Se carga el **costo** y el sistema hace:

```
precio_venta = costo × (1 + margen / 100)
precio_final = precio_venta × (1 − descuento / 100)
```

Después redondea al múltiplo de `CONFIG.redondeo` (por defecto $50).

- Productos a granel (`tipo: 'granel'`): se carga `costoKg` y cada presentación
  se calcula por sus gramos (100 g, 250 g, 500 g, 1 kg…).
- Productos envasados (`tipo: 'envasado'`): se carga `costoUnidad` y usan la
  presentación `unidad`.

## Qué falta / próximos pasos

1. Nombre real, logo y favicon.
2. Número de WhatsApp real en `CONFIG.whatsapp` (formato `549` + área sin 0 + número sin 15).
3. Dirección, horarios, zonas de envío y medios de pago.
4. Catálogo real con costos (hoy son datos de demostración, marcados con una banda arriba).
5. Fotos de producto (hoy hay dibujos SVG livianos como placeholder).
6. Panel administrador. Ver "Sobre el panel" abajo.

## Sobre el panel administrador

GitHub Pages sirve **archivos estáticos**: no puede haber login ni base de datos
en este repo. Hay dos caminos:

- **Camino corto (como Paladear):** el catálogo se administra en una planilla de
  Google Sheets y la web la lee publicada como CSV. Ya está previsto en
  `CONFIG.sheet`. No requiere cambiar de hosting.
- **Camino largo:** aplicación con servidor (Vercel/Netlify + base SQL + storage
  de imágenes) y panel con usuario y contraseña, como pide `PROMPT_PARA_CODEX.md`.
  Eso ya no vive en GitHub Pages.

## Publicar

Editar el archivo en GitHub (web) y hacer commit en `main`. Pages actualiza solo
en un minuto. No hay build.
