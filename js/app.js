/* ============================================================
   DIETÉTICA — lógica de la tienda
   Secciones: utilidades · precios · carrito · vistas · router
   ============================================================ */
'use strict';

/* ---------------- utilidades ---------------- */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const fmt = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const money = n => '$ ' + fmt.format(Math.round(n || 0));

const pres = id => PRESENTACIONES.find(p => p.id === id);
const presNombre = id => (pres(id) || {}).nombre || id;
const prodPorId = id => PRODUCTOS.find(p => p.id === id);
const prodPorSlug = s => PRODUCTOS.find(p => p.slug === s);
const catPorId = id => CATEGORIAS.find(c => c.id === id);
const etiqueta = id => (ETIQUETAS.find(e => e.id === id) || {}).nombre || id;

const publicados = () => PRODUCTOS
  .filter(p => p.estado === 'publicado')
  .sort((a, b) => (a.orden || 99) - (b.orden || 99));

const imgDe = o => o.img || imgDemo(o.color || '#c8a97e', o.color2 || '#e3cba6');

/* ---------------- precios ----------------
   costo → precio de venta (margen) → precio final (descuento) → redondeo
------------------------------------------- */
function redondear(n) {
  const r = CONFIG.redondeo || 0;
  return r > 0 ? Math.round(n / r) * r : Math.round(n);
}

function costoDe(prod, presId) {
  if (prod.tipo === 'envasado') return prod.costoUnidad || 0;
  const p = pres(presId);
  if (!p || !p.gramos) return 0;
  return (prod.costoKg || 0) * p.gramos / 1000;
}

function precios(prod, presId) {
  const costo    = costoDe(prod, presId);
  const margen   = Number.isFinite(prod.margen) ? prod.margen : CONFIG.margenPorDefecto;
  const desc     = Math.min(Math.max(prod.descuento || 0, 0), 90);
  const venta    = redondear(costo * (1 + margen / 100));
  const final    = redondear(venta * (1 - desc / 100));
  return { costo, margen, descuento: desc, venta, final, ahorro: venta - final };
}

const precioDesde = prod => precios(prod, prod.presentacionDefecto).final;

function preciosCombo(combo) {
  let suma = 0;
  combo.items.forEach(it => {
    const p = prodPorId(it.productoId);
    if (p) suma += precios(p, it.presentacionId).final * (it.cant || 1);
  });
  const lista = redondear(suma);
  const final = combo.precioEspecial
    ? redondear(combo.precioEspecial)
    : redondear(lista * (1 - (combo.descuento || 0) / 100));
  return { lista, final, ahorro: Math.max(lista - final, 0) };
}

/* precio de venta por kilo de un producto a granel (con su margen y descuento) */
function precioKgVenta(prod) {
  const margen = Number.isFinite(prod.margen) ? prod.margen : CONFIG.margenPorDefecto;
  const desc   = Math.min(Math.max(prod.descuento || 0, 0), 90);
  return redondear((prod.costoKg || 0) * (1 + margen / 100) * (1 - desc / 100));
}

/* el mix se cobra por lo que lleva: cada ingrediente por sus gramos, más el recargo de armado */
function cuentaMix(ing) {
  const filas = Object.entries(ing || {}).filter(([, g]) => g > 0).map(([id, g]) => {
    const p = prodPorId(id);
    return { id: id, nombre: p ? p.nombre : '?', gramos: g, subtotal: redondear(precioKgVenta(p || {}) * g / 1000) };
  });
  const gramos = filas.reduce((s, f) => s + f.gramos, 0);
  const suma   = filas.reduce((s, f) => s + f.subtotal, 0);
  return { filas: filas, gramos: gramos, suma: suma, total: redondear(suma * (1 + (MIX.recargo || 0) / 100)) };
}

const gLabel = g => g >= 1000 && g % 1000 === 0 ? (g / 1000) + ' kg' : g + ' g';

/* ---------------- estado ---------------- */
const LS_CARRITO = 'dietetica_carrito_v1';
const LS_FAVS    = 'dietetica_favs_v1';
const LS_PERFIL  = 'dietetica_perfil_v1';
const LS_ULTIMO  = 'dietetica_ultimo_v1';

const estado = {
  carrito: leer(LS_CARRITO, []),
  favs:    leer(LS_FAVS, []),
  catalogo: { q: '', cat: 'todos', orden: 'destacados', soloDisponibles: false },
  mix: { tam: null, ing: {}, cat: 'todos', q: '', nombre: '' },
  ficha: { pres: null, cant: 1, tab: 'descripcion' },
  cards: {},  // { idProducto: { pres, cant } } — lo elegido en cada tarjeta del catálogo
  checkout: { paso: 0, tipo: null }
};

function leer(k, def) {
  try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; }
  catch (e) { return def; }
}
function guardar(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
}

/* ---------------- carrito ---------------- */
function agregar(item) {
  const ya = estado.carrito.find(i => i.key === item.key);
  if (ya) ya.cant += item.cant;
  else estado.carrito.push(item);
  guardar(LS_CARRITO, estado.carrito);
  pintarContadorCarrito();
  toast(item.cant + ' × ' + item.nombre + ' agregado');
}
function cambiarCant(key, delta) {
  const it = estado.carrito.find(i => i.key === key);
  if (!it) return;
  it.cant += delta;
  if (it.cant <= 0) estado.carrito = estado.carrito.filter(i => i.key !== key);
  guardar(LS_CARRITO, estado.carrito);
  pintarContadorCarrito();
  pintarCarrito();
}
function quitar(key) {
  estado.carrito = estado.carrito.filter(i => i.key !== key);
  guardar(LS_CARRITO, estado.carrito);
  pintarContadorCarrito();
  pintarCarrito();
}
/* un mismo producto en varias presentaciones se muestra como un solo bloque */
function agruparCarrito() {
  const bloques = [];
  const indice = {};
  estado.carrito.forEach(i => {
    const clave = i.tipo === 'producto' ? 'prod:' + i.id : i.key;
    if (indice[clave] == null) {
      indice[clave] = bloques.length;
      bloques.push({ clave: clave, tipo: i.tipo, nombre: i.nombre, img: i.img, lineas: [] });
    }
    bloques[indice[clave]].lineas.push(i);
  });
  bloques.forEach(b => {
    b.lineas.sort((x, y) => ((pres(x.presentacionId) || {}).gramos || 0) - ((pres(y.presentacionId) || {}).gramos || 0));
    b.subtotal = b.lineas.reduce((s, l) => s + l.precio * l.cant, 0);
    b.unidades = b.lineas.reduce((s, l) => s + l.cant, 0);
  });
  return bloques;
}

function quitarBloque(clave) {
  estado.carrito = estado.carrito.filter(i => (i.tipo === 'producto' ? 'prod:' + i.id : i.key) !== clave);
  guardar(LS_CARRITO, estado.carrito);
  pintarContadorCarrito();
  pintarCarrito();
}

const totalCarrito = () => estado.carrito.reduce((s, i) => s + i.precio * i.cant, 0);
const unidadesCarrito = () => estado.carrito.reduce((s, i) => s + i.cant, 0);

function pintarContadorCarrito() {
  const n = unidadesCarrito();
  $$('.carrito-btn__n, .cart-fab__n').forEach(el => { el.textContent = n; });
  const fab = $('#cart-fab');
  if (fab) {
    if (n > 0) { fab.hidden = false; requestAnimationFrame(() => fab.classList.add('visible')); }
    else { fab.classList.remove('visible'); setTimeout(() => { if (!unidadesCarrito()) fab.hidden = true; }, 250); }
  }
}

function toggleFav(id) {
  estado.favs = estado.favs.includes(id)
    ? estado.favs.filter(f => f !== id)
    : estado.favs.concat(id);
  guardar(LS_FAVS, estado.favs);
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), 2200);
}

