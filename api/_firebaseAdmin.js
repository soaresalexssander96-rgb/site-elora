// Conexão do servidor com o Firebase (Admin SDK).
// Arquivos que começam com "_" não viram rota na Vercel — este é só um módulo compartilhado.
// Precisa da variável de ambiente FIREBASE_SERVICE_ACCOUNT na Vercel (o JSON da conta de serviço).
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')) });

export const db = getFirestore(app);
export const adminAuth = getAuth(app);
export { FieldValue };

export const SITE_URL = (process.env.SITE_URL || 'https://site-elora.vercel.app').replace(/\/$/, '');
export const INFINITE_TAG = process.env.INFINITE_TAG || 'soaresalexssander96';

// Mesma tabela de frete do site — o servidor é quem decide o valor cobrado.
export function tabelaFrete(uf) {
  if (uf === 'RS') return { 'PAC (Correios)': 14.90, 'SEDEX (Expresso)': 21.00 };
  if (['SC', 'PR'].includes(uf)) return { 'PAC (Correios)': 22.50, 'SEDEX (Expresso)': 35.00 };
  if (['SP', 'RJ', 'MG', 'ES'].includes(uf)) return { 'PAC (Correios)': 28.90, 'SEDEX (Expresso)': 45.50 };
  return { 'PAC (Correios)': 45.00, 'SEDEX (Expresso)': 75.00 };
}

export const STATUS_PAGOS = ['Pago', 'Em separação', 'Enviado', 'Entregue'];
