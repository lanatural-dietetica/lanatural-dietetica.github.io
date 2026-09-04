/* ============================================================
   Panel de administración de La Natural
   ------------------------------------------------------------
   Guarda los cambios directamente en el repositorio: lee y escribe
   data/catalogo.json. No hay base de datos ni servidor.
   La clave (token de GitHub) queda sólo en este navegador.
   ============================================================ */
'use strict';

const REPO  = { duenio: 'lanatural-dietetica', nombre: 'lanatural-dietetica.github.io' };
const RUTA  = 'data/catalogo.json';
const LS_TOKEN = 'lanatural_clave_panel';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const fmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const money = n => '$ ' + fmt.format(Math.round(n || 0));

const estado = { token: '', catalogo: null, sha: '', q: '', rubro: 'todos',
                 seccion: 'productos', editando: null, editandoCombo: null, alta: null, eligiendo: false };

/* ---------------- avisos ---------------- */
let avisoTimer;
function aviso(msg, tipo) {
  const el = $('#aviso');
  el.textContent = msg;
  el.className = 'aviso-guardado visible' + (tipo ? ' ' + tipo : '');
  clearTimeout(avisoTimer);
  if (tipo !== 'trabajando') avisoTimer = setTimeout(() => el.classList.remove('visible'), 3200);
}

/* ---------------- GitHub ---------------- */
const b64aTexto = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
/* El catálogo ya pesa más de 100 KB. Pasarlo a base64 de una sola vez con
   String.fromCharCode(...bytes) revienta la pila del navegador, así que se
   convierte de a bloques. */
function textoAb64(txt) {
  const bytes = new TextEncoder().encode(txt);
  const paso = 0x8000;
  let bin = '';
  for (let i = 0; i < bytes.length; i += paso) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + paso));
  }
  return btoa(bin);
}

async function api(ruta, opciones = {}) {
  const r = await fetch('https://api.github.com/repos/' + REPO.duenio + '/' + REPO.nombre + ruta, {
    ...opciones,
    headers: {
      'Authorization': 'Bearer ' + estado.token,
      'Accept': 'application/vnd.github+json',
      ...(opciones.headers || {})
    }
  });
  if (!r.ok) {
    const detalle = await r.json().catch(() => ({}));
    const e = new Error(detalle.message || ('HTTP ' + r.status));
    e.codigo = r.status;
    throw e;
  }
  return r.json();
}

async function traerCatalogo() {
  const d = await api('/contents/' + RUTA + '?ref=main&t=' + Date.now());
  estado.sha = d.sha;
  estado.catalogo = JSON.parse(b64aTexto(d.content.replace(/\n/g, '')));
}

async function guardarCatalogo(mensaje) {
  estado.catalogo.actualizado = new Date().toISOString().slice(0, 10);
  estado.catalogo.sello = Date.now();
  const cuerpo = JSON.stringify(estado.catalogo, null, 2) + '\n';
  const d = await api('/contents/' + RUTA, {
    method: 'PUT',
    body: JSON.stringify({ message: mensaje, content: textoAb64(cuerpo), sha: estado.sha, branch: 'main' })
  });
  estado.sha = d.content.sha;
}

/* ---------------- fotos ----------------
   Se achican en el propio celular antes de subirlas: 800x800, fondo
   emparejado con el de las tarjetas y WebP. Una foto de 3 MB queda en 60 KB.
--------------------------------------------------------------- */
const FOTO = { lado: 800, calidad: 0.84, fondo: [250, 230, 208] };  // #FAE6D0

/* Safari viejo no sabe comprimir en WebP y devuelve un PNG enorme sin avisar.
   Así que primero preguntamos qué formato soporta de verdad. */
let FORMATO = null;
function formatoDeSalida() {
  if (FORMATO) return FORMATO;
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  FORMATO = c.toDataURL('image/webp').indexOf('data:image/webp') === 0
    ? { tipo: 'image/webp', ext: 'webp', calidad: FOTO.calidad }
    : { tipo: 'image/jpeg', ext: 'jpg', calidad: 0.86 };
  return FORMATO;
}

const pesoLindo = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB';

async function abrirImagen(file) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) {}
  }
  return new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => mal(new Error('No pudimos leer la imagen'));
    img.src = URL.createObjectURL(file);
  });
}

