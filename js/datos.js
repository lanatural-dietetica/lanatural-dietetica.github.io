/* ============================================================
   DIETÉTICA — datos de demostración (seed)
   ------------------------------------------------------------
   TODO ESTO ES DEMO. Cuando esté la planilla real, este archivo
   se reemplaza por la carga desde Google Sheets (ver CONFIG.sheet).
   El precio NUNCA se escribe a mano: sale de costo + margen + descuento.
   ============================================================ */

const DEMO = true; // marca visible en la web mientras sean datos de prueba

const CONFIG = {
  marca: 'DIETÉTICA',
  bajada: 'almacén natural',
  slogan: 'Lo bueno empieza en la despensa.',
  slogan2: 'Productos simples para todos los días.',

  // --- WhatsApp (editable) ---
  whatsapp: '5492610000000',            // TODO: número real, formato 549 + área sin 0 + número sin 15
  waApertura: '¡Hola! Quiero hacer este pedido:',
  waCierre: 'Gracias. Quedo atento/a a la confirmación.',

  // --- reglas de precio ---
  redondeo: 50,                          // redondea el precio final a múltiplos de $50 (0 = sin redondeo)
  margenPorDefecto: 60,                  // % de recargo sobre el costo
  compraMinima: 0,

  // --- operación ---
  entrega: ['Retiro en el local', 'Envío a domicilio'],
  avisoStock: 'Stock, precio final y forma de entrega quedan sujetos a confirmación del local.',
  franja: 'Comprá desde 100 g · Envío o retiro',

  // --- datos del negocio (editables) ---
  direccion: 'Dirección a completar, Mendoza',
  horarios: 'Lun a Vie 9 a 20 h · Sáb 9 a 14 h',
  mediosPago: 'Efectivo, transferencia y débito/crédito en el local.',
  zonas: 'Envíos en Ciudad y Godoy Cruz. Otras zonas, consultar.',
  instagram: '',
  email: '',

  // --- fuente de datos futura (Google Sheets, como en Paladear) ---
  sheet: { activo: false, url: '' }
};

/* ---------- presentaciones globales ---------- */
const PRESENTACIONES = [
  { id: '50g',  nombre: '50 g',   gramos: 50,   orden: 1, activa: true },
  { id: '100g', nombre: '100 g',  gramos: 100,  orden: 2, activa: true },
  { id: '250g', nombre: '250 g',  gramos: 250,  orden: 3, activa: true },
  { id: '500g', nombre: '500 g',  gramos: 500,  orden: 4, activa: true },
  { id: '1kg',  nombre: '1 kg',   gramos: 1000, orden: 5, activa: true },
  { id: 'u',    nombre: 'unidad', gramos: null, orden: 6, activa: true }
];

/* ---------- categorías ---------- */
const CATEGORIAS = [
  { id: 'frutos',     nombre: 'Frutos y semillas', slug: 'frutos-y-semillas', orden: 1, visible: true, color: '#c98f4e' },
  { id: 'infusiones', nombre: 'Infusiones',        slug: 'infusiones',        orden: 2, visible: true, color: '#8e3b3b' },
  { id: 'legumbres',  nombre: 'Granos y legumbres',slug: 'granos-y-legumbres',orden: 3, visible: true, color: '#d8b271' },
  { id: 'sintacc',    nombre: 'Sin TACC',          slug: 'sin-tacc',          orden: 4, visible: true, color: '#e0d3ab' },
  { id: 'dulces',     nombre: 'Dulces y cacao',    slug: 'dulces-y-cacao',    orden: 5, visible: true, color: '#4a2c1c' },
  { id: 'despensa',   nombre: 'Despensa',          slug: 'despensa',          orden: 6, visible: true, color: '#a9563a' }
];

/* ---------- etiquetas ---------- */
const ETIQUETAS = [
  { id: 'sintacc', nombre: 'Sin TACC' },
  { id: 'vegano',  nombre: 'Vegano' },
  { id: 'organico',nombre: 'Orgánico' },
  { id: 'nuevo',   nombre: 'Nuevo' }
];

