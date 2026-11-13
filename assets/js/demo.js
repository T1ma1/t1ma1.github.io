/* DECANDO — ДЕМО-ВЕРСИЯ для GitHub Pages (без PHP).
   Страницы каталога /oboi, /oboi/<тег>, /brand/<бренд>[/<коллекция>] и карточки /product/<товар>
   строятся здесь, в браузере, из /demo/catalog.json — той же вёрсткой, что у PHP-версии.
   Поиск в шапке тоже работает по этому файлу. На боевом сайте этого скрипта нет. */
(function () {
  "use strict";
  var DC = window.DC, D = window.DC_DATA, $ = DC.$, $$ = DC.$$, esc = DC.esc, rub = DC.rub, plural = DC.plural;
  var root = document.querySelector("[data-demo]");
  var CAT = null, FAC = null, BRANDS = null, BYID = null;

  function load() {
    if (CAT) return Promise.resolve();
    return Promise.all([fetch("/demo/catalog.json").then(function (r) { return r.json(); }), fetch("/demo/facets.json").then(function (r) { return r.json(); })])
      .then(function (res) {
        CAT = res[0]; FAC = res[1]; BYID = {}; BRANDS = {};
        CAT.forEach(function (p) {
          BYID[p.id] = p;
          var b = BRANDS[p.brandSlug] || (BRANDS[p.brandSlug] = { slug: p.brandSlug, name: p.brand, n: 0, colls: {} });
          b.n++;
          if (p.collSlug) { var c = b.colls[p.collSlug] || (b.colls[p.collSlug] = { slug: p.collSlug, name: p.coll, n: 0 }); c.n++; }
        });
        FAC.byKey = {}; FAC.list.forEach(function (f) { FAC.byKey[f.key] = f; f.byV = {}; f.values.forEach(function (v) { f.byV[v.v] = v; }); });
      });
  }

  /* ---------- поиск в шапке: вместо /api/search.php ---------- */
  function norm(s) { return String(s || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim(); }
  function searchHits(q) {
    var words = norm(q).split(" ").filter(Boolean).slice(0, 6);
    if (!words.length) return [];
    return CAT.filter(function (p) {
      var t = p._s || (p._s = (function () { var x = norm(p.title + " " + p.brand + " " + p.coll + " " + p.sku + " " + (p.typeLabel || "") + " " + (p.colorLabel || "")); return x + " " + x.replace(/[-\s._]/g, ""); })());
      return words.every(function (w) { return t.indexOf(w) >= 0 || (w.length > 4 && t.indexOf(w.slice(0, -2)) >= 0); });
    });
  }
  var nativeFetch = window.fetch.bind(window);
  window.fetch = function (url, opt) {
    var u = String(url);
    if (u.indexOf("/api/search.php") === 0) {
      var q = new URL(u, location.origin).searchParams.get("q") || "";
      return load().then(function () {
        var hits = searchHits(q).sort(function (a, b) { return b.pop - a.pop; });
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
  var m;
  load().then(function () {
    if (CATS[path]) return listing({ cat: path });
    if ((m = path.match(/^\/oboi\/([a-z0-9-]+)$/))) return listing({ tag: m[1] });
    if ((m = path.match(/^\/brand\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/))) return listing({ brand: m[1], coll: m[2] || "" });
    if ((m = path.match(/^\/product\/([A-Za-z0-9_-]+)$/))) return product(m[1]);
    notFound();
  }).catch(function () { notFound(); });

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
    var pool = q ? searchHits(q) : CAT;
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
  function product(slug) {
    var P = BYID[slug]; if (!P) return notFound();
    D.byId[P.id] = D.byId[P.id] || P;
    var title = P.title, B = BRANDS[P.brandSlug];
    var gallery = [D.img(P, true)].concat((P.imgs || []).map(function (u) { return D.img({ img: u }, true); })).filter(Boolean);
    var roll = P.roll, size = roll ? String(roll[0]).replace(".", ",") + " × " + String(roll[1]).replace(".", ",") + " м" : "";
    var tones = CAT.filter(function (q) { return q.name === P.name; }).slice(0, 12);
    /* компаньоны: к рисунку — однотон того же цвета, к однотону — рисунок (как dc_companions в PHP) */
    var PLAIN = ["odnotonnye", "shtukaturka-imitatsiya-2", "tkan-imitatsiya-2", "tkan-imitatsiya-3", "beton", "effekt-okrashennoj-steny", "prirodnye-materialy", "kamen-imitatsiya"];
    var isPlain = function (x) { var r = (x.attrs && x.attrs.risunok) || []; return r.length ? r.every(function (v) { return PLAIN.indexOf(v) >= 0; }) : null; };
    var hasPhoto = function (x) { return /^\/assets\/img\/p\//.test(x.img || ""); };
    var comp = [], pPlain = isPlain(P), tsv = (P.attrs && P.attrs.tsvet) || [];
    if (pPlain !== null && tsv.length) {
      var mainC = tsv[0], ton = P.attrs.ton || [];
      comp = CAT.filter(function (q) { return q !== P && hasPhoto(q) && isPlain(q) === !pPlain && ((q.attrs.tsvet || []).indexOf(mainC) >= 0); })
        .map(function (q) {
          var s = 0, qt = q.attrs.tsvet || [];
          if (q.collSlug && q.collSlug === P.collSlug && q.brandSlug === P.brandSlug) s += 100; else if (q.brandSlug === P.brandSlug) s += 40;
          if (ton.some(function (t) { return (q.attrs.ton || []).indexOf(t) >= 0; })) s += 10;
          if (qt[0] === mainC) s += 6; if (q.type === P.type) s += 4;
          return [s * 1e6 + Math.min(999999, q.pop || 0), q];
        }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 10).map(function (x) { return x[1]; });
    }
    var cVal = FAC.byKey.tsvet && FAC.byKey.tsvet.byV[tsv[0]], cName = cVal ? cVal.label.toLowerCase() : "";
    var compHtml = comp.length ? '<section class="pcomp"><div class="container"><div class="pcomp__head"><div><h2 class="h3">' + (pPlain ? "С рисунком в этом цвете" : "Компаньоны без рисунка") + '</h2><p class="muted">' + (pPlain ? "Обои с рисунком" : "Однотонные обои и фактуры") + (cName ? " — " + esc(cName) + " цвет" : "") + ', чтобы сочетать на соседних стенах</p></div></div><div class="rail" data-rail><div class="rail__track" data-comp></div></div></div></section>' : "";
    var tryHtml = hasPhoto(P) && P.type !== "mural" ? '<a class="btn btn--ghost ptry" href="/primerka?p=' + encodeURIComponent(P.id) + '"><svg class="ic"><use href="#i-room"/></svg>Примерить на стене</a>' : "";
    var related = CAT.filter(function (q) { return q !== P && q.collSlug && q.collSlug === P.collSlug && q.brandSlug === P.brandSlug; }).slice(0, 10);
    var vid = (P.attrs["vid-oboev"] || [])[0], vidVal = vid && FAC.byKey["vid-oboev"].byV[vid];
    var cr = [["Главная", "/"], ["Каталог", "/catalog"], ["Обои", "/product-category/oboi"]]; if (vidVal) { var VC = { flizelinovye: "/product-category/oboi/flizelinovye", vinilovye: "/product-category/oboi/vinilovye", "vinilovye-na-flizeline": "/product-category/oboi/vinilovye", "pod-pokrasku": "/product-category/oboi/pod-pokrasku", "fotooboi-i-panno": "/product-category/freski" }; cr.push([vidVal.label, VC[vid] || tagUrl("vid-oboev", vid)]); } cr.push([P.brand + " " + P.sku, null]);
    function links(k) { return (P.attrs[k] || []).map(function (v) { var x = FAC.byKey[k] && FAC.byKey[k].byV[v]; return x ? '<a href="' + tagUrl(k, v) + '">' + esc(x.label) + "</a>" : ""; }).filter(Boolean).join(", "); }
    var rows = [["Бренд", '<a href="/brand/' + P.brandSlug + '">' + esc(P.brand) + "</a>"]];
    if (P.collSlug) rows.push(["Коллекция", '<a href="/brand/' + P.brandSlug + "/" + P.collSlug + '">' + esc(P.coll) + "</a>"]);
    rows.push(["Артикул", esc(P.sku)]);
    [["strana", "Страна производства"], ["vid-oboev", "Вид обоев"], ["tip-oboev", "Тип обоев"], ["pokrytie", "Покрытие"], ["risunok", "Рисунок"], ["stil", "Стиль"], ["pomeshhenie", "Помещение"], ["tsvet", "Цвет"], ["ton", "Тон"], ["shirina", "Ширина рулона"], ["dlina", "Длина рулона"], ["rapport", "Раппорт"]].forEach(function (r) { var l = links(r[0]); if (l) rows.push([r[1], l]); });
    if (P.base) rows.push(["Основа", esc(P.base)]);
    if (P.year) rows.push(["Год коллекции", P.year]);
    var mini = []; if (size) mini.push(["Рулон", size]); if (P.rapport) mini.push(["Раппорт", String(P.rapport).replace(".", ",") + " см"]); if (P.coll) mini.push(["Коллекция", P.coll]); if (P.country) mini.push(["Страна", P.country]); if (P.colorLabel) mini.push(["Цвет", P.colorLabel]); mini.push(["Артикул", P.sku]);
    var unit = P.unit === "м²" ? "м²" : "рулон", hasPrice = !!P.price;
    var snap = JSON.stringify({ id: P.id, sku: P.sku, title: P.title, brand: P.brand, coll: P.coll, price: P.price, old: P.old, unit: P.unit, thumb: P.thumb, img: P.img, type: P.type, typeLabel: P.typeLabel, roll: P.roll, rapport: P.rapport, badges: P.badges });
    var badges = DC.badgeHtml(P);
    document.title = title + " — купить, " + (hasPrice ? rub(P.price) : "цена по запросу") + " | Decando";
    root.innerHTML =
      '<section class="page-head" style="padding-bottom:20px"><div class="container"><nav class="crumbs" aria-label="Навигация">' + crumbs(cr) + "</nav></div></section>" +
      '<div class="container"><div class="product" data-product data-pid="' + esc(P.id) + '" data-p="' + esc(snap) + '" data-ssr>' +
      '<div class="pgal">' + (gallery.length > 1 ? '<div class="pgal__thumbs" role="tablist">' + gallery.map(function (g, i) { return '<button type="button" class="pgal__thumb' + (i ? "" : " is-on") + '" data-gthumb="' + esc(g) + '" role="tab"><img src="' + esc(g) + '" alt="" loading="lazy"></button>'; }).join("") + "</div>" : "") +
      '<div class="pgal__main" data-gmain data-ph="' + esc(P.brand + " · " + P.sku) + '">' + (gallery.length ? '<img src="' + esc(gallery[0]) + '" alt="' + esc(title) + '">' : "") + '<span class="pgal__badges">' + badges + "</span></div></div>" +
      '<div class="pinfo" data-info data-ssr><p class="pinfo__sku">Арт.: ' + esc(P.sku) + '</p><h1 class="pinfo__title">' + esc(title) + "</h1>" +
      '<p class="pinfo__brand"><a href="/brand/' + P.brandSlug + '">' + esc(P.brand) + "</a>" + (P.collSlug ? ' · <a href="/brand/' + P.brandSlug + "/" + P.collSlug + '">коллекция ' + esc(P.coll) + "</a>" : "") + "</p>" +
      (hasPrice ? '<div class="pinfo__price"><b>' + rub(P.price) + "</b>" + (P.old ? "<s>" + rub(P.old) + "</s>" : "") + "<small>/ " + unit + "</small></div>" : '<div class="pinfo__price"><b class="price-ask">Цена по запросу</b></div>') +
      (tones.length > 1 ? '<div class="pinfo__tones"><p class="pinfo__label">Другие цвета этого рисунка</p><div class="pinfo__tones-row">' + tones.map(function (q) { var u = D.img(q); return '<a class="tone-img' + (q === P ? " is-on" : "") + '" href="/product/' + q.id + '" title="' + esc(q.sku) + '">' + (u ? '<img src="' + esc(u) + '" alt="" loading="lazy">' : "") + "</a>"; }).join("") + "</div></div>" : "") +
      '<div class="pinfo__specs">' + mini.slice(0, 4).map(function (s) { return "<div><span>" + esc(s[0]) + "</span><b>" + esc(s[1]) + "</b></div>"; }).join("") + "</div>" +
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
      '<div class="ptabs__panel" data-tabpanel="ship" hidden><div class="prose"><p>Доставляем по всей России или забирайте в шоуруме: Москва, Санкт-Петербург, Брянск, Калуга. Срок и стоимость назовёт менеджер.</p><p><a href="/delivery">Доставка и оплата</a> · <a href="/return">Обмен и возврат</a></p></div></div></div></div>' + compHtml +
      (related.length ? '<section class="section section--paper2"><div class="container"><div class="section-head"><div class="section-head__text"><h2 class="h2">Похожие товары</h2></div><div class="rail__nav" style="display:flex;gap:8px"><button type="button" class="rail__btn" data-rail-prev aria-label="Назад"><svg class="ic"><use href="#i-arrow-l"/></svg></button><button type="button" class="rail__btn" data-rail-next aria-label="Вперёд"><svg class="ic"><use href="#i-arrow"/></svg></button></div></div><div class="rail" data-rail><div class="rail__track" data-related></div></div></div></section>' : "");
    var compBox = $("[data-comp]", root);
    comp.forEach(function (q) { D.byId[q.id] = D.byId[q.id] || q; if (compBox) compBox.appendChild(DC.card(q)); });
    var relBox = $("[data-related]", root);
    related.forEach(function (q) { D.byId[q.id] = D.byId[q.id] || q; if (relBox) relBox.appendChild(DC.card(q)); });
    document.body.classList.add("page-product");
    afterRender(["/assets/js/product.js"]);
  }

  function afterRender(scripts) {
    scripts.forEach(function (src) { var s = document.createElement("script"); s.src = src; document.body.appendChild(s); });
    DC.reveal(root);
    $$("img", root).forEach(function (img) { if (img.complete && !img.naturalWidth && img.getAttribute("src")) img.dispatchEvent(new Event("error")); });
    window.scrollTo(0, 0);
  }
})();
