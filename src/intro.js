// ===== Abertura da Elora Parfums =====
// Estrela árabe de 8 pontas desenhada em ouro -> explode em poeira dourada com fumaça de oud
// -> a poeira forma "ELORA" -> reflexo de luz -> a loja aparece.
// Tudo desenhado em código (nítido em qualquer tela), ~5 segundos, sem toque.
// Aparece 1x por dia por visitante. Para forçar (testes): site-elora.vercel.app/?intro=1
(function () {
  var params = new URLSearchParams(location.search);
  var forcar = params.get('intro') === '1';
  var hoje = new Date().toISOString().slice(0, 10);
  var CHAVE = 'elora_intro_dia';
  function lerVisto() { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } }
  function marcarVisto() { try { localStorage.setItem(CHAVE, hoje); } catch (e) {} }

  if (!forcar) {
    if (lerVisto() === hoje) return;
    if (navigator.webdriver) return;
    if (location.pathname.indexOf('/p/') === 0) return;
    if (params.get('pedido') || params.get('order_nsu')) return;
    if (/^#(trocas|privacidade|termos)$/.test(location.hash)) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  }

  var OURO = '#D4AF37', OURO_CLARO = '#F7E7B0', OURO_ESCURO = '#8C6A1C';
  var css = '' +
    '#elora-intro{position:fixed;inset:0;z-index:99999;background:radial-gradient(ellipse at 50% 42%,#141c38 0%,#0A1128 45%,#03060f 100%);transition:opacity .8s ease,transform 1.1s cubic-bezier(.3,0,.2,1);overflow:hidden;-webkit-tap-highlight-color:transparent}' +
    '#elora-intro.saindo{opacity:0;transform:scale(1.12);pointer-events:none}' +
    '#elora-intro canvas{position:absolute;inset:0;width:100%;height:100%}' +
    '#ei-pular{position:absolute;top:max(16px,env(safe-area-inset-top));right:16px;z-index:2;background:rgba(255,255,255,.06);border:1px solid rgba(212,175,55,.35);color:#d9c9a3;font:600 10px/1 Inter,system-ui,sans-serif;letter-spacing:.28em;text-transform:uppercase;padding:10px 15px;border-radius:999px;cursor:pointer;opacity:0;animation:eiAparece .6s .4s forwards}' +
    '@keyframes eiAparece{to{opacity:1}}';

  var el = document.createElement('div');
  el.id = 'elora-intro';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Abertura Elora Parfums');
  el.innerHTML = '<style>' + css + '</style><canvas></canvas><button id="ei-pular" type="button">Pular</button>';

  function montar() {
    document.body.appendChild(el);
    var overflowAntes = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    var cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5), W, H, CX, CY, R;
    function medir() {
      W = el.clientWidth; H = el.clientHeight; CX = W / 2; CY = H * 0.46;
      R = Math.min(W * 0.36, H * 0.22);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    medir();

    // ---------- utilitários ----------
    var ease = function (t) { t = Math.max(0, Math.min(1, t)); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var easeOut = function (t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3); };
    var faixa = function (t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); };
    var mobile = W < 700;

    // ---------- estrela de 8 pontas (dois quadrados girados + octógono interno) ----------
    function quadrado(r, rot) { var p = []; for (var i = 0; i <= 4; i++) { var a = rot + i * Math.PI / 2; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; }
    function poligono(n, r, rot) { var p = []; for (var i = 0; i <= n; i++) { var a = rot + i * 2 * Math.PI / n; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; }
    function estrela8(r) {
      // contorno externo da estrela (16 vértices alternando ponta/vale)
      var p = [], vale = r * Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8) * 0.765;
      for (var i = 0; i <= 16; i++) { var a = -Math.PI / 2 + i * Math.PI / 8, rr = i % 2 === 0 ? r : vale; p.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      return p;
    }
    function caminhos() {
      return [
        { p: quadrado(R, -Math.PI / 2 + Math.PI / 4), w: 1.4 },
        { p: quadrado(R, -Math.PI / 2), w: 1.4 },
        { p: estrela8(R * 0.62), w: 1.1 },
        { p: poligono(8, R * 0.34, -Math.PI / 2 + Math.PI / 8), w: 1 },
        { p: poligono(64, R * 1.18, 0), w: .7 },
        { p: poligono(64, R * 1.26, 0), w: .5 }
      ];
    }
    function comprimento(p) { var L = 0; for (var i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
    function desenharParcial(p, prog) {
      var L = comprimento(p) * prog, acc = 0;
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
      for (var i = 1; i < p.length; i++) {
        var s = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
        if (acc + s >= L) { var k = (L - acc) / s; ctx.lineTo(p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k); break; }
        ctx.lineTo(p[i][0], p[i][1]); acc += s;
      }
      ctx.stroke();
    }
    function amostrar(p, n) { // pontos espalhados pelo contorno (viram partículas na explosão)
      var L = comprimento(p), out = [], passo = L / n, alvo = 0, acc = 0;
      for (var i = 1; i < p.length && out.length < n; i++) {
        var s = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
        while (alvo <= acc + s && out.length < n) { var k = (alvo - acc) / s; out.push([p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k]); alvo += passo; }
        acc += s;
      }
      return out;
    }

    // ---------- texto "ELORA" em pontos ----------
    var FONTE = '"Playfair Display", Georgia, "Times New Roman", serif';
    var tamTexto, espac, textoY;
    function layoutTexto() {
      tamTexto = Math.min(W * 0.17, 116); espac = tamTexto * 0.3; textoY = CY + tamTexto * 0.36;
    }
    function larguraTexto(c, txt, esp) { var w = 0; for (var i = 0; i < txt.length; i++) w += c.measureText(txt[i]).width + (i < txt.length - 1 ? esp : 0); return w; }
    function escreverEspacado(c, txt, cx, y, esp) {
      var w = larguraTexto(c, txt, esp), x = cx - w / 2;
      for (var i = 0; i < txt.length; i++) { c.fillText(txt[i], x, y); x += c.measureText(txt[i]).width + esp; }
      return w;
    }
    function alvosTexto(max) {
      var oc = document.createElement('canvas'); oc.width = Math.ceil(W); oc.height = Math.ceil(H);
      var o = oc.getContext('2d'); o.fillStyle = '#fff'; o.textBaseline = 'alphabetic';
      o.font = '700 ' + tamTexto + 'px ' + FONTE; escreverEspacado(o, 'ELORA', CX, textoY, espac);
      var d = o.getImageData(0, 0, oc.width, oc.height).data, pts = [], passo = Math.max(2, Math.round(tamTexto / 34));
      for (var y = 0; y < oc.height; y += passo) for (var x = 0; x < oc.width; x += passo) if (d[(y * oc.width + x) * 4 + 3] > 128) pts.push([x, y]);
      for (var i = pts.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
      return pts.slice(0, max);
    }

    // ---------- partículas ----------
    var poeira = [], fumaca = [], faiscas = [];
    for (var i = 0; i < (mobile ? 45 : 80); i++) poeira.push({ x: Math.random(), y: Math.random(), r: .4 + Math.random() * 1.3, v: .00006 + Math.random() * .00018, f: Math.random() * 6.3 });
    function novaFumaca() {
      return { x: CX + (Math.random() - .5) * R * .5, y: CY + R * 0.2, vx: (Math.random() - .5) * .25, vy: -.35 - Math.random() * .55, r: R * (.18 + Math.random() * .2), a: 0, amax: .05 + Math.random() * .05, vida: 0, dur: 220 + Math.random() * 160, f: Math.random() * 6.3 };
    }
    var particulas = null; // criadas na explosão

    // ---------- linha do tempo ----------
    var t0 = null, encerrado = false, rodando = true;
    var T = { desenho: [0, 1300], brilho: [1000, 1700], explosao: 1650, forma: [1950, 3200], texto: [2950, 3500], sub: [3350, 3900], tag: [3650, 4300], reflexo: [3800, 4500], fim: 5100 };

    function quadro(agora) {
      if (!rodando) return;
      if (t0 === null) t0 = agora;
      var t = agora - t0;
      ctx.clearRect(0, 0, W, H);

      // poeira de fundo
      for (var i = 0; i < poeira.length; i++) {
        var q = poeira[i]; q.y -= q.v * 16; q.f += .02; if (q.y < -0.02) { q.y = 1.02; q.x = Math.random(); }
        ctx.fillStyle = 'rgba(232,200,120,' + (.12 + .25 * (.5 + .5 * Math.sin(q.f))) + ')';
        ctx.beginPath(); ctx.arc(q.x * W + Math.sin(q.f) * 6, q.y * H, q.r, 0, 6.29); ctx.fill();
      }

      // fumaça de oud (sobe a partir da estrela)
      if (t > 800 && t < T.fim - 300 && fumaca.length < (mobile ? 26 : 40) && Math.random() < .35) fumaca.push(novaFumaca());
      ctx.globalCompositeOperation = 'lighter';
      for (var f = fumaca.length - 1; f >= 0; f--) {
        var s = fumaca[f]; s.vida++; s.f += .015; s.x += s.vx + Math.sin(s.f) * .35; s.y += s.vy; s.r *= 1.006;
        var k = s.vida / s.dur; s.a = s.amax * Math.sin(Math.PI * Math.min(1, k));
        if (k >= 1) { fumaca.splice(f, 1); continue; }
        var g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        g.addColorStop(0, 'rgba(214,175,90,' + s.a + ')'); g.addColorStop(1, 'rgba(214,175,90,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.29); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // estrela em fio de ouro
      if (t < T.explosao + 450) {
        var prog = ease(faixa(t, T.desenho[0], T.desenho[1]));
        var some = 1 - faixa(t, T.explosao, T.explosao + 450);
        var gira = t * 0.00012;
        ctx.save(); ctx.translate(CX, CY); ctx.rotate(gira);
        var grad = ctx.createLinearGradient(-R, -R, R, R);
        grad.addColorStop(0, OURO_ESCURO); grad.addColorStop(.5, OURO_CLARO); grad.addColorStop(1, OURO);
        ctx.strokeStyle = grad; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        var pulso = faixa(t, T.brilho[0], T.brilho[1]);
        ctx.shadowColor = 'rgba(255,215,120,.9)'; ctx.shadowBlur = 6 + 18 * Math.sin(Math.PI * pulso);
        ctx.globalAlpha = some;
        var cam = caminhos();
        for (var c = 0; c < cam.length; c++) { ctx.lineWidth = cam[c].w * (1 + .6 * pulso); desenharParcial(cam[c].p, Math.min(1, prog * (1 + c * .08))); }
        // núcleo luminoso
        var nucleo = Math.sin(Math.PI * pulso);
        if (nucleo > 0) { var gn = ctx.createRadialGradient(0, 0, 0, 0, 0, R * .5); gn.addColorStop(0, 'rgba(255,240,200,' + .55 * nucleo + ')'); gn.addColorStop(1, 'rgba(255,220,140,0)'); ctx.fillStyle = gn; ctx.beginPath(); ctx.arc(0, 0, R * .5, 0, 6.29); ctx.fill(); }
        ctx.restore(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      }

      // explosão: a estrela vira poeira dourada que forma ELORA
      if (t >= T.explosao && !particulas) {
        layoutTexto();
        var alvos = alvosTexto(mobile ? 650 : 1100);
        var gira2 = t * 0.00012, origem = [];
        var cam2 = caminhos();
        for (var c2 = 0; c2 < 4; c2++) origem = origem.concat(amostrar(cam2[c2].p, Math.ceil(alvos.length / 4) + 2));
        particulas = alvos.map(function (a, i) {
          var o = origem[i % origem.length], cs = Math.cos(gira2), sn = Math.sin(gira2);
          var x = CX + o[0] * cs - o[1] * sn, y = CY + o[0] * sn + o[1] * cs;
          var ang = Math.atan2(y - CY, x - CX) + (Math.random() - .5) * .8, v = 2 + Math.random() * 6;
          return { x: x, y: y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, tx: a[0], ty: a[1], r: .7 + Math.random() * 1.1, br: Math.random() };
        });
        for (var e = 0; e < (mobile ? 70 : 120); e++) { var an = Math.random() * 6.29, ve = 3 + Math.random() * 9; faiscas.push({ x: CX, y: CY, vx: Math.cos(an) * ve, vy: Math.sin(an) * ve, a: 1, r: .6 + Math.random() * 1.8 }); }
      }
      // clarão da explosão
      var cl = faixa(t, T.explosao - 80, T.explosao + 700);
      if (cl > 0 && cl < 1) { var gc = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 2.4 * easeOut(cl) + 1); gc.addColorStop(0, 'rgba(255,236,190,' + .5 * (1 - cl) + ')'); gc.addColorStop(1, 'rgba(255,236,190,0)'); ctx.fillStyle = gc; ctx.fillRect(0, 0, W, H); }

      // faíscas
      for (var fz = faiscas.length - 1; fz >= 0; fz--) {
        var z = faiscas[fz]; z.x += z.vx; z.y += z.vy; z.vx *= .955; z.vy = z.vy * .955 + .03; z.a *= .965;
        if (z.a < .03) { faiscas.splice(fz, 1); continue; }
        ctx.fillStyle = 'rgba(255,230,160,' + z.a + ')'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 6.29); ctx.fill();
      }

      // partículas formando o nome
      var aparece = ease(faixa(t, T.texto[0], T.texto[1]));
      if (particulas) {
        var atr = ease(faixa(t, T.forma[0], T.forma[1]));
        var alfaP = 1 - ease(faixa(t, T.texto[0] + 150, T.texto[1] + 350));
        if (alfaP > 0) {
          ctx.globalCompositeOperation = 'lighter';
          for (var pi = 0; pi < particulas.length; pi++) {
            var p = particulas[pi];
            p.vx *= .94; p.vy *= .94;
            // redemoinho suave antes de ir para o lugar
            var dx = p.x - CX, dy = p.y - CY; p.vx += -dy * .0009 * (1 - atr); p.vy += dx * .0009 * (1 - atr);
            p.x += p.vx; p.y += p.vy;
            p.x += (p.tx - p.x) * (.02 + .2 * atr) * atr; p.y += (p.ty - p.y) * (.02 + .2 * atr) * atr;
            var brilha = .55 + .45 * Math.sin(t * .008 + p.br * 20);
            ctx.fillStyle = 'rgba(' + (230 + 25 * p.br | 0) + ',' + (190 + 40 * p.br | 0) + ',110,' + (alfaP * brilha) + ')';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      // nome nítido + PARFUMS + frase + reflexo de luz
      if (aparece > 0) {
        ctx.save();
        ctx.textBaseline = 'alphabetic'; ctx.font = '700 ' + tamTexto + 'px ' + FONTE;
        var gt = ctx.createLinearGradient(0, textoY - tamTexto, 0, textoY);
        gt.addColorStop(0, '#FFF3CF'); gt.addColorStop(.55, OURO_CLARO); gt.addColorStop(1, OURO);
        ctx.fillStyle = gt; ctx.globalAlpha = aparece;
        ctx.shadowColor = 'rgba(212,175,55,.45)'; ctx.shadowBlur = 24;
        var wNome = escreverEspacado(ctx, 'ELORA', CX, textoY, espac);
        ctx.shadowBlur = 0;
        // reflexo de luz passando pelo nome
        var rf = faixa(t, T.reflexo[0], T.reflexo[1]);
        if (rf > 0 && rf < 1) {
          ctx.globalCompositeOperation = 'source-atop';
          var xr = CX - wNome / 2 - 80 + (wNome + 160) * ease(rf);
          var gr = ctx.createLinearGradient(xr - 50, 0, xr + 50, 0);
          gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gr; ctx.fillRect(xr - 50, textoY - tamTexto, 100, tamTexto * 1.2);
          ctx.globalCompositeOperation = 'source-over';
        }
        // PARFUMS com traços
        var sub = ease(faixa(t, T.sub[0], T.sub[1]));
        if (sub > 0) {
          var ts = Math.max(10, tamTexto * 0.13), ys = textoY + ts * 2.6;
          ctx.globalAlpha = sub; ctx.fillStyle = OURO; ctx.font = '500 ' + ts + 'px Inter, system-ui, sans-serif';
          var wp = escreverEspacado(ctx, 'PARFUMS', CX, ys, ts * .75);
          var traco = (wNome / 2 - wp / 2 - ts * 1.4) * easeOut(sub);
          ctx.fillRect(CX - wp / 2 - ts - traco, ys - ts * .38, traco, 1);
          ctx.fillRect(CX + wp / 2 + ts, ys - ts * .38, traco, 1);
          var tg = ease(faixa(t, T.tag[0], T.tag[1]));
          if (tg > 0) {
            ctx.globalAlpha = tg; ctx.fillStyle = '#d9c9a3';
            ctx.font = 'italic 400 ' + Math.max(14, tamTexto * .2) + 'px ' + FONTE; ctx.textAlign = 'center';
            ctx.fillText('A Essência do Oriente', CX, ys + Math.max(14, tamTexto * .2) * 2.4 + (1 - tg) * 8);
            ctx.textAlign = 'start';
          }
        }
        ctx.restore();
      }

      if (t >= T.fim && !encerrado) encerrar(false);
      requestAnimationFrame(quadro);
    }

    function encerrar(rapido) {
      if (encerrado) return; encerrado = true; marcarVisto();
      el.classList.add('saindo');
      setTimeout(function () {
        rodando = false;
        if (el.parentNode) el.parentNode.removeChild(el);
        document.documentElement.style.overflow = overflowAntes;
      }, rapido ? 600 : 1000);
    }
    el.querySelector('#ei-pular').addEventListener('click', function () { encerrar(true); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { document.removeEventListener('keydown', esc); encerrar(true); } });
    window.addEventListener('resize', function () { if (!particulas) medir(); });

    // espera a fonte do nome carregar (no máx. 700 ms) para o "ELORA" sair perfeito
    var comecou = false;
    function comecar() { if (comecou) return; comecou = true; requestAnimationFrame(quadro); }
    try { if (document.fonts && document.fonts.load) document.fonts.load('700 100px "Playfair Display"').then(comecar, comecar); } catch (e) {}
    setTimeout(comecar, 700);
  }

  if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);
})();