/* ---------- productos ----------
   tipo 'granel'   → costoKg  (el precio de cada presentación sale de los gramos)
   tipo 'envasado' → costoUnidad (presentación 'u')
--------------------------------- */
const PRODUCTOS = [
  {
    id: 'p01', sku: 'FS-001', slug: 'lentejas-rosadas', nombre: 'Lentejas rosadas',
    categoria: 'legumbres', subtitulo: 'Origen: Canadá', marca: '',
    tipo: 'granel', costoKg: 2100, margen: 62, descuento: 0,
    presentaciones: ['100g', '250g', '500g', '1kg'], presentacionDefecto: '250g',
    tags: ['sintacc', 'vegano'], estado: 'publicado', disponible: true,
    destacado: true, orden: 1, mix: false,
    descripcion: 'Lenteja pelada de cocción rápida, ideal para guisos, hamburguesas y sopas cremosas.',
    preparacion: 'No requiere remojo. Hervir 12 a 15 minutos con abundante agua.',
    origen: 'Canadá', ingredientes: 'Lentejas rosadas peladas.', alergenos: 'Puede contener trazas de gluten por fraccionamiento.',
    color: '#e07a3f', color2: '#f2a86d'
  },
  {
    id: 'p02', sku: 'IN-001', slug: 'flor-de-jamaica', nombre: 'Flor de Jamaica',
    categoria: 'infusiones', subtitulo: 'Corte premium', marca: '',
    tipo: 'granel', costoKg: 7800, margen: 60, descuento: 0,
    presentaciones: ['50g', '100g', '250g', '500g'], presentacionDefecto: '100g',
    tags: ['vegano'], estado: 'publicado', disponible: true,
    destacado: true, orden: 2, mix: false,
    descripcion: 'De sabor intenso y ligeramente ácido. Ideal para preparar infusiones frías o calientes.',
    preparacion: 'Una cucharada por taza. Infusionar 5 minutos en agua bien caliente.',
    origen: 'Perú', ingredientes: 'Cálices secos de hibiscus.', alergenos: 'No contiene alérgenos declarados.',
    color: '#8e2f34', color2: '#b6494b'
  },
  {
    id: 'p03', sku: 'LG-002', slug: 'garbanzos', nombre: 'Garbanzos',
    categoria: 'legumbres', subtitulo: 'Calibre grande', marca: '',
    tipo: 'granel', costoKg: 2600, margen: 60, descuento: 0,
    presentaciones: ['250g', '500g', '1kg'], presentacionDefecto: '250g',
    tags: ['sintacc', 'vegano'], estado: 'publicado', disponible: true,
    destacado: true, orden: 3, mix: false,
    descripcion: 'Garbanzo seleccionado, de piel fina y textura mantecosa. Para hummus, guisos y ensaladas.',
    preparacion: 'Remojar 8 horas. Hervir 45 a 60 minutos.',
    origen: 'Salta, Argentina', ingredientes: 'Garbanzos.', alergenos: 'Puede contener trazas de gluten.',
    color: '#d9b476', color2: '#eccb95'
  },
  {
    id: 'p04', sku: 'FS-010', slug: 'damascos-secos', nombre: 'Damascos secos',
    categoria: 'frutos', subtitulo: 'Sin carozo', marca: '',
    tipo: 'granel', costoKg: 8900, margen: 58, descuento: 10,
    presentaciones: ['100g', '250g', '500g'], presentacionDefecto: '250g',
    tags: ['vegano', 'sintacc'], estado: 'publicado', disponible: true,
    destacado: true, orden: 4, mix: true,
    descripcion: 'Damasco deshidratado mendocino, dulce y carnoso. Para snack, repostería y mixes.',
    preparacion: 'Listo para consumir. Conservar en frasco cerrado.',
    origen: 'Mendoza, Argentina', ingredientes: 'Damasco deshidratado, conservante SO2.', alergenos: 'Contiene sulfitos.',
    color: '#e28a34', color2: '#f4ab5c'
  },
  {
    id: 'p05', sku: 'DU-001', slug: 'chocolate-amargo-70', nombre: 'Chocolate amargo 70%',
    categoria: 'dulces', subtitulo: 'Cacao 70%', marca: '',
    tipo: 'granel', costoKg: 12500, margen: 55, descuento: 0,
    presentaciones: ['100g', '250g', '500g'], presentacionDefecto: '100g',
    tags: ['sintacc'], estado: 'publicado', disponible: true,
    destacado: false, orden: 5, mix: true,
    descripcion: 'Chocolate en trozos con 70% de cacao. Amargo, sin relleno y apto para repostería.',
    preparacion: 'Conservar en lugar fresco y seco, lejos de la luz.',
    origen: 'Argentina', ingredientes: 'Pasta de cacao, azúcar, manteca de cacao, lecitina de soja.',
    alergenos: 'Contiene soja. Puede contener leche y frutos secos.',
    color: '#3b2318', color2: '#5a3524'
  },
  {
    id: 'p06', sku: 'ST-001', slug: 'quinoa', nombre: 'Quinoa',
    categoria: 'sintacc', subtitulo: 'Grano blanco', marca: '',
    tipo: 'granel', costoKg: 9400, margen: 60, descuento: 0,
    presentaciones: ['250g', '500g', '1kg'], presentacionDefecto: '250g',
    tags: ['sintacc', 'vegano', 'organico'], estado: 'publicado', disponible: true,
    destacado: true, orden: 6, mix: false,
    descripcion: 'Grano andino de alto valor nutricional, liviano y de cocción rápida.',
    preparacion: 'Enjuagar bien. Hervir 15 minutos, 2 partes de agua por 1 de quinoa.',
    origen: 'Jujuy, Argentina', ingredientes: 'Quinoa blanca.', alergenos: 'Sin TACC.',
    color: '#e4d5a8', color2: '#f0e5c6'
  },
  {
    id: 'p07', sku: 'FS-020', slug: 'pasas-de-uva', nombre: 'Pasas de uva',
    categoria: 'frutos', subtitulo: 'Sin semilla', marca: '',
    tipo: 'granel', costoKg: 4200, margen: 60, descuento: 0,
    presentaciones: ['100g', '250g', '500g', '1kg'], presentacionDefecto: '250g',
    tags: ['vegano', 'sintacc'], estado: 'publicado', disponible: true,
    destacado: false, orden: 7, mix: true,
    descripcion: 'Pasa de uva mendocina, blanda y dulce. Clásica para mixes y panificados.',
    preparacion: 'Lista para consumir.',
    origen: 'Mendoza, Argentina', ingredientes: 'Uva deshidratada.', alergenos: 'Contiene sulfitos.',
    color: '#4a2a30', color2: '#6b3b42'
  },
  {
    id: 'p08', sku: 'FS-021', slug: 'coco-en-escamas', nombre: 'Coco en escamas',
    categoria: 'frutos', subtitulo: 'Sin azúcar agregada', marca: '',
    tipo: 'granel', costoKg: 6800, margen: 60, descuento: 0,
    presentaciones: ['100g', '250g', '500g'], presentacionDefecto: '100g',
    tags: ['vegano', 'sintacc'], estado: 'publicado', disponible: true,
    destacado: false, orden: 8, mix: true,
    descripcion: 'Escamas de coco deshidratado, crocantes y sin endulzar.',
    preparacion: 'Lista para consumir. Ideal para granolas y postres.',
    origen: 'Filipinas', ingredientes: 'Coco deshidratado.', alergenos: 'Puede contener trazas de frutos secos.',
    color: '#f0ece3', color2: '#ffffff'
  },
  {
    id: 'p09', sku: 'FS-022', slug: 'semillas-de-girasol', nombre: 'Semillas de girasol',
    categoria: 'frutos', subtitulo: 'Peladas', marca: '',
    tipo: 'granel', costoKg: 3200, margen: 62, descuento: 0,
    presentaciones: ['100g', '250g', '500g', '1kg'], presentacionDefecto: '250g',
    tags: ['vegano', 'sintacc'], estado: 'publicado', disponible: true,
    destacado: false, orden: 9, mix: true,
    descripcion: 'Semilla de girasol pelada, suave y con buen tostado natural.',
    preparacion: 'Se puede tostar 5 minutos en sartén para realzar el sabor.',
    origen: 'Buenos Aires, Argentina', ingredientes: 'Semillas de girasol.', alergenos: 'Puede contener trazas de frutos secos.',
    color: '#b9a377', color2: '#d5c39a'
  },
  {
    id: 'p10', sku: 'FS-023', slug: 'banana-deshidratada', nombre: 'Banana deshidratada',
    categoria: 'frutos', subtitulo: 'En rodajas', marca: '',
    tipo: 'granel', costoKg: 7400, margen: 58, descuento: 0,
    presentaciones: ['100g', '250g', '500g'], presentacionDefecto: '100g',
    tags: ['vegano'], estado: 'publicado', disponible: true,
    destacado: false, orden: 10, mix: true,
    descripcion: 'Rodajas de banana deshidratada, dulces y crocantes.',
    preparacion: 'Lista para consumir.',
    origen: 'Ecuador', ingredientes: 'Banana, aceite vegetal.', alergenos: 'Puede contener trazas de maní.',
    color: '#e8c766', color2: '#f5dd97'
  },
  {
    id: 'p11', sku: 'DE-001', slug: 'salsa-de-tomate', nombre: 'Salsa de tomate',
    categoria: 'despensa', subtitulo: 'Frasco 420 g · sin conservantes', marca: 'Casera',
    tipo: 'envasado', costoUnidad: 1650, margen: 55, descuento: 0,
    presentaciones: ['u'], presentacionDefecto: 'u',
    tags: ['vegano', 'sintacc'], estado: 'publicado', disponible: true,
    destacado: false, orden: 11, mix: false,
    descripcion: 'Salsa natural de tomate en frasco de vidrio, elaborada sin conservantes.',
    preparacion: 'Una vez abierto, conservar refrigerado hasta 4 días.',
    origen: 'Mendoza, Argentina', ingredientes: 'Tomate, sal, aceite de girasol, albahaca.', alergenos: 'No contiene alérgenos declarados.',
    color: '#b8352a', color2: '#d1523f'
  },
  {
    id: 'p12', sku: 'DU-010', slug: 'miel-de-flores', nombre: 'Miel de flores',
    categoria: 'dulces', subtitulo: 'Frasco 500 g · multifloral', marca: 'Apiario local',
    tipo: 'envasado', costoUnidad: 3400, margen: 55, descuento: 0,
    presentaciones: ['u'], presentacionDefecto: 'u',
    tags: ['sintacc'], estado: 'publicado', disponible: true,
    destacado: true, orden: 12, mix: false,
    descripcion: 'Miel pura multifloral de productores de la zona, sin agregados.',
    preparacion: 'Si cristaliza, entibiar a baño María. No apta para menores de 1 año.',
    origen: 'Mendoza, Argentina', ingredientes: 'Miel 100%.', alergenos: 'No apta para menores de 1 año.',
    color: '#d99a1f', color2: '#efbc4d'
  },
  {
    id: 'p13', sku: 'DE-005', slug: 'harina-integral-de-trigo', nombre: 'Harina integral de trigo',
    categoria: 'despensa', subtitulo: 'Bolsa 1 kg', marca: '',
    tipo: 'envasado', costoUnidad: 1250, margen: 55, descuento: 0,
    presentaciones: ['u'], presentacionDefecto: 'u',
    tags: ['vegano'], estado: 'publicado', disponible: true,
    destacado: false, orden: 13, mix: false,
    descripcion: 'Harina integral fina de molienda reciente, para panificados y masas.',
    preparacion: 'Conservar en lugar fresco y seco.',
    origen: 'Córdoba, Argentina', ingredientes: 'Harina integral de trigo.', alergenos: 'Contiene gluten.',
    color: '#c8b28a', color2: '#dfceb0'
  },
  {
    id: 'p14', sku: 'IN-005', slug: 'tisana-de-hierbas', nombre: 'Tisana de hierbas',
    categoria: 'infusiones', subtitulo: 'Mezcla de la casa', marca: '',
    tipo: 'granel', costoKg: 8600, margen: 60, descuento: 15,
    presentaciones: ['50g', '100g', '250g'], presentacionDefecto: '100g',
    tags: ['vegano', 'nuevo'], estado: 'publicado', disponible: false,
    destacado: false, orden: 14, mix: false,
    descripcion: 'Mezcla suave de manzanilla, cedrón, menta y flores. Sin teína.',
    preparacion: 'Una cucharada por taza, 4 minutos de infusión.',
    origen: 'Argentina', ingredientes: 'Manzanilla, cedrón, menta, caléndula.', alergenos: 'No contiene alérgenos declarados.',
    color: '#7d8a55', color2: '#a3ae7c'
  }
];

