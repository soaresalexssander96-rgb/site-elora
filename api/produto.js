// Página própria de cada perfume: site-elora.vercel.app/p/ID
// Devolve o site normal, mas com título, descrição e foto do perfume no cabeçalho —
// é isso que aparece na prévia do link no WhatsApp, Instagram e no Google.
import { db, SITE_URL } from './_firebaseAdmin.js';

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default async function handler(req, res) {
  const id = String((req.query && req.query.id) || '').replace(/[^A-Za-z0-9_-]/g, '');
  try {
    const [snap, base] = await Promise.all([
      id ? db.collection('perfumes').doc(id).get() : Promise.resolve(null),
      fetch(`${SITE_URL}/index.html`).then(r => r.text())
    ]);
    if (!snap || !snap.exists) { res.setHeader('Location', '/'); return res.status(302).end(); }

    const p = snap.data();
    const img0 = (Array.isArray(p.imagens) && p.imagens.filter(Boolean)[0]) || p.imagem || '/royal-amber.jpeg';
    const imagem = /^https?:\/\//.test(img0) ? img0 : `${SITE_URL}/${img0.replace(/^\.?\//, '')}`;
    const preco = (Number(p.preco) || 0).toFixed(2).replace('.', ',');
    const titulo = `${p.marca ? p.marca + ' ' : ''}${p.nome} | Elora Parfums`;
    const notas = [p.notasTopo, p.notasCoracao, p.notasFundo].filter(Boolean).join(', ');
    const descricao = `R$ ${preco} ou 10x sem juros. ${p.familia ? 'Família ' + p.familia + '. ' : ''}${notas ? 'Notas: ' + notas + '.' : 'Fragrância árabe exclusiva.'}`;
    const url = `${SITE_URL}/p/${id}`;

    const meta = `
    <title>${esc(titulo)}</title>
    <meta name="description" content="${esc(descricao)}">
    <link rel="canonical" href="${esc(url)}">
    <meta property="og:type" content="product">
    <meta property="og:site_name" content="Elora Parfums">
    <meta property="og:title" content="${esc(titulo)}">
    <meta property="og:description" content="${esc(descricao)}">
    <meta property="og:image" content="${esc(imagem)}">
    <meta property="og:url" content="${esc(url)}">
    <meta property="product:price:amount" content="${(Number(p.preco) || 0).toFixed(2)}">
    <meta property="product:price:currency" content="BRL">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product', name: p.nome, brand: p.marca || undefined, image: imagem, description: descricao,
      offers: { '@type': 'Offer', price: (Number(p.preco) || 0).toFixed(2), priceCurrency: 'BRL', url,
        availability: (p.estoque !== undefined && p.estoque !== '' && Number(p.estoque) <= 0) ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' }
    }).replace(/</g, '\\u003c')}</script>`;

    // Troca o bloco de SEO padrão (entre os marcadores) pelo do perfume
    const html = base.replace(/<!--SEO-->[\s\S]*?<!--\/SEO-->/, `<!--SEO-->${meta}\n    <!--/SEO-->`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(html);
  } catch (e) {
    console.error(e);
    res.setHeader('Location', '/');
    return res.status(302).end();
  }
}
