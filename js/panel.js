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

const estado = { token: '', catalogo: null, sha: '', q: '', editando: null };

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
const textoAb64 = txt => btoa(String.fromCharCode(...new TextEncoder().encode(txt)));

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
function emparejarFondo(ctx, lado) {
  const d = ctx.getImageData(0, 0, lado, lado);
  const px = d.data;
  const borde = 10, salto = 3, muestras = [[], [], []];
  const tomar = (x, y) => {
    const i = (y * lado + x) * 4;
    muestras[0].push(px[i]); muestras[1].push(px[i + 1]); muestras[2].push(px[i + 2]);
  };
  for (let y = 0; y < borde; y += salto)
    for (let x = 0; x < lado; x += salto) { tomar(x, y); tomar(x, lado - 1 - y); }
  for (let x = 0; x < borde; x += salto)
    for (let y = borde; y < lado - borde; y += salto) { tomar(x, y); tomar(lado - 1 - x, y); }
  const mediana = a => { a.sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
  const fondo = [mediana(muestras[0]), mediana(muestras[1]), mediana(muestras[2])];
  const delta = [FOTO.fondo[0] - fondo[0], FOTO.fondo[1] - fondo[1], FOTO.fondo[2] - fondo[2]];

  // si la foto ya vino con el fondo correcto, no hay nada que corregir
  if (Math.max(Math.abs(delta[0]), Math.abs(delta[1]), Math.abs(delta[2])) <= 2) return;
  const CERCA = 22, LEJOS = 80, CERCA2 = CERCA * CERCA, LEJOS2 = LEJOS * LEJOS;

  for (let i = 0; i < px.length; i += 4) {
    const dr = px[i] - fondo[0], dg = px[i + 1] - fondo[1], db = px[i + 2] - fondo[2];
    const d2 = dr * dr + dg * dg + db * db;
    if (d2 >= LEJOS2) continue;
    const peso = d2 <= CERCA2 ? 1 : (LEJOS - Math.sqrt(d2)) / (LEJOS - CERCA);
    px[i]     = Math.max(0, Math.min(255, px[i]     + delta[0] * peso));
    px[i + 1] = Math.max(0, Math.min(255, px[i + 1] + delta[1] * peso));
    px[i + 2] = Math.max(0, Math.min(255, px[i + 2] + delta[2] * peso));
  }
  ctx.putImageData(d, 0, 0);
}

async function prepararFoto(file) {
  const img = await abrirImagen(file);
  const lado = FOTO.lado;
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = lado;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });

  // fondo de base, para que una foto que no sea cuadrada no quede con bordes vacíos
  ctx.fillStyle = 'rgb(' + FOTO.fondo.join(',') + ')';
  ctx.fillRect(0, 0, lado, lado);

  // la foto entera, sin recortar, centrada
  const escala = Math.min(lado / img.width, lado / img.height);
  const w = img.width * escala, h = img.height * escala;
  ctx.drawImage(img, (lado - w) / 2, (lado - h) / 2, w, h);

  emparejarFondo(ctx, lado);

  const blob = await new Promise(ok => lienzo.toBlob(ok, 'image/webp', FOTO.calidad));
  return { blob, vistaPrevia: URL.createObjectURL(blob), antes: file.size, despues: blob.size };
}

