/* ============================================================
   DECANDO — движение: то, что делает сайт «живым».
   Заставка, появление заголовков по словам, манифест, который
   «зажигается» при прокрутке, горизонтальная галерея стилей,
   бегущая строка от скорости прокрутки, курсор с подписями,
   «магнитные» кнопки, наклон карточек, плашка-подсказка воронки,
   указатель главы. Всё отключается при «уменьшить движение».
   ============================================================ */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;
  var html = document.documentElement;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- заставка: полосы обоев уходят вверх ---------- */
  (function () {
    var intro = $("[data-intro]"); if (!intro) return;
    var done = function () { try { sessionStorage.setItem("dc_intro", "1"); } catch (e) { /* приватный режим */ } if (intro.parentNode) intro.remove(); };
    setTimeout(done, 2500);
    intro.addEventListener("click", done);
  })();

  /* ---------- заголовки по словам ---------- */
  function splitWords(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"); w.className = "w";
            var inner = document.createElement("span"); inner.textContent = p; inner.style.setProperty("--i", i++);
            w.appendChild(inner); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR" && !n.classList.contains("mf-pill")) walk(n);
      });
    })(el);
    el.classList.add("splitw");
  }
  var splitIO = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); splitIO.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -10% 0px" }) : null;
  if (!reduce && splitIO) {
    $$("main .h1, main .h2, main .page-head__title").forEach(function (el) {
      if (el.closest(".hero__title, [data-no-split], .modal")) return;
      splitWords(el); splitIO.observe(el);
    });
  }

  /* ---------- счётчики ---------- */
  function fmt(n) { return Math.round(n).toLocaleString("ru-RU").replace(/\s/g, " "); }
  var countIO = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      var el = e.target, to = +el.getAttribute("data-count-to"), t0 = performance.now(), dur = 1800;
      (function step(now) {
        var k = clamp((now - t0) / dur, 0, 1), v = to * (1 - Math.pow(2, -10 * k));
        el.textContent = fmt(k >= 1 ? to : v);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: 0.6 }) : null;
  if (!reduce && countIO) $$("[data-count-to]").forEach(function (el) { el.textContent = "0"; countIO.observe(el); });

  /* ---------- манифест: слова зажигаются по мере прокрутки ---------- */
  var manifesto = [];
  $$("[data-words]").forEach(function (el) {
    if (reduce) return;
    splitWords(el);
    el.classList.remove("splitw");
    var items = $$(".w, .mf-pill", el);
    manifesto.push({ el: el, items: items });
  });

  /* ---------- подпись букв в подвале ---------- */
  $$(".footer__word").forEach(function (el) {
    var t = el.textContent; el.textContent = "";
    t.split("").forEach(function (ch, i) { var s = document.createElement("span"); s.textContent = ch; s.style.setProperty("--k", i); el.appendChild(s); });
    if (splitIO) splitIO.observe(el); else el.classList.add("is-in");
  });

  /* ---------- шапка: прогресс, прячется вниз / появляется вверх ---------- */
  var header = $("[data-header]"), bar = null;
  if (header) { bar = document.createElement("span"); bar.className = "header__progress"; header.appendChild(bar); }

  /* ---------- горизонтальная галерея стилей ---------- */
  var gal = $("[data-hgal]"), galTrack = gal && $(".hgal__track", gal), galState = { on: false, travel: 0 };
  function galMeasure() {
    if (!gal) return;
    var on = !reduce && window.innerWidth > 760;
    galState.on = on;
    gal.classList.toggle("is-pinned", on);
    if (!on) { gal.style.height = ""; galTrack.style.transform = ""; return; }
    galState.travel = Math.max(0, galTrack.scrollWidth - window.innerWidth + 40);
    gal.style.height = (window.innerHeight + galState.travel) + "px";
  }

  /* ---------- прокрутка: всё, что зависит от положения ---------- */
  var lastY = window.scrollY, vel = 0, scrollDir = 1, ticking = false;
  var parallax = $$("[data-parallax]");
  var stepsLine = $("[data-steps-line]");
  /* коллекция сезона: арка раскрывается до полного экрана по мере прокрутки */
  var archx = $$("[data-archx]"), archStatic = false;
  function archMode() {
    archStatic = reduce || window.innerWidth <= 760;
    archx.forEach(function (el) { el.classList.toggle("is-static", archStatic); });
  }
  archMode();
  window.addEventListener("resize", archMode);
  function onScroll() {
    var y = window.scrollY, vh = window.innerHeight, d = y - lastY;
    vel = d; if (Math.abs(d) > 0.5) scrollDir = d > 0 ? 1 : -1; lastY = y;
    if (bar) { var max = document.documentElement.scrollHeight - vh; bar.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")"; }
    if (header && !reduce) {
      var menuOpen = document.body.classList.contains("is-locked") || header.matches(":hover");
      if (y > 420 && d > 6 && !menuOpen) header.classList.add("is-hidden");
      else if (d < -6 || y < 200) header.classList.remove("is-hidden");
    }
    parallax.forEach(function (el) {
      var r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return;
      var f = +el.getAttribute("data-parallax") || 0.1;
      el.style.transform = "translate3d(0," + ((r.top + r.height / 2 - vh / 2) * -f).toFixed(1) + "px,0)";
    });
    if (gal && galState.on) {
      var gr = gal.getBoundingClientRect(), p = clamp(-gr.top / Math.max(1, gr.height - vh), 0, 1);
      galTrack.style.transform = "translate3d(" + (-p * galState.travel).toFixed(1) + "px,0,0)";
      var gb = $("[data-hgal-bar]", gal); if (gb) gb.style.transform = "scaleX(" + p + ")";
      var cards = $$(".hcard:not(.hcard--end)", gal), cur = $("[data-hgal-cur]", gal);
      if (cur) cur.textContent = String(Math.min(cards.length, Math.round(p * (cards.length - 1)) + 1)).padStart(2, "0");
      cards.forEach(function (c) {
        var r = c.getBoundingClientRect(), off = (r.left + r.width / 2 - window.innerWidth / 2) / window.innerWidth;
        var pat = $(".hcard__pat", c); if (pat) pat.style.transform = "translate3d(" + (off * -60).toFixed(1) + "px,0,0) scale(1.15)";
      });
    }
    manifesto.forEach(function (m) {
      var r = m.el.getBoundingClientRect(), n = m.items.length;
      var p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.35), 0, 1) * n * 1.08;
      m.items.forEach(function (w, i) { w.style.setProperty("--lit", clamp(p - i, 0, 1).toFixed(3)); });
    });
    archx.forEach(function (el) {
      if (archStatic) { el.style.setProperty("--p", 1); el.classList.add("is-on"); return; }
      var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      var p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      el.style.setProperty("--p", p.toFixed(4));
      el.classList.toggle("is-on", p > 0.72);
    });
    if (stepsLine) {
      var sr = stepsLine.parentNode.getBoundingClientRect();
      stepsLine.style.transform = "scaleX(" + clamp((vh * 0.8 - sr.top) / (vh * 0.6), 0, 1) + ")";
    }
    chapterTick(vh);
    pillTick(y, vh);
  }
  function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); }); } }
  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", function () { galMeasure(); requestTick(); });
  window.addEventListener("load", function () { galMeasure(); requestTick(); });

  /* ---------- бегущая строка: скорость и направление — от прокрутки ---------- */
  var rows = $$("[data-marquee]").map(function (row) {
    var tr = $(".marquee__track", row); tr.innerHTML += tr.innerHTML;
    return { tr: tr, dir: +row.getAttribute("data-marquee") || 1, x: 0, visible: true };
  });
  if (rows.length && !reduce) {
    var mio = "IntersectionObserver" in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { rows.forEach(function (r) { if (r.tr.parentNode === e.target) r.visible = e.isIntersecting; }); }); }) : null;
    rows.forEach(function (r) { if (mio) mio.observe(r.tr.parentNode); });
    var boost = 0;
    (function loop() {
      boost += (Math.min(Math.abs(vel), 60) - boost) * 0.08; vel *= 0.9;
      rows.forEach(function (r) {
        if (!r.visible) return;
        var half = r.tr.scrollWidth / 2; if (!half) return;
        r.x += (0.55 + boost * 0.35) * r.dir * scrollDir;
        if (r.x > half) r.x -= half; if (r.x < 0) r.x += half;
        r.tr.style.transform = "translate3d(" + (-r.x).toFixed(2) + "px,0,0)";
      });
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- указатель главы (главная) ---------- */
  var chapters = $$("[data-chapter]"), chapterEl = null, chapterCur = -1;
  if (chapters.length > 4 && !reduce) {
    chapterEl = document.createElement("div");
    chapterEl.className = "chapter"; chapterEl.setAttribute("aria-hidden", "true");
    chapterEl.innerHTML = '<span class="chapter__n"></span><span class="chapter__line"><i></i></span><span class="chapter__t"></span>';
    document.body.appendChild(chapterEl);
  }
  function chapterTick(vh) {
    if (!chapterEl) return;
    var mid = vh * 0.5, idx = -1;
    chapters.forEach(function (c, i) { var r = c.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) idx = i; });
    chapterEl.classList.toggle("is-on", idx > 0 && !chapters[idx].matches("[data-hgal], [data-archx]"));
    if (idx < 0) return;
    chapterEl.classList.toggle("is-dark", chapters[idx].matches(".section--dark, .on-dark"));
    var r = chapters[idx].getBoundingClientRect();
    $("i", chapterEl).style.transform = "scaleY(" + clamp((mid - r.top) / r.height, 0, 1) + ")";
    if (idx === chapterCur) return;
    chapterCur = idx;
    $(".chapter__n", chapterEl).textContent = String(idx).padStart(2, "0") + " / " + String(chapters.length - 1).padStart(2, "0");
    $(".chapter__t", chapterEl).textContent = chapters[idx].getAttribute("data-chapter");
  }

  /* ---------- плашка воронки: «не знаете, что выбрать?» ---------- */
  var pill = null, pillOff = false, pillBlock = 0;
  try { pillOff = !!sessionStorage.getItem("dc_pill_off"); } catch (e) { /* ок */ }
  if (false && document.body.classList.contains("page-home") && !pillOff) {   // плашка квиза выключена: клиент просил меньше призывов
    pill = document.createElement("div");
    pill.className = "fpill"; pill.setAttribute("role", "complementary"); pill.setAttribute("aria-label", "Подсказка");
    pill.innerHTML = '<span class="fpill__sw" data-pattern="peonies-blush" data-pattern-cm="18"></span><span class="fpill__t"><b>Не знаете, что выбрать?</b><span>Подберём обои за 1 минуту — бесплатно</span></span>' +
      '<button type="button" class="btn btn--primary btn--sm" data-quiz>Подобрать</button><button type="button" class="fpill__x" aria-label="Скрыть подсказку"><svg class="ic"><use href="#i-close"/></svg></button>';
    document.body.appendChild(pill);
    if (window.DC) window.DC.paintPatterns(pill);
    $(".fpill__x", pill).addEventListener("click", function () { pillOff = true; pill.classList.remove("is-on"); try { sessionStorage.setItem("dc_pill_off", "1"); } catch (e) { /* ок */ } });
    if ("IntersectionObserver" in window) {
      var blockers = [];
      var bio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { var i = blockers.indexOf(e.target); if (e.isIntersecting && i < 0) blockers.push(e.target); if (!e.isIntersecting && i >= 0) blockers.splice(i, 1); });
        pillBlock = blockers.length; requestTick();
      });
      $$("#podbor, #lead, .footer, .hero, [data-hgal], [data-archx]").forEach(function (el) { bio.observe(el); });
    }
  }
  function pillTick() {
    if (!pill) return;
    pill.classList.toggle("is-on", !pillOff && pillBlock <= 0 && !document.body.classList.contains("is-locked"));
  }

  /* ---------- «магнитные» кнопки и наклон карточек ---------- */
  if (fine && !reduce) {
    document.addEventListener("pointermove", function (e) {
      var m = e.target.closest("[data-magnetic], .header__cta, .fab__btn");
      if (m) {
        var r = m.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) * 0.22, dy = (e.clientY - r.top - r.height / 2) * 0.3;
        m.style.transform = "translate(" + clamp(dx, -10, 10).toFixed(1) + "px," + clamp(dy, -8, 8).toFixed(1) + "px)";
        m._mag = true;
      }
      var t = e.target.closest(".hcard__art, .path");
      if (t) {
        var b = t.getBoundingClientRect(), px = (e.clientX - b.left) / b.width - 0.5, py = (e.clientY - b.top) / b.height - 0.5;
        var k = t.classList.contains("path") ? 3 : 6;
        t.style.transform = "perspective(900px) rotateX(" + (-py * k).toFixed(2) + "deg) rotateY(" + (px * k).toFixed(2) + "deg)";
        t.style.setProperty("--gx", ((px + 0.5) * 100).toFixed(1) + "%"); t.style.setProperty("--gy", ((py + 0.5) * 100).toFixed(1) + "%");
      }
    }, { passive: true });
    document.addEventListener("pointerout", function (e) {
      var m = e.target.closest("[data-magnetic], .header__cta, .fab__btn");
      if (m && !m.contains(e.relatedTarget)) m.style.transform = "";
      var t = e.target.closest(".hcard__art, .path");
      if (t && !t.contains(e.relatedTarget)) t.style.transform = "";
    });
  }

  /* ---------- ленты товаров: тянуть мышью ---------- */
  if (fine) {
    $$(".rail__track").forEach(function (tr) {
      var down = false, sx = 0, sl = 0, moved = 0;
      tr.addEventListener("pointerdown", function (e) {
        if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest("button, input")) return;
        down = true; moved = 0; sx = e.clientX; sl = tr.scrollLeft; tr.style.scrollSnapType = "none"; tr.classList.add("is-drag");
      });
      window.addEventListener("pointermove", function (e) { if (!down) return; var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); tr.scrollLeft = sl - dx; });
      window.addEventListener("pointerup", function () { if (!down) return; down = false; tr.classList.remove("is-drag"); setTimeout(function () { tr.style.scrollSnapType = ""; }, 60); });
      tr.addEventListener("click", function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
      tr.addEventListener("dragstart", function (e) { e.preventDefault(); });
    });
  }

  /* ---------- первый экран: свет за курсором и образцы с глубиной ---------- */
  (function () {
    var hero = $(".hero"), light = $("[data-hero-light]"); if (!hero || reduce || !fine) return;
    var samples = $$("[data-depth]", hero);
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      if (light) { light.style.setProperty("--mx", (px * 100).toFixed(1) + "%"); light.style.setProperty("--my", (py * 100).toFixed(1) + "%"); }
      samples.forEach(function (s) {
        var d = +s.getAttribute("data-depth");
        s.style.transform = "translate3d(" + ((px - 0.5) * d).toFixed(1) + "px," + ((py - 0.5) * d).toFixed(1) + "px,0)";
      });
    }, { passive: true });
  })();

  /* ---------- лента образцов под заголовком внутренних страниц ---------- */
  (function () {
    var head = $(".page-head"), D = window.DC_DATA, DC = window.DC;
    return;   // лента рисунков-образцов была для демо-каталога; в каталоге с фото товаров не нужна
    if (!head || !D || !DC || document.body.matches(".page-product, .page-studio, .page-cart, .page-fav, .page-doc")) return;
    function lum(hex) { var n = parseInt(hex.slice(1), 16); return 0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255); }
    var list = D.products.slice().sort(function (a, b) { return lum(b.pat.c[0]) - lum(a.pat.c[0]); });
    var r = document.createElement("div");
    r.className = "ribbon"; r.setAttribute("aria-label", "Образцы обоев");
    var items = list.map(function (p) {
      return '<a class="ribbon__sw" href="/product/' + p.id + '" title="' + DC.esc(p.title) + '" data-pattern="' + p.id + '" data-pattern-cm="' + (p.type === "mural" ? 320 : 26) + '"><span>' + DC.esc(p.brand) + "</span></a>";
    }).join("");
    r.innerHTML = '<div class="ribbon__track">' + items + items + "</div>";
    head.appendChild(r);
    DC.paintPatterns(r);
  })();

  /* ---------- кнопки: заливка расходится от точки курсора ---------- */
  document.addEventListener("pointerover", function (e) {
    var b = e.target.closest(".btn"); if (!b || b.contains(e.relatedTarget)) return;
    var r = b.getBoundingClientRect();
    b.style.setProperty("--bx", (e.clientX - r.left) + "px"); b.style.setProperty("--by", (e.clientY - r.top) + "px");
  });
  document.addEventListener("pointerout", function (e) {
    var b = e.target.closest(".btn"); if (!b || b.contains(e.relatedTarget)) return;
    var r = b.getBoundingClientRect();
    b.style.setProperty("--bx", (e.clientX - r.left) + "px"); b.style.setProperty("--by", (e.clientY - r.top) + "px");
  });

  galMeasure(); onScroll();
})();