/* ---------------- íconos ---------------- */
const ICO = {
  carrito: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 11.4a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.5L21 7H6"/></svg>',
  lupa: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  menu: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  cerrar: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  corazon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 20s-7-4.5-7-9.2A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.8C19 15.5 12 20 12 20z"/></svg>',
  camion: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M1 6h12v10H1zM13 9h4l3 3v4h-7z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
  caja: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg>',
  mas: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  flecha: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
  wa: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.5 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.7-1.2-4.5-4-4.6-4.2-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2 0 .4-.1.5l-.3.4c-.1.2-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1 1 2 1.3 2.3 1.5.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.6-.1l1.8.9c.3.1.4.2.5.3.1.2.1.6-.2 1.2z"/></svg>',
  inicio: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  hoja: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 20C4 10 12 4 20 4c0 8-5 15-13 15-1.4 0-3-.4-3-.4z"/><path d="M4 20c3-5 7-8 11-10"/></svg>',
  tienda: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h16v11H4z"/><path d="M3 9l1.5-5h15L21 9"/><path d="M9 20v-6h6v6"/></svg>',
  basura: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>',
  bolsa: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h14l-1 13H6z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
  ornamento: '<svg class="pasos__ornamento" viewBox="0 0 300 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M0 12h124M176 12h124"/><path d="M126 12c9-15 18 15 27 0s18 15 27 0M138 5c4 7 8 10 12 7M162 5c-4 7-8 10-12 7"/><circle cx="2" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="298" cy="12" r="2" fill="currentColor" stroke="none"/></svg>',
  pasoProducto: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="50" cy="50" r="42"/><path d="M28 51h44c-2 17-10 25-22 25s-20-8-22-25z"/><path d="M37 48c-5-11 0-19 8-26 5 11 2 20-4 26M49 46c4-13 13-18 25-18-2 12-10 19-22 21M59 48c7-7 15-7 22-4-5 8-12 11-21 9"/><ellipse cx="75" cy="70" rx="4" ry="2.5"/><ellipse cx="82" cy="64" rx="3" ry="2"/></svg>',
  pasoCantidad: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="50" cy="50" r="42"/><path d="M31 31h38c0 9-6 15-14 17v5h11l5 24H29l5-24h11v-5c-8-2-14-8-14-17z"/><circle cx="50" cy="65" r="8"/><path d="M50 65l5-5M42 31h16"/></svg>',
  pasoEntrega: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="50" cy="50" r="42"/><path d="M14 61h24V43H14v18zm24-13h10l8 8v5H38V48z"/><circle cx="24" cy="65" r="4"/><circle cx="47" cy="65" r="4"/><path d="M61 41h25v28H61zM58 41h31l-4-12H62l-4 12zM70 69V55h8v14M58 41c1 5 7 5 8 0 1 5 7 5 8 0 1 5 7 5 8 0 1 5 7 5 8 0"/><path d="M55 27v48" stroke-dasharray="3 4"/></svg>'
};

/* ---------------- componentes ---------------- */
/* cada producto define sus propias medidas en datos.js; la tarjeta muestra hasta tres,
   que entran en una sola fila */
function presentacionesCard(p) {
  return p.presentaciones.slice(0, 3);
}

function estadoCard(p) {
  if (!estado.cards[p.id]) estado.cards[p.id] = { pres: p.presentacionDefecto, cant: 1 };
  const c = estado.cards[p.id];
  const visibles = presentacionesCard(p);
  if (!visibles.includes(c.pres)) c.pres = visibles.includes(p.presentacionDefecto) ? p.presentacionDefecto : visibles[0];
  return c;
}

/* lo que ya hay de ese producto en el carrito, para mostrarlo en la tarjeta */
function enElPedido(p) {
  const lineas = estado.carrito.filter(i => i.tipo === 'producto' && i.id === p.id);
  if (!lineas.length) return null;
  const subtotal = lineas.reduce((s, i) => s + i.precio * i.cant, 0);
  if (p.tipo === 'granel') {
    const g = lineas.reduce((s, i) => s + ((pres(i.presentacionId) || {}).gramos || 0) * i.cant, 0);
    return { texto: gLabel(g), subtotal: subtotal };
  }
  const u = lineas.reduce((s, i) => s + i.cant, 0);
  return { texto: u + (u === 1 ? ' unidad' : ' unidades'), subtotal: subtotal };
}


function tarjetaProducto(p) {
  const st  = estadoCard(p);
  const pr  = precios(p, st.pres);
  const cat = catPorId(p.categoria);
  const badge = p.destacado
    ? '<span class="prod__badge">Destacado</span>'
    : (p.tags && p.tags.includes('sintacc') ? '<span class="prod__badge prod__badge--tag">Sin TACC</span>' : '');
  const fav = estado.favs.includes(p.id);
  const ped = enElPedido(p);

  return '' +
  '<article class="prod' + (p.disponible ? '' : ' prod--agotado') + (ped ? ' prod--en-pedido' : '') + '" data-prod="' + p.id + '">' +
    '<a class="prod__fig" href="#/producto/' + p.slug + '" aria-label="Ver ' + esc(p.nombre) + '">' +
      badge +
      '<img src="' + imgDe(p) + '" alt="' + esc(p.nombre) + '" width="400" height="400" loading="lazy" decoding="async">' +
    '</a>' +
    '<button class="prod__fav" data-fav="' + p.id + '" aria-pressed="' + fav + '" aria-label="Guardar ' + esc(p.nombre) + ' en favoritos">' + ICO.corazon + '</button>' +
    '<h3 class="prod__nom"><a href="#/producto/' + p.slug + '">' + esc(p.nombre) + '</a></h3>' +
    '<p class="prod__sub">' + esc(p.subtitulo || (cat ? cat.nombre : '')) + '</p>' +

    (presentacionesCard(p).length > 1
      ? '<div class="pesos" role="group" aria-label="Cantidad de ' + esc(p.nombre) + '">' +
          presentacionesCard(p).map(id =>
            '<button class="peso-btn" data-peso="' + id + '" data-pid="' + p.id + '" aria-pressed="' + (id === st.pres) + '">' +
            esc(presNombre(id)) + '</button>').join('') +
        '</div>'
      : '') +

    '<div class="prod__precios" data-precio="' + p.id + '">' + preciosCard(p, st.pres) + '</div>' +

    (p.disponible
      ? '<div class="prod__pie">' +
          '<span class="stepper stepper--card">' +
            '<button data-cardcant="-1" data-pid="' + p.id + '" aria-label="Quitar una unidad">−</button>' +
            '<span data-cardq="' + p.id + '">' + st.cant + '</span>' +
            '<button data-cardcant="1" data-pid="' + p.id + '" aria-label="Sumar una unidad">+</button>' +
          '</span>' +
          (ped ? '<span class="prod__enpedido">' + ICO.carrito + '<span>' + esc(ped.texto) + ' · <strong>' + money(ped.subtotal) + '</strong></span></span>' : '') +
        '</div>' +
        '<button class="prod__add btn-onda" data-add="' + p.id + '">' + ICO.carrito + '<span>Agregar</span></button>'
      : '<p class="prod__agotado">Sin stock</p>') +

    (ped
      ? '<div class="prod__acciones">' +
          '<button class="prod__quitar" data-quitar-prod="' + p.id + '" aria-label="Quitar ' + esc(p.nombre) + ' del pedido">' + ICO.basura + '</button>' +
          '<button class="prod__vercarrito" data-abrir-carrito>Ver en el carrito</button>' +
        '</div>'
      : '') +
  '</article>';
}

/* precio por kilo primero (como pidió Juani) y debajo el de la medida elegida */
function preciosCard(p, presId) {
  const pr = precios(p, presId);
  if (p.tipo === 'granel') {
    const porKg = precioKgVenta(p);
    const listaKg = redondear((p.costoKg || 0) * (1 + (Number.isFinite(p.margen) ? p.margen : CONFIG.margenPorDefecto) / 100));
    return '<span class="precio precio--kg">' +
        (pr.descuento ? '<span class="precio__antes">' + money(listaKg) + '</span>' : '') +
        money(porKg) + '<em> / kg</em>' +
      '</span>' +
      ((pres(presId) || {}).gramos === 1000
        ? ''
        : '<span class="precio-medida">' + esc(presNombre(presId)) + ' · <strong>' + money(pr.final) + '</strong></span>');
  }
  return '<span class="precio precio--kg">' +
      (pr.descuento ? '<span class="precio__antes">' + money(pr.venta) + '</span>' : '') +
      money(pr.final) +
    '</span>' +
    '<span class="precio-medida">' + esc(presNombre(presId)) + '</span>';
}

/* vuelve a dibujar una sola tarjeta, sin tocar el resto de la grilla */
function repintarCard(id) {
  const p = prodPorId(id);
  const el = document.querySelector('.prod[data-prod="' + id + '"]');
  if (!p || !el) return;
  el.outerHTML = tarjetaProducto(p);
}

const grilla = arr => '<div class="grilla">' + arr.map(tarjetaProducto).join('') + '</div>';

const vacio = (t, s) => '<div class="vacio"><h3>' + esc(t) + '</h3><p>' + esc(s) + '</p></div>';

