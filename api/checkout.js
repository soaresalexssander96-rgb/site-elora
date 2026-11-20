// Cria o link de pagamento da InfinitePay.
// O navegador só manda o ID do pedido; preços, frete e cupom são recalculados aqui a partir do Firestore.
import { db, adminAuth, SITE_URL, INFINITE_TAG, STATUS_PAGOS } from './_firebaseAdmin.js';
import { cotarFrete } from './_frete.js';

const arred = (v) => Math.round(v * 100) / 100;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', SITE_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  // 1. Quem está comprando? (token do Firebase Auth enviado pelo site)
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  let uid;
  try {
    uid = (await adminAuth.verifyIdToken(token)).uid;
  } catch (e) {
    return res.status(401).json({ erro: 'Faça login novamente para finalizar a compra.' });
  }

  const { pedidoId } = req.body || {};
  if (!pedidoId) return res.status(400).json({ erro: 'Pedido não informado.' });

  try {
    const pedidoRef = db.collection('pedidos').doc(String(pedidoId));
    const pedidoSnap = await pedidoRef.get();
    if (!pedidoSnap.exists) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    const pedido = pedidoSnap.data();
    if (pedido.uid !== uid) return res.status(403).json({ erro: 'Este pedido não pertence à sua conta.' });
    if (pedido.status !== 'Aguardando Pagamento') return res.status(409).json({ erro: 'Este pedido já foi processado.' });

    // 2. Preços e estoque vindos do catálogo, não do navegador
    const itens = [];
    for (const it of pedido.itens || []) {
      const qtd = Math.max(1, parseInt(it.qtd) || 1);
      const snap = await db.collection('perfumes').doc(String(it.id)).get();
      if (!snap.exists) return res.status(400).json({ erro: `O perfume "${it.nome}" não está mais disponível.` });
      const p = snap.data();
      const temEstoque = p.estoque !== undefined && p.estoque !== null && p.estoque !== '';
      if (temEstoque && Number(p.estoque) < qtd) {
        return res.status(400).json({ erro: `Estoque insuficiente de "${p.nome}" (disponível: ${Math.max(0, Number(p.estoque))}).` });
      }
      itens.push({ id: snap.id, nome: p.nome, marca: p.marca, preco: Number(p.preco) || 0, qtd, imagem: it.imagem || '' });
    }
    if (!itens.length) return res.status(400).json({ erro: 'Sacola vazia.' });
    const valorProdutos = arred(itens.reduce((s, i) => s + i.preco * i.qtd, 0));

    // 3. Frete: cota de novo no servidor (Melhor Envio ou tabela) e confere a opção escolhida
    const cliente = pedido.cliente || {};
    let cotacao;
    try { cotacao = await cotarFrete(cliente.cep, itens.map(i => ({ id: i.id, qtd: i.qtd }))); }
    catch (e) { return res.status(400).json({ erro: 'CEP inválido. Confira o endereço.' }); }
    const uf = cotacao.uf || String(cliente.uf || '').toUpperCase();
    const opcao = cotacao.opcoes.find(o => o.id === pedido.freteServicoId) || cotacao.opcoes.find(o => o.nome === pedido.freteTipo);
    if (!opcao) return res.status(409).json({ erro: 'As opções de frete mudaram. Clique em Calcular de novo e escolha o frete.' });
    const valorFrete = opcao.valor;

    // 4. Cupom PRIMEIROGRATIS: só se nunca houve pedido pago nesta conta
    let descontoFrete = 0;
    let cupom = null;
    if (pedido.cupom === 'PRIMEIROGRATIS') {
      const anteriores = await db.collection('pedidos').where('uid', '==', uid).get();
      const jaComprou = anteriores.docs.some(d => d.id !== pedidoSnap.id && STATUS_PAGOS.includes(d.data().status));
      if (!jaComprou) { descontoFrete = valorFrete; cupom = 'PRIMEIROGRATIS'; }
    }
    const valorTotal = arred(valorProdutos + valorFrete - descontoFrete);

    // 5. Grava os valores oficiais no pedido
    await pedidoRef.update({
      itens, valorProdutos, valorFrete, descontoFrete, cupom, valorTotal,
      freteTipo: opcao.nome, fretePrazo: opcao.prazo, freteServicoId: opcao.id,
      'cliente.uf': uf, validadoServidor: true
    });

    // 6. Link de pagamento
    const items = itens.map(i => ({ description: `Elora: ${i.marca} - ${i.nome}`, quantity: i.qtd, price: Math.round(i.preco * 100) }));
    const freteCobrado = arred(valorFrete - descontoFrete);
    if (freteCobrado > 0) items.push({ description: `Frete ${opcao.nome} (${uf})`, quantity: 1, price: Math.round(freteCobrado * 100) });

    const payload = {
      handle: INFINITE_TAG,
      order_nsu: pedido.order_nsu,
      redirect_url: `${SITE_URL}/`,
      webhook_url: `${SITE_URL}/api/webhook`,
      items,
      customer: {
        name: cliente.nome || '',
        email: cliente.email || '',
        phone_number: cliente.telefone ? '+55' + String(cliente.telefone).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '') : '',
        document_number: String(cliente.cpf || '').replace(/\D/g, '')
      },
    };
    const enderecoFormatado = {
      line1: cliente.numero ? `${cliente.rua}, ${cliente.numero}` : (cliente.rua || ''),
      line2: cliente.complemento || '',
      neighborhood: cliente.bairro || '',
      city: cliente.cidade || '',
      state: uf || 'SP',
      zip: String(cliente.cep || '').replace(/\D/g, ''),
      country: 'BR'
    };
    payload.billing_address = enderecoFormatado;
    payload.shipping_address = enderecoFormatado;

    const headers = { 'Content-Type': 'application/json' };
    if (process.env.INFINITE_API_KEY) headers['X-Api-Key'] = process.env.INFINITE_API_KEY;

    const response = await fetch('https://api.checkout.infinitepay.io/links', { method: 'POST', headers, body: JSON.stringify(payload) });
    const rawText = await response.text();
    let data;
    try { data = JSON.parse(rawText); } catch (e) { data = { raw: rawText }; }

    if (!response.ok) {
      console.error('InfinitePay recusou o link', response.status, rawText);
      return res.status(502).json({ erro: 'A plataforma de pagamento recusou a solicitação. Tente novamente.' });
    }
    const url = data.url || data.checkout_url || data.link;
    await pedidoRef.update({ linkPagamento: url || null });
    return res.status(200).json({ url, valorTotal });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: 'Erro ao preparar o pagamento. Tente novamente.' });
  }
}
