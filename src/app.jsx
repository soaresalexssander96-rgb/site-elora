const { useState, useEffect, useRef, useContext } = React;

        const Icon = ({ name, className, traco }) => {
            const ref = useRef(null);
            useEffect(() => {
                if (ref.current) {
                    ref.current.innerHTML = `<i data-lucide="${name}" class="${className || ''}"${traco ? ` stroke-width="${traco}"` : ''}></i>`;
                    lucide.createIcons({ root: ref.current });
                }
            }, [name, className, traco]);
            return <span ref={ref} className="inline-flex items-center justify-center shrink-0"></span>;
        };

        // ===== CONFIGURAÇÃO =====
        // Cole aqui o UID da conta admin (Firebase > Authentication > Users > coluna "UID do usuário").
        // O mesmo UID precisa estar no arquivo firestore.rules — é ele que protege de verdade.
        const ADMIN_UIDS = ['VDHlilV28AZEcyhCHvw76IR4PmQ2'];

        const STATUS_PEDIDO = ['Aguardando Pagamento', 'Pago', 'Em separação', 'Enviado', 'Entregue', 'Cancelado'];
        const STATUS_CORES = {
            'Aguardando Pagamento': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            'Pago': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            'Em separação': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            'Enviado': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
            'Entregue': 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
            'Cancelado': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        };

        // Configurações da loja (Painel → Configurações). Valores padrão até carregar do banco.
        const CONFIG_PADRAO = { pixDesconto: 5, parcelas: 10, avisosTopo: [], bannerSegundos: 8 };
        const ConfigLoja = React.createContext(CONFIG_PADRAO);
        const avisosPadrao = (cfg) => [
            '🔥 Esquenta Black Friday: Condições Especiais',
            '🎁 Frete Grátis na Primeira Compra: Use o cupom PRIMEIROGRATIS',
            cfg.parcelas > 1 ? `💳 Até ${cfg.parcelas}x Sem Juros no Cartão` : null,
            cfg.pixDesconto > 0 ? `💚 ${cfg.pixDesconto}% de Desconto no PIX` : null
        ].filter(Boolean);
        const precoPix = (v, cfg) => (Number(v) || 0) * (1 - (Number(cfg.pixDesconto) || 0) / 100);

        const getFb = () => new Promise((resolve) => {
            if (window.fb) return resolve(window.fb);
            window.addEventListener('firebase-ready', () => resolve(window.fb), { once: true });
        });

        const montarUsuario = async (fbUser) => {
            const { db, doc, getDoc } = await getFb();
            let perfil = {};
            try {
                const snap = await getDoc(doc(db, 'usuarios', fbUser.uid));
                if (snap.exists()) perfil = snap.data();
            } catch (e) { console.error(e); }
            return {
                uid: fbUser.uid,
                email: fbUser.email,
                nome: perfil.nome || '',
                cpf: perfil.cpf || '',
                telefone: perfil.telefone || '',
                role: ADMIN_UIDS.includes(fbUser.uid) ? 'admin' : 'cliente'
            };
        };

        const traduzirErroAuth = (code) => {
            const erros = {
                'auth/invalid-credential': 'E-mail ou senha incorretos.',
                'auth/wrong-password': 'E-mail ou senha incorretos.',
                'auth/user-not-found': 'E-mail ou senha incorretos.',
                'auth/invalid-email': 'E-mail inválido.',
                'auth/email-already-in-use': 'Este e-mail já possui uma conta. Faça login!',
                'auth/weak-password': 'Senha muito fraca.',
                'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
                'auth/network-request-failed': 'Sem conexão. Verifique sua internet.'
            };
            return erros[code] || 'Não foi possível concluir. Tente novamente.';
        };

        const temControleEstoque = (p) => p.estoque !== undefined && p.estoque !== null && p.estoque !== '';
        const estaEsgotado = (p) => temControleEstoque(p) && Number(p.estoque) <= 0;
        const qtdItem = (item) => Number(item.qtd) || 1;
        const totalItens = (cart) => cart.reduce((s, i) => s + qtdItem(i), 0);
        const totalCarrinho = (cart) => cart.reduce((s, i) => s + (Number(i.preco) || 0) * qtdItem(i), 0);
        const formatarData = (iso) => { try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

        const linkProduto = (p) => `${window.location.origin}/p/${p.id}`;

        const getImagemPrincipal = (produto) => {
            if (produto.imagens && produto.imagens.length > 0) return produto.imagens[0];
            return produto.imagem || './royal-amber.jpeg';
        };

        // ===== PREÇOS =====
        const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const precoAntigoDe = (p) => { const a = Number(p.precoAntigo) || 0, v = Number(p.preco) || 0; return a > v && v > 0 ? a : 0; };
        const descontoPct = (p) => { const a = precoAntigoDe(p); return a ? Math.round((1 - (Number(p.preco) || 0) / a) * 100) : 0; };

        // Símbolo do Pix (desenho simplificado do losango, na cor do Pix)
        function IconePix({ className }) {
            return (
                <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#32BCAD" d="M12 1.6c.7 0 1.4.3 1.9.8l3.3 3.3h-.6c-1 0-2 .4-2.7 1.1L12 8.7 10.1 6.8C9.4 6.1 8.4 5.7 7.4 5.7h-.6l3.3-3.3c.5-.5 1.2-.8 1.9-.8ZM5.1 7.3h2.3c.6 0 1.1.2 1.5.6l2.3 2.3c.5.5 1.2.5 1.6 0l2.3-2.3c.4-.4 1-.6 1.5-.6h2.3l2.3 2.3c1 1 1 2.7 0 3.8l-2.3 2.3h-2.3c-.6 0-1.1-.2-1.5-.6l-2.3-2.3c-.5-.5-1.2-.5-1.6 0l-2.3 2.3c-.4.4-1 .6-1.5.6H5.1l-2.3-2.3c-1-1-1-2.7 0-3.8l2.3-2.3Zm1.7 11h.6c1 0 2-.4 2.7-1.1l1.9-1.9 1.9 1.9c.7.7 1.7 1.1 2.7 1.1h.6l-3.3 3.3c-1 1-2.7 1-3.8 0l-3.3-3.3Z"/>
                </svg>
            );
        }

        // Bloco de preço: "de" riscado, preço, linha do Pix e linha do cartão
        function BlocoPreco({ produto, grande }) {
            const cfg = useContext(ConfigLoja);
            const v = Number(produto.preco) || 0, antigo = precoAntigoDe(produto);
            const parc = Math.max(1, cfg.parcelas);
            return (
                <div className={`flex flex-col ${grande ? 'items-start gap-1.5' : 'items-center gap-1'} w-full`}>
                    {antigo > 0 && <span className={`${grande ? 'text-sm' : 'text-xs'} text-slate-400 line-through`}>{brl(antigo)}</span>}
                    <span className={`${grande ? 'text-3xl font-semibold' : 'text-xl font-bold'} text-slate-900 dark:text-white leading-none`}>{brl(v)}</span>
                    {cfg.pixDesconto > 0 && (
                        <span className={`flex items-center gap-1.5 ${grande ? 'text-sm mt-2' : 'text-xs mt-1'} text-slate-600 dark:text-slate-300`}>
                            <IconePix className={grande ? 'w-5 h-5' : 'w-4 h-4'} />
                            <strong className="text-[#1f9a8c] dark:text-[#4fd1c1]">{brl(precoPix(v, cfg))}</strong> com Pix
                        </span>
                    )}
                    {parc > 1 && (
                        <span className={`flex items-center gap-1.5 ${grande ? 'text-sm' : 'text-xs'} text-slate-500 dark:text-slate-400`}>
                            <Icon name="credit-card" className={`${grande ? 'w-5 h-5' : 'w-4 h-4'} text-slate-400`} />
                            {parc}x de <strong className="text-slate-700 dark:text-slate-200">{brl(v / parc)}</strong> sem juros
                        </span>
                    )}
                </div>
            );
        }

        const compressImage = (file, MAX = 800) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = MAX; 
                        const MAX_HEIGHT = MAX; 
                        let width = img.width;
                        let height = img.height;

                        if (width > height && width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        } else if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        canvas.toBlob((blob) => {
                            if (blob) {
                                resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                            } else {
                                resolve(file);
                            }
                        }, 'image/jpeg', 0.65); 
                    };
                    img.onerror = () => resolve(file);
                };
                reader.onerror = () => resolve(file);
            });
        };

        function PromoTicker() {
            const cfg = useContext(ConfigLoja);
            const avisos = (cfg.avisosTopo && cfg.avisosTopo.length) ? cfg.avisosTopo : avisosPadrao(cfg);
            if (!avisos.length) return null;
            return (
                <div className="bg-black text-slate-300 py-2.5 overflow-hidden w-full relative z-50">
                    <div className="animate-marquee flex gap-12 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap cursor-default">
                        {[0, 1, 2].map(r => avisos.map((t, i) => <span key={`${r}-${i}`} className={i % 2 === 1 ? 'text-elora-gold' : ''}>{t}</span>))}
                    </div>
                </div>
            );
        }

        // ===== CONTATOS DA LOJA =====
        const WHATS_NUMERO = "5551994378685";
        const WHATS_EXIBICAO = "(51) 99437-8685";
        const INSTAGRAM = "elora.parfum_";
        const linkWhats = (msg) => `https://wa.me/${WHATS_NUMERO}?text=${encodeURIComponent(msg || "Olá, Elora Parfums!")}`;
        const PAGINAS_LEGAIS = { trocas: 'Trocas e Devoluções', privacidade: 'Política de Privacidade', termos: 'Termos de Uso' };
        const ATUALIZACAO_LEGAL = '19 de novembro de 2026';

        function IconeInstagram({ className }) {
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
                </svg>
            );
        }

        function IconeWhats({ className }) {
            return (
                <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
            );
        }

        function Rodape({ darkMode, setDarkMode, irPara, irPagina }) {
            const cfg = useContext(ConfigLoja);
            const link = "text-slate-500 dark:text-slate-400 hover:text-elora-gold transition-colors text-left";
            const titulo = "text-[10px] font-bold uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200 mb-4";
            return (
                <footer className={`${darkMode ? 'bg-elora-darkbg border-slate-800' : 'bg-white border-slate-200'} border-t pt-14 pb-8 mt-auto transition-colors`}>
                    <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-10 text-sm">
                        <div className="md:col-span-1 flex flex-col items-center md:items-start text-center md:text-left">
                            <LogoPremium onClick={() => irPara('store')} darkMode={darkMode} isSmall={true} />
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-4 leading-relaxed max-w-xs">Fragrâncias árabes exclusivas e refinadas, escolhidas a dedo para você.</p>
                            <div className="flex gap-3 mt-5">
                                <a href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noreferrer" aria-label="Instagram da Elora Parfums" className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-white hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-500 hover:to-purple-600 hover:border-transparent transition-all"><IconeInstagram className="w-5 h-5" /></a>
                                <a href={linkWhats()} target="_blank" rel="noreferrer" aria-label="WhatsApp da Elora Parfums" className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#25D366] hover:border-transparent transition-all"><IconeWhats className="w-5 h-5" /></a>
                            </div>
                        </div>

                        <div className="text-center md:text-left">
                            <p className={titulo}>Atendimento</p>
                            <ul className="space-y-3">
                                <li><a href={linkWhats()} target="_blank" rel="noreferrer" className={`${link} inline-flex items-center gap-2`}><IconeWhats className="w-4 h-4" /> {WHATS_EXIBICAO}</a></li>
                                <li><a href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noreferrer" className={`${link} inline-flex items-center gap-2`}><IconeInstagram className="w-4 h-4" /> @{INSTAGRAM}</a></li>
                                <li className="text-slate-400 text-xs">Seg. a sáb., horário comercial</li>
                            </ul>
                        </div>

                        <div className="text-center md:text-left">
                            <p className={titulo}>Institucional</p>
                            <ul className="space-y-3">
                                {Object.entries(PAGINAS_LEGAIS).map(([k, nome]) => (
                                    <li key={k}><button onClick={() => irPagina(k)} className={link}>{nome}</button></li>
                                ))}
                            </ul>
                        </div>

                        <div className="text-center md:text-left">
                            <p className={titulo}>Pagamento</p>
                            <ul className="space-y-3 text-slate-500 dark:text-slate-400">
                                <li className="flex items-center gap-2 justify-center md:justify-start"><Icon name="credit-card" className="w-4 h-4 text-elora-gold" /> {cfg.parcelas > 1 ? `Cartão em até ${cfg.parcelas}x sem juros` : 'Cartão de crédito'}</li>
                                <li className="flex items-center gap-2 justify-center md:justify-start"><Icon name="qr-code" className="w-4 h-4 text-elora-gold" /> PIX{cfg.pixDesconto > 0 ? ` com ${cfg.pixDesconto}% de desconto` : ''}</li>
                                <li className="flex items-center gap-2 justify-center md:justify-start"><Icon name="shield-check" className="w-4 h-4 text-elora-gold" /> Pagamento seguro via InfinitePay</li>
                                <li className="flex items-center gap-2 justify-center md:justify-start"><Icon name="truck" className="w-4 h-4 text-elora-gold" /> Envio para todo o Brasil</li>
                            </ul>
                        </div>
                    </div>
                    <div className="max-w-7xl mx-auto px-4 mt-12 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                        <button onClick={() => setDarkMode(!darkMode)} className="sm:hidden mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">
                            <Icon name={darkMode ? 'sun' : 'moon'} className="w-4 h-4" /> {darkMode ? 'Modo claro' : 'Modo escuro'}
                        </button>
                        <p className="text-slate-400 text-[10px] tracking-widest uppercase">Elora Parfums &copy; 2026 · Todos os direitos reservados</p>
                    </div>
                </footer>
            );
        }

        function Secao({ titulo, children }) {
            return (
                <section className="mb-8">
                    <h3 className="text-xl font-serif mb-3 text-slate-900 dark:text-slate-100">{titulo}</h3>
                    <div className="space-y-3 text-slate-600 dark:text-slate-300 leading-relaxed text-[15px]">{children}</div>
                </section>
            );
        }

        function PaginaLegal({ pagina, irPagina, voltar, darkMode }) {
            const cfg = useContext(ConfigLoja);
            const contato = (
                <span>pelo WhatsApp <a href={linkWhats()} target="_blank" rel="noreferrer" className="text-elora-gold font-semibold hover:underline">{WHATS_EXIBICAO}</a> ou pelo Instagram <a href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noreferrer" className="text-elora-gold font-semibold hover:underline">@{INSTAGRAM}</a></span>
            );
            const li = "list-disc ml-5 space-y-1.5";

            const conteudo = {
                trocas: (
                    <React.Fragment>
                        <Secao titulo="Direito de arrependimento (7 dias)">
                            <p>Comprou e se arrependeu? Pelo Código de Defesa do Consumidor (art. 49), você pode desistir da compra em até <strong>7 dias corridos a partir do recebimento</strong>, sem precisar justificar.</p>
                            <p>Para fragrâncias, pedimos que o produto seja devolvido <strong>com o lacre intacto e na embalagem original</strong>, junto com todos os itens que o acompanharam.</p>
                            <p>Nesse caso, devolvemos o valor total pago, <strong>incluindo o frete</strong>, e o custo do envio de volta é por nossa conta.</p>
                        </Secao>
                        <Secao titulo="Produto chegou quebrado, vazando ou errado">
                            <p>Se o frasco chegar quebrado ou vazando por causa do transporte, ou se você receber um produto diferente do que comprou, fale com a gente assim que receber.</p>
                            <p>Envie fotos ou um vídeo do produto e da embalagem. Você escolhe entre receber o produto certo ou o reembolso integral, e o frete de devolução é por nossa conta.</p>
                            <p>Dica: se a embalagem chegar visivelmente danificada, fotografe antes de abrir.</p>
                        </Secao>
                        <Secao titulo="Como solicitar">
                            <ol className="list-decimal ml-5 space-y-1.5">
                                <li>Fale com a gente {contato}, informando o número do pedido (está em <em>Minha Conta</em>).</li>
                                <li>Vamos orientar sobre como enviar o produto de volta, sem custo para você nos casos acima.</li>
                                <li>Assim que recebermos e conferirmos o produto, fazemos a troca ou o reembolso.</li>
                            </ol>
                        </Secao>
                        <Secao titulo="Reembolso">
                            <p>O reembolso é feito pelo mesmo meio de pagamento: <strong>PIX</strong> em até 7 dias úteis após recebermos o produto, ou <strong>estorno no cartão</strong>, que pode aparecer em até 2 faturas, conforme a operadora.</p>
                        </Secao>
                    </React.Fragment>
                ),
                privacidade: (
                    <React.Fragment>
                        <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">A Elora Parfums respeita a sua privacidade e trata seus dados pessoais de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD). Aqui explicamos, de forma simples, o que coletamos e por quê.</p>
                        <Secao titulo="Dados que coletamos">
                            <ul className={li}>
                                <li><strong>Cadastro:</strong> nome, e-mail, CPF e WhatsApp.</li>
                                <li><strong>Compra:</strong> endereço de entrega, produtos e valores do pedido.</li>
                                <li><strong>Pagamento:</strong> é feito no ambiente da InfinitePay. <strong>Nós não recebemos nem guardamos os dados do seu cartão.</strong></li>
                                <li><strong>Navegação:</strong> informações salvas no seu próprio navegador para o site funcionar (veja "Cookies" abaixo).</li>
                            </ul>
                        </Secao>
                        <Secao titulo="Para que usamos">
                            <ul className={li}>
                                <li>Criar e manter sua conta e permitir o login.</li>
                                <li>Processar pagamentos, emitir e entregar seus pedidos e calcular o frete.</li>
                                <li>Falar com você sobre seus pedidos, trocas e atendimento.</li>
                                <li>Prevenir fraudes e cumprir obrigações legais.</li>
                            </ul>
                            <p>Não vendemos seus dados e não enviamos mensagens promocionais sem a sua autorização.</p>
                        </Secao>
                        <Secao titulo="Com quem compartilhamos">
                            <p>Apenas com os serviços necessários para a loja funcionar:</p>
                            <ul className={li}>
                                <li><strong>InfinitePay</strong>: processamento do pagamento.</li>
                                <li><strong>Google Firebase</strong>: armazenamento seguro da conta e dos pedidos.</li>
                                <li><strong>Vercel</strong>: hospedagem do site.</li>
                                <li><strong>Correios ou transportadora</strong>: entrega do pedido (nome e endereço).</li>
                                <li><strong>ViaCEP</strong>: consulta do endereço pelo CEP.</li>
                            </ul>
                        </Secao>
                        <Secao titulo="Cookies e armazenamento local">
                            <p>Usamos apenas o armazenamento <strong>essencial</strong> do navegador, para manter você conectado e lembrar sua sacola, seus favoritos e sua preferência de tema claro/escuro.</p>
                            <p>Hoje <strong>não usamos cookies de publicidade nem de rastreamento</strong>. Se isso mudar, vamos pedir sua permissão antes.</p>
                            <p>Você pode apagar esses dados a qualquer momento nas configurações do seu navegador. Nesse caso, sua sacola e seus favoritos serão perdidos e será preciso fazer login de novo.</p>
                        </Secao>
                        <Secao titulo="Por quanto tempo guardamos">
                            <p>Mantemos os dados da conta enquanto ela estiver ativa. Os dados de pedidos são guardados pelo prazo exigido pela legislação fiscal e de defesa do consumidor.</p>
                        </Secao>
                        <Secao titulo="Seus direitos">
                            <p>Pela LGPD, você pode a qualquer momento pedir para <strong>acessar, corrigir, atualizar ou excluir</strong> seus dados, saber com quem foram compartilhados ou revogar consentimentos. Nome, WhatsApp e CPF podem ser editados direto em <em>Minha Conta</em>.</p>
                            <p>Para os demais pedidos, inclusive a exclusão da conta, fale com a gente {contato}.</p>
                        </Secao>
                        <Secao titulo="Segurança">
                            <p>Senhas são protegidas pelo sistema de autenticação do Google e nunca ficam visíveis para a loja. O acesso aos dados é restrito: cada cliente vê apenas as próprias informações.</p>
                        </Secao>
                    </React.Fragment>
                ),
                termos: (
                    <React.Fragment>
                        <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">Ao usar o site e comprar na Elora Parfums, você concorda com estes termos. Leia com atenção.</p>
                        <Secao titulo="Cadastro">
                            <p>Para comprar é preciso criar uma conta com dados verdadeiros. Você é responsável por manter sua senha em segredo. Se suspeitar de uso indevido, troque a senha e avise a gente.</p>
                        </Secao>
                        <Secao titulo="Produtos, preços e estoque">
                            <p>Fazemos o possível para que fotos e descrições sejam fiéis. As cores podem variar um pouco conforme a tela. A descrição olfativa é uma referência, e a percepção do perfume varia de pessoa para pessoa.</p>
                            <p>Preços e disponibilidade podem mudar sem aviso. O valor que vale é o confirmado no momento do pagamento. Se um item ficar indisponível depois da compra, avisamos e devolvemos o valor integral.</p>
                        </Secao>
                        <Secao titulo="Pagamento">
                            <p>Os pagamentos são processados pela InfinitePay, por PIX ou cartão de crédito{cfg.parcelas > 1 ? ` (em até ${cfg.parcelas}x sem juros)` : ''}. Descontos para pagamento via PIX, quando houver, são os indicados no site no momento da compra. O pedido é confirmado quando o pagamento é aprovado.</p>
                        </Secao>
                        <Secao titulo="Entrega">
                            <p>O frete e o prazo estimado são mostrados no checkout, a partir do seu CEP. O prazo começa a contar depois da confirmação do pagamento. Quando o pedido é enviado, o código de rastreio aparece em <em>Minha Conta</em>.</p>
                            <p>Confira o endereço antes de pagar. Se o pedido voltar por endereço incorreto ou ausência repetida, combinamos o reenvio com você.</p>
                        </Secao>
                        <Secao titulo="Cupons e promoções">
                            <p>Cupons têm regras próprias (por exemplo, validade, valor mínimo ou válido só na primeira compra) e não são cumulativos: é possível usar um cupom por pedido. Promoções valem enquanto durar o estoque ou pelo período anunciado.</p>
                        </Secao>
                        <Secao titulo="Trocas e devoluções">
                            <p>Seguem a nossa <button onClick={() => irPagina('trocas')} className="text-elora-gold font-semibold hover:underline">política de Trocas e Devoluções</button>, de acordo com o Código de Defesa do Consumidor.</p>
                        </Secao>
                        <Secao titulo="Privacidade">
                            <p>O tratamento dos seus dados está descrito na <button onClick={() => irPagina('privacidade')} className="text-elora-gold font-semibold hover:underline">Política de Privacidade</button>.</p>
                        </Secao>
                        <Secao titulo="Contato">
                            <p>Dúvidas sobre estes termos? Fale com a gente {contato}.</p>
                        </Secao>
                    </React.Fragment>
                )
            };

            return (
                <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 animate-fade-in">
                    <button onClick={voltar} className="flex items-center gap-2 text-slate-400 hover:text-elora-gold mb-8 text-xs uppercase tracking-widest font-semibold transition-colors"><Icon name="arrow-left" className="w-4 h-4" /> Voltar à Loja</button>
                    <h2 className="text-3xl sm:text-4xl font-serif mb-2">{PAGINAS_LEGAIS[pagina]}</h2>
                    <p className="text-xs text-slate-400 mb-10">Última atualização: {ATUALIZACAO_LEGAL}</p>
                    {conteudo[pagina]}
                    <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 text-xs">
                        {Object.entries(PAGINAS_LEGAIS).filter(([k]) => k !== pagina).map(([k, nome]) => (
                            <button key={k} onClick={() => irPagina(k)} className="text-elora-gold font-bold uppercase tracking-widest hover:underline">{nome} →</button>
                        ))}
                    </div>
                </div>
            );
        }

        function AvisoCookies({ irPagina, darkMode }) {
            const [visivel, setVisivel] = useState(() => { try { return localStorage.getItem('elora_cookies_ok') !== '1'; } catch (e) { return true; } });
            if (!visivel) return null;
            const ok = () => { try { localStorage.setItem('elora_cookies_ok', '1'); } catch (e) {} setVisivel(false); };
            return (
                <div className="fixed bottom-0 inset-x-0 z-[60] p-3 sm:p-4 sm:pr-24 animate-fade-in" role="dialog" aria-label="Aviso de cookies">
                    <div className={`max-w-3xl mx-auto ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border shadow-2xl rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4`}>
                        <Icon name="cookie" className="w-6 h-6 text-elora-gold shrink-0 hidden sm:block" />
                        <p className="text-xs sm:text-sm leading-relaxed flex-1">
                            Usamos apenas o armazenamento essencial do navegador para manter seu login, sua sacola e seus favoritos. Não usamos cookies de publicidade. Saiba mais na nossa <button onClick={() => irPagina('privacidade')} className="text-elora-gold font-semibold hover:underline">Política de Privacidade</button>.
                        </p>
                        <button onClick={ok} className="w-full sm:w-auto bg-elora-gold text-white px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-md hover:bg-slate-900 transition-colors shrink-0">Entendi</button>
                    </div>
                </div>
            );
        }

        function WhatsAppButton() {
            return (
                <a href={linkWhats("Olá, Elora Parfums! Preciso de ajuda no site.")} aria-label="Falar no WhatsApp" target="_blank" rel="noreferrer" 
                   className="fixed bottom-6 right-6 bg-[#25D366] p-3.5 rounded-full shadow-2xl hover:bg-[#128C7E] transition-colors z-50 flex items-center justify-center hover:scale-110">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                </a>
            );
        }

        function LogoPremium({ onClick, isSmall = false, darkMode, compacto = false }) {
            const textColor = darkMode ? 'text-elora-gold' : 'text-elora-deepblue';
            const lineColor = darkMode ? 'bg-elora-gold' : 'bg-elora-deepblue';
            if (compacto) return (
                <div className="font-cinzel cursor-pointer flex flex-col items-start leading-none" onClick={onClick} role="link" aria-label="Elora Parfums - início">
                    <span className={`text-[26px] tracking-[0.14em] uppercase font-semibold pb-0.5 ${textColor}`}>ELORA</span>
                    <div className="flex items-center gap-1.5 pl-[2px]">
                        <span className={`block w-3 h-[1px] ${lineColor}`}></span>
                        <span className={`text-[8px] tracking-[0.32em] font-serif font-medium uppercase ${textColor}`}>Parfums</span>
                        <span className={`block w-3 h-[1px] ${lineColor}`}></span>
                    </div>
                </div>
            );
            
            return (
                <div className={`font-cinzel cursor-pointer flex flex-col items-center leading-none ${isSmall ? 'scale-75' : ''}`} onClick={onClick}>
                    <span className={`text-3xl sm:text-4xl md:text-5xl tracking-[0.15em] uppercase font-semibold drop-shadow-sm pb-1 ${textColor} transition-colors`}>ELORA</span>
                    <div className="flex items-center justify-center gap-2">
                        <span className={`block w-5 sm:w-7 h-[1px] ${lineColor} transition-colors`}></span>
                        <span className={`text-[10px] sm:text-[12px] tracking-[0.3em] font-serif font-medium uppercase ${textColor} transition-colors`}>Parfums</span>
                        <span className={`block w-5 sm:w-7 h-[1px] ${lineColor} transition-colors`}></span>
                    </div>
                </div>
            );
        }

        // CARTÃO DE PRODUTO AGORA RECEBE isFav E onToggleFav DE FORA
        function ProductCard({ produto, onClick, onAddToCart, onBuyNow, darkMode, isFav, onToggleFav }) {
            const [imgIndex, setImgIndex] = useState(0);
            
            const imagens = (produto.imagens && produto.imagens.filter(Boolean).length > 0) 
                ? produto.imagens.filter(Boolean) 
                : [produto.imagem || './royal-amber.jpeg'];

            const currentImg = imagens[imgIndex] || imagens[0];
            const precoSeguro = Number(produto.preco) || 0;
            const numVendidos = parseInt(produto.vendidos) || 0;
            const esgotado = estaEsgotado(produto);

            const nextImg = (e) => { e.preventDefault(); e.stopPropagation(); setImgIndex((prev) => (prev + 1) % imagens.length); };
            const prevImg = (e) => { e.preventDefault(); e.stopPropagation(); setImgIndex((prev) => (prev === 0 ? imagens.length - 1 : prev - 1)); };
            const toggleFav = (e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(); };
            
            const shareWhats = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const text = encodeURIComponent(`Olha este perfume incrível na Elora Parfums: ${produto.marca} ${produto.nome} por ${brl(precoSeguro)}!\n\n${linkProduto(produto)}`);
                window.open(`https://wa.me/?text=${text}`, '_blank');
            };

            return (
                <div className={`group flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border shadow-lg hover:shadow-2xl transition-all duration-500 p-4 sm:p-5 rounded-xl relative`}>
                    <div className="absolute top-6 right-6 z-30 flex flex-col gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={toggleFav} className="bg-white/90 dark:bg-slate-800/90 p-2 rounded-full shadow hover:scale-110 transition-transform">
                            <Icon name="heart" className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                        </button>
                        <button onClick={shareWhats} className="bg-white/90 dark:bg-slate-800/90 p-2 rounded-full shadow hover:scale-110 transition-transform hover:text-green-500">
                            <Icon name="share-2" className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>

                    <div className="relative aspect-[4/5] bg-slate-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center p-4 mb-5 rounded-md cursor-pointer group/img" onClick={() => onClick(produto)}>
                        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 items-start">
                            {produto.categoria && <span className="bg-elora-gold text-white text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm">{produto.categoria}</span>}
                            {produto.familia && <span className="bg-slate-900/80 backdrop-blur-sm text-slate-100 text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm">{produto.familia}</span>}
                            {esgotado && <span className="bg-red-600 text-white text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm">Esgotado</span>}
                        </div>
                        {descontoPct(produto) > 0 && !esgotado && <span className="absolute bottom-3 left-3 z-20 bg-red-600 text-white text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full shadow-md">{descontoPct(produto)}% OFF</span>}
                        
                        <img src={currentImg} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700 rounded-md shadow-sm" alt={produto.nome} />
                        
                        {imagens.length > 1 && (
                            <React.Fragment>
                                <button onClick={prevImg} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full text-slate-800 opacity-100 lg:opacity-0 lg:group-hover/img:opacity-100 transition-opacity shadow-md z-20"><Icon name="chevron-left" className="w-4 h-4"/></button>
                                <button onClick={nextImg} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full text-slate-800 opacity-100 lg:opacity-0 lg:group-hover/img:opacity-100 transition-opacity shadow-md z-20"><Icon name="chevron-right" className="w-4 h-4"/></button>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm z-20">
                                    {imgIndex + 1} / {imagens.length}
                                </div>
                            </React.Fragment>
                        )}

                        <div className="absolute inset-0 bg-black/30 opacity-0 lg:group-hover/img:opacity-100 flex items-center justify-center transition-opacity duration-300 pointer-events-none z-10">
                            <span className="text-white text-xs font-bold uppercase tracking-widest border border-white px-4 py-2 rounded shadow-lg backdrop-blur-sm">Ver Detalhes</span>
                        </div>
                    </div>
                    
                    <div className="text-center mt-auto flex flex-col items-center z-20 relative">
                        <span className="text-elora-gold text-[10px] font-bold uppercase tracking-widest mb-1 block">{produto.marca}</span>
                        <h3 className="text-lg font-serif mb-1 hover:text-elora-gold transition-colors cursor-pointer leading-tight" onClick={() => onClick(produto)}>{produto.nome}</h3>
                        
                        {numVendidos > 0 ? (
                            <div className="flex items-center gap-1 mb-2 mt-1">
                                <Icon name="flame" className="w-3 h-3 text-orange-500" />
                                <span className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase">{numVendidos} {numVendidos === 1 ? 'vendido' : 'vendidos'}</span>
                            </div>
                        ) : <div className="mb-2"></div>}

                        <div className="mb-5 w-full"><BlocoPreco produto={produto} /></div>

                        {esgotado ? (
                            <div className="w-full py-3 text-[10px] font-bold uppercase tracking-widest rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 text-center">Esgotado</div>
                        ) : (
                        <div className="grid grid-cols-2 gap-2 w-full">
                            <button onClick={() => onAddToCart(produto)} className="w-full border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-md flex justify-center items-center gap-1.5" title="Adicionar à Sacola">
                                <Icon name="shopping-bag" className="w-4 h-4" /> Sacola
                            </button>
                            <button onClick={() => onBuyNow(produto)} className="w-full bg-elora-gold border border-elora-gold text-white py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-900 hover:border-slate-900 transition-all rounded-md flex justify-center items-center gap-1.5 shadow-lg shadow-elora-gold/20">
                                <Icon name="zap" className="w-4 h-4" /> Comprar
                            </button>
                        </div>
                        )}
                    </div>
                </div>
            );
        }

        // PÁGINA "MEUS FAVORITOS"
        function FavoritesPage({ produtos, favorites, onToggleFav, onAddToCart, onBuyNow, darkMode, voltarParaLoja, onSwitchProduct }) {
            const favoritedProducts = produtos.filter(p => favorites.includes(p.id));

            return (
                <div className="max-w-7xl mx-auto px-4 py-12 sm:py-20 animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 md:mb-12 border-b border-slate-200 dark:border-slate-800 pb-6">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-serif">Meus Favoritos</h2>
                            <p className="text-slate-400 mt-1 text-sm">{favoritedProducts.length} {favoritedProducts.length === 1 ? 'fragrância salva' : 'fragrâncias salvas'}</p>
                        </div>
                        <button onClick={voltarParaLoja} className="flex items-center gap-2 text-slate-400 hover:text-elora-gold text-xs font-semibold uppercase tracking-widest transition-colors"><Icon name="arrow-left" className="w-4 h-4" /> Voltar à Loja</button>
                    </div>

                    {favoritedProducts.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8">
                            <Icon name="heart" className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4 opacity-80" />
                            <h3 className="text-2xl font-serif mb-2">Sua lista de desejos está vazia</h3>
                            <p className="text-slate-500 mb-6">Explore nosso catálogo e salve as suas fragrâncias favoritas para não as perder de vista.</p>
                            <button onClick={voltarParaLoja} className="bg-elora-gold text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-900 transition-colors rounded-md shadow-lg shadow-elora-gold/20">Ver Catálogo</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                            {favoritedProducts.map((produto) => (
                                <ProductCard 
                                    key={produto.id} 
                                    produto={produto} 
                                    onClick={onSwitchProduct} 
                                    onAddToCart={onAddToCart} 
                                    onBuyNow={onBuyNow}
                                    darkMode={darkMode}
                                    isFav={true}
                                    onToggleFav={() => onToggleFav(produto.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        function ProductModal({ produto, todosProdutos, onSwitchProduct, onClose, onAddToCart, onBuyNow, darkMode }) {
            const [imgAtiva, setImgAtiva] = useState(0);
            
            const imagensArray = (produto.imagens && produto.imagens.filter(Boolean).length > 0) ? produto.imagens.filter(Boolean) : [produto.imagem || './royal-amber.jpeg'];
            const precoSeguro = Number(produto.preco) || 0;
            const numVendidos = parseInt(produto.vendidos) || 0;
            const [copiado, setCopiado] = useState(false);
            const compartilhar = async () => {
                const url = linkProduto(produto);
                const titulo = `${produto.marca} ${produto.nome} | Elora Parfums`;
                try {
                    if (navigator.share) { await navigator.share({ title: titulo, url }); return; }
                } catch (e) { if (e && e.name === 'AbortError') return; }
                try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
                catch (e) { window.open(`https://wa.me/?text=${encodeURIComponent(titulo + '\n' + url)}`, '_blank'); }
            };

            const similares = todosProdutos.filter(p => p.id !== produto.id && (p.familia === produto.familia || p.categoria === produto.categoria)).slice(0, 4);

            return (
                <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className={`${darkMode ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'} border p-6 sm:p-8 max-w-4xl w-full relative animate-fade-in shadow-2xl rounded-2xl flex flex-col max-h-[90vh] overflow-y-auto`}>
                        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-elora-gold transition-colors z-20"><Icon name="x" className="w-6 h-6" /></button>
                        
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="w-full md:w-1/2 flex flex-col gap-4">
                                <div className={`flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded-xl p-4 h-72 sm:h-96 relative`}>
                                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
                                        {produto.categoria && <span className="bg-elora-gold text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm">{produto.categoria}</span>}
                                        {produto.familia && <span className="bg-slate-900/80 backdrop-blur-sm text-slate-100 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm">{produto.familia}</span>}
                                        {descontoPct(produto) > 0 && <span className="bg-red-600 text-white text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full shadow-md">{descontoPct(produto)}% OFF</span>}
                                    </div>
                                    <img src={imagensArray[imgAtiva] || imagensArray[0]} loading="lazy" decoding="async" alt={produto.nome} className="w-full h-full object-contain rounded-md transition-opacity duration-300" />
                                </div>
                                {imagensArray.length > 1 && (
                                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                                        {imagensArray.map((img, index) => (
                                            <button key={index} onClick={() => setImgAtiva(index)} className={`flex-shrink-0 w-16 h-16 rounded-md border-2 overflow-hidden transition-all ${imgAtiva === index ? 'border-elora-gold opacity-100 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                                                <img src={img} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="w-full md:w-1/2 flex flex-col">
                                <span className="text-elora-gold text-[10px] font-bold uppercase tracking-widest mb-1">{produto.marca}</span>
                                <h2 className="text-3xl sm:text-4xl font-serif mb-2 leading-tight">{produto.nome}</h2>
                                
                                <div className="flex items-center justify-between gap-3 mb-4 text-slate-500">
                                    {numVendidos > 0 ? (
                                        <span className="flex items-center gap-1"><Icon name="flame" className="w-4 h-4 text-orange-500" /><span className="text-xs font-semibold tracking-wider uppercase">{numVendidos} {numVendidos === 1 ? 'vendido' : 'vendidos'}</span></span>
                                    ) : <span></span>}
                                    <button onClick={compartilhar} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest hover:text-elora-gold transition-colors">
                                        <Icon name={copiado ? "check" : "share-2"} className="w-4 h-4" /> {copiado ? 'Link copiado!' : 'Compartilhar'}
                                    </button>
                                </div>

                                <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-6"><BlocoPreco produto={produto} grande /></div>
                                
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700 mb-8">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                        <Icon name="wind" className="w-4 h-4 text-elora-gold"/> Pirâmide Olfativa
                                    </h4>
                                    <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                                        <div className="flex gap-3"><span className="font-bold w-16 uppercase tracking-wider text-[9px] pt-0.5 text-slate-400">Topo</span> <span>{produto.notasTopo || 'Notas frescas, florais brancas e cítricas.'}</span></div>
                                        <div className="flex gap-3"><span className="font-bold w-16 uppercase tracking-wider text-[9px] pt-0.5 text-slate-400">Coração</span> <span>{produto.notasCoracao || 'Especiarias orientais, jasmim e lavanda.'}</span></div>
                                        <div className="flex gap-3"><span className="font-bold w-16 uppercase tracking-wider text-[9px] pt-0.5 text-slate-400">Fundo</span> <span>{produto.notasFundo || 'Madeiras nobres, oud clássico e âmbar quente.'}</span></div>
                                    </div>
                                </div>
                                
                                {estaEsgotado(produto) ? (
                                    <div className="w-full mt-auto py-4 text-xs font-bold uppercase tracking-widest rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 text-center">Esgotado no momento</div>
                                ) : (
                                <div className="grid grid-cols-2 gap-3 w-full mt-auto">
                                    <button onClick={() => { onAddToCart(produto); onClose(); }} className="w-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-4 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-md flex items-center justify-center gap-2">
                                        <Icon name="shopping-bag" className="w-4 h-4" /> Adicionar à Sacola
                                    </button>
                                    <button onClick={() => { onBuyNow(produto); onClose(); }} className="w-full bg-elora-gold text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-slate-900 transition-colors rounded-md shadow-lg shadow-elora-gold/20 flex items-center justify-center gap-2">
                                        <Icon name="zap" className="w-4 h-4" /> Comprar Agora
                                    </button>
                                </div>
                                )}
                            </div>
                        </div>

                        {similares.length > 0 && (
                            <div className="w-full mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
                                <h3 className="text-xl sm:text-2xl font-serif mb-6 text-center">Você também vai amar...</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                                    {similares.map(sim => (
                                        <div key={sim.id} className="cursor-pointer group text-center" onClick={() => { setImgAtiva(0); onSwitchProduct(sim); }}>
                                            <div className="relative aspect-[4/5] bg-slate-50 dark:bg-slate-800 overflow-hidden rounded-md mb-3">
                                                <img src={sim.imagens ? sim.imagens[0] : sim.imagem} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={sim.nome} />
                                            </div>
                                            <p className="text-[9px] text-elora-gold font-bold uppercase tracking-widest mb-1">{sim.marca}</p>
                                            <p className="text-sm font-serif truncate hover:text-elora-gold transition-colors">{sim.nome}</p>
                                            <p className="text-xs font-bold mt-1 text-slate-700 dark:text-slate-200">{brl(Number(sim.preco))}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // ===== QUIZ: recomenda pelos 4 critérios =====
        const QUIZ_PERGUNTAS = [
            { campo: 'genero', pergunta: 'Para quem é a fragrância?', opcoes: [
                { valor: 'Feminino', texto: 'Para Ela', icone: 'flower-2' },
                { valor: 'Masculino', texto: 'Para Ele', icone: 'crown' },
                { valor: 'Todos', texto: 'Tanto faz / Presente', icone: 'gift' } ] },
            { campo: 'estilo', pergunta: 'Qual estilo de cheiro você mais gosta?', opcoes: [
                { valor: 'doce', texto: 'Doces & Gourmand', icone: 'candy' },
                { valor: 'floral', texto: 'Florais & Delicados', icone: 'flower' },
                { valor: 'amadeirado', texto: 'Madeiras, Oud & Especiarias', icone: 'trees' },
                { valor: 'fresco', texto: 'Frescos & Cítricos', icone: 'citrus' } ] },
            { campo: 'intensidade', pergunta: 'Qual a intensidade ideal?', opcoes: [
                { valor: 'suave', texto: 'Suave e Elegante', icone: 'feather' },
                { valor: 'forte', texto: 'Forte e Marcante', icone: 'flame' } ] },
            { campo: 'ocasiao', pergunta: 'Onde pretende usar essa joia?', opcoes: [
                { valor: 'dia', texto: 'Dia a dia e Trabalho', icone: 'sun' },
                { valor: 'noite', texto: 'Noite e Eventos Especiais', icone: 'moon' } ] }
        ];

        // Peso de cada família olfativa para cada resposta
        const QUIZ_FAMILIAS = {
            estilo: {
                doce: { Adocicado: 3, Oriental: 2, Floral: 1 },
                floral: { Floral: 3, Adocicado: 1, Fresco: 1 },
                amadeirado: { Amadeirado: 3, Especiado: 3, Oriental: 2 },
                fresco: { Fresco: 3, Floral: 1 }
            },
            intensidade: {
                suave: { Fresco: 2, Floral: 2, Adocicado: 1 },
                forte: { Oriental: 2, Amadeirado: 2, Especiado: 2, Adocicado: 1 }
            },
            ocasiao: {
                dia: { Fresco: 2, Floral: 2 },
                noite: { Oriental: 2, Amadeirado: 1, Especiado: 1, Adocicado: 1 }
            }
        };
        // Palavras nas notas que reforçam cada estilo
        const QUIZ_NOTAS = {
            doce: ['baunilha', 'caramelo', 'chocolate', 'mel', 'praliné', 'pralinê', 'açúcar', 'acucar', 'tonka', 'frutas vermelhas', 'café', 'cafe', 'coco'],
            floral: ['rosa', 'jasmim', 'flor', 'peônia', 'peonia', 'lírio', 'lirio', 'orquídea', 'orquidea', 'tuberosa', 'violeta', 'magnólia', 'magnolia'],
            amadeirado: ['oud', 'madeira', 'sândalo', 'sandalo', 'cedro', 'vetiver', 'patchouli', 'âmbar', 'ambar', 'couro', 'canela', 'cardamomo', 'açafrão', 'acafrao', 'pimenta', 'incenso', 'tabaco'],
            fresco: ['bergamota', 'limão', 'limao', 'laranja', 'cítric', 'citric', 'menta', 'hortelã', 'lavanda', 'marinh', 'aquátic', 'aquatic', 'maçã', 'maca', 'gengibre', 'chá', 'cha verde']
        };

        const recomendarPerfumes = (produtos, r) => {
            const disponiveis = produtos.filter(p => !estaEsgotado(p));
            let base = r.genero && r.genero !== 'Todos' ? disponiveis.filter(p => p.categoria === r.genero) : disponiveis;
            if (!base.length) base = disponiveis;
            return base.map(p => {
                const fam = p.familia || '';
                const notas = [p.notasTopo, p.notasCoracao, p.notasFundo].filter(Boolean).join(' ').toLowerCase();
                let pontos = 0;
                ['estilo', 'intensidade', 'ocasiao'].forEach(c => { pontos += ((QUIZ_FAMILIAS[c][r[c]] || {})[fam]) || 0; });
                const acertos = (QUIZ_NOTAS[r.estilo] || []).filter(k => notas.includes(k)).length;
                pontos += Math.min(acertos, 3);
                pontos += Math.min(parseInt(p.vendidos) || 0, 20) / 100; // desempate: mais vendidos
                return { p, pontos };
            }).sort((x, y) => y.pontos - x.pontos).map(x => x.p);
        };

        function QuizModal({ onClose, produtos, onAddToCart, onVerProduto, darkMode }) {
            const [step, setStep] = useState(0);
            const [respostas, setRespostas] = useState({});
            const [resultado, setResultado] = useState(null);

            const responder = (campo, valor) => {
                const novas = { ...respostas, [campo]: valor };
                setRespostas(novas);
                if (step < QUIZ_PERGUNTAS.length - 1) setStep(step + 1);
                else setResultado(recomendarPerfumes(produtos, novas).slice(0, 3));
            };
            const refazer = () => { setStep(0); setRespostas({}); setResultado(null); };
            const textoDe = (campo) => { const q = QUIZ_PERGUNTAS.find(x => x.campo === campo); const o = q && q.opcoes.find(x => x.valor === respostas[campo]); return o ? o.texto : ''; };

            const btn = `w-full border ${darkMode ? 'border-slate-800 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'} hover:border-elora-gold hover:text-elora-gold py-4 px-4 text-sm transition-all uppercase tracking-widest font-semibold rounded-md flex items-center justify-center gap-3`;
            const q = QUIZ_PERGUNTAS[step];
            const vazio = produtos.filter(p => !estaEsgotado(p)).length === 0;

            return (
                <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className={`${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border p-6 sm:p-10 max-w-lg w-full relative animate-fade-in shadow-2xl rounded-xl max-h-[92vh] overflow-y-auto`}>
                        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-elora-gold transition-colors z-20" aria-label="Fechar"><Icon name="x" className="w-6 h-6" /></button>
                        {vazio ? (
                            <div className="text-center py-8">
                                <Icon name="flask-conical" className="w-12 h-12 text-elora-gold mx-auto mb-6" />
                                <h3 className="text-2xl font-serif mb-2">Catálogo em preparação</h3>
                                <p className="text-slate-500 text-sm">Volte em breve para descobrir sua fragrância ideal.</p>
                            </div>
                        ) : !resultado ? (
                            <div className="text-center">
                                <Icon name="flask-conical" className="w-12 h-12 text-elora-gold mx-auto mb-5" />
                                <h3 className="text-3xl font-serif mb-2">Descubra sua Assinatura</h3>
                                <p className="text-slate-500 text-xs mb-4 tracking-widest uppercase font-semibold">Etapa {step + 1} de {QUIZ_PERGUNTAS.length}</p>
                                <div className="flex gap-1.5 justify-center mb-8">{QUIZ_PERGUNTAS.map((_, i) => <span key={i} className={`h-1 w-10 rounded-full ${i <= step ? 'bg-elora-gold' : 'bg-slate-200 dark:bg-slate-700'}`}></span>)}</div>
                                <div key={step} className="animate-fade-in space-y-3">
                                    <p className="text-lg text-slate-500 mb-6 font-medium">{q.pergunta}</p>
                                    {q.opcoes.map(o => (
                                        <button key={o.valor} onClick={() => responder(q.campo, o.valor)} className={btn}><Icon name={o.icone} className="w-4 h-4" /> {o.texto}</button>
                                    ))}
                                </div>
                                {step > 0 && <button onClick={() => setStep(step - 1)} className="mt-6 text-xs text-slate-400 hover:text-elora-gold uppercase tracking-widest font-semibold">← Voltar</button>}
                            </div>
                        ) : (
                            <div className="text-center animate-fade-in">
                                <h3 className="text-3xl font-serif text-elora-gold mb-2">Seu Par Perfeito</h3>
                                <p className="text-slate-500 text-xs mb-6">Para quem gosta de <strong>{textoDe('estilo').toLowerCase()}</strong>, {textoDe('intensidade').toLowerCase()}, para {textoDe('ocasiao').toLowerCase()}.</p>
                                {resultado.length === 0 ? <p className="text-slate-500 py-8">Nenhum perfume disponível agora.</p> : (
                                    <React.Fragment>
                                        <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'} border p-5 flex flex-col items-center mb-5 rounded-xl`}>
                                            <img src={getImagemPrincipal(resultado[0])} className="w-36 h-36 object-cover mb-4 rounded-md shadow-md cursor-pointer" alt={resultado[0].nome} onClick={() => onVerProduto(resultado[0])} />
                                            <span className="text-elora-gold text-[10px] font-bold uppercase tracking-widest block mb-1">{resultado[0].marca}</span>
                                            <h4 className="text-2xl font-serif">{resultado[0].nome}</h4>
                                            {resultado[0].familia && <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Família {resultado[0].familia}</p>}
                                            <p className="text-elora-gold font-medium text-xl mt-2">{brl((Number(resultado[0].preco) || 0))}</p>
                                            <div className="grid grid-cols-2 gap-2 w-full mt-4">
                                                <button onClick={() => onVerProduto(resultado[0])} className="border border-slate-300 dark:border-slate-600 py-3 text-[10px] font-bold uppercase tracking-widest rounded-md hover:border-elora-gold">Ver Detalhes</button>
                                                <button onClick={() => onAddToCart(resultado[0])} className="bg-elora-gold text-white py-3 text-[10px] font-bold uppercase tracking-widest rounded-md hover:bg-slate-900 transition-colors">Adicionar à Sacola</button>
                                            </div>
                                        </div>
                                        {resultado.length > 1 && (
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">Também combinam com você</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {resultado.slice(1).map(p => (
                                                        <button key={p.id} onClick={() => onVerProduto(p)} className="text-left group">
                                                            <img src={getImagemPrincipal(p)} className="w-full aspect-square object-cover rounded-md mb-2 group-hover:opacity-80" alt={p.nome} />
                                                            <p className="text-[9px] text-elora-gold font-bold uppercase tracking-widest">{p.marca}</p>
                                                            <p className="text-sm font-serif truncate">{p.nome}</p>
                                                            <p className="text-xs font-bold">{brl((Number(p.preco) || 0))}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                )}
                                <button onClick={refazer} className="mt-6 text-xs text-slate-400 hover:text-elora-gold uppercase tracking-widest font-semibold">Refazer o quiz</button>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        function AuthModal({ onClose, onSuccess, mensagemExtra, darkMode }) {
            const [viewMode, setViewMode] = useState('login'); 
            const [loading, setLoading] = useState(false);
            const [formData, setFormData] = useState({ nome: '', email: '', telefone: '', cpf: '', senha: '', confirmarSenha: '' });
            const [aceiteTermos, setAceiteTermos] = useState(false);

            const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

            const checkPasswordStrength = (pass) => {
                let score = 0;
                if (pass.length >= 6) score++;
                if (/[A-Z]/.test(pass)) score++;
                if (/[a-z]/.test(pass)) score++;
                if (/[0-9]/.test(pass)) score++;
                if (/[^A-Za-z0-9]/.test(pass)) score++;
                return score;
            };

            const strengthScore = checkPasswordStrength(formData.senha);
            let strengthColor = "bg-slate-200 dark:bg-slate-700";
            let strengthLabel = "";
            if (formData.senha.length > 0) {
                if (strengthScore <= 2) { strengthColor = "bg-red-500"; strengthLabel = "Fraca"; }
                else if (strengthScore === 3 || strengthScore === 4) { strengthColor = "bg-yellow-400"; strengthLabel = "Média"; }
                else if (strengthScore === 5) { strengthColor = "bg-emerald-500"; strengthLabel = "Forte"; }
            }

            const handleSubmit = async (e) => {
                e.preventDefault();
                const { db, auth, doc, setDoc, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } = await getFb();
                const email = formData.email.trim().toLowerCase();

                if (viewMode === 'register') {
                    if (formData.senha !== formData.confirmarSenha) { alert("As senhas não coincidem. Por favor, verifique a digitação."); return; }
                    if (!aceiteTermos) { alert("Para criar sua conta, é preciso aceitar os Termos de Uso e a Política de Privacidade."); return; }
                    if (strengthScore < 5) { alert("Sua senha precisa ter pelo menos 6 caracteres, com letra maiúscula, minúscula, número e um caractere especial (!@#$)."); return; }
                }

                setLoading(true);
                try {
                    if (viewMode === 'forgot') {
                        try { await sendPasswordResetEmail(auth, email); } catch (err) {
                            if (err.code === 'auth/invalid-email') { alert('E-mail inválido.'); return; }
                        }
                        // Mensagem neutra: não revela se o e-mail tem conta.
                        alert("Se houver uma conta com este e-mail, você receberá um link para redefinir a senha em instantes. Confira também a caixa de spam.");
                        setViewMode('login');
                        return;
                    }

                    if (viewMode === 'register') {
                        const cred = await createUserWithEmailAndPassword(auth, email, formData.senha);
                        const perfil = { nome: formData.nome.trim(), email, cpf: formData.cpf.trim(), telefone: formData.telefone.trim(), dataCadastro: new Date().toISOString(), aceiteTermosEm: new Date().toISOString(), versaoTermos: ATUALIZACAO_LEGAL };
                        await setDoc(doc(db, 'usuarios', cred.user.uid), perfil);
                        onSuccess({ uid: cred.user.uid, email, nome: perfil.nome, cpf: perfil.cpf, telefone: perfil.telefone, role: ADMIN_UIDS.includes(cred.user.uid) ? 'admin' : 'cliente' });
                        return;
                    }

                    const cred = await signInWithEmailAndPassword(auth, email, formData.senha);
                    onSuccess(await montarUsuario(cred.user));
                } catch (err) {
                    console.error(err);
                    alert(traduzirErroAuth(err.code));
                    if (err.code === 'auth/email-already-in-use') setViewMode('login');
                } finally {
                    setLoading(false);
                }
            };

            return (
                <div className="fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md">
                    <div className={`${darkMode ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'} border p-6 sm:p-8 max-w-md w-full relative animate-fade-in shadow-2xl rounded-2xl max-h-[95vh] overflow-y-auto`}>
                        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-elora-gold transition-colors z-20" aria-label="Fechar"><Icon name="x" className="w-6 h-6" /></button>
                        
                        <div className="text-center mb-6 mt-2">
                            <Icon name={viewMode === 'forgot' ? "key" : "user"} className="w-10 h-10 text-elora-gold mx-auto mb-2" />
                            <h3 className="text-2xl font-serif">
                                {viewMode === 'login' ? 'Acessar Sua Conta' : viewMode === 'register' ? 'Criar Sua Conta' : 'Recuperar Senha'}
                            </h3>
                            {viewMode === 'forgot' && <p className="text-xs text-slate-500 mt-2">Enviaremos um link de redefinição para o seu e-mail.</p>}
                            {mensagemExtra && viewMode === 'login' && <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-md mt-2 font-medium">{mensagemExtra}</p>}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {viewMode === 'register' && <div><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Nome Completo *</label><input name="nome" value={formData.nome} onChange={handleChange} required className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`} placeholder="Ex: Maria Silva" /></div>}
                            
                            <div><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">E-mail *</label><input type="email" autoComplete="email" name="email" value={formData.email} onChange={handleChange} required className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`} placeholder="seu@email.com" /></div>
                            
                            {viewMode === 'register' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">CPF *</label><input name="cpf" value={formData.cpf} onChange={handleChange} required className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`} placeholder="000.000.000-00" /></div>
                                    <div><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">WhatsApp *</label><input name="telefone" value={formData.telefone} onChange={handleChange} required className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`} placeholder="(11) 99999-9999" /></div>
                                </div>
                            )}

                            {viewMode !== 'forgot' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Senha *</label>
                                        <input type="password" name="senha" value={formData.senha} onChange={handleChange} required className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`} placeholder="••••••••" />
                                        
                                        {viewMode === 'register' && (
                                            <div className="mt-2">
                                                <div className="flex gap-1 h-1 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                                                    <div className={`h-full transition-all duration-300 ${strengthScore >= 1 ? strengthColor : 'bg-transparent'} w-1/5`}></div>
                                                    <div className={`h-full transition-all duration-300 ${strengthScore >= 2 ? strengthColor : 'bg-transparent'} w-1/5`}></div>
                                                    <div className={`h-full transition-all duration-300 ${strengthScore >= 3 ? strengthColor : 'bg-transparent'} w-1/5`}></div>
                                                    <div className={`h-full transition-all duration-300 ${strengthScore >= 4 ? strengthColor : 'bg-transparent'} w-1/5`}></div>
                                                    <div className={`h-full transition-all duration-300 ${strengthScore >= 5 ? strengthColor : 'bg-transparent'} w-1/5`}></div>
                                                </div>
                                                <p className="text-[9px] text-slate-500 mt-1 flex justify-between">
                                                    <span>Mín. 6 chars, Maiúscula, número e !@#$</span>
                                                    {strengthLabel && <strong className={strengthScore < 5 ? "text-slate-500" : "text-emerald-500"}>{strengthLabel}</strong>}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {viewMode === 'register' && (
                                        <div>
                                            <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Confirmar Senha *</label>
                                            <input type="password" name="confirmarSenha" value={formData.confirmarSenha} onChange={handleChange} required className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`} placeholder="••••••••" />
                                            {formData.confirmarSenha && formData.senha !== formData.confirmarSenha && <p className="text-[10px] text-red-500 mt-1">As senhas não coincidem.</p>}
                                        </div>
                                    )}
                                </div>
                            )}

                            {viewMode === 'register' && (
                                <label className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer leading-relaxed">
                                    <input type="checkbox" checked={aceiteTermos} onChange={e => setAceiteTermos(e.target.checked)} className="mt-0.5 w-4 h-4 accent-elora-gold shrink-0" />
                                    <span>Li e aceito os <a href="#termos" target="_blank" rel="noreferrer" className="text-elora-gold font-semibold hover:underline">Termos de Uso</a> e a <a href="#privacidade" target="_blank" rel="noreferrer" className="text-elora-gold font-semibold hover:underline">Política de Privacidade</a>.</span>
                                </label>
                            )}

                            <button type="submit" disabled={loading} className="w-full bg-elora-gold text-white py-4 mt-2 text-xs font-bold uppercase tracking-widest hover:bg-slate-900 transition-colors rounded-md shadow-lg shadow-elora-gold/20 flex items-center justify-center gap-2">
                                {loading ? <Icon name="loader-2" className="w-5 h-5 animate-spin" /> : (viewMode === 'login' ? 'Entrar na Conta' : viewMode === 'register' ? 'Cadastrar e Continuar' : 'Enviar Link de Recuperação')}
                            </button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs font-medium">
                            {viewMode === 'login' && (
                                <div className="flex justify-between items-center">
                                    <button type="button" onClick={() => setViewMode('register')} className="text-slate-500 hover:text-elora-gold transition-colors font-bold uppercase tracking-wider text-[10px]">Criar conta</button>
                                    <button type="button" onClick={() => setViewMode('forgot')} className="text-slate-500 hover:text-elora-gold transition-colors font-bold uppercase tracking-wider text-[10px]">Esqueci minha senha</button>
                                </div>
                            )}
                            {viewMode !== 'login' && (
                                <div className="text-center">
                                    <button type="button" onClick={() => setViewMode('login')} className="text-slate-500 hover:text-elora-gold transition-colors flex items-center justify-center gap-1 mx-auto font-bold uppercase tracking-wider text-[10px]"><Icon name="arrow-left" className="w-3 h-3"/> Voltar para o Login</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        function CartSidebar({ isOpen, onClose, cart, removeFromCart, alterarQtd, onCheckout, darkMode }) {
            if (!isOpen) return null;
            const total = totalCarrinho(cart);

            return (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
                    <div className={`${darkMode ? 'bg-slate-900 text-slate-100 border-l-slate-800' : 'bg-white text-slate-900 border-l-slate-200'} w-full sm:w-96 h-full relative z-10 flex flex-col animate-slide-in-right border-l shadow-2xl`}>
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-serif flex items-center gap-2"><Icon name="shopping-bag" className="w-5 h-5 text-elora-gold" /> Sua Sacola</h2>
                            <button onClick={onClose} className="text-slate-400 hover:text-elora-gold transition-colors"><Icon name="x" className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {cart.length === 0 ? (
                                <div className="text-center text-slate-400 py-12">
                                    <p className="mb-4">Sua sacola está vazia.</p>
                                    <button onClick={onClose} className="text-elora-gold font-bold text-xs uppercase tracking-widest hover:underline">Continuar comprando</button>
                                </div>
                            ) : (
                                cart.map((item) => (
                                    <div key={item.id} className="flex gap-4 items-center">
                                        <img src={getImagemPrincipal(item)} loading="lazy" alt={item.nome} className="w-16 h-16 object-cover rounded-md bg-slate-100 dark:bg-slate-800" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-serif text-sm truncate">{item.nome}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.marca}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-md">
                                                    <button onClick={() => alterarQtd(item.id, -1)} className="px-2 py-1 text-slate-500 hover:text-elora-gold" aria-label="Diminuir"><Icon name="minus" className="w-3 h-3" /></button>
                                                    <span className="text-xs font-bold w-6 text-center">{qtdItem(item)}</span>
                                                    <button onClick={() => alterarQtd(item.id, 1)} className="px-2 py-1 text-slate-500 hover:text-elora-gold" aria-label="Aumentar"><Icon name="plus" className="w-3 h-3" /></button>
                                                </div>
                                                <p className="font-medium text-sm">{brl(((Number(item.preco) || 0) * qtdItem(item)))}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-2" aria-label="Remover"><Icon name="trash-2" className="w-4 h-4" /></button>
                                    </div>
                                ))
                            )}
                        </div>
                        {cart.length > 0 && (
                            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex justify-between font-serif text-xl mb-1"><span>Subtotal</span><span className="text-elora-gold">{brl(total)}</span></div>
                                <p className="text-[10px] text-slate-500 mb-5 text-right">Frete calculado no próximo passo</p>
                                <button onClick={onCheckout} className="w-full bg-elora-gold text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-slate-900 transition-colors rounded-md shadow-lg shadow-elora-gold/20">Finalizar Compra</button>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        function Checkout({ cart, user, voltarParaLoja, darkMode }) {
            const cfg = useContext(ConfigLoja);
            const [loading, setLoading] = useState(false);
            const [endereco, setEndereco] = useState({ cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' });
            
            const [freteValor, setFreteValor] = useState(0);
            const [freteTipo, setFreteTipo] = useState('');
            const [freteId, setFreteId] = useState('');
            const [freteOpcoes, setFreteOpcoes] = useState([]);
            const [buscandoFrete, setBuscandoFrete] = useState(false);

            const [cupomInput, setCupomInput] = useState('');
            const [cupomAtivo, setCupomAtivo] = useState(null);
            const [verificandoCupom, setVerificandoCupom] = useState(false);

            const totalProdutos = totalCarrinho(cart);
            
            const descontoCupom = cupomAtivo ? (Number(cupomAtivo.descontoProdutos) || 0) : 0;
            const descontoFrete = (cupomAtivo && cupomAtivo.freteGratis) ? freteValor : 0;
            const totalComFrete = Math.round((totalProdutos - descontoCupom + freteValor - descontoFrete) * 100) / 100;
            
            const handleChange = (e) => {
                setEndereco({ ...endereco, [e.target.name]: e.target.value });
                if (e.target.name === 'cep') { setFreteOpcoes([]); setFreteValor(0); setFreteTipo(''); setFreteId(''); }
            };

            const calcularFreteViaCep = async () => {
                const cepLimpo = endereco.cep.replace(/\D/g, '');
                if (cepLimpo.length !== 8) {
                    alert("Digite um CEP válido com 8 dígitos (Apenas números).");
                    return;
                }
                
                setBuscandoFrete(true);
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
                    const data = await response.json();
                    
                    if (data.erro) {
                        alert("CEP não encontrado.");
                        setBuscandoFrete(false);
                        return;
                    }

                    setEndereco(prev => ({ ...prev, rua: data.logradouro || prev.rua, bairro: data.bairro || prev.bairro, cidade: data.localidade, uf: data.uf }));

                    // Frete real (Melhor Envio) calculado no servidor
                    const r = await fetch('/api/frete', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cep: cepLimpo, itens: cart.map(i => ({ id: i.id, qtd: qtdItem(i) })) })
                    });
                    const cot = await r.json().catch(() => ({}));
                    if (!r.ok || !Array.isArray(cot.opcoes) || !cot.opcoes.length) {
                        alert(cot.erro || "Não foi possível calcular o frete agora. Tente novamente em instantes.");
                        setBuscandoFrete(false);
                        return;
                    }
                    setFreteOpcoes(cot.opcoes.map(o => ({ id: o.id, tipo: o.nome, prazo: o.prazo, valor: o.valor })));
                    setFreteValor(0); setFreteTipo(''); setFreteId('');

                } catch (error) {
                    alert("Erro de conexão ao buscar o CEP.");
                }
                setBuscandoFrete(false);
            };

            const aplicarCupom = async () => {
                const codigo = cupomInput.toUpperCase().trim();
                if (!codigo) return;
                setVerificandoCupom(true);
                try {
                    const { auth } = await getFb();
                    const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
                    const r = await fetch('/api/cupom', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ codigo, itens: cart.map(i => ({ id: i.id, qtd: qtdItem(i) })) })
                    });
                    const d = await r.json().catch(() => ({}));
                    if (r.ok && d.ok) {
                        setCupomAtivo(d);
                        setCupomInput(d.codigo);
                        if (d.freteGratis && freteValor === 0) alert(`Cupom aplicado: ${d.descricao}! Calcule o frete pelo CEP para ver o desconto.`);
                    } else {
                        alert(d.erro || "Cupom inválido ou expirado.");
                    }
                } catch (e) {
                    console.error(e);
                    alert("Erro ao validar o cupom. Tente novamente.");
                }
                setVerificandoCupom(false);
            };

            const processarPedido = async (e) => {
                e.preventDefault();
                if (freteValor === 0) {
                    alert(freteOpcoes.length > 0 ? "Por favor, selecione uma opção de frete antes de continuar." : "Digite seu CEP e clique em Calcular para escolher o frete.");
                    return;
                }

                setLoading(true);
                const orderNsu = "ELORA-" + Date.now();
                const clienteCompleto = { nome: user.nome, email: user.email, cpf: user.cpf, telefone: user.telefone, ...endereco };

                let pedidoId;
                try {
                    const { db, collection, addDoc } = await getFb();
                    const ref = await addDoc(collection(db, "pedidos"), {
                        order_nsu: orderNsu, uid: user.uid, cliente: clienteCompleto,
                        itens: cart.map(i => ({ id: i.id, nome: i.nome, marca: i.marca, preco: Number(i.preco) || 0, qtd: qtdItem(i), imagem: getImagemPrincipal(i) })),
                        valorProdutos: totalProdutos, valorFrete: freteValor, freteTipo: freteTipo, freteServicoId: freteId,
                        cupom: cupomAtivo ? cupomAtivo.codigo : null,
                        descontoCupom: descontoCupom, descontoFrete: descontoFrete, valorTotal: totalComFrete,
                        dataCriacao: new Date().toISOString(), status: "Aguardando Pagamento"
                    });
                    pedidoId = ref.id;
                } catch (err) {
                    console.error("Erro no Firebase", err);
                    alert("Não foi possível registrar seu pedido. Verifique sua conexão e tente novamente.");
                    setLoading(false);
                    return;
                }

                // O servidor recalcula preços, frete e cupom e cria o link de pagamento
                try {
                    const { auth } = await getFb();
                    const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
                    const resposta = await fetch('/api/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ pedidoId })
                    });
                    const dados = await resposta.json().catch(() => ({}));

                    if (resposta.ok && dados.url) {
                        window.location.href = dados.url;
                    } else {
                        alert(dados.erro || "Não foi possível abrir o pagamento. Tente novamente.");
                        if (resposta.status === 409) { setFreteOpcoes([]); setFreteValor(0); setFreteId(''); setFreteTipo(''); }
                        if (dados.cupomInvalido) { setCupomAtivo(null); setCupomInput(''); }
                        setLoading(false);
                    }
                } catch (erro) {
                    console.error(erro);
                    alert("Erro ao tentar abrir a plataforma de pagamento.");
                    setLoading(false);
                }
            };

            return (
                <div className="max-w-7xl mx-auto px-4 py-8 lg:py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 animate-fade-in">
                    <div>
                        <button onClick={voltarParaLoja} className="flex items-center gap-2 text-slate-400 hover:text-elora-gold mb-6 text-xs uppercase tracking-widest font-semibold transition-colors"><Icon name="arrow-left" className="w-4 h-4" /> Voltar ao Carrinho</button>
                        <form onSubmit={processarPedido} className="space-y-6">
                            <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border p-6 sm:p-8 shadow-xl rounded-xl`}>
                                <h3 className="text-xl font-serif mb-6 flex items-center gap-3"><Icon name="map-pin" className="text-elora-gold w-5 h-5" /> Endereço e Entrega</h3>
                                
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-6">
                                    <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-semibold">Calcular Frete Automático</label>
                                    <div className="flex gap-2">
                                        <input name="cep" value={endereco.cep} onChange={handleChange} maxLength="9" className={`flex-1 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`} placeholder="Digite seu CEP (Somente números)" />
                                        <button type="button" onClick={calcularFreteViaCep} disabled={buscandoFrete} className="bg-slate-800 dark:bg-slate-700 text-white px-4 py-3 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-elora-gold transition-colors whitespace-nowrap">
                                            {buscandoFrete ? 'Calculando...' : 'Calcular'}
                                        </button>
                                    </div>
                                    
                                    {freteOpcoes.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            {freteOpcoes.map((opcao, i) => (
                                                <label key={opcao.id || i} className={`flex items-center justify-between p-3 border rounded-md cursor-pointer transition-colors ${freteId === opcao.id ? 'border-elora-gold bg-elora-gold/5' : 'border-slate-200 dark:border-slate-700'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <input type="radio" name="frete" onChange={() => { setFreteValor(opcao.valor); setFreteTipo(opcao.tipo); setFreteId(opcao.id); }} checked={freteId === opcao.id} className="text-elora-gold accent-elora-gold" />
                                                        <div>
                                                            <p className="text-sm font-semibold dark:text-white">{opcao.tipo}</p>
                                                            <p className="text-[10px] text-slate-500 uppercase">{opcao.prazo}</p>
                                                        </div>
                                                    </div>
                                                    <span className="font-bold dark:text-white">{brl(opcao.valor)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2"><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Rua / Avenida *</label><input name="rua" value={endereco.rua} onChange={handleChange} required className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`} placeholder="Nome da rua" /></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Número *</label><input name="numero" value={endereco.numero} onChange={handleChange} required className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`} placeholder="123" /></div>
                                        <div className="sm:col-span-2"><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Complemento</label><input name="complemento" value={endereco.complemento} onChange={handleChange} className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`} placeholder="Apto, Bloco, etc." /></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Bairro *</label><input name="bairro" value={endereco.bairro} onChange={handleChange} required className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`} /></div>
                                        <div><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Cidade *</label><input name="cidade" value={endereco.cidade} onChange={handleChange} required className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`} /></div>
                                        <div><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Estado *</label><input name="uf" value={endereco.uf} onChange={handleChange} required maxLength="2" className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md uppercase`} placeholder="SP" /></div>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-elora-gold text-white py-4 text-xs sm:text-sm font-bold uppercase tracking-widest hover:bg-slate-900 transition-colors rounded-md shadow-xl shadow-elora-gold/20 flex items-center justify-center gap-3">
                                {loading ? <Icon name="loader-2" className="w-5 h-5 animate-spin" /> : 'Confirmar Endereço e Pagar via InfinitePay'}
                            </button>
                        </form>
                    </div>
                    
                    <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border p-6 sm:p-10 h-fit shadow-2xl rounded-xl relative overflow-hidden lg:sticky lg:top-28`}>
                        <h3 className="text-xl sm:text-2xl font-serif mb-6">Resumo do Pedido ({totalItens(cart)} {totalItens(cart) === 1 ? 'item' : 'itens'})</h3>
                        {cfg.pixDesconto > 0 && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-lg flex items-center gap-3 mb-6">
                                <Icon name="sparkles" className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium"><strong>Ganhe {cfg.pixDesconto}% OFF no PIX!</strong> Aplicado no pagamento.</p>
                            </div>
                        )}
                        <div className="max-h-60 overflow-y-auto pr-2 space-y-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                            {cart.map((item) => (
                                <div key={item.id} className="flex items-center gap-4">
                                    <img src={getImagemPrincipal(item)} loading="lazy" className="w-16 h-16 object-cover rounded-md shadow-sm" alt={item.nome} />
                                    <div><p className="font-serif text-sm">{qtdItem(item) > 1 && <span className="text-elora-gold font-sans font-bold mr-1">{qtdItem(item)}x</span>}{item.nome}</p><p className="text-slate-400 font-medium text-xs mt-1">{brl(((Number(item.preco) || 0) * qtdItem(item)))}</p></div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                            <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-semibold">Tem um cupom de desconto?</label>
                            <div className="flex gap-2">
                                <input value={cupomInput} onChange={(e) => setCupomInput(e.target.value)} disabled={cupomAtivo !== null} className={`flex-1 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md uppercase`} placeholder="Digite seu cupom" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarCupom(); } }} />
                                {!cupomAtivo ? (
                                    <button type="button" onClick={aplicarCupom} disabled={verificandoCupom} className="bg-slate-800 dark:bg-slate-700 text-white px-4 py-3 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-elora-gold transition-colors whitespace-nowrap">
                                        {verificandoCupom ? 'Aguarde...' : 'Aplicar'}
                                    </button>
                                ) : (
                                    <button type="button" onClick={() => {setCupomAtivo(null); setCupomInput('');}} className="bg-red-500 text-white px-4 py-3 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-colors whitespace-nowrap">
                                        Remover
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2 mt-2 text-sm">
                            <div className="flex justify-between text-slate-500"><span>Produtos</span><span>{brl(totalProdutos)}</span></div>
                            <div className="flex justify-between text-slate-500">
                                <span>Frete</span>
                                <span className={descontoFrete > 0 ? "line-through text-slate-400" : ""}>
                                    {freteValor > 0 ? `${brl(freteValor)}` : 'A calcular'}
                                </span>
                            </div>
                            {cupomAtivo && descontoCupom > 0 && (
                                <div className="flex justify-between text-emerald-500 font-medium"><span>Cupom {cupomAtivo.codigo} ({cupomAtivo.descricao})</span><span>- {brl(descontoCupom)}</span></div>
                            )}
                            {cupomAtivo && cupomAtivo.freteGratis && (
                                <div className="flex justify-between text-emerald-500 font-medium"><span>Cupom {cupomAtivo.codigo} (Frete Grátis)</span><span>{freteValor > 0 ? `- ${brl(descontoFrete)}` : 'ao calcular'}</span></div>
                            )}
                        </div>
                        <div className="flex justify-between font-serif text-2xl sm:text-3xl mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <span>Total</span><span className="text-elora-gold">{brl(totalComFrete)}</span>
                        </div>
                        {cfg.pixDesconto > 0 && (
                            <div className="text-right mt-2">
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{brl(precoPix(totalComFrete, cfg))} à vista no PIX</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        function ItensPedido({ itens }) {
            return (
                <div className="space-y-2">
                    {(itens || []).map((it, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs">
                            <img src={it.imagem || getImagemPrincipal(it)} className="w-10 h-10 object-cover rounded" alt={it.nome} />
                            <span className="flex-1"><strong className="text-elora-gold">{qtdItem(it)}x</strong> {it.marca} — {it.nome}</span>
                            <span className="font-medium">{brl(((Number(it.preco) || 0) * qtdItem(it)))}</span>
                        </div>
                    ))}
                </div>
            );
        }

        function CustomerAccount({ user, setUser, logout, voltar, irFavoritos, darkMode }) {
            const [pedidos, setPedidos] = useState(null);
            const [editando, setEditando] = useState(false);
            const [dados, setDados] = useState({ nome: user.nome, telefone: user.telefone, cpf: user.cpf });
            const [salvando, setSalvando] = useState(false);

            useEffect(() => {
                (async () => {
                    try {
                        const { db, collection, query, where, getDocs } = await getFb();
                        const snap = await getDocs(query(collection(db, 'pedidos'), where('uid', '==', user.uid)));
                        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                        lista.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
                        setPedidos(lista);
                    } catch (e) { console.error(e); setPedidos([]); }
                })();
            }, [user.uid]);

            const salvarDados = async (e) => {
                e.preventDefault();
                setSalvando(true);
                try {
                    const { db, doc, setDoc } = await getFb();
                    await setDoc(doc(db, 'usuarios', user.uid), { nome: dados.nome.trim(), telefone: dados.telefone.trim(), cpf: dados.cpf.trim(), email: user.email }, { merge: true });
                    setUser({ ...user, ...dados });
                    setEditando(false);
                } catch (err) { console.error(err); alert('Não foi possível salvar. Tente novamente.'); }
                setSalvando(false);
            };

            const campo = `w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`;
            const card = `${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border p-6 sm:p-8 rounded-xl shadow-xl`;
            const cpfMascarado = user.cpf ? user.cpf.replace(/\D/g, '').replace(/^(\d{3})\d{6}(\d{2})$/, '$1.***.***-$2') : '—';

            return (
                <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16 animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10 border-b border-slate-200 dark:border-slate-800 pb-6">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-serif">Olá, {(user.nome || 'cliente').split(' ')[0]}</h2>
                            <p className="text-slate-400 mt-1 text-sm">Acompanhe seus pedidos e seus dados.</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={irFavoritos} className="flex items-center gap-2 text-slate-400 hover:text-red-500 text-xs font-semibold uppercase tracking-widest"><Icon name="heart" className="w-4 h-4" /> Favoritos</button>
                            <button onClick={voltar} className="flex items-center gap-2 text-slate-400 hover:text-elora-gold text-xs font-semibold uppercase tracking-widest"><Icon name="arrow-left" className="w-4 h-4" /> Loja</button>
                            <button onClick={logout} className="flex items-center gap-2 text-red-500 hover:text-red-700 text-xs font-semibold uppercase tracking-widest"><Icon name="log-out" className="w-4 h-4" /> Sair</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className={`${card} h-fit`}>
                            <h3 className="text-lg font-serif mb-6 flex items-center gap-2"><Icon name="user" className="w-5 h-5 text-elora-gold" /> Meus Dados</h3>
                            {editando ? (
                                <form onSubmit={salvarDados} className="space-y-3">
                                    <div><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Nome</label><input value={dados.nome} onChange={e => setDados({ ...dados, nome: e.target.value })} required className={campo} /></div>
                                    <div><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">WhatsApp</label><input value={dados.telefone} onChange={e => setDados({ ...dados, telefone: e.target.value })} required className={campo} /></div>
                                    <div><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">CPF</label><input value={dados.cpf} onChange={e => setDados({ ...dados, cpf: e.target.value })} required className={campo} /></div>
                                    <div className="flex gap-2 pt-2">
                                        <button type="submit" disabled={salvando} className="flex-1 bg-elora-gold text-white py-3 text-[11px] font-bold uppercase tracking-widest rounded-md">{salvando ? 'Salvando...' : 'Salvar'}</button>
                                        <button type="button" onClick={() => setEditando(false)} className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest rounded-md bg-slate-200 dark:bg-slate-700">Cancelar</button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4 text-sm">
                                    <div><p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Nome</p><p>{user.nome || '—'}</p></div>
                                    <div><p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">E-mail</p><p className="break-all">{user.email}</p></div>
                                    <div><p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">WhatsApp</p><p>{user.telefone || '—'}</p></div>
                                    <div><p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">CPF</p><p>{cpfMascarado}</p></div>
                                    <button onClick={() => setEditando(true)} className="text-elora-gold font-bold text-xs uppercase tracking-widest hover:underline pt-2">Editar dados</button>
                                </div>
                            )}
                        </div>

                        <div className={`lg:col-span-2 ${card}`}>
                            <h3 className="text-lg font-serif mb-6 flex items-center gap-2"><Icon name="package" className="w-5 h-5 text-elora-gold" /> Meus Pedidos</h3>
                            {pedidos === null ? (
                                <div className="flex justify-center py-12"><Icon name="loader-2" className="w-6 h-6 animate-spin text-elora-gold" /></div>
                            ) : pedidos.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-slate-500 mb-4">Você ainda não fez nenhum pedido.</p>
                                    <button onClick={voltar} className="bg-elora-gold text-white px-8 py-3 text-xs font-bold uppercase tracking-widest rounded-md">Ver Catálogo</button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pedidos.map(p => (
                                        <div key={p.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 sm:p-5">
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                                <div>
                                                    <p className="text-xs font-bold tracking-wider">{p.order_nsu}</p>
                                                    <p className="text-[10px] text-slate-400">{formatarData(p.dataCriacao)}</p>
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${STATUS_CORES[p.status] || STATUS_CORES['Aguardando Pagamento']}`}>{p.status}</span>
                                            </div>
                                            <ItensPedido itens={p.itens} />
                                            <div className="flex flex-wrap justify-between items-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <div className="text-xs text-slate-500">
                                                    {p.pagamento && p.pagamento.comprovante && <a href={p.pagamento.comprovante} target="_blank" rel="noreferrer" className="text-elora-gold font-bold hover:underline mr-3">Ver comprovante</a>}
                                                    {p.rastreio ? (
                                                        <span>Rastreio: <a href={`https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(p.rastreio)}`} target="_blank" rel="noreferrer" className="text-elora-gold font-bold hover:underline">{p.rastreio}</a></span>
                                                    ) : p.freteTipo ? <span>{p.freteTipo}</span> : null}
                                                </div>
                                                <p className="font-serif text-lg">Total <span className="text-elora-gold">{brl((Number(p.valorTotal) || 0))}</span></p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        function PedidoConfirmado({ nsu, user, irConta, irLoja }) {
            return (
                <div className="max-w-xl mx-auto px-4 py-20 text-center animate-fade-in">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6"><Icon name="check" className="w-8 h-8 text-emerald-500" /></div>
                    <h2 className="text-3xl sm:text-4xl font-serif mb-3">Obrigado pela sua compra!</h2>
                    <p className="text-slate-500 mb-2">Recebemos o seu pedido <strong>{nsu}</strong>.</p>
                    <p className="text-slate-500 text-sm mb-10">Assim que o pagamento for confirmado, o status é atualizado em "Minha Conta". Qualquer dúvida, fale com a gente no WhatsApp.</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {user && <button onClick={irConta} className="bg-elora-gold text-white px-8 py-3 text-xs font-bold uppercase tracking-widest rounded-md shadow-lg shadow-elora-gold/20">Ver Meus Pedidos</button>}
                        <button onClick={irLoja} className="border border-slate-300 dark:border-slate-700 px-8 py-3 text-xs font-bold uppercase tracking-widest rounded-md">Continuar Comprando</button>
                    </div>
                </div>
            );
        }

        // ===== PAINEL: RESUMO DE VENDAS =====
        const STATUS_VENDIDO = ['Pago', 'Em separação', 'Enviado', 'Entregue'];
        const valorRecebido = (p) => (p.pagamento && Number(p.pagamento.valorPago) > 0) ? Number(p.pagamento.valorPago) : (Number(p.valorTotal) || 0);
        const pedidosAbandonados = (lista) => lista.filter(p => p.status === 'Aguardando Pagamento' && new Date(p.dataCriacao).getTime() < Date.now() - 24 * 3600 * 1000);

        function AdminResumo({ pedidos, produtos, darkMode, irPedidos, carregando }) {
            const [periodo, setPeriodo] = useState('mes');
            const agora = new Date();
            const intervalo = (() => {
                const ini = new Date(agora.getFullYear(), agora.getMonth(), 1);
                if (periodo === 'mes') return [ini, null];
                if (periodo === 'mesPassado') return [new Date(agora.getFullYear(), agora.getMonth() - 1, 1), ini];
                if (periodo === '7d') return [new Date(Date.now() - 7 * 864e5), null];
                if (periodo === '30d') return [new Date(Date.now() - 30 * 864e5), null];
                return [new Date(0), null];
            })();
            const noPeriodo = (p) => { const d = new Date((p.pagamento && p.pagamento.pagoEm) || p.dataCriacao); return d >= intervalo[0] && (!intervalo[1] || d < intervalo[1]); };
            const vendas = pedidos.filter(p => STATUS_VENDIDO.includes(p.status) && noPeriodo(p));
            const faturamento = vendas.reduce((s, p) => s + valorRecebido(p), 0);
            const ticket = vendas.length ? faturamento / vendas.length : 0;
            const unidades = vendas.reduce((s, p) => s + (p.itens || []).reduce((a, i) => a + qtdItem(i), 0), 0);
            const aEnviar = pedidos.filter(p => p.status === 'Pago' || p.status === 'Em separação');
            const aguardando = pedidos.filter(p => p.status === 'Aguardando Pagamento');
            const ranking = {};
            vendas.forEach(p => (p.itens || []).forEach(i => {
                const k = i.id || i.nome;
                if (!ranking[k]) ranking[k] = { nome: i.nome, marca: i.marca, imagem: i.imagem, qtd: 0, valor: 0 };
                ranking[k].qtd += qtdItem(i);
                ranking[k].valor += (Number(i.preco) || 0) * qtdItem(i);
            }));
            const top = Object.values(ranking).sort((a, b) => b.qtd - a.qtd).slice(0, 5);
            const estoqueBaixo = produtos.filter(p => temControleEstoque(p) && Number(p.estoque) <= 2).sort((a, b) => Number(a.estoque) - Number(b.estoque));
            const cupons = {};
            vendas.forEach(p => { if (p.cupom) cupons[p.cupom] = (cupons[p.cupom] || 0) + 1; });

            const card = `${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border rounded-xl shadow-md p-5`;
            const rotulo = "text-[10px] uppercase tracking-widest text-slate-400 font-bold";
            const periodos = [['mes', 'Este mês'], ['mesPassado', 'Mês passado'], ['7d', '7 dias'], ['30d', '30 dias'], ['tudo', 'Tudo']];

            return (
                <div className="animate-fade-in space-y-6">
                    <div className="flex flex-wrap gap-2">
                        {periodos.map(([k, t]) => <button key={k} onClick={() => setPeriodo(k)} className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${periodo === k ? 'bg-elora-gold border-elora-gold text-white' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>{t}</button>)}
                        {carregando && <span className="text-xs text-slate-400 flex items-center gap-2"><Icon name="loader-2" className="w-4 h-4 animate-spin" /> carregando...</span>}
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className={card}><p className={rotulo}>Faturamento</p><p className="text-2xl sm:text-3xl font-serif text-elora-gold mt-2">{brl(faturamento)}</p></div>
                        <div className={card}><p className={rotulo}>Vendas</p><p className="text-2xl sm:text-3xl font-serif mt-2">{vendas.length}</p><p className="text-[11px] text-slate-400">{unidades} {unidades === 1 ? 'perfume' : 'perfumes'}</p></div>
                        <div className={card}><p className={rotulo}>Ticket médio</p><p className="text-2xl sm:text-3xl font-serif mt-2">{brl(ticket)}</p></div>
                        <button onClick={irPedidos} className={`${card} text-left hover:border-elora-gold transition-colors`}><p className={rotulo}>A enviar agora</p><p className={`text-2xl sm:text-3xl font-serif mt-2 ${aEnviar.length ? 'text-blue-500' : ''}`}>{aEnviar.length}</p><p className="text-[11px] text-slate-400">{aguardando.length} aguardando pagamento</p></button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className={card}>
                            <p className={`${rotulo} mb-4`}>Mais vendidos no período</p>
                            {top.length === 0 ? <p className="text-sm text-slate-400 py-6 text-center">Nenhuma venda neste período.</p> : (
                                <div className="space-y-3">
                                    {top.map((t, i) => (
                                        <div key={i} className="flex items-center gap-3 text-sm">
                                            <span className="w-5 text-center font-bold text-elora-gold">{i + 1}</span>
                                            {t.imagem && <img src={t.imagem} className="w-10 h-10 rounded object-cover" alt="" />}
                                            <span className="flex-1 min-w-0 truncate">{t.marca} — {t.nome}</span>
                                            <span className="text-xs text-slate-400 whitespace-nowrap">{t.qtd} un · {brl(t.valor)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {Object.keys(cupons).length > 0 && <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">Cupons usados: {Object.entries(cupons).map(([c, n]) => `${c} (${n})`).join(', ')}</p>}
                        </div>
                        <div className={card}>
                            <p className={`${rotulo} mb-4`}>Estoque baixo (2 ou menos)</p>
                            {estoqueBaixo.length === 0 ? <p className="text-sm text-slate-400 py-6 text-center">Tudo certo com o estoque. 👍</p> : (
                                <div className="space-y-2">
                                    {estoqueBaixo.map(p => (
                                        <div key={p.id} className="flex items-center gap-3 text-sm">
                                            <img src={getImagemPrincipal(p)} className="w-10 h-10 rounded object-cover" alt="" />
                                            <span className="flex-1 min-w-0 truncate">{p.marca} — {p.nome}</span>
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${Number(p.estoque) <= 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>{Number(p.estoque) <= 0 ? 'Esgotado' : `${p.estoque} un`}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // ===== PAINEL: CUPONS =====
        function AdminCupons({ darkMode }) {
            const vazio = { codigo: '', tipo: 'percentual', valor: '', minimo: '', minItens: '', inicio: '', validade: '', limiteUsos: '', primeiraCompra: false, umPorCpf: false, ativo: true };
            const [cupons, setCupons] = useState(null);
            const [form, setForm] = useState(vazio);
            const [editando, setEditando] = useState(false);
            const [salvando, setSalvando] = useState(false);

            const carregar = async () => {
                try {
                    const { db, collection, getDocs } = await getFb();
                    const s = await getDocs(collection(db, 'cupons'));
                    setCupons(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || '')));
                } catch (e) { console.error(e); setCupons([]); }
            };
            useEffect(() => { carregar(); }, []);

            const salvar = async (e) => {
                e.preventDefault();
                const codigo = form.codigo.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                if (!codigo) return alert('Digite o código do cupom (só letras e números).');
                const valor = Number(String(form.valor).replace(',', '.')) || 0;
                if (form.tipo !== 'frete' && valor <= 0) return alert('Informe o valor do desconto.');
                if (form.tipo === 'percentual' && valor > 90) return alert('O desconto percentual máximo é 90%.');
                if (form.inicio && form.validade && form.validade < form.inicio) return alert('A data final é antes da data de início.');
                if (!editando && cupons && cupons.some(c => c.id === codigo)) return alert('Já existe um cupom com esse código.');
                setSalvando(true);
                try {
                    const { db, doc, setDoc } = await getFb();
                    const dados = {
                        codigo, tipo: form.tipo, valor: form.tipo === 'frete' ? 0 : valor,
                        minimo: Number(String(form.minimo).replace(',', '.')) || 0,
                        inicio: form.inicio || '', validade: form.validade || '', limiteUsos: parseInt(form.limiteUsos) || 0,
                        minItens: parseInt(form.minItens) || 0, umPorCpf: !!form.umPorCpf,
                        primeiraCompra: !!form.primeiraCompra, ativo: !!form.ativo
                    };
                    if (!editando) { dados.usos = 0; dados.criadoEm = new Date().toISOString(); }
                    await setDoc(doc(db, 'cupons', codigo), dados, { merge: true });
                    setForm(vazio); setEditando(false);
                    await carregar();
                } catch (err) { console.error(err); alert('Não foi possível salvar o cupom.'); }
                setSalvando(false);
            };

            const alternar = async (c) => {
                const { db, doc, updateDoc } = await getFb();
                await updateDoc(doc(db, 'cupons', c.id), { ativo: !c.ativo });
                setCupons(cupons.map(x => x.id === c.id ? { ...x, ativo: !c.ativo } : x));
            };
            const apagar = async (c) => {
                if (!confirm(`Excluir o cupom ${c.id}? Pedidos antigos continuam com o registro do cupom.`)) return;
                const { db, doc, deleteDoc } = await getFb();
                await deleteDoc(doc(db, 'cupons', c.id));
                setCupons(cupons.filter(x => x.id !== c.id));
            };
            const editar = (c) => { setEditando(true); setForm({ codigo: c.id, tipo: c.tipo, valor: c.valor || '', minimo: c.minimo || '', minItens: c.minItens || '', inicio: c.inicio || '', validade: c.validade || '', limiteUsos: c.limiteUsos || '', primeiraCompra: !!c.primeiraCompra, umPorCpf: !!c.umPorCpf, ativo: c.ativo !== false }); window.scrollTo(0, 0); };

            const campo = `w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`;
            const rotulo = "block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold";
            const hoje = new Date().toISOString().slice(0, 10);
            const situacao = (c) => {
                if (c.ativo === false) return ['Pausado', 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'];
                if (c.inicio && c.inicio > hoje) return ['Agendado', 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'];
                if (c.validade && c.validade < hoje) return ['Expirado', 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'];
                if (c.limiteUsos > 0 && (c.usos || 0) >= c.limiteUsos) return ['Esgotado', 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'];
                return ['Ativo', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'];
            };
            const descricao = (c) => c.tipo === 'percentual' ? `${c.valor}% OFF` : c.tipo === 'valor' ? `${brl(c.valor)} OFF` : 'Frete Grátis';

            return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    <form onSubmit={salvar} className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border p-6 rounded-xl shadow-xl h-fit space-y-4`}>
                        <h3 className="text-lg font-serif flex items-center gap-2"><Icon name="ticket" className="w-5 h-5 text-elora-gold" /> {editando ? `Editar ${form.codigo}` : 'Novo Cupom'}</h3>
                        <div><label className={rotulo}>Código *</label><input value={form.codigo} disabled={editando} onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })} className={`${campo} uppercase`} placeholder="BLACK10" /></div>
                        <div><label className={rotulo}>Tipo de desconto</label>
                            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className={campo}>
                                <option value="percentual">Porcentagem (%) nos produtos</option>
                                <option value="valor">Valor fixo (R$) nos produtos</option>
                                <option value="frete">Frete grátis</option>
                            </select>
                        </div>
                        {form.tipo !== 'frete' && <div><label className={rotulo}>{form.tipo === 'percentual' ? 'Desconto (%) *' : 'Desconto (R$) *'}</label><input type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} className={campo} placeholder={form.tipo === 'percentual' ? '10' : '20,00'} /></div>}
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={rotulo}>Compra mínima (R$)</label><input type="number" step="0.01" min="0" value={form.minimo} onChange={e => setForm({ ...form, minimo: e.target.value })} className={campo} placeholder="0 = sem mínimo" /></div>
                            <div><label className={rotulo}>Limite de usos</label><input type="number" min="0" value={form.limiteUsos} onChange={e => setForm({ ...form, limiteUsos: e.target.value })} className={campo} placeholder="0 = sem limite" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={rotulo}>Começa em</label><input type="date" value={form.inicio} onChange={e => setForm({ ...form, inicio: e.target.value })} className={campo} /></div>
                            <div><label className={rotulo}>Válido até (inclusive)</label><input type="date" value={form.validade} onChange={e => setForm({ ...form, validade: e.target.value })} className={campo} /></div>
                        </div>
                        <p className="text-[10px] text-slate-400 -mt-2">Datas em branco = vale desde já e não expira.</p>
                        <div><label className={rotulo}>Mínimo de perfumes no pedido</label><input type="number" min="0" value={form.minItens} onChange={e => setForm({ ...form, minItens: e.target.value })} className={campo} placeholder="0 = sem mínimo (ex: 2 para 'compre 2')" /></div>
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.umPorCpf} onChange={e => setForm({ ...form, umPorCpf: e.target.checked })} className="w-4 h-4 accent-elora-gold" /> Só 1 uso por CPF</label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.primeiraCompra} onChange={e => setForm({ ...form, primeiraCompra: e.target.checked })} className="w-4 h-4 accent-elora-gold" /> Só para a primeira compra do cliente</label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} className="w-4 h-4 accent-elora-gold" /> Cupom ativo</label>
                        <div className="flex gap-2 pt-2">
                            <button type="submit" disabled={salvando} className="flex-1 bg-elora-gold text-white py-3 text-[11px] font-bold uppercase tracking-widest rounded-md hover:bg-slate-900 transition-colors">{salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar cupom'}</button>
                            {editando && <button type="button" onClick={() => { setEditando(false); setForm(vazio); }} className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest rounded-md bg-slate-200 dark:bg-slate-700">Cancelar</button>}
                        </div>
                    </form>

                    <div className="lg:col-span-2 space-y-3">
                        {cupons === null ? <div className="flex justify-center py-12"><Icon name="loader-2" className="w-6 h-6 animate-spin text-elora-gold" /></div>
                        : cupons.length === 0 ? (
                            <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border rounded-xl p-10 text-center text-sm text-slate-500`}>
                                Nenhum cupom criado ainda.<br />O cupom <strong>PRIMEIROGRATIS</strong> (frete grátis na 1ª compra) continua funcionando. Para pausar ou mudar as regras dele, crie aqui um cupom com esse mesmo código.
                            </div>
                        ) : cupons.map(c => {
                            const [txt, cor] = situacao(c);
                            return (
                                <div key={c.id} className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border rounded-xl shadow-md p-4 sm:p-5 flex flex-wrap items-center gap-4`}>
                                    <div className="flex-1 min-w-[180px]">
                                        <div className="flex items-center gap-2 flex-wrap"><span className="font-bold tracking-wider">{c.id}</span><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cor}`}>{txt}</span></div>
                                        <p className="text-elora-gold font-semibold text-sm mt-1">{descricao(c)}</p>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            {[c.minimo > 0 ? `mín. ${brl(c.minimo)}` : null, c.minItens > 1 ? `${c.minItens}+ perfumes` : null, c.inicio ? `de ${c.inicio.split('-').reverse().join('/')}` : null, c.validade ? `até ${c.validade.split('-').reverse().join('/')}` : 'sem validade', c.primeiraCompra ? '1ª compra' : null, c.umPorCpf ? '1 por CPF' : null, `${c.usos || 0}${c.limiteUsos > 0 ? '/' + c.limiteUsos : ''} usos`].filter(Boolean).join(' · ')}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => alternar(c)} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md border border-slate-200 dark:border-slate-700 hover:border-elora-gold">{c.ativo === false ? 'Ativar' : 'Pausar'}</button>
                                        <button onClick={() => editar(c)} className="p-2 rounded-md border border-slate-200 dark:border-slate-700 hover:text-elora-gold" aria-label="Editar"><Icon name="edit-3" className="w-4 h-4" /></button>
                                        <button onClick={() => apagar(c)} className="p-2 rounded-md border border-slate-200 dark:border-slate-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" aria-label="Excluir"><Icon name="trash-2" className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // ===== PAINEL: CONFIGURAÇÕES DA LOJA =====
        function AdminConfig({ darkMode, recarregarConfig }) {
            const cfgAtual = useContext(ConfigLoja);
            const [form, setForm] = useState({ pixDesconto: String(cfgAtual.pixDesconto), parcelas: String(cfgAtual.parcelas), avisos: (cfgAtual.avisosTopo || []).join('\n'), bannerSegundos: String(cfgAtual.bannerSegundos || 8) });
            const [salvando, setSalvando] = useState(false);
            const [salvo, setSalvo] = useState(false);

            const salvar = async (e) => {
                e.preventDefault();
                const pix = Number(String(form.pixDesconto).replace(',', '.'));
                const parc = parseInt(form.parcelas);
                if (isNaN(pix) || pix < 0 || pix > 50) return alert('Desconto PIX deve ser entre 0 e 50%.');
                if (isNaN(parc) || parc < 1 || parc > 12) return alert('Parcelas sem juros devem ser entre 1 e 12.');
                const seg = Number(String(form.bannerSegundos).replace(',', '.'));
                if (isNaN(seg) || seg < 3 || seg > 30) return alert('O tempo de cada banner deve ser entre 3 e 30 segundos.');
                setSalvando(true);
                try {
                    const { db, doc, setDoc } = await getFb();
                    await setDoc(doc(db, 'config', 'loja'), {
                        pixDesconto: pix, parcelas: parc, bannerSegundos: seg,
                        avisosTopo: form.avisos.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 8),
                        atualizadoEm: new Date().toISOString()
                    }, { merge: true });
                    await recarregarConfig();
                    setSalvo(true); setTimeout(() => setSalvo(false), 4000);
                } catch (err) { console.error(err); alert('Não foi possível salvar.'); }
                setSalvando(false);
            };

            const campo = `w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`;
            const rotulo = "block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold";
            const exemplo = 199.9;
            const pixN = Number(String(form.pixDesconto).replace(',', '.')) || 0;
            const parcN = parseInt(form.parcelas) || 1;

            return (
                <form onSubmit={salvar} className={`max-w-2xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border p-6 sm:p-8 rounded-xl shadow-xl space-y-6 animate-fade-in`}>
                    <h3 className="text-lg font-serif flex items-center gap-2"><Icon name="settings" className="w-5 h-5 text-elora-gold" /> Pagamento e Avisos</h3>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs p-3 rounded-md">
                        ⚠️ Estes valores só mudam o que <strong>aparece no site</strong>. Ajuste também o desconto PIX e as parcelas sem juros no <strong>app da InfinitePay</strong>, para o cliente pagar exatamente o que viu.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className={rotulo}>Desconto no PIX (%)</label><input type="number" step="0.5" min="0" max="50" value={form.pixDesconto} onChange={e => setForm({ ...form, pixDesconto: e.target.value })} className={campo} /><p className="text-[10px] text-slate-400 mt-1">0 = sem desconto (some do site)</p></div>
                        <div><label className={rotulo}>Parcelas sem juros</label><input type="number" min="1" max="12" value={form.parcelas} onChange={e => setForm({ ...form, parcelas: e.target.value })} className={campo} /><p className="text-[10px] text-slate-400 mt-1">1 = não mostra parcelamento</p></div>
                    </div>
                    <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-md p-3">
                        Prévia num perfume de {brl(exemplo)}: {parcN > 1 && <span><strong>{parcN}x de {brl(exemplo / parcN)}</strong> sem juros</span>}{parcN > 1 && pixN > 0 && ' · '}{pixN > 0 && <span className="text-emerald-600"><strong>{brl(exemplo * (1 - pixN / 100))}</strong> no PIX</span>}
                    </div>
                    <div>
                        <label className={rotulo}>Tempo de cada banner no topo (segundos)</label>
                        <input type="number" min="3" max="30" step="1" value={form.bannerSegundos} onChange={e => setForm({ ...form, bannerSegundos: e.target.value })} className={campo} />
                        <p className="text-[10px] text-slate-400 mt-1">Quanto tempo cada banner (incluindo a foto principal) fica na tela antes de passar para o próximo. Entre 3 e 30.</p>
                    </div>
                    <div>
                        <label className={rotulo}>Frases da faixa preta do topo (uma por linha)</label>
                        <textarea rows="5" value={form.avisos} onChange={e => setForm({ ...form, avisos: e.target.value })} className={campo} placeholder={avisosPadrao({ pixDesconto: pixN, parcelas: parcN }).join('\n')} />
                        <p className="text-[10px] text-slate-400 mt-1">Deixe em branco para usar as frases padrão (mostradas acima em cinza). Use para Black Friday, Natal, cupons do momento etc. Máximo 8 frases.</p>
                    </div>
                    <button type="submit" disabled={salvando} className="w-full bg-elora-gold text-white py-3.5 text-xs font-bold uppercase tracking-widest rounded-md hover:bg-slate-900 transition-colors">{salvando ? 'Salvando...' : salvo ? '✓ Salvo! Já está no site' : 'Salvar configurações'}</button>
                </form>
            );
        }

        // ===== BANNERS DE CAMPANHA (Painel → Banners) =====
        const IMGBB_KEY = "ba8a5660412f8f7e42b2fddb2fe006c3";
        const enviarImagem = async (file, max) => {
            const leve = await compressImage(file, max);
            const fd = new FormData(); fd.append('image', leve);
            const r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd });
            const d = await r.json();
            if (!d || !d.success) throw new Error('falha no envio da imagem');
            return d.data.url;
        };
        const hojeISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
        const situacaoBanner = (b) => {
            const hoje = hojeISO();
            if (b.ativo === false) return 'Pausado';
            if (b.inicio && b.inicio > hoje) return 'Agendado';
            if (b.fim && b.fim < hoje) return 'Encerrado';
            return 'No ar';
        };

        function HeroCarrossel({ banners, onQuiz, onClicarBanner }) {
            const slides = [{ id: 'principal' }].concat(banners);
            const [atual, setAtual] = useState(0);
            const [pausado, setPausado] = useState(false);
            const toque = useRef(null);
            const cfg = useContext(ConfigLoja);
            const tempo = (cfg.bannerSegundos || 8) * 1000;
            const total = slides.length;
            const ir = (i) => setAtual(((i % total) + total) % total);
            useEffect(() => { if (atual >= total) setAtual(0); }, [total]);
            useEffect(() => {
                if (total < 2 || pausado) return;
                const t = setTimeout(() => ir(atual + 1), tempo);
                return () => clearTimeout(t);
            }, [atual, total, pausado, tempo]);
            const inicioToque = (e) => { toque.current = e.touches[0].clientX; setPausado(true); };
            const fimToque = (e) => {
                const x0 = toque.current; toque.current = null; setPausado(false);
                if (x0 === null) return;
                const dx = e.changedTouches[0].clientX - x0;
                if (Math.abs(dx) > 40) ir(atual + (dx < 0 ? 1 : -1));
            };
            return (
                <section className="relative h-[65vh] sm:h-[80vh] w-full overflow-hidden bg-slate-950" onTouchStart={inicioToque} onTouchEnd={fimToque} onTouchCancel={() => setPausado(false)} aria-roledescription="carrossel">
                    <div className="flex h-full transition-transform duration-700 ease-out" style={{ transform: `translateX(-${atual * 100}%)` }}>
                        {slides.map((b, i) => b.id === 'principal' ? (
                            <div key="principal" className="relative w-full h-full flex-shrink-0 flex items-center justify-center" aria-hidden={atual !== i}>
                                <img src="./banner-promo.jpeg" fetchpriority="high" decoding="async" alt="Perfumes árabes Elora Parfums" className="absolute inset-0 w-full h-full object-cover z-0 opacity-80" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10"></div>
                                <div className="relative z-20 text-center px-4 mt-8 max-w-4xl">
                                    <h1 className="text-4xl sm:text-6xl md:text-8xl font-serif mb-4 sm:mb-6 text-white tracking-tight drop-shadow-2xl">A Essência do <span className="text-elora-gold">Oriente</span>.</h1>
                                    <p className="text-sm sm:text-lg text-slate-200 mb-8 max-w-2xl mx-auto font-medium drop-shadow">Fragrâncias árabes exclusivas e refinadas.</p>
                                    <button onClick={onQuiz} tabIndex={atual === i ? 0 : -1} className="bg-elora-gold text-white px-6 sm:px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-slate-900 transition-all shadow-2xl flex items-center mx-auto gap-2.5 rounded-md hover:scale-105">
                                        <Icon name="flask-conical" className="w-4 h-4" /> Encontrar Minha Fragrância
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button key={b.id} type="button" onClick={() => onClicarBanner(b)} tabIndex={atual === i ? 0 : -1} aria-hidden={atual !== i} aria-label={b.titulo || 'Campanha'} className={`relative w-full h-full flex-shrink-0 overflow-hidden ${b.linkTipo && b.linkTipo !== 'nenhum' ? 'cursor-pointer' : 'cursor-default'}`}>
                                {/* fundo desfocado preenche as sobras; a arte aparece inteira, sem cortar textos */}
                                <picture>
                                    {b.imagemMobile && <source media="(max-width: 640px)" srcSet={b.imagemMobile} />}
                                    <img src={b.imagem} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
                                </picture>
                                <picture>
                                    {b.imagemMobile && <source media="(max-width: 640px)" srcSet={b.imagemMobile} />}
                                    <img src={b.imagem} alt={b.titulo || 'Campanha Elora Parfums'} loading="lazy" decoding="async" className="relative w-full h-full object-contain" />
                                </picture>
                            </button>
                        ))}
                    </div>
                    {total > 1 && (
                        <React.Fragment>
                            <button onClick={() => ir(atual - 1)} aria-label="Banner anterior" className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/30 backdrop-blur text-white transition-colors"><Icon name="chevron-left" className="w-5 h-5" /></button>
                            <button onClick={() => ir(atual + 1)} aria-label="Próximo banner" className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/30 backdrop-blur text-white transition-colors"><Icon name="chevron-right" className="w-5 h-5" /></button>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                                {slides.map((b, i) => <button key={i} onClick={() => ir(i)} aria-label={`Ir para o banner ${i + 1}`} className={`h-2 rounded-full transition-all ${atual === i ? 'w-7 bg-elora-gold' : 'w-2 bg-white/50 hover:bg-white/80'}`}></button>)}
                            </div>
                        </React.Fragment>
                    )}
                </section>
            );
        }

        function AdminBanners({ produtos, darkMode, recarregarBanners }) {
            const vazio = { titulo: '', linkTipo: 'nenhum', linkValor: '', inicio: '', fim: '', ativo: true, ordem: '' };
            const [lista, setLista] = useState(null);
            const [form, setForm] = useState(vazio);
            const [editando, setEditando] = useState(null);
            const [arqPc, setArqPc] = useState(null);
            const [arqCel, setArqCel] = useState(null);
            const [prevPc, setPrevPc] = useState('');
            const [prevCel, setPrevCel] = useState('');
            const [salvando, setSalvando] = useState('');

            const carregar = async () => {
                try {
                    const { db, collection, getDocs } = await getFb();
                    const sn = await getDocs(collection(db, 'banners'));
                    setLista(sn.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0)));
                } catch (e) { console.error(e); setLista([]); }
            };
            useEffect(() => { carregar(); }, []);

            const limpar = () => { setForm(vazio); setEditando(null); setArqPc(null); setArqCel(null); setPrevPc(''); setPrevCel(''); };
            const editar = (b) => {
                setEditando(b); setForm({ titulo: b.titulo || '', linkTipo: b.linkTipo || 'nenhum', linkValor: b.linkValor || '', inicio: b.inicio || '', fim: b.fim || '', ativo: b.ativo !== false, ordem: b.ordem ?? '' });
                setPrevPc(b.imagem || ''); setPrevCel(b.imagemMobile || ''); setArqPc(null); setArqCel(null); window.scrollTo(0, 0);
            };
            const escolher = (e, setArq, setPrev) => { const f = e.target.files && e.target.files[0]; if (f) { setArq(f); setPrev(URL.createObjectURL(f)); } };

            const salvar = async (e) => {
                e.preventDefault();
                if (!arqPc && !(editando && editando.imagem)) return alert('Escolha a imagem do banner (computador).');
                if (form.inicio && form.fim && form.fim < form.inicio) return alert('A data de fim é antes da data de início.');
                if (form.linkTipo === 'url' && form.linkValor && !/^https?:\/\//.test(form.linkValor)) return alert('O link precisa começar com https://');
                try {
                    let imagem = editando ? editando.imagem : '', imagemMobile = editando ? (editando.imagemMobile || '') : '';
                    if (arqPc) { setSalvando('Enviando imagem do computador...'); imagem = await enviarImagem(arqPc, 1920); }
                    if (arqCel) { setSalvando('Enviando imagem do celular...'); imagemMobile = await enviarImagem(arqCel, 1350); }
                    setSalvando('Salvando...');
                    const { db, collection, addDoc, doc, updateDoc } = await getFb();
                    const dados = {
                        titulo: form.titulo.trim(), imagem, imagemMobile,
                        linkTipo: form.linkTipo, linkValor: form.linkTipo === 'nenhum' ? '' : form.linkValor,
                        inicio: form.inicio || '', fim: form.fim || '', ativo: !!form.ativo,
                        ordem: form.ordem === '' ? (lista ? lista.length + 1 : 1) : Number(form.ordem)
                    };
                    if (editando) await updateDoc(doc(db, 'banners', editando.id), dados);
                    else await addDoc(collection(db, 'banners'), { ...dados, criadoEm: new Date().toISOString() });
                    limpar(); await carregar(); recarregarBanners();
                } catch (err) { console.error(err); alert('Não foi possível salvar o banner. Tente uma imagem menor.'); }
                setSalvando('');
            };
            const alternar = async (b) => {
                const { db, doc, updateDoc } = await getFb();
                await updateDoc(doc(db, 'banners', b.id), { ativo: b.ativo === false });
                await carregar(); recarregarBanners();
            };
            const mover = async (b, dir) => {
                const i = lista.findIndex(x => x.id === b.id), j = i + dir;
                if (j < 0 || j >= lista.length) return;
                const nova = lista.slice(); nova[i] = lista[j]; nova[j] = lista[i];
                const { db, doc, updateDoc } = await getFb();
                await Promise.all(nova.map((x, k) => updateDoc(doc(db, 'banners', x.id), { ordem: k + 1 })));
                await carregar(); recarregarBanners();
            };
            const apagar = async (b) => {
                if (!confirm(`Excluir o banner "${b.titulo || 'sem título'}"?`)) return;
                const { db, doc, deleteDoc } = await getFb();
                await deleteDoc(doc(db, 'banners', b.id));
                await carregar(); recarregarBanners();
            };

            const campo = `w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-sm outline-none focus:border-elora-gold rounded-md`;
            const rotulo = "block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold";
            const corSit = { 'No ar': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', 'Agendado': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', 'Encerrado': 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300', 'Pausado': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
            const dataBR = (d) => d ? d.split('-').reverse().join('/') : '';
            const descLink = (b) => b.linkTipo === 'perfume' ? `abre: ${((produtos.find(p => p.id === b.linkValor) || {}).nome) || 'perfume'}` : b.linkTipo === 'categoria' ? `mostra: ${b.linkValor}` : b.linkTipo === 'url' ? 'abre link externo' : 'sem link';

            return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    <form onSubmit={salvar} className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border p-6 rounded-xl shadow-xl h-fit space-y-4`}>
                        <h3 className="text-lg font-serif flex items-center gap-2"><Icon name="image" className="w-5 h-5 text-elora-gold" /> {editando ? 'Editar Banner' : 'Novo Banner'}</h3>
                        <div><label className={rotulo}>Nome da campanha (só para você)</label><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className={campo} placeholder="Ex: Black Friday 40% OFF" /></div>
                        <div>
                            <label className={rotulo}>Imagem para computador *</label>
                            <input type="file" accept="image/*" onChange={e => escolher(e, setArqPc, setPrevPc)} className="w-full text-xs" />
                            <p className="text-[10px] text-slate-400 mt-1">Ideal: 1920 × 800 px (horizontal).</p>
                            {prevPc && <img src={prevPc} className="mt-2 w-full rounded-md border border-slate-200 dark:border-slate-700" alt="" />}
                        </div>
                        <div>
                            <label className={rotulo}>Imagem para celular <span className="normal-case tracking-normal font-normal">(opcional, recomendado)</span></label>
                            <input type="file" accept="image/*" onChange={e => escolher(e, setArqCel, setPrevCel)} className="w-full text-xs" />
                            <p className="text-[10px] text-slate-400 mt-1">Ideal: 1080 × 1350 px (em pé). Sem ela, o celular mostra a de computador inteira, menor.</p>
                            {prevCel && <img src={prevCel} className="mt-2 w-1/2 rounded-md border border-slate-200 dark:border-slate-700" alt="" />}
                        </div>
                        <div>
                            <label className={rotulo}>Ao tocar no banner</label>
                            <select value={form.linkTipo} onChange={e => setForm({ ...form, linkTipo: e.target.value, linkValor: '' })} className={campo}>
                                <option value="nenhum">Não faz nada</option>
                                <option value="perfume">Abre um perfume</option>
                                <option value="categoria">Mostra uma categoria</option>
                                <option value="url">Abre um link (ex: Instagram)</option>
                            </select>
                        </div>
                        {form.linkTipo === 'perfume' && <select value={form.linkValor} onChange={e => setForm({ ...form, linkValor: e.target.value })} className={campo} required><option value="">Escolha o perfume...</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.marca} — {p.nome}</option>)}</select>}
                        {form.linkTipo === 'categoria' && <select value={form.linkValor} onChange={e => setForm({ ...form, linkValor: e.target.value })} className={campo} required><option value="">Escolha...</option><option value="Feminino">Feminino</option><option value="Masculino">Masculino</option><option value="Todos">Todos os perfumes</option></select>}
                        {form.linkTipo === 'url' && <input value={form.linkValor} onChange={e => setForm({ ...form, linkValor: e.target.value })} className={campo} placeholder="https://..." required />}
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={rotulo}>Começa em</label><input type="date" value={form.inicio} onChange={e => setForm({ ...form, inicio: e.target.value })} className={campo} /></div>
                            <div><label className={rotulo}>Termina em</label><input type="date" value={form.fim} onChange={e => setForm({ ...form, fim: e.target.value })} className={campo} /></div>
                        </div>
                        <p className="text-[10px] text-slate-400 -mt-2">Datas vazias = começa agora e não termina. O banner sai do ar sozinho depois do último dia.</p>
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} className="w-4 h-4 accent-elora-gold" /> Banner ativo</label>
                        <div className="flex gap-2 pt-2">
                            <button type="submit" disabled={!!salvando} className="flex-1 bg-elora-gold text-white py-3 text-[11px] font-bold uppercase tracking-widest rounded-md hover:bg-slate-900 transition-colors">{salvando || (editando ? 'Salvar alterações' : 'Publicar banner')}</button>
                            {editando && <button type="button" onClick={limpar} className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest rounded-md bg-slate-200 dark:bg-slate-700">Cancelar</button>}
                        </div>
                    </form>

                    <div className="lg:col-span-2 space-y-3">
                        <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border rounded-xl p-4 text-xs text-slate-500 flex gap-3 items-start`}>
                            <Icon name="info" className="w-4 h-4 text-elora-gold flex-shrink-0 mt-0.5" />
                            <span>O site sempre abre com a foto principal ("A Essência do Oriente"). Depois de alguns segundos, passam os banners <strong>No ar</strong>, nesta ordem, e o ciclo recomeça.</span>
                        </div>
                        {lista === null ? <div className="flex justify-center py-12"><Icon name="loader-2" className="w-6 h-6 animate-spin text-elora-gold" /></div>
                        : lista.length === 0 ? <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border rounded-xl p-10 text-center text-sm text-slate-500`}>Nenhum banner ainda. Crie o primeiro ao lado.</div>
                        : lista.map((b, i) => {
                            const sit = situacaoBanner(b);
                            return (
                                <div key={b.id} className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border rounded-xl shadow-md p-3 sm:p-4 flex flex-wrap items-center gap-4`}>
                                    <img src={b.imagem} className="w-40 h-20 object-cover rounded-md bg-slate-100" alt="" />
                                    <div className="flex-1 min-w-[160px]">
                                        <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-sm">{b.titulo || 'Sem título'}</span><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${corSit[sit]}`}>{sit}</span>{b.imagemMobile && <span className="text-[10px] text-slate-400">+ versão celular</span>}</div>
                                        <p className="text-[11px] text-slate-400 mt-1">{[b.inicio ? `de ${dataBR(b.inicio)}` : null, b.fim ? `até ${dataBR(b.fim)}` : 'sem data de fim', descLink(b)].filter(Boolean).join(' · ')}</p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button onClick={() => mover(b, -1)} disabled={i === 0} className="p-2 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-30" aria-label="Subir"><Icon name="arrow-up" className="w-4 h-4" /></button>
                                        <button onClick={() => mover(b, 1)} disabled={i === lista.length - 1} className="p-2 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-30" aria-label="Descer"><Icon name="arrow-down" className="w-4 h-4" /></button>
                                        <button onClick={() => alternar(b)} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md border border-slate-200 dark:border-slate-700 hover:border-elora-gold">{b.ativo === false ? 'Ativar' : 'Pausar'}</button>
                                        <button onClick={() => editar(b)} className="p-2 rounded-md border border-slate-200 dark:border-slate-700 hover:text-elora-gold" aria-label="Editar"><Icon name="edit-3" className="w-4 h-4" /></button>
                                        <button onClick={() => apagar(b)} className="p-2 rounded-md border border-slate-200 dark:border-slate-700 text-red-500" aria-label="Excluir"><Icon name="trash-2" className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        function AdminDashboard({ produtos, setProdutos, darkMode, logout, recarregarConfig, recarregarBanners }) {
            const [aba, setAba] = useState('resumo');
            const [pedidosAll, setPedidosAll] = useState([]);
            const [carregandoPedidos, setCarregandoPedidos] = useState(false);
            

            const [produtoEditando, setProdutoEditando] = useState(null);
            const [novoProduto, setNovoProduto] = useState({ 
                nome: '', marca: '', preco: '', precoAntigo: '', estoque: '', 
                categoria: 'Feminino', familia: 'Floral', 
                notasTopo: '', notasCoracao: '', notasFundo: '', 
                imagensExistentes: [] 
            });
            const [imagensArquivos, setImagensArquivos] = useState([]); 
            const [previewImgs, setPreviewImgs] = useState([]); 
            const [carregando, setCarregando] = useState(false);
            const [carregandoText, setCarregandoText] = useState('');

            useEffect(() => {
                if (aba === 'pedidos' || aba === 'resumo') {
                    (async () => {
                        setCarregandoPedidos(true);
                        try {
                            const { db, collection, getDocs } = await getFb();
                            const qs = await getDocs(collection(db, "pedidos"));
                            const lista = [];
                            qs.forEach(d => lista.push({ id: d.id, ...d.data() }));
                            lista.sort((a,b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
                            setPedidosAll(lista);
                        } catch (e) { console.error(e); }
                        setCarregandoPedidos(false);
                    })();
                }
            }, [aba]);

            const cancelarAbandonados = async () => {
                const lista = pedidosAbandonados(pedidosAll);
                if (!lista.length) return alert('Nenhum pedido aguardando pagamento há mais de 24h.');
                if (!confirm(`Cancelar ${lista.length} pedido(s) aguardando pagamento há mais de 24h? Se algum cliente pagar depois, o pedido volta para "Pago" automaticamente.`)) return;
                const agora = new Date().toISOString();
                for (const p of lista) await atualizarPedido(p.id, { status: 'Cancelado', canceladoEm: agora, motivoCancelamento: 'Pagamento não concluído em 24h' });
            };

            const handleImageChange = (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    setImagensArquivos(files);
                    const previews = files.map(file => URL.createObjectURL(file));
                    setPreviewImgs(previews);
                }
            };

            const handleSubmitProduto = async (e) => {
                e.preventDefault();
                setCarregando(true);
                setCarregandoText("A iniciar compressão...");
                
                try {
                    let urlsFinais = produtoEditando && novoProduto.imagensExistentes ? [...novoProduto.imagensExistentes] : [];

                    if (imagensArquivos.length > 0) {
                        for (let i = 0; i < imagensArquivos.length; i++) {
                            setCarregandoText(`A enviar foto ${i + 1} de ${imagensArquivos.length}...`);
                            
                            const imagemLeve = await compressImage(imagensArquivos[i]);
                            const formData = new FormData();
                            formData.append('image', imagemLeve);
                            
                            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: formData });
                            const data = await response.json();
                            if (data && data.success) urlsFinais.push(data.data.url);
                        }
                    }

                    urlsFinais = urlsFinais.filter(Boolean); 
                    if (urlsFinais.length === 0) urlsFinais = ['./royal-amber.jpeg']; 

                    setCarregandoText("A guardar produto...");
                    
                    const obj = {
                        nome: novoProduto.nome, 
                        marca: novoProduto.marca,
                        preco: Number(novoProduto.preco) || 0, 
                        precoAntigo: (Number(novoProduto.precoAntigo) || 0) > (Number(novoProduto.preco) || 0) ? Number(novoProduto.precoAntigo) : 0,
                        estoque: parseInt(novoProduto.estoque) || 0,
                        categoria: novoProduto.categoria || 'Feminino',
                        familia: novoProduto.familia || 'Floral',
                        notasTopo: novoProduto.notasTopo || '',
                        notasCoracao: novoProduto.notasCoracao || '',
                        notasFundo: novoProduto.notasFundo || '',
                        imagens: urlsFinais, 
                        tag: 'Oficial'
                    };

                    if (window.db && window.collection && window.addDoc && window.updateDoc && window.doc) {
                        if (produtoEditando) {
                            await window.updateDoc(window.doc(window.db, "perfumes", produtoEditando), obj);
                            setProdutos(produtos.map(p => p.id === produtoEditando ? { ...p, ...obj, id: produtoEditando } : p));
                            alert("Produto atualizado com sucesso!");
                        } else {
                            const docRef = await window.addDoc(window.collection(window.db, "perfumes"), obj);
                            setProdutos([...produtos, { ...obj, id: docRef.id }]);
                            alert("Produto cadastrado com Pirâmide Olfativa!");
                        }
                    }
                    cancelarEdicao();
                } catch (error) { 
                    alert("Aviso: Ocorreu uma instabilidade na rede. Tente enviar fotos menores ou uma de cada vez."); 
                } finally {
                    setCarregando(false);
                    setCarregandoText('');
                }
            };

            const editarProduto = (p) => {
                setProdutoEditando(p.id);
                setNovoProduto({ 
                    nome: p.nome || '', marca: p.marca || '', preco: p.preco || '', precoAntigo: p.precoAntigo || '', estoque: p.estoque || '', 
                    categoria: p.categoria || 'Feminino', familia: p.familia || 'Floral',
                    notasTopo: p.notasTopo || '', notasCoracao: p.notasCoracao || '', notasFundo: p.notasFundo || '',
                    imagensExistentes: p.imagens ? p.imagens.filter(Boolean) : (p.imagem ? [p.imagem] : []) 
                });
                setPreviewImgs(p.imagens ? p.imagens.filter(Boolean) : (p.imagem ? [p.imagem] : []));
                setImagensArquivos([]); 
            };

            const cancelarEdicao = () => {
                setProdutoEditando(null);
                setNovoProduto({ nome: '', marca: '', preco: '', precoAntigo: '', estoque: '', categoria: 'Feminino', familia: 'Floral', notasTopo: '', notasCoracao: '', notasFundo: '', imagensExistentes: [] });
                setPreviewImgs([]);
                setImagensArquivos([]);
            };

            const apagarProduto = async (id) => {
                if(!confirm("Tem a certeza que deseja excluir este produto?")) return;
                try {
                    await window.deleteDoc(window.doc(window.db, "perfumes", id));
                    setProdutos(produtos.filter(p => p.id !== id));
                } catch (e) { alert("Erro ao excluir."); }
            };

            const [filtroStatus, setFiltroStatus] = useState('Todos');
            const atualizarPedido = async (id, campos) => {
                try {
                    await window.updateDoc(window.doc(window.db, "pedidos", id), campos);
                    setPedidosAll(prev => prev.map(p => p.id === id ? { ...p, ...campos } : p));
                } catch (e) { console.error(e); alert("Erro ao atualizar o pedido."); }
            };

            return (
                <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
                        <div className="flex items-center gap-3">
                            <Icon name="layout-dashboard" className="text-elora-gold w-8 h-8" />
                            <div><h2 className="text-2xl sm:text-3xl font-serif">Painel de Gestão ERP</h2><p className="text-xs text-slate-400 mt-1">Acesso Exclusivo Administrador</p></div>
                        </div>
                        <button onClick={logout} className="flex items-center gap-2 text-red-500 hover:text-red-700 text-xs font-semibold uppercase tracking-widest transition-colors"><Icon name="log-out" className="w-4 h-4" /> Sair do Painel</button>
                    </div>
                    <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto">
                        {[['resumo', 'Resumo', 'bar-chart-3'], ['pedidos', 'Pedidos', 'package'], ['produtos', 'Catálogo', 'flask-conical'], ['banners', 'Banners', 'image'], ['cupons', 'Cupons', 'ticket'], ['config', 'Configurações', 'settings']].map(([k, t, ic]) => (
                            <button key={k} onClick={() => setAba(k)} className={`px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap flex items-center gap-2 ${aba === k ? 'border-b-2 border-elora-gold text-elora-gold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}><Icon name={ic} className="w-4 h-4" /> {t}</button>
                        ))}
                    </div>

                    {aba === 'resumo' && <AdminResumo pedidos={pedidosAll} produtos={produtos} darkMode={darkMode} carregando={carregandoPedidos} irPedidos={() => { setAba('pedidos'); setFiltroStatus('Pago'); }} />}
                    {aba === 'cupons' && <AdminCupons darkMode={darkMode} />}
                    {aba === 'banners' && <AdminBanners produtos={produtos} darkMode={darkMode} recarregarBanners={recarregarBanners} />}
                    {aba === 'config' && <AdminConfig darkMode={darkMode} recarregarConfig={recarregarConfig} />}

                    {aba === 'produtos' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                            <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border p-6 sm:p-8 h-fit rounded-xl shadow-xl`}>
                                <h3 className="text-lg font-serif mb-6 flex items-center gap-2"><Icon name={produtoEditando ? "edit-3" : "plus-circle"} className="w-5 h-5 text-elora-gold" />{produtoEditando ? "Editar Fragrância" : "Nova Fragrância"}</h3>
                                <form onSubmit={handleSubmitProduto} className="space-y-4">
                                    <div><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Nome</label><input value={novoProduto.nome} onChange={(e) => setNovoProduto({...novoProduto, nome: e.target.value})} className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-xs outline-none focus:border-elora-gold rounded-md`} required /></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Marca</label><input value={novoProduto.marca} onChange={(e) => setNovoProduto({...novoProduto, marca: e.target.value})} className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-xs outline-none focus:border-elora-gold rounded-md`} required /></div>
                                        <div>
                                            <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Público</label>
                                            <select value={novoProduto.categoria} onChange={(e) => setNovoProduto({...novoProduto, categoria: e.target.value})} className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-xs outline-none focus:border-elora-gold rounded-md cursor-pointer`}>
                                                <option value="Feminino">Feminino</option><option value="Masculino">Masculino</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Preço (R$)</label><input type="number" step="0.01" value={novoProduto.preco} onChange={(e) => setNovoProduto({...novoProduto, preco: e.target.value})} className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-xs outline-none focus:border-elora-gold rounded-md`} required /></div>
                                        <div><label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Estoque</label><input type="number" value={novoProduto.estoque} onChange={(e) => setNovoProduto({...novoProduto, estoque: e.target.value})} className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-xs outline-none focus:border-elora-gold rounded-md`} required /></div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Preço antigo "de" (R$) <span className="normal-case tracking-normal font-normal">opcional</span></label>
                                        <input type="number" step="0.01" min="0" value={novoProduto.precoAntigo} onChange={(e) => setNovoProduto({...novoProduto, precoAntigo: e.target.value})} className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-xs outline-none focus:border-elora-gold rounded-md`} placeholder="Deixe vazio se não estiver em promoção" />
                                        {(Number(novoProduto.precoAntigo) || 0) > (Number(novoProduto.preco) || 0) && (Number(novoProduto.preco) || 0) > 0 && <p className="text-[11px] text-red-600 mt-1 font-semibold">Vai aparecer: <span className="line-through text-slate-400 font-normal">{brl(novoProduto.precoAntigo)}</span> {brl(novoProduto.preco)} · etiqueta {Math.round((1 - novoProduto.preco / novoProduto.precoAntigo) * 100)}% OFF</p>}
                                    </div>
                                    
                                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                                        <label className="block text-[10px] text-elora-gold uppercase tracking-widest mb-3 font-bold"><Icon name="wind" className="w-3 h-3 inline mr-1"/> Pirâmide Olfativa</label>
                                        <div className="space-y-3">
                                            <div>
                                                <select value={novoProduto.familia} onChange={(e) => setNovoProduto({...novoProduto, familia: e.target.value})} className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-xs outline-none focus:border-elora-gold rounded-md cursor-pointer`}>
                                                    <option value="Floral">Família: Floral</option><option value="Amadeirado">Família: Amadeirado</option><option value="Oriental">Família: Oriental</option><option value="Especiado">Família: Especiado</option><option value="Adocicado">Família: Adocicado</option><option value="Fresco">Família: Fresco</option>
                                                </select>
                                            </div>
                                            <input value={novoProduto.notasTopo} onChange={(e) => setNovoProduto({...novoProduto, notasTopo: e.target.value})} className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-xs outline-none focus:border-elora-gold rounded-md`} placeholder="Notas de Topo (Ex: Bergamota)" />
                                            <input value={novoProduto.notasCoracao} onChange={(e) => setNovoProduto({...novoProduto, notasCoracao: e.target.value})} className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-xs outline-none focus:border-elora-gold rounded-md`} placeholder="Notas de Coração (Ex: Jasmim)" />
                                            <input value={novoProduto.notasFundo} onChange={(e) => setNovoProduto({...novoProduto, notasFundo: e.target.value})} className={`w-full ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-3 text-xs outline-none focus:border-elora-gold rounded-md`} placeholder="Notas de Fundo (Ex: Oud, Âmbar)" />
                                        </div>
                                    </div>

                                    <div className="border border-dashed border-slate-300 dark:border-slate-700 p-4 rounded-md text-center bg-slate-50 dark:bg-slate-800/50">
                                        <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-semibold cursor-pointer">
                                            <Icon name="upload-cloud" className="w-6 h-6 mx-auto mb-2 text-elora-gold" />
                                            {produtoEditando && !imagensArquivos.length ? 'Adicionar mais fotos' : 'Anexar Fotos'}
                                            <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                                        </label>
                                        {previewImgs.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2 justify-center">
                                                {previewImgs.map((src, i) => (<img key={i} src={src} className="h-12 w-12 object-cover rounded border border-slate-200 dark:border-slate-600" />))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        <button type="submit" disabled={carregando} className="flex-1 bg-elora-gold text-white py-3.5 text-[11px] font-bold uppercase tracking-widest hover:bg-slate-900 transition-colors rounded-md shadow-md">{carregando ? carregandoText : (produtoEditando ? 'Guardar' : 'Cadastrar')}</button>
                                        {produtoEditando && <button type="button" onClick={cancelarEdicao} className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-3.5 rounded-md text-[11px] font-bold uppercase tracking-widest hover:bg-slate-300 transition-colors">Cancelar</button>}
                                    </div>
                                </form>
                            </div>
                            <div className={`lg:col-span-2 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border p-6 sm:p-8 rounded-xl shadow-xl`}>
                                <h3 className="text-lg font-serif mb-6 flex items-center gap-2"><Icon name="package" className="w-5 h-5 text-elora-gold" /> Catálogo Ativo</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs sm:text-sm text-slate-400">
                                        <thead><tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-widest"><th className="pb-3 font-semibold">Produto</th><th className="pb-3 font-semibold">Preço / Estoque</th><th className="pb-3 font-semibold text-right">Ações</th></tr></thead>
                                        <tbody>
                                            {produtos.length === 0 ? <tr><td colSpan="3" className="py-8 text-center text-slate-500 text-xs">Catálogo vazio.</td></tr> : (
                                                produtos.map(p => {
                                                    const imgValida = p.imagens ? p.imagens.filter(Boolean)[0] : p.imagem;
                                                    return (
                                                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="py-3 flex items-center gap-3"><img src={imgValida} className="w-10 h-10 object-cover rounded" /><div><span className="text-elora-gold text-[9px] uppercase font-bold block tracking-widest">{p.marca} - {p.familia}</span><span className="font-medium text-slate-700 dark:text-slate-200">{p.nome}</span></div></td>
                                                        <td className="py-3"><div className="font-medium">{precoAntigoDe(p) > 0 && <span className="line-through text-slate-400 text-[10px] mr-1">{brl(p.precoAntigo)}</span>}{brl((Number(p.preco)||0))}{descontoPct(p) > 0 && <span className="ml-1 text-[9px] font-bold text-white bg-red-600 rounded-full px-1.5 py-0.5">{descontoPct(p)}% OFF</span>}</div><div className="text-[10px] mt-0.5">{p.estoque} un. disponíveis</div></td>
                                                        <td className="py-3 text-right space-x-2">
                                                            <button onClick={() => editarProduto(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"><Icon name="pencil" className="w-4 h-4" /></button>
                                                            <button onClick={() => apagarProduto(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Icon name="trash-2" className="w-4 h-4" /></button>
                                                        </td>
                                                    </tr>
                                                )})
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {aba === 'pedidos' && (
                        <div className="animate-fade-in">
                            {pedidosAbandonados(pedidosAll).length > 0 && (
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                                    <span>{pedidosAbandonados(pedidosAll).length} pedido(s) aguardando pagamento há mais de 24h. O site cancela esses pedidos sozinho todo dia de manhã.</span>
                                    <button onClick={cancelarAbandonados} className="px-3 py-2 bg-amber-600 text-white rounded-md font-bold uppercase tracking-widest text-[10px]">Cancelar agora</button>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {['Todos', ...STATUS_PEDIDO].map(s => {
                                    const n = s === 'Todos' ? pedidosAll.length : pedidosAll.filter(p => p.status === s).length;
                                    return <button key={s} onClick={() => setFiltroStatus(s)} className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${filtroStatus === s ? 'bg-elora-gold border-elora-gold text-white' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>{s} ({n})</button>;
                                })}
                            </div>
                            {pedidosAll.filter(p => filtroStatus === 'Todos' || p.status === filtroStatus).length === 0 ? (
                                <p className="text-center text-slate-500 py-16 text-sm">Nenhum pedido aqui.</p>
                            ) : (
                                <div className="space-y-4">
                                    {pedidosAll.filter(p => filtroStatus === 'Todos' || p.status === filtroStatus).map(p => {
                                        const c = p.cliente || {};
                                        const tel = (c.telefone || '').replace(/\D/g, '');
                                        return (
                                            <div key={p.id} className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border rounded-xl shadow-md p-5 sm:p-6`}>
                                                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                                    <div>
                                                        <p className="font-bold text-sm tracking-wider">{p.order_nsu}</p>
                                                        <p className="text-[10px] text-slate-400">{formatarData(p.dataCriacao)}</p>
                                                    </div>
                                                    <select value={p.status || 'Aguardando Pagamento'} onChange={e => atualizarPedido(p.id, { status: e.target.value })} className={`text-[11px] font-bold uppercase tracking-wider px-3 py-2 rounded-md border-0 cursor-pointer ${STATUS_CORES[p.status] || STATUS_CORES['Aguardando Pagamento']}`}>
                                                        {STATUS_PEDIDO.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                                                    <div className="space-y-1 text-slate-600 dark:text-slate-300">
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">Cliente</p>
                                                        <p className="font-semibold">{c.nome}</p>
                                                        <p className="break-all">{c.email}</p>
                                                        <p>CPF: {c.cpf}</p>
                                                        {tel && <a href={`https://wa.me/55${tel.replace(/^55/, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-600 font-bold hover:underline">WhatsApp {c.telefone}</a>}
                                                    </div>
                                                    <div className="space-y-1 text-slate-600 dark:text-slate-300">
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">Entrega {p.freteTipo ? `· ${p.freteTipo}` : ''}</p>
                                                        <p>{c.rua}, {c.numero} {c.complemento}</p>
                                                        <p>{c.bairro} — {c.cidade}/{c.uf}</p>
                                                        <p>CEP {c.cep}</p>
                                                        <input defaultValue={p.rastreio || ''} onBlur={e => { const v = e.target.value.trim().toUpperCase(); if (v !== (p.rastreio || '')) atualizarPedido(p.id, { rastreio: v }); }} placeholder="Código de rastreio (salva ao sair do campo)" className={`w-full mt-2 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} border p-2 text-xs outline-none focus:border-elora-gold rounded-md uppercase`} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-2">Itens</p>
                                                        <ItensPedido itens={p.itens} />
                                                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-0.5 text-slate-500">
                                                            <p className="flex justify-between"><span>Frete</span><span>{brl((Number(p.valorFrete) || 0))}</span></p>
                                                            {p.cupom && <p className="flex justify-between text-emerald-600"><span>Cupom {p.cupom}</span><span>- {brl(((Number(p.descontoFrete) || 0) + (Number(p.descontoCupom) || 0)))}</span></p>}
                                                            <p className="flex justify-between font-bold text-slate-800 dark:text-slate-100 text-sm"><span>Total</span><span>{brl((Number(p.valorTotal) || 0))}</span></p>
                                                            {p.pagamento && (
                                                                <div className={`mt-2 p-2 rounded text-[11px] ${p.pagamento.valorAbaixoDoEsperado ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                                                                    <p className="font-bold">{p.pagamento.valorAbaixoDoEsperado ? '⚠ Valor pago abaixo do esperado' : 'Pagamento confirmado'}</p>
                                                                    <p>{brl((Number(p.pagamento.valorPago) || 0))} via {p.pagamento.metodo === 'pix' ? 'PIX' : p.pagamento.metodo === 'credit_card' ? `cartão (${p.pagamento.parcelas}x)` : p.pagamento.metodo}</p>
                                                                    {p.pagamento.comprovante && <a href={p.pagamento.comprovante} target="_blank" rel="noreferrer" className="underline">Comprovante</a>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        // --- APP PRINCIPAL INTEGRANDO FAVORITOS ---
        function App() {
            const [view, setView] = useState('store'); 
            const [quizOpen, setQuizOpen] = useState(false);
            const [authModalOpen, setAuthModalOpen] = useState(false);
            const [authNotice, setAuthNotice] = useState('');
            const [produtos, setProdutos] = useState([]); 
            
            const [termoBusca, setTermoBusca] = useState('');
            const [filtroAtivo, setFiltroAtivo] = useState('Todos');

            const [cart, setCart] = useState(() => {
                try { const s = localStorage.getItem('elora_cart'); return s ? JSON.parse(s).map(i => ({ ...i, qtd: qtdItem(i) })) : []; } catch (e) { return []; }
            });
            const [cartOpen, setCartOpen] = useState(false);
            const [produtoSelecionado, setProdutoSelecionado] = useState(null);
            const [darkMode, setDarkMode] = useState(() => { try { return localStorage.getItem('elora_dark') === '1'; } catch (e) { return false; } });
            const [pedidoConfirmado, setPedidoConfirmado] = useState(null);

            const [favorites, setFavorites] = useState(() => {
                try { const saved = localStorage.getItem('elora_favorites'); return saved ? JSON.parse(saved) : []; } catch (e) { return []; }
            });

            const [user, setUser] = useState(null);
            const [authCarregando, setAuthCarregando] = useState(true);
            const [configLoja, setConfigLoja] = useState(CONFIG_PADRAO);
            const carregarConfig = async () => {
                try {
                    const { db, doc, getDoc } = await getFb();
                    const s = await getDoc(doc(db, 'config', 'loja'));
                    if (s.exists()) {
                        const d = s.data();
                        setConfigLoja({
                            pixDesconto: (d.pixDesconto === undefined || d.pixDesconto === null) ? CONFIG_PADRAO.pixDesconto : (Number(d.pixDesconto) || 0),
                            parcelas: (d.parcelas === undefined || d.parcelas === null) ? CONFIG_PADRAO.parcelas : (parseInt(d.parcelas) || 1),
                            avisosTopo: Array.isArray(d.avisosTopo) ? d.avisosTopo.filter(Boolean) : [],
                            bannerSegundos: Math.min(30, Math.max(3, Number(d.bannerSegundos) || CONFIG_PADRAO.bannerSegundos))
                        });
                    }
                } catch (e) { console.error(e); }
            };
            useEffect(() => { carregarConfig(); }, []);

            const [banners, setBanners] = useState([]);
            const carregarBanners = async () => {
                try {
                    const { db, collection, getDocs } = await getFb();
                    const sn = await getDocs(collection(db, 'banners'));
                    setBanners(sn.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => b.imagem && situacaoBanner(b) === 'No ar').sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0)));
                } catch (e) { console.error(e); }
            };
            useEffect(() => { carregarBanners(); }, []);

            // Sessão real do Firebase Auth (não dá mais para "virar admin" pelo localStorage)
            useEffect(() => {
                localStorage.removeItem('elora_user'); // limpa sessões do sistema antigo
                let unsub = () => {};
                getFb().then(({ auth, onAuthStateChanged }) => {
                    unsub = onAuthStateChanged(auth, async (fbUser) => {
                        if (!fbUser) { setUser(null); setAuthCarregando(false); return; }
                        const novo = await montarUsuario(fbUser);
                        setUser(prev => (prev && prev.uid === novo.uid && prev.nome) ? prev : novo);
                        setAuthCarregando(false);
                    });
                });
                return () => unsub();
            }, []);

            useEffect(() => { try { localStorage.setItem('elora_cart', JSON.stringify(cart)); } catch (e) {} }, [cart]);
            useEffect(() => { try { localStorage.setItem('elora_dark', darkMode ? '1' : '0'); } catch (e) {} }, [darkMode]);

            // Retorno da InfinitePay: o /api/checkout deve usar redirect_url = https://site-elora.vercel.app/?pedido=ELORA-...
            useEffect(() => {
                const params = new URLSearchParams(window.location.search);
                const nsu = params.get('pedido') || params.get('order_nsu');
                if (nsu) {
                    setPedidoConfirmado(nsu);
                    setCart([]);
                    setView('pedido-confirmado');
                    window.history.replaceState({}, '', '/');
                }
            }, []);

            useEffect(() => {
                const carregarPerfumes = async () => {
                    const { db, collection, getDocs } = await getFb();
                    try {
                        const qs = await getDocs(collection(db, "perfumes"));
                        const lista = [];
                        qs.forEach(d => lista.push({ id: d.id, ...d.data() }));
                        setProdutos(lista);
                    } catch (e) { console.error(e); setProdutos([]); }
                };
                carregarPerfumes();
            }, [view]);

            const produtosFiltrados = produtos.filter(p => {
                const nome = p.nome ? p.nome.toLowerCase() : '';
                const marca = p.marca ? p.marca.toLowerCase() : '';
                const busca = termoBusca.toLowerCase();
                const matchBusca = nome.includes(busca) || marca.includes(busca);
                const matchFiltro = filtroAtivo === 'Todos' || p.categoria === filtroAtivo;
                return matchBusca && matchFiltro;
            });

            // Usa sempre o estoque mais recente do catálogo
            const estoqueAtual = (id) => { const p = produtos.find(x => x.id === id); return p ? p : null; };

            const adicionarItem = (lista, produto, apenasGarantir = false) => {
                const ref = estoqueAtual(produto.id) || produto;
                if (estaEsgotado(ref)) { alert('Este perfume está esgotado no momento.'); return null; }
                const existente = lista.find(i => i.id === produto.id);
                if (existente && apenasGarantir) return lista;
                const novaQtd = (existente ? qtdItem(existente) : 0) + 1;
                if (temControleEstoque(ref) && novaQtd > Number(ref.estoque)) { alert(`Temos apenas ${ref.estoque} unidade(s) deste perfume em estoque.`); return null; }
                if (existente) return lista.map(i => i.id === produto.id ? { ...i, qtd: novaQtd } : i);
                return [...lista, { ...produto, qtd: 1 }];
            };

            const addToCart = (produto) => {
                const novo = adicionarItem(cart, produto);
                if (!novo) return;
                setCart(novo);
                setCartOpen(true);
            };

            const handleBuyNow = (produto) => {
                const novo = adicionarItem(cart, produto, true);
                if (!novo) return;
                setCart(novo);
                setQuizOpen(false);
                if (!user) {
                    setAuthNotice('Crie sua conta ou faça login para finalizar a sua compra.');
                    setAuthModalOpen(true);
                } else {
                    setView('checkout');
                    window.scrollTo(0,0);
                }
            };

            const alterarQtd = (id, delta) => {
                const item = cart.find(i => i.id === id);
                if (!item) return;
                const novaQtd = qtdItem(item) + delta;
                if (novaQtd <= 0) return removeFromCart(id);
                const ref = estoqueAtual(id) || item;
                if (delta > 0 && temControleEstoque(ref) && novaQtd > Number(ref.estoque)) { alert(`Temos apenas ${ref.estoque} unidade(s) deste perfume em estoque.`); return; }
                setCart(cart.map(i => i.id === id ? { ...i, qtd: novaQtd } : i));
            };

            const removeFromCart = (id) => {
                const newCart = cart.filter(i => i.id !== id);
                setCart(newCart);
                if (newCart.length === 0) setCartOpen(false);
            };

            const toggleFav = (id) => {
                setFavorites(prev => {
                    const newFavs = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
                    try { localStorage.setItem('elora_favorites', JSON.stringify(newFavs)); } catch (e) {}
                    return newFavs;
                });
            };

            const iniciarCheckout = () => {
                setCartOpen(false);
                if (!user) { setAuthNotice('Crie sua conta ou faça login para prosseguir com a compra.'); setAuthModalOpen(true); }
                else { setView('checkout'); window.scrollTo(0,0); }
            };

            const logout = async () => {
                const { auth, signOut } = await getFb();
                await signOut(auth);
                setUser(null);
                setView('store');
            };

            const handleAuthSuccess = (loggedUser) => {
                setUser(loggedUser);
                setAuthModalOpen(false);
                setAuthNotice('');
                if (loggedUser && loggedUser.role === 'admin') setView('admin');
                else if (cart.length > 0) { setView('checkout'); window.scrollTo(0,0); }
                else setView('account');
            };

            const clicarBanner = (b) => {
                if (b.linkTipo === 'perfume') { const p = produtos.find(x => x.id === b.linkValor); if (p) setProdutoSelecionado(p); }
                else if (b.linkTipo === 'categoria') {
                    setFiltroAtivo(b.linkValor || 'Todos');
                    const alvo = document.getElementById('catalogo'); if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                else if (b.linkTipo === 'url' && /^https?:\/\//.test(b.linkValor || '')) window.open(b.linkValor, '_blank', 'noopener');
            };

            const irPara = (v) => {
                setView(v);
                if (window.location.hash || window.location.pathname !== '/') window.history.replaceState({}, '', '/');
                window.scrollTo(0,0);
            };
            // Abrir um perfume muda o endereço para /p/ID (link compartilhável); fechar volta para /
            const produtosRef = useRef([]);
            const linkInicial = useRef((window.location.pathname.match(/^\/p\/([^/?#]+)/) || [])[1] || null);
            useEffect(() => { produtosRef.current = produtos; }, [produtos]);
            useEffect(() => {
                const path = window.location.pathname;
                if (produtoSelecionado) {
                    const alvo = `/p/${produtoSelecionado.id}`;
                    if (path !== alvo) window.history.pushState({}, '', alvo);
                } else if (path.startsWith('/p/') && !linkInicial.current) {
                    window.history.replaceState({}, '', '/');
                }
            }, [produtoSelecionado]);
            useEffect(() => {
                if (!linkInicial.current || !produtos.length) return;
                const id = linkInicial.current;
                linkInicial.current = null;
                const p = produtos.find(x => x.id === id);
                if (p) setProdutoSelecionado(p); else window.history.replaceState({}, '', '/');
            }, [produtos]);
            useEffect(() => {
                const onPop = () => {
                    const m = window.location.pathname.match(/^\/p\/([^/?#]+)/);
                    const p = m && produtosRef.current.find(x => x.id === m[1]);
                    setProdutoSelecionado(p || null);
                };
                window.addEventListener('popstate', onPop);
                return () => window.removeEventListener('popstate', onPop);
            }, []);

            const irPagina = (p) => { setProdutoSelecionado(null); setAuthModalOpen(false); setView('legal-' + p); window.location.hash = p; window.scrollTo(0,0); };

            useEffect(() => {
                const lerHash = () => {
                    const h = window.location.hash.replace('#', '');
                    if (PAGINAS_LEGAIS[h]) { setView('legal-' + h); window.scrollTo(0,0); }
                };
                lerHash();
                window.addEventListener('hashchange', lerHash);
                return () => window.removeEventListener('hashchange', lerHash);
            }, []);

            return (
                <ConfigLoja.Provider value={configLoja}>
                <div className={`min-h-screen font-sans flex flex-col transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-[#FDFBF7] text-slate-900'}`}>
                    
                    <PromoTicker />
                    <WhatsAppButton />

                    <header className={`${darkMode ? 'bg-elora-darkbg border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-md border-b py-3 sm:py-4 md:py-6 sticky top-0 z-40 shadow-sm transition-colors`}>
                        <div className="max-w-7xl w-full mx-auto px-4 flex justify-between items-center relative">
                            <div className="sm:hidden">
                                <LogoPremium compacto onClick={() => irPara('store')} darkMode={darkMode} />
                            </div>
                            <div className="hidden sm:flex w-1/3 items-center gap-3">
                                <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-elora-gold transition-colors flex items-center gap-2 text-xs">
                                    <Icon name={darkMode ? "sun" : "moon"} className={`w-4 h-4 ${darkMode ? 'text-amber-400' : ''}`} />
                                    <span className="hidden md:inline font-semibold uppercase tracking-wider text-[10px]">{darkMode ? 'Claro' : 'Escuro'}</span>
                                </button>
                                {user && user.role === 'admin' && view !== 'admin' && (
                                    <button onClick={() => setView('admin')} className="text-[10px] font-bold uppercase tracking-widest text-elora-gold hover:text-amber-600 hidden lg:block border border-elora-gold px-3 py-1.5 rounded">Painel</button>
                                )}
                            </div>

                            <div className="hidden sm:block absolute left-1/2 -translate-x-1/2">
                                <LogoPremium onClick={() => setView('store')} darkMode={darkMode} />
                            </div>

                            {/* Estilo Magalu: ícones grandes e firmes; ordem Favoritos → Sacola → Entrar */}
                            <div className="flex items-center justify-end gap-4 sm:gap-5 sm:w-1/3">
                                {(!user || user.role !== 'admin') && (
                                    <button onClick={() => irPara('favorites')} className="relative text-slate-700 dark:text-slate-200 hover:text-red-500 transition-colors p-0.5" title="Meus Favoritos" aria-label="Meus Favoritos">
                                        <Icon name="heart" traco="2.25" className="w-[26px] h-[26px] sm:w-6 sm:h-6" />
                                        {favorites.length > 0 && <span className="absolute -top-1.5 -right-2 min-w-[19px] h-[19px] px-1 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900">{favorites.length}</span>}
                                    </button>
                                )}

                                {(!user || user.role !== 'admin') && (
                                    <button onClick={() => setCartOpen(true)} className="relative text-slate-700 dark:text-slate-200 hover:text-elora-gold transition-colors p-0.5" title="Sacola" aria-label="Sacola">
                                        <Icon name="shopping-bag" traco="2.25" className="w-[26px] h-[26px] sm:w-6 sm:h-6" />
                                        <span className={`absolute -top-1.5 -right-2 min-w-[19px] h-[19px] px-1 text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900 ${cart.length > 0 ? 'bg-elora-gold text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>{totalItens(cart)}</span>
                                    </button>
                                )}

                                <button onClick={() => {
                                    if (authCarregando) return;
                                    if (user && user.role === 'admin') irPara('admin');
                                    else if (user) irPara('account');
                                    else { setAuthNotice(''); setAuthModalOpen(true); }
                                }} aria-label={user && user.role === 'admin' ? 'Gestão' : (user ? 'Minha conta' : 'Entrar')} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-700 dark:text-slate-200 hover:text-elora-gold transition-colors p-0.5">
                                    <Icon name={user && user.role === 'admin' ? "layout-dashboard" : "circle-user-round"} traco="2" className="w-7 h-7 sm:w-6 sm:h-6" />
                                    <span className="hidden md:inline">{user && user.role === 'admin' ? 'Gestão' : (user ? 'Conta' : 'Entrar')}</span>
                                </button>
                            </div>
                        </div>
                    </header>

                    <main className="flex-grow">
                        {view === 'admin' && user && user.role === 'admin' && <AdminDashboard produtos={produtos} setProdutos={setProdutos} darkMode={darkMode} logout={logout} recarregarConfig={carregarConfig} recarregarBanners={carregarBanners} />}
                        {view === 'account' && user && user.role !== 'admin' && <CustomerAccount user={user} setUser={setUser} logout={logout} voltar={() => irPara('store')} irFavoritos={() => irPara('favorites')} darkMode={darkMode} />}
                        {view === 'account' && !user && !authCarregando && (
                            <div className="max-w-md mx-auto text-center py-24 px-4">
                                <h2 className="text-2xl font-serif mb-4">Faça login para ver sua conta</h2>
                                <button onClick={() => { setAuthNotice(''); setAuthModalOpen(true); }} className="bg-elora-gold text-white px-8 py-3 text-xs font-bold uppercase tracking-widest rounded-md">Entrar</button>
                            </div>
                        )}
                        {view.startsWith('legal-') && <PaginaLegal pagina={view.replace('legal-', '')} irPagina={irPagina} voltar={() => irPara('store')} darkMode={darkMode} />}
                        {view === 'pedido-confirmado' && <PedidoConfirmado nsu={pedidoConfirmado} user={user} darkMode={darkMode} irConta={() => irPara('account')} irLoja={() => irPara('store')} />}
                        {view === 'checkout' && cart.length > 0 && user && <Checkout cart={cart} user={user} voltarParaLoja={() => {setView('store'); setCartOpen(true);}} darkMode={darkMode} />}
                        
                        {view === 'favorites' && (!user || user.role !== 'admin') && (
                            <FavoritesPage 
                                produtos={produtos} 
                                favorites={favorites} 
                                onToggleFav={toggleFav} 
                                onAddToCart={addToCart} 
                                onBuyNow={handleBuyNow} 
                                darkMode={darkMode} 
                                voltarParaLoja={() => irPara('store')} 
                                onSwitchProduct={setProdutoSelecionado} 
                            />
                        )}

                        {view === 'store' && (
                            <div className="animate-fade-in">
                                <HeroCarrossel banners={banners} onQuiz={() => setQuizOpen(true)} onClicarBanner={clicarBanner} />

                                <section id="catalogo" className="max-w-7xl mx-auto px-4 py-12 sm:py-20 scroll-mt-24">
                                    <div className="mb-12 flex flex-col items-center">
                                        <h2 className="text-3xl sm:text-4xl font-serif mb-8 text-center">Catálogo Exclusivo</h2>
                                        
                                        <div className="w-full max-w-3xl space-y-4">
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    placeholder="Buscar por nome ou marca da fragrância..." 
                                                    value={termoBusca}
                                                    onChange={(e) => setTermoBusca(e.target.value)}
                                                    className={`w-full p-4 pl-12 rounded-full border ${darkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-elora-gold' : 'bg-white border-slate-200 focus:border-elora-gold'} outline-none shadow-sm transition-all`}
                                                />
                                                <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                            </div>

                                            <div className="flex flex-wrap justify-center gap-2">
                                                {['Todos', 'Feminino', 'Masculino'].map((cat) => (
                                                    <button 
                                                        key={cat}
                                                        onClick={() => setFiltroAtivo(cat)}
                                                        className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${filtroAtivo === cat ? 'bg-elora-gold border-elora-gold text-white' : darkMode ? 'border-slate-700 text-slate-300 hover:border-elora-gold' : 'border-slate-200 text-slate-600 hover:border-elora-gold'}`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {produtos.length === 0 ? (
                                        <div className="text-center py-16 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8">
                                            <Icon name="sparkles" className="w-12 h-12 text-elora-gold mx-auto mb-4 opacity-80" />
                                            <h3 className="text-2xl font-serif mb-2">Catálogo Oficial em Preparação</h3>
                                        </div>
                                    ) : produtosFiltrados.length === 0 ? (
                                        <div className="text-center py-16">
                                            <Icon name="search-x" className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                                            <p className="text-slate-500">Nenhuma fragrância encontrada com estes filtros.</p>
                                            <button onClick={() => {setTermoBusca(''); setFiltroAtivo('Todos');}} className="mt-4 text-elora-gold font-bold text-xs uppercase tracking-widest hover:underline">Limpar Filtros</button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                                            {produtosFiltrados.map((produto) => (
                                                <ProductCard 
                                                    key={produto.id} 
                                                    produto={produto} 
                                                    onClick={setProdutoSelecionado} 
                                                    onAddToCart={addToCart} 
                                                    onBuyNow={handleBuyNow}
                                                    darkMode={darkMode} 
                                                    isFav={favorites.includes(produto.id)}
                                                    onToggleFav={() => toggleFav(produto.id)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}
                    </main>

                    <Rodape darkMode={darkMode} setDarkMode={setDarkMode} irPara={irPara} irPagina={irPagina} />
                    <AvisoCookies irPagina={irPagina} darkMode={darkMode} />

                    <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} cart={cart} removeFromCart={removeFromCart} alterarQtd={alterarQtd} onCheckout={iniciarCheckout} darkMode={darkMode} />
                    {produtoSelecionado && <ProductModal produto={produtoSelecionado} todosProdutos={produtos} onSwitchProduct={setProdutoSelecionado} onClose={() => setProdutoSelecionado(null)} onAddToCart={addToCart} onBuyNow={handleBuyNow} darkMode={darkMode} />}
                    {quizOpen && <QuizModal onClose={() => setQuizOpen(false)} produtos={produtos} onAddToCart={(p) => { setQuizOpen(false); addToCart(p); }} onVerProduto={(p) => { setQuizOpen(false); setProdutoSelecionado(p); }} darkMode={darkMode} />}
                    {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} onSuccess={handleAuthSuccess} mensagemExtra={authNotice} darkMode={darkMode} />}
                </div>
                </ConfigLoja.Provider>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