/* ---------------- vistas ---------------- */
function vistaHome() {
  const destacados = publicados().filter(p => p.destacado).slice(0, 6);
  const cats = CATEGORIAS.filter(c => c.visible).sort((a, b) => a.orden - b.orden).slice(0, 4);

  return '' +
  '<section class="hero">' +
    '<div class="contenedor">' +
      '<div class="hero__txt">' +
        '<h1>' + esc(CONFIG.slogan) + '</h1>' +
        '<p>' + esc(CONFIG.slogan2) + '</p>' +
        '<a class="btn btn--oliva btn--hero" href="#/catalogo">Ver productos ' + ICO.flecha + '</a>' +
      '</div>' +
      '<div class="hero__arte">' +
        '<picture>' +
          '<source srcset="assets/hero-lanatural.webp" type="image/webp">' +
          '<img src="assets/hero-lanatural.jpg" alt="Legumbres, damascos, flor de jamaica, chocolate y canela sobre una mesada" width="1448" height="1086" fetchpriority="high" decoding="async">' +
        '</picture>' +
      '</div>' +
    '</div>' +
  '</section>' +

  '<section class="cats">' +
    '<div class="contenedor">' +
      '<div class="titulo-filete"><h2>Elegí por categoría</h2></div>' +
      '<div class="cats-grid">' +
        cats.map(c =>
          '<a class="cat-card" href="#/catalogo?cat=' + c.id + '">' +
            '<span class="cat-card__nom">' + esc(c.nombre) + '</span>' +
            '<img class="cat-card__fig" src="' + imgDe(c) + '" alt="" width="418" height="418" loading="lazy" decoding="async">' +
            '<span class="cat-card__ver">Ver productos ' + ICO.flecha + '</span>' +
          '</a>'
        ).join('') +
      '</div>' +
    '</div>' +
  '</section>' +

  '<div class="franja"><div class="contenedor">' + ICO.camion + '<span>' + esc(CONFIG.franja) + '</span></div></div>' +

  '<section class="seccion favoritos"><div class="contenedor">' +
    '<div class="titulo-filete"><h2>Nuestros favoritos</h2></div>' +
    grilla(destacados) +
    '<p style="text-align:center;margin-top:22px"><a class="btn btn--fantasma" href="#/catalogo">Ver todo el catálogo</a></p>' +
  '</div></section>' +

  '<section class="seccion" style="background:var(--champan-claro)"><div class="contenedor">' +
    '<div class="titulo-filete"><h2>También podés</h2></div>' +
    '<div class="cats-grid">' +
      '<a class="cat-card" href="#/mix"><span class="cat-card__nom">Armá tu mix</span>' +
        '<img class="cat-card__fig" src="assets/acceso-mix.webp" alt="" width="400" height="400" loading="lazy" decoding="async">' +
        '<span class="cat-card__ver">Empezar ' + ICO.flecha + '</span></a>' +
      '<a class="cat-card" href="#/combos"><span class="cat-card__nom">Combos</span>' +
        '<img class="cat-card__fig" src="assets/acceso-combos.webp" alt="" width="400" height="400" loading="lazy" decoding="async">' +
        '<span class="cat-card__ver">Ver combos ' + ICO.flecha + '</span></a>' +
      '<a class="cat-card" href="#/como-comprar"><span class="cat-card__nom">Cómo comprar</span>' +
        '<img class="cat-card__fig" src="assets/acceso-info.webp" alt="" width="400" height="400" loading="lazy" decoding="async">' +
        '<span class="cat-card__ver">Leer ' + ICO.flecha + '</span></a>' +
      '<a class="cat-card" href="#/catalogo?cat=sintacc"><span class="cat-card__nom">Sin TACC</span>' +
        '<img class="cat-card__fig" src="assets/cat-sintacc.webp" alt="" width="400" height="400" loading="lazy" decoding="async">' +
        '<span class="cat-card__ver">Ver productos ' + ICO.flecha + '</span></a>' +
    '</div>' +
  '</div></section>';
}

function filtrarCatalogo() {
  const f = estado.catalogo;
  const q = f.q.trim().toLowerCase();
  let arr = publicados();
  if (f.cat !== 'todos') arr = arr.filter(p => p.categoria === f.cat || (p.tags || []).includes(f.cat));
  if (f.soloDisponibles) arr = arr.filter(p => p.disponible);
  if (q) arr = arr.filter(p =>
    (p.nombre + ' ' + (p.subtitulo || '') + ' ' + (p.descripcion || '') + ' ' + (p.tags || []).join(' '))
      .toLowerCase().includes(q));

  if (f.orden === 'nombre')      arr.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  else if (f.orden === 'precio-asc')  arr.sort((a, b) => precioDesde(a) - precioDesde(b));
  else if (f.orden === 'precio-desc') arr.sort((a, b) => precioDesde(b) - precioDesde(a));
  else arr.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || (a.orden || 99) - (b.orden || 99));
  return arr;
}

function pintarGrillaCatalogo() {
  const cont = $('#grilla-catalogo');
  if (!cont) return;
  const arr = filtrarCatalogo();
  const f = estado.catalogo;
  if (!arr.length) {
    cont.innerHTML = f.q
      ? vacio('Sin resultados', 'No encontramos “' + f.q + '”. Probá con otra palabra o mirá todo el catálogo.')
      : vacio('Todavía no hay productos acá', 'Elegí otra categoría o quitá los filtros.');
  } else {
    cont.innerHTML = grilla(arr);
  }
  const n = $('#conteo-catalogo');
  if (n) n.textContent = arr.length + (arr.length === 1 ? ' producto' : ' productos');
}

function vistaCatalogo() {
  const f = estado.catalogo;
  const chips = [{ id: 'todos', nombre: 'Todos' }]
    .concat(CATEGORIAS.filter(c => c.visible).sort((a, b) => a.orden - b.orden));

  return '' +
  '<section class="seccion catalogo"><div class="contenedor">' +
    '<div class="titulo-filete"><h2>Nuestra selección</h2></div>' +
    '<div class="buscador">' + ICO.lupa +
      '<label class="visually-hidden" for="q">Buscar productos</label>' +
      '<input id="q" type="search" placeholder="Buscar productos" value="' + esc(f.q) + '" autocomplete="off">' +
    '</div>' +
    '<div class="chips" role="group" aria-label="Categorías">' +
      chips.map(c => '<button class="chip" data-chip="' + c.id + '" aria-pressed="' + (f.cat === c.id) + '">' + esc(c.nombre) + '</button>').join('') +
    '</div>' +
    '<div class="barra-orden">' +
      '<button id="btn-disp" aria-pressed="' + f.soloDisponibles + '">' + (f.soloDisponibles ? 'Solo disponibles ✓' : 'Disponibles') + '</button>' +
      '<label class="visually-hidden" for="orden">Ordenar por</label>' +
      '<select id="orden">' +
        '<option value="destacados"' + (f.orden === 'destacados' ? ' selected' : '') + '>Destacados</option>' +
        '<option value="nombre"' + (f.orden === 'nombre' ? ' selected' : '') + '>Nombre A-Z</option>' +
        '<option value="precio-asc"' + (f.orden === 'precio-asc' ? ' selected' : '') + '>Precio: menor</option>' +
        '<option value="precio-desc"' + (f.orden === 'precio-desc' ? ' selected' : '') + '>Precio: mayor</option>' +
      '</select>' +
    '</div>' +
    '<p id="conteo-catalogo" style="font-size:13px;color:var(--gris-txt);margin:0 0 12px"></p>' +
    '<div id="grilla-catalogo"></div>' +
  '</div></section>';
}

function vistaProducto(slug) {
  const p = prodPorSlug(slug);
  if (!p) return '<section class="seccion"><div class="contenedor">' +
    vacio('No encontramos ese producto', 'Puede que haya cambiado de nombre.') +
    '<p style="text-align:center;margin-top:18px"><a class="btn btn--oliva" href="#/catalogo">Ir al catálogo</a></p></div></section>';

  const st = estado.ficha;
  if (!st.pres || !p.presentaciones.includes(st.pres)) st.pres = p.presentacionDefecto;
  const pr  = precios(p, st.pres);
  const cat = catPorId(p.categoria);
  const relacionados = publicados().filter(x => x.categoria === p.categoria && x.id !== p.id).slice(0, 4);

  const tabs = [
    { id: 'descripcion', t: 'Descripción', c: '<p>' + esc(p.descripcion) + '</p>' },
    { id: 'preparacion', t: 'Preparación', c: '<p>' + esc(p.preparacion || 'Consultanos en el local.') + '</p>' },
    { id: 'informacion', t: 'Información', c:
        '<dl>' +
          '<dt>Origen</dt><dd>' + esc(p.origen || '-') + '</dd>' +
          '<dt>Ingredientes</dt><dd>' + esc(p.ingredientes || '-') + '</dd>' +
          '<dt>Alérgenos</dt><dd>' + esc(p.alergenos || '-') + '</dd>' +
          '<dt>Código</dt><dd>' + esc(p.sku) + '</dd>' +
        '</dl>' }
  ];

  return '' +
  '<section class="seccion ficha"><div class="contenedor">' +
    '<p class="ficha__cat"><a href="#/catalogo?cat=' + p.categoria + '">' + esc(cat ? cat.nombre : '') + '</a></p>' +
    '<h1>' + esc(p.nombre) + '</h1>' +
    '<div class="ficha__cols">' +
      '<div>' +
        '<div class="ficha__img"><img src="' + imgDe(p) + '" alt="' + esc(p.nombre) + '" width="600" height="600" decoding="async"></div>' +
        (p.tags && p.tags.length
          ? '<p style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">' +
            p.tags.map(t => '<span class="prod__badge prod__badge--tag" style="position:static">' + esc(etiqueta(t)) + '</span>').join('') + '</p>'
          : '') +
      '</div>' +
      '<div>' +
        '<div class="caja-compra">' +
          '<h2>Elegí la cantidad</h2>' +
          '<div class="opts">' +
            p.presentaciones.map(id =>
              '<button class="opt" data-pres="' + id + '" aria-pressed="' + (id === st.pres) + '">' +
                esc(presNombre(id)) + (id === st.pres ? ' ' + ICO.check : '') +
              '</button>').join('') +
          '</div>' +
          '<div class="fila-precio">' +
            '<span>' +
              (pr.descuento ? '<span class="precio__antes">' + money(pr.venta) + '</span>' : '') +
              '<span class="precio" id="precio-ficha">' + money(pr.final) + '</span>' +
              (pr.descuento ? '<span class="ahorro" id="ahorro-ficha">Ahorrás ' + money(pr.ahorro) + '</span>' : '') +
            '</span>' +
            '<span class="stepper">' +
              '<button data-cant="-1" aria-label="Quitar una unidad">−</button>' +
              '<span id="cant-ficha" aria-live="polite">' + st.cant + '</span>' +
              '<button data-cant="1" aria-label="Sumar una unidad">+</button>' +
            '</span>' +
          '</div>' +
          (p.disponible
            ? '<button class="btn btn--oliva btn--bloque" id="add-ficha">Agregar al carrito ' + ICO.flecha + '</button>'
            : '<button class="btn btn--fantasma btn--bloque" disabled>Sin stock por ahora</button>') +
          '<p class="aviso">' + esc(CONFIG.avisoStock) + '</p>' +
        '</div>' +
        '<div class="tabs" role="tablist">' +
          tabs.map(t => '<button class="tab" role="tab" data-tab="' + t.id + '" aria-selected="' + (st.tab === t.id) + '">' + t.t + '</button>').join('') +
        '</div>' +
        tabs.map(t => '<div class="tab-panel' + (st.tab === t.id ? '' : ' oculto') + '" data-panel="' + t.id + '">' + t.c + '</div>').join('') +
      '</div>' +
    '</div>' +
    (relacionados.length
      ? '<div style="margin-top:40px"><div class="titulo-filete"><h2>También te puede gustar</h2></div>' + grilla(relacionados) + '</div>'
      : '') +
  '</div></section>';
}

