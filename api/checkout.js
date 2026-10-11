export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { items, order_nsu } = req.body || {};

  const CHAVE_API = process.env.INFINITE_API_KEY || "inchk_RQB5Xy3KHSPBtnlsF-1gorL-P9pGQMNwb8lnMksP9tU"; 
  const INFINITE_TAG = "soaresalexssander96";

  const payload = {
    handle: INFINITE_TAG,
    redirect_url: req.headers.referer || "https://site-elora.vercel.app",
    order_nsu: order_nsu || "ELORA-" + Date.now(),
    items: items || []
  };

  const endpoints = [
    'https://api.infinitepay.io/v2/checkouts',
    'https://api.infinitepay.io/v2/checkout',
    'https://api.infinitepay.io/v1/checkouts',
    'https://api.infinitepay.io/v2/checkout/links',
    'https://api.infinitepay.io/v2/links'
  ];

  let resultados = [];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHAVE_API}`
        },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      let parsed = null;
      try { parsed = JSON.parse(text); } catch(e) {}

      resultados.push({
        url: url,
        status: response.status,
        resposta: parsed || text.substring(0, 100)
      });

      // Se a rota for válida e retornar a URL do checkout
      if (response.ok && parsed && (parsed.url || parsed.checkout_url)) {
        return res.status(200).json(parsed);
      }
    } catch (err) {
      resultados.push({ url: url, erro: err.message });
    }
  }

  // Se nenhuma rota gerou URL direta, exibe o relatório de todas as rotas testadas
  return res.status(200).json({
    diagnostico: "Relatório de Rotas",
    tentativas: resultados
  });
}