/* deja el fondo en el color exacto de las tarjetas, sin tocar el bowl ni dejar halo */
function emparejarFondo(ctx, ancho, alto) {
  const d = ctx.getImageData(0, 0, ancho, alto);
  const px = d.data;
  const borde = Math.max(4, Math.round(Math.min(ancho, alto) * 0.012));
  const salto = 3, muestras = [[], [], []];
  const tomar = (x, y) => {
    const i = (y * ancho + x) * 4;
    muestras[0].push(px[i]); muestras[1].push(px[i + 1]); muestras[2].push(px[i + 2]);
  };
  for (let y = 0; y < borde; y += salto)
    for (let x = 0; x < ancho; x += salto) { tomar(x, y); tomar(x, alto - 1 - y); }
  for (let x = 0; x < borde; x += salto)
    for (let y = borde; y < alto - borde; y += salto) { tomar(x, y); tomar(ancho - 1 - x, y); }
  const mediana = a => { a.sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
  const fondo = [mediana(muestras[0]), mediana(muestras[1]), mediana(muestras[2])];
  const delta = [FOTO.fondo[0] - fondo[0], FOTO.fondo[1] - fondo[1], FOTO.fondo[2] - fondo[2]];

  const CERCA = 22, LEJOS = 80, CERCA2 = CERCA * CERCA, LEJOS2 = LEJOS * LEJOS;
  const lejos = p => {
    const i = p * 4;
    const dr = px[i] - fondo[0], dg = px[i + 1] - fondo[1], db = px[i + 2] - fondo[2];
    return dr * dr + dg * dg + db * db;
  };

  // El fondo se pinta avanzando desde el marco de la foto y frenando en cuanto
  // hay un escalón de color. Así el fondo y su sombra se corrigen enteros, pero
  // un envase blanco sobre fondo blanco queda intacto: su borde es un escalón.
  const PASO = 3;
  const total = ancho * alto;
  const esFondo = new Uint8Array(total);
  const cola = new Int32Array(total);
  let fin = 0;
  const escalon = (a, b) => {
    const i = a * 4, j = b * 4;
    return Math.abs(px[i] - px[j]) < PASO
        && Math.abs(px[i + 1] - px[j + 1]) < PASO
        && Math.abs(px[i + 2] - px[j + 2]) < PASO;
  };
  const sembrar = p => { if (!esFondo[p] && lejos(p) < LEJOS2) { esFondo[p] = 1; cola[fin++] = p; } };
  const seguir = (desde, p) => { if (!esFondo[p] && lejos(p) < LEJOS2 && escalon(desde, p)) { esFondo[p] = 1; cola[fin++] = p; } };

  for (let x = 0; x < ancho; x++) { sembrar(x); sembrar((alto - 1) * ancho + x); }
  for (let y = 0; y < alto; y++) { sembrar(y * ancho); sembrar(y * ancho + ancho - 1); }
  for (let cab = 0; cab < fin; cab++) {
    const p = cola[cab], x = p % ancho, y = (p - x) / ancho;
    if (x > 0) seguir(p, p - 1);
    if (x < ancho - 1) seguir(p, p + 1);
    if (y > 0) seguir(p, p - ancho);
    if (y < alto - 1) seguir(p, p + ancho);
  }

  // Si el fondo se metió en el centro, el producto es casi del color del fondo:
  // no se toca la foto, es preferible el fondo blanco a arruinar el producto.
  let centro = 0, cuenta = 0;
  for (let y = Math.floor(alto * 0.3); y < alto * 0.7; y++)
    for (let x = Math.floor(ancho * 0.3); x < ancho * 0.7; x++, cuenta++)
      if (esFondo[y * ancho + x]) centro++;
  if (cuenta && centro / cuenta > 0.35) return { corregida: false, fondo };

  for (let p = 0; p < total; p++) {
    if (!esFondo[p]) continue;
    const i = p * 4, d2 = lejos(p);
    if (d2 <= CERCA2) {
      px[i] = FOTO.fondo[0]; px[i + 1] = FOTO.fondo[1]; px[i + 2] = FOTO.fondo[2];
      continue;
    }
    const peso = (LEJOS - Math.sqrt(d2)) / (LEJOS - CERCA);
    px[i]     = Math.max(0, Math.min(255, px[i]     + delta[0] * peso));
    px[i + 1] = Math.max(0, Math.min(255, px[i + 1] + delta[1] * peso));
    px[i + 2] = Math.max(0, Math.min(255, px[i + 2] + delta[2] * peso));
  }
  ctx.putImageData(d, 0, 0);
  return { corregida: true, fondo: FOTO.fondo };
}

async function prepararFoto(file) {
  const img = await abrirImagen(file);
  const lado = FOTO.lado;
  const escala = Math.min(lado / img.width, lado / img.height);
  const w = Math.max(1, Math.round(img.width * escala));
  const h = Math.max(1, Math.round(img.height * escala));

  // primero la foto sola, para poder medir SU fondo y no el relleno
  const soloFoto = document.createElement('canvas');
  soloFoto.width = w; soloFoto.height = h;
  const cf = soloFoto.getContext('2d', { willReadFrequently: true });
  cf.drawImage(img, 0, 0, w, h);
  const r = emparejarFondo(cf, w, h);

  // y después, centrada en el cuadrado. Si la foto no se pudo corregir, el
  // relleno va del color que ya tenía, así al menos queda pareja.
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = lado;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = 'rgb(' + r.fondo.map(Math.round).join(',') + ')';
  ctx.fillRect(0, 0, lado, lado);
  ctx.drawImage(soloFoto, Math.round((lado - w) / 2), Math.round((lado - h) / 2));

  const f = formatoDeSalida();
  const blob = await new Promise(ok => lienzo.toBlob(ok, f.tipo, f.calidad));
  return { blob, ext: f.ext, vistaPrevia: URL.createObjectURL(blob), antes: file.size, despues: blob.size, corregida: r.corregida };
}

async function subirFoto(slug, blob, ext, rutaAnterior) {
  const marca = Date.now().toString(36).slice(-5);
  const ruta = 'assets/productos/' + slug + '-' + marca + '.' + (ext || 'webp');
  const base64 = await new Promise(ok => {
    const fr = new FileReader();
    fr.onload = () => ok(fr.result.split(',')[1]);
    fr.readAsDataURL(blob);
  });
  await api('/contents/' + ruta, {
    method: 'PUT',
    body: JSON.stringify({ message: 'Panel: foto de ' + slug, content: base64, branch: 'main' })
  });
  borrarFoto(rutaAnterior);   // la anterior ya no le sirve a nadie
  return ruta;
}

/* borra la foto que reemplazamos, si estaba en el repositorio */
async function borrarFoto(ruta) {
  if (!ruta) return;
  const limpia = String(ruta).split('?')[0];
  if (!limpia.startsWith('assets/productos/')) return;
  try {
    const d = await api('/contents/' + limpia + '?ref=main');
    await api('/contents/' + limpia, {
      method: 'DELETE',
      body: JSON.stringify({ message: 'Panel: saca la foto anterior', sha: d.sha, branch: 'main' })
    });
  } catch (e) {}
}

/* La tienda se publica sola, pero tarda un rato. En vez de dejarla adivinando,
   preguntamos cada tres segundos hasta ver el cambio publicado. */
async function esperarPublicado(sello, alAvisar) {
  const hasta = Date.now() + 150000;
  while (Date.now() < hasta) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const r = await fetch('data/catalogo.json?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) {
        const d = await r.json();
        if (d.sello === sello) return true;
      }
    } catch (e) {}
    if (alAvisar) alAvisar();
  }
  return false;
}

/* ---------------- precios ---------------- */
const cfg = () => estado.catalogo.config || {};
function redondear(n) {
  const r = cfg().redondeo || 0;
  return r > 0 ? Math.round(n / r) * r : Math.round(n);
}
const gramosDe = id => {
  const p = (estado.catalogo.presentaciones || []).find(x => x.id === id);
  return p && p.gramos ? p.gramos : 0;
};
const nombrePres = id => {
  const p = (estado.catalogo.presentaciones || []).find(x => x.id === id);
  return p ? p.nombre : id;
};

function cuentaDe(p) {
  const margen = Number.isFinite(p.margen) ? p.margen : (cfg().margenPorDefecto || 0);
  const desc   = Math.min(Math.max(p.descuento || 0, 0), 90);
  const base   = p.tipo === 'granel' ? (p.costoKg || 0) : (p.costoUnidad || 0);
  const venta  = redondear(base * (1 + margen / 100));
  const final  = redondear(venta * (1 - desc / 100));
  const medidas = (p.presentaciones || []).map(id => {
    const g = gramosDe(id);
    const c = p.tipo === 'granel' ? (p.costoKg || 0) * g / 1000 : (p.costoUnidad || 0);
    const v = redondear(c * (1 + margen / 100));
    return { nombre: nombrePres(id), precio: redondear(v * (1 - desc / 100)) };
  });
  return { margen, desc, base, venta, final, medidas };
}

/* ---------------- estado del producto ---------------- */
function estadoDe(p) {
  if (p.estado !== 'publicado') return 'oculto';
  return p.disponible ? 'publicado' : 'sinstock';
}
function ponerEstado(p, cual) {
  if (cual === 'publicado') { p.estado = 'publicado'; p.disponible = true; }
  else if (cual === 'sinstock') { p.estado = 'publicado'; p.disponible = false; }
  else { p.estado = 'borrador'; p.disponible = false; }
}
const ETIQUETA_ESTADO = { publicado: 'En venta', sinstock: 'Sin stock', oculto: 'Oculto' };

const imgDe = p => p.img || 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' +
  '<rect width="40" height="40" fill="#fae6d0"/>' +
  '<path d="M9 25a11 11 0 0 1 22 0z" fill="#efe0c8"/></svg>');

/* ---------------- alta y borrado ---------------- */
/* El nombre se guarda siempre parejo: primera letra en mayúscula y el resto en
   minúscula, escriba como escriba. Las siglas se respetan. */