function mixProductos() {
  return publicados().filter(p => p.mix && p.disponible && p.tipo === 'granel');
}
function mixCategorias() {
  const usadas = [...new Set(mixProductos().map(p => p.categoria))];
  return CATEGORIAS.filter(c => usadas.includes(c.id)).sort((a, b) => a.orden - b.orden);
}
const mixGramosTam = () => {
  const p = pres(estado.mix.tam);
  return p && p.gramos ? p.gramos : 0;
};

function vistaMix() {
  const st = estado.mix;

  return '' +
  '<section class="seccion creador-mix"><div class="contenedor">' +
    '<div class="portada-vista">' +
      '<h1>' + esc(MIX.titulo) + '</h1>' +
      '<p>' + esc(MIX.bajada) + '</p>' +
    '</div>' +

    '<div class="mix-paso">' +
      '<p class="mix-paso__lbl"><span>Paso 1</span> Elegí el tamaño</p>' +
      '<div class="mix-tams">' +
        MIX.presentaciones.map(id => {
          const g = (pres(id) || {}).gramos || 0;
          return '<button class="mix-tam" data-mixtam="' + id + '" aria-pressed="' + (id === st.tam) + '">' +
            '<strong>' + esc(gLabel(g)) + '</strong><span>de mix</span></button>';
        }).join('') +
      '</div>' +
    '</div>' +

    '<div id="mix-armado"' + (st.tam ? '' : ' class="oculto"') + '>' +
      '<div class="mix-paso">' +
        '<p class="mix-paso__lbl"><span>Paso 2</span> Sumá ingredientes</p>' +
        '<div class="buscador buscador--mix">' + ICO.lupa +
          '<label class="visually-hidden" for="mix-buscar">Buscar ingrediente</label>' +
          '<input id="mix-buscar" type="search" placeholder="Buscar ingrediente" value="' + esc(st.q) + '" autocomplete="off">' +
        '</div>' +
        '<div class="chips" id="mix-cats" role="group" aria-label="Categorías del mix"></div>' +
        '<div class="mix-lista" id="mix-lista"></div>' +
      '</div>' +

      '<div class="mix-barra" id="mix-barra"></div>' +

      '<div class="mix-paso">' +
        '<p class="mix-paso__lbl"><span>Paso 3</span> Agregá al carrito</p>' +
        '<div class="mix-resumen" id="mix-resumen"></div>' +
      '</div>' +
    '</div>' +
  '</div></section>';
}

/* --- pintado parcial: no se re-renderiza la vista entera para no perder foco ni scroll --- */
function pintarMixCats() {
  const cont = $('#mix-cats');
  if (!cont) return;
  const cats = [{ id: 'todos', nombre: 'Todos' }].concat(mixCategorias());
  cont.innerHTML = cats.map(c =>
    '<button class="chip" data-mixcat="' + c.id + '" aria-pressed="' + (estado.mix.cat === c.id) + '">' +
    esc(c.nombre) + '</button>').join('');
}

