// ===== Abertura da Elora Parfums: caixa do Afeef abrindo, frasco saindo, tampa e duas borrifadas =====
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
    if (navigator.webdriver) return;                                   // robôs/testes
    if (location.pathname.indexOf('/p/') === 0) return;                // link direto de perfume
    if (params.get('pedido') || params.get('order_nsu')) return;       // voltando do pagamento
    if (/^#(trocas|privacidade|termos)$/.test(location.hash)) return;  // páginas institucionais
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  }

  var IMG = '/intro/';
  var css = '' +
    '#elora-intro{position:fixed;inset:0;z-index:99999;overflow:hidden;background:radial-gradient(ellipse at 50% 45%,#1c2547 0%,#0A1128 55%,#050914 100%);display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;transition:opacity .9s ease;-webkit-tap-highlight-color:transparent}' +
    '#elora-intro.saindo{opacity:0;pointer-events:none}' +
    '#elora-intro canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}' +
    '#ei-palco{position:relative;width:min(78vw,46vh);aspect-ratio:518/708;perspective:1400px;transform-style:preserve-3d;margin-top:-6vh}' +
    '#ei-brilho{position:absolute;left:50%;top:50%;width:160%;height:120%;transform:translate(-50%,-50%) scale(.4);background:radial-gradient(circle,rgba(255,226,150,.55) 0%,rgba(212,175,55,.25) 30%,rgba(212,175,55,0) 65%);opacity:0;transition:opacity 1.2s ease,transform 1.6s cubic-bezier(.2,.8,.2,1);pointer-events:none}' +
    '#ei-caixa,#ei-caixa-fundo{position:absolute;inset:0;transform-style:preserve-3d;transition:transform 1.4s cubic-bezier(.5,0,.3,1),opacity 1s ease;animation:eiFlutua 4s ease-in-out infinite}' +
    '#ei-fundo{position:absolute;inset:2% 3%;border-radius:3px;background:linear-gradient(180deg,#e9dcc3 0%,#cdb994 100%);box-shadow:inset 0 0 40px rgba(60,40,10,.55),inset 0 0 0 6px #c9a85a}' +
    '#ei-fundo:after{content:"";position:absolute;inset:12% 18% 6%;border-radius:45% 45% 8% 8%;background:radial-gradient(ellipse at 50% 30%,#5a4321 0%,#2b1f0f 75%);box-shadow:inset 0 0 25px #000}' +
    '.ei-porta{position:absolute;top:0;width:50%;height:100%;transition:transform 1.6s cubic-bezier(.6,0,.25,1);transform-style:preserve-3d}' +
    '.ei-porta>i,.ei-porta>em{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:0 0 0 1px rgba(212,175,55,.35)}' +
    '.ei-porta>i{background:url(' + IMG + 'porta.webp) center/100% 100%}' +
    '.ei-porta>em{transform:rotateY(180deg);background:linear-gradient(90deg,#efe6d2,#d9c9a6);box-shadow:inset 0 0 0 5px #c9a85a,inset 0 0 30px rgba(90,60,20,.35)}' +
    '#ei-porta-e{left:0;transform-origin:0 50%}' +
    '#ei-porta-d{right:0;transform-origin:100% 50%}' +
    '#ei-porta-d>i{transform:scaleX(-1)}' +
    '#ei-selo{position:absolute;left:-27.6%;top:37.1%;width:55.2%;filter:drop-shadow(0 3px 6px rgba(0,0,0,.45));backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:translateZ(1px)}' +
    '#ei-fenda{position:absolute;left:50%;top:3%;bottom:3%;width:2px;transform:translateX(-50%);background:linear-gradient(180deg,transparent,#ffe7a3,transparent);opacity:0;filter:blur(1px);transition:opacity .5s ease;box-shadow:0 0 18px 6px rgba(255,215,120,.7)}' +
    '#elora-intro.abrindo #ei-caixa,#elora-intro.abrindo #ei-caixa-fundo{animation:none}' +
    '#elora-intro.abrindo #ei-fenda{opacity:1}' +
    '#elora-intro.aberta #ei-porta-e{transform:rotateY(-128deg)}' +
    '#elora-intro.aberta #ei-porta-d{transform:rotateY(128deg)}' +
    '#elora-intro.aberta #ei-fenda{opacity:0}' +
    '#elora-intro.aberta #ei-brilho{opacity:1;transform:translate(-50%,-50%) scale(1)}' +
    '#elora-intro.subindo #ei-caixa,#elora-intro.subindo #ei-caixa-fundo{transform:translateY(38%) scale(.82);opacity:0;transition:transform 1.4s cubic-bezier(.5,0,.3,1),opacity .7s ease}' +
    '#ei-frasco{position:absolute;left:50%;top:55%;width:72%;aspect-ratio:459/700;transform:translate(-50%,-50%) scale(.78);opacity:0;transition:transform 1.9s cubic-bezier(.2,.9,.25,1),opacity .8s ease;filter:drop-shadow(0 0 22px rgba(255,210,120,.35)) drop-shadow(0 18px 30px rgba(0,0,0,.55))}' +
    '#elora-intro.aberta #ei-frasco{opacity:1}' +
    '#elora-intro.subindo #ei-frasco{transform:translate(-50%,-58%) scale(1.22)}' +
    '#ei-frasco img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;-webkit-user-drag:none;user-select:none}' +
    '#ei-sem-tampa,#ei-tampa{opacity:0}' +
    '#elora-intro.destampado #ei-com-tampa{opacity:0}' +
    '#elora-intro.destampado #ei-sem-tampa{opacity:1}' +
    '#elora-intro.destampado #ei-tampa{opacity:1;animation:eiTampa 1.5s cubic-bezier(.4,0,.2,1) forwards}' +
    '#ei-frasco.aperta #ei-sem-tampa{transform:translateY(.7%) scaleY(.995)}' +
    '#ei-sem-tampa{transition:transform .12s ease}' +
    '#ei-flash{position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,rgba(255,240,200,.95),rgba(255,220,140,0) 60%);opacity:0;pointer-events:none}' +
    '#ei-flash.on{animation:eiFlash .9s ease-out}' +
    '#ei-titulo{position:absolute;left:0;right:0;bottom:calc(6vh + 78px);text-align:center;color:#f4ead2;transition:opacity .8s ease,transform .8s ease;pointer-events:none}' +
    '#ei-titulo b{display:block;font-family:"Playfair Display",Georgia,serif;font-weight:700;font-size:clamp(28px,8vw,46px);letter-spacing:.32em;padding-left:.32em}' +
    '#ei-titulo span{display:block;color:#D4AF37;font-size:10px;letter-spacing:.6em;padding-left:.6em;margin-top:6px}' +
    '#ei-titulo small{display:block;margin-top:14px;font-family:"Playfair Display",Georgia,serif;font-style:italic;font-size:15px;color:#d9c9a3;opacity:0;transition:opacity 1s ease}' +
    '#elora-intro.final #ei-titulo small{opacity:1}' +
    '#ei-botao{position:absolute;left:50%;bottom:6vh;transform:translateX(-50%);border:1px solid #D4AF37;background:linear-gradient(135deg,rgba(212,175,55,.95),rgba(170,130,40,.95));color:#fff;font-size:11px;font-weight:700;letter-spacing:.3em;padding:15px 30px 15px 34px;border-radius:999px;box-shadow:0 0 0 0 rgba(212,175,55,.6),0 10px 30px rgba(0,0,0,.4);animation:eiPulso 2.2s ease-in-out infinite;cursor:pointer;white-space:nowrap;text-transform:uppercase;font-family:inherit}' +
    '#ei-botao:disabled{opacity:.6;animation:none}' +
    '#ei-pular{position:absolute;top:max(16px,env(safe-area-inset-top));right:16px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);color:#d9c9a3;font-size:10px;letter-spacing:.25em;text-transform:uppercase;padding:9px 14px;border-radius:999px;cursor:pointer;font-family:inherit}' +
    '#elora-intro.iniciou #ei-botao{opacity:0;pointer-events:none;transition:opacity .4s}' +
    '#elora-intro.iniciou #ei-titulo{opacity:0;transform:translateY(10px)}' +
    '#elora-intro.final #ei-titulo{opacity:1;transform:translateY(60px)}' +
    '#elora-intro.final #ei-frasco{transform:translate(-50%,-62%) scale(1.12);transition:transform 2.5s ease}' +
    '@keyframes eiFlutua{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.6%)}}' +
    '@keyframes eiPulso{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,.55),0 10px 30px rgba(0,0,0,.4)}50%{box-shadow:0 0 0 12px rgba(212,175,55,0),0 10px 30px rgba(0,0,0,.4)}}' +
    '@keyframes eiTampa{0%{transform:translate(0,0) rotate(0)}22%{transform:translate(0,-6%) rotate(0)}100%{transform:translate(42%,-62%) rotate(16deg);opacity:0}}' +
    '@keyframes eiFlash{0%{opacity:0}18%{opacity:1}100%{opacity:0}}';

  var el = document.createElement('div');
  el.id = 'elora-intro';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Abertura Elora Parfums');
  el.innerHTML =
    '<style>' + css + '</style>' +
    '<canvas id="ei-canvas"></canvas>' +
    '<div id="ei-palco">' +
      '<div id="ei-brilho"></div>' +
      '<div id="ei-caixa-fundo"><div id="ei-fundo"></div></div>' +
      '<div id="ei-frasco">' +
        '<img id="ei-com-tampa" alt="" src="' + IMG + 'frasco-com-tampa.webp">' +
        '<img id="ei-sem-tampa" alt="" src="' + IMG + 'frasco-sem-tampa.webp">' +
        '<img id="ei-tampa" alt="" src="' + IMG + 'tampa.webp">' +
      '</div>' +
      '<div id="ei-caixa">' +
        '<div class="ei-porta" id="ei-porta-e"><i></i><em></em></div>' +
        '<div class="ei-porta" id="ei-porta-d"><i></i><em></em><img id="ei-selo" alt="" src="' + IMG + 'selo.webp"></div>' +
        '<div id="ei-fenda"></div>' +
      '</div>' +
    '</div>' +
    '<div id="ei-flash"></div>' +
    '<div id="ei-titulo"><b>ELORA</b><span>PARFUMS</span><small>A Essência do Oriente</small></div>' +
    '<button id="ei-botao" type="button">Descobrir</button>' +
    '<button id="ei-pular" type="button">Pular</button>';

  function montar() {
    document.body.appendChild(el);
    var htmlOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    var $ = function (id) { return document.getElementById(id); };
    var cv = $('ei-canvas'), ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    function redim() { W = el.clientWidth; H = el.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    redim(); window.addEventListener('resize', redim);

    // ---------- partículas ----------
    var parts = [];
    function poeira(n) {
      for (var i = 0; i < n; i++) parts.push({ t: 'p', x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .15, vy: -.1 - Math.random() * .25, r: .6 + Math.random() * 1.6, a: .15 + Math.random() * .5, vida: 1e9, f: Math.random() * 6.28 });
    }
    poeira(Math.round(Math.min(70, W * H / 9000)));
    function explosao(x, y, n) {
      for (var i = 0; i < n; i++) { var ang = Math.random() * 6.28, v = 1 + Math.random() * 4; parts.push({ t: 'b', x: x, y: y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 1, r: 1 + Math.random() * 2.2, a: 1, vida: 50 + Math.random() * 50, f: 0 }); }
    }
    function nevoa(x, y) {
      // jato em cone para cima e para a direita, como um borrifo real
      for (var i = 0; i < 140; i++) {
        var ang = -Math.PI / 2 + 0.55 + (Math.random() - .5) * 0.75, v = 2.5 + Math.random() * 7;
        var nuvem = Math.random() < .7;
        parts.push({ t: nuvem ? 'n' : 'g', x: x + (Math.random() - .5) * 4, y: y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, r: nuvem ? 6 + Math.random() * 10 : .7 + Math.random() * 1.4, a: nuvem ? .22 + Math.random() * .18 : .7 + Math.random() * .3, vida: 80 + Math.random() * 70, f: 0, cresce: nuvem ? 1.022 + Math.random() * .022 : 0 });
      }
    }
    var nevoaGeral = 0;
    var rodando = true;
    function quadro() {
      if (!rodando) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy; p.f += .03;
        if (p.t === 'p') { p.x += Math.sin(p.f) * .2; if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; } }
        else { p.vida--; p.vx *= .965; p.vy = p.vy * .965 + (p.t === 'b' ? .05 : -.012); if (p.cresce) p.r *= p.cresce; p.a *= p.t === 'n' ? .978 : .972; if (p.t === 'n' && p.r > 140) p.r = 140; if (p.vida <= 0 || p.a < .02) { parts.splice(i, 1); continue; } }
        if (p.t === 'n') {
          var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, 'rgba(255,248,235,' + p.a + ')'); g.addColorStop(.45, 'rgba(255,244,225,' + (p.a * .45) + ')'); g.addColorStop(1, 'rgba(255,240,215,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.fill();
        } else {
          ctx.fillStyle = (p.t === 'g' ? 'rgba(255,252,240,' : 'rgba(240,205,120,') + (p.t === 'p' ? p.a * (.6 + .4 * Math.sin(p.f * 2)) : p.a) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.fill();
        }
      }
      if (nevoaGeral > 0) { var gg = ctx.createRadialGradient(W / 2, H * .4, 0, W / 2, H * .4, Math.max(W, H) * .7); gg.addColorStop(0, 'rgba(255,236,190,' + nevoaGeral * 2 + ')'); gg.addColorStop(1, 'rgba(255,236,190,0)'); ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H); }
      requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);

    // ---------- sons (gerados aqui, sem arquivos de áudio) ----------
    var ac = null;
    function audio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; } return ac; }
    function ruido(seg) { var b = ac.createBuffer(1, Math.floor(ac.sampleRate * seg), ac.sampleRate), d = b.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; var s = ac.createBufferSource(); s.buffer = b; return s; }
    function somBorrifo() {
      if (!audio()) return; var t = ac.currentTime, s = ruido(0.7);
      var hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2200;
      var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(7000, t); bp.frequency.exponentialRampToValueAtTime(4200, t + .5); bp.Q.value = .6;
      var g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .025); g.gain.exponentialRampToValueAtTime(.25, t + .2); g.gain.exponentialRampToValueAtTime(.001, t + .6);
      s.connect(hp); hp.connect(bp); bp.connect(g); g.connect(ac.destination); s.start(t); s.stop(t + .7);
      // "clique" do gatilho
      var o = ac.createOscillator(), go = ac.createGain(); o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(90, t + .05);
      go.gain.setValueAtTime(.18, t); go.gain.exponentialRampToValueAtTime(.001, t + .06); o.connect(go); go.connect(ac.destination); o.start(t); o.stop(t + .07);
    }
    function somAbrir() {
      if (!audio()) return; var t = ac.currentTime, s = ruido(1.6);
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(2600, t + 1.2);
      var g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .5); g.gain.exponentialRampToValueAtTime(.001, t + 1.5);
      s.connect(lp); lp.connect(g); g.connect(ac.destination); s.start(t); s.stop(t + 1.6);
      [1046.5, 1318.5, 1568, 2093].forEach(function (f, i) {
        var o = ac.createOscillator(), go = ac.createGain(), ti = t + .35 + i * .12; o.type = 'sine'; o.frequency.value = f;
        go.gain.setValueAtTime(0, ti); go.gain.linearRampToValueAtTime(.05, ti + .02); go.gain.exponentialRampToValueAtTime(.0008, ti + 2.2);
        o.connect(go); go.connect(ac.destination); o.start(ti); o.stop(ti + 2.3);
      });
    }
    function somTampa() {
      if (!audio()) return; var t = ac.currentTime, s = ruido(.08);
      var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 2;
      var g = ac.createGain(); g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.001, t + .08);
      s.connect(bp); bp.connect(g); g.connect(ac.destination); s.start(t);
      var o = ac.createOscillator(), go = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(1800, t + .02); o.frequency.exponentialRampToValueAtTime(2600, t + .3);
      go.gain.setValueAtTime(0, t + .02); go.gain.linearRampToValueAtTime(.04, t + .05); go.gain.exponentialRampToValueAtTime(.001, t + .5); o.connect(go); go.connect(ac.destination); o.start(t + .02); o.stop(t + .55);
    }

    // ---------- sequência ----------
    var timers = [];
    function depois(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function bico() {
      var r = $('ei-frasco').getBoundingClientRect(), base = el.getBoundingClientRect();
      return { x: r.left - base.left + r.width * .496, y: r.top - base.top + r.height * .33 };
    }
    function centroFrasco() { var r = $('ei-frasco').getBoundingClientRect(), b = el.getBoundingClientRect(); return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height * .45 }; }
    function borrifar() {
      somBorrifo();
      var f = $('ei-frasco'); f.classList.add('aperta'); setTimeout(function () { f.classList.remove('aperta'); }, 160);
      var p = bico(); nevoa(p.x, p.y);
    }
    var encerrado = false;
    function encerrar(rapido) {
      if (encerrado) return; encerrado = true; marcarVisto();
      timers.forEach(clearTimeout);
      el.classList.add('saindo');
      setTimeout(function () {
        rodando = false; window.removeEventListener('resize', redim);
        if (el.parentNode) el.parentNode.removeChild(el);
        document.documentElement.style.overflow = htmlOverflow;
        try { if (ac) ac.close(); } catch (e) {}
      }, rapido ? 450 : 950);
    }
    function iniciar() {
      audio(); // o toque libera o som no celular
      $('ei-botao').disabled = true;
      el.classList.add('iniciou', 'abrindo');
      depois(500, function () { el.classList.add('aberta'); somAbrir(); var c = centroFrasco(); explosao(c.x, c.y, 60); });
      depois(1900, function () { el.classList.add('subindo'); });
      depois(3700, function () {
        var fl = $('ei-flash'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
        el.classList.add('destampado'); somTampa(); var b = bico(); explosao(b.x, b.y, 40);
      });
      depois(5000, borrifar);
      depois(5900, borrifar);
      depois(6700, function () {
        el.classList.add('final');
        var t0 = performance.now();
        (function sobe() { var k = Math.min(1, (performance.now() - t0) / 1400); nevoaGeral = k * .1; if (k < 1 && !encerrado) requestAnimationFrame(sobe); })();
      });
      depois(8600, function () { encerrar(false); });
    }
    $('ei-botao').addEventListener('click', iniciar);
    $('ei-pular').addEventListener('click', function () { encerrar(true); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { document.removeEventListener('keydown', esc); encerrar(true); } });
    // Se a pessoa não tocar em 25s, a abertura sai sozinha
    depois(25000, function () { if (!el.classList.contains('iniciou')) encerrar(false); });
  }

  if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);
})();
