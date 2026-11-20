// ===== Abertura da Elora Parfums — horizonte árabe do logo =====
// O horizonte (cúpulas e minaretes) se desenha em ouro -> as janelas acendem -> poeira dourada sobe
// das torres e forma "ELORA" -> PARFUMS -> reflexo de luz -> a loja aparece.
// Tudo em vetor/código (nítido em qualquer tela). Sem som; começa sozinha (~6,5 s).
// Aparece sempre que a pessoa entra no site ou atualiza a página. Para forçar (testes): eloraparfums.vercel.app/?intro=1
(function () {
  var params = new URLSearchParams(location.search);
  var forcar = params.get('intro') === '1';
  if (!forcar) {
    if (navigator.webdriver) return;
    if (location.pathname.indexOf('/p/') === 0) return;
    if (params.get('pedido') || params.get('order_nsu')) return;
    if (/^#(trocas|privacidade|termos)$/.test(location.hash)) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  }

  var OURO = '#D4AF37', OURO_CLARO = '#F7E7B0';

  // ---------- desenho do horizonte (viewBox 1000 x 330, base em y=320) ----------
  var BASE = 320, partes = []; // {d, tipo, dist, ordem}
  function f(n) { return Math.round(n * 10) / 10; }
  function retangulo(x, y, w, h) { return 'M' + f(x) + ' ' + f(y) + 'h' + f(w) + 'v' + f(h) + 'h' + f(-w) + 'Z'; }
  function arcos(x0, x1, yTopo, yBase, n) { // fileira de janelas em arco
    var d = '', w = (x1 - x0) / n, lw = w * .42;
    for (var i = 0; i < n; i++) {
      var cx = x0 + w * (i + .5), l = cx - lw / 2, r = cx + lw / 2, top = yTopo + lw * .5;
      d += 'M' + f(l) + ' ' + f(yBase) + 'V' + f(top) + 'Q' + f(l) + ' ' + f(yTopo) + ' ' + f(cx) + ' ' + f(yTopo) + 'Q' + f(r) + ' ' + f(yTopo) + ' ' + f(r) + ' ' + f(top) + 'V' + f(yBase) + 'Z';
    }
    return d;
  }
  function cebola(cx, yb, r, alt) { // cúpula em forma de cebola
    var t = yb - r * alt;
    return 'M' + f(cx - r) + ' ' + f(yb) + 'C' + f(cx - r * 1.08) + ' ' + f(yb - r * .78) + ' ' + f(cx - r * .2) + ' ' + f(yb - r * alt * .62) + ' ' + f(cx) + ' ' + f(t) +
      'C' + f(cx + r * .2) + ' ' + f(yb - r * alt * .62) + ' ' + f(cx + r * 1.08) + ' ' + f(yb - r * .78) + ' ' + f(cx + r) + ' ' + f(yb) + 'Z';
  }
  function ponta(cx, yTopo, alt, lua) { // mastro com bolinha ou lua crescente
    var d = 'M' + f(cx) + ' ' + f(yTopo) + 'V' + f(yTopo - alt);
    var bola = 'M' + f(cx - 2.6) + ' ' + f(yTopo - alt * .45) + 'a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0Z';
    partes.push({ d: d, tipo: 'mastro', cx: cx, topo: yTopo - alt });
    partes.push({ d: bola, tipo: 'ouro', cx: cx });
    if (lua) {
      var y = yTopo - alt - 6;
      partes.push({ d: 'M' + f(cx + 1) + ' ' + f(y - 6) + 'a6 6 0 1 0 0 12a7.5 7.5 0 1 1 0 -12Z', tipo: 'lua', cx: cx, topo: y - 6 });
    }
  }
  function cupula(cx, r, tambor, yBase, lua) {
    var yb = yBase - tambor;
    partes.push({ d: retangulo(cx - r * .86, yb, r * 1.72, tambor), tipo: 'parede', cx: cx });
    partes.push({ d: retangulo(cx - r * .98, yb - 3, r * 1.96, 4), tipo: 'friso', cx: cx });
    partes.push({ d: arcos(cx - r * .8, cx + r * .8, yb + tambor * .25, yBase - tambor * .12, Math.max(3, Math.round(r / 9))), tipo: 'janela', cx: cx });
    partes.push({ d: cebola(cx, yb - 3, r, 1.55), tipo: 'domo', cx: cx, r: r });
    ponta(cx, yb - 3 - r * 1.55, r * .55 + 8, lua);
  }
  function minarete(cx, h, w, lua) {
    var topoFuste = BASE - h, y;
    partes.push({ d: retangulo(cx - w / 2, topoFuste, w, h), tipo: 'parede', cx: cx });
    [h * .38, h * .7].forEach(function (k) { // sacadas
      y = BASE - k;
      partes.push({ d: 'M' + f(cx - w * .9) + ' ' + f(y) + 'h' + f(w * 1.8) + 'l' + f(-w * .25) + ' 6h' + f(-w * 1.3) + 'Z', tipo: 'friso', cx: cx });
      partes.push({ d: arcos(cx - w * .7, cx + w * .7, y - 13, y - 2, 3), tipo: 'janela', cx: cx });
    });
    partes.push({ d: arcos(cx - w * .32, cx + w * .32, BASE - h * .25, BASE - h * .12, 1), tipo: 'janela', cx: cx });
    // parte de cima mais fina + cupulazinha
    var w2 = w * .72, alto = 22;
    partes.push({ d: retangulo(cx - w2 / 2, topoFuste - alto, w2, alto), tipo: 'parede', cx: cx });
    partes.push({ d: arcos(cx - w2 * .45, cx + w2 * .45, topoFuste - alto + 5, topoFuste - 3, 2), tipo: 'janela', cx: cx });
    partes.push({ d: retangulo(cx - w * .62, topoFuste - alto - 3, w * 1.24, 4), tipo: 'friso', cx: cx });
    partes.push({ d: cebola(cx, topoFuste - alto - 3, w * .55, 1.7), tipo: 'domo', cx: cx, r: w * .55 });
    ponta(cx, topoFuste - alto - 3 - w * .55 * 1.7, 14, lua);
  }
  function espelhado(fn, dx) { var a = [].slice.call(arguments, 2); fn.apply(null, [500 - dx].concat(a)); if (dx) fn.apply(null, [500 + dx].concat(a)); }
  // muralha da base com arcos
  partes.push({ d: retangulo(70, BASE - 34, 860, 34), tipo: 'parede', cx: 500 });
  partes.push({ d: arcos(80, 920, BASE - 26, BASE - 4, 28), tipo: 'janela', cx: 500 });
  // elementos (do centro para fora)
  espelhado(cupula, 0, 30, 18, BASE - 34, false);
  espelhado(minarete, 52, 110, 11, false);
  espelhado(cupula, 105, 28, 20, BASE - 34, false);
  espelhado(minarete, 165, 170, 14, true);
  espelhado(cupula, 222, 22, 16, BASE - 34, false);
  espelhado(minarete, 285, 215, 16, true);
  espelhado(cupula, 365, 50, 34, BASE - 34, false);
  espelhado(cupula, 410, 16, 12, BASE - 34, false);
  espelhado(minarete, 450, 265, 19, false);
  partes.forEach(function (p) { p.dist = Math.abs(p.cx - 500) / 450; });

  var css = '' +
    '#elora-intro{position:fixed;inset:0;z-index:99999;background:radial-gradient(ellipse at 50% 38%,#16204a 0%,#0A1128 48%,#03060f 100%);transition:opacity .8s ease,transform 1.1s cubic-bezier(.3,0,.2,1);overflow:hidden}' +
    '#elora-intro.saindo{opacity:0;transform:scale(1.08);pointer-events:none}' +
    '#elora-intro canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}' +
    '#ei-cidade{position:absolute;overflow:visible}' +
    '#ei-cidade .t{fill:none;stroke-dasharray:1;stroke-dashoffset:1;stroke-linejoin:round;stroke-linecap:round}' +
    '#ei-cidade .p{fill:#121a40;fill-opacity:0;transition:fill-opacity 1s ease}' +
    '#ei-cidade .d{fill:url(#eiDomo);fill-opacity:0;transition:fill-opacity 1.2s ease}' +
    '#ei-cidade .j{fill:#ffd98a;fill-opacity:0;transition:fill-opacity .6s ease;filter:url(#eiLuz)}' +
    '#ei-cidade .o{fill:url(#eiOuro);fill-opacity:0;transition:fill-opacity .8s ease}' +
    '#ei-cidade .l{fill:url(#eiOuro);fill-opacity:0;transition:fill-opacity .6s ease;filter:url(#eiLuz)}' +
    '#ei-pular{position:absolute;top:max(16px,env(safe-area-inset-top));right:16px;z-index:3;background:rgba(255,255,255,.06);border:1px solid rgba(212,175,55,.35);color:#d9c9a3;font:600 10px/1 Inter,system-ui,sans-serif;letter-spacing:.28em;text-transform:uppercase;padding:10px 15px;border-radius:999px;cursor:pointer;opacity:0;animation:eiAparece .6s .4s forwards}' +
    '@keyframes eiAparece{to{opacity:1}}';

  var el = document.createElement('div');
  el.id = 'elora-intro';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Abertura Elora Parfums');

  function svgCidade() {
    var defs = '<defs>' +
      '<linearGradient id="eiOuro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0C2"/><stop offset=".5" stop-color="#E2BF5C"/><stop offset="1" stop-color="#A7832A"/></linearGradient>' +
      '<radialGradient id="eiDomo" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#5d78d6"/><stop offset=".45" stop-color="#2c3f97"/><stop offset="1" stop-color="#121b52"/></radialGradient>' +
      '<linearGradient id="eiSome" x1="0" y1="0" x2="0" y2="1"><stop offset=".7" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="eiMasc" maskUnits="userSpaceOnUse" x="-50" y="-50" width="1100" height="400"><rect x="-50" y="-50" width="1100" height="400" fill="url(#eiSome)"/></mask>' +
      '<filter id="eiLuz" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '</defs>';
    var corpo = '', tracos = '';
    partes.forEach(function (p, i) {
      var cls = p.tipo === 'domo' ? 'd' : p.tipo === 'janela' ? 'j' : (p.tipo === 'ouro' || p.tipo === 'friso') ? 'o' : p.tipo === 'lua' ? 'l' : p.tipo === 'mastro' ? '' : 'p';
      if (cls) corpo += '<path class="' + cls + '" data-dist="' + p.dist.toFixed(3) + '" d="' + p.d + '"/>';
      if (p.tipo !== 'janela') tracos += '<path class="t" pathLength="1" data-dist="' + p.dist.toFixed(3) + '" stroke="url(#eiOuro)" stroke-width="' + (p.tipo === 'mastro' ? 1.8 : 1.3) + '" d="' + p.d + '"/>';
    });
    return '<svg id="ei-cidade" viewBox="0 0 1000 330" preserveAspectRatio="xMidYMax meet">' + defs + '<g mask="url(#eiMasc)">' + corpo + tracos + '</g></svg>';
  }
  el.innerHTML = '<style>' + css + '</style><canvas id="ei-fundo-cv"></canvas>' + svgCidade() + '<canvas id="ei-cv"></canvas><button id="ei-pular" type="button">Pular</button>';

  function montar() {
    document.body.appendChild(el);
    var overflowAntes = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    var $ = function (s) { return el.querySelector(s); };
    var cvF = $('#ei-fundo-cv'), cF = cvF.getContext('2d'), cv = $('#ei-cv'), ctx = cv.getContext('2d');
    var cidade = $('#ei-cidade');
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5), W, H, mobile;
    var tamTexto, espac, textoY, ysParf, cidadeBox;

    var FONTE = '"Playfair Display", Georgia, "Times New Roman", serif';
    var wNome = 0;
    function layout() {
      W = el.clientWidth; H = el.clientHeight; mobile = W < 700;
      [cvF, cv].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); });
      tamTexto = Math.min(W * 0.155, 118); espac = tamTexto * 0.36;
      ctx.font = '400 ' + tamTexto + 'px ' + FONTE; wNome = larguraTexto(ctx, 'ELORA', espac);
      var ts = tamTexto * 0.27;
      var cw = Math.min(W * 1.02, wNome * 1.3), ch = cw * 330 / 1000;
      // pilha: ELORA / PARFUMS / horizonte
      var alturaBloco = tamTexto * .74 + ts * 1.7 + ts * 1.2 + ch;
      var topo = Math.max(H * .06, (H - alturaBloco) / 2 - H * .02);
      textoY = topo + tamTexto * .74;
      ysParf = textoY + ts * 1.7;
      cidadeBox = { x: W / 2 - cw / 2, y: ysParf + ts * 1.2, w: cw, h: ch };
      [[cidade, cidadeBox]].forEach(function (a) { var s = a[0].style, b = a[1]; s.left = b.x + 'px'; s.top = b.y + 'px'; s.width = b.w + 'px'; s.height = b.h + 'px'; });
    }
    layout();

    // ---------- utilidades ----------
    var ease = function (t) { t = Math.max(0, Math.min(1, t)); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var easeOut = function (t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3); };
    var faixa = function (t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); };
    function larguraTexto(c, txt, esp) { var w = 0; for (var i = 0; i < txt.length; i++) w += c.measureText(txt[i]).width + (i < txt.length - 1 ? esp : 0); return w; }
    function escrever(c, txt, cx, y, esp) { var w = larguraTexto(c, txt, esp), x = cx - w / 2; for (var i = 0; i < txt.length; i++) { c.fillText(txt[i], x, y); x += c.measureText(txt[i]).width + esp; } return w; }
    function alvosTexto(max) {
      var oc = document.createElement('canvas'); oc.width = Math.ceil(W); oc.height = Math.ceil(H);
      var o = oc.getContext('2d'); o.fillStyle = '#fff'; o.font = '400 ' + tamTexto + 'px ' + FONTE; escrever(o, 'ELORA', W / 2, textoY, espac);
      var d = o.getImageData(0, 0, oc.width, oc.height).data, pts = [], passo = Math.max(2, Math.round(tamTexto / 34));
      for (var y = 0; y < oc.height; y += passo) for (var x = 0; x < oc.width; x += passo) if (d[(y * oc.width + x) * 4 + 3] > 128) pts.push([x, y]);
      for (var i = pts.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
      return pts.slice(0, max);
    }
    function pontoCidade(px, py) { return [cidadeBox.x + px / 1000 * cidadeBox.w, cidadeBox.y + py / 330 * cidadeBox.h]; }

    // ---------- estrelas do céu ----------
    var estrelas = [];
    for (var i = 0; i < (mobile ? 90 : 160); i++) estrelas.push({ x: Math.random(), y: Math.random() * .75, r: Math.random() * 1.3 + .3, f: Math.random() * 6.3, v: .02 + Math.random() * .04 });

    // ---------- linha do tempo (ms) ----------
    var T = { cidade: [150, 2300], fill: 1000, janelas: 1700, luas: 2200, poeira: [2300, 3300], forma: [2900, 4300], texto: [4100, 4750], sub: [4500, 5100], reflexo: [5100, 6000], fim: 6800 };
    var particulas = null, faiscas = [];

    // dispara as transições do SVG nos momentos certos
    var agendados = [];
    function depois(ms, fn) { agendados.push(setTimeout(fn, ms)); }
    var tracosCidade = cidade.querySelectorAll('.t');
    for (var k = 0; k < tracosCidade.length; k++) {
      var p = tracosCidade[k], dist = +p.getAttribute('data-dist');
      p.style.transition = 'stroke-dashoffset ' + (1.1 + Math.random() * .3) + 's cubic-bezier(.45,0,.2,1) ' + (T.cidade[0] / 1000 + dist * .9).toFixed(2) + 's';
    }
    var cheios = cidade.querySelectorAll('.p,.d,.o');
    for (k = 0; k < cheios.length; k++) cheios[k].style.transitionDelay = (T.fill / 1000 + (+cheios[k].getAttribute('data-dist')) * .8).toFixed(2) + 's';
    var janelas = cidade.querySelectorAll('.j');
    for (k = 0; k < janelas.length; k++) janelas[k].style.transitionDelay = (T.janelas / 1000 + Math.random() * .9).toFixed(2) + 's';
    var luas = cidade.querySelectorAll('.l');
    for (k = 0; k < luas.length; k++) luas[k].style.transitionDelay = (T.luas / 1000 + k * .12).toFixed(2) + 's';
    function iniciarSvg() {
      void el.offsetWidth;
      for (var a = 0; a < tracosCidade.length; a++) tracosCidade[a].style.strokeDashoffset = '0';
      for (a = 0; a < cheios.length; a++) cheios[a].style.fillOpacity = cheios[a].classList.contains('p') ? '.92' : '1';
      for (a = 0; a < janelas.length; a++) janelas[a].style.fillOpacity = (.55 + Math.random() * .4).toFixed(2);
      for (a = 0; a < luas.length; a++) luas[a].style.fillOpacity = '1';
    }

    var t0 = null, rodando = true, encerrado = false;
    function quadro(agora) {
      if (!rodando) return;
      if (t0 === null) t0 = agora;
      var t = agora - t0;

      // céu
      cF.clearRect(0, 0, W, H);
      for (var i = 0; i < estrelas.length; i++) {
        var e = estrelas[i]; e.f += e.v;
        var a = (.25 + .55 * (.5 + .5 * Math.sin(e.f))) * Math.min(1, t / 900);
        cF.fillStyle = 'rgba(255,236,190,' + a + ')'; cF.beginPath(); cF.arc(e.x * W, e.y * H, e.r, 0, 6.29); cF.fill();
      }
      // brilho atrás da cúpula central
      var gl = easeOut(faixa(t, 1400, 3200)) * (1 - .35 * faixa(t, 5000, 6500));
      if (gl > 0) {
        var c0 = pontoCidade(500, 200), R = cidadeBox.w * .45;
        var g = cF.createRadialGradient(c0[0], c0[1], 0, c0[0], c0[1], R);
        g.addColorStop(0, 'rgba(255,214,130,' + .28 * gl + ')'); g.addColorStop(1, 'rgba(255,214,130,0)');
        cF.fillStyle = g; cF.fillRect(0, 0, W, H);
      }

      ctx.clearRect(0, 0, W, H);
      // poeira dourada subindo das torres -> forma ELORA
      if (t >= T.poeira[0] && !particulas) {
        var alvos = alvosTexto(mobile ? 650 : 1100);
        var topos = partes.filter(function (p) { return p.topo; });
        particulas = alvos.map(function (al) {
          var o = topos[Math.floor(Math.random() * topos.length)], pt = pontoCidade(o.cx + (Math.random() - .5) * 30, o.topo + Math.random() * 60);
          return { x: pt[0], y: pt[1], vx: (Math.random() - .5) * 1.2, vy: -1.5 - Math.random() * 3.5, tx: al[0], ty: al[1], r: .7 + Math.random() * 1.1, br: Math.random(), atraso: Math.random() * 700 };
        });
        for (var s = 0; s < (mobile ? 50 : 90); s++) { var lt = topos[Math.floor(Math.random() * topos.length)], lp = pontoCidade(lt.cx, lt.topo); faiscas.push({ x: lp[0], y: lp[1], vx: (Math.random() - .5) * 3, vy: -Math.random() * 4 - 1, a: 1, r: .6 + Math.random() * 1.5 }); }
      }
      for (var z = faiscas.length - 1; z >= 0; z--) { var fz = faiscas[z]; fz.x += fz.vx; fz.y += fz.vy; fz.vx *= .96; fz.vy *= .96; fz.a *= .965; if (fz.a < .03) { faiscas.splice(z, 1); continue; } ctx.fillStyle = 'rgba(255,230,160,' + fz.a + ')'; ctx.beginPath(); ctx.arc(fz.x, fz.y, fz.r, 0, 6.29); ctx.fill(); }

      var aparece = ease(faixa(t, T.texto[0], T.texto[1]));
      if (particulas) {
        var alfaP = 1 - ease(faixa(t, T.texto[0] + 150, T.texto[1] + 350));
        if (alfaP > 0) {
          ctx.globalCompositeOperation = 'lighter';
          for (var pi = 0; pi < particulas.length; pi++) {
            var p = particulas[pi], tt = t - p.atraso;
            if (tt < T.poeira[0]) continue;
            var atr = ease(faixa(tt, T.forma[0], T.forma[1]));
            p.vx *= .955; p.vy *= .955;
            p.vx += Math.sin(tt * .002 + p.br * 9) * .06 * (1 - atr);
            p.x += p.vx; p.y += p.vy;
            p.x += (p.tx - p.x) * (.015 + .2 * atr) * atr; p.y += (p.ty - p.y) * (.015 + .2 * atr) * atr;
            var brilha = .55 + .45 * Math.sin(t * .008 + p.br * 20), fade = Math.min(1, (tt - T.poeira[0]) / 300);
            ctx.fillStyle = 'rgba(' + (232 + 23 * p.br | 0) + ',' + (192 + 40 * p.br | 0) + ',112,' + (alfaP * brilha * fade) + ')';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      // ELORA nítido + PARFUMS com traços + reflexo
      if (aparece > 0) {
        ctx.save(); ctx.font = '400 ' + tamTexto + 'px ' + FONTE;
        var gt = ctx.createLinearGradient(0, textoY - tamTexto, 0, textoY);
        gt.addColorStop(0, '#FFF3CF'); gt.addColorStop(.55, OURO_CLARO); gt.addColorStop(1, OURO);
        ctx.fillStyle = gt; ctx.globalAlpha = aparece; ctx.shadowColor = 'rgba(212,175,55,.45)'; ctx.shadowBlur = 22;
        wNome = escrever(ctx, 'ELORA', W / 2, textoY, espac); ctx.shadowBlur = 0;
        var rf = faixa(t, T.reflexo[0], T.reflexo[1]);
        if (rf > 0 && rf < 1) {
          ctx.globalCompositeOperation = 'source-atop';
          var xr = W / 2 - wNome / 2 - 80 + (wNome + 160) * ease(rf);
          var gr = ctx.createLinearGradient(xr - 50, 0, xr + 50, 0);
          gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gr; ctx.fillRect(xr - 50, textoY - tamTexto, 100, tamTexto * 1.2); ctx.globalCompositeOperation = 'source-over';
        }
        var sub = ease(faixa(t, T.sub[0], T.sub[1]));
        if (sub > 0) {
          var ts = tamTexto * 0.27;
          ctx.globalAlpha = sub; ctx.fillStyle = OURO; ctx.font = '400 ' + ts + 'px Inter, system-ui, sans-serif';
          var wp = escrever(ctx, 'PARFUMS', W / 2, ysParf, ts * .42);
          var traco = Math.max(0, wNome / 2 - wp / 2 - ts * .7) * easeOut(sub);
          ctx.fillRect(W / 2 - wp / 2 - ts * .55 - traco, ysParf - ts * .36, traco, Math.max(1.2, ts * .07));
          ctx.fillRect(W / 2 + wp / 2 + ts * .55, ysParf - ts * .36, traco, Math.max(1.2, ts * .07));
        }
        ctx.restore();
      }

      if (t >= T.fim && !encerrado) encerrar(false);
      requestAnimationFrame(quadro);
    }

    function encerrar(rapido) {
      if (encerrado) return; encerrado = true;
      agendados.forEach(clearTimeout);
      el.classList.add('saindo');
      setTimeout(function () { rodando = false; if (el.parentNode) el.parentNode.removeChild(el); document.documentElement.style.overflow = overflowAntes; }, rapido ? 600 : 1000);
    }
    $('#ei-pular').addEventListener('click', function () { encerrar(true); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { document.removeEventListener('keydown', esc); encerrar(true); } });
    window.addEventListener('resize', function () { if (!particulas) layout(); });

    var comecou = false;
    function comecar() { if (comecou) return; comecou = true; layout(); iniciarSvg(); requestAnimationFrame(quadro); }
    try { if (document.fonts && document.fonts.load) document.fonts.load('700 100px "Playfair Display"').then(comecar, comecar); } catch (e) {}
    setTimeout(comecar, 700);
  }

  if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);
})();
