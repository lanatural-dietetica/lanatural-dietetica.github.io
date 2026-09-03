/* ============================================================
   La Natural — carga del catálogo
   ------------------------------------------------------------
   Los datos YA NO viven acá: viven en data/catalogo.json, que es
   lo que edita el panel de administración. Este archivo sólo los
   trae y los deja disponibles para app.js.

   Si la descarga falla, se usa la última copia buena guardada en
   el navegador, así la tienda no queda en blanco.
   ============================================================ */

let DEMO = false;
let CONFIG = {};
let PRESENTACIONES = [];
let CATEGORIAS = [];
let ETIQUETAS = [];
let PRODUCTOS = [];
let COMBOS = [];
let MIX = {};
let PASOS = [];

const LS_CATALOGO = 'lanatural_catalogo_v1';

function aplicarCatalogo(d) {
  DEMO           = !!d.demo;
  CONFIG         = d.config || {};
  PRESENTACIONES = d.presentaciones || [];
  CATEGORIAS     = d.categorias || [];
  ETIQUETAS      = d.etiquetas || [];
  PRODUCTOS      = d.productos || [];
  COMBOS         = d.combos || [];
  MIX            = d.mix || {};
  PASOS          = d.pasos || [];
}

function catalogoValido(d) {
  return d && Array.isArray(d.productos) && d.productos.length > 0 && d.config;
}

const RAW = 'https://raw.githubusercontent.com/lanatural-dietetica/lanatural-dietetica.github.io/main/data/catalogo.json';

async function cargarCatalogo() {
  // ?fresco=1 lo usa el panel para ver el cambio recién guardado sin esperar la publicación
  const fresco = new URLSearchParams(location.search).has('fresco');
  try {
    const url = (fresco ? RAW : 'data/catalogo.json') + '?t=' + Date.now();
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    if (!catalogoValido(d)) throw new Error('catálogo incompleto');
    aplicarCatalogo(d);
    try { localStorage.setItem(LS_CATALOGO, JSON.stringify(d)); } catch (e) {}
    return true;
  } catch (e) {
    try {
      const copia = JSON.parse(localStorage.getItem(LS_CATALOGO));
      if (catalogoValido(copia)) { aplicarCatalogo(copia); return true; }
    } catch (e2) {}
    return false;
  }
}

/* Imagen de relleno para lo que todavía no tiene foto: un SVG liviano
   generado en el navegador, sin descargas. */
function imgDemo(c1, c2) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">' +
      '<rect width="400" height="400" fill="#fae6d0"/>' +
      '<ellipse cx="200" cy="330" rx="150" ry="22" fill="#e9d5b8" opacity=".7"/>' +
      '<path d="M70 205a130 130 0 0 0 260 0z" fill="#fbf6ec"/>' +
      '<ellipse cx="200" cy="205" rx="130" ry="34" fill="#fbf6ec" stroke="#e0d2ba" stroke-width="3"/>' +
      '<ellipse cx="200" cy="200" rx="112" ry="27" fill="' + c1 + '"/>' +
      '<ellipse cx="168" cy="188" rx="42" ry="14" fill="' + c2 + '" opacity=".75"/>' +
    '</svg>';
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