function pintarMixLista() {
  const cont = $('#mix-lista');
  if (!cont) return;
  const st = estado.mix;
  const q = st.q.trim().toLowerCase();
  let arr = mixProductos();
  if (st.cat !== 'todos') arr = arr.filter(p => p.categoria === st.cat);
  if (q) arr = arr.filter(p => p.nombre.toLowerCase().includes(q));

  if (!arr.length) {
    cont.innerHTML = '<p class="mix-lista__vacio">' +
      (q ? 'No encontramos “' + esc(st.q) + '” entre los ingredientes.' : 'No hay ingredientes en esta categoría.') + '</p>';
    return;
  }

  const usados  = cuentaMix(st.ing).gramos;
  const libre   = mixGramosTam() - usados;
  const distintos = Object.values(st.ing).filter(g => g > 0).length;

  cont.innerHTML = arr.map(p => {
    const g = st.ing[p.id] || 0;
    const tope = MIX.maxIngredientes && distintos >= MIX.maxIngredientes && !g;
    const noEntra = libre < MIX.pasoGramos || tope;
    return '<div class="mix-fila' + (g ? ' mix-fila--sel' : '') + '">' +
      '<img class="mix-fila__fig" src="' + (p.mixImg || imgDe(p)) + '" alt="" width="120" height="120" loading="lazy" decoding="async">' +
      '<div class="mix-fila__txt">' +
        '<p class="mix-fila__nom">' + esc(p.nombre) + '</p>' +
        '<p class="mix-fila__precio">' + money(precioKgVenta(p)) + ' / kg</p>' +
      '</div>' +
      '<div class="stepper stepper--mini">' +
        '<button data-mixmenos="' + p.id + '" aria-label="Quitar ' + MIX.pasoGramos + ' gramos de ' + esc(p.nombre) + '"' + (g ? '' : ' disabled') + '>−</button>' +
        '<span>' + esc(gLabel(g)) + '</span>' +
        '<button data-mixmas="' + p.id + '" aria-label="Sumar ' + MIX.pasoGramos + ' gramos de ' + esc(p.nombre) + '"' + (noEntra ? ' disabled' : '') + '>+</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function pintarMixBarra() {
  const cont = $('#mix-barra');
  if (!cont) return;
  const c = cuentaMix(estado.mix.ing);
  const tam = mixGramosTam();
  const pct = tam ? Math.min(100, Math.round(c.gramos / tam * 100)) : 0;
  const listo = c.gramos === tam && tam > 0;
  const falta = tam - c.gramos;

  cont.innerHTML =
    '<div class="mix-barra__top">' +
      '<span>' + esc(gLabel(c.gramos)) + ' de ' + esc(gLabel(tam)) + '</span>' +
      '<strong>' + money(c.total) + '</strong>' +
    '</div>' +
    '<div class="mix-barra__riel" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100">' +
      '<div class="mix-barra__fill' + (listo ? ' mix-barra__fill--listo' : '') + '" style="width:' + pct + '%"></div>' +
    '</div>' +
    '<p class="mix-barra__hint">' + (listo ? 'Mix completo' : 'Faltan ' + esc(gLabel(falta))) + '</p>';
}

function pintarMixResumen() {
  const cont = $('#mix-resumen');
  if (!cont) return;
  const st  = estado.mix;
  const c   = cuentaMix(st.ing);
  const tam = mixGramosTam();
  const listo = c.gramos === tam && tam > 0 && c.filas.length >= MIX.minIngredientes;
  const falta = tam - c.gramos;

  let textoBoton = 'Agregar mi mix';
  if (c.filas.length && c.filas.length < MIX.minIngredientes) textoBoton = 'Elegí al menos ' + MIX.minIngredientes + ' ingredientes';
  else if (falta > 0) textoBoton = 'Faltan ' + gLabel(falta);

  cont.innerHTML =
    '<p class="mix-resumen__head">Tu mix de ' + esc(gLabel(tam)) + '</p>' +
    (c.filas.length
      ? '<ul class="mix-ings">' + c.filas.map(f =>
          '<li><span>' + esc(f.nombre) + '</span><span>' + esc(gLabel(f.gramos)) + ' · ' + money(f.subtotal) + '</span></li>'
        ).join('') + '</ul>'
      : '<p class="mix-ings__vacio">Todavía no elegiste ingredientes.</p>') +
    '<div class="form-campo">' +
      '<label for="mix-nombre">Nombre del mix (opcional)</label>' +
      '<input id="mix-nombre" type="text" maxlength="40" placeholder="Mi mix de la tarde" value="' + esc(st.nombre) + '">' +
    '</div>' +
    '<div class="mix-tot"><span>Ingredientes</span><span>' + c.filas.length + '</span></div>' +
    '<div class="mix-tot"><span>Armado (' + MIX.recargo + '%)</span><span>' + money(c.total - c.suma) + '</span></div>' +
    '<div class="mix-tot mix-tot--main"><span>Total</span><span>' + money(c.total) + '</span></div>' +
    '<button class="btn btn--oliva btn--bloque" id="add-mix"' + (listo ? '' : ' disabled') + '>' + esc(textoBoton) + '</button>' +
    '<p class="mix-nota">' + esc(CONFIG.avisoStock) + '</p>';
}

function pintarMix() {
  pintarMixCats();
  pintarMixLista();
  pintarMixBarra();
  pintarMixResumen();
}

function vistaCombos() {
  const activos = COMBOS.filter(c => c.activo).sort((a, b) => a.orden - b.orden);
  return '' +
  '<section class="seccion combos"><div class="contenedor">' +
    '<div class="portada-vista">' +
      '<h1>Combos para cada día</h1>' +
      '<p>Una selección simple, lista para llevar.</p>' +
    '</div>' +
    (activos.length ? activos.map(c => {
      const pr = preciosCombo(c);
      const n = c.items.reduce((s, i) => s + (i.cant || 1), 0);
      return '<article class="combo">' +
        '<div class="combo__top">' +
          '<div class="combo__txt">' +
            '<h3>' + esc(c.nombre) + '</h3>' +
            '<div class="combo__hr"></div>' +
            '<p class="combo__desc">' + esc(c.descripcion) + '</p>' +
            '<span class="combo__n">' + ICO.caja + n + ' productos</span>' +
          '</div>' +
          '<div class="combo__fig"><img src="' + imgDe(c) + '" alt="Productos incluidos en ' + esc(c.nombre) + '" width="700" height="700" loading="lazy" decoding="async"></div>' +
        '</div>' +
        '<ul class="combo__detalle">' +
          c.items.map(i => {
            const p = prodPorId(i.productoId);
            return p ? '<li>' + esc(p.nombre) + ' · ' + esc(presNombre(i.presentacionId)) + (i.cant > 1 ? ' × ' + i.cant : '') + '</li>' : '';
          }).join('') +
        '</ul>' +
        (pr.ahorro ? '<span class="precio__antes">' + money(pr.lista) + '</span>' : '') +
        '<div class="combo__precio">' + money(pr.final) + '</div>' +
        (pr.ahorro ? '<span class="combo__ahorro">Ahorrás ' + money(pr.ahorro) + '</span>' : '') +
        '<button class="btn btn--oliva btn--bloque" data-combo="' + c.id + '">Agregar el combo ' + ICO.flecha + '</button>' +
      '</article>';
    }).join('') : vacio('Todavía no hay combos', 'Estamos armando las primeras selecciones.')) +
  '</div></section>';
}

function vistaComoComprar() {
  const iconosPaso = {
    '01': ICO.pasoProducto,
    '02': ICO.pasoCantidad,
    '03': ICO.pasoEntrega
  };
  return '' +
  '<section class="seccion como-comprar"><div class="contenedor">' +
    '<div class="pasos">' +
      '<h1>Comprar, paso a paso</h1>' +
      ICO.ornamento +
      PASOS.map(p =>
        '<div class="pasos__sep"></div>' +
        '<div class="paso">' +
          '<div class="paso__visual"><span class="paso__n">' + esc(p.n) + '</span>' +
            '<span class="paso__ico">' + iconosPaso[p.n] + '</span></div>' +
          '<div class="paso__cuerpo"><h3>' + esc(p.titulo) + '</h3><p>' + esc(p.texto) + '</p></div>' +
        '</div>').join('') +
      '<div class="pasos__sep"></div>' +
      '<a class="btn btn--claro btn--bloque" href="#/catalogo">Empezar mi compra ' + ICO.flecha + '</a>' +
      '<p class="pasos__cierre">' + esc(CONFIG.avisoStock) + '</p>' +
    '</div>' +
    '<div class="como-extra">' +
      '<div class="titulo-filete"><h2>Entrega y pagos</h2></div>' +
      '<p style="color:var(--gris-txt)"><strong>Envío o retiro:</strong> ' + esc(CONFIG.zonas) + '</p>' +
      '<p style="color:var(--gris-txt)"><strong>Pagos:</strong> ' + esc(CONFIG.mediosPago) + '</p>' +
      '<p style="color:var(--gris-txt)"><strong>Horarios:</strong> ' + esc(CONFIG.horarios) + '</p>' +
    '</div>' +
  '</div></section>';
}

/* ---------------- carrito (panel) ---------------- */
/* --- datos guardados en el dispositivo (nombre, teléfono, direcciones) --- */
const perfil = () => leer(LS_PERFIL, { nombre: '', tel: '', direcciones: [] });
function guardarPerfil(datos) {
  const p = perfil();
  p.nombre = datos.nombre || p.nombre;
  p.tel = datos.tel || p.tel;
  if (datos.dir && !p.direcciones.includes(datos.dir)) p.direcciones.unshift(datos.dir);
  p.direcciones = p.direcciones.slice(0, 3);
  guardar(LS_PERFIL, p);
}
function borrarPerfil() {
  try { localStorage.removeItem(LS_PERFIL); } catch (e) {}
  toast('Listo, borramos tus datos de este dispositivo');
  pintarCarrito();
}

/* --- el panel del carrito tiene tres pasos: productos, entrega y datos --- */
function pintarCarrito() {
  const cont = $('#carrito-cuerpo');
  if (!cont) return;
  const co = estado.checkout;
  if (!estado.carrito.length) co.paso = 0;

  const volver = $('#co-volver');
  if (volver) volver.hidden = co.paso === 0;
  const titulo = $('#carrito-titulo');
  if (titulo) titulo.textContent = co.paso === 0 ? 'Tu pedido' : (co.paso === 1 ? '¿Cómo lo recibís?' : 'Tus datos');

  if (co.paso === 1) { cont.innerHTML = pasoEntrega(); return; }
  if (co.paso === 2) { cont.innerHTML = pasoDatos(); return; }
  cont.innerHTML = pasoProductos();
}

function resumenChico() {
  const n = unidadesCarrito();
  return '<div class="co-resumen">' +
    '<span>' + n + (n === 1 ? ' producto' : ' productos') + '</span>' +
    '<strong>' + money(totalCarrito()) + '</strong>' +
  '</div>';
}

function pasoProductos() {
  if (!estado.carrito.length) {
    const ultimo = leer(LS_ULTIMO, []);
    return vacio('Tu carrito está vacío', 'Agregá productos y volvé para terminar el pedido.') +
      '<p style="text-align:center;margin-top:16px;display:flex;flex-direction:column;gap:10px;align-items:center">' +
        (ultimo.length
          ? '<button class="btn btn--russet" id="repetir-pedido">Volver a pedir lo último (' +
            ultimo.length + (ultimo.length === 1 ? ' producto' : ' productos') + ')</button>'
          : '') +
        '<button class="btn btn--oliva" data-cerrar-carrito>Ver productos</button>' +
      '</p>';
  }

  const total = totalCarrito();
  const falta = Math.max((CONFIG.compraMinima || 0) - total, 0);

  return agruparCarrito().map(b => {
      const prod = prodPorId(b.lineas[0].id);
      const porKg = prod && prod.tipo === 'granel' ? money(precioKgVenta(prod)) + ' / kg' : '';
      return '<div class="item">' +
        '<div class="item__fig"><img src="' + b.img + '" alt="" width="70" height="70" loading="lazy"></div>' +
        '<div class="item__cuerpo">' +
          '<p class="item__nom">' + esc(b.nombre) + '</p>' +
          b.lineas.map(i =>
            '<div class="item__var">' +
              '<span class="item__var-lbl">' + esc(i.detalle || '') +
                '<em>' + (porKg || money(i.precio) + ' c/u') + '</em></span>' +
              '<span class="stepper stepper--mini">' +
                '<button data-mas="' + i.key + '" data-delta="-1" aria-label="Quitar uno de ' + esc(i.detalle || i.nombre) + '">−</button>' +
                '<span>' + i.cant + '</span>' +
                '<button data-mas="' + i.key + '" data-delta="1" aria-label="Sumar uno de ' + esc(i.detalle || i.nombre) + '">+</button>' +
              '</span>' +
              '<strong class="item__monto">' + money(i.precio * i.cant) + '</strong>' +
              '<button class="item__papelera" data-quitar="' + esc(i.key) + '" aria-label="Quitar ' + esc(i.detalle || i.nombre) + '">' + ICO.basura + '</button>' +
            '</div>').join('') +
          (b.lineas.length > 1
            ? '<div class="item__sub"><span>Subtotal</span><strong>' + money(b.subtotal) + '</strong></div>'
            : '') +
        '</div>' +
      '</div>';
    }).join('') +

    '<div class="totales">' +
      '<div class="totales__fila"><span>Productos (' + unidadesCarrito() + ')</span><span>' + money(total) + '</span></div>' +
      '<div class="totales__fila totales__total"><span>Total estimado</span><span>' + money(total) + '</span></div>' +
    '</div>' +
    (falta > 0 ? '<p class="aviso">Te faltan ' + money(falta) + ' para llegar a la compra mínima de ' + money(CONFIG.compraMinima) + '.</p>' : '') +
    '<button class="btn btn--oliva btn--bloque" id="co-continuar"' + (falta > 0 ? ' disabled' : '') + '>Continuar ' + ICO.flecha + '</button>' +
    '<p class="aviso">' + esc(CONFIG.avisoStock) + '</p>';
}

function pasoEntrega() {
  const opciones = [
    { id: 'retiro',    titulo: CONFIG.entrega[0] || 'Retiro en el local', sub: CONFIG.direccion + ' · ' + CONFIG.horarios, ico: ICO.tienda },
    { id: 'domicilio', titulo: CONFIG.entrega[1] || 'Envío a domicilio',  sub: CONFIG.zonas, ico: ICO.camion }
  ];
  return resumenChico() +
    '<p class="co-lbl">¿Cómo querés recibir tu pedido?</p>' +
    opciones.map(o =>
      '<button class="co-opcion" data-entrega-tipo="' + o.id + '">' +
        '<span class="co-opcion__ico">' + o.ico + '</span>' +
        '<span class="co-opcion__txt"><b>' + esc(o.titulo) + '</b><small>' + esc(o.sub) + '</small></span>' +
        '<span class="co-opcion__arr">' + ICO.flecha + '</span>' +
      '</button>').join('');
}

function pasoDatos() {
  const co = estado.checkout;
  const pf = perfil();
  const esEnvio = co.tipo === 'domicilio';
  const guardados = pf.nombre || pf.tel || (pf.direcciones && pf.direcciones.length);

  return resumenChico() +
    '<p class="co-lbl">' + (esEnvio ? esc(CONFIG.entrega[1] || 'Envío a domicilio') : esc(CONFIG.entrega[0] || 'Retiro en el local')) + '</p>' +
    '<form id="form-pedido" novalidate>' +
      '<div class="form-campo"><label for="f-nombre">Nombre y apellido *</label>' +
        '<input id="f-nombre" name="nombre" required autocomplete="name" value="' + esc(pf.nombre || '') + '"></div>' +
      '<div class="form-campo"><label for="f-tel">Teléfono *</label>' +
        '<input id="f-tel" name="tel" type="tel" required autocomplete="tel" inputmode="tel" value="' + esc(pf.tel || '') + '"></div>' +
      (esEnvio
        ? (pf.direcciones && pf.direcciones.length
            ? '<div class="form-campo"><label>Direcciones guardadas</label>' +
              pf.direcciones.map(d => '<button type="button" class="co-dir" data-dir="' + esc(d) + '">' + esc(d) + '</button>').join('') +
              '</div>'
            : '') +
          '<div class="form-campo"><label for="f-dir">Dirección *</label>' +
            '<input id="f-dir" name="dir" autocomplete="street-address" value="' + esc((pf.direcciones || [])[0] || '') + '"></div>'
        : '<div class="form-campo"><label for="f-hora">Horario en que pasás <span style="text-transform:none;letter-spacing:0">(opcional)</span></label>' +
            '<input id="f-hora" name="hora" placeholder="Ej: entre 10 y 12"></div>') +
      '<div class="form-campo"><label for="f-obs">Observaciones</label>' +
        '<textarea id="f-obs" name="obs" placeholder="Aclaraciones sobre el pedido"></textarea></div>' +
      '<p class="error-msg oculto" id="err-pedido"></p>' +
      '<button class="btn btn--wa btn--bloque" type="submit">' + ICO.wa + ' Enviar pedido por WhatsApp</button>' +
      '<p class="co-pago">' + esc(CONFIG.mediosPago) + '</p>' +
      (guardados
        ? '<p class="co-guardado">Guardamos tus datos en este dispositivo para la próxima. ' +
          '<button type="button" id="borrar-perfil">Borrar mis datos</button></p>'
        : '<p class="co-guardado">Vamos a guardar tus datos en este dispositivo para la próxima.</p>') +
      '<p class="aviso">' + esc(CONFIG.avisoStock) + '</p>' +
    '</form>';
}

function numeroPedido() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0') + String(d.getMonth() + 1).padStart(2, '0');
  return dd + '-' + String(Math.floor(Math.random() * 900) + 100);
}

function armarMensaje(datos) {
  const L = [];
  L.push(CONFIG.waApertura);
  L.push('');
  L.push('Pedido N° ' + datos.nro);
  L.push('');
  agruparCarrito().forEach(b => {
    if (b.lineas.length === 1) {
      const i = b.lineas[0];
      L.push('• ' + b.nombre + (i.detalle ? ' (' + i.detalle + ')' : ''));
      L.push('   ' + i.cant + ' × ' + money(i.precio) + ' = ' + money(i.precio * i.cant));
    } else {
      L.push('• ' + b.nombre);
      b.lineas.forEach(i => {
        L.push('   ' + i.detalle + ': ' + i.cant + ' × ' + money(i.precio) + ' = ' + money(i.precio * i.cant));
      });
      L.push('   Subtotal: ' + money(b.subtotal));
    }
  });
  L.push('');
  L.push('TOTAL ESTIMADO: ' + money(totalCarrito()));
  L.push('');
  L.push('Nombre: ' + datos.nombre);
  L.push('Teléfono: ' + datos.tel);
  L.push('Entrega: ' + datos.entrega);
  if (datos.dir) L.push('Dirección: ' + datos.dir);
  if (datos.hora) L.push('Paso: ' + datos.hora);
  if (datos.obs) L.push('Observaciones: ' + datos.obs);
  L.push('');
  L.push(CONFIG.avisoStock);
  L.push(CONFIG.waCierre);
  return L.join('\n');
}

/* ---------------- paneles ---------------- */
function abrirPanel(cual) {
  const p = cual === 'menu' ? $('#panel-menu') : $('#panel-carrito');
  if (cual !== 'menu') { estado.checkout.paso = 0; pintarCarrito(); }
  p.classList.add('abierto');
  p.setAttribute('aria-hidden', 'false');
  $('#overlay').classList.add('abierto');
  document.body.style.overflow = 'hidden';
  const foco = p.querySelector('button, a, input');
  if (foco) foco.focus();
}
function cerrarPaneles() {
  $$('.panel').forEach(p => { p.classList.remove('abierto'); p.setAttribute('aria-hidden', 'true'); });
  $('#overlay').classList.remove('abierto');
  document.body.style.overflow = '';
}

/* ---------------- router ---------------- */
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [ruta, query] = h.split('?');
  const partes = ruta.split('/').filter(Boolean);
  const params = {};
  (query || '').split('&').filter(Boolean).forEach(par => {
    const [k, v] = par.split('=');
    params[k] = decodeURIComponent(v || '');
  });
  return { partes, params };
}

