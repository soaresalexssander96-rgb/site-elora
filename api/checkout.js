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
    'https://cloud.infinitepay.io/v2/checkouts',
    'https://cloud.infinitepay.io/v2/checkout',
    'https://api.infinitepay.io/v2/checkout/link',
    'https://api.infinitepay.io/v1/checkout/links',
    'https://api.infinitepay.io/v2/transactions'
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

      if (response.ok && parsed && (parsed.url || parsed.checkout_url)) {
        return res.status(200).json(parsed);
      }
    } catch (err) {
      resultados.push({ url: url, erro: err.message });
    }
  }

  return res.status(200).json({
    diagnostico: "Relatório Ampliado",
    tentativas: resultados
  });
}