/* ---------- combos ---------- */
const COMBOS = [
  {
    id: 'c01', slug: 'despensa-esencial', nombre: 'Despensa esencial',
    descripcion: 'Lentejas, garbanzos, quinoa y salsa de tomate.',
    items: [
      { productoId: 'p01', presentacionId: '500g', cant: 1 },
      { productoId: 'p03', presentacionId: '500g', cant: 1 },
      { productoId: 'p06', presentacionId: '250g', cant: 1 },
      { productoId: 'p11', presentacionId: 'u',    cant: 1 }
    ],
    descuento: 10, precioEspecial: null, activo: true, destacado: true, orden: 1,
    color: '#c07a45', color2: '#e0a674'
  },
  {
    id: 'c02', slug: 'pausa-de-la-tarde', nombre: 'Pausa de la tarde',
    descripcion: 'Chocolate amargo, damascos, tisana y miel.',
    items: [
      { productoId: 'p05', presentacionId: '100g', cant: 1 },
      { productoId: 'p04', presentacionId: '250g', cant: 1 },
      { productoId: 'p14', presentacionId: '100g', cant: 1 },
      { productoId: 'p12', presentacionId: 'u',    cant: 1 }
    ],
    descuento: 8, precioEspecial: null, activo: true, destacado: false, orden: 2,
    color: '#7a4327', color2: '#a86a44'
  },
  {
    id: 'c03', slug: 'cocina-cotidiana', nombre: 'Cocina cotidiana',
    descripcion: 'Garbanzos, girasol, harina integral y salsa.',
    items: [
      { productoId: 'p03', presentacionId: '1kg',  cant: 1 },
      { productoId: 'p09', presentacionId: '500g', cant: 1 },
      { productoId: 'p13', presentacionId: 'u',    cant: 1 },
      { productoId: 'p11', presentacionId: 'u',    cant: 2 }
    ],
    descuento: 5, precioEspecial: null, activo: true, destacado: false, orden: 3,
    color: '#b09150', color2: '#d3b981'
  }
];