async function subirFoto(slug, blob) {
  const ruta = 'assets/productos/' + slug + '.webp';
  let sha = null;
  try { sha = (await api('/contents/' + ruta + '?ref=main')).sha; } catch (e) {}   // si no existe, se crea
  const base64 = await new Promise(ok => {
    const fr = new FileReader();
    fr.onload = () => ok(fr.result.split(',')[1]);
    fr.readAsDataURL(blob);
  });
  await api('/contents/' + ruta, {
    method: 'PUT',
    body: JSON.stringify({
      message: 'Panel: foto de ' + slug,
      content: base64, branch: 'main', ...(sha ? { sha } : {})
    })
  });
  return ruta + '?v=' + Date.now().toString(36);
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
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="%23fae6d0"/></svg>');

/* ---------------- vistas ---------------- */
function vistaLista() {
  const q = estado.q.trim().toLowerCase();
  const arr = (estado.catalogo.productos || [])
    .filter(p => !q || p.nombre.toLowerCase().includes(q))
    .sort((a, b) => (a.orden || 99) - (b.orden || 99));

  const sinStock = (estado.catalogo.productos || []).filter(p => estadoDe(p) === 'sinstock').length;

  return '' +
    '<div class="panel-buscador">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>' +
      '<input id="q" type="search" placeholder="Buscar producto" value="' + esc(estado.q) + '" autocomplete="off">' +
    '</div>' +
    '<p class="panel-resumen">' + arr.length + (arr.length === 1 ? ' producto' : ' productos') +
      (sinStock ? ' · ' + sinStock + ' sin stock' : '') + '</p>' +
    (arr.length ? arr.map(p => {
      const c = cuentaDe(p);
      const e = estadoDe(p);
      return '<button class="fila" data-editar="' + p.id + '">' +
        '<img class="fila__fig" src="' + imgDe(p) + '" alt="" loading="lazy">' +
        '<span class="fila__txt">' +
          '<p class="fila__nom">' + esc(p.nombre) + '</p>' +
          '<p class="fila__precio">' + money(c.final) + (p.tipo === 'granel' ? ' / kg' : ' / unidad') + '</p>' +
        '</span>' +
        '<span class="fila__estado estado--' + e + '">' + ETIQUETA_ESTADO[e] + '</span>' +
      '</button>';
    }).join('') : '<p class="cargando">No encontramos ese producto.</p>');
}

function vistaEditor(p) {
  const c = cuentaDe(p);
  const e = estadoDe(p);
  return '' +
  '<div class="editor">' +
    '<div class="editor__cab">' +
      '<img class="editor__fig" src="' + imgDe(p) + '" alt="">' +
      '<div>' +
        '<p class="editor__nom">' + esc(p.nombre) + '</p>' +
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
      '<p class="campo__ayuda">Poné el costo y cuánto querés ganar. El precio se calcula solo.</p>' +
      '<div class="cuenta" id="cuenta"></div>' +
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

/* ---------------- navegación ---------------- */
function mostrarLista() {
  estado.editando = null;
  $('#panel-titulo').textContent = 'Productos';
  $('#btn-volver').classList.add('oculto');
  $('#panel-main').innerHTML = vistaLista();
}

function mostrarEditor(id) {
  const p = (estado.catalogo.productos || []).find(x => x.id === id);
  if (!p) return;
  estado.editando = p;
  $('#panel-titulo').textContent = p.nombre;
  $('#btn-volver').classList.remove('oculto');
  $('#panel-main').innerHTML = vistaEditor(p);
  pintarCuenta();
}

/* ---------------- eventos ---------------- */
document.addEventListener('click', async ev => {
  const t = ev.target;

  const fila = t.closest('[data-editar]');
  if (fila) { mostrarEditor(fila.dataset.editar); return; }

  if (t.closest('#btn-volver')) { mostrarLista(); return; }

  if (t.closest('#btn-salir')) {
    if (!confirm('¿Salir del panel? La próxima vez vas a tener que poner la clave otra vez.')) return;
    try { localStorage.removeItem(LS_TOKEN); } catch (e) {}
    location.reload();
    return;
  }

  const btnEstado = t.closest('[data-estado]');
  if (btnEstado && estado.editando) {
    ponerEstado(estado.editando, btnEstado.dataset.estado);
    $$('[data-estado]').forEach(b => b.setAttribute('aria-pressed', b === btnEstado));
    return;
  }

  if (t.closest('#btn-foto')) { $('#archivo-foto').click(); return; }

  if (t.closest('#guardar')) {
    const p = estado.editando;
    if (!p) return;
    const boton = $('#guardar');
    boton.disabled = true;
    aviso('Guardando…', 'trabajando');
    try {
      await guardarCatalogo('Panel: ' + p.nombre);
      aviso('Guardado. En un minuto se ve en la tienda.', 'ok');
      mostrarLista();
    } catch (e) {
      if (e.codigo === 409) {
        aviso('Alguien más guardó recién. Recargá la página y probá otra vez.', 'error');
      } else {
        aviso('No se pudo guardar: ' + e.message, 'error');
      }
    } finally {
      boton.disabled = false;
    }
    return;
  }
});

document.addEventListener('change', async ev => {
  if (ev.target.id !== 'archivo-foto') return;
  const file = ev.target.files && ev.target.files[0];
  const p = estado.editando;
  if (!file || !p) return;
  if (!/^image\//.test(file.type)) { aviso('Ese archivo no es una imagen.', 'error'); return; }

  const boton = $('#btn-foto');
  boton.disabled = true;
  aviso('Achicando la foto…', 'trabajando');
  try {
    const r = await prepararFoto(file);
    $('#foto-actual').src = r.vistaPrevia;
    $('#foto-dato').textContent = 'De ' + pesoLindo(r.antes) + ' a ' + pesoLindo(r.despues) + '. Subiendo…';
    const ruta = await subirFoto(p.slug, r.blob);
    p.img = ruta;
    $('#foto-dato').textContent = 'Lista: de ' + pesoLindo(r.antes) + ' a ' + pesoLindo(r.despues) + '. Tocá Guardar para que se vea en la tienda.';
    aviso('Foto subida. Ahora tocá Guardar cambios.', 'ok');
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
  if (id === 'q') {
    estado.q = ev.target.value;
    const cont = $('#panel-main');
    const foco = document.activeElement === ev.target;
    cont.innerHTML = vistaLista();
    if (foco) { const n = $('#q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
    return;
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