const SIGLAS = ['TACC'];   // se escriben enteras en mayúscula
// conectores: van en minúscula salvo que abran el nombre
const CONECTORES = ['de','del','la','las','el','los','y','e','o','u','con','en','a','al','para','sin','por'];
function nombreLindo(txt) {
  let t = (txt || '').trim().replace(/\s+/g, ' ').toLowerCase();
  // primera letra de cada palabra en mayúscula, también después de guión o barra
  t = t.replace(/(^|[\s\-\/(])([a-záéíóúüñ])/g, (m, antes, letra) => antes + letra.toUpperCase());
  // y los conectores vuelven a minúscula, menos el primero
  t = t.split(' ').map((palabra, i) =>
    i > 0 && CONECTORES.includes(palabra.toLowerCase()) ? palabra.toLowerCase() : palabra).join(' ');
  SIGLAS.forEach(sigla => {
    t = t.replace(new RegExp('\\b' + sigla + '\\b', 'gi'), sigla);
  });
  return t;
}

const aSlug = t => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function slugLibre(base, idActual) {
  let slug = base || 'producto', n = 2;
  const usados = estado.catalogo.productos.filter(p => p.id !== idActual).map(p => p.slug);
  while (usados.includes(slug)) slug = base + '-' + (n++);
  return slug;
}

function productoNuevo() {
  const prods = estado.catalogo.productos;
  const num = prods.reduce((m, p) => Math.max(m, parseInt(String(p.id).replace(/\D/g, ''), 10) || 0), 0) + 1;
  const cat = (estado.catalogo.categorias[0] || {}).id || '';
  const p = {
    id: 'p' + String(num).padStart(2, '0'),
    sku: '', slug: '', nombre: '', categoria: cat, subtitulo: '', marca: '',
    tipo: 'granel', costoKg: 0, margen: estado.catalogo.config.margenPorDefecto || 60, descuento: 0,
    presentaciones: ['250g', '500g', '1kg'], presentacionDefecto: '1kg',
    tags: [], estado: 'publicado', disponible: true,
    destacado: false, orden: prods.length + 1, mix: false,
    descripcion: '', preparacion: '', origen: '', ingredientes: '', alergenos: '',
    color: '#c8a97e', color2: '#e3cba6'
  };
  prods.push(p);
  return p;
}

/* la medida que viene elegida es siempre la más grande */
function acomodarMedidas(p) {
  if (p.tipo === 'envasado') { p.presentaciones = ['u']; p.presentacionDefecto = 'u'; return; }
  const orden = id => gramosDe(id);
  p.presentaciones = p.presentaciones.filter(id => id !== 'u').sort((a, b) => orden(a) - orden(b));
  if (!p.presentaciones.length) p.presentaciones = ['250g'];
  p.presentacionDefecto = p.presentaciones[p.presentaciones.length - 1];
}

function usadoEnCombos(id) {
  return (estado.catalogo.combos || [])
    .filter(c => (c.items || []).some(i => i.productoId === id))
    .map(c => c.nombre);
}

/* ---------------- alta guiada ----------------
   Pide sólo lo indispensable. La foto, las medidas y los textos vienen después,
   con el producto ya creado, así se entiende qué falta en cada momento.
------------------------------------------------------------------ */
function vistaAlta() {
  const a = estado.alta;
  const cats = estado.catalogo.categorias || [];
  return '' +
  '<div class="editor">' +
    '<p class="alta__intro">Cargá lo mínimo para crearlo. Después le ponés la foto, las medidas y la descripción.</p>' +

    '<div class="bloque">' +
      '<p class="bloque__lbl">1 · Qué es</p>' +
      '<div class="campos campos--uno">' +
        '<div class="campo campo--ancho campo--texto">' +
          '<label for="a-nombre">Nombre del producto</label>' +
          '<input id="a-nombre" type="text" value="' + esc(a.nombre) + '" placeholder="Ej: Almendras tostadas">' +
        '</div>' +
        '<div class="campo campo--ancho campo--texto">' +
          '<label for="a-categoria">Categoría</label>' +
          '<select id="a-categoria">' +
            cats.map(x => '<option value="' + x.id + '"' + (x.id === a.categoria ? ' selected' : '') + '>' + esc(x.nombre) + '</option>').join('') +
          '</select>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="bloque">' +
      '<p class="bloque__lbl">2 · Cómo se vende</p>' +
      '<div class="estados estados--dos">' +
        '<button class="estado-btn" data-altatipo="granel" aria-pressed="' + (a.tipo === 'granel') + '">' +
          'Por peso<small>Lo fraccionás vos</small></button>' +
        '<button class="estado-btn" data-altatipo="envasado" aria-pressed="' + (a.tipo === 'envasado') + '">' +
          'Por unidad<small>Viene envasado</small></button>' +
      '</div>' +
    '</div>' +

    '<div class="bloque">' +
      '<p class="bloque__lbl">3 · Cuánto cuesta</p>' +
      '<div class="campos">' +
        '<div class="campo">' +
          '<label for="a-costo">' + (a.tipo === 'granel' ? 'Costo por kilo' : 'Costo por unidad') + '</label>' +
          '<input id="a-costo" type="number" inputmode="numeric" min="0" step="1" value="' + (a.costo || '') + '">' +
        '</div>' +
        '<div class="campo">' +
          '<label for="a-margen">Ganancia %</label>' +
          '<input id="a-margen" type="number" inputmode="numeric" min="0" max="900" step="1" value="' + a.margen + '">' +
        '</div>' +
      '</div>' +
      '<div class="cuenta" id="alta-cuenta"></div>' +
    '</div>' +

    '<button class="btn btn--oliva btn--bloque" id="crear-producto">Crear producto</button>' +
    '<p class="campo__ayuda" style="text-align:center;margin-top:10px">Se guarda como <b>oculto</b> hasta que lo termines.</p>' +
  '</div>';
}

function pintarCuentaAlta() {
  const a = estado.alta;
  const cont = $('#alta-cuenta');
  if (!cont) return;
  const venta = redondear((a.costo || 0) * (1 + (a.margen || 0) / 100));
  cont.innerHTML =
    '<div class="cuenta__fila"><span>Costo</span><span>' + money(a.costo || 0) + '</span></div>' +
    '<div class="cuenta__fila"><span>Ganancia ' + (a.margen || 0) + '%</span><span>+ ' + money(venta - (a.costo || 0)) + '</span></div>' +
    '<div class="cuenta__fila cuenta__total"><span>' + (a.tipo === 'granel' ? 'Precio por kilo' : 'Precio final') + '</span>' +
      '<span>' + money(venta) + '</span></div>';
}

function mostrarAlta() {
  estado.editando = null;
  estado.alta = {
    nombre: '', categoria: (estado.catalogo.categorias[0] || {}).id || '',
    tipo: 'granel', costo: 0, margen: estado.catalogo.config.margenPorDefecto || 60
  };
  tituloPanel('Producto nuevo');
  $('#btn-volver').classList.remove('oculto');
  $('#btn-guardar-top').classList.add('oculto');
  $('#panel-main').innerHTML = vistaAlta();
  pintarCuentaAlta();
  setTimeout(() => { const n = $('#a-nombre'); if (n) n.focus(); }, 80);
}

/* ---------------- vistas ---------------- */
function filaProducto(p, conRubro) {
  const c = cuentaDe(p);
  const e = estadoDe(p);
  const cat = (estado.catalogo.categorias || []).find(x => x.id === p.categoria);
  return '<button class="fila" data-editar="' + p.id + '">' +
    '<img class="fila__fig" src="' + imgDe(p) + '" alt="" loading="lazy">' +
    '<span class="fila__txt">' +
      '<p class="fila__nom">' + esc(p.nombre || 'Sin nombre') + '</p>' +
      '<p class="fila__precio">' + money(c.final) + (p.tipo === 'granel' ? ' / kg' : ' / unidad') +
        (conRubro && cat ? ' · ' + esc(cat.nombre) : '') + '</p>' +
    '</span>' +
    '<span class="fila__estado estado--' + e + '">' + ETIQUETA_ESTADO[e] + '</span>' +
  '</button>';
}

const sinTildes = t => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function vistaLista() {
  const q = sinTildes(estado.q.trim());
  const cats = estado.catalogo.categorias || [];
  const porNombre = (a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });

  let arr = (estado.catalogo.productos || []).slice();
  if (estado.rubro !== 'todos') arr = arr.filter(p => p.categoria === estado.rubro);
  if (q) {
    const nombreCat = id => (cats.find(c => c.id === id) || {}).nombre || '';
    arr = arr.filter(p => sinTildes(
      (p.nombre || '') + ' ' + (p.marca || '') + ' ' + (p.subtitulo || '') + ' ' + nombreCat(p.categoria)
    ).includes(q));
  }
  arr.sort(porNombre);

  const sinStock = (estado.catalogo.productos || []).filter(p => estadoDe(p) === 'sinstock').length;
  const rubros = [{ id: 'todos', nombre: 'Todos' }].concat(cats.slice().sort((a, b) => (a.orden || 99) - (b.orden || 99)));

  // agrupado por rubro sólo cuando se están viendo todos y no hay búsqueda
  let cuerpo;
  if (!arr.length) {
    cuerpo = '<p class="cargando">No hay productos que coincidan.</p>';
  } else if (estado.rubro === 'todos' && !q) {
    cuerpo = cats.slice().sort((a, b) => (a.orden || 99) - (b.orden || 99)).map(cat => {
      const dentro = arr.filter(p => p.categoria === cat.id);
      if (!dentro.length) return '';
      return '<p class="grupo-lbl">' + esc(cat.nombre) + ' <span>' + dentro.length + '</span></p>' +
             dentro.map(filaProducto).join('');
    }).join('');
    const huerfanos = arr.filter(p => !cats.some(c => c.id === p.categoria));
    if (huerfanos.length) cuerpo += '<p class="grupo-lbl">Sin categoría <span>' + huerfanos.length + '</span></p>' + huerfanos.map(filaProducto).join('');
  } else {
    cuerpo = arr.map(p => filaProducto(p, true)).join('');
  }

  return '' +
    '<div class="barra-fija">' +
      '<div class="panel-buscador">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>' +
        '<input id="q" type="search" placeholder="Buscar producto, rubro o marca" value="' + esc(estado.q) + '" autocomplete="off">' +
      '</div>' +
      '<div class="chips-rubro">' +
        rubros.map(r => '<button class="chip-panel" data-rubro="' + r.id + '" aria-pressed="' + (estado.rubro === r.id) + '">' +
          esc(r.nombre) + '</button>').join('') +
      '</div>' +
      '<div class="lista-cab">' +
        '<p class="panel-resumen">' + arr.length + (arr.length === 1 ? ' producto' : ' productos') +
          (sinStock ? ' · ' + sinStock + ' sin stock' : '') + '</p>' +
        '<span class="lista-acciones">' +
          '<a class="btn-ver" href="./?fresco=1" target="_blank" rel="noopener">Ver tienda</a>' +
          '<button class="btn-nuevo" id="btn-nuevo">+ Nuevo</button>' +
        '</span>' +
      '</div>' +
    '</div>' +
    cuerpo;
}