/* ---------- reglas de "Armá tu mix" ---------- */
const MIX = {
  activo: true,
  minIngredientes: 2,
  maxIngredientes: 4,
  presentaciones: ['250g', '500g', '1kg'],
  presentacionDefecto: '500g',
  recargo: 10, // % sobre el promedio de los ingredientes, por el armado
  titulo: 'Creá tu propio mix',
  bajada: 'Elegí hasta cuatro ingredientes y la cantidad.'
};

/* ---------- pasos de "Cómo comprar" (editables) ---------- */
const PASOS = [
  { n: '01', titulo: 'Elegí tu producto',      texto: 'Explorá las categorías o usá el buscador.' },
  { n: '02', titulo: 'Seleccioná la cantidad', texto: 'Desde 50 g hasta 1 kg, según el producto.' },
  { n: '03', titulo: 'Recibí o retirá',        texto: 'Elegí envío o retiro en el local.' }
];

/* ------------------------------------------------------------
   Imagen de demostración: SVG liviano generado en el navegador.
   Cuando haya fotos reales, cada producto usa su campo `img`.
------------------------------------------------------------ */
function imgDemo(c1, c2) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">' +
      '<rect width="400" height="400" fill="#f2e8d7"/>' +
      '<ellipse cx="200" cy="330" rx="150" ry="22" fill="#e2d3ba" opacity=".7"/>' +
      '<path d="M70 205a130 130 0 0 0 260 0z" fill="#fbf6ec"/>' +
      '<path d="M70 205a130 130 0 0 0 260 0z" fill="none" stroke="#e0d2ba" stroke-width="3"/>' +
      '<ellipse cx="200" cy="205" rx="130" ry="34" fill="#fbf6ec" stroke="#e0d2ba" stroke-width="3"/>' +
      '<ellipse cx="200" cy="200" rx="112" ry="27" fill="' + c1 + '"/>' +
      '<ellipse cx="168" cy="188" rx="42" ry="14" fill="' + c2 + '" opacity=".75"/>' +
      '<ellipse cx="238" cy="196" rx="30" ry="10" fill="' + c2 + '" opacity=".55"/>' +
      '<circle cx="92" cy="286" r="9" fill="' + c1 + '"/>' +
      '<circle cx="116" cy="300" r="6" fill="' + c2 + '"/>' +
    '</svg>';
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
