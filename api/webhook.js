// Recebe o aviso de pagamento da InfinitePay.
// O aviso não tem assinatura, então cada notificação é confirmada no payment_check antes de mexer no pedido.
import { db, INFINITE_TAG } from './_firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const body = req.body || {};
  const order_nsu = body.order_nsu;
  const transaction_nsu = body.transaction_nsu;
  const slug = body.invoice_slug || body.slug;
  if (!order_nsu || !transaction_nsu || !slug) return res.status(200).json({ ignorado: 'dados incompletos' });

  try {
    // 1. Confirma com a InfinitePay que o pagamento é real
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.INFINITE_API_KEY) headers['X-Api-Key'] = process.env.INFINITE_API_KEY;
    const check = await fetch('https://api.checkout.infinitepay.io/payment_check', {
      method: 'POST', headers,
      body: JSON.stringify({ handle: INFINITE_TAG, order_nsu, transaction_nsu, slug })
    });
    const conf = await check.json().catch(() => ({}));
    if (!conf.success || !conf.paid) {
      console.warn('Webhook não confirmado', order_nsu, conf);
      return res.status(200).json({ ignorado: 'pagamento não confirmado' });
    }

    // 2. Acha o pedido
    const busca = await db.collection('pedidos').where('order_nsu', '==', order_nsu).limit(1).get();
    if (busca.empty) {
      console.warn('Webhook para pedido inexistente', order_nsu);
      return res.status(200).json({ ignorado: 'pedido não encontrado' });
    }
    const pedidoRef = busca.docs[0].ref;

    // 3. Marca como pago e baixa o estoque (uma vez só, mesmo se o aviso chegar repetido)
    const resultado = await db.runTransaction(async (t) => {
      const snap = await t.get(pedidoRef);
      const pedido = snap.data();
      if (pedido.pagamento && pedido.pagamento.transaction_nsu) return 'já processado';
      if (pedido.status !== 'Aguardando Pagamento' && pedido.status !== 'Cancelado') return 'status já alterado';

      const itens = pedido.itens || [];
      const refs = itens.map(i => db.collection('perfumes').doc(String(i.id)));
      const perfumes = refs.length ? await t.getAll(...refs) : [];

      const esperado = Math.round((Number(pedido.valorTotal) || 0) * 100);
      const pago = Number(conf.paid_amount || conf.amount || body.paid_amount || 0);

      perfumes.forEach((p, idx) => {
        if (!p.exists) return;
        const d = p.data();
        if (d.estoque === undefined || d.estoque === null || d.estoque === '') return;
        const novo = Math.max(0, (parseInt(d.estoque) || 0) - (parseInt(itens[idx].qtd) || 1));
        t.update(p.ref, { estoque: novo });
      });

      t.update(pedidoRef, {
        status: 'Pago',
        pagamento: {
          transaction_nsu, slug,
          metodo: conf.capture_method || body.capture_method || '',
          parcelas: conf.installments || body.installments || 1,
          valorPago: pago / 100,
          comprovante: body.receipt_url || '',
          pagoEm: new Date().toISOString(),
          // aviso para o admin se o valor pago ficou abaixo do esperado (tolerância para desconto PIX de 5%)
          valorAbaixoDoEsperado: esperado > 0 && pago < Math.floor(esperado * 0.95) - 1
        }
      });
      return 'pago';
    });

    return res.status(200).json({ ok: true, resultado });
  } catch (error) {
    console.error('Erro no webhook', error);
    return res.status(400).json({ erro: 'falha temporária' }); // 400 faz a InfinitePay tentar de novo
  }
}
