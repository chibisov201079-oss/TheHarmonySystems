function toggleBento(card){card.classList.toggle('open');card.setAttribute('aria-expanded',card.classList.contains('open'));}
function showTier(t){
  document.querySelectorAll('.tier-pw').forEach(function(el){el.classList.remove('active');});
  document.querySelectorAll('.tier-pn').forEach(function(el){el.classList.remove('active');});
  var hint=document.getElementById('tierHint');if(hint)hint.style.display='none';
  var pw=document.querySelector('.tier-pw[data-tier="'+t+'"]');if(pw)pw.classList.add('active');
  var pn=document.getElementById('tp-'+t);if(pn)pn.classList.add('active');
  /* stop cursor demo once user interacts */
  var cur=document.getElementById('tierCursor');if(cur)cur.style.display='none';
  window._tierDemoStopped=true;
}
function closeTier(){
  document.querySelectorAll('.tier-pw').forEach(function(el){el.classList.remove('active');});
  document.querySelectorAll('.tier-pn').forEach(function(el){el.classList.remove('active');});
  var hint=document.getElementById('tierHint');if(hint)hint.style.display='block';
}
/* Cursor demo — auto-clicks PRO planet after 3s */
(function(){
  var timer=setTimeout(function(){
    if(window._tierDemoStopped)return;
    var proPlanet=document.querySelector('.tier-pw[data-tier="pro"] .tier-pl');
    var cursor=document.getElementById('tierCursor');
    if(!proPlanet||!cursor)return;
    var rect=proPlanet.getBoundingClientRect();
    var parent=cursor.parentElement.getBoundingClientRect();
    cursor.style.left=(rect.left-parent.left+rect.width/2)+'px';
    cursor.style.top=(rect.top-parent.top+rect.height/2)+'px';
    cursor.style.opacity='1';
    cursor.style.animation='cursorDemo 3s ease forwards';
    setTimeout(function(){
      if(!window._tierDemoStopped)showTier('pro');
    },1800);
  },3000);
  /* stop demo on any tier click */
  document.addEventListener('click',function(e){
    if(e.target.closest&&e.target.closest('.tier-pw')){
      clearTimeout(timer);
      window._tierDemoStopped=true;
    }
  });
})();
const lbData=[
  {src:'assets/img-009.webp',cap:'Apex Zenith Pro v10.1 — Flagship · BTCUSDT'},
  {src:'assets/img-032.webp',cap:'Harmony Engine v10.2.0 — MAX ALPHA · AI Score'},
  {src:'assets/img-011.webp',cap:'Radar Harmony v9.2 — SHORT 84% · ETH/USDT'},
  {src:'assets/img-012.webp',cap:'ANP v4.4 CRYPTO — BOS · SWEEP · AUTO TP/SL'},
  {src:'assets/img-013.webp',cap:'ASM v3.3 PRO — Adaptive Scalp Master · 263 сделки'},
  {src:'assets/img-014.webp',cap:'Apex Orca v2.3 — Whale Tracker · Cluster · ETH/USDT'},
  {src:'assets/img-015.webp',cap:'ORB Ultimate v2.5 — Opening Range Breakout · ETH/USDT'},
  {src:'assets/img-016.webp',cap:'AZP v5.2 Full — LONG Signal · TP1/TP2/TP3 · ETH/USDT'},
  {src:'assets/img-017.webp',cap:'LCE ATA v2.4.4 — SMC: CHoCH · BOS · Auto-Analysis'},
  {src:'assets/img-019.webp',cap:'Stoch Ultimate — BEARISH · Hidden Divergence · MTF'},
  {src:'assets/img-020.webp',cap:'Apex Zenith TrendFlow Pro v7.3 — Order Flow · LONG MED 63%'},
  {src:'assets/img-021.webp',cap:'Oracle Goyaline v7.0 — CRYPTO · BTC/USDT · Daily'},
  {src:'assets/img-022.webp',cap:'Octopus Scanner v25.1 — Multi-Asset · IMPULSE UP · FET/NEAR'},
  {src:'assets/img-023.webp',cap:'BTC DCA v3.7 — STRONG DCA · Score 11/23 · Weekly'},
  {src:'assets/img-033.webp',cap:'Turtle X Terminal v7.0 — SCORE 70f · H4 · READY'},
  {src:'assets/img-027.webp',cap:'Apex Execution Framework v1.2 — STAGE A · ACTIVE LONG'},
  {src:'assets/img-028.webp',cap:'EMA v2 Cloud Squeeze — BEAR SWEEP · Cloud · BTC/USDT'},
];
let lbIdx=0;
function openLb(i){lbIdx=i||0;lbLastFocus=document.activeElement;document.getElementById('lb-img').src=lbData[lbIdx].src;document.getElementById('lb-cap').textContent=lbData[lbIdx].cap;document.getElementById('lb').classList.add('open');document.body.style.overflow='hidden';var c=document.querySelector('.lb-close');if(c)c.focus();}
function navLb(dir){lbIdx=(lbIdx+dir+lbData.length)%lbData.length;document.getElementById('lb-img').src=lbData[lbIdx].src;document.getElementById('lb-cap').textContent=lbData[lbIdx].cap;}
function closeLb(e){if(e&&e.target!==document.getElementById('lb')&&!e.target.classList.contains('lb-close'))return;document.getElementById('lb').classList.remove('open');document.body.style.overflow='';if(lbLastFocus&&lbLastFocus.focus)lbLastFocus.focus();}
var lbLastFocus=null;
document.addEventListener('keydown',e=>{
  var lb=document.getElementById('lb');
  if(!lb||!lb.classList.contains('open'))return;
  if(e.key==='Escape'){closeLb({target:lb});return;}
  if(e.key==='ArrowRight'){navLb(1);return;}
  if(e.key==='ArrowLeft'){navLb(-1);return;}
  if(e.key==='Tab'){
    var focusables=lb.querySelectorAll('button');
    if(!focusables.length)return;
    var first=focusables[0],last=focusables[focusables.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
});
function filterInds(cat,btn){
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var allCards = document.querySelectorAll('.ind-card');
  var firstRects = new Map();
  if (!reduceMotion){
    allCards.forEach(function(c){
      if (c.style.display !== 'none') firstRects.set(c, c.getBoundingClientRect());
    });
  }

  ['flagship','execution','analytics','utilities'].forEach(g=>{
    const lbl=document.querySelector('.group-label[data-group="'+g+'"]');
    const grid=document.getElementById('grp-'+g);
    if(!grid)return;
    const cards=grid.querySelectorAll('.ind-card');
    let any=false;
    cards.forEach(c=>{
      const cats=(c.dataset.cat||'').split(' ').filter(Boolean);
      // show if 'all' selected, OR the card's categories include the selected filter
      const show = cat==='all' || cats.includes(cat);
      const wasHidden = c.style.display === 'none';
      if (show){
        any=true;
        c.classList.remove('filter-hiding');
        c.style.display = '';
        if (!reduceMotion && wasHidden) c.classList.add('filter-entering');
      } else if (!wasHidden){
        // была видна — сначала плавно уходим, потом уже display:none
        if (reduceMotion){
          c.style.display = 'none';
        } else {
          c.classList.add('filter-hiding');
          setTimeout(function(){
            if (c.classList.contains('filter-hiding')) c.style.display = 'none';
          }, 300);
        }
      }
    });
    // Hide empty group labels and grids
    if(lbl) lbl.style.display = any ? '' : 'none';
    grid.style.display = any ? '' : 'none';
  });

  if (reduceMotion) return;

  // FLIP: карточки, которые остаются видимыми и просто меняют позицию
  // в сетке, плавно "доезжают" до нового места, а не прыгают мгновенно.
  requestAnimationFrame(function(){
    allCards.forEach(function(c){
      if (c.style.display === 'none' || c.classList.contains('filter-hiding')) return;
      var first = firstRects.get(c);
      if (!first) return; // была скрыта — за неё отвечает filter-entering
      var last = c.getBoundingClientRect();
      var dx = first.left - last.left;
      var dy = first.top - last.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      c.style.transition = 'none';
      c.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      requestAnimationFrame(function(){
        c.style.transition = 'transform .4s cubic-bezier(.4,0,.2,1)';
        c.style.transform = '';
        c.addEventListener('transitionend', function te(){
          c.style.transition = '';
          c.removeEventListener('transitionend', te);
        });
      });
    });
    document.querySelectorAll('.filter-entering').forEach(function(c){
      setTimeout(function(){ c.classList.remove('filter-entering'); }, 380);
    });
  });
}
function toggleFaq(btn){btn.parentElement.classList.toggle('open');btn.setAttribute('aria-expanded',btn.parentElement.classList.contains('open'));}

function toggleCatalog(){
  var box = document.getElementById('catalogCollapse');
  var btn = document.getElementById('catalogToggleBtn');
  var text = document.getElementById('catalogToggleText');
  var isOpen = box.classList.contains('open');

  if (isOpen){
    // закрываем: сначала фиксируем текущую высоту, потом анимируем к 0
    box.style.maxHeight = box.scrollHeight + 'px';
    // форсируем reflow, чтобы браузер применил стартовое значение до перехода
    void box.offsetHeight;
    requestAnimationFrame(function(){
      box.classList.remove('open');
      box.style.maxHeight = '0px';
    });
    btn.setAttribute('aria-expanded', 'false');
    text.textContent = 'Показать каталог (21 индикатор)';
  } else {
    box.classList.add('open');
    box.style.maxHeight = box.scrollHeight + 'px';
    btn.setAttribute('aria-expanded', 'true');
    text.textContent = 'Свернуть каталог';
    box.addEventListener('transitionend', function te(e){
      if (e.propertyName === 'max-height' && box.classList.contains('open')){
        box.style.maxHeight = 'none'; // чтобы смена фильтра не обрезалась по старой высоте
      }
      box.removeEventListener('transitionend', te);
    });
  }
}
document.body.classList.add('ready');












// ══ SCROLL ANIMATIONS ══
document.body.classList.add('ready');

// ══ PARALLAX (hero layers) — очень лёгкий, уважает prefers-reduced-motion ══
(function(){
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var aurora = document.querySelector('.hero-aurora');
  var bg = document.querySelector('.hero-bg');
  var planet = document.querySelector('.planet-wrap');
  var tierRow = document.querySelector('.tier-row');
  var hero = document.querySelector('.hero');
  if (reduceMotion || !hero || (!aurora && !bg && !planet && !tierRow)) return;

  var ticking = false;
  function updateParallax(){
    var rect = hero.getBoundingClientRect();
    // работаем только пока hero виден на экране — экономим на расчётах ниже
    if (rect.bottom < 0 || rect.top > window.innerHeight){ ticking = false; return; }
    var scrolled = -rect.top; // 0 в начале, растёт по мере скролла вниз
    if (aurora) aurora.style.transform = 'translateY(' + (scrolled * 0.12) + 'px)';
    if (bg) bg.style.transform = 'translateY(' + (scrolled * 0.06) + 'px)';
    if (planet) planet.style.transform = 'translateY(' + (scrolled * 0.18) + 'px)';
    if (tierRow) tierRow.style.transform = 'translateY(' + (scrolled * 0.04) + 'px)';
    ticking = false;
  }
  window.addEventListener('scroll', function(){
    if (!ticking){
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, {passive:true});
})();

const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
  });
}, { threshold: .08, rootMargin: '0px 0px -30px 0px' });
document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
setTimeout(() => {
  document.querySelectorAll('.fade-up').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight + 50) el.classList.add('in');
  });
}, 80);