function render() {
  const { partes, params } = parseHash();
  const vista = partes[0] || 'inicio';
  const app = $('#app');
  let html = '';
  let titulo = CONFIG.marca;

  if (vista === 'catalogo') {
    if (params.cat) estado.catalogo.cat = params.cat;
    html = vistaCatalogo();
    titulo = 'Catálogo · ' + CONFIG.marca;
  } else if (vista === 'producto') {
    const p = prodPorSlug(partes[1]);
    estado.ficha = { pres: p ? p.presentacionDefecto : null, cant: 1, tab: 'descripcion' };
    html = vistaProducto(partes[1]);
    titulo = (p ? p.nombre : 'Producto') + ' · ' + CONFIG.marca;
  } else if (vista === 'mix') {
    html = vistaMix();
    titulo = 'Armá tu mix · ' + CONFIG.marca;
  } else if (vista === 'combos') {
    html = vistaCombos();
    titulo = 'Combos · ' + CONFIG.marca;
  } else if (vista === 'como-comprar') {
    html = vistaComoComprar();
    titulo = 'Cómo comprar · ' + CONFIG.marca;
  } else {
    html = vistaHome();
    titulo = CONFIG.marca + ' · ' + CONFIG.bajada;
  }

  document.body.dataset.vista = vista;
  app.innerHTML = html;
  document.title = titulo;
  if (vista === 'catalogo') pintarGrillaCatalogo();
  if (vista === 'mix' && estado.mix.tam) pintarMix();

  $$('.tabbar a').forEach(a => {
    const suya = a.getAttribute('href') === '#/' + (vista === 'inicio' ? '' : vista);
    if (suya) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });

  moverPastilla(true);
  requestAnimationFrame(() => moverPastilla(false));  // por si la barra todavía no estaba medida
  cerrarPaneles();
  window.scrollTo(0, 0);
  alScrollear();
}

/* ---------------- eventos ---------------- */
function agregarProductoDesdeTarjeta(id) {
  const p = prodPorId(id);
  if (!p || !p.disponible) return;
  const st = estadoCard(p);
  const pr = precios(p, st.pres);
  const card = document.querySelector('.prod[data-prod="' + id + '"]');
  volarAlCarrito(card ? card.querySelector('.prod__fig img') : null);
  agregar({
    key: 'p:' + p.id + ':' + st.pres,
    tipo: 'producto', id: p.id, nombre: p.nombre,
    detalle: presNombre(st.pres), presentacionId: st.pres,
    precio: pr.final, cant: st.cant, img: imgDe(p)
  });
  st.cant = 1;
  repintarCard(id);
}

