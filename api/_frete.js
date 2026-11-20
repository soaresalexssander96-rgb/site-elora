// Cálculo de frete — usado pela cotação no checkout (/api/frete) e conferido de novo em /api/checkout.
// Com MELHORENVIO_TOKEN configurado na Vercel, usa preços reais (Correios, Jadlog etc.).
// Sem o token (ou se o Melhor Envio falhar), usa a tabela fixa por estado.
import { db } from './_firebaseAdmin.js';

const ME_URL = (process.env.MELHORENVIO_URL || 'https://melhorenvio.com.br').replace(/\/$/, '');
const CEP_ORIGEM = String(process.env.FRETE_CEP_ORIGEM || '').replace(/\D/g, '');
// Embalagem padrão de 1 perfume (ajuste nas variáveis da Vercel se precisar)
const PESO_KG = Number(process.env.FRETE_PESO_KG || 0.5);
const ALT = Number(process.env.FRETE_ALTURA_CM || 16);
const LARG = Number(process.env.FRETE_LARGURA_CM || 11);
const COMP = Number(process.env.FRETE_COMPRIMENTO_CM || 11);

export function tabelaFixa(uf) {
  let pac = 45.00, sedex = 75.00, pPac = '8 a 15 dias úteis', pSedex = '5 a 8 dias úteis';
  if (uf === 'RS') { pac = 14.90; sedex = 21.00; pPac = '1 a 3 dias úteis'; pSedex = '1 dia útil'; }
  else if (['SC', 'PR'].includes(uf)) { pac = 22.50; sedex = 35.00; pPac = '3 a 5 dias úteis'; pSedex = '2 a 4 dias úteis'; }
  else if (['SP', 'RJ', 'MG', 'ES'].includes(uf)) { pac = 28.90; sedex = 45.50; pPac = '5 a 8 dias úteis'; pSedex = '2 a 3 dias úteis'; }
  return [
    { id: 'pac', nome: 'PAC (Correios)', prazo: pPac, valor: pac },
    { id: 'sedex', nome: 'SEDEX (Expresso)', prazo: pSedex, valor: sedex }
  ];
}

async function ufDoCep(cep) {
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const d = await r.json();
    return d && !d.erro ? d.uf : '';
  } catch (e) { return ''; }
}

// itens: [{ id, qtd }] — preços para o seguro vêm do catálogo
export async function cotarFrete(cepDestino, itens) {
  const cep = String(cepDestino || '').replace(/\D/g, '');
  if (cep.length !== 8) throw new Error('CEP inválido');
  const uf = await ufDoCep(cep);

  if (process.env.MELHORENVIO_TOKEN && CEP_ORIGEM.length === 8) {
    try {
      const products = [];
      for (const it of itens || []) {
        const snap = await db.collection('perfumes').doc(String(it.id)).get();
        const p = snap.exists ? snap.data() : {};
        products.push({
          id: String(it.id), width: LARG, height: ALT, length: COMP, weight: PESO_KG,
          insurance_value: Number(p.preco) || 0, quantity: Math.max(1, parseInt(it.qtd) || 1)
        });
      }
      const r = await fetch(`${ME_URL}/api/v2/me/shipment/calculate`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json', 'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MELHORENVIO_TOKEN}`,
          'User-Agent': `Elora Parfums (${process.env.MELHORENVIO_EMAIL || 'contato@elora'})`
        },
        body: JSON.stringify({ from: { postal_code: CEP_ORIGEM }, to: { postal_code: cep }, products })
      });
      const lista = await r.json();
      if (r.ok && Array.isArray(lista)) {
        const opcoes = lista
          .filter(s => !s.error && (s.custom_price || s.price))
          .map(s => {
            const dias = s.custom_delivery_time || s.delivery_time;
            return {
              id: `me-${s.id}`,
              nome: `${(s.company && s.company.name) || ''} ${s.name || ''}`.trim(),
              prazo: dias ? `${dias} ${Number(dias) === 1 ? 'dia útil' : 'dias úteis'}` : '',
              valor: Math.round(Number(s.custom_price || s.price) * 100) / 100
            };
          })
          .filter(o => o.valor > 0)
          .sort((a, b) => a.valor - b.valor)
          .slice(0, 5);
        if (opcoes.length) return { uf, opcoes, fonte: 'melhorenvio' };
      }
      console.warn('Melhor Envio sem opções, usando tabela', r.status, JSON.stringify(lista).slice(0, 300));
    } catch (e) {
      console.error('Erro no Melhor Envio, usando tabela', e);
    }
  }
  return { uf, opcoes: tabelaFixa(uf), fonte: 'tabela' };
}
