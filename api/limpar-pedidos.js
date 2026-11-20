// Cancela pedidos que ficaram mais de 24h em "Aguardando Pagamento".
// Roda sozinho 1x por dia (agendado no vercel.json). Se o cliente pagar depois, o webhook marca como Pago normalmente.
import { db } from './_firebaseAdmin.js';

export default async function handler(req, res) {
  const segredo = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  const ua = String(req.headers['user-agent'] || '');
  const autorizado = segredo ? auth === `Bearer ${segredo}` : ua.startsWith('vercel-cron');
  if (!autorizado) return res.status(401).json({ erro: 'não autorizado' });

  try {
    const limite = Date.now() - 24 * 60 * 60 * 1000;
    const snap = await db.collection('pedidos').where('status', '==', 'Aguardando Pagamento').get();
    let cancelados = 0;
    for (const d of snap.docs) {
      const criado = new Date(d.data().dataCriacao || 0).getTime();
      if (criado && criado < limite) {
        await d.ref.update({ status: 'Cancelado', canceladoEm: new Date().toISOString(), motivoCancelamento: 'Pagamento não concluído em 24h' });
        cancelados++;
      }
    }
    return res.status(200).json({ ok: true, cancelados });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'falha ao limpar pedidos' });
  }
}
