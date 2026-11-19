const SITE = 'https://herreraprop.com';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bfnsinnvotiwvqttriqc.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

function esc(v = '') {
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function slugify(v) {
  return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}
function propertySlug(p) {
  const type = p.property_type || p['property type'] || p.type || 'inmueble';
  const locality = p.locality || p.location || 'buenos-aires';
  return `${slugify(type)}-${slugify(p.operation || 'propiedad')}-${slugify(locality)}-${String(p.id || '').slice(0,8)}`;
}
function imageUrl(value) {
  if (!value) return '';
  const s = String(value);
  return s.startsWith('http') ? s : `${SUPABASE_URL}/storage/v1/object/public/properties-images/${s}`;
}
async function getProperty(requested) {
  if (!SUPABASE_ANON_KEY) throw new Error('Falta SUPABASE_ANON_KEY en Netlify');
  const url = `${SUPABASE_URL}/rest/v1/properties?select=*&is_visible=eq.true`;
  const response = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
  if (!response.ok) throw new Error(`Supabase respondió ${response.status}`);
  const rows = await response.json();
  return rows.find(p => propertySlug(p) === requested);
}
function setMeta(html, selector, tag) {
  const re = new RegExp(`<meta\\s+[^>]*${selector}[^>]*>`, 'i');
  if (re.test(html)) return html.replace(re, tag);
  return html.replace('</head>', `    ${tag}\n</head>`);
}
exports.handler = async (event) => {
  try {
    const requested = (event.path || '').split('/').filter(Boolean).pop();
    const property = await getProperty(requested);
    if (!property) return { statusCode:404, headers:{'Content-Type':'text/html; charset=utf-8'}, body:'<!doctype html><html lang="es"><meta charset="utf-8"><title>Propiedad no encontrada</title><body><h1>Propiedad no disponible</h1><p>La publicación puede haber sido retirada.</p><a href="/">Volver a Herrera Prop</a></body></html>' };

    // Entregar el mismo sitio y el mismo modal interactivo que usa el catálogo.
    // La función solo personaliza los metadatos SEO que leen Google y WhatsApp.
    const homeResponse = await fetch(`${SITE}/`, { headers: { 'Accept': 'text/html' } });
    if (!homeResponse.ok) throw new Error(`No se pudo cargar el HTML principal: ${homeResponse.status}`);
    let html = await homeResponse.text();

    const locality = property.locality || property.location || 'Buenos Aires';
    const title = `${property.title || 'Propiedad'} | ${property.operation || 'Inmueble'} en ${locality} | Herrera Inmobiliaria`;
    const description = String(property.description || `${property.property_type || 'Propiedad'} ${String(property.operation || '').toLowerCase()} en ${locality}. Consultá con Herrera Estudio Inmobiliario.`).replace(/\s+/g, ' ').slice(0, 300);
    const canonical = `${SITE}/propiedades/${requested}`;
    const image = imageUrl(Array.isArray(property.images) ? property.images[0] : '');

    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
    html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${esc(canonical)}">`);
    html = setMeta(html, "name=[\"\']description[\"\']", `<meta name="description" content="${esc(description)}">`);
    html = setMeta(html, "property=[\"\']og:url[\"\']", `<meta property="og:url" content="${esc(canonical)}">`);
    html = setMeta(html, "property=[\"\']og:title[\"\']", `<meta property="og:title" content="${esc(title)}">`);
    html = setMeta(html, "property=[\"\']og:description[\"\']", `<meta property="og:description" content="${esc(description)}">`);
    if (image) html = setMeta(html, "property=[\"\']og:image[\"\']", `<meta property="og:image" content="${esc(image)}">`);
    html = setMeta(html, "property=[\"\']og:type[\"\']", '<meta property="og:type" content="article">');

    const schema = {
      '@context':'https://schema.org', '@type':'WebPage', name:title, description, url:canonical,
      image: image || undefined,
      mainEntity: {
        '@type':'Residence', name:property.title || property.property_type || 'Propiedad',
        address:{'@type':'PostalAddress', streetAddress:property.location || '', addressLocality:property.locality || '', addressRegion:'Buenos Aires', addressCountry:'AR'},
        offers:{'@type':'Offer', price:Number(property.price || 0), priceCurrency:property.currency || 'USD'}
      }
    };
    const ld = `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>`;
    html = html.replace('</head>', `    ${ld}\n</head>`);

    return { statusCode:200, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=60, s-maxage=300'}, body:html };
  } catch (e) {
    console.error(e);
    return { statusCode:500, headers:{'Content-Type':'text/plain; charset=utf-8'}, body:'No se pudo cargar la ficha de la propiedad. Verificá la configuración de Supabase en Netlify.' };
  }
};
