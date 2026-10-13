import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

// 1. Conexão oficial com o seu Firebase (Chaves da Elora Parfums já preenchidas!)
const firebaseConfig = {
    apiKey: "AIzaSyCPImRf4Mp7-AAsTzOXZNgS4NGvENeZsM4",
    authDomain: "elora-parfums.firebaseapp.com",
    projectId: "elora-parfums",
    storageBucket: "elora-parfums.firebasestorage.app",
    messagingSenderId: "953833053006",
    appId: "1:953833053006:web:141e5f4fb22e3a017fdc1f",
    measurementId: "G-YN6WE6QZP7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. Lógica que vai "ouvir" a InfinitePay
export default async function handler(req, res) {
    // Bloqueia tentativas de acesso indevido (só aceita os avisos da InfinitePay)
    if (req.method !== 'POST') {
        return res.status(405).send({ message: 'Acesso negado. Apenas POST é aceito.' });
    }

    try {
        const evento = req.body;
        console.log("Aviso recebido da InfinitePay:", evento);

        // 3. Verifica se a InfinitePay está avisando que o pagamento foi APROVADO
        // Nota: as variáveis abaixo cobrem os formatos mais comuns de payload da InfinitePay
        if (evento.type === 'payment_intent.succeeded' || evento.status === 'paid' || evento.status === 'approved') {
            
            // Tenta resgatar o código do pedido (Ex: ELORA-123456789)
            // Procura em vários lugares possíveis dependendo de como a API deles envia
            const orderNsu = evento.data?.metadata?.order_nsu || evento.data?.reference_id || evento.reference_id || evento.metadata?.order_nsu; 

            if (orderNsu) {
                // 4. Procura o pedido correspondente no seu Firebase
                const q = query(collection(db, "pedidos"), where("order_nsu", "==", orderNsu));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    // 5. Baixa Automática! Muda o status de "Aguardando" para "Aprovado"
                    const pedidoDoc = snapshot.docs[0];
                    await updateDoc(doc(db, "pedidos", pedidoDoc.id), {
                        status: "Pagamento Aprovado"
                    });
                    console.log(`Sucesso: Pedido ${orderNsu} atualizado para Pagamento Aprovado!`);
                } else {
                    console.log(`Aviso: Pedido ${orderNsu} pago, mas não encontrado no banco de dados.`);
                }
            }
        }

        // 6. Responde à InfinitePay que a mensagem foi recebida com sucesso
        res.status(200).send('Webhook recebido e processado pela Elora Parfums');

    } catch (error) {
        console.error('Erro ao processar o Webhook:', error);
        res.status(500).send('Erro interno do servidor');
    }
}
