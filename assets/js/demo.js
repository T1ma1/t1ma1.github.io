window.DC_DEMO = true;   // демо без сервера: см. экран после отправки заявки в app.js
/* DECANDO — ДЕМО-ВЕРСИЯ для GitHub Pages (без PHP).
   Страницы каталога /oboi, /oboi/<тег>, /brand/<бренд>[/<коллекция>] и карточки /product/<товар>
   строятся здесь, в браузере, из /demo/catalog.json — той же вёрсткой, что у PHP-версии.
   Поиск в шапке тоже работает по этому файлу. На боевом сайте этого скрипта нет. */
(function () {
  "use strict";
  var DC = window.DC, D = window.DC_DATA, $ = DC.$, $$ = DC.$$, esc = DC.esc, rub = DC.rub, plural = DC.plural;
  var root = document.querySelector("[data-demo]"), root_ = root;
  var CAT = null, FAC = null, BRANDS = null, GOODS = null;
  var facP = null, catP = null, goodsP = null;
  function getJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }); }
  /* справочник фильтров — маленький, нужен всем страницам каталога */
  function loadFac() {
    return facP || (facP = getJSON("/demo/facets.json").then(function (f) {
      FAC = f; FAC.byKey = {}; FAC.list.forEach(function (x) { FAC.byKey[x.key] = x; x.byV = {}; x.values.forEach(function (v) { x.byV[v.v] = v; }); });
    }));
  }
  function loadGoods() { return goodsP || (goodsP = getJSON("/demo/goods.json").then(function (g) { GOODS = g; })); }
  /* весь каталог обоев (списки, фильтры, поиск) — в компактном виде, раскрываем в обычные объекты */
  function load() {
    return catP || (catP = Promise.all([getJSON("/demo/catalog.json"), loadFac()]).then(function (res) {
      var c = res[0]; BRANDS = {};
      CAT = c.rows.map(function (r) {
        var b = c.brands[r[3]], cl = r[4] >= 0 ? c.colls[r[4]] : null, attrs = {}, a = r[17];
        for (var i = 0; i < a.length; i += 2) { var k = c.keys[a[i]], vs = c.vals[k]; attrs[k] = a[i + 1].map(function (x) { return vs[x]; }); }
        var img = r[14] === 1 ? "/assets/img/p/" + r[0] + ".jpg" : (r[14] || "");
        var thumb = !img ? "" : r[15] === 1 ? img : r[15] === 0 ? img.replace(/(\.\w+)$/, "-300x300$1") : r[15];
        var p = { id: r[0], sku: r[1], title: r[2], brand: b[0], brandSlug: b[1], coll: cl ? cl[0] : "", collSlug: cl ? cl[1] : "", type: c.types[r[5]], typeLabel: c.labels[r[6]],
          price: r[7], old: r[8], unit: r[9] ? "м²" : "рулон", badges: r[10] ? r[10].split(",") : [], pop: r[11], roll: r[12] || null, rapport: r[13], img: img, thumb: thumb, photo: r[16], attrs: attrs };
        var B = BRANDS[p.brandSlug] || (BRANDS[p.brandSlug] = { slug: p.brandSlug, name: p.brand, n: 0, colls: {} });
        B.n++;
        if (p.collSlug) { var C = B.colls[p.collSlug] || (B.colls[p.collSlug] = { slug: p.collSlug, name: p.coll, n: 0 }); C.n++; }
        return p;
      });
    }));
  }

  /* ---------- поиск в шапке: вместо /api/search.php ---------- */
  function norm(s) { return String(s || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim(); }
  function searchHits(q) {
    var words = norm(q).split(" ").filter(Boolean).slice(0, 6);
    if (!words.length) return [];
    return CAT.concat(GOODS || []).filter(function (p) {
      var t = p._s || (p._s = (function () { var lab = ""; ["tsvet", "risunok", "stil", "pomeshhenie"].forEach(function (k) { ((p.attrs && p.attrs[k]) || []).forEach(function (v) { var o = FAC.byKey[k] && FAC.byKey[k].byV[v]; if (o) lab += " " + o.label; }); });
        if (p.kind) lab += " " + (p.kind === "kraska" ? "краска" : "лепнина") + " " + (p.subLabel || "");
        var x = norm(p.title + " " + p.brand + " " + (p.coll || "") + " " + p.sku + " " + (p.typeLabel || "") + lab); return x + " " + x.replace(/[-\s._]/g, ""); })());
      return words.every(function (w) { return t.indexOf(w) >= 0 || (w.length > 4 && !/\d/.test(w) && t.indexOf(w.slice(0, -2)) >= 0); });
    });
  }
  var nativeFetch = window.fetch.bind(window);
  window.fetch = function (url, opt) {
    var u = String(url);
    if (u.indexOf("/api/search.php") === 0) {
      var q = new URL(u, location.origin).searchParams.get("q") || "";
      return Promise.all([load(), loadGoods()]).then(function () {
        var qn = norm(q).replace(/[-\s._]/g, ""), hits = searchHits(q).sort(function (a, b) { return (norm(b.sku).replace(/[-\s._]/g, "") === qn) - (norm(a.sku).replace(/[-\s._]/g, "") === qn) || b.pop - a.pop; });
        return new Response(JSON.stringify({ total: hits.length, items: hits.slice(0, 8) }), { headers: { "Content-Type": "application/json" } });
      });
    }
    return nativeFetch(url, opt);
  };

  if (!root) return;
  var path = decodeURIComponent(location.pathname).replace(/\/+$/, "") || "/";
  /* страницы списка как на старом decando.ru: …/page/N */
  var PAGE = 1, pm = path.match(/^(.*)\/page\/(\d+)$/);
  if (pm) { path = pm[1]; PAGE = +pm[2]; }
  var ROOT = "/product-category/oboi";
  if (path === "/oboi") { location.replace(ROOT + location.search); return; }
  /* разделы старого decando.ru */
  var CATS = {
    "/product-category/oboi": { h1: "Каталог обоев", label: "Все обои", base: {} },
    "/product-category/oboi/flizelinovye": { h1: "Флизелиновые обои", label: "Флизелиновые", base: { "vid-oboev": ["flizelinovye"] } },
    "/product-category/oboi/vinilovye": { h1: "Виниловые обои", label: "Виниловые", base: { "vid-oboev": ["vinilovye", "vinilovye-na-flizeline"] } },
    "/product-category/oboi/pod-pokrasku": { h1: "Обои под покраску", label: "Под покраску", base: { "vid-oboev": ["pod-pokrasku"] } },
    "/product-category/oboi/tovary-po-skidke": { h1: "Обои по скидке", label: "Товары по скидке", base: {}, sale: true },
    "/product-category/freski": { h1: "Фрески", label: "Фрески", base: { "vid-oboev": ["fotooboi-i-panno"] } }
  };
  /* краска и лепнина — как lib/goods-page.php */
  var GCATS = {
    "/product-category/kraska": { kind: "kraska", sub: "", h1: "Краска", label: "Вся краска" },
    "/product-category/kraska/interernaya-kraska": { kind: "kraska", sub: "interernaya-kraska", h1: "Интерьерная краска", label: "Интерьерная краска" },
    "/product-category/kraska/gruntovka": { kind: "kraska", sub: "gruntovka", h1: "Грунтовка", label: "Грунтовка" },
    "/product-category/lepnina": { kind: "lepnina", sub: "", h1: "Лепнина", label: "Лепнина" }
  };
  var m;
  (function () {
    /* карточка товара: один файл на товар — весь каталог не нужен */
    if ((m = path.match(/^\/product\/([A-Za-z0-9_-]+)$/))) return Promise.all([getJSON("/demo/p/" + m[1] + ".json"), loadFac()]).then(function (res) { product(res[0]); });
    if (GCATS[path]) return loadGoods().then(function () { goodsListing(path); });
    return load().then(function () {
      if (CATS[path]) return listing({ cat: path });
      if ((m = path.match(/^\/oboi\/([a-z0-9-]+)$/))) return listing({ tag: m[1] });
      if ((m = path.match(/^\/brand\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/))) return listing({ brand: m[1], coll: m[2] || "" });
      notFound();
    });
  })().catch(function () { notFound(); });

  function notFound() {
    var t = document.querySelector("[data-demo-404]");
    root.innerHTML = t ? t.innerHTML : "<section class=\"page-head\"><div class=\"container\"><h1 class=\"page-head__title\">Страница не найдена</h1></div></section>";
    document.title = "Страница не найдена | Decando";
  }
  function crumbs(list) { return list.map(function (c) { return c[1] ? '<a href="' + esc(c[1]) + '">' + esc(c[0]) + "</a>" : "<span>" + esc(c[0]) + "</span>"; }).join(""); }
  function tagUrl(k, v) { var f = FAC.byKey[k]; return "/oboi/" + (f ? f.prefix : k + "-") + v; }

  /* ---------- список: /oboi, /oboi/<тег>, /brand/… ---------- */
  function listing(o) {
    var qs = new URLSearchParams(location.search);
    var base = o.cat ? JSON.parse(JSON.stringify(CATS[o.cat].base)) : {}, brand = o.brand || "", coll = o.coll || "", saleOnly = o.cat && CATS[o.cat].sale;
    if (o.tag) {
      var found = null;
      FAC.list.some(function (f) { if (o.tag.indexOf(f.prefix) === 0) { var v = o.tag.slice(f.prefix.length); if (f.byV[v]) { found = [f.key, v]; return true; } } return false; });
      if (!found) return notFound();
      base[found[0]] = [found[1]];
    }
    if (brand && (!BRANDS[brand] || (coll && !BRANDS[brand].colls[coll]))) return notFound();
    var extra = {};
    qs.forEach(function (val, key) { var mm = key.match(/^f\[([a-z0-9-]+)\]$/); if (mm && FAC.byKey[mm[1]]) extra[mm[1]] = val.split(",").filter(function (v) { return FAC.byKey[mm[1]].byV[v]; }); });
    var xb = qs.get("b") || "", sort = qs.get("sort") || "pop", page = Math.max(1, PAGE || +qs.get("page") || 1), q = (qs.get("q") || "").slice(0, 60);
    var active = {};
    [base, extra].forEach(function (src) { Object.keys(src).forEach(function (k) { active[k] = (active[k] || []).concat(src[k]); }); });
    var br = brand || xb;
    var words = q ? norm(q) : "";
    function match(p, flt, b) {
      if (b && p.brandSlug !== b) return false;
      if (coll && p.collSlug !== coll) return false;
      for (var k in flt) { var have = p.attrs[k] || []; if (!flt[k].some(function (v) { return have.indexOf(v) >= 0; })) return false; }
      return true;
    }
    var pool = q ? searchHits(q).filter(function (p) { return !p.kind; }) : CAT;
    var items = pool.filter(function (p) { return match(p, active, br) && ((sort !== "sale" && !saleOnly) || p.old); });
    var cmp = {
      pop: function (a, b) { return b.pop - a.pop; },
      cheap: function (a, b) { return (!a.price - !b.price) || a.price - b.price; },
      exp: function (a, b) { return b.price - a.price; },
      "new": function (a, b) { return ((b.badges.indexOf("new") >= 0) - (a.badges.indexOf("new") >= 0)) || b.pop - a.pop; },
      sale: function (a, b) { return ((b.old ? 1 - b.price / b.old : 0) - (a.old ? 1 - a.price / a.old : 0)) || b.pop - a.pop; }
    };
    items.sort(cmp[sort] || cmp.pop);
    var per = 24, total = items.length, pages = Math.max(1, Math.ceil(total / per));
    if (page > pages) page = pages;
    var shown = items.slice((page - 1) * per, page * per);

    /* заголовок и крошки */
    var h1 = "Обои", cr = [["Главная", "/"], ["Каталог", "/catalog"]];
    if (brand) {
      var B = BRANDS[brand]; cr.push(["Обои", ROOT]);
      if (coll) { cr.push([B.name, "/brand/" + brand]); h1 = "Обои " + B.name + " «" + B.colls[coll].name + "»"; cr.push([B.colls[coll].name, null]); }
      else { h1 = "Обои " + B.name; cr.push([B.name, null]); }
    } else if (o.tag) {
      var fk = Object.keys(base)[0], val = FAC.byKey[fk].byV[base[fk][0]];
      h1 = val.h1 || ("Обои: " + val.label); cr.push(["Обои", ROOT]); cr.push([val.label, null]);
    } else if (o.cat && o.cat !== ROOT) { h1 = CATS[o.cat].h1; cr.push(["Обои", ROOT]); cr.push([CATS[o.cat].label, null]); }
    else { h1 = "Каталог обоев"; cr.push(["Обои", null]); if (sort === "sale") h1 = "Обои по скидке"; }
    var xparts = [];
    Object.keys(extra).forEach(function (k) { extra[k].forEach(function (v) { xparts.push(FAC.byKey[k].byV[v].label.toLowerCase()); }); });
    if (xb && BRANDS[xb]) xparts.push(BRANDS[xb].name);
    if (xparts.length) h1 += ": " + xparts.join(", ");
    if (q) h1 = "Поиск: «" + q + "»";
    document.title = h1 + (page > 1 ? " — страница " + page : "") + " | Decando";

    /* адрес текущей страницы с другими параметрами */
    function url(ext, b, s, pg) {
      var p = new URLSearchParams();
      Object.keys(ext).forEach(function (k) { if (ext[k].length) p.set("f[" + k + "]", ext[k].join(",")); });
      if (b) p.set("b", b);
      if (s && s !== "pop") p.set("sort", s);
      if (q) p.set("q", q);
      var str = p.toString().replace(/%5B/g, "[").replace(/%5D/g, "]").replace(/%2C/g, ",");
      return path + (pg > 1 ? "/page/" + pg : "") + (str ? "?" + str : "");
    }
    function toggle(k, v) {
      var on = (active[k] || []).indexOf(v) >= 0;
      if (on && (base[k] || []).indexOf(v) >= 0) return path.indexOf("/brand/") === 0 || o.cat ? url(extra, xb, sort, 1) : ROOT;
      var ext = JSON.parse(JSON.stringify(extra));
      if (on) ext[k] = ext[k].filter(function (x) { return x !== v; });
      else {
        if (path === ROOT && !Object.keys(extra).length && !xb && !q) return tagUrl(k, v);
        ext[k] = (ext[k] || []).concat(v);
      }
      return url(ext, xb, sort, 1);
    }

    /* фильтры со счётчиками */
    var side = "";
    FAC.list.forEach(function (f) {
      var k = f.key, flt = {};
      Object.keys(active).forEach(function (x) { if (x !== k) flt[x] = active[x]; });
      var cnt = {};
      pool.forEach(function (p) { if (match(p, flt, br)) (p.attrs[k] || []).forEach(function (v) { cnt[v] = (cnt[v] || 0) + 1; }); });
      var rows = f.values.filter(function (v) { return cnt[v.v] || (active[k] || []).indexOf(v.v) >= 0; });
      if (!rows.length) return;
      var isColor = k === "tsvet", lim = isColor ? 100 : 8;
      side += '<div class="fgroup" data-fgroup="' + k + '"><p class="fgroup__t">' + esc(f.label) + '</p><div class="' + (isColor ? "fcolors" : "fopts") + '">';
      rows.forEach(function (v, i) {
        var on = (active[k] || []).indexOf(v.v) >= 0, hid = i >= lim && !on ? " is-hid" : "", u = toggle(k, v.v);
        side += isColor ? '<a class="fcolor' + (on ? " is-on" : "") + hid + '" style="background:' + (FAC.colors[v.v] || "#ddd") + '" href="' + esc(u) + '" title="' + esc(v.label) + " (" + (cnt[v.v] || 0) + ')"></a>'
          : '<a class="fopt' + (on ? " is-on" : "") + hid + '" href="' + esc(u) + '"><i></i><span>' + esc(v.label) + "</span><em>" + (cnt[v.v] || 0) + "</em></a>";
      });
      side += "</div>" + (rows.length > lim && !isColor ? '<button type="button" class="fmore" data-fmore>Ещё ' + (rows.length - lim) + "</button>" : "") + "</div>";
    });
    var bc = {}; pool.forEach(function (p) { if (match(p, active, "")) bc[p.brandSlug] = (bc[p.brandSlug] || 0) + 1; });
    var brows = Object.keys(BRANDS).sort(function (a, b) { return BRANDS[a].name.localeCompare(BRANDS[b].name); }).filter(function (s) { return bc[s] || s === br; });
    if (brows.length) {
      side += '<div class="fgroup" data-fgroup="brand"><p class="fgroup__t">Бренд</p><div class="fopts">';
      brows.forEach(function (s, i) {
        var on = s === br, u = on ? (brand ? ROOT : url(extra, "", sort, 1)) : (path === ROOT && !Object.keys(extra).length && !q ? "/brand/" + s : (brand ? "/brand/" + s : url(extra, s, sort, 1)));
        side += '<a class="fopt' + (on ? " is-on" : "") + (i >= 8 && !on ? " is-hid" : "") + '" href="' + esc(u) + '"><i></i><span>' + esc(BRANDS[s].name) + "</span><em>" + (bc[s] || 0) + "</em></a>";
      });
      side += "</div>" + (brows.length > 8 ? '<button type="button" class="fmore" data-fmore>Ещё ' + (brows.length - 8) + "</button>" : "") + "</div>";
    }
    /* активные фильтры */
    var chips = [];
    var chipSrc = o.cat ? extra : active;
    Object.keys(chipSrc).forEach(function (k) { chipSrc[k].forEach(function (v) { chips.push([FAC.byKey[k].byV[v].label, toggle(k, v)]); }); });
    if (br && BRANDS[br]) chips.unshift([BRANDS[br].name, brand ? ROOT : url(extra, "", sort, 1)]);
    var chipsHtml = chips.length ? '<div class="active-filters">' + chips.map(function (c) { return '<a class="chip" href="' + esc(c[1]) + '">' + esc(c[0]) + '<svg class="ic"><use href="#i-close"/></svg></a>'; }).join("") + "</div>" : "";
    /* страницы */
    var pager = "";
    if (pages > 1) {
      pager = '<nav class="pager" aria-label="Страницы">' + (page > 1 ? '<a class="pager__btn" href="' + esc(url(extra, xb, sort, page - 1)) + '">←<span> Назад</span></a>' : "");
      var win = [1, pages]; for (var i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) win.push(i);
      win = win.filter(function (v, i2, a) { return a.indexOf(v) === i2; }).sort(function (a, b) { return a - b; });
      var prev = 0;
      win.forEach(function (n) { if (prev && n - prev > 1) pager += '<span class="pager__dots">…</span>'; pager += n === page ? '<span class="pager__n is-on">' + n + "</span>" : '<a class="pager__n" href="' + esc(url(extra, xb, sort, n)) + '">' + n + "</a>"; prev = n; });
      pager += (page < pages ? '<a class="pager__btn" href="' + esc(url(extra, xb, sort, page + 1)) + '"><span>Дальше </span>→</a>' : "") + "</nav>";
    }
    /* тексты раздела (как в PHP-версии), только без доп. фильтров и поиска */
    var catTxt = {}, C0 = o.cat && !xparts.length && !q && FAC.cats && FAC.cats[o.cat.slice(1)];
    if (C0) { var tv = function (t) { return String(t || "").split("{count}").join(String(total)).split("{models}").join(plural(total, "модель", "модели", "моделей")); }; catTxt = { intro: tv(C0.intro), text: tv(C0.text) }; }
    var sorts = [["pop", "Сначала популярные"], ["cheap", "Сначала дешевле"], ["exp", "Сначала дороже"], ["new", "Сначала новинки"], ["sale", "Со скидкой"]];
    root.innerHTML =
      '<section class="page-head"><div class="container"><nav class="crumbs" aria-label="Навигация">' + crumbs(cr) + '</nav><div class="page-head__row"><div><h1 class="page-head__title page-head__title--tag">' + esc(h1) + "</h1>" + (catTxt.intro ? '<p class="page-head__sub">' + catTxt.intro + "</p>" : "") + "</div></div>" + (o.cat ? '<nav class="catnav" aria-label="Разделы каталога">' + Object.keys(CATS).map(function (c) { return '<a href="' + c + '"' + (c === o.cat ? ' class="is-on" aria-current="page"' : "") + ">" + CATS[c].label + "</a>"; }).join("") + "</nav>" : "") + "</div></section>" +
      '<div class="container cat"><aside class="filters" data-filters aria-label="Фильтры"><div class="filters__head"><b class="h3" style="font-size:28px">Фильтры</b><button type="button" class="iconbtn" data-filters-close aria-label="Закрыть фильтры"><svg class="ic"><use href="#i-close"/></svg></button></div>' + side + "</aside><div>" +
      '<div class="cat__bar"><p class="cat__count"><b>' + total + "</b> " + plural(total, "модель", "модели", "моделей") + '</p><div class="cat__tools"><button type="button" class="btn btn--ghost btn--sm cat__filter-btn" data-filters-open><svg class="ic"><use href="#i-filter"/></svg>Фильтры</button><select class="sort" data-sort aria-label="Сортировка">' +
      sorts.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === sort ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select></div></div>" + chipsHtml +
      (total ? '<div class="pgrid" data-grid></div>' + pager : '<div class="cat__empty"><p class="h3">Ничего не нашлось</p><p class="muted">Попробуйте убрать часть фильтров.</p><a class="btn btn--ghost" href="/product-category/oboi">Все обои</a></div>') + (catTxt.text ? '<section class="seo-text prose">' + catTxt.text + "</section>" : "") + "</div></div>";
    var grid = $("[data-grid]", root);
    shown.forEach(function (p) { D.byId[p.id] = D.byId[p.id] || p; if (grid) grid.appendChild(DC.card(p)); });
    DC.hydrateCards(root);
    afterRender(["/assets/js/tag.js"]);
  }

  /* ---------- карточка товара ---------- */
  function product(data) {
    var P = data.p, G = !!P.kind;
    D.byId[P.id] = D.byId[P.id] || P;
    var title = P.title;
    var gallery = [D.img(P, true)].concat((P.imgs || []).map(function (u) { return D.img({ img: u }, true); })).filter(Boolean);
    var roll = P.roll, size = roll ? String(roll[0]).replace(".", ",") + " × " + String(roll[1]).replace(".", ",") + " м" : "";
    /* другие цвета, компаньоны и похожие посчитаны при выкладке (те же правила, что в lib/seo.php) */
    var tones = data.tones || [], comp = (data.comp && data.comp.items) || [];
    var compHtml = comp.length ? '<section class="pcomp"><div class="container"><div class="pcomp__head"><div><h2 class="h3">' + esc(data.comp.title) + '</h2><p class="muted">' + esc(data.comp.sub) + '</p></div></div><div class="rail" data-rail><div class="rail__track" data-comp></div></div></div></section>' : "";
    var tryHtml = P.photo && P.type !== "mural" && !G && !(roll && (roll[0] > 1.4 || roll[0] < 0.4)) ? '<a class="btn btn--ghost ptry" href="/primerka?p=' + encodeURIComponent(P.id) + '"><svg class="ic"><use href="#i-room"/></svg>Примерить на стене</a>' : "";
    var related = data.rel || [];
    var vid = (P.attrs["vid-oboev"] || [])[0], vidVal = vid && FAC.byKey["vid-oboev"].byV[vid];
    var gRoot = G ? "/product-category/" + P.kind : "", gSub = G ? (P.attrs.sub || [])[0] : "";
    var cr = G ? [["Главная", "/"], ["Каталог", "/catalog"], [GCATS[gRoot].h1, gRoot]].concat(gSub ? [[P.subLabel || gSub, GCATS[gRoot + "/" + gSub] ? gRoot + "/" + gSub : gRoot + "?v=" + gSub]] : []).concat([[P.title, null]])
      : [["Главная", "/"], ["Каталог", "/catalog"], ["Обои", "/product-category/oboi"]]; if (G) { /* крошки готовы */ } else { if (vidVal) { var VC = { flizelinovye: "/product-category/oboi/flizelinovye", vinilovye: "/product-category/oboi/vinilovye", "vinilovye-na-flizeline": "/product-category/oboi/vinilovye", "pod-pokrasku": "/product-category/oboi/pod-pokrasku", "fotooboi-i-panno": "/product-category/freski" }; cr.push([vidVal.label, VC[vid] || tagUrl("vid-oboev", vid)]); } cr.push([P.brand + " " + P.sku, null]); }
    function links(k) { return (P.attrs[k] || []).map(function (v) { var x = FAC.byKey[k] && FAC.byKey[k].byV[v]; return x ? '<a href="' + tagUrl(k, v) + '">' + esc(x.label) + "</a>" : ""; }).filter(Boolean).join(", "); }
    var brandUrl = G ? gRoot + "?b=" + P.brandSlug : "/brand/" + P.brandSlug;
    var rows = P.brand ? [["Бренд", '<a href="' + brandUrl + '">' + esc(P.brand) + "</a>"]] : [];
    if (G) { if (P.sku) rows.push(["Артикул", esc(P.sku)]); (P.specs || []).forEach(function (s) { rows.push([esc(s[0]), esc(s[1])]); }); }
    else {
    if (P.collSlug) rows.push(["Коллекция", '<a href="/brand/' + P.brandSlug + "/" + P.collSlug + '">' + esc(P.coll) + "</a>"]);
    rows.push(["Артикул", esc(P.sku)]);
    [["strana", "Страна производства"], ["vid-oboev", "Вид обоев"], ["tip-oboev", "Тип обоев"], ["pokrytie", "Покрытие"], ["risunok", "Рисунок"], ["stil", "Стиль"], ["pomeshhenie", "Помещение"], ["tsvet", "Цвет"], ["ton", "Тон"], ["shirina", "Ширина рулона"], ["dlina", "Длина рулона"], ["rapport", "Раппорт"]].forEach(function (r) { var l = links(r[0]); if (l) rows.push([r[1], l]); });
    if (P.base) rows.push(["Основа", esc(P.base)]);
    if (P.year) rows.push(["Год коллекции", P.year]);
    }
    var mini = []; if (G) (P.specs || []).forEach(function (s) { if (String(s[1]).length <= 28) mini.push(s); });
    if (!G) {
      var lab = function (k, skipRoll) { return (P.attrs[k] || []).map(function (v) { var o = FAC.byKey[k] && FAC.byKey[k].byV[v]; return o ? o.label : ""; }).filter(function (t) { return t && !(skipRoll && /^Рулонные/.test(t)); }).join(", "); };
      var cover = lab("pokrytie"), kindOf = lab("tip-oboev", true);
      if (cover) mini.push(["Покрытие", cover]); else if (P.typeLabel && P.typeLabel !== "Обои") mini.push(["Вид обоев", P.typeLabel]);
      if (kindOf) mini.push(["Тип обоев", kindOf]); if (size) mini.push(["Рулон", size]); if (P.rapport) mini.push(["Раппорт", String(P.rapport).replace(".", ",") + " см"]); if (P.colorLabel) mini.push(["Цвет", P.colorLabel]); if (P.country) mini.push(["Страна", P.country]); mini.push(["Артикул", P.sku]);
    }
    var unit = G ? "шт" : P.unit === "м²" ? "м²" : "рулон", hasPrice = !!P.price;
    /* описание под карточкой — как $T['desc'] в lib/product-page.php */
    var lcl = function (k, skipRoll) { return ((P.attrs && P.attrs[k]) || []).map(function (v) { var o = FAC.byKey[k] && FAC.byKey[k].byV[v]; return o ? o.label : ""; }).filter(function (t) { return t && !(skipRoll && /^Рулонные/.test(t)); }).join(", ").toLowerCase(); };
    var cap = function (t) { return t.charAt(0).toUpperCase() + t.slice(1); }, s1 = [], s2 = [], cc, xx;
    if (G) {
      s1.push(title + (P.subLabel ? " — " + P.subLabel.toLowerCase() : "") + (P.brand ? ", производитель " + P.brand : "") + ".");
      (P.specs || []).slice(0, 4).forEach(function (sp) { if (String(sp[1]).length <= 60) s1.push(sp[0] + " — " + String(sp[1]).toLowerCase() + "."); });
    } else {
      var vidL = lcl("vid-oboev"), what = !vidL ? "обои" : vidL.indexOf("обои") >= 0 ? vidL : vidL + " обои";
      s1.push(title + ": " + what + " фабрики " + P.brand + (P.coll ? " из коллекции «" + P.coll + "»" : "") + (P.country ? ", страна производства — " + P.country : "") + ".");
      cc = []; if ((xx = lcl("pokrytie"))) cc.push("покрытие — " + xx); if ((xx = lcl("tip-oboev", true))) cc.push("тип обоев — " + xx); if (cc.length) s1.push(cap(cc.join(", ")) + ".");
      cc = []; if ((xx = lcl("tsvet"))) cc.push("цвет — " + xx); if ((xx = lcl("ton"))) cc.push("тон — " + xx); if (cc.length) s1.push(cap(cc.join("; ")) + ".");
      cc = []; if ((xx = lcl("risunok"))) cc.push("рисунок — " + xx); if ((xx = lcl("stil"))) cc.push("стиль — " + xx); if (cc.length) s1.push(cap(cc.join("; ")) + ".");
      if ((xx = lcl("pomeshhenie"))) s1.push("Подходят для помещений: " + xx + ".");
      if (roll) s2.push("Размер рулона — " + size + (P.rapport ? ", раппорт — " + String(P.rapport).replace(".", ",") + " см" : "") + ".");
      else if (P.type === "mural") s2.push("Изображение печатается под размер стены, цена указана за квадратный метр.");
    }
    s2.push(hasPrice ? "Цена — " + rub(P.price) + " за " + (unit === "шт" ? "штуку" : unit) + "." : "Цену и наличие уточняйте у менеджера.");
    s2.push("Купить " + (P.brand + " " + P.sku).trim() + " можно с доставкой по России или в шоурумах Decando: Москва, Санкт-Петербург, Брянск, Калуга.");
    var descHtml = '<section class="pdesc"><div class="container"><h2 class="h3">Описание</h2><div class="prose"><p>' + esc(s1.join(" ")) + "</p><p>" + esc(s2.join(" ")) + "</p></div></div></section>";
    var snap = JSON.stringify({ id: P.id, sku: P.sku, title: P.title, brand: P.brand, coll: P.coll, price: P.price, old: P.old, unit: P.unit, thumb: P.thumb, img: P.img, type: P.type, typeLabel: P.typeLabel, roll: P.roll, rapport: P.rapport, badges: P.badges });
    var badges = DC.badgeHtml(P);
    document.title = title + " — купить, " + (hasPrice ? rub(P.price) : "цена по запросу") + " | Decando";
    root.innerHTML =
      '<section class="page-head" style="padding-bottom:20px"><div class="container"><nav class="crumbs" aria-label="Навигация">' + crumbs(cr) + "</nav></div></section>" +
      '<div class="container"><div class="product" data-product data-pid="' + esc(P.id) + '" data-p="' + esc(snap) + '" data-ssr>' +
      '<div class="pgal' + (P.kind ? " pgal--goods" : "") + '">' + (gallery.length > 1 ? '<div class="pgal__thumbs" role="tablist">' + gallery.map(function (g, i) { return '<button type="button" class="pgal__thumb' + (i ? "" : " is-on") + '" data-gthumb="' + esc(g) + '" role="tab"><img src="' + esc(g) + '" alt="" loading="lazy"></button>'; }).join("") + "</div>" : "") +
      '<div class="pgal__main" data-gmain data-ph="' + esc(P.brand + " · " + P.sku) + '">' + (gallery.length ? '<img src="' + esc(gallery[0]) + '" alt="' + esc(title) + '">' : "") + '<span class="pgal__badges">' + badges + "</span></div></div>" +
      '<div class="pinfo" data-info data-ssr><p class="pinfo__sku">Арт.: ' + esc(P.sku) + '</p><h1 class="pinfo__title">' + esc(title) + "</h1>" +
      '<p class="pinfo__brand"><a href="' + brandUrl + '">' + esc(P.brand) + "</a>" + (P.collSlug && !G ? ' · <a href="/brand/' + P.brandSlug + "/" + P.collSlug + '">коллекция ' + esc(P.coll) + "</a>" : "") + "</p>" +
      (hasPrice ? '<div class="pinfo__price"><b>' + rub(P.price) + "</b>" + (P.old ? "<s>" + rub(P.old) + "</s>" : "") + "<small>/ " + unit + "</small></div>" : '<div class="pinfo__price"><b class="price-ask">Цена по запросу</b></div>') +
      (tones.length > 1 ? '<div class="pinfo__tones"><p class="pinfo__label">Другие цвета этого рисунка</p><div class="pinfo__tones-row">' + tones.map(function (q) { var u = D.img(q); return '<a class="tone-img' + (q.id === P.id ? " is-on" : "") + '" href="/product/' + q.id + '" title="' + esc(q.sku) + '">' + (u ? '<img src="' + esc(u) + '" alt="" loading="lazy">' : "") + "</a>"; }).join("") + "</div></div>" : "") +
      '<div class="pinfo__specs">' + mini.slice(0, mini.length >= 6 ? 6 : mini.length >= 4 ? 4 : 2).map(function (s) { return "<div><span>" + esc(s[0]) + "</span><b>" + esc(s[1]) + "</b></div>"; }).join("") + "</div>" +
      (hasPrice && roll ? '<details class="pcalc"><summary><svg class="ic"><use href="#i-ruler"/></svg>Сколько рулонов нужно?</summary><div class="mini-calc" data-mini><div class="mini-calc__row">' +
        '<div class="field"><input class="field__input" id="mL" type="number" step="0.1" min="1" value="4" placeholder=" " data-m="l"><label class="field__label" for="mL">Длина, м</label></div>' +
        '<div class="field"><input class="field__input" id="mW" type="number" step="0.1" min="1" value="3.5" placeholder=" " data-m="w"><label class="field__label" for="mW">Ширина, м</label></div>' +
        '<div class="field"><input class="field__input" id="mH" type="number" step="0.05" min="2" value="2.7" placeholder=" " data-m="h"><label class="field__label" for="mH">Высота, м</label></div></div>' +
        '<div class="mini-calc__out"><span data-m-out></span><button type="button" class="mini-calc__use" data-m-use>Положить в корзину</button></div></div></details>' : "") +
      (hasPrice ? '<div class="pinfo__buy"><div class="stepper"><button type="button" data-q="-1" aria-label="Меньше"><svg class="ic"><use href="#i-minus"/></svg></button><input type="number" min="1" max="999" value="1" data-qty aria-label="Количество"><button type="button" data-q="1" aria-label="Больше"><svg class="ic"><use href="#i-plus"/></svg></button></div>' +
        '<button type="button" class="btn btn--primary" data-buy><svg class="ic"><use href="#i-bag"/></svg>В корзину · <span data-buy-sum>' + rub(P.price) + '</span></button><button type="button" class="btn btn--ghost btn--fav" data-fav="' + esc(P.id) + '" aria-label="В избранное"><svg class="ic"><use href="#i-heart"/></svg></button></div>'
        : '<div class="pinfo__buy"><button type="button" class="btn btn--primary" data-lead="oneclick" data-product="' + esc(P.id) + '"><svg class="ic"><use href="#i-phone"/></svg>Узнать цену и наличие</button><button type="button" class="btn btn--ghost btn--fav" data-fav="' + esc(P.id) + '" aria-label="В избранное"><svg class="ic"><use href="#i-heart"/></svg></button></div>') +
      tryHtml + '<p class="pinfo__more"><button type="button" class="u-link" data-lead="oneclick" data-product="' + esc(P.id) + '">Купить в один клик</button><span>·</span><span>Доставка по России и самовывоз из 4 шоурумов</span></p></div></div>' +
      '<div class="ptabs"><div class="ptabs__nav" role="tablist"><button type="button" class="is-on" data-tab="specs" role="tab">Характеристики</button><button type="button" data-tab="ship" role="tab">Доставка</button></div>' +
      '<div class="ptabs__panel" data-tabpanel="specs"><table class="spec-table"><tbody>' + rows.map(function (r) { return "<tr><th>" + r[0] + "</th><td>" + r[1] + "</td></tr>"; }).join("") + "</tbody></table></div>" +
      '<div class="ptabs__panel" data-tabpanel="ship" hidden><div class="prose"><p>Доставляем по всей России или забирайте в шоуруме: Москва, Санкт-Петербург, Брянск, Калуга. Срок и стоимость назовёт менеджер.</p><p><a href="/delivery">Доставка и оплата</a> · <a href="/return">Обмен и возврат</a></p></div></div></div></div>' + descHtml + compHtml +
      (related.length ? '<section class="section section--paper2"><div class="container"><div class="section-head"><div class="section-head__text"><h2 class="h2">Похожие товары</h2></div><div class="rail__nav" style="display:flex;gap:8px"><button type="button" class="rail__btn" data-rail-prev aria-label="Назад"><svg class="ic"><use href="#i-arrow-l"/></svg></button><button type="button" class="rail__btn" data-rail-next aria-label="Вперёд"><svg class="ic"><use href="#i-arrow"/></svg></button></div></div><div class="rail" data-rail><div class="rail__track" data-related></div></div></div></section>' : "");
    var compBox = $("[data-comp]", root);
    comp.forEach(function (q) { D.byId[q.id] = D.byId[q.id] || q; if (compBox) compBox.appendChild(DC.card(q)); });
    var relBox = $("[data-related]", root);
    related.forEach(function (q) { D.byId[q.id] = D.byId[q.id] || q; if (relBox) relBox.appendChild(DC.card(q)); });
    document.body.classList.add("page-product");
    afterRender(["/assets/js/product.js"]);
  }

  /* ---------- краска и лепнина: /product-category/kraska…, /product-category/lepnina ---------- */
  function goodsListing(p0) {
    var C = GCATS[p0], qs = new URLSearchParams(location.search), ok = function (s) { return /^[a-z0-9-]{1,60}$/.test(s || "") ? s : ""; };
    var v = C.sub ? "" : ok(qs.get("v")), b = ok(qs.get("b")), sort = ["cheap", "exp", "sale"].indexOf(qs.get("sort")) >= 0 ? qs.get("sort") : "pop", page = Math.max(1, PAGE);
    var pool = GOODS.filter(function (p) { return p.kind === C.kind && (!C.sub || p.attrs.sub.indexOf(C.sub) >= 0); });
    var subs = {}, brands = {}, all = [];
    pool.forEach(function (p) {
      var okV = !v || p.attrs.sub.indexOf(v) >= 0, okB = !b || p.brandSlug === b;
      if (okB) p.attrs.sub.forEach(function (s) { (subs[s] = subs[s] || { label: p.subLabel || s, n: 0 }).n++; });
      if (okV && p.brandSlug) (brands[p.brandSlug] = brands[p.brandSlug] || { label: p.brand, n: 0 }).n++;
      if (okV && okB && (sort !== "sale" || p.old)) all.push(p);
    });
    if ((v && !subs[v]) || (b && !brands[b])) return notFound();
    var cmp = { pop: function (x, y) { return y.pop - x.pop; }, cheap: function (x, y) { return (!x.price - !y.price) || x.price - y.price; }, exp: function (x, y) { return y.price - x.price; },
      sale: function (x, y) { return ((y.old ? 1 - y.price / y.old : 0) - (x.old ? 1 - x.price / x.old : 0)) || y.pop - x.pop; } };
    all.sort(cmp[sort]);
    var byN = function (o) { return Object.keys(o).sort(function (x, y) { return o[y].n - o[x].n; }); };
    var subKeys = byN(subs), brandKeys = byN(brands);
    var per = 24, total = all.length, pages = Math.max(1, Math.ceil(total / per));
    if (page > pages) return notFound();
    var shown = all.slice((page - 1) * per, page * per);
    function url(nv, nb, ns, pg) { var q = new URLSearchParams(); if (nv) q.set("v", nv); if (nb) q.set("b", nb); if (ns !== "pop") q.set("sort", ns); var s = q.toString(); return p0 + (pg > 1 ? "/page/" + pg : "") + (s ? "?" + s : ""); }
    var h1 = C.h1, parts = []; if (v) parts.push(subs[v].label.toLowerCase()); if (b) parts.push(brands[b].label); if (parts.length) h1 += ": " + parts.join(", ");
    var word = plural(total, "товар", "товара", "товаров"), root = "/product-category/" + C.kind;
    var intro = total + " " + word + (C.kind === "lepnina" && !v && subKeys.length ? ": " + subKeys.slice(0, 5).map(function (s) { return subs[s].label.toLowerCase(); }).join(", ") + " и другой декор" : "") +
      (brandKeys.length ? (C.kind === "lepnina" && !v ? " — " : " — бренды ") + brandKeys.slice(0, 4).map(function (s) { return brands[s].label; }).join(", ") : "") + ".";
    var cr = [["Главная", "/"], ["Каталог", "/catalog"]]; if (p0 !== root) cr.push([GCATS[root].h1, root]); cr.push([parts.length ? h1 : C.h1, null]);
    document.title = h1 + (page > 1 ? " — страница " + page : "") + " | Decando";
    function opt(href, label, n, on, hid) { return '<a class="fopt' + (on ? " is-on" : "") + (hid && !on ? " is-hid" : "") + '" href="' + esc(href) + '"><i></i><span>' + esc(label) + "</span><em>" + n + "</em></a>"; }
    var side = "";
    if (!C.sub && C.kind === "lepnina" && subKeys.length) {
      side += '<div class="fgroup" data-fgroup="sub"><p class="fgroup__t">Вид изделия</p><div class="fopts">' + subKeys.map(function (s, i) { return opt(url(v === s ? "" : s, b, sort, 1), subs[s].label, subs[s].n, v === s, i >= 10); }).join("") + "</div>" +
        (subKeys.length > 10 ? '<button type="button" class="fmore" data-fmore>Ещё ' + (subKeys.length - 10) + "</button>" : "") + "</div>";
    }
    if (brandKeys.length) side += '<div class="fgroup" data-fgroup="brand"><p class="fgroup__t">Бренд</p><div class="fopts">' + brandKeys.map(function (s) { return opt(url(v, b === s ? "" : s, sort, 1), brands[s].label, brands[s].n, b === s, false); }).join("") + "</div></div>";
    var chip = function (label, href) { return '<a class="chip" href="' + esc(href) + '">' + esc(label) + '<svg class="ic"><use href="#i-close"/></svg></a>'; };
    var chips = v || b ? '<div class="active-filters">' + (v ? chip(subs[v].label, url("", b, sort, 1)) : "") + (b ? chip(brands[b].label, url(v, "", sort, 1)) : "") + "</div>" : "";
    var pager = "";
    if (pages > 1) {
      pager = '<nav class="pager" aria-label="Страницы">' + (page > 1 ? '<a class="pager__btn" href="' + esc(url(v, b, sort, page - 1)) + '">←<span> Назад</span></a>' : "");
      var win = [1, pages]; for (var i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) win.push(i);
      win = win.filter(function (x, i2, a) { return a.indexOf(x) === i2; }).sort(function (x, y) { return x - y; });
      var prev = 0;
      win.forEach(function (n) { if (prev && n - prev > 1) pager += '<span class="pager__dots">…</span>'; pager += n === page ? '<span class="pager__n is-on">' + n + "</span>" : '<a class="pager__n" href="' + esc(url(v, b, sort, n)) + '">' + n + "</a>"; prev = n; });
      pager += (page < pages ? '<a class="pager__btn" href="' + esc(url(v, b, sort, page + 1)) + '"><span>Дальше </span>→</a>' : "") + "</nav>";
    }
    var nav = Object.keys(GCATS).filter(function (c) { return GCATS[c].kind === C.kind; });
    var sorts = [["pop", "Сначала популярные"], ["cheap", "Сначала дешевле"], ["exp", "Сначала дороже"], ["sale", "Со скидкой"]];
    root_.innerHTML =
      '<section class="page-head"><div class="container"><nav class="crumbs" aria-label="Навигация">' + crumbs(cr) + '</nav><div class="page-head__row"><div><h1 class="page-head__title page-head__title--tag">' + esc(h1) + '</h1><p class="page-head__sub">' + esc(intro) + "</p></div></div>" +
      (nav.length > 1 ? '<nav class="catnav" aria-label="Разделы">' + nav.map(function (c) { return '<a href="' + c + '"' + (c === p0 ? ' class="is-on" aria-current="page"' : "") + ">" + GCATS[c].label + "</a>"; }).join("") + "</nav>" : "") + "</div></section>" +
      '<div class="container cat"><aside class="filters" data-filters aria-label="Фильтры"><div class="filters__head"><b class="h3" style="font-size:28px">Фильтры</b><button type="button" class="iconbtn" data-filters-close aria-label="Закрыть фильтры"><svg class="ic"><use href="#i-close"/></svg></button></div>' + side + "</aside><div>" +
      '<div class="cat__bar"><p class="cat__count"><b>' + total + "</b> " + word + '</p><div class="cat__tools"><button type="button" class="btn btn--ghost btn--sm cat__filter-btn" data-filters-open><svg class="ic"><use href="#i-filter"/></svg>Фильтры</button><select class="sort" data-sort aria-label="Сортировка">' +
      sorts.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === sort ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select></div></div>" + chips +
      (total ? '<div class="pgrid" data-grid></div>' + pager : '<div class="cat__empty"><p class="h3">Ничего не нашлось</p><p class="muted">Попробуйте убрать часть фильтров.</p><a class="btn btn--ghost" href="' + root + '">Весь раздел</a></div>') + "</div></div>";
    var grid = $("[data-grid]", root_);
    shown.forEach(function (p) { D.byId[p.id] = D.byId[p.id] || p; if (grid) grid.appendChild(DC.card(p)); });
    DC.hydrateCards(root_);
    afterRender(["/assets/js/tag.js"]);
  }

  function afterRender(scripts) {
    scripts.forEach(function (src) { var s = document.createElement("script"); s.src = src; document.body.appendChild(s); });
    DC.reveal(root);
    $$("img", root).forEach(function (img) { if (img.complete && !img.naturalWidth && img.getAttribute("src") && img.loading !== "lazy") img.dispatchEvent(new Event("error")); });
    window.scrollTo(0, 0);
  }
})();
