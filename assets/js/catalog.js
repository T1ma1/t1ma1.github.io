/* DECANDO — каталог: фильтры (в адресе страницы), сортировка, подгрузка, карточка-приглашение в квиз */
(function () {
  "use strict";
  var DC = window.DC, D = window.DC_DATA, F = D.F, $ = DC.$, $$ = DC.$$, esc = DC.esc;
  var form = $("[data-filter-form]"); if (!form) return;
  var LISTS = ["type", "style", "room", "color", "brand"];
  var PAGE = 18, shown = PAGE;
  var st = read();

  function read() {
    var q = new URLSearchParams(location.search), s = { q: q.get("q") || "", sort: q.get("sort") || "pop", min: +q.get("min") || 0, max: +q.get("max") || 0, wash: q.get("wash") === "1", sale: q.get("sale") === "1" };
    LISTS.forEach(function (k) { s[k] = (q.get(k) || "").split(",").filter(Boolean); });
    return s;
  }
  function write() {
    var p = new URLSearchParams();
    LISTS.forEach(function (k) { if (st[k].length) p.set(k, st[k].join(",")); });
    if (st.q) p.set("q", st.q);
    if (st.min) p.set("min", st.min);
    if (st.max) p.set("max", st.max);
    if (st.wash) p.set("wash", "1");
    if (st.sale) p.set("sale", "1");
    if (st.sort !== "pop") p.set("sort", st.sort);
    var s = p.toString();
    history.replaceState(null, "", "/catalog.html" + (s ? "?" + s : ""));
  }
  function match(p, skip) {
    if (st.q && DC.search(st.q).indexOf(p) < 0) return false;
    for (var i = 0; i < LISTS.length; i++) {
      var k = LISTS[i]; if (k === skip || !st[k].length) continue;
      if (k === "room") { if (!p.rooms.some(function (r) { return st.room.indexOf(r) >= 0; })) return false; }
      else if (st[k].indexOf(p[k]) < 0) return false;
    }
    if (st.min && p.price < st.min) return false;
    if (st.max && p.price > st.max) return false;
    if (st.wash && !p.washable) return false;
    if (st.sale && !p.old) return false;
    return true;
  }
  function results() {
    var list = D.products.filter(function (p) { return match(p); });
    var sorts = { pop: function (a, b) { return b.pop - a.pop; }, cheap: function (a, b) { return a.price - b.price; }, exp: function (a, b) { return b.price - a.price; },
      new: function (a, b) { return (b.badges.indexOf("new") >= 0) - (a.badges.indexOf("new") >= 0) || b.pop - a.pop; } };
    return list.sort(sorts[st.sort] || sorts.pop);
  }
  function count(k, v) { return D.products.filter(function (p) { return match(p, k) && (k === "room" ? p.rooms.indexOf(v) >= 0 : p[k] === v); }).length; }

  /* ---------- фильтры ---------- */
  function group(title, body) { return '<div class="fgroup"><p class="fgroup__t">' + title + "</p>" + body + "</div>"; }
  function opts(k, map) {
    return '<div class="fopts">' + Object.keys(map).map(function (v) {
      var n = count(k, v), on = st[k].indexOf(v) >= 0;
      if (!n && !on) return "";
      return '<label class="fopt"><input type="checkbox" data-f="' + k + '" value="' + esc(v) + '"' + (on ? " checked" : "") + "><span>" + esc(map[v]) + "</span><em>" + n + "</em></label>";
    }).join("") + "</div>";
  }
  function renderFilters() {
    var brands = {}; Object.keys(F.brand).forEach(function (b) { brands[b] = b; });
    var colors = '<div class="fcolors">' + Object.keys(F.color).map(function (c) {
      var on = st.color.indexOf(c) >= 0;
      return '<label class="fcolor" style="background:' + F.color[c][1] + '" title="' + F.color[c][0] + '"><input type="checkbox" data-f="color" value="' + c + '"' + (on ? " checked" : "") + ' aria-label="' + F.color[c][0] + '"></label>';
    }).join("") + "</div>";
    form.innerHTML =
      group("Стиль", opts("style", F.style)) +
      group("Цвет", colors) +
      group("Помещение", opts("room", F.room)) +
      group("Тип обоев", opts("type", F.type)) +
      group("Цена за рулон, ₽", '<div class="fprice"><input type="number" inputmode="numeric" placeholder="от 1 500" data-f="min" value="' + (st.min || "") + '" aria-label="Цена от"><input type="number" inputmode="numeric" placeholder="до 15 000" data-f="max" value="' + (st.max || "") + '" aria-label="Цена до"></div>') +
      group("Особенности", '<label class="ftoggle">Моющиеся<input type="checkbox" class="switch" data-f="wash"' + (st.wash ? " checked" : "") + '></label><label class="ftoggle">Со скидкой<input type="checkbox" class="switch" data-f="sale"' + (st.sale ? " checked" : "") + "></label>") +
      group("Бренд", opts("brand", brands));
  }
  form.addEventListener("change", function (e) {
    var el = e.target, k = el.getAttribute("data-f"); if (!k) return;
    if (LISTS.indexOf(k) >= 0) {
      var a = st[k], i = a.indexOf(el.value);
      if (el.checked && i < 0) a.push(el.value); else if (!el.checked && i >= 0) a.splice(i, 1);
    } else if (k === "min" || k === "max") st[k] = +el.value || 0;
    else st[k] = el.checked;
    shown = PAGE; update(true);
  });

  /* ---------- активные фильтры ---------- */
  function renderActive() {
    var box = $("[data-active]"), chips = [];
    LISTS.forEach(function (k) {
      st[k].forEach(function (v) {
        var label = k === "color" ? F.color[v][0] : k === "brand" ? v : (F[k] || {})[v];
        if (label) chips.push([k, v, label]);
      });
    });
    if (st.q) chips.push(["q", "", "«" + st.q + "»"]);
    if (st.min || st.max) chips.push(["price", "", (st.min ? "от " + DC.rub(st.min) : "") + (st.max ? " до " + DC.rub(st.max) : "")]);
    if (st.wash) chips.push(["wash", "", "Моющиеся"]);
    if (st.sale) chips.push(["sale", "", "Со скидкой"]);
    box.innerHTML = chips.map(function (c) { return '<button type="button" class="chip" data-rm="' + c[0] + '" data-v="' + esc(c[1]) + '">' + esc(c[2]) + '<svg class="ic"><use href="#i-close"/></svg></button>'; }).join("") +
      (chips.length > 1 ? '<button type="button" class="chip" data-rm="all">Сбросить всё</button>' : "");
    box.hidden = !chips.length;
  }
  $("[data-active]").addEventListener("click", function (e) {
    var b = e.target.closest("[data-rm]"); if (!b) return;
    var k = b.getAttribute("data-rm"), v = b.getAttribute("data-v");
    if (k === "all") { LISTS.forEach(function (x) { st[x] = []; }); st.q = ""; st.min = st.max = 0; st.wash = st.sale = false; }
    else if (LISTS.indexOf(k) >= 0) st[k].splice(st[k].indexOf(v), 1);
    else if (k === "price") st.min = st.max = 0;
    else st[k] = k === "q" ? "" : false;
    shown = PAGE; update(true);
  });

  /* ---------- заголовок под фильтр (лучше для поиска и для человека) ---------- */
  function heading() {
    var t = "Обои", sub = null;
    if (st.style.length === 1) t = { classic: "Классические обои и дамаск", botanic: "Обои с цветами и листьями", plain: "Однотонные и фактурные обои", geometry: "Геометрические обои и ар-деко", oriental: "Обои в восточном стиле", modern: "Обои под мрамор, бетон и терраццо", kids: "Обои для детской", mural: "Фрески и панно" }[st.style[0]] || t;
    else if (st.type.length === 1) t = F.type[st.type[0]] + " обои";
    else if (st.room.length === 1) t = "Обои — " + F.room[st.room[0]].toLowerCase();
    if (st.type.length === 1 && st.type[0] === "mural") t = "Фрески и панно";
    if (st.q) { t = "Поиск: «" + st.q + "»"; sub = "Нашли по названию, бренду, цвету и стилю."; }
    if (st.sale && !st.style.length) t = "Обои со скидкой";
    $("[data-cat-title]").textContent = t;
    $("[data-crumb]").textContent = t;
    if (sub) $("[data-cat-sub]").textContent = sub;
    document.title = t + " — купить в Decando";
  }

  /* ---------- сетка ---------- */
  function promo() {
    var el = document.createElement("div");
    el.className = "promo-card";
    el.innerHTML = '<span class="promo-card__bg" data-pattern="gatsby-emerald" data-pattern-cm="120"></span><p class="eyebrow eyebrow--light">Подбор за 1 минуту</p>' +
      '<h3 class="h3">Глаза разбегаются? <em>Подберём</em> под вашу комнату</h3><p style="color:var(--on-dark-2);font-size:15px;max-width:34ch">6 вопросов — и подборка из 10–15 вариантов с расчётом рулонов.</p>' +
      '<button type="button" class="btn btn--light" style="align-self:flex-start" data-quiz>Пройти подбор<svg class="ic"><use href="#i-arrow"/></svg></button>';
    DC.paintPatterns(el);
    return el;
  }
  function render() {
    var list = results(), grid = $("[data-grid]");
    $("[data-count]").innerHTML = "<b>" + list.length + "</b> " + DC.plural(list.length, "модель", "модели", "моделей");
    grid.innerHTML = "";
    if (!list.length) {
      grid.innerHTML = '<div class="cat__empty" style="grid-column:1/-1"><p class="h3">Ничего не нашлось</p><p class="muted">Попробуйте убрать часть фильтров — или доверьте подбор нам.</p><div class="hero__cta" style="justify-content:center"><button type="button" class="btn btn--primary" data-quiz>Подобрать за 1 минуту</button><button type="button" class="btn btn--ghost" data-rm-all>Сбросить фильтры</button></div></div>';
      var r = $("[data-rm-all]", grid); if (r) r.addEventListener("click", function () { $('[data-rm="all"]') ? $('[data-rm="all"]').click() : (location.href = "/catalog.html"); });
    }
    list.slice(0, shown).forEach(function (p, i) {
      if (i === 6 && list.length > 8) grid.appendChild(promo());
      grid.appendChild(DC.card(p, { reveal: true }));
    });
    var more = $("[data-more]");
    more.hidden = shown >= list.length;
    more.textContent = "Показать ещё " + Math.min(PAGE, list.length - shown);
    DC.reveal(grid);
    var apply = $("[data-apply]"); if (apply) apply.textContent = "Показать " + list.length + " " + DC.plural(list.length, "модель", "модели", "моделей");
  }
  function update(scroll) {
    write(); renderFilters(); renderActive(); heading(); render();
    if (scroll && window.innerWidth > 1080) { var top = $("[data-grid]").getBoundingClientRect().top + window.scrollY - 180; if (window.scrollY > top) window.scrollTo({ top: top, behavior: "smooth" }); }
  }
  $("[data-more]").addEventListener("click", function () { shown += PAGE; render(); });
  $("[data-sort]").value = st.sort;
  $("[data-sort]").addEventListener("change", function () { st.sort = this.value; update(); });

  /* мобильные фильтры */
  var fl = $("[data-filters]"), back = null;
  function openF(on) {
    fl.classList.toggle("is-open", on);
    document.body.classList.toggle("is-locked", on);
    $("[data-apply]").hidden = !on;
    if (on) { back = document.createElement("div"); back.className = "filters-backdrop"; back.addEventListener("click", function () { openF(false); }); document.body.appendChild(back); }
    else if (back) { back.remove(); back = null; }
  }
  $("[data-filters-open]").addEventListener("click", function () { openF(true); });
  $$("[data-filters-close]").forEach(function (b) { b.addEventListener("click", function () { openF(false); }); });

  update();
})();
