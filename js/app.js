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

function precioMix(ids, presId) {
  const p = pres(presId);
  if (!p || !ids.length) return 0;
  let costoKgProm = 0;
  ids.forEach(id => { const pr = prodPorId(id); if (pr) costoKgProm += (pr.costoKg || 0); });
  costoKgProm = costoKgProm / ids.length;
  const costo = costoKgProm * p.gramos / 1000;
  const venta = costo * (1 + CONFIG.margenPorDefecto / 100) * (1 + (MIX.recargo || 0) / 100);
  return redondear(venta);
}

/* ---------------- estado ---------------- */
const LS_CARRITO = 'dietetica_carrito_v1';
const LS_FAVS    = 'dietetica_favs_v1';

const estado = {
  carrito: leer(LS_CARRITO, []),
  favs:    leer(LS_FAVS, []),
  catalogo: { q: '', cat: 'todos', orden: 'destacados', soloDisponibles: false },
  mix: { ids: [], pres: MIX.presentacionDefecto, nombre: '' },
  ficha: { pres: null, cant: 1, tab: 'descripcion' }
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
const totalCarrito = () => estado.carrito.reduce((s, i) => s + i.precio * i.cant, 0);
const unidadesCarrito = () => estado.carrito.reduce((s, i) => s + i.cant, 0);

function pintarContadorCarrito() {
  const n = unidadesCarrito();
  $$('.carrito-btn__n').forEach(el => { el.textContent = n; });
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
  bolsa: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h14l-1 13H6z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>'
};

/* ---------------- componentes ---------------- */
function tarjetaProducto(p) {
  const pr  = precios(p, p.presentacionDefecto);
  const cat = catPorId(p.categoria);
  const badge = p.destacado
    ? '<span class="prod__badge">Destacado</span>'
    : (p.tags && p.tags.includes('sintacc') ? '<span class="prod__badge prod__badge--tag">Sin TACC</span>' : '');
  const opciones = p.presentaciones.map(id =>
    '<option value="' + id + '"' + (id === p.presentacionDefecto ? ' selected' : '') + '>' + esc(presNombre(id)) + '</option>'
  ).join('');
  const fav = estado.favs.includes(p.id);

  return '' +
  '<article class="prod' + (p.disponible ? '' : ' prod--agotado') + '" data-prod="' + p.id + '">' +
    '<a class="prod__fig" href="#/producto/' + p.slug + '" aria-label="Ver ' + esc(p.nombre) + '">' +
      badge +
      '<img src="' + imgDe(p) + '" alt="' + esc(p.nombre) + '" width="400" height="400" loading="lazy" decoding="async">' +
    '</a>' +
    '<button class="prod__fav" data-fav="' + p.id + '" aria-pressed="' + fav + '" aria-label="Guardar ' + esc(p.nombre) + ' en favoritos">' + ICO.corazon + '</button>' +
    '<h3 class="prod__nom"><a href="#/producto/' + p.slug + '">' + esc(p.nombre) + '</a></h3>' +
    '<p class="prod__sub">' + esc(p.subtitulo || (cat ? cat.nombre : '')) + '</p>' +
    (p.presentaciones.length > 1
      ? '<label class="visually-hidden" for="sel-' + p.id + '">Cantidad de ' + esc(p.nombre) + '</label>' +
        '<select class="prod__sel" id="sel-' + p.id + '" data-sel="' + p.id + '">' + opciones + '</select>'
      : '') +
    '<div class="prod__pie">' +
      '<span class="precio" data-precio="' + p.id + '">' +
        (pr.descuento ? '<span class="precio__antes">' + money(pr.venta) + '</span>' : '') +
        money(pr.final) +
      '</span>' +
      (p.disponible
        ? '<button class="prod__add" data-add="' + p.id + '" aria-label="Agregar ' + esc(p.nombre) + ' al carrito">' + ICO.carrito + '</button>'
        : '<span class="prod__agotado">Sin stock</span>') +
    '</div>' +
  '</article>';
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
        '<a class="btn btn--oliva" href="#/catalogo">Explorar la tienda ' + ICO.flecha + '</a>' +
      '</div>' +
      '<div class="hero__arte">' +
        '<img src="assets/hero-dietetica.jpg" alt="Selección de productos de la dietética" width="1536" height="1024" fetchpriority="high" decoding="async">' +
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

  '<section class="seccion"><div class="contenedor">' +
    '<div class="titulo-filete"><h2>Nuestros favoritos</h2></div>' +
    grilla(destacados) +
    '<p style="text-align:center;margin-top:22px"><a class="btn btn--fantasma" href="#/catalogo">Ver todo el catálogo</a></p>' +
  '</div></section>' +

  '<section class="seccion" style="background:var(--champan-claro)"><div class="contenedor">' +
    '<div class="titulo-filete"><h2>También podés</h2></div>' +
    '<div class="cats-grid">' +
      '<a class="cat-card" href="#/mix"><span class="cat-card__nom">Armá tu mix</span>' +
        '<img class="cat-card__fig" src="assets/productos/pasas-de-uva.jpg" alt="" width="418" height="418" loading="lazy" decoding="async">' +
        '<span class="cat-card__ver">Empezar ' + ICO.flecha + '</span></a>' +
      '<a class="cat-card" href="#/combos"><span class="cat-card__nom">Combos</span>' +
        '<img class="cat-card__fig" src="assets/productos/salsa-de-tomate.jpg" alt="" width="627" height="627" loading="lazy" decoding="async">' +
        '<span class="cat-card__ver">Ver combos ' + ICO.flecha + '</span></a>' +
      '<a class="cat-card" href="#/como-comprar"><span class="cat-card__nom">Cómo comprar</span>' +
        '<img class="cat-card__fig" src="assets/productos/harina-integral.jpg" alt="" width="627" height="627" loading="lazy" decoding="async">' +
        '<span class="cat-card__ver">Leer ' + ICO.flecha + '</span></a>' +
      '<a class="cat-card" href="#/catalogo?cat=sintacc"><span class="cat-card__nom">Sin TACC</span>' +
        '<img class="cat-card__fig" src="assets/productos/quinoa.jpg" alt="" width="418" height="418" loading="lazy" decoding="async">' +
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
  '<section class="seccion"><div class="contenedor">' +
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

function vistaMix() {
  const disponibles = publicados().filter(p => p.mix && p.disponible);
  const st = estado.mix;
  const total = precioMix(st.ids, st.pres);

  return '' +
  '<section class="seccion"><div class="contenedor">' +
    '<div class="portada-vista">' +
      '<h1>' + esc(MIX.titulo) + '</h1>' +
      '<p>' + esc(MIX.bajada) + '</p>' +
    '</div>' +
    '<div class="mix-grid">' +
      disponibles.map(p => {
        const sel = st.ids.includes(p.id);
        return '<button class="mix-card" data-mix="' + p.id + '" aria-pressed="' + sel + '">' +
          '<span class="mix-card__top">' +
            '<span class="mix-card__nom">' + esc(p.nombre) + '</span>' +
            '<span class="mix-card__check">' + (sel ? ICO.check : ICO.mas) + '</span>' +
          '</span>' +
          '<span class="mix-card__fig"><img src="' + (p.mixImg || imgDe(p)) + '" alt="" width="418" height="418" loading="lazy" decoding="async"></span>' +
        '</button>';
      }).join('') +
    '</div>' +
    '<div class="mix-resumen">' +
      '<div class="titulo-filete"><h2>Tu selección</h2></div>' +
      '<p class="mix-resumen__n" id="mix-n">' + st.ids.length + ' de ' + MIX.maxIngredientes + ' ingredientes</p>' +
      '<div class="opts">' +
        MIX.presentaciones.map(id =>
          '<button class="opt" data-mixpres="' + id + '" aria-pressed="' + (id === st.pres) + '">' +
            esc(presNombre(id)) + (id === st.pres ? ' ' + ICO.check : '') + '</button>').join('') +
      '</div>' +
      '<div class="form-campo" style="margin-top:16px;text-align:left">' +
        '<label for="mix-nombre" style="color:var(--champan-claro)">Nombre del mix (opcional)</label>' +
        '<input id="mix-nombre" type="text" maxlength="40" placeholder="Mi mix de la tarde" value="' + esc(st.nombre) + '">' +
      '</div>' +
      '<div class="mix-resumen__total">' +
        '<span>Total estimado</span>' +
        '<strong id="mix-total">' + money(total) + '</strong>' +
      '</div>' +
      '<button class="btn btn--oliva btn--bloque" id="add-mix" style="margin-top:14px"' +
        (st.ids.length >= MIX.minIngredientes ? '' : ' disabled') + '>Agregar mi mix ' + ICO.flecha + '</button>' +
      '<p style="font-size:13px;opacity:.85;margin-top:10px">Mínimo ' + MIX.minIngredientes + ' ingredientes. El armado tiene un recargo del ' + MIX.recargo + '%.</p>' +
    '</div>' +
  '</div></section>';
}

function vistaCombos() {
  const activos = COMBOS.filter(c => c.activo).sort((a, b) => a.orden - b.orden);
  return '' +
  '<section class="seccion"><div class="contenedor">' +
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
          '<div class="combo__fig"><img src="' + imgDemo(c.color, c.color2) + '" alt="" width="300" height="300" loading="lazy" decoding="async"></div>' +
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
  return '' +
  '<section class="seccion"><div class="contenedor">' +
    '<div class="pasos">' +
      '<h1>Comprar, paso a paso</h1>' +
      PASOS.map(p =>
        '<div class="pasos__sep"></div>' +
        '<div class="paso">' +
          '<span class="paso__n">' + esc(p.n) + '</span>' +
          '<div class="paso__cuerpo"><h3>' + esc(p.titulo) + '</h3><p>' + esc(p.texto) + '</p></div>' +
        '</div>').join('') +
      '<div class="pasos__sep"></div>' +
      '<a class="btn btn--claro btn--bloque" href="#/catalogo">Empezar mi compra ' + ICO.flecha + '</a>' +
      '<p class="pasos__cierre">' + esc(CONFIG.avisoStock) + '</p>' +
    '</div>' +
    '<div style="margin-top:28px">' +
      '<div class="titulo-filete"><h2>Entrega y pagos</h2></div>' +
      '<p style="color:var(--gris-txt)"><strong>Envío o retiro:</strong> ' + esc(CONFIG.zonas) + '</p>' +
      '<p style="color:var(--gris-txt)"><strong>Pagos:</strong> ' + esc(CONFIG.mediosPago) + '</p>' +
      '<p style="color:var(--gris-txt)"><strong>Horarios:</strong> ' + esc(CONFIG.horarios) + '</p>' +
    '</div>' +
  '</div></section>';
}

/* ---------------- carrito (panel) ---------------- */
function pintarCarrito() {
  const cont = $('#carrito-cuerpo');
  if (!cont) return;

  if (!estado.carrito.length) {
    cont.innerHTML = vacio('Tu carrito está vacío', 'Agregá productos y volvé para terminar el pedido.') +
      '<p style="text-align:center;margin-top:16px"><button class="btn btn--oliva" data-cerrar-carrito>Ver productos</button></p>';
    return;
  }

  const total = totalCarrito();
  const falta = Math.max((CONFIG.compraMinima || 0) - total, 0);

  cont.innerHTML =
    estado.carrito.map(i =>
      '<div class="item">' +
        '<div class="item__fig"><img src="' + i.img + '" alt="" width="70" height="70" loading="lazy"></div>' +
        '<div class="item__cuerpo">' +
          '<p class="item__nom">' + esc(i.nombre) + '</p>' +
          '<p class="item__meta">' + esc(i.detalle || '') + ' · ' + money(i.precio) + ' c/u</p>' +
          '<div class="item__pie">' +
            '<span class="stepper stepper--mini">' +
              '<button data-mas="' + i.key + '" data-delta="-1" aria-label="Quitar uno">−</button>' +
              '<span>' + i.cant + '</span>' +
              '<button data-mas="' + i.key + '" data-delta="1" aria-label="Sumar uno">+</button>' +
            '</span>' +
            '<strong>' + money(i.precio * i.cant) + '</strong>' +
          '</div>' +
          '<button class="item__quitar" data-quitar="' + i.key + '">Quitar</button>' +
        '</div>' +
      '</div>').join('') +

    '<div class="totales">' +
      '<div class="totales__fila"><span>Productos (' + unidadesCarrito() + ')</span><span>' + money(total) + '</span></div>' +
      '<div class="totales__fila totales__total"><span>Total estimado</span><span>' + money(total) + '</span></div>' +
    '</div>' +
    (falta > 0 ? '<p class="aviso">Te faltan ' + money(falta) + ' para llegar a la compra mínima de ' + money(CONFIG.compraMinima) + '.</p>' : '') +

    '<form id="form-pedido" novalidate>' +
      '<div class="form-campo"><label for="f-nombre">Nombre y apellido *</label><input id="f-nombre" name="nombre" required autocomplete="name"></div>' +
      '<div class="form-campo"><label for="f-tel">Teléfono *</label><input id="f-tel" name="tel" type="tel" required autocomplete="tel" inputmode="tel"></div>' +
      '<div class="form-campo">' +
        '<label id="lbl-entrega">Entrega *</label>' +
        '<div class="radio-fila" role="group" aria-labelledby="lbl-entrega">' +
          CONFIG.entrega.map((e, idx) =>
            '<button type="button" class="opt" data-entrega="' + esc(e) + '" aria-pressed="' + (idx === 0) + '">' + esc(e) + '</button>').join('') +
        '</div>' +
      '</div>' +
      '<div class="form-campo oculto" id="campo-dir"><label for="f-dir">Dirección *</label><input id="f-dir" name="dir" autocomplete="street-address"></div>' +
      '<div class="form-campo"><label for="f-obs">Observaciones</label><textarea id="f-obs" name="obs" placeholder="Aclaraciones sobre el pedido"></textarea></div>' +
      '<p class="error-msg oculto" id="err-pedido"></p>' +
      '<button class="btn btn--oliva btn--bloque" type="submit">' + ICO.wa + ' Enviar pedido por WhatsApp</button>' +
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
  estado.carrito.forEach(i => {
    L.push('• ' + i.nombre + (i.detalle ? ' (' + i.detalle + ')' : ''));
    L.push('   ' + i.cant + ' × ' + money(i.precio) + ' = ' + money(i.precio * i.cant));
  });
  L.push('');
  L.push('TOTAL ESTIMADO: ' + money(totalCarrito()));
  L.push('');
  L.push('Nombre: ' + datos.nombre);
  L.push('Teléfono: ' + datos.tel);
  L.push('Entrega: ' + datos.entrega);
  if (datos.dir) L.push('Dirección: ' + datos.dir);
  if (datos.obs) L.push('Observaciones: ' + datos.obs);
  L.push('');
  L.push(CONFIG.avisoStock);
  L.push(CONFIG.waCierre);
  return L.join('\n');
}

/* ---------------- paneles ---------------- */
function abrirPanel(cual) {
  const p = cual === 'menu' ? $('#panel-menu') : $('#panel-carrito');
  if (cual !== 'menu') pintarCarrito();
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

  app.innerHTML = html;
  document.title = titulo;
  if (vista === 'catalogo') pintarGrillaCatalogo();

  $$('.tabbar a').forEach(a => {
    const suya = a.getAttribute('href') === '#/' + (vista === 'inicio' ? '' : vista);
    if (suya) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });

  cerrarPaneles();
  window.scrollTo(0, 0);
}

/* ---------------- eventos ---------------- */
function agregarProductoDesdeTarjeta(id, cant) {
  const p = prodPorId(id);
  if (!p || !p.disponible) return;
  const card = document.querySelector('[data-prod="' + id + '"]');
  const sel  = card ? card.querySelector('[data-sel]') : null;
  const presId = sel ? sel.value : p.presentacionDefecto;
  const pr = precios(p, presId);
  agregar({
    key: 'p:' + p.id + ':' + presId,
    tipo: 'producto', id: p.id, nombre: p.nombre,
    detalle: presNombre(presId), presentacionId: presId,
    precio: pr.final, cant: cant || 1, img: imgDe(p)
  });
}

document.addEventListener('click', ev => {
  const t = ev.target;

  const cerrar = t.closest('[data-cerrar]');
  if (cerrar) { cerrarPaneles(); return; }
  if (t.closest('[data-cerrar-carrito]')) { cerrarPaneles(); location.hash = '#/catalogo'; return; }
  if (t.id === 'overlay') { cerrarPaneles(); return; }

  if (t.closest('#btn-menu'))    { abrirPanel('menu'); return; }
  if (t.closest('.carrito-btn')) { abrirPanel('carrito'); return; }
  if (t.closest('#btn-buscar'))  { location.hash = '#/catalogo'; setTimeout(() => { const q = $('#q'); if (q) q.focus(); }, 60); return; }

  const fav = t.closest('[data-fav]');
  if (fav) {
    toggleFav(fav.dataset.fav);
    fav.setAttribute('aria-pressed', estado.favs.includes(fav.dataset.fav));
    return;
  }

  const add = t.closest('[data-add]');
  if (add) { agregarProductoDesdeTarjeta(add.dataset.add, 1); return; }

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
  const mixCard = t.closest('[data-mix]');
  if (mixCard) {
    const id = mixCard.dataset.mix;
    const st = estado.mix;
    if (st.ids.includes(id)) st.ids = st.ids.filter(x => x !== id);
    else if (st.ids.length < MIX.maxIngredientes) st.ids.push(id);
    else { toast('Podés elegir hasta ' + MIX.maxIngredientes + ' ingredientes'); return; }
    st.nombre = ($('#mix-nombre') || {}).value || st.nombre;
    render();
    return;
  }
  const mixPres = t.closest('[data-mixpres]');
  if (mixPres) {
    estado.mix.pres = mixPres.dataset.mixpres;
    estado.mix.nombre = ($('#mix-nombre') || {}).value || estado.mix.nombre;
    render();
    return;
  }
  if (t.closest('#add-mix')) {
    const st = estado.mix;
    if (st.ids.length < MIX.minIngredientes) { toast('Elegí al menos ' + MIX.minIngredientes + ' ingredientes'); return; }
    const nombreLibre = ($('#mix-nombre') || {}).value || '';
    const nombres = st.ids.map(id => (prodPorId(id) || {}).nombre).join(', ');
    agregar({
      key: 'mix:' + st.ids.slice().sort().join('-') + ':' + st.pres,
      tipo: 'mix', id: 'mix', nombre: nombreLibre.trim() || 'Mi mix',
      detalle: presNombre(st.pres) + ' · ' + nombres,
      precio: precioMix(st.ids, st.pres), cant: 1,
      img: imgDemo('#a97e46', '#e0c48c')
    });
    estado.mix = { ids: [], pres: MIX.presentacionDefecto, nombre: '' };
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

  const entrega = t.closest('[data-entrega]');
  if (entrega) {
    $$('[data-entrega]').forEach(b => b.setAttribute('aria-pressed', b === entrega));
    const necesitaDir = /env[ií]o|domicilio/i.test(entrega.dataset.entrega);
    $('#campo-dir').classList.toggle('oculto', !necesitaDir);
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
  const sel = ev.target.closest('[data-sel]');
  if (sel) {
    const p = prodPorId(sel.dataset.sel);
    if (!p) return;
    const pr = precios(p, sel.value);
    const cont = document.querySelector('[data-precio="' + p.id + '"]');
    if (cont) cont.innerHTML = (pr.descuento ? '<span class="precio__antes">' + money(pr.venta) + '</span>' : '') + money(pr.final);
  }
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
  const entrega = ($('[data-entrega][aria-pressed="true"]') || {}).dataset;
  const datos = {
    nombre: f.nombre.value.trim(),
    tel: f.tel.value.trim(),
    entrega: entrega ? entrega.entrega : CONFIG.entrega[0],
    dir: $('#campo-dir').classList.contains('oculto') ? '' : f.dir.value.trim(),
    obs: f.obs.value.trim(),
    nro: numeroPedido()
  };

  let problema = '';
  if (!estado.carrito.length) problema = 'El carrito está vacío.';
  else if (datos.nombre.length < 2) problema = 'Escribí tu nombre.';
  else if (datos.tel.replace(/\D/g, '').length < 8) problema = 'Escribí un teléfono válido.';
  else if (!$('#campo-dir').classList.contains('oculto') && !datos.dir) problema = 'Escribí la dirección de envío.';
  else if (totalCarrito() < (CONFIG.compraMinima || 0)) problema = 'No llegás a la compra mínima.';

  if (problema) {
    err.textContent = problema;
    err.classList.remove('oculto');
    return;
  }
  err.classList.add('oculto');

  const url = 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(armarMensaje(datos));
  window.open(url, '_blank', 'noopener');
  toast('Pedido ' + datos.nro + ' listo para enviar');
});

document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') cerrarPaneles();
});

window.addEventListener('hashchange', render);

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

pintarCascara();
render();
