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
function price(p) {
  const n = Number(p.price || 0).toLocaleString('es-AR');
  return `${p.currency || 'USD'} ${n}`;
}
async function getProperties() {
  if (!SUPABASE_ANON_KEY) throw new Error('Falta configurar SUPABASE_ANON_KEY en Netlify.');
  const url = `${SUPABASE_URL}/rest/v1/properties?select=*&is_visible=eq.true&order=created_at.desc`;
  const response = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
  if (!response.ok) throw new Error(`Supabase respondió ${response.status}`);
  return response.json();
}
function page(p, slug) {
  const title = `${p.title || 'Propiedad'} en ${p.locality || p.location || 'Buenos Aires'} | ${p.operation || 'Inmobiliaria'} | Herrera Prop`;
  const description = String(p.description || `${p.property_type || 'Propiedad'} ${String(p.operation || '').toLowerCase()} en ${p.locality || p.location || 'Buenos Aires'}. Consultá a Herrera Estudio Inmobiliario.`).replace(/\s+/g,' ').slice(0, 300);
  const canonical = `${SITE}/propiedades/${slug}`;
  const images = Array.isArray(p.images) ? p.images : [];
  const image = images[0] ? (String(images[0]).startsWith('http') ? images[0] : `${SUPABASE_URL}/storage/v1/object/public/properties-images/${images[0]}`) : '';
  const type = p.property_type || p['property type'] || p.type || 'Inmueble';
  const locality = [p.location, p.locality].filter(Boolean).join(', ');
  const facts = [p.rooms && `${p.rooms} ambientes`, p.bedrooms && `${p.bedrooms} dormitorios`, (p.surface_total || p.surface) && `${p.surface_total || p.surface} m²`].filter(Boolean).join(' · ');
  const schema = {
    '@context':'https://schema.org', '@type':'RealEstateListing', name:title, description,
    url:canonical, image:images.map(x => String(x).startsWith('http') ? x : `${SUPABASE_URL}/storage/v1/object/public/properties-images/${x}`),
    datePosted:p.created_at || undefined,
    offers:{'@type':'Offer', price:Number(p.price || 0), priceCurrency:p.currency || 'USD', availability:'https://schema.org/InStock'},
    about:{'@type':'Residence', name:p.title || type, address:{'@type':'PostalAddress', streetAddress:p.location || '', addressLocality:p.locality || '', addressRegion:'Buenos Aires', addressCountry:'AR'}}
  };
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(canonical)}">
<meta property="og:site_name" content="Herrera Estudio Inmobiliario"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
<meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>
<link rel="icon" href="/favicon-herrera-original.ico"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;700&family=Montserrat:wght@400;500;700&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box}body{margin:0;background:#FAF8F5;color:#263238;font-family:Montserrat,Arial,sans-serif}.top{background:#0C2340;color:#fff;padding:18px 5%;border-bottom:3px solid #A36D3B}.brand{font:700 26px 'EB Garamond',serif;letter-spacing:4px}.wrap{max-width:1100px;margin:32px auto;padding:0 18px}.panel{background:#fff;border:1px solid #A36D3B55;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px #0001}.hero{display:grid;grid-template-columns:1.2fr 1fr}.photo{width:100%;height:100%;min-height:340px;object-fit:cover;background:#eee}.info{padding:28px}.eyebrow{color:#A36D3B;text-transform:uppercase;font-size:12px;font-weight:bold;letter-spacing:1px}.title{font:700 34px 'EB Garamond',serif;color:#0C2340;margin:10px 0}.price{font:700 26px 'EB Garamond',serif;color:#0C2340;margin:18px 0}.facts{background:#F3EFE7;padding:13px;border-radius:10px;font-size:13px}.desc{white-space:pre-line;line-height:1.7;font-size:14px}.btn{display:inline-block;background:#0C2340;color:#fff;text-decoration:none;padding:13px 18px;border-radius:9px;margin:8px 8px 0 0;font-size:13px;font-weight:bold}.wa{background:#16834b}.back{color:#0C2340;text-decoration:none;font-size:13px;font-weight:bold}.gallery{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.gallery img{width:78px;height:65px;object-fit:cover;border-radius:7px}@media(max-width:760px){.hero{grid-template-columns:1fr}.photo{height:270px;min-height:0}.title{font-size:28px}.info{padding:20px}}</style></head><body><header class="top"><div class="brand">HERRERA <small style="font:500 10px Montserrat;letter-spacing:2px;color:#D19E66">INMOBILIARIA · C.S.I 6219</small></div></header>
<main class="wrap"><a class="back" href="/">← Volver a Herrera Prop</a><article class="panel" style="margin-top:16px"><div class="hero">${image ? `<img class="photo" src="${esc(image)}" alt="${esc(p.title || type)}">` : '<div class="photo"></div>'}<section class="info"><div class="eyebrow">${esc(p.operation || 'Propiedad')} · ${esc(type)}</div><h1 class="title">${esc(p.title || type)}</h1><div>${esc(locality)}</div><div class="price">${esc(price(p))}</div><div class="facts">${esc(facts || 'Consultá por las características de esta propiedad')}</div><h2 style="font:700 22px 'EB Garamond';color:#0C2340;margin-bottom:4px">Descripción</h2><p class="desc">${esc(p.description || 'Consultanos para recibir más información.')}</p><a class="btn wa" href="https://wa.me/5491149704626?text=${encodeURIComponent(`Hola Herrera Inmobiliaria, quisiera consultar por ${p.title || 'esta propiedad'}: ${canonical}`)}" target="_blank" rel="noopener">Consultar por WhatsApp</a><a class="btn" href="/">Ver más propiedades</a></section></div>${images.length > 1 ? `<div class="gallery" style="padding:0 20px 20px">${images.slice(1,8).map(x=>{const u=String(x).startsWith('http')?x:`${SUPABASE_URL}/storage/v1/object/public/properties-images/${x}`;return `<img src="${esc(u)}" alt="${esc(p.title || 'Propiedad')}">`;}).join('')}</div>` : ''}</article></main></body></html>`;
}
exports.handler = async (event) => {
  try {
    const requested = (event.path || '').split('/').filter(Boolean).pop();
    const properties = await getProperties();
    const property = properties.find(p => propertySlug(p) === requested);
    if (!property) return { statusCode:404, headers:{'Content-Type':'text/html; charset=utf-8'}, body:'<!doctype html><html lang="es"><meta charset="utf-8"><title>Propiedad no encontrada</title><body><h1>Propiedad no disponible</h1><p>La publicación puede haber sido retirada.</p><a href="/">Volver a Herrera Prop</a></body></html>' };
    return { statusCode:200, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=60, s-maxage=300'}, body:page(property, requested) };
  } catch (e) {
    console.error(e);
    return { statusCode:500, headers:{'Content-Type':'text/plain; charset=utf-8'}, body:'No se pudo cargar la ficha de la propiedad. Verificá la configuración de Supabase en Netlify.' };
  }
};
