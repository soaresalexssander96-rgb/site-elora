// Prévia do cupom no checkout. Recebe { codigo, itens: [{ id, qtd }] } + token de login.
import { db, adminAuth, SITE_URL } from './_firebaseAdmin.js';
import { validarCupom } from './_cupons.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', SITE_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  let uid;
  try {
    uid = (await adminAuth.verifyIdToken((req.headers.authorization || '').replace(/^Bearer /, ''))).uid;
  } catch (e) {
    return res.status(401).json({ erro: 'Faça login para usar cupons.' });
  }

  const { codigo, itens } = req.body || {};
  try {
    let valorProdutos = 0;
    for (const it of itens || []) {
      const s = await db.collection('perfumes').doc(String(it.id)).get();
      if (s.exists) valorProdutos += (Number(s.data().preco) || 0) * Math.max(1, parseInt(it.qtd) || 1);
    }
    const r = await validarCupom(codigo, uid, Math.round(valorProdutos * 100) / 100);
    return res.status(r.ok ? 200 : 400).json(r);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Erro ao validar o cupom. Tente novamente.' });
  }
}
