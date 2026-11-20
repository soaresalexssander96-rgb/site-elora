// Mapa do site para o Google: site-elora.vercel.app/sitemap.xml
import { db, SITE_URL } from './_firebaseAdmin.js';

export default async function handler(req, res) {
  try {
    const snap = await db.collection('perfumes').get();
    const urls = [`${SITE_URL}/`, ...snap.docs.map(d => `${SITE_URL}/p/${d.id}`)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600');
    return res.status(200).send(xml);
  } catch (e) {
    console.error(e);
    return res.status(500).send('erro');
  }
}
