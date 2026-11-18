const SITE = 'https://herreraprop.com';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bfnsinnvotiwvqttriqc.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
function slugify(v) { return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90); }
function slug(p) { return `${slugify(p.property_type || p['property type'] || p.type || 'inmueble')}-${slugify(p.operation || 'propiedad')}-${slugify(p.locality || p.location || 'buenos-aires')}-${String(p.id || '').slice(0,8)}`; }
exports.handler = async () => {
  try {
    if (!SUPABASE_ANON_KEY) throw new Error('Falta SUPABASE_ANON_KEY');
    const url = `${SUPABASE_URL}/rest/v1/properties?select=id,title,location,locality,operation,property_type,type,is_visible,created_at&is_visible=eq.true&order=created_at.desc`;
    const r = await fetch(url,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});
    if (!r.ok) throw new Error(`Supabase ${r.status}`);
    const rows = await r.json();
    const urls = [`<url><loc>${SITE}/</loc></url>`, ...rows.map(p=>`<url><loc>${SITE}/propiedades/${slug(p)}</loc>${p.created_at?`<lastmod>${new Date(p.created_at).toISOString()}</lastmod>`:''}</url>`)];
    return {statusCode:200,headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'},body:`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`};
  } catch(e) { console.error(e); return {statusCode:500,headers:{'Content-Type':'text/plain; charset=utf-8'},body:'No se pudo generar el sitemap. Revisá SUPABASE_ANON_KEY y permisos de lectura pública.'}; }
};