function vistaEditor(p) {
  const c = cuentaDe(p);
  const e = estadoDe(p);
  const cats = estado.catalogo.categorias || [];
  const etiquetas = estado.catalogo.etiquetas || [];
  const medidas = (estado.catalogo.presentaciones || []).filter(x => x.id !== 'u');

  const campoTexto = (id, etiqueta, valor, ayuda, largo) =>
    '<div class="campo campo--ancho campo--texto">' +
      '<label for="' + id + '">' + etiqueta + '</label>' +
      (largo
        ? '<textarea id="' + id + '" rows="3">' + esc(valor || '') + '</textarea>'
        : '<input id="' + id + '" type="text" value="' + esc(valor || '') + '">') +
      (ayuda ? '<p class="campo__ayuda">' + ayuda + '</p>' : '') +
    '</div>';

  return '' +
  '<div class="editor">' +
    '<div class="editor__cab">' +
      '<img class="editor__fig" src="' + imgDe(p) + '" alt="">' +
      '<div>' +
        '<p class="editor__nom">' + (esc(p.nombre) || 'Producto nuevo') + '</p>' +
        '<p class="editor__sub">' + (p.tipo === 'granel' ? 'A granel · se cobra por kilo' : 'Envasado · se cobra por unidad') + '</p>' +
      '</div>' +
    '</div>' +

    '<div class="bloque">' +
      '<p class="bloque__lbl">Foto</p>' +
      '<div class="foto-caja">' +
        '<img class="foto-caja__img" id="foto-actual" src="' + imgDe(p) + '" alt="">' +
        '<div class="foto-caja__lado">' +
          '<button class="btn btn--fantasma" id="btn-foto">Cambiar foto</button>' +
          '<p class="campo__ayuda" id="foto-dato">Se achica sola antes de subirla.</p>' +
        '</div>' +
      '</div>' +
      '<input type="file" id="archivo-foto" accept="image/*" class="oculto">' +
    '</div>' +

    '<div class="bloque">' +
      '<p class="bloque__lbl">Datos</p>' +
      '<div class="campos campos--uno">' +
        campoTexto('f-nombre', 'Nombre', p.nombre, '') +
        campoTexto('f-subtitulo', 'Bajada', p.subtitulo, 'Va abajo del nombre. Ej: Mariposa, sin cáscara.') +
        '<div class="campo campo--ancho campo--texto">' +
          '<label for="f-categoria">Categoría</label>' +
          '<select id="f-categoria">' +
            cats.map(x => '<option value="' + x.id + '"' + (x.id === p.categoria ? ' selected' : '') + '>' + esc(x.nombre) + '</option>').join('') +
          '</select>' +
        '</div>' +
        campoTexto('f-marca', 'Marca', p.marca, 'Sólo para envasados de otra marca. Vacío si es fraccionado.') +
      '</div>' +
    '</div>' +

    '<div class="bloque">' +
      '<p class="bloque__lbl">Cómo se vende</p>' +
      '<div class="estados estados--dos">' +
        '<button class="estado-btn" data-tipo="granel" aria-pressed="' + (p.tipo === 'granel') + '">A granel</button>' +
        '<button class="estado-btn" data-tipo="envasado" aria-pressed="' + (p.tipo === 'envasado') + '">Envasado</button>' +
      '</div>' +
      (p.tipo === 'granel'
        ? '<p class="campo__ayuda">Elegí hasta tres medidas. La más grande es la que aparece elegida en la tienda.</p>' +
          '<div class="chips-panel">' +
            medidas.map(m =>
              '<button class="chip-panel" data-medida="' + m.id + '" aria-pressed="' + (p.presentaciones.includes(m.id)) + '">' +
              esc(m.nombre) + '</button>').join('') +
          '</div>'
        : '<p class="campo__ayuda">Se vende por unidad, no lleva medidas.</p>') +
    '</div>' +

    '<div class="bloque">' +
      '<p class="bloque__lbl">Precio</p>' +
      '<div class="campos">' +
        '<div class="campo">' +
          '<label for="f-costo">' + (p.tipo === 'granel' ? 'Costo por kilo' : 'Costo por unidad') + '</label>' +
          '<input id="f-costo" type="number" inputmode="numeric" min="0" step="1" value="' + c.base + '">' +
        '</div>' +
        '<div class="campo">' +
          '<label for="f-margen">Ganancia %</label>' +
          '<input id="f-margen" type="number" inputmode="numeric" min="0" max="900" step="1" value="' + c.margen + '">' +
        '</div>' +
        '<div class="campo">' +
          '<label for="f-desc">Descuento %</label>' +
          '<input id="f-desc" type="number" inputmode="numeric" min="0" max="90" step="1" value="' + c.desc + '">' +
        '</div>' +
      '</div>' +
      '<div class="cuenta" id="cuenta"></div>' +
    '</div>' +

    '<div class="bloque">' +
      '<p class="bloque__lbl">Etiquetas</p>' +
      '<div class="chips-panel">' +
        etiquetas.map(t =>
          '<button class="chip-panel" data-tag="' + t.id + '" aria-pressed="' + ((p.tags || []).includes(t.id)) + '">' +
          esc(t.nombre) + '</button>').join('') +
      '</div>' +
      '<div class="interruptores">' +
        '<button class="interruptor" data-flag="destacado" aria-pressed="' + !!p.destacado + '">' +
          '<span>Destacado</span><small>Aparece en el inicio</small></button>' +
        '<button class="interruptor" data-flag="mix" aria-pressed="' + !!p.mix + '">' +
          '<span>Entra en Armá tu mix</span><small>' + (p.tipo === 'granel' ? 'Sólo para productos a granel' : 'No disponible en envasados') + '</small></button>' +
      '</div>' +
    '</div>' +

    '<div class="bloque">' +
      '<p class="bloque__lbl">Detalle del producto</p>' +
      '<div class="campos campos--uno">' +
        campoTexto('f-descripcion', 'Descripción', p.descripcion, '', true) +
        campoTexto('f-preparacion', 'Preparación', p.preparacion, '', true) +
        campoTexto('f-origen', 'Origen', p.origen, '') +
        campoTexto('f-ingredientes', 'Ingredientes', p.ingredientes, '') +
        campoTexto('f-alergenos', 'Alérgenos', p.alergenos, 'Importante si contiene maní, frutos secos, gluten o sulfitos.') +
      '</div>' +
    '</div>' +

    '<div class="bloque">' +
      '<p class="bloque__lbl">Estado</p>' +
      '<div class="estados">' +
        ['publicado', 'sinstock', 'oculto'].map(k =>
          '<button class="estado-btn" data-estado="' + k + '" aria-pressed="' + (k === e) + '">' +
          ETIQUETA_ESTADO[k] + '</button>').join('') +
      '</div>' +
      '<p class="campo__ayuda">Sin stock se sigue viendo en la tienda pero no se puede comprar. Oculto no aparece.</p>' +
    '</div>' +

    '<button class="btn btn--oliva btn--bloque" id="guardar">Guardar cambios</button>' +
    '<button class="btn-borrar" id="borrar">Eliminar este producto</button>' +
  '</div>';
}

