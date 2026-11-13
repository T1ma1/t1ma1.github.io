/* DECANDO — главная: первый экран, обои по стилю, подборки товаров, магазины с картой, отзывы, калькулятор */
(function () {
  "use strict";
  var DC = window.DC, D = window.DC_DATA, DEMO = window.DC_DATA_DEMO, CFG = window.DC_CONFIG, $ = DC.$, $$ = DC.$$, esc = DC.esc;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fmt = function (n) { return n.toLocaleString("ru-RU").replace(/,/g, " "); };

  /* число обоев — из каталога */
  $$("[data-total]").forEach(function (el) { el.textContent = fmt(D.total) + " " + DC.plural(D.total, "товар", "товара", "товаров"); });

  /* ---------- первый экран: интерьеры коллекций сменяют друг друга в арке, карточка — вместе с ними ---------- */
  (function () {
    var box = $("[data-hero-slides]"); if (!box) return;
    var slides = $$(".hero__slide", box), card = $("[data-hero-card]"), cur = 0, timer = 0;
    var dots = card && $("[data-hero-dots]", card);
    if (dots) slides.forEach(function (s, i) { var d = document.createElement("i"); if (!i) d.className = "is-on"; dots.appendChild(d); });
    function show(i) {
      slides[cur].classList.remove("is-on");
      cur = (i + slides.length) % slides.length;
      var s = slides[cur];
      if (s.loading === "lazy") s.loading = "eager";
      s.classList.add("is-on");
      if (!card) return;
      card.classList.add("is-swap");
      setTimeout(function () {
        $("[data-hero-card-eyebrow]", card).textContent = s.getAttribute("data-eyebrow");
        $("[data-hero-card-title]", card).textContent = s.getAttribute("data-title");
        $("[data-hero-card-sub]", card).textContent = s.getAttribute("data-sub");
        $("[data-hero-card-img]", card).src = s.currentSrc || s.src;
        card.href = "/" + s.getAttribute("data-href");
        if (dots) $$("i", dots).forEach(function (d, k) { d.classList.toggle("is-on", k === cur); });
        card.classList.remove("is-swap");
      }, 260);
    }
    function loop() { clearTimeout(timer); timer = setTimeout(function () { if (!document.hidden) show(cur + 1); loop(); }, reduce ? 9000 : 5200); }
    /* следующий кадр подгружаем заранее, чтобы смена была без пустой арки */
    slides.slice(1, 3).forEach(function (s) { s.loading = "eager"; });
    loop();
  })();

  /* ---------- обои по стилю: горизонтальная галерея (листается прокруткой, см. motion.js) ----------
     Количество — из каталога (разделы /oboi/<фасет>), рисунок на карточке — декоративный образец стиля */
  (function () {
    var box = $("[data-styles]"); if (!box) return;
    var S = [["stil", "klassika", "versal-cream", "Классика", "Дамаск и медальоны для гостиной и спальни"],
             ["risunok", "tsvety", "peonies-blush", "Цветы", "Пионы, ветви и листья — живой рисунок"],
             ["risunok", "odnotonnye", "linen-natural", "Однотонные", "Лён, рогожка, штукатурка — спокойный фон"],
             ["risunok", "geometricheskij-uzor", "gatsby-emerald", "Геометрия", "Ромбы, веера и оптические узоры"],
             ["stil", "vostochnyj", "chinoiserie-celadon", "Восточный стиль", "Шинуазри, гинкго и марокканская решётка"],
             ["stil", "minimalizm", "carrara", "Минимализм", "Камень, бетон и тихие фактуры"],
             ["pomeshhenie", "detskaya", "rainbow-terra", "Детские", "Мягкие оттенки и сказочные сюжеты"],
             ["vid-oboev", "fotooboi-i-panno", "fresco-mist", "Фрески и панно", "Без повтора — по размеру стены"]];
    var ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];
    S.forEach(function (s, i) {
      var n = (D.fc && D.fc[s[0]] && D.fc[s[0]][s[1]]) || 0;
      var a = document.createElement("a");
      a.className = "hcard";
      a.href = "/oboi/" + s[0] + "-" + s[1];
      a.innerHTML = '<span class="hcard__art"><span class="hcard__pat"></span><span class="hcard__num">' + ROMAN[i] + "</span></span>" +
        '<span class="hcard__row"><span class="hcard__title">' + s[3] + '</span><span class="hcard__count">' + fmt(n) + " " + DC.plural(n, "модель", "модели", "моделей") + "</span></span>" +
        '<span class="hcard__desc">' + s[4] + "</span>";
      if (DEMO && DEMO.byId[s[2]]) DC.patBg($(".hcard__pat", a), DEMO.byId[s[2]], s[1] === "fotooboi-i-panno" ? 260 : 46);
      box.appendChild(a);
    });
    var end = document.createElement("div");
    end.className = "hcard hcard--end";
    end.innerHTML = '<p class="eyebrow">Весь ассортимент</p><p class="h3">Больше <em>30&nbsp;000</em> товаров для стен</p>' +
      '<p class="muted">Фильтры по бренду, коллекции, цвету, помещению и размеру рулона.</p>' +
      '<a class="btn btn--primary" href="/product-category/oboi">Открыть каталог<svg class="ic"><use href="#i-arrow"/></svg></a>' +
      '<div class="hcard__chips"><button type="button" class="chip" data-lead="paint">Краска</button><button type="button" class="chip" data-lead="moulding">Лепнина</button>' +
      '<a class="chip" href="/product-category/freski">Фрески</a><a class="chip" href="/product-category/oboi/tovary-po-skidke">Скидки</a></div>';
    box.appendChild(end);
  })();

  /* ---------- подборки: популярные / новинки / скидки (реальные товары) ---------- */
  (function () {
    var tr = $("[data-rail-track]"); if (!tr) return;
    var upd = DC.rail($("[data-rail]").parentNode);
    function fill(set) {
      tr.innerHTML = "";
      D.set(set).forEach(function (p) { tr.appendChild(DC.card(p)); });
      tr.scrollLeft = 0; if (upd) upd();
    }
    $$("[data-rail-tabs] button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("[data-rail-tabs] button").forEach(function (x) { x.classList.toggle("is-on", x === b); x.setAttribute("aria-selected", x === b); });
        fill(b.getAttribute("data-set"));
      });
    });
    fill("popular");
  })();

  /* ---------- фото шоурумов (прислал клиент): сменяются сами, точки — переключение ---------- */
  (function () {
    var g = $("[data-shop-gallery]"); if (!g) return;
    var imgs = $$("img", g), dots = $("[data-shop-dots]", g), cur = 0, timer = 0;
    imgs.forEach(function (im, i) {
      var b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", "Фото " + (i + 1));
      b.addEventListener("click", function () { go(i); });
      dots.appendChild(b);
    });
    function go(i) {
      imgs[cur].classList.toggle("is-on", false); cur = (i + imgs.length) % imgs.length; imgs[cur].classList.toggle("is-on", true);
      $$("button", dots).forEach(function (b, k) { b.classList.toggle("is-on", k === cur); });
      clearTimeout(timer); if (!reduce) timer = setTimeout(function () { go(document.hidden ? cur : cur + 1); }, 4200);
    }
    go(0);
  })();

  /* ---------- магазины: вкладки по городам и карта (точка по координатам — без рекламы на карте) ---------- */
  (function () {
    var root = $("[data-shops]"); if (!root) return;
    var tabs = $("[data-shops-tabs]", root), info = $("[data-shops-info]", root), map = $("[data-shops-map]", root), cur = 0, loaded = false;
    function mapSrc(s) {
      if (s.lat && s.lon) return "https://yandex.ru/map-widget/v1/?ll=" + s.lon + "%2C" + s.lat + "&z=16&pt=" + s.lon + "%2C" + s.lat + "%2Cpm2rdm";
      return "https://yandex.ru/map-widget/v1/?text=" + encodeURIComponent(s.city + ", " + s.address) + "&z=16";
    }
    function show(i) {
      cur = i; var s = CFG.showrooms[i], digits = s.phoneHref.replace(/\D/g, "");
      $$("button", tabs).forEach(function (b, k) { b.classList.toggle("is-on", k === i); b.setAttribute("aria-selected", k === i); });
      info.innerHTML = '<p class="shops__city">' + esc(s.city) + "</p>" +
        '<div class="shops__row"><span>Адрес</span><b>' + esc(s.address) + "</b></div>" +
        '<div class="shops__row"><span>График работы</span><b>' + esc(s.hours.charAt(0).toUpperCase() + s.hours.slice(1)) + "</b></div>" +
        '<div class="shops__row"><span>Телефон</span><b><a href="' + s.phoneHref + '">' + esc(s.phone) + "</a></b></div>" +
        '<div class="shops__acts"><a class="btn btn--ghost btn--sm" href="' + s.map + '" target="_blank" rel="noopener"><svg class="ic"><use href="#i-pin"/></svg>Маршрут</a>' +
        '<a class="iconbtn" href="https://wa.me/' + digits + '" target="_blank" rel="noopener" aria-label="WhatsApp филиала"><svg class="ic"><use href="#i-wa"/></svg></a>' +
        '<a class="iconbtn" href="https://t.me/+' + digits + '" target="_blank" rel="noopener" aria-label="Telegram филиала"><svg class="ic"><use href="#i-tg"/></svg></a></div>';
      info.classList.remove("is-swap"); void info.offsetWidth; info.classList.add("is-swap");
      if (!loaded) return;
      /* статичная карта Яндекса: метка по координатам, без рекламы и чужих организаций (правка 9); клик — маршрут в Яндекс Картах */
      map.innerHTML = s.lat && s.lon
        ? '<a class="shops__mapimg" href="' + s.map + '" target="_blank" rel="noopener" aria-label="Открыть в Яндекс Картах: ' + esc(s.city) + ', ' + esc(s.address) + '"><img src="https://static-maps.yandex.ru/1.x/?ll=' + s.lon + ',' + s.lat + '&z=16&size=650,450&l=map&pt=' + s.lon + ',' + s.lat + ',pm2rdm" alt="Карта: шоурум Decando, ' + esc(s.city) + '" loading="lazy"><span class="shops__mapgo"><svg class="ic"><use href="#i-pin"/></svg>Открыть в Яндекс Картах</span></a>'
        : '<iframe title="Карта: шоурум Decando, ' + esc(s.city) + '" src="' + mapSrc(s) + '" loading="lazy" allowfullscreen></iframe>';
    }
    CFG.showrooms.forEach(function (s, i) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "tab"); b.textContent = s.city;
      b.addEventListener("click", function () { show(i); });
      tabs.appendChild(b);
    });
    show(0);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); loaded = true; show(cur); } }, { rootMargin: "300px" });
      io.observe(map);
    } else { loaded = true; show(0); }
  })();

  /* ---------- отзывы (пересказ реальных отзывов с Яндекс Карт; имена — как у авторов) ---------- */
  (function () {
    var box = $("[data-reviews]"); if (!box) return;
    var R = [
      ["Наталья Е.", "Обратилась, когда решила обновить интерьер своей квартиры. Первое, что поразило, — огромный выбор."],
      ["Сергей К.", "Нашёл обои, которые давно искал: большой ассортимент, приятные скидки и внимательное отношение к покупателю."],
      ["Кристина Надина", "Удобное расположение, купила обои сразу для всех комнат, менеджеры приветливые."],
      ["Данил Гилязев", "Помогли подобрать и проконсультировали, заказ оформил и забрал сразу."],
      ["Мика Сапаева", "Вариантов много; консультант помог сравнить и выбрать лучший."],
      ["Курбан Сунгуров", "Широкий выбор и вежливый персонал — с подбором помогли быстро."]
    ];
    R.forEach(function (r, i) {
      var el = document.createElement("article");
      el.className = "review reveal" + (i % 2 ? " reveal-d1" : "");
      el.innerHTML = '<div class="review__head"><span class="review__ava">' + esc(r[0][0]) + '</span><div><p class="review__name">' + esc(r[0]) + '</p><p class="review__meta">Яндекс Карты · пересказ отзыва</p></div></div><p>' + esc(r[1]) + "</p>";
      box.appendChild(el);
    });
    DC.reveal(box);
  })();

  /* ---------- калькулятор ---------- */
  (function () {
    var root = $("[data-calc]"); if (!root) return;
    function v(k) { var el = $('[data-c="' + k + '"]', root); return el.type === "checkbox" ? el.checked : el.value; }
    var last = null;
    function calc() {
      var roll = v("roll").split("|"), len = +v("len") || 0, wid = +v("wid") || 0, h = +v("h") || 2.7;
      var r = DC.rolls({ perimeter: 2 * (len + wid), height: h, rollW: +roll[0], rollL: +roll[1], rapport: v("match") === "free" ? 0 : +v("rap") || 0, match: v("match"), doors: +v("door") || 0, windows: +v("win") || 0, reserve: v("reserve") });
      last = { r: r, len: len, wid: wid, h: h, roll: roll };
      var big = $('[data-c-out="rolls"]', root);
      if (big.textContent !== String(r.rolls)) { big.textContent = r.rolls; big.classList.remove("is-tick"); void big.offsetWidth; big.classList.add("is-tick"); }
      $('[data-c-out="word"]', root).textContent = DC.plural(r.rolls, "рулон", "рулона", "рулонов");
      $('[data-c-out="strips"]', root).textContent = r.strips;
      $('[data-c-out="cut"]', root).textContent = r.cut.toFixed(2).replace(".", ",") + " м";
      $('[data-c-out="per"]', root).textContent = r.perRoll;
      $('[data-c-out="area"]', root).textContent = Math.round(r.area) + " м²";
    }
    root.addEventListener("input", calc); root.addEventListener("change", calc); calc();
    $("[data-calc-send]", root).addEventListener("click", function () {
      DC.openLead("calc", { details: function () {
        return "Калькулятор: комната " + last.len + "×" + last.wid + " м, высота " + last.h + " м, рулон " + last.roll.join("×") + " м, раппорт " + v("rap") + " см (" + v("match") + "), окон " + v("win") + ", дверей " + v("door") + " → " + last.r.rolls + " рулонов (" + last.r.strips + " полос)";
      } });
    });
  })();

  /* примерочная на главной: образцы популярных обоев — нажатие открывает примерку с ними */
  (function () {
    var box = document.querySelector("[data-tryon-sw]"); if (!box || !window.DC_DATA) return;
    var D = window.DC_DATA, seen = {};
    var all = D.products.filter(function (p) { return /^\/assets\/img\/p\//.test(p.img || "") && p.type !== "mural"; });
    var pick = all.filter(function (p) { if (seen[p.coll + p.brand]) return false; seen[p.coll + p.brand] = 1; return true; });
    all.forEach(function (p) { if (pick.length < 6 && pick.indexOf(p) < 0) pick.push(p); });
    pick.slice(0, 6).forEach(function (p) {
      var a = document.createElement("a");
      a.className = "tryon__chip"; a.href = "/primerka?p=" + encodeURIComponent(p.id);
      a.setAttribute("aria-label", "Примерить: " + p.title); a.title = p.brand + " " + p.sku;
      a.style.backgroundImage = "url('" + D.img(p) + "')";
      box.appendChild(a);
    });
  })();
})();
