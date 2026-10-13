// Ficheiro a ser criado no seu Backend (Vercel): /api/webhook.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

// 1. Conectar o Backend ao seu Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCPImRf4Mp7-AAsTzOXZNgS4NGvENeZsM4",
    projectId: "elora-parfums",
    // ... (coloque o resto das suas chaves Firebase aqui)
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
    // A InfinitePay só envia requisições POST para avisar de pagamentos
    if (req.method !== 'POST') {
        return res.status(405).send({ message: 'Apenas POST é aceite' });
    }

    try {
        const evento = req.body;

        // Verifica se a notificação é de um pagamento aprovado/pago
        if (evento.type === 'payment_intent.succeeded' || evento.status === 'paid') {
            
            // Pega o número do pedido que gerámos no frontend (Ex: ELORA-1718293)
            // Nota: Vai depender de como você enviou o order_nsu para a InfinitePay no /api/checkout
            const orderNsu = evento.data.metadata.order_nsu || evento.data.reference_id; 

            if (orderNsu) {
                // 2. Procura o pedido no Firebase
                const q = query(collection(db, "pedidos"), where("order_nsu", "==", orderNsu));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    // 3. Atualiza o status do pedido para Aprovado automaticamente!
                    const pedidoDoc = snapshot.docs[0];
                    await updateDoc(doc(db, "pedidos", pedidoDoc.id), {
                        status: "Pagamento Aprovado"
                    });
                    console.log(`Pedido ${orderNsu} atualizado com sucesso!`);
                }
            }
        }

        // Responde à InfinitePay que a mensagem foi recebida (Obrigatório)
        res.status(200).send('Webhook recebido e processado');

    } catch (error) {
        console.error('Erro no Webhook:', error);
        res.status(500).send('Erro interno do servidor');
    }
}
