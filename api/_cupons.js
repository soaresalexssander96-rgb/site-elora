// Validação de cupons — usada na prévia do checkout (/api/cupom) e na cobrança (/api/checkout).
// Os cupons ficam na coleção "cupons" do Firestore (o ID do documento é o código, em maiúsculas)
// e são criados pelo Painel → Cupons.
import { db, STATUS_PAGOS } from './_firebaseAdmin.js';

const arred = (v) => Math.round(v * 100) / 100;
const brl = (v) => (Number(v) || 0).toFixed(2).replace('.', ',');

// Cupom antigo: continua valendo enquanto não existir um cupom com esse código no painel
const LEGADO = { PRIMEIROGRATIS: { tipo: 'frete', valor: 0, primeiraCompra: true, ativo: true } };

export function descreverCupom(c) {
  if (c.tipo === 'percentual') return `${Number(c.valor)}% OFF`;
  if (c.tipo === 'valor') return `R$ ${brl(c.valor)} OFF`;
  return 'Frete Grátis';
}

// Retorna { ok: true, codigo, tipo, descontoProdutos, freteGratis, descricao } ou { ok: false, erro }
// extra: { qtdItens, cpf } — usados nas regras "mínimo de perfumes" e "1 uso por CPF"
export async function validarCupom(codigoBruto, uid, valorProdutos, pedidoIdIgnorar = null, extra = {}) {
  const codigo = String(codigoBruto || '').trim().toUpperCase();
  if (!codigo) return { ok: false, erro: 'Digite um cupom.' };

  const snap = await db.collection('cupons').doc(codigo).get();
  const c = snap.exists ? snap.data() : LEGADO[codigo];
  if (!c || c.ativo === false) return { ok: false, erro: 'Cupom inválido ou expirado.' };

  if (c.inicio) {
    const ini = new Date(`${c.inicio}T00:00:00-03:00`);
    if (!isNaN(ini) && Date.now() < ini.getTime()) return { ok: false, erro: `Este cupom só vale a partir de ${c.inicio.split('-').reverse().join('/')}.` };
  }
  if (c.validade) {
    const fim = new Date(`${c.validade}T23:59:59-03:00`);
    if (!isNaN(fim) && Date.now() > fim.getTime()) return { ok: false, erro: 'Este cupom expirou.' };
  }
  if (Number(c.minimo) > 0 && valorProdutos < Number(c.minimo)) {
    return { ok: false, erro: `Este cupom vale para compras a partir de R$ ${brl(c.minimo)} em produtos.` };
  }
  const minItens = parseInt(c.minItens) || 0;
  if (minItens > 1 && (parseInt(extra.qtdItens) || 0) < minItens) {
    const faltam = minItens - (parseInt(extra.qtdItens) || 0);
    return { ok: false, erro: `Este cupom vale para pedidos com ${minItens} ou mais perfumes. Falta${faltam > 1 ? 'm' : ''} ${faltam}.` };
  }
  if (Number(c.limiteUsos) > 0 && (Number(c.usos) || 0) >= Number(c.limiteUsos)) {
    return { ok: false, erro: 'Este cupom já atingiu o limite de usos.' };
  }
  if (c.primeiraCompra) {
    const anteriores = await db.collection('pedidos').where('uid', '==', uid).get();
    const jaComprou = anteriores.docs.some(d => d.id !== pedidoIdIgnorar && STATUS_PAGOS.includes(d.data().status));
    if (jaComprou) return { ok: false, erro: 'Este cupom é válido apenas para a primeira compra.' };
  }

  if (c.umPorCpf) {
    const cpf = String(extra.cpf || '').replace(/\D/g, '');
    const usos = await db.collection('pedidos').where('cupom', '==', codigo).get();
    const jaUsou = usos.docs.some(d => {
      if (d.id === pedidoIdIgnorar) return false;
      const p = d.data();
      if (!STATUS_PAGOS.includes(p.status)) return false;
      const cpfPedido = String((p.cliente && p.cliente.cpf) || '').replace(/\D/g, '');
      return p.uid === uid || (cpf && cpfPedido === cpf);
    });
    if (jaUsou) return { ok: false, erro: 'Este cupom já foi usado neste CPF. É permitido 1 uso por pessoa.' };
  }

  let descontoProdutos = 0;
  if (c.tipo === 'percentual') descontoProdutos = arred(valorProdutos * Math.min(Math.max(Number(c.valor) || 0, 0), 100) / 100);
  if (c.tipo === 'valor') descontoProdutos = arred(Math.min(Math.max(Number(c.valor) || 0, 0), valorProdutos));

  return { ok: true, codigo, tipo: c.tipo, descontoProdutos, freteGratis: c.tipo === 'frete', descricao: descreverCupom(c) };
}

// Configurações da loja (Painel → Configurações)
export async function lerConfig() {
  try {
    const s = await db.collection('config').doc('loja').get();
    const d = s.exists ? s.data() : {};
    return { pixDesconto: Number(d.pixDesconto ?? 5), parcelas: parseInt(d.parcelas ?? 10) || 1 };
  } catch (e) {
    return { pixDesconto: 5, parcelas: 10 };
  }
}