// ══ STAGGER CARDS ══
(function () {
  const cards = document.querySelectorAll('.ind-card');
  if (!cards.length) return;
  const obsCards = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obsCards.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  cards.forEach((card, i) => {
    card.style.transitionDelay = (i % 3 * 0.08 + 0.03) + 's';
    obsCards.observe(card);
  });
})();

// ══ ANIMATED COUNTERS ══
(function () {
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function animateCounter(el) {
    const target = parseFloat(el.dataset.counter);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const decimals = parseInt(el.dataset.decimals) || 0;
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / 2000, 1);
      const current = target * easeOut(progress);
      el.textContent = prefix + current.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(step);
  }
  const els = document.querySelectorAll('[data-counter]');
  if (!els.length) return;
  const obsCounter = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { animateCounter(e.target); obsCounter.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  els.forEach(el => obsCounter.observe(el));
})();

// ══ ROI CALCULATOR ══
(function () {
  if (!document.getElementById('deposit')) return;
  let currentWR = 0.64;
  let rr = 2.0;

  window.setWR = function (btn) {
    document.querySelectorAll('.calc-wr-btn[data-wr]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentWR = parseFloat(btn.dataset.wr);
    calculate();
  };

  window.setRR = function (btn) {
    document.querySelectorAll('.calc-wr-btn[data-rr]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    rr = parseFloat(btn.dataset.rr);
    calculate();
  };

  function safeVal(id, fallback) {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) : fallback;
  }
  function safeSet(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function fmt(n) {
    return (n >= 0 ? '+' : '') + '$' + Math.abs(Math.round(n)).toLocaleString();
  }
  function updateSlider(el) {
    if (!el) return;
    const pct = ((parseFloat(el.value) - parseFloat(el.min)) / (parseFloat(el.max) - parseFloat(el.min))) * 100;
    el.style.setProperty('--pct', pct + '%');
  }
  function calculate() {
    const deposit = safeVal('deposit', 1000);
    const riskPct = safeVal('risk', 1) / 100;
    const tradesWeek = Math.round(safeVal('trades', 5));
    const tradesMonth = tradesWeek * 4;
    const wins = Math.round(tradesMonth * currentWR);
    const losses = tradesMonth - wins;
    const riskAmt = deposit * riskPct;
    const profitAmt = riskAmt * rr;
    const netProfit = (wins * profitAmt) - (losses * riskAmt);
    const netPct = (netProfit / deposit) * 100;
    const winsW = Math.round(tradesMonth * 0.40);
    const netWithout = (winsW * profitAmt) - ((tradesMonth - winsW) * riskAmt);

    safeSet('dep-display', '$' + deposit.toLocaleString());
    safeSet('risk-display', (riskPct * 100).toFixed(1) + '%');
    safeSet('trades-display', tradesWeek);
    safeSet('r-trades', tradesMonth);
    safeSet('r-wins', wins);
    safeSet('r-losses', losses);
    safeSet('r-avg-profit', '+$' + Math.round(profitAmt));
    safeSet('r-profit-label', 'Средний профит (' + rr.toFixed(1).replace('.0','') + 'R)');
    safeSet('r-avg-loss', '-$' + Math.round(riskAmt));
    safeSet('r-pct', (netPct >= 0 ? '+' : '') + netPct.toFixed(1) + '%');
    safeSet('r-without', fmt(netWithout));

    const netEl = document.getElementById('r-net');
    if (netEl) {
      netEl.textContent = fmt(netProfit);
      netEl.className = 'calc-result-main-val' + (netProfit < 0 ? ' negative' : '');
    }
  }
  ['deposit', 'risk', 'trades'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    updateSlider(el);
    el.addEventListener('input', () => { updateSlider(el); calculate(); });
  });
  calculate();
})();


// ══ NEW INDICATORS LIGHTBOX ══
const newLbData = {
  cluster_radar: {src:'assets/img-008.webp', cap:'Apex Cluster Radar v2.7 — CVD · Delta · Whales · Volume Profile · MAX ALPHA'},

  turtle_x_v7: {src:'assets/img-026.webp', cap:'Turtle X Terminal v7.0 - STRONG TREND - SCORE 70 - H4 - Protected Free'},

  apex_core: {src:'assets/img-024.webp', cap:'Apex Core v3.7 [THS] — Full Execution · JSON TA Bridge · Protected Free'},
  harmony_trinity: {src:'assets/img-034.webp', cap:'Harmony Trinity HMS v2.4.1 — ТС1·ТС2·ТС3 · HTF Confluence · Free'},
  turtle_x_v14: {src:'assets/img-035.webp', cap:'Turtle X Terminal v14.6 — Adaptive Scoring · SMC v3 · MAX ALPHA'},
  smart_flow: {src:'assets/img-018.webp', cap:'Smart Flow [THS] — SCALP SNIPER · Flow/Confluence · Cluster зоны · Free'}
};
function openLbNew(key){
  const d = newLbData[key];
  if(!d) return;
  const img = document.getElementById('lb-img');
  const cap = document.getElementById('lb-cap');
  const lb = document.getElementById('lb');
  lbLastFocus = document.activeElement;
  if(img) img.src = d.src;
  if(cap) cap.textContent = d.cap;
  if(lb) lb.classList.add('open');
  document.body.style.overflow = 'hidden';
  var c = document.querySelector('.lb-close');
  if(c) c.focus();
}

// ══ PARTICLE BURST on CTA click ══
(function(){
  const colors = ['#26a69a', '#2962ff', '#00e5cc', '#f0b90b'];
  function burst(x, y){
    const count = 14;
    for(let i = 0; i < count; i++){
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = colors[Math.floor(Math.random()*colors.length)];
      document.body.appendChild(p);

      const angle = (Math.PI * 2 * i) / count + (Math.random()-0.5);
      const velocity = 40 + Math.random() * 60;
      const dx = Math.cos(angle) * velocity;
      const dy = Math.sin(angle) * velocity;

      const anim = p.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0)`, opacity: 0 }
      ], {
        duration: 600 + Math.random()*300,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      });
      anim.onfinish = () => p.remove();
    }
  }

  // Attach to all primary CTA buttons
  document.addEventListener('click', function(e){
    const btn = e.target.closest('.btn-primary, .nav-cta, .price-btn');
    if(btn){
      burst(e.clientX, e.clientY);
    }
  });
})();


// ══ TILT 3D CARDS ══
(function(){
  const cards = document.querySelectorAll('.ind-card');
  if(!cards.length) return;

  const MAX_TILT = 8; // degrees — subtle, not dizzying

  cards.forEach(card => {
    const img = card.querySelector('.ind-img');

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const rotateY = ((x - cx) / cx) * MAX_TILT;
      const rotateX = -((y - cy) / cy) * MAX_TILT;

      card.classList.add('tilting');
      card.style.transform =
        `translateY(-8px) scale(1.015) perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

      // Move shine highlight
      if(img){
        img.style.setProperty('--shine-x', (x / rect.width * 100) + '%');
        img.style.setProperty('--shine-y', (y / rect.height * 100) + '%');
      }
    });

    card.addEventListener('mouseleave', () => {
      card.classList.remove('tilting');
      card.style.transform = '';
    });
  });
})();


