// Aviso de venda nova para a dona da loja.
// WhatsApp via CallMeBot (grátis, só envia para o seu próprio número):
//   CALLMEBOT_PHONE  = seu WhatsApp com DDI, ex: +5551994378685
//   CALLMEBOT_APIKEY = a chave que o bot te mandar
// E-mail (opcional) via Resend: RESEND_API_KEY e EMAIL_AVISO (seu e-mail)
import { SITE_URL } from './_firebaseAdmin.js';

const brl = (v) => (Number(v) || 0).toFixed(2).replace('.', ',');

export function montarMensagem(pedido, pagamento) {
  const c = pedido.cliente || {};
  const itens = (pedido.itens || []).map(i => `• ${i.qtd || 1}x ${i.marca ? i.marca + ' ' : ''}${i.nome}`).join('\n');
  const metodo = pagamento.metodo === 'pix' ? 'PIX' : pagamento.metodo === 'credit_card' ? `Cartão ${pagamento.parcelas || 1}x` : (pagamento.metodo || '');
  return [
    `🛍️ *Nova venda na Elora Parfums!*`,
    ``,
    `*Pedido:* ${pedido.order_nsu}`,
    `*Total:* R$ ${brl(pedido.valorTotal)} (pago R$ ${brl(pagamento.valorPago)} via ${metodo})`,
    ``,
    itens,
    ``,
    `*Cliente:* ${c.nome || ''}`,
    `*WhatsApp:* ${c.telefone || ''}`,
    `*Entrega:* ${pedido.freteTipo || ''} — ${c.cidade || ''}/${c.uf || ''}`,
    ``,
    `Painel: ${SITE_URL}`
  ].join('\n');
}

async function comTempo(promessa, ms = 5000) {
  return Promise.race([promessa, new Promise((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), ms))]);
}

export async function notificarVenda(pedido, pagamento) {
  const texto = montarMensagem(pedido, pagamento);
  const tarefas = [];

  if (process.env.CALLMEBOT_PHONE && process.env.CALLMEBOT_APIKEY) {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(process.env.CALLMEBOT_PHONE)}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(process.env.CALLMEBOT_APIKEY)}`;
    tarefas.push(comTempo(fetch(url)).catch(e => console.error('Falha no aviso por WhatsApp', e)));
  }

  if (process.env.RESEND_API_KEY && process.env.EMAIL_AVISO) {
    tarefas.push(comTempo(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_REMETENTE || 'Elora Parfums <onboarding@resend.dev>',
        to: [process.env.EMAIL_AVISO],
        subject: `Nova venda: ${pedido.order_nsu} — R$ ${brl(pedido.valorTotal)}`,
        text: texto.replace(/\*/g, '')
      })
    })).catch(e => console.error('Falha no aviso por e-mail', e)));
  }

  await Promise.all(tarefas);
}
