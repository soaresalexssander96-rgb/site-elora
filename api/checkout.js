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

  const { items, order_nsu, customer } = req.body || {};

  const CHAVE_API = process.env.INFINITE_API_KEY || "inchk_RQB5Xy3KHSPBtnlsF-1gorL-P9pGQMNwb8lnMksP9tU"; 
  const INFINITE_TAG = "soaresalexssander96";

  const formattedItems = (items || []).map(item => ({
    description: item.description || "Elora Parfums",
    quantity: item.quantity || 1,
    price: item.price || item.amount || 0
  }));

  const payload = {
    handle: INFINITE_TAG,
    redirect_url: req.headers.referer || "https://site-elora.vercel.app",
    order_nsu: order_nsu || "ELORA-" + Date.now(),
    items: formattedItems
  };

  // Envia os dados do cliente para pré-preenchimento automático na InfinitePay
  if (customer) {
    payload.customer = {
      name: customer.nome || "",
      email: customer.email || "",
      phone_number: customer.telefone ? "+55" + customer.telefone.replace(/\D/g, '') : ""
    };
  }

  try {
    const response = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHAVE_API}`
      },
      body: JSON.stringify(payload)
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      data = { raw: rawText };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        erro: "Recusado pela InfinitePay",
        statusHttp: response.status,
        detalhes: data
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