// ══ TILT 3D PRICING CARDS ══
(function(){
  const cards = document.querySelectorAll('.price-card');
  if(!cards.length) return;

  const MAX_TILT = 6; // slightly gentler for bigger cards

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const rotateY = ((x - cx) / cx) * MAX_TILT;
      const rotateX = -((y - cy) / cy) * MAX_TILT;

      card.classList.add('tilting');
      card.style.transform =
        `translateY(-6px) perspective(1400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

      card.style.setProperty('--shine-x', (x / rect.width * 100) + '%');
      card.style.setProperty('--shine-y', (y / rect.height * 100) + '%');
    });

    card.addEventListener('mouseleave', () => {
      card.classList.remove('tilting');
      card.style.transform = '';
    });
  });
})();

// ══ RIPPLE — вспышка от точки клика на кнопках ══
document.querySelectorAll('.btn-primary, .btn-outline').forEach(function(btn){
  btn.addEventListener('pointerdown', function(e){
    var rect = btn.getBoundingClientRect();
    var rx = ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + '%';
    var ry = ((e.clientY - rect.top) / rect.height * 100).toFixed(1) + '%';
    btn.style.setProperty('--rx', rx);
    btn.style.setProperty('--ry', ry);
  });
});

// ══ MAGNETIC BUTTONS — только для точных указателей (мышь), не для touch ══
(function(){
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  if (reduceMotion || !finePointer) return;

  var MAX_PULL = 8; // px, максимальное притяжение к курсору
  document.querySelectorAll('.btn-primary, .btn-outline').forEach(function(btn){
    // сохраняем базовый hover-подъём (-2px), чтобы магнит его не перекрывал
    btn.addEventListener('mousemove', function(e){
      var rect = btn.getBoundingClientRect();
      var x = e.clientX - rect.left - rect.width / 2;
      var y = e.clientY - rect.top - rect.height / 2;
      var pullX = Math.max(-MAX_PULL, Math.min(MAX_PULL, x * 0.25));
      var pullY = Math.max(-MAX_PULL, Math.min(MAX_PULL, y * 0.25));
      btn.style.transform = 'translateY(-2px) translate(' + pullX + 'px,' + pullY + 'px)';
    });
    btn.addEventListener('mouseleave', function(){
      btn.style.transform = '';
    });
  });
})();


/* ===== MARKET PULSE ===== */
(function(){
  // Фолбэк-данные на случай, если data/market-pulse.json ещё не создан
  // GitHub Actions (до первого запуска workflow) или временно недоступен.
  var MP_FALLBACK = {
    updated_at: new Date(Date.now() - 12*60*1000).toISOString(),
    next_update_at: new Date(Date.now() + 18*60*1000).toISOString(),
    assets: {
      BTC: { score:72, status:'long', indicators:{macd:'buy',adx:'buy',rsi:'neutral',mfi:'buy',bb:'neutral'},
        history_14d:[55,58,62,60,65,68,70,69,72,74,71,73,72,72],
        price_context:{prev_day_high:63500,prev_day_low:61200,session_high:63800,session_low:62100}, symbol:'BTCUSDT' },
      ETH: { score:58, status:'flat', indicators:{macd:'neutral',adx:'neutral',rsi:'buy',mfi:'neutral',bb:'neutral'},
        history_14d:[48,52,55,50,53,56,58,57,55,59,60,58,57,58],
        price_context:{prev_day_high:3120,prev_day_low:2980,session_high:3145,session_low:3010}, symbol:'ETHUSDT' },
      XAU: { score:31, status:'short', indicators:{macd:'sell',adx:'buy',rsi:'sell',mfi:'neutral',bb:'sell'},
        history_14d:[45,42,40,38,35,33,30,32,29,31,28,30,31,31],
        price_context:{prev_day_high:2415,prev_day_low:2380,session_high:2402,session_low:2375} },
      EURUSD: { score:47, status:'flat', indicators:{macd:'neutral',adx:'neutral',rsi:'neutral',mfi:'buy',bb:'neutral'},
        history_14d:[50,49,52,48,46,47,45,48,47,46,48,47,46,47],
        price_context:{prev_day_high:1.0920,prev_day_low:1.0865,session_high:1.0905,session_low:1.0870} }
    },
    fear_greed:{value:61,label:'Greed'},
    market_analytics:{
      updated_at: new Date(Date.now() - 40*60*1000).toISOString(),
      total_market_cap_usd: 3.42e12,
      market_cap_change_24h_pct: 1.8,
      total_volume_24h_usd: 148e9,
      btc_dominance_pct: 54.2,
      eth_dominance_pct: 12.6,
      top_volume_distribution:[
        {symbol:'BTC', volume_24h_usd:52e9, share_pct:56.1},
        {symbol:'ETH', volume_24h_usd:28e9, share_pct:30.2},
        {symbol:'SOL', volume_24h_usd:12.7e9, share_pct:13.7}
      ]
    }
  };
  var MP_DATA = MP_FALLBACK;

  var STATUS_LABELS = {
    long: 'Лонг тренд / покупки разрешены',
    short: 'Шорт тренд / покупки запрещены',
    flat: 'Флет'
  };
  var IND_KEYS = ['macd','adx','rsi','mfi','bb'];
  var DOT_IDS = {macd:'mpDotMacd',adx:'mpDotAdx',rsi:'mpDotRsi',mfi:'mpDotMfi',bb:'mpDotBb'};

  var mpCurrentAsset = 'BTC';
  var mpGaugePath = document.getElementById('mpGaugeFill');
  var mpGaugeLen = mpGaugePath ? mpGaugePath.getTotalLength() : 0;
  var mpCardRevealed = false;
  var mpPendingGauge = null; // {frac, color} — ждёт появления карточки в вьюпорте
  var mpCountdownTimer = null;

  // ── Fear & Greed gauge (тот же полукруг, отдельная карточка "Рыночный контекст") ──
  var fgGaugePath = document.getElementById('fgGaugeFill');
  var fgGaugeLen = fgGaugePath ? fgGaugePath.getTotalLength() : 0;
  var fgCardRevealed = false;
  var fgPendingGauge = null;
  var FG_LABELS_RU = {
    'Extreme Fear': 'Крайний страх',
    'Fear': 'Страх',
    'Neutral': 'Нейтрально',
    'Greed': 'Жадность',
    'Extreme Greed': 'Крайняя жадность'
  };

  function mpFmtPrice(v){
    if (v == null) return '—';
    if (v < 10) return v.toFixed(4);
    if (v < 1000) return v.toFixed(2);
    return v.toLocaleString('ru-RU');
  }

  function mpFmtAgo(iso){
    var mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime())/60000));
    if (mins < 1) return 'Обновлено только что';
    if (mins < 60) return 'Обновлено ' + mins + ' мин назад';
    return 'Обновлено ' + Math.round(mins/60) + ' ч назад';
  }

  function mpStatusFromScore(score){
    if (score >= 65) return 'long';
    if (score <= 35) return 'short';
    return 'flat';
  }

  function mpRenderTimeline(history){
    var wrap = document.getElementById('mpTimeline');
    wrap.innerHTML = '';
    history.forEach(function(v){
      var bar = document.createElement('div');
      bar.className = 'mp-tl-bar ' + mpStatusFromScore(v);
      wrap.appendChild(bar);
    });
  }

  function mpRenderChecklist(indicators, fearGreed){
    IND_KEYS.forEach(function(key){
      var dot = document.getElementById(DOT_IDS[key]);
      if (!dot) return;
      var cls = indicators[key] === 'buy' ? 'buy' : indicators[key] === 'sell' ? 'sell' : 'flat';
      dot.className = 'mp-check-dot ' + cls;
    });
    var fgDot = document.getElementById('mpDotFg');
    if (fgDot && fearGreed){
      var fgCls = fearGreed.value >= 65 ? 'buy' : fearGreed.value <= 35 ? 'sell' : 'flat';
      fgDot.className = 'mp-check-dot ' + fgCls;
    }
  }

  function mctxFmtCompact(n){
    // Компактный формат для крупных долларовых чисел: $1.24T / $482.3B
    if (n === null || n === undefined || isNaN(n)) return '—';
    var abs = Math.abs(n);
    if (abs >= 1e12) return '$' + (n/1e12).toFixed(2) + 'T';
    if (abs >= 1e9)  return '$' + (n/1e9).toFixed(2) + 'B';
    if (abs >= 1e6)  return '$' + (n/1e6).toFixed(2) + 'M';
    return '$' + n.toLocaleString('ru-RU');
  }

  function mctxRenderAnalytics(an, fallbackUpdatedIso){
    var mcapEl = document.getElementById('anMcap');
    if (!mcapEl) return; // блок ещё не в разметке

    if (!an){
      // Данных ещё нет (например, бэкенд обновили, но Action с новым
      // полем market_analytics ещё не запускался) — ничего не трогаем,
      // чтобы не мешать реальные и демо-цифры в одной карточке.
      return;
    }

    var chgEl = document.getElementById('anMcapChg');
    var volEl = document.getElementById('anVol');
    var updEl = document.getElementById('anUpdated');

    mcapEl.textContent = mctxFmtCompact(an.total_market_cap_usd);
    volEl.textContent = mctxFmtCompact(an.total_volume_24h_usd);

    var chg = an.market_cap_change_24h_pct;
    if (chgEl && typeof chg === 'number'){
      chgEl.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '% за 24ч';
      chgEl.className = 'an-stat-chg ' + (chg >= 0 ? 'up' : 'down');
    }

    var btcDom = an.btc_dominance_pct || 0;
    var ethDom = an.eth_dominance_pct || 0;
    var btcFill = document.getElementById('anDomBtcFill');
    var ethFill = document.getElementById('anDomEthFill');
    if (btcFill) btcFill.style.width = Math.min(100, btcDom) + '%';
    if (ethFill) ethFill.style.width = Math.min(100, ethDom) + '%';
    var btcPctEl = document.getElementById('anDomBtcPct');
    var ethPctEl = document.getElementById('anDomEthPct');
    if (btcPctEl) btcPctEl.textContent = btcDom.toFixed(1) + '%';
    if (ethPctEl) ethPctEl.textContent = ethDom.toFixed(1) + '%';

    var dist = an.top_volume_distribution || [];
    var bySym = {};
    dist.forEach(function(row){ bySym[row.symbol] = row; });
    ['btc','eth','sol'].forEach(function(sym){
      var row = bySym[sym.toUpperCase()];
      var pct = row ? row.share_pct : 0;
      var segEl = document.getElementById('anVol' + sym.charAt(0).toUpperCase() + sym.slice(1));
      var pctEl = document.getElementById('anVol' + sym.charAt(0).toUpperCase() + sym.slice(1) + 'Pct');
      if (segEl) segEl.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct.toFixed(1) + '%';
    });

    if (updEl) updEl.textContent = mpFmtAgo(an.updated_at || fallbackUpdatedIso);
  }

  function mctxRenderFearGreed(fearGreed, updatedIso){
    var scoreEl = document.getElementById('fgScore');
    var labelEl = document.getElementById('fgLabel');
    var updEl = document.getElementById('fgUpdated');
    if (!scoreEl || !labelEl) return;

    if (!fearGreed){
      // Аналогично market_analytics: не трогаем DOM, если данных нет —
      // лучше оставить последнее валидное состояние, чем показать разнобой.
      return;
    }

    var value = Math.min(100, Math.max(0, fearGreed.value));
    var zone = value <= 44 ? 'fear' : value >= 56 ? 'greed' : 'neutral';
    var zoneColor = zone === 'fear' ? 'var(--red)' : zone === 'greed' ? 'var(--green)' : 'var(--gold)';
    var labelRu = FG_LABELS_RU[fearGreed.label] || fearGreed.label;

    scoreEl.textContent = value;
    labelEl.textContent = labelRu;
    labelEl.className = 'fg-gauge-label ' + zone;
    if (updEl) updEl.textContent = mpFmtAgo(updatedIso);

    var frac = value / 100;
    if (fgGaugePath && fgGaugeLen){
      if (fgCardRevealed){
        fgGaugePath.style.stroke = zoneColor;
        fgGaugePath.style.strokeDasharray = (fgGaugeLen*frac) + ' ' + fgGaugeLen;
      } else {
        fgPendingGauge = {frac: frac, color: zoneColor};
        fgGaugePath.style.strokeDasharray = '0 ' + fgGaugeLen;
      }
    }
  }

  function mpStartCountdown(nextIso){
    if (mpCountdownTimer) clearInterval(mpCountdownTimer);
    var el = document.getElementById('mpCountdown');
    function tick(){
      var diff = Math.max(0, new Date(nextIso).getTime() - Date.now());
      var h = Math.floor(diff/3600000);
      var m = Math.floor((diff%3600000)/60000);
      var s = Math.floor((diff%60000)/1000);
      var parts = h > 0 ? [h,m,s] : [m,s];
      el.textContent = 'След. обновление через ' + parts.map(function(p){return String(p).padStart(2,'0');}).join(':');
    }
    tick();
    mpCountdownTimer = setInterval(tick, 1000);
  }

  function mpRenderAsset(key){
    var data = MP_DATA.assets[key];
    if (!data) return;
    mpCurrentAsset = key;

    document.getElementById('mpScore').textContent = data.score + '%';
    var statusEl = document.getElementById('mpStatus');
    statusEl.textContent = STATUS_LABELS[data.status];
    statusEl.className = 'mp-status ' + data.status;

    var gaugeColor = data.status === 'long' ? 'var(--green)' : data.status === 'short' ? 'var(--red)' : 'var(--gold)';
    if (mpGaugePath && mpGaugeLen){
      var frac = Math.min(100, Math.max(0, data.score)) / 100;
      if (mpCardRevealed){
        mpGaugePath.style.stroke = gaugeColor;
        mpGaugePath.style.strokeDasharray = (mpGaugeLen*frac) + ' ' + mpGaugeLen;
      } else {
        // Карточка ещё не в зоне видимости — держим gauge на нуле и
        // запоминаем целевое значение; заполнение анимируется, когда
        // пользователь реально доскроллит (см. IntersectionObserver ниже).
        mpPendingGauge = {frac: frac, color: gaugeColor};
        mpGaugePath.style.strokeDasharray = '0 ' + mpGaugeLen;
      }
    }

    var pc = data.price_context;
    document.getElementById('mpSessHigh').textContent = mpFmtPrice(pc.session_high);
    document.getElementById('mpSessLow').textContent = mpFmtPrice(pc.session_low);
    document.getElementById('mpPrevHigh').textContent = mpFmtPrice(pc.prev_day_high);
    document.getElementById('mpPrevLow').textContent = mpFmtPrice(pc.prev_day_low);

    mpRenderTimeline(data.history_14d);
    mpRenderChecklist(data.indicators, MP_DATA.fear_greed);
    document.getElementById('mpUpdated').textContent = mpFmtAgo(MP_DATA.updated_at);
    mpStartCountdown(MP_DATA.next_update_at);
    mctxRenderFearGreed(MP_DATA.fear_greed, MP_DATA.updated_at);
    mctxRenderAnalytics(MP_DATA.market_analytics, MP_DATA.updated_at);

    // Живое обновление Hi/Lo сессии для крипты через публичный Binance API
    if (data.symbol) mpFetchLivePrice(key, data.symbol);
  }

  function mpFetchLivePrice(key, symbol){
    fetch('https://data-api.binance.vision/api/v3/ticker/24hr?symbol=' + symbol)
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(json){
        if (!json || mpCurrentAsset !== key) return;
        document.getElementById('mpSessHigh').textContent = mpFmtPrice(parseFloat(json.highPrice));
        document.getElementById('mpSessLow').textContent = mpFmtPrice(parseFloat(json.lowPrice));
      })
      .catch(function(){ /* тихий fallback на моковые данные при недоступности сети */ });
  }

  document.getElementById('mpTabs').addEventListener('click', function(e){
    var btn = e.target.closest('.mp-tab');
    if (!btn) return;
    document.querySelectorAll('.mp-tab').forEach(function(t){ t.classList.remove('on'); });
    btn.classList.add('on');
    mpRenderAsset(btn.dataset.asset);
  });

  document.getElementById('mpShare').addEventListener('click', function(){
    var data = MP_DATA.assets[mpCurrentAsset];
    var text = 'THS Market Pulse — ' + mpCurrentAsset + ': ' + data.score + '% (' + STATUS_LABELS[data.status] + ')';
    if (navigator.share){
      navigator.share({ title:'THS Market Pulse', text:text, url: location.href }).catch(function(){});
    } else if (navigator.clipboard){
      navigator.clipboard.writeText(text + ' — ' + location.href);
      var btn = document.getElementById('mpShare');
      var old = btn.textContent;
      btn.textContent = '✓ Скопировано';
      setTimeout(function(){ btn.textContent = old; }, 1800);
    }
  });

  // Live-обновление цены раз в 20 сек для активного крипто-таба
  setInterval(function(){
    var data = MP_DATA.assets[mpCurrentAsset];
    if (data && data.symbol) mpFetchLivePrice(mpCurrentAsset, data.symbol);
  }, 20000);

  fetch('data/market-pulse.json', {cache:'no-store'})
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(json){
      if (json && json.assets && json.assets[mpCurrentAsset]) {
        MP_DATA = json;
        mpRenderAsset(mpCurrentAsset);
      }
    })
    .catch(function(){ /* тихий fallback — уже рендерим MP_FALLBACK ниже */ });

  mpRenderAsset('BTC');

  // Scroll-reveal: анимированное заполнение gauge именно в момент,
  // когда пользователь доскроллил до Market Pulse, а не сразу при загрузке.
  var mpCard = document.querySelector('.mp-card');
  if (mpCard && 'IntersectionObserver' in window){
    var mpGaugeObs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          mpCardRevealed = true;
          mpCard.classList.add('in-view');
          if (mpPendingGauge && mpGaugePath){
            // небольшая задержка — чтобы браузер успел применить strokeDasharray:0
            // до перехода на целевое значение, иначе transition не сыграет
            requestAnimationFrame(function(){
              mpGaugePath.style.stroke = mpPendingGauge.color;
              mpGaugePath.style.strokeDasharray = (mpGaugeLen*mpPendingGauge.frac) + ' ' + mpGaugeLen;
            });
          }
          mpGaugeObs.unobserve(entry.target);
        }
      });
    }, {threshold: 0.35});
    mpGaugeObs.observe(mpCard);
  } else {
    mpCardRevealed = true; // без поддержки IntersectionObserver — просто показываем сразу
    if (mpCard) mpCard.classList.add('in-view');
  }

  // То же самое для карточки Fear & Greed в блоке "Рыночный контекст"
  var fgCard = document.getElementById('mctxFg');
  if (fgCard && 'IntersectionObserver' in window){
    var fgGaugeObs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          fgCardRevealed = true;
          if (fgPendingGauge && fgGaugePath){
            requestAnimationFrame(function(){
              fgGaugePath.style.stroke = fgPendingGauge.color;
              fgGaugePath.style.strokeDasharray = (fgGaugeLen*fgPendingGauge.frac) + ' ' + fgGaugeLen;
            });
          }
          fgGaugeObs.unobserve(entry.target);
        }
      });
    }, {threshold: 0.35});
    fgGaugeObs.observe(fgCard);
  } else {
    fgCardRevealed = true;
  }
})();


function loadAnalytics(){
  if (window.__thsAnalyticsLoaded) return;
  window.__thsAnalyticsLoaded = true;
  var ga = document.createElement('script');
  ga.async = true;
  ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-VMQNHNFKMB';
  document.head.appendChild(ga);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){dataLayer.push(arguments);};
  gtag('js', new Date());
  gtag('config', 'G-VMQNHNFKMB');

  (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
  })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=109840293', 'ym');
  ym(109840293, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
}

function handleConsent(accepted){
  try { localStorage.setItem('ths_analytics_consent', accepted ? 'granted' : 'denied'); } catch(e){}
  document.getElementById('consentBanner').classList.remove('show');
  if (accepted) loadAnalytics();
}

(function(){
  var saved;
  try { saved = localStorage.getItem('ths_analytics_consent'); } catch(e){ saved = null; }
  if (saved === 'granted') {
    loadAnalytics();
  } else if (saved !== 'denied') {
    document.getElementById('consentBanner').classList.add('show');
  }
})();

/* ══ Клавиатурная доступность карточек каталога индикаторов ══ */
(function(){
  function visibleCards(){
    return Array.prototype.filter.call(
      document.querySelectorAll('.ind-card'),
      function(c){ return c.offsetParent !== null; }
    );
  }
  document.querySelectorAll('.ind-card').forEach(function(card){
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    var nameEl = card.querySelector('.ind-name');
    card.setAttribute('aria-label', 'Открыть ' + (nameEl ? nameEl.textContent.trim() : 'индикатор'));
    card.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        card.click();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft'){
        e.preventDefault();
        var cards = visibleCards();
        var idx = cards.indexOf(card);
        if (idx === -1) return;
        var next = e.key === 'ArrowRight' ? (idx + 1) % cards.length : (idx - 1 + cards.length) % cards.length;
        cards[next].focus();
      }
    });
  });
})();