function pintarCuenta() {
  const p = estado.editando;
  if (!p) return;
  const c = cuentaDe(p);
  const cont = $('#cuenta');
  if (!cont) return;
  cont.innerHTML =
    '<div class="cuenta__fila"><span>Costo</span><span>' + money(c.base) + '</span></div>' +
    '<div class="cuenta__fila"><span>Ganancia ' + c.margen + '%</span><span>+ ' + money(c.venta - c.base) + '</span></div>' +
    (c.desc ? '<div class="cuenta__fila"><span>Descuento ' + c.desc + '%</span><span>− ' + money(c.venta - c.final) + '</span></div>' : '') +
    '<div class="cuenta__fila cuenta__total"><span>' + (p.tipo === 'granel' ? 'Precio por kilo' : 'Precio final') + '</span><span>' + money(c.final) + '</span></div>' +
    (p.tipo === 'granel'
      ? '<div class="cuenta__medidas">' + c.medidas.map(m => m.nombre + ': <b>' + money(m.precio) + '</b>').join(' · ') + '</div>'
      : '');
}

/* ---------------- combos ---------------- */
function cuentaCombo(k) {
  let suma = 0;
  const filas = (k.items || []).map(i => {
    const p = (estado.catalogo.productos || []).find(x => x.id === i.productoId);
    if (!p) return null;
    const unit = precioDe(p, i.presentacionId);
    const total = unit * (i.cant || 1);
    suma += total;
    return { p: p, medida: i.presentacionId, cant: i.cant || 1, total: total };
  }).filter(Boolean);
  const lista = redondear(suma);
  const final = k.precioEspecial ? redondear(k.precioEspecial) : redondear(lista * (1 - (k.descuento || 0) / 100));
  return { filas: filas, lista: lista, final: final };
}

function precioDe(p, presId) {
  const c = cuentaDe(p);
  const g = gramosDe(presId);
  if (p.tipo !== 'granel') return c.final;
  const base = (p.costoKg || 0) * g / 1000;
  return redondear(redondear(base * (1 + c.margen / 100)) * (1 - c.desc / 100));
}

function vistaCombos() {
  const combos = (estado.catalogo.combos || []).slice().sort((a, b) => (a.orden || 99) - (b.orden || 99));
  return '' +
    '<div class="barra-fija">' +
      '<div class="lista-cab">' +
        '<p class="panel-resumen">' + combos.length + (combos.length === 1 ? ' combo' : ' combos') + '</p>' +
        '<span class="lista-acciones">' +
          '<a class="btn-ver" href="./?fresco=1#/combos" target="_blank" rel="noopener">Ver tienda</a>' +
          '<button class="btn-nuevo" id="btn-nuevo-combo">+ Nuevo</button>' +
        '</span>' +
      '</div>' +
    '</div>' +
    (combos.length ? combos.map(k => {
      const c = cuentaCombo(k);
      return '<button class="fila" data-editarcombo="' + k.id + '">' +
        '<img class="fila__fig" src="' + (k.img || imgDe({})) + '" alt="" loading="lazy">' +
        '<span class="fila__txt">' +
          '<p class="fila__nom">' + esc(k.nombre || 'Combo sin nombre') + '</p>' +
          '<p class="fila__precio">' + money(c.final) + ' · ' + c.filas.length + ' productos' +
            (k.descuento ? ' · −' + k.descuento + '%' : '') + '</p>' +
        '</span>' +
        '<span class="fila__estado estado--' + (k.activo ? 'publicado' : 'oculto') + '">' +
          (k.activo ? 'En venta' : 'Oculto') + '</span>' +
      '</button>';
    }).join('') : '<p class="cargando">Todavía no hay combos. Tocá “+ Nuevo” para armar el primero.</p>');
}

function vistaEditorCombo(k) {
  const c = cuentaCombo(k);
  return '' +
  '<div class="editor">' +
    '<div class="bloque">' +
      '<p class="bloque__lbl">Datos</p>' +
      '<div class="campos campos--uno">' +
        '<div class="campo campo--ancho campo--texto">' +
          '<label for="k-nombre">Nombre del combo</label>' +
          '<input id="k-nombre" type="text" value="' + esc(k.nombre || '') + '" placeholder="Ej: Desayuno completo">' +
        '</div>' +
        '<div class="campo campo--ancho campo--texto">' +
          '<label for="k-desc">Qué trae, en una línea</label>' +
          '<input id="k-desc" type="text" value="' + esc(k.descripcion || '') + '" placeholder="Avena, miel y frutos secos.">' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="bloque">' +
      '<p class="bloque__lbl">Qué lleva</p>' +
      (c.filas.length ? '<div class="items">' + c.filas.map((f, idx) =>
        '<div class="item-combo">' +
          '<img class="item-combo__fig" src="' + imgDe(f.p) + '" alt="" loading="lazy">' +
          '<div class="item-combo__txt">' +
            '<p class="item-combo__nom">' + esc(f.p.nombre) + '</p>' +
            '<div class="item-combo__ctrl">' +
              '<select data-medida-item="' + idx + '">' +
                f.p.presentaciones.map(id => '<option value="' + id + '"' + (id === f.medida ? ' selected' : '') + '>' +
                  esc(nombrePres(id)) + '</option>').join('') +
              '</select>' +
              '<span class="stepper stepper--mini">' +
                '<button data-cantitem="' + idx + '" data-delta="-1" aria-label="Menos">−</button>' +
                '<span>' + f.cant + '</span>' +
                '<button data-cantitem="' + idx + '" data-delta="1" aria-label="Más">+</button>' +
              '</span>' +
              '<strong>' + money(f.total) + '</strong>' +
            '</div>' +
          '</div>' +
          '<button class="item-combo__quitar" data-quitaritem="' + idx + '" aria-label="Sacar del combo">×</button>' +
        '</div>').join('') + '</div>'
        : '<p class="campo__ayuda">Todavía no tiene productos.</p>') +
      '<button class="btn btn--fantasma btn--bloque" id="agregar-item" style="margin-top:12px">+ Agregar producto</button>' +
    '</div>' +

    '<div class="bloque">' +
      '<p class="bloque__lbl">Precio</p>' +
      '<div class="campos">' +
        '<div class="campo">' +
          '<label for="k-descuento">Descuento %</label>' +
          '<input id="k-descuento" type="number" inputmode="numeric" min="0" max="90" step="1" value="' + (k.descuento || 0) + '">' +
        '</div>' +
      '</div>' +
      '<div class="cuenta" id="cuenta-combo">' +
        '<div class="cuenta__fila"><span>Por separado</span><span>' + money(c.lista) + '</span></div>' +
        (k.descuento ? '<div class="cuenta__fila"><span>Descuento ' + k.descuento + '%</span><span>− ' + money(c.lista - c.final) + '</span></div>' : '') +
        '<div class="cuenta__fila cuenta__total"><span>Precio del combo</span><span>' + money(c.final) + '</span></div>' +
      '</div>' +
    '</div>' +

    '<div class="bloque">' +
      '<p class="bloque__lbl">Estado</p>' +
      '<div class="estados estados--dos">' +
        '<button class="estado-btn" data-comboestado="1" aria-pressed="' + !!k.activo + '">En venta</button>' +
        '<button class="estado-btn" data-comboestado="0" aria-pressed="' + !k.activo + '">Oculto</button>' +
      '</div>' +
      '<div class="interruptores">' +
        '<button class="interruptor" data-comboflag="destacado" aria-pressed="' + !!k.destacado + '">' +
          '<span>Destacado</span><small>Aparece primero en la lista</small></button>' +
      '</div>' +
    '</div>' +

    '<button class="btn btn--oliva btn--bloque" id="guardar-combo">Guardar cambios</button>' +
    '<button class="btn-borrar" id="borrar-combo">Eliminar este combo</button>' +
  '</div>';
}

