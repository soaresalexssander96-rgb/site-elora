// Cotação de frete para o checkout. Recebe { cep, itens: [{ id, qtd }] }.
import { SITE_URL } from './_firebaseAdmin.js';
import { cotarFrete } from './_frete.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', SITE_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const { cep, itens } = req.body || {};
  try {
    const { uf, opcoes } = await cotarFrete(cep, itens);
    return res.status(200).json({ uf, opcoes });
  } catch (e) {
    return res.status(400).json({ erro: e.message === 'CEP inválido' ? 'CEP inválido.' : 'Não foi possível calcular o frete.' });
  }
}