/* la foto del producto vuela hasta el carrito */
function volarAlCarrito(img) {
  if (!img || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const destino = $('#cart-fab') && $('#cart-fab').offsetParent !== null ? $('#cart-fab') : $('.carrito-btn');
  if (!destino) return;
  const o = img.getBoundingClientRect();
  const d = destino.getBoundingClientRect();
  const clon = document.createElement('img');
  clon.src = img.currentSrc || img.src;
  clon.className = 'vuela';
  clon.style.left = o.left + 'px';
  clon.style.top = o.top + 'px';
  clon.style.width = o.width + 'px';
  clon.style.height = o.height + 'px';
  document.body.appendChild(clon);
  const dx = (d.left + d.width / 2) - (o.left + o.width / 2);
  const dy = (d.top + d.height / 2) - (o.top + o.height / 2);
  requestAnimationFrame(() => {
    clon.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.18)';
    clon.style.opacity = '.25';
  });
  setTimeout(() => clon.remove(), 700);
  destino.classList.add('carrito-late');
  setTimeout(() => destino.classList.remove('carrito-late'), 500);
}

/* onda al tocar y confirmación en verde */
function onda(btn, ev) {
  if (!btn || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = btn.getBoundingClientRect();
  const d = Math.max(r.width, r.height) * 2;
  const ink = document.createElement('span');
  ink.className = 'onda';
  ink.style.width = ink.style.height = d + 'px';
  ink.style.left = ((ev && ev.clientX ? ev.clientX : r.left + r.width / 2) - r.left - d / 2) + 'px';
  ink.style.top = ((ev && ev.clientY ? ev.clientY : r.top + r.height / 2) - r.top - d / 2) + 'px';
  btn.appendChild(ink);
  setTimeout(() => ink.remove(), 600);
}

function confirmarBoton(btn, texto) {
  if (!btn) return;
  const original = btn.innerHTML;
  btn.classList.add('btn--hecho');
  btn.innerHTML = ICO.check + '<span>' + esc(texto || 'Agregado') + '</span>';
  setTimeout(() => {
    btn.classList.remove('btn--hecho');
    btn.innerHTML = original;
  }, 1200);
}

document.addEventListener('click', ev => {
  const t = ev.target;
  const conOnda = t.closest('.btn-onda, .btn--oliva, .btn--russet, .prod__add');
  if (conOnda && !conOnda.disabled) onda(conOnda, ev);

  const cerrar = t.closest('[data-cerrar]');
  if (cerrar) { cerrarPaneles(); return; }
  if (t.closest('[data-cerrar-carrito]')) { cerrarPaneles(); location.hash = '#/catalogo'; return; }
  if (t.id === 'overlay') { cerrarPaneles(); return; }

  if (t.closest('#btn-menu'))    { abrirPanel('menu'); return; }
  if (t.closest('.carrito-btn') || t.closest('#cart-fab')) { abrirPanel('carrito'); return; }
  if (t.closest('#btn-buscar'))  { location.hash = '#/catalogo'; setTimeout(() => { const q = $('#q'); if (q) q.focus(); }, 60); return; }

  const fav = t.closest('[data-fav]');
  if (fav) {
    toggleFav(fav.dataset.fav);
    fav.setAttribute('aria-pressed', estado.favs.includes(fav.dataset.fav));
    return;
  }

  const peso = t.closest('[data-peso]');
  if (peso) {
    const p = prodPorId(peso.dataset.pid);
    if (!p) return;
    estadoCard(p).pres = peso.dataset.peso;
    const card = peso.closest('.prod');
    card.querySelectorAll('[data-peso]').forEach(b => b.setAttribute('aria-pressed', b === peso));
    const cont = card.querySelector('[data-precio]');
    if (cont) cont.innerHTML = preciosCard(p, peso.dataset.peso);
    return;
  }

  const cardCant = t.closest('[data-cardcant]');
  if (cardCant) {
    const p = prodPorId(cardCant.dataset.pid);
    if (!p) return;
    const st = estadoCard(p);
    st.cant = Math.max(1, st.cant + Number(cardCant.dataset.cardcant));
    const n = document.querySelector('[data-cardq="' + p.id + '"]');
    if (n) n.textContent = st.cant;
    return;
  }

  const quitarProd = t.closest('[data-quitar-prod]');
  if (quitarProd) {
    const id = quitarProd.dataset.quitarProd;
    estado.carrito = estado.carrito.filter(i => !(i.tipo === 'producto' && i.id === id));
    guardar(LS_CARRITO, estado.carrito);
    pintarContadorCarrito();
    repintarCard(id);
    toast('Quitado del pedido');
    return;
  }

  if (t.closest('[data-abrir-carrito]')) { abrirPanel('carrito'); return; }

  const add = t.closest('[data-add]');
  if (add) {
    onda(add, ev);
    confirmarBoton(add, 'Agregado');
    agregarProductoDesdeTarjeta(add.dataset.add);
    return;
  }

  const chip = t.closest('[data-chip]');
  if (chip) {
    estado.catalogo.cat = chip.dataset.chip;
    $$('[data-chip]').forEach(c => c.setAttribute('aria-pressed', c === chip));
    pintarGrillaCatalogo();
    return;
  }

  if (t.closest('#btn-disp')) {
    const b = $('#btn-disp');
    estado.catalogo.soloDisponibles = !estado.catalogo.soloDisponibles;
    b.setAttribute('aria-pressed', estado.catalogo.soloDisponibles);
    b.textContent = estado.catalogo.soloDisponibles ? 'Solo disponibles ✓' : 'Disponibles';
    pintarGrillaCatalogo();
    return;
  }

  /* --- ficha de producto --- */
  const optPres = t.closest('[data-pres]');
  if (optPres) {
    estado.ficha.pres = optPres.dataset.pres;
    render2Ficha();
    return;
  }
  const cant = t.closest('[data-cant]');
  if (cant) {
    estado.ficha.cant = Math.max(1, estado.ficha.cant + Number(cant.dataset.cant));
    $('#cant-ficha').textContent = estado.ficha.cant;
    return;
  }
  const tab = t.closest('[data-tab]');
  if (tab) {
    estado.ficha.tab = tab.dataset.tab;
    $$('[data-tab]').forEach(b => b.setAttribute('aria-selected', b === tab));
    $$('[data-panel]').forEach(p => p.classList.toggle('oculto', p.dataset.panel !== estado.ficha.tab));
    return;
  }
  if (t.closest('#add-ficha')) {
    const slug = parseHash().partes[1];
    const p = prodPorSlug(slug);
    if (!p) return;
    const pr = precios(p, estado.ficha.pres);
    agregar({
      key: 'p:' + p.id + ':' + estado.ficha.pres,
      tipo: 'producto', id: p.id, nombre: p.nombre,
      detalle: presNombre(estado.ficha.pres), presentacionId: estado.ficha.pres,
      precio: pr.final, cant: estado.ficha.cant, img: imgDe(p)
    });
    return;
  }

  /* --- mix --- */
  const mixTam = t.closest('[data-mixtam]');
  if (mixTam) {
    const st = estado.mix;
    if (st.tam !== mixTam.dataset.mixtam) { st.tam = mixTam.dataset.mixtam; st.ing = {}; }
    $$('[data-mixtam]').forEach(b => b.setAttribute('aria-pressed', b === mixTam));
    $('#mix-armado').classList.remove('oculto');
    pintarMix();
    setTimeout(() => {
      const paso2 = $('#mix-armado');
      if (paso2) window.scrollTo({ top: paso2.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
    }, 80);
    return;
  }
  const mixCat = t.closest('[data-mixcat]');
  if (mixCat) {
    estado.mix.cat = mixCat.dataset.mixcat;
    pintarMixCats();
    pintarMixLista();
    return;
  }
  const mixMas = t.closest('[data-mixmas]');
  if (mixMas) {
    const st = estado.mix;
    const id = mixMas.dataset.mixmas;
    const c = cuentaMix(st.ing);
    const libre = mixGramosTam() - c.gramos;
    if (libre < MIX.pasoGramos) { toast('El mix ya está completo'); return; }
    const distintos = Object.values(st.ing).filter(g => g > 0).length;
    if (!st.ing[id] && MIX.maxIngredientes && distintos >= MIX.maxIngredientes) {
      toast('Podés combinar hasta ' + MIX.maxIngredientes + ' ingredientes');
      return;
    }
    st.ing[id] = (st.ing[id] || 0) + Math.min(MIX.pasoGramos, libre);
    pintarMixLista(); pintarMixBarra(); pintarMixResumen();
    return;
  }
  const mixMenos = t.closest('[data-mixmenos]');
  if (mixMenos) {
    const st = estado.mix;
    const id = mixMenos.dataset.mixmenos;
    const actual = st.ing[id] || 0;
    if (actual <= MIX.pasoGramos) delete st.ing[id];
    else st.ing[id] = actual - MIX.pasoGramos;
    pintarMixLista(); pintarMixBarra(); pintarMixResumen();
    return;
  }
  if (t.closest('#add-mix')) {
    const st = estado.mix;
    const c = cuentaMix(st.ing);
    const tam = mixGramosTam();
    if (c.gramos !== tam || c.filas.length < MIX.minIngredientes) return;
    const nombreLibre = ($('#mix-nombre') || {}).value || '';
    const principal = prodPorId(c.filas[0].id);
    agregar({
      key: 'mix:' + st.tam + ':' + c.filas.map(f => f.id + '-' + f.gramos).sort().join('_'),
      tipo: 'mix', id: 'mix', nombre: nombreLibre.trim() || 'Mi mix de ' + gLabel(tam),
      detalle: gLabel(tam) + ' · ' + c.filas.map(f => f.nombre + ' ' + gLabel(f.gramos)).join(', '),
      precio: c.total, cant: 1,
      img: principal ? (principal.mixImg || imgDe(principal)) : imgDemo('#a97e46', '#e0c48c')
    });
    estado.mix = { tam: null, ing: {}, cat: 'todos', q: '', nombre: '' };
    render();
    return;
  }

  /* --- combos --- */
  const combo = t.closest('[data-combo]');
  if (combo) {
    const c = COMBOS.find(x => x.id === combo.dataset.combo);
    if (!c) return;
    const pr = preciosCombo(c);
    agregar({
      key: 'combo:' + c.id,
      tipo: 'combo', id: c.id, nombre: 'Combo ' + c.nombre,
      detalle: c.items.map(i => {
        const p = prodPorId(i.productoId);
        return p ? p.nombre + ' ' + presNombre(i.presentacionId) : '';
      }).filter(Boolean).join(' + '),
      precio: pr.final, cant: 1, img: imgDemo(c.color, c.color2)
    });
    return;
  }

  /* --- carrito --- */
  const mas = t.closest('[data-mas]');
  if (mas) { cambiarCant(mas.dataset.mas, Number(mas.dataset.delta)); return; }
  const q = t.closest('[data-quitar]');
  if (q) { quitar(q.dataset.quitar); return; }
  const qb = t.closest('[data-quitar-bloque]');
  if (qb) { quitarBloque(qb.dataset.quitarBloque); return; }

  if (t.closest('#co-continuar')) { estado.checkout.paso = 1; pintarCarrito(); return; }
  if (t.closest('#co-volver'))    { estado.checkout.paso = Math.max(0, estado.checkout.paso - 1); pintarCarrito(); return; }

  const tipoEntrega = t.closest('[data-entrega-tipo]');
  if (tipoEntrega) {
    estado.checkout.tipo = tipoEntrega.dataset.entregaTipo;
    estado.checkout.paso = 2;
    pintarCarrito();
    return;
  }

  const dirGuardada = t.closest('[data-dir]');
  if (dirGuardada) {
    const campo = $('#f-dir');
    if (campo) { campo.value = dirGuardada.dataset.dir; campo.focus(); }
    $$('[data-dir]').forEach(b => b.classList.toggle('co-dir--elegida', b === dirGuardada));
    return;
  }

  if (t.closest('#borrar-perfil')) { borrarPerfil(); return; }

  if (t.closest('#repetir-pedido')) {
    const ultimo = leer(LS_ULTIMO, []);
    if (!ultimo.length) return;
    estado.carrito = ultimo.slice();
    guardar(LS_CARRITO, estado.carrito);
    pintarContadorCarrito();
    pintarCarrito();
    toast('Volvimos a cargar tu último pedido');
    return;
  }
});

/* re-render parcial de la ficha al cambiar presentación */
function render2Ficha() {
  const slug = parseHash().partes[1];
  const p = prodPorSlug(slug);
  if (!p) return;
  const pr = precios(p, estado.ficha.pres);
  $$('[data-pres]').forEach(b => {
    const activo = b.dataset.pres === estado.ficha.pres;
    b.setAttribute('aria-pressed', activo);
    b.innerHTML = esc(presNombre(b.dataset.pres)) + (activo ? ' ' + ICO.check : '');
  });
  const el = $('#precio-ficha');
  if (el) el.textContent = money(pr.final);
  const ah = $('#ahorro-ficha');
  if (ah) ah.textContent = pr.ahorro ? 'Ahorrás ' + money(pr.ahorro) : '';
  const antes = $('.fila-precio .precio__antes');
  if (antes) antes.textContent = pr.descuento ? money(pr.venta) : '';
}

document.addEventListener('input', ev => {
  if (ev.target.id === 'q') {
    estado.catalogo.q = ev.target.value;
    pintarGrillaCatalogo();
  }
  if (ev.target.id === 'mix-nombre') estado.mix.nombre = ev.target.value;
  if (ev.target.id === 'mix-buscar') { estado.mix.q = ev.target.value; pintarMixLista(); }
});

document.addEventListener('change', ev => {
  if (ev.target.id === 'orden') {
    estado.catalogo.orden = ev.target.value;
    pintarGrillaCatalogo();
  }
});

document.addEventListener('submit', ev => {
  if (ev.target.id !== 'form-pedido') return;
  ev.preventDefault();
  const f = ev.target;
  const err = $('#err-pedido');
  const esEnvio = estado.checkout.tipo === 'domicilio';
  const datos = {
    nombre: f.nombre.value.trim(),
    tel: f.tel.value.trim(),
    entrega: esEnvio ? (CONFIG.entrega[1] || 'Envío a domicilio') : (CONFIG.entrega[0] || 'Retiro en el local'),
    dir: esEnvio && f.dir ? f.dir.value.trim() : '',
    hora: !esEnvio && f.hora ? f.hora.value.trim() : '',
    obs: f.obs.value.trim(),
    nro: numeroPedido()
  };

  let problema = '';
  if (!estado.carrito.length) problema = 'El carrito está vacío.';
  else if (datos.nombre.length < 2) problema = 'Escribí tu nombre.';
  else if (datos.tel.replace(/\D/g, '').length < 8) problema = 'Escribí un teléfono válido.';
  else if (esEnvio && !datos.dir) problema = 'Escribí la dirección de envío.';
  else if (totalCarrito() < (CONFIG.compraMinima || 0)) problema = 'No llegás a la compra mínima.';

  if (problema) {
    err.textContent = problema;
    err.classList.remove('oculto');
    return;
  }
  err.classList.add('oculto');

  guardarPerfil(datos);
  guardar(LS_ULTIMO, estado.carrito.slice());

  const url = 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(armarMensaje(datos));
  window.open(url, '_blank', 'noopener');
  toast('Pedido ' + datos.nro + ' listo para enviar');
});

document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') cerrarPaneles();
});

window.addEventListener('hashchange', render);

/* ---------------- movimiento de la cáscara ---------------- */
/* el header se achica al bajar y vuelve al subir */
function alScrollear() {
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.classList.toggle('compacto', y > 140);
}
window.addEventListener('scroll', alScrollear, { passive: true });

/* la pastilla de la barra inferior se desliza hasta la sección activa */
function moverPastilla(conRebote) {
  const pill = $('.tabbar__pill');
  const activo = $('.tabbar a[aria-current="page"]');
  if (!pill) return;
  if (!activo) { pill.style.opacity = '0'; return; }
  const r = activo.getBoundingClientRect();
  const rp = activo.parentElement.getBoundingClientRect();
  pill.style.opacity = '1';
  pill.style.width = r.width + 'px';
  pill.style.transform = 'translateX(' + (r.left - rp.left) + 'px)';
  if (conRebote && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ico = activo.querySelector('svg');
    if (ico) {
      ico.classList.remove('rebota');
      void ico.offsetWidth;
      ico.classList.add('rebota');
    }
  }
}
window.addEventListener('resize', () => moverPastilla(false));

/* ---------------- arranque ---------------- */
function pintarCascara() {
  $('#marca-nombre').textContent = CONFIG.marca;
  $('#marca-bajada').textContent = CONFIG.bajada;

  $('#menu-cats').innerHTML = CATEGORIAS.filter(c => c.visible).sort((a, b) => a.orden - b.orden)
    .map(c => '<a href="#/catalogo?cat=' + c.id + '" data-cerrar>' + esc(c.nombre) + '</a>').join('');

  $('#menu-datos').innerHTML =
    '<p>' + esc(CONFIG.direccion) + '</p>' +
    '<p>' + esc(CONFIG.horarios) + '</p>' +
    '<p>' + esc(CONFIG.zonas) + '</p>';

  $('#pie-datos').innerHTML =
    '<div class="pie__bloque"><h3>' + esc(CONFIG.marca) + '</h3>' +
      '<p>' + esc(CONFIG.direccion) + '</p><p>' + esc(CONFIG.horarios) + '</p></div>' +
    '<div class="pie__bloque"><h3>Entrega</h3><p>' + esc(CONFIG.zonas) + '</p><p>' + esc(CONFIG.mediosPago) + '</p></div>' +
    '<div class="pie__bloque"><h3>Tienda</h3><div class="pie__links">' +
      '<a href="#/catalogo">Catálogo</a><a href="#/mix">Armá tu mix</a>' +
      '<a href="#/combos">Combos</a><a href="#/como-comprar">Cómo comprar</a>' +
    '</div></div>';

  if (DEMO) $('#banda-demo').classList.remove('oculto');
  pintarContadorCarrito();
}

/* la tienda arranca cuando el catálogo terminó de cargar */
(async () => {
  const ok = await cargarCatalogo();
  if (!ok) {
    $('#app').innerHTML =
      '<section class="seccion"><div class="contenedor">' +
      vacio('No pudimos cargar el catálogo', 'Revisá tu conexión y volvé a intentar.') +
      '<p style="text-align:center;margin-top:16px"><button class="btn btn--oliva" onclick="location.reload()">Reintentar</button></p>' +
      '</div></section>';
    return;
  }
  pintarCascara();
  render();
})();