/* elegir qué producto sumar al combo */
function vistaElegirProducto() {
  const q = sinTildes(estado.q.trim());
  let arr = (estado.catalogo.productos || []).filter(p => p.estado === 'publicado');
  if (q) arr = arr.filter(p => sinTildes(p.nombre || '').includes(q));
  arr.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  return '' +
    '<div class="barra-fija">' +
      '<div class="panel-buscador">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>' +
        '<input id="q" type="search" placeholder="Buscar producto" value="' + esc(estado.q) + '" autocomplete="off">' +
      '</div>' +
      '<p class="panel-resumen">Tocá el que quieras sumar al combo</p>' +
    '</div>' +
    arr.slice(0, 60).map(p =>
      '<button class="fila" data-sumaritem="' + p.id + '">' +
        '<img class="fila__fig" src="' + imgDe(p) + '" alt="" loading="lazy">' +
        '<span class="fila__txt"><p class="fila__nom">' + esc(p.nombre) + '</p>' +
        '<p class="fila__precio">' + money(cuentaDe(p).final) + (p.tipo === 'granel' ? ' / kg' : ' / unidad') + '</p></span>' +
      '</button>').join('');
}

/* ---------------- navegación ---------------- */
function mostrarLista() {
  estado.alta = null;
  estado.eligiendo = false;
  const p = estado.editando;
  if (p && !p.slug) estado.catalogo.productos = estado.catalogo.productos.filter(x => x.id !== p.id);
  estado.editando = null;
  estado.editandoCombo = null;
  $('#panel-titulo').classList.add('oculto');
  $('#panel-tabs').classList.remove('oculto');
  $$('#panel-tabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.seccion === estado.seccion));
  $('#btn-volver').classList.add('oculto');
  $('#btn-guardar-top').classList.add('oculto');
  $('#panel-main').innerHTML = estado.seccion === 'combos' ? vistaCombos() : vistaLista();
  window.scrollTo(0, 0);
}

function tituloPanel(txt) {
  $('#panel-titulo').textContent = txt;
  $('#panel-titulo').classList.remove('oculto');
  $('#panel-tabs').classList.add('oculto');
}

function mostrarEditorCombo(id) {
  const k = (estado.catalogo.combos || []).find(x => x.id === id);
  if (!k) return;
  estado.editandoCombo = k;
  estado.eligiendo = false;
  tituloPanel(k.nombre || 'Combo nuevo');
  $('#btn-volver').classList.remove('oculto');
  $('#btn-guardar-top').classList.add('oculto');
  $('#panel-main').innerHTML = vistaEditorCombo(k);
  window.scrollTo(0, 0);
}

function mostrarElegirProducto() {
  estado.eligiendo = true;
  estado.q = '';
  tituloPanel('Sumar producto');
  $('#panel-main').innerHTML = vistaElegirProducto();
  window.scrollTo(0, 0);
}

function comboNuevo() {
  const combos = estado.catalogo.combos || (estado.catalogo.combos = []);
  const num = combos.reduce((m, k) => Math.max(m, parseInt(String(k.id).replace(/\D/g, ''), 10) || 0), 0) + 1;
  const k = {
    id: 'c' + String(num).padStart(2, '0'), slug: '', nombre: '', descripcion: '',
    items: [], descuento: 10, precioEspecial: null, activo: false, destacado: false,
    orden: combos.length + 1, img: '', color: '#c07a45', color2: '#e0a674'
  };
  combos.push(k);
  return k;
}

function mostrarEditor(id) {
  const p = (estado.catalogo.productos || []).find(x => x.id === id);
  if (!p) return;
  estado.editando = p;
  tituloPanel(p.nombre || 'Producto nuevo');
  $('#btn-volver').classList.remove('oculto');
  $('#btn-guardar-top').classList.remove('oculto');
  $('#panel-main').innerHTML = vistaEditor(p);
  pintarCuenta();
}

async function guardarProducto() {
  const p = estado.editando;
  if (!p) return;
  if (!p.nombre || p.nombre.trim().length < 2) { aviso('Ponele un nombre al producto.', 'error'); const n = $('#f-nombre'); if (n) n.focus(); return; }
  if (!(p.tipo === 'granel' ? p.costoKg : p.costoUnidad)) { aviso('Falta el costo.', 'error'); const c = $('#f-costo'); if (c) c.focus(); return; }
  p.nombre = nombreLindo(p.nombre);
  p.slug = slugLibre(aSlug(p.nombre), p.id);
  acomodarMedidas(p);

  const botones = [$('#guardar'), $('#btn-guardar-top')].filter(Boolean);
  botones.forEach(b => { b.disabled = true; });
  aviso('Guardando…', 'trabajando');
  try {
    await guardarCatalogo('Panel: ' + p.nombre);
    const sello = estado.catalogo.sello;
    aviso('Guardado. Publicando en la tienda…', 'trabajando');
    mostrarLista();
    esperarPublicado(sello).then(ok => {
      aviso(ok ? 'Listo, ya se ve en la tienda.' : 'Guardado. Está tardando en publicarse, mirá en un minuto.',
            ok ? 'ok' : 'error');
    });
  } catch (e) {
    aviso(e.codigo === 409
      ? 'Alguien más guardó recién. Recargá la página y probá otra vez.'
      : 'No se pudo guardar: ' + e.message, 'error');
  } finally {
    botones.forEach(b => { b.disabled = false; });
  }
}

/* ---------------- eventos ---------------- */
document.addEventListener('click', async ev => {
  const t = ev.target;

  const tab = t.closest('[data-seccion]');
  if (tab) { estado.seccion = tab.dataset.seccion; estado.q = ''; mostrarLista(); return; }

  const filaCombo = t.closest('[data-editarcombo]');
  if (filaCombo) { mostrarEditorCombo(filaCombo.dataset.editarcombo); return; }

  if (t.closest('#btn-nuevo-combo')) { const k = comboNuevo(); mostrarEditorCombo(k.id); return; }

  if (t.closest('#agregar-item')) { mostrarElegirProducto(); return; }

  const sumar = t.closest('[data-sumaritem]');
  if (sumar && estado.editandoCombo) {
    const p = estado.catalogo.productos.find(x => x.id === sumar.dataset.sumaritem);
    if (p) {
      estado.editandoCombo.items.push({ productoId: p.id, presentacionId: p.presentacionDefecto, cant: 1 });
      aviso(p.nombre + ' sumado al combo', 'ok');
    }
    mostrarEditorCombo(estado.editandoCombo.id);
    return;
  }

  const quitarItem = t.closest('[data-quitaritem]');
  if (quitarItem && estado.editandoCombo) {
    estado.editandoCombo.items.splice(Number(quitarItem.dataset.quitaritem), 1);
    mostrarEditorCombo(estado.editandoCombo.id);
    return;
  }

  const cantItem = t.closest('[data-cantitem]');
  if (cantItem && estado.editandoCombo) {
    const it = estado.editandoCombo.items[Number(cantItem.dataset.cantitem)];
    it.cant = Math.max(1, (it.cant || 1) + Number(cantItem.dataset.delta));
    mostrarEditorCombo(estado.editandoCombo.id);
    return;
  }

  const comboEstado = t.closest('[data-comboestado]');
  if (comboEstado && estado.editandoCombo) {
    estado.editandoCombo.activo = comboEstado.dataset.comboestado === '1';
    $$('[data-comboestado]').forEach(b => b.setAttribute('aria-pressed', b === comboEstado));
    return;
  }

  const comboFlag = t.closest('[data-comboflag]');
  if (comboFlag && estado.editandoCombo) {
    const k = estado.editandoCombo, campo = comboFlag.dataset.comboflag;
    k[campo] = !k[campo];
    comboFlag.setAttribute('aria-pressed', !!k[campo]);
    return;
  }

  if (t.closest('#guardar-combo')) {
    const k = estado.editandoCombo;
    if (!k) return;
    if (!k.nombre || k.nombre.trim().length < 2) { aviso('Ponele un nombre al combo.', 'error'); const n = $('#k-nombre'); if (n) n.focus(); return; }
    if (!k.items.length) { aviso('El combo tiene que llevar al menos un producto.', 'error'); return; }
    k.nombre = nombreLindo(k.nombre);
    k.slug = slugLibre(aSlug(k.nombre), k.id);
    const boton = $('#guardar-combo');
    boton.disabled = true;
    aviso('Guardando…', 'trabajando');
    guardarCatalogo('Panel: combo ' + k.nombre)
      .then(() => {
        const sello = estado.catalogo.sello;
        aviso('Guardado. Publicando en la tienda…', 'trabajando');
        mostrarLista();
        esperarPublicado(sello).then(ok => aviso(ok ? 'Listo, ya se ve en la tienda.' : 'Guardado. Está tardando en publicarse.', ok ? 'ok' : 'error'));
      })
      .catch(e => { aviso('No se pudo guardar: ' + e.message, 'error'); boton.disabled = false; });
    return;
  }

  if (t.closest('#borrar-combo')) {
    const k = estado.editandoCombo;
    if (!k) return;
    if (!confirm('¿Eliminar el combo "' + (k.nombre || 'sin nombre') + '"?')) return;
    estado.catalogo.combos = estado.catalogo.combos.filter(x => x.id !== k.id);
    aviso('Eliminando…', 'trabajando');
    guardarCatalogo('Panel: elimina el combo ' + (k.nombre || k.id))
      .then(() => { aviso('Combo eliminado.', 'ok'); estado.editandoCombo = null; mostrarLista(); })
      .catch(e => aviso('No se pudo eliminar: ' + e.message, 'error'));
    return;
  }

  const chipRubro = t.closest('[data-rubro]');
  if (chipRubro) {
    estado.rubro = chipRubro.dataset.rubro;
    $('#panel-main').innerHTML = vistaLista();
    return;
  }

  const fila = t.closest('[data-editar]');
  if (fila) { mostrarEditor(fila.dataset.editar); return; }

  if (t.closest('#btn-volver')) {
    if (estado.eligiendo && estado.editandoCombo) { mostrarEditorCombo(estado.editandoCombo.id); return; }
    mostrarLista();
    return;
  }

  const btnEstado = t.closest('[data-estado]');
  if (btnEstado && estado.editando) {
    ponerEstado(estado.editando, btnEstado.dataset.estado);
    $$('[data-estado]').forEach(b => b.setAttribute('aria-pressed', b === btnEstado));
    return;
  }

  if (t.closest('#btn-foto')) { $('#archivo-foto').click(); return; }

  if (t.closest('#btn-nuevo')) { mostrarAlta(); return; }

  const altaTipo = t.closest('[data-altatipo]');
  if (altaTipo && estado.alta) {
    estado.alta.tipo = altaTipo.dataset.altatipo;
    $('#panel-main').innerHTML = vistaAlta();
    pintarCuentaAlta();
    return;
  }

  if (t.closest('#crear-producto')) {
    const a = estado.alta;
    if (!a.nombre || a.nombre.trim().length < 2) { aviso('Ponele un nombre.', 'error'); const n = $('#a-nombre'); if (n) n.focus(); return; }
    if (!a.costo) { aviso('Falta el costo.', 'error'); const c = $('#a-costo'); if (c) c.focus(); return; }
    const p = productoNuevo();
    p.nombre = nombreLindo(a.nombre);
    p.slug = slugLibre(aSlug(p.nombre), p.id);
    p.categoria = a.categoria;
    p.tipo = a.tipo;
    p.margen = a.margen;
    if (a.tipo === 'granel') { p.costoKg = a.costo; delete p.costoUnidad; }
    else { p.costoUnidad = a.costo; delete p.costoKg; }
    p.estado = 'borrador'; p.disponible = false;    // nace oculto hasta que lo terminen
    acomodarMedidas(p);
    const boton = $('#crear-producto');
    boton.disabled = true;
    aviso('Creando…', 'trabajando');
    guardarCatalogo('Panel: crea ' + p.nombre)
      .then(() => { aviso('Creado. Ahora agregale la foto y el resto.', 'ok'); estado.alta = null; mostrarEditor(p.id); })
      .catch(e => {
        estado.catalogo.productos = estado.catalogo.productos.filter(x => x.id !== p.id);
        aviso('No se pudo crear: ' + e.message, 'error');
        boton.disabled = false;
      });
    return;
  }

  const btnTipo = t.closest('[data-tipo]');
  if (btnTipo && estado.editando) {
    const p = estado.editando;
    p.tipo = btnTipo.dataset.tipo;
    if (p.tipo === 'envasado') { p.costoUnidad = p.costoUnidad || p.costoKg || 0; p.mix = false; }
    else { p.costoKg = p.costoKg || p.costoUnidad || 0;
           if (!p.presentaciones.filter(x => x !== 'u').length) p.presentaciones = ['250g', '500g', '1kg']; }
    acomodarMedidas(p);
    mostrarEditor(p.id);
    return;
  }

  const btnMedida = t.closest('[data-medida]');
  if (btnMedida && estado.editando) {
    const p = estado.editando, id = btnMedida.dataset.medida;
    if (p.presentaciones.includes(id)) {
      if (p.presentaciones.length === 1) { aviso('Tiene que quedar al menos una medida.', 'error'); return; }
      p.presentaciones = p.presentaciones.filter(x => x !== id);
    } else {
      if (p.presentaciones.length >= 3) { aviso('Hasta tres medidas por producto.', 'error'); return; }
      p.presentaciones.push(id);
    }
    acomodarMedidas(p);
    $$('[data-medida]').forEach(b => b.setAttribute('aria-pressed', p.presentaciones.includes(b.dataset.medida)));
    pintarCuenta();
    return;
  }

  const btnTag = t.closest('[data-tag]');
  if (btnTag && estado.editando) {
    const p = estado.editando, id = btnTag.dataset.tag;
    p.tags = p.tags || [];
    p.tags = p.tags.includes(id) ? p.tags.filter(x => x !== id) : p.tags.concat(id);
    btnTag.setAttribute('aria-pressed', p.tags.includes(id));
    return;
  }

  const btnFlag = t.closest('[data-flag]');
  if (btnFlag && estado.editando) {
    const p = estado.editando, k = btnFlag.dataset.flag;
    if (k === 'mix' && p.tipo !== 'granel') { aviso('El mix es sólo para productos a granel.', 'error'); return; }
    p[k] = !p[k];
    btnFlag.setAttribute('aria-pressed', !!p[k]);
    return;
  }

  if (t.closest('#borrar')) {
    const p = estado.editando;
    if (!p) return;
    const combos = usadoEnCombos(p.id);
    if (combos.length) {
      aviso('No se puede: está dentro de ' + combos.join(' y ') + '.', 'error');
      return;
    }
    if (!confirm('¿Eliminar "' + (p.nombre || 'este producto') + '"? No se puede deshacer.')) return;
    estado.catalogo.productos = estado.catalogo.productos.filter(x => x.id !== p.id);
    const boton = $('#borrar');
    boton.disabled = true;
    aviso('Eliminando…', 'trabajando');
    guardarCatalogo('Panel: elimina ' + (p.nombre || p.id))
      .then(() => { aviso('Producto eliminado.', 'ok'); mostrarLista(); })
      .catch(e => { aviso('No se pudo eliminar: ' + e.message, 'error'); boton.disabled = false; });
    return;
  }

  if (t.closest('#guardar') || t.closest('#btn-guardar-top')) { guardarProducto(); return; }
});

document.addEventListener('change', ev => {
  if (ev.target.id === 'f-categoria' && estado.editando) estado.editando.categoria = ev.target.value;
  if (ev.target.id === 'a-categoria' && estado.alta) estado.alta.categoria = ev.target.value;
  const medidaItem = ev.target.closest && ev.target.closest('[data-medida-item]');
  if (medidaItem && estado.editandoCombo) {
    estado.editandoCombo.items[Number(medidaItem.dataset.medidaItem)].presentacionId = ev.target.value;
    mostrarEditorCombo(estado.editandoCombo.id);
  }
});

document.addEventListener('change', async ev => {
  if (ev.target.id !== 'archivo-foto') return;
  const file = ev.target.files && ev.target.files[0];
  const p = estado.editando;
  if (!file || !p) return;
  if (!/^image\//.test(file.type)) { aviso('Ese archivo no es una imagen.', 'error'); return; }

  if (!p.nombre || p.nombre.trim().length < 2) {
    aviso('Primero ponele el nombre al producto, después la foto.', 'error');
    const n = $('#f-nombre'); if (n) n.focus();
    ev.target.value = '';
    return;
  }
  if (!p.slug) p.slug = slugLibre(aSlug(p.nombre), p.id);

  const boton = $('#btn-foto');
  boton.disabled = true;
  aviso('Achicando la foto…', 'trabajando');
  try {
    const r = await prepararFoto(file);
    $('#foto-actual').src = r.vistaPrevia;
    $('#foto-dato').textContent = 'De ' + pesoLindo(r.antes) + ' a ' + pesoLindo(r.despues) + '. Subiendo…';
    const ruta = await subirFoto(p.slug, r.blob, r.ext, p.img);
    p.img = ruta;
    $('#foto-dato').textContent = 'Lista: de ' + pesoLindo(r.antes) + ' a ' + pesoLindo(r.despues) + '. Tocá Guardar para que se vea en la tienda.';
    if (!r.corregida) {
      aviso('Foto subida, pero el producto es casi del mismo color que su fondo: la dejamos como está para no despintarlo. Si podés, sacala sobre un fondo más contrastado. Ahora tocá Guardar.', 'ok');
    } else {
      aviso(r.despues > 300 * 1024
        ? 'Foto subida, pero quedó pesada (' + pesoLindo(r.despues) + '). Ahora tocá Guardar.'
        : 'Foto subida. Ahora tocá Guardar cambios.', 'ok');
    }
  } catch (e) {
    $('#foto-dato').textContent = 'No pudimos subir la foto.';
    aviso('No se pudo subir la foto: ' + e.message, 'error');
  } finally {
    boton.disabled = false;
    ev.target.value = '';
  }
});

document.addEventListener('input', ev => {
  const id = ev.target.id;
  if (estado.alta && id.startsWith('a-')) {
    if (id === 'a-nombre') estado.alta.nombre = ev.target.value;
    if (id === 'a-costo')  { estado.alta.costo  = Math.max(0, Number(ev.target.value) || 0); pintarCuentaAlta(); }
    if (id === 'a-margen') { estado.alta.margen = Math.min(900, Math.max(0, Number(ev.target.value) || 0)); pintarCuentaAlta(); }
    return;
  }
  if (id === 'q') {
    estado.q = ev.target.value;
    const cont = $('#panel-main');
    const foco = document.activeElement === ev.target;
    cont.innerHTML = estado.eligiendo ? vistaElegirProducto()
                   : (estado.seccion === 'combos' ? vistaCombos() : vistaLista());
    if (foco) { const n = $('#q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
    return;
  }
  const k = estado.editandoCombo;
  if (k) {
    if (id === 'k-nombre') { k.nombre = ev.target.value; $('#panel-titulo').textContent = ev.target.value || 'Combo nuevo'; return; }
    if (id === 'k-desc') { k.descripcion = ev.target.value; return; }
    if (id === 'k-descuento') {
      k.descuento = Math.min(90, Math.max(0, Number(ev.target.value) || 0));
      const c = cuentaCombo(k), cont = $('#cuenta-combo');
      if (cont) cont.innerHTML =
        '<div class="cuenta__fila"><span>Por separado</span><span>' + money(c.lista) + '</span></div>' +
        (k.descuento ? '<div class="cuenta__fila"><span>Descuento ' + k.descuento + '%</span><span>− ' + money(c.lista - c.final) + '</span></div>' : '') +
        '<div class="cuenta__fila cuenta__total"><span>Precio del combo</span><span>' + money(c.final) + '</span></div>';
      return;
    }
  }
  const p = estado.editando;
  if (!p) return;
  if (id === 'f-costo') {
    const v = Math.max(0, Number(ev.target.value) || 0);
    if (p.tipo === 'granel') p.costoKg = v; else p.costoUnidad = v;
    pintarCuenta();
  }
  if (id === 'f-margen') { p.margen = Math.min(900, Math.max(0, Number(ev.target.value) || 0)); pintarCuenta(); }
  if (id === 'f-desc')   { p.descuento = Math.min(90, Math.max(0, Number(ev.target.value) || 0)); pintarCuenta(); }

  const textos = {
    'f-nombre': 'nombre', 'f-subtitulo': 'subtitulo', 'f-marca': 'marca',
    'f-descripcion': 'descripcion', 'f-preparacion': 'preparacion',
    'f-origen': 'origen', 'f-ingredientes': 'ingredientes', 'f-alergenos': 'alergenos'
  };
  if (textos[id]) {
    p[textos[id]] = ev.target.value;
    if (id === 'f-nombre') $('.editor__nom').textContent = ev.target.value || 'Producto nuevo';
  }
});

/* ---------------- arranque ---------------- */
async function entrar(token) {
  estado.token = token;
  $('#panel-main').innerHTML = '<p class="cargando">Cargando el catálogo…</p>';
  $('#acceso').classList.add('oculto');
  $('#panel').classList.remove('oculto');
  try {
    await traerCatalogo();
    try { localStorage.setItem(LS_TOKEN, token); } catch (e) {}
    mostrarLista();
  } catch (e) {
    $('#acceso').classList.remove('oculto');
    $('#panel').classList.add('oculto');
    const err = $('#err-acceso');
    err.textContent = e.codigo === 401 || e.codigo === 404
      ? 'La clave no es correcta o no tiene permiso sobre la tienda.'
      : 'No pudimos conectar: ' + e.message;
    err.classList.remove('oculto');
    try { localStorage.removeItem(LS_TOKEN); } catch (e2) {}
  }
}

$('#form-acceso').addEventListener('submit', ev => {
  ev.preventDefault();
  const v = $('#clave').value.trim();
  if (!v) return;
  $('#err-acceso').classList.add('oculto');
  entrar(v);
});

(() => {
  let guardado = '';
  try { guardado = localStorage.getItem(LS_TOKEN) || ''; } catch (e) {}
  if (guardado) entrar(guardado);
})();
