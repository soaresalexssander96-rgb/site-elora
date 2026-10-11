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

  const { items, order_nsu } = req.body;

  // Substitua entre as aspas pela sua Chave API real da InfinitePay
  const CHAVE_API = "inchk_RQB5Xy3KHSPBTnlsF-1gorL-P9pGQmNWb8lnMksP9tU"; 
  const INFINITE_TAG = "soaresalexssander96";

  try {
    const response = await fetch('https://api.infinitepay.io/v2/checkout/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHAVE_API}`
      },
      body: JSON.stringify({
        handle: INFINITE_TAG,
        redirect_url: req.headers.referer || "https://site-elora.vercel.app",
        order_nsu: order_nsu || "ELORA-" + Date.now(),
        items: items
      })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
