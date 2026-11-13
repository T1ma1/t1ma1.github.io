/* ============================================================
   DECANDO — страница «Примерочная»: интерфейс поверх движка DC_STUDIO.
   Стены (все сразу или по одной) оклеиваются обоями или красятся,
   потолок и мебель — красятся. Состояние комнаты — в адресе страницы.
   ============================================================ */
(function () {
  "use strict";
  var DC = window.DC, D = window.DC_DATA, $ = DC.$, $$ = DC.$$, esc = DC.esc;
  var root = $("[data-studio]"); if (!root) return;
  var ROOMS = DC_STUDIO.ROOMS, LIGHT = DC_STUDIO.LIGHT;
  var WALL_NAMES = ["Задняя", "Левая", "Правая"], WALL_FULL = ["задняя стена", "левая стена", "правая стена"];

  /* палитра для потолка, мебели и окраски стен */
  var PAINT = [
    ["white", "Белые", [["Молоко", "#F2EFE8"], ["Сливки", "#EFE7D8"], ["Хлопок", "#F5F3EE"], ["Известь", "#E8E5DD"], ["Жемчуг", "#E4DED3"]]],
    ["neutral", "Нейтральные", [["Лён", "#D9CDB8"], ["Овсянка", "#CDBFA8"], ["Камень", "#B8AFA2"], ["Глина", "#A3958A"], ["Графит", "#4A4A47"], ["Антрацит", "#303337"]]],
    ["sand", "Песок и дерево", [["Песок", "#D8C3A0"], ["Кашемир", "#C6B095"], ["Карамель", "#B4875A"], ["Мокко", "#86664F"], ["Шоколад", "#4E3A2F"]]],
    ["green", "Зелёные", [["Мята", "#C9D8CA"], ["Шалфей", "#A9B39B"], ["Олива", "#7F8459"], ["Мох", "#5E6B4C"], ["Лес", "#3F5244"], ["Изумруд", "#2E5A4B"]]],
    ["blue", "Синие", [["Туман", "#C3CDD3"], ["Небо", "#9FB6C7"], ["Деним", "#5B7690"], ["Индиго", "#2F3F5C"], ["Ночь", "#1F2A3A"]]],
    ["terra", "Терракота", [["Пудра", "#E3C2B5"], ["Персик", "#E2B293"], ["Терракота", "#B4644A"], ["Кирпич", "#954A37"], ["Ржавчина", "#7E4529"]]],
    ["pink", "Розовые", [["Роза", "#D9A9A1"], ["Пыльная роза", "#BF8C84"], ["Вишня", "#7B2E36"]]],
    ["yellow", "Жёлтые", [["Шафран", "#DDBA70"], ["Охра", "#C99A5E"], ["Горчица", "#B89A45"]]]
  ];
  var paintName = {}; PAINT.forEach(function (f) { f[2].forEach(function (c) { paintName[c[1]] = c[0]; }); });

  /* ---------- обои: все товары каталога с фото (assets/data/primerka.json, собирает build.mjs) ---------- */
  var CAT = [], COLORS = [], BY = {};
  function WP(id) { return id ? BY[id] || null : null; }
  function addWp(p) { if (!BY[p.id]) { BY[p.id] = p; CAT.push(p); } return BY[p.id]; }
  function hasPhoto(p) { return /^\/assets\/img\/p\//.test(p.img || ""); }
  function loadCat() {
    return fetch("/assets/data/primerka.json").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
      COLORS = j.colors;
      j.items.forEach(function (a) {
        addWp({ id: a[0], sku: a[1], brand: j.brands[a[2]], title: a[3], price: a[4], old: 0, unit: "рулон", roll: a[5] ? [a[5], a[6]] : null, rapport: a[7],
          type: a[8], typeLabel: j.types[a[9]], color: a[10] >= 0 ? j.colors[a[10]][0] : "", plain: a[11],
          img: "/assets/img/p/" + a[0] + ".jpg", thumb: "/assets/img/p/" + a[0] + ".jpg" });
      });
    }).catch(function () {
      /* список не загрузился — хотя бы подборки с главной и то, что посетитель уже смотрел */
      Object.keys(D.byId).forEach(function (id) { var p = D.byId[id]; if (hasPhoto(p) && p.type !== "mural") addWp(p); });
    });
  }
  function priceOf(p) { return p.price ? DC.rub(p.price) : "Цена по запросу"; }

  /* ---------- состояние интерфейса ---------- */
  var q = new URLSearchParams(location.search);
  var ui = {
    room: ROOMS[q.get("room")] ? q.get("room") : "living",
    light: LIGHT[q.get("light")] ? q.get("light") : "day",
    mode: "wp", active: "walls", wallSel: "all",
    wp: null,
    paint: "#EFE7D8", color: "all", plain: "all", limit: 48, query: "", fam: "white",
    s: {}   // s[комната][0..6] = { wp: id } | { paint: hex } | null
  };
  Object.keys(ROOMS).forEach(function (k) { ui.s[k] = [null, null, null, null, null, null, null]; });
  var undoStack = [];

  /* ---------- движок ---------- */
  var sceneEl = $("[data-scene]"), stage = $("[data-stage]"), loading = $("[data-loading]");
  var studio = DC_STUDIO.create(sceneEl, { room: ui.room, onFail: fallback });
  function fallback() { studio = null; loading.hidden = true; $("[data-fallback]").hidden = false; root.classList.add("studio--lite"); }
  if (!studio) fallback();

  function apply(room, i, spec, instant) {
    if (!studio) return;
    if (spec && spec.wp) studio.setWall(i, WP(spec.wp), { room: room, instant: instant });
    else if (spec && spec.paint) studio.setPaint(i, spec.paint, { room: room, instant: instant });
    else if (i < 3) studio.setWall(i, null, { room: room, instant: instant });
    else studio.setPaint(i, null, { room: room, instant: instant });
  }
  /* применить ко всем целям одним шагом истории; обои на несколько стен — одной «поклейкой» */
  function set(targets, spec) {
    var room = ui.room, changes = [];
    targets.forEach(function (i) {
      var prev = ui.s[room][i];
      if (JSON.stringify(prev) === JSON.stringify(spec)) return;
      changes.push({ i: i, prev: prev });
      ui.s[room][i] = spec;
    });
    if (!changes.length) return;
    undoStack.push({ room: room, changes: changes });
    if (undoStack.length > 80) undoStack.shift();
    var idx = changes.map(function (c) { return c.i; });
    if (studio) {
      if (spec && spec.wp && idx.every(function (i) { return i < 3; })) studio.setWall(idx, WP(spec.wp));
      else idx.forEach(function (i) { apply(room, i, spec); });
    }
    sync();
  }
  function targets() { return ui.active === "walls" ? (ui.wallSel === "all" ? [0, 1, 2] : [ui.wallSel]) : [ui.active]; }

  /* ---------- отрисовка панелей ---------- */
  function specDot(spec) {
    var d = document.createElement("span");
    d.className = "studio__dot";
    if (!spec) d.classList.add("is-orig");
    else if (spec.wp) DC.patBg(d, WP(spec.wp), 20);
    else d.style.background = spec.paint;
    return d;
  }
  function renderSurfaces() {
    var box = $("[data-surfaces]"); box.innerHTML = "";
    var meta = ROOMS[ui.room], list = [["walls", "Стены"], [3, "Потолок"]].concat(meta.objects.map(function (o, k) { return [4 + k, o.name]; }));
    list.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "studio__pill";
      var on = it[0] === "walls" ? ui.active === "walls" : ui.active === it[0];
      b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on);
      var specs = it[0] === "walls" ? [0, 1, 2].map(function (i) { return ui.s[ui.room][i]; }) : [ui.s[ui.room][it[0]]];
      b.appendChild(specDot(specs.every(function (x) { return JSON.stringify(x) === JSON.stringify(specs[0]); }) ? specs[0] : specs.filter(Boolean)[0] || null));
      b.appendChild(document.createTextNode(it[1]));
      b.addEventListener("click", function () {
        ui.active = it[0];
        if (it[0] !== "walls" && ui.mode === "wp") setMode("paint");
        if (studio) studio.pulse(targets());
        sync();
      });
      box.appendChild(b);
    });
    var wb = $("[data-walls]"); wb.innerHTML = "";
    wb.hidden = ui.active !== "walls";
    [["all", "Все"], [0, WALL_NAMES[0]], [1, WALL_NAMES[1]], [2, WALL_NAMES[2]]].forEach(function (w) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "studio__pill studio__pill--sm" + (ui.wallSel === w[0] ? " is-on" : "");
      b.setAttribute("aria-pressed", ui.wallSel === w[0]);
      if (w[0] !== "all") b.appendChild(specDot(ui.s[ui.room][w[0]]));
      b.appendChild(document.createTextNode(w[1]));
      b.addEventListener("click", function () { ui.wallSel = w[0]; if (studio) studio.pulse(targets()); sync(); });
      wb.appendChild(b);
    });
  }
  function renderRooms() {
    var box = $("[data-rooms]"); if (box.children.length) {
      $$(".studio__room", box).forEach(function (b) { var on = b.getAttribute("data-room") === ui.room; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on); });
      return;
    }
    Object.keys(ROOMS).forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "studio__room"; b.setAttribute("data-room", k);
      b.innerHTML = '<img src="' + DC.roomImg("room-" + k) + '" alt="" loading="lazy"><span>' + ROOMS[k].name + "</span>";
      b.addEventListener("click", function () { setRoom(k); });
      box.appendChild(b);
    });
    renderRooms();
  }
  function renderLights() {
    var box = $("[data-lights]"), icons = { day: "i-sun", warm: "i-bulb", cold: "i-snow", none: "i-moon" };
    box.innerHTML = "";
    Object.keys(LIGHT).forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "studio__pill" + (ui.light === k ? " is-on" : "");
      b.setAttribute("aria-pressed", ui.light === k);
      b.innerHTML = '<svg class="ic"><use href="#' + icons[k] + '"/></svg>' + LIGHT[k].name;
      b.addEventListener("click", function () { ui.light = k; if (studio) studio.setLight(k); sync(); });
      box.appendChild(b);
    });
  }
  function wallsWidth(room, idx) { var w = studio ? studio.walls(room) : [4.9, 3.6, 3.6]; return idx.reduce(function (s, i) { return s + w[i]; }, 0); }
  function rollsFor(p, room, idx) {
    if (p.type === "mural") return { n: Math.ceil(wallsWidth(room, idx) * 2.7), unit: "м²" };
    var roll = p.roll || [1.06, 10.05];
    var r = DC.rolls({ perimeter: wallsWidth(room, idx), height: 2.7, rollW: roll[0], rollL: roll[1], rapport: p.rapport, match: p.match });
    return { n: r.rolls, unit: DC.plural(r.rolls, "рулон", "рулона", "рулонов") };
  }
  function renderNow() {
    var box = $("[data-now]"), t = targets(), spec = ui.s[ui.room][t[0]];
    var same = t.every(function (i) { return JSON.stringify(ui.s[ui.room][i]) === JSON.stringify(spec); });
    var where = ui.active === "walls" ? (ui.wallSel === "all" ? "Все стены" : WALL_NAMES[ui.wallSel] + " стена") : (ui.active === 3 ? "Потолок" : ROOMS[ui.room].objects[ui.active - 4].name);
    var html = "";
    if (!same) {
      html = '<span class="studio__now-sw studio__now-sw--mix"></span><div class="studio__now-t"><small>' + where + '</small><b>Разные покрытия</b><span>Выберите стену, чтобы увидеть её обои</span></div>';
    } else if (spec && spec.wp) {
      var p = WP(spec.wp), r = rollsFor(p, ui.room, t);
      html = '<a class="studio__now-sw" href="/product/' + p.id + '" data-now-sw aria-label="' + esc(p.title) + '"></a><div class="studio__now-t"><small>' + where + (p.typeLabel ? " · " + esc(p.typeLabel) : "") + '</small><b>' + esc(p.title) + "</b>" +
        "<span>" + (p.price ? DC.rub(p.price) + " " + DC.unitLabel(p) : "Цена по запросу") + " · ≈ " + r.n + " " + r.unit + " на " + (t.length > 1 ? "эти стены" : "эту стену") + "</span>" +
        '<div class="studio__now-act">' + (p.price ? '<button type="button" class="btn btn--light btn--sm" data-add="' + p.id + '" data-qty="' + r.n + '"><svg class="ic"><use href="#i-bag"/></svg>В корзину</button>'
          : '<button type="button" class="btn btn--light btn--sm" data-lead="oneclick" data-product="' + p.id + '"><svg class="ic"><use href="#i-phone"/></svg>Узнать цену</button>') +
        '<a class="btn btn--ghost-light btn--sm" href="/product/' + p.id + '">Характеристики</a>' +
        '<button type="button" class="studio__icon' + (DC.fav.has(p.id) ? " is-on" : "") + '" data-fav="' + p.id + '" aria-label="В избранное"><svg class="ic"><use href="#' + (DC.fav.has(p.id) ? "i-heart-fill" : "i-heart") + '"/></svg></button>' +
        '<button type="button" class="studio__icon" data-clear aria-label="Снять покрытие" title="Вернуть исходную стену"><svg class="ic"><use href="#i-close"/></svg></button></div></div>';
    } else if (spec && spec.paint) {
      html = '<span class="studio__now-sw" style="background:' + spec.paint + '"></span><div class="studio__now-t"><small>' + where + " · краска</small><b>" + esc(paintName[spec.paint] || spec.paint) + "</b><span>Подберём и заколеруем в шоуруме</span>" +
        '<div class="studio__now-act"><button type="button" class="btn btn--light btn--sm" data-lead="paint">Подобрать краску</button><button type="button" class="studio__icon" data-clear aria-label="Снять покрытие"><svg class="ic"><use href="#i-close"/></svg></button></div></div>';
    } else {
      html = '<span class="studio__now-sw studio__now-sw--orig"></span><div class="studio__now-t"><small>' + where + '</small><b>Как на фото</b><span>' + (ui.active === "walls" ? "Выберите обои ниже — они лягут на " + (ui.wallSel === "all" ? "все стены" : WALL_FULL[ui.wallSel]) : "Выберите цвет ниже") + "</span></div>";
    }
    box.innerHTML = html;
    var sw = $("[data-now-sw]", box); if (sw) DC.patBg(sw, WP(spec.wp), 30);
  }
  function filteredWp() {
    var list = CAT, s = ui.query.trim().toLowerCase();
    if (s) { var words = s.split(/\s+/); list = list.filter(function (p) { var t = (p.title + " " + p.brand + " " + p.sku).toLowerCase(); return words.every(function (w) { return t.indexOf(w) >= 0; }); }); }
    if (ui.color !== "all") list = list.filter(function (p) { return p.color === ui.color; });
    if (ui.plain !== "all") list = list.filter(function (p) { return p.plain === (ui.plain === "plain" ? 1 : 0); });
    return list;
  }
  function renderWpChips() {
    var box = $("[data-wp-styles]"); box.innerHTML = "";
    var chip = function (key, val, label) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "studio__chip" + (ui[key] === val ? " is-on" : "");
      b.setAttribute("aria-pressed", ui[key] === val);
      b.textContent = label;
      b.addEventListener("click", function () { ui[key] = ui[key] === val ? "all" : val; ui.limit = 48; renderWpChips(); renderWpGrid(); });
      box.appendChild(b);
    };
    chip("plain", "plain", "Без рисунка"); chip("plain", "pattern", "С рисунком");
    var sep = document.createElement("span"); sep.className = "studio__chip-sep"; box.appendChild(sep);
    COLORS.forEach(function (c) { chip("color", c[0], c[1]); });
  }
  function renderWpGrid() {
    var box = $("[data-wp-grid]"), list = filteredWp(), cur = ui.s[ui.room][targets()[0]];
    var total = list.length, pin = WP(ui.wp);
    box.innerHTML = total ? "" : '<p class="studio__empty">Ничего не нашли — попробуйте бренд, коллекцию или артикул.</p>';
    list = list.slice(0, ui.limit);
    /* выбранные обои всегда на виду — первыми в списке */
    if (pin && total && !ui.query && ui.color === "all" && ui.plain === "all") { list = [pin].concat(list.filter(function (p) { return p !== pin; })); }
    list.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "studio__wp" + (cur && cur.wp === p.id ? " is-on" : "");
      b.setAttribute("aria-pressed", !!(cur && cur.wp === p.id));
      b.innerHTML = '<span class="studio__wp-sw"></span><span class="studio__wp-t"><b>' + esc(p.brand) + "</b><span>" + esc(p.sku) + "</span><em>" + priceOf(p) + "</em></span>";
      DC.patBg($(".studio__wp-sw", b), p, p.type === "mural" ? 300 : 40);
      b.addEventListener("click", function () {
        ui.wp = p.id; D.remember(p);
        if (ui.active !== "walls") ui.active = "walls";
        set(targets(), { wp: p.id });
      });
      b.addEventListener("pointerenter", function () { if (studio) studio.preload(p); }, { once: true });
      box.appendChild(b);
    });
    if (total > ui.limit) {
      var more = document.createElement("button");
      more.type = "button"; more.className = "studio__more";
      more.textContent = "Показать ещё · осталось " + (total - ui.limit);
      more.addEventListener("click", function () { ui.limit += 48; renderWpGrid(); });
      box.appendChild(more);
    }
    $("[data-count-wp]").textContent = CAT.length;
  }
  function renderPaint() {
    var fams = $("[data-paint-fams]"), grid = $("[data-paint-grid]"), cur = ui.s[ui.room][targets()[0]];
    fams.innerHTML = ""; grid.innerHTML = "";
    PAINT.forEach(function (f) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "studio__chip" + (ui.fam === f[0] ? " is-on" : "");
      b.innerHTML = '<i style="background:' + f[2][Math.min(2, f[2].length - 1)][1] + '"></i>' + f[1];
      b.addEventListener("click", function () { ui.fam = f[0]; renderPaint(); });
      fams.appendChild(b);
    });
    PAINT.filter(function (f) { return f[0] === ui.fam; })[0][2].forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "studio__color" + (cur && cur.paint === c[1] ? " is-on" : "");
      b.innerHTML = '<span style="background:' + c[1] + '"></span>' + c[0];
      b.addEventListener("click", function () { ui.paint = c[1]; set(targets(), { paint: c[1] }); });
      grid.appendChild(b);
    });
    $("[data-count-paint]").textContent = PAINT.reduce(function (s, f) { return s + f[2].length; }, 0);
  }
  function setMode(m) {
    ui.mode = m;
    $$("[data-mode]", root).forEach(function (b) { var on = b.getAttribute("data-mode") === m; b.classList.toggle("is-on", on); b.setAttribute("aria-selected", on); });
    $$("[data-pane]", root).forEach(function (p) { p.hidden = p.getAttribute("data-pane") !== m; });
  }
  $$("[data-mode]", root).forEach(function (b) {
    b.addEventListener("click", function () {
      var m = b.getAttribute("data-mode"); setMode(m);
      if (m === "wp" && ui.active !== "walls") { ui.active = "walls"; sync(); }
    });
  });

  /* ---------- подборка под примеркой ---------- */
  function renderSelection() {
    var box = $("[data-selection]"), rows = {};
    Object.keys(ROOMS).forEach(function (room) {
      ui.s[room].slice(0, 3).forEach(function (spec, i) {
        if (!spec || !spec.wp) return;
        var r = rows[spec.wp] || (rows[spec.wp] = { p: WP(spec.wp), where: {}, rooms: {} });
        (r.where[room] = r.where[room] || []).push(i);
      });
    });
    var ids = Object.keys(rows);
    if (!ids.length) { box.innerHTML = '<p class="muted">Пока пусто — выберите обои в примерочной выше.</p>'; return; }
    var total = 0, html = '<div class="sel__list">';
    ids.forEach(function (id) {
      var r = rows[id], n = 0, places = [];
      Object.keys(r.where).forEach(function (room) {
        var idx = r.where[room], rr = rollsFor(r.p, room, idx);
        n += rr.n;
        places.push(ROOMS[room].name + ": " + (idx.length === 3 ? "все стены" : idx.map(function (i) { return WALL_FULL[i]; }).join(", ")));
      });
      r.n = n; r.places = places; total += n * (r.p.price || 0);
      html += '<div class="sel__row"><a class="sel__sw" href="/product/' + id + '" data-sel-sw="' + id + '" aria-label="' + esc(r.p.title) + '"></a>' +
        '<div class="sel__t"><b>' + esc(r.p.title) + '</b><span>' + esc(places.join("; ")) + "</span></div>" +
        '<div class="sel__q">≈ ' + n + " " + (r.p.unit === "м²" ? "м²" : DC.plural(n, "рулон", "рулона", "рулонов")) + "<small>" + (r.p.price ? DC.rub(r.p.price) + " " + DC.unitLabel(r.p) : "цена по запросу") + "</small></div>" +
        '<div class="sel__sum">' + (r.p.price ? DC.rub(n * r.p.price) : "—") + "</div>" +
        '<button type="button" class="btn btn--ghost btn--sm" data-add="' + id + '" data-qty="' + n + '">В корзину</button></div>';
    });
    html += '</div><div class="sel__foot"><p class="sel__total">Ориентировочно: <b>' + DC.rub(total) + '</b></p><div class="hero__cta">' +
      '<button type="button" class="btn btn--primary" data-sel-send>Отправить подборку менеджеру<svg class="ic"><use href="#i-arrow"/></svg></button>' +
      '<button type="button" class="btn btn--ghost" data-sel-all>Добавить всё в корзину</button></div></div>';
    box.innerHTML = html;
    $$("[data-sel-sw]", box).forEach(function (el) { DC.patBg(el, WP(el.getAttribute("data-sel-sw")), 30); });
    $("[data-sel-all]", box).addEventListener("click", function () {
      ids.forEach(function (id) { D.remember(rows[id].p); if (rows[id].p.price) DC.cart.add(id, rows[id].n); });
      DC.toast({ title: "Подборка в корзине", text: ids.length + " " + DC.plural(ids.length, "позиция", "позиции", "позиций"), link: { href: "/cart", text: "Оформить" } });
    });
    $("[data-sel-send]", box).addEventListener("click", function () {
      DC.openLead("studio", { details: function () {
        return "Примерочная:\n" + ids.map(function (id) { var r = rows[id]; return "• " + r.p.title + " — " + r.places.join("; ") + " — ≈" + r.n + (r.p.unit === "м²" ? " м²" : " рул.") + (r.p.price ? ", " + DC.rub(r.n * r.p.price) : ""); }).join("\n") +
          "\nИтого ≈ " + DC.rub(total) + "\nСсылка на примерку: " + location.href;
      } });
    });
  }

  /* ---------- адрес страницы = состояние текущей комнаты ---------- */
  function writeUrl() {
    var s = ui.s[ui.room], p = new URLSearchParams();
    p.set("room", ui.room);
    if (ui.light !== "day") p.set("light", ui.light);
    var w = s.slice(0, 3).map(function (x) { return x && x.wp ? x.wp : "-"; });
    if (w.some(function (x) { return x !== "-"; })) p.set("w", w.join(","));
    if (window.history.replaceState) window.history.replaceState(null, "", "/primerka?" + p.toString());
  }
  function sync() {
    renderRooms(); renderLights(); renderSurfaces(); renderNow(); renderWpGrid(); renderPaint(); renderSelection();
    $("[data-tool='undo']").disabled = !undoStack.length;
    writeUrl();
  }

  function setRoom(k) {
    if (k === ui.room) return;
    ui.room = k;
    if (typeof ui.active === "number" && ui.active > 3) ui.active = "walls";
    $("[data-scene-img]").src = "/assets/img/rooms/room-" + k + ".jpg";
    if (studio) { loading.hidden = false; studio.setRoom(k).then(function () { loading.hidden = true; }); }
    sync();
  }

  /* ---------- сцена: наведение и нажатие ---------- */
  function uvOf(e) { var r = sceneEl.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
  function labelOf(i) { return i < 3 ? (ui.wallSel === "all" ? "Стены" : WALL_NAMES[i] + " стена") : i === 3 ? "Потолок" : ROOMS[ui.room].objects[i - 4].name; }
  var hoverEl = $("[data-hover]"), hintEl = $("[data-hint]");
  sceneEl.addEventListener("pointermove", function (e) {
    if (!studio || e.pointerType === "touch" || splitOn) return;
    var uv = uvOf(e), i = studio.hit(uv[0], uv[1]);
    if (i < 0) { studio.hover(null); hoverEl.hidden = true; sceneEl.style.cursor = ""; return; }
    studio.hover(i < 3 && ui.wallSel === "all" ? [0, 1, 2] : [i]);
    hoverEl.hidden = false; hoverEl.textContent = labelOf(i);
    hoverEl.style.left = (uv[0] * 100) + "%"; hoverEl.style.top = (uv[1] * 100) + "%";
    sceneEl.style.cursor = "pointer";
  });
  sceneEl.addEventListener("pointerleave", function () { if (studio) studio.hover(null); hoverEl.hidden = true; });
  sceneEl.addEventListener("click", function (e) {
    if (!studio || splitOn) return;
    var uv = uvOf(e), i = studio.hit(uv[0], uv[1]);
    if (i < 0) return;
    hintEl.hidden = true;
    if (i < 3) {
      if (ui.active !== "walls") ui.active = "walls";
      if (ui.wallSel !== "all") ui.wallSel = i;
      if (ui.mode === "wp" && !ui.wp) return;
      var spec = ui.mode === "wp" ? { wp: ui.wp } : { paint: ui.paint };
      set(targets(), spec);
      studio.pulse(targets());
    } else {
      ui.active = i;
      if (ui.mode === "wp") setMode("paint");
      set([i], { paint: ui.paint });
      studio.pulse([i]);
    }
  });

  /* ---------- инструменты ---------- */
  var splitOn = false, splitX = 0.5, splitEl = $("[data-split]");
  function setSplitX(x) {
    splitX = Math.max(0.02, Math.min(0.98, x));
    splitEl.style.setProperty("--x", (splitX * 100) + "%");
    $(".studio__split-handle", splitEl).setAttribute("aria-valuenow", Math.round(splitX * 100));
    if (studio) studio.setSplit(splitX);
  }
  function toggleSplit(on) {
    splitOn = on; splitEl.hidden = !on;
    $("[data-tool='compare']").setAttribute("aria-pressed", on);
    $("[data-tool='compare']").classList.toggle("is-on", on);
    if (studio) studio.setSplit(on ? splitX : null);
    if (on) setSplitX(splitX);
  }
  (function () {
    var drag = false;
    splitEl.addEventListener("pointerdown", function (e) { drag = true; splitEl.setPointerCapture(e.pointerId); move(e); });
    splitEl.addEventListener("pointermove", function (e) { if (drag) move(e); });
    splitEl.addEventListener("pointerup", function () { drag = false; });
    function move(e) { var r = splitEl.getBoundingClientRect(); setSplitX((e.clientX - r.left) / r.width); }
    $(".studio__split-handle", splitEl).addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); setSplitX(splitX - 0.04); }
      if (e.key === "ArrowRight") { e.preventDefault(); setSplitX(splitX + 0.04); }
    });
  })();
  root.addEventListener("click", function (e) {
    var t = e.target.closest("[data-tool]");
    if (t) {
      var k = t.getAttribute("data-tool");
      if (k === "compare") toggleSplit(!splitOn);
      if (k === "undo") undo();
      if (k === "reset") {
        var idx = [0, 1, 2, 3, 4, 5, 6].filter(function (i) { return ui.s[ui.room][i]; });
        if (idx.length) {
          undoStack.push({ room: ui.room, changes: idx.map(function (i) { return { i: i, prev: ui.s[ui.room][i] }; }) });
          idx.forEach(function (i) { ui.s[ui.room][i] = null; apply(ui.room, i, null); });
          sync();
        }
      }
      if (k === "download" && studio) {
        var a = document.createElement("a");
        a.href = studio.snapshot(); a.download = "decando-primerka-" + ui.room + ".jpg";
        document.body.appendChild(a); a.click(); a.remove();
        DC.toast({ title: "Картинка сохранена", text: "Покажите её близким или дизайнеру", icon: "i-download" });
      }
      if (k === "share") {
        var url = location.href;
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () {
          DC.toast({ title: "Ссылка скопирована", text: "По ней откроется эта же примерка", icon: "i-share" });
        }, function () { prompt("Скопируйте ссылку:", url); });
      }
      if (k === "full") {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (stage.requestFullscreen) stage.requestFullscreen();
      }
      return;
    }
    if (e.target.closest("[data-clear]")) set(targets(), null);
  });
  function undo() {
    var h = undoStack.pop(); if (!h) return;
    if (h.room !== ui.room) setRoom(h.room);
    h.changes.forEach(function (c) { ui.s[h.room][c.i] = c.prev; apply(h.room, c.i, c.prev); });
    sync();
  }
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.target.closest("input, textarea")) { e.preventDefault(); undo(); }
  });
  $("[data-wp-search]").addEventListener("input", function () { ui.query = this.value; ui.limit = 48; renderWpGrid(); });
  DC.onChange(function () { renderNow(); });

  /* ---------- старт ---------- */
  function init() {
    var asked = q.get("p"), w = (q.get("w") || "").split(",");
    /* пришли из карточки товара: эти обои сразу на всех стенах */
    if (asked && !WP(asked) && D.byId[asked] && hasPhoto(D.byId[asked])) addWp(D.byId[asked]);
    /* по умолчанию — популярные обои с рисунком и цветом: на стене сразу видно, как работает примерка */
    var def = CAT.filter(function (p) { return p.plain === 0 && p.color && p.color !== "belyj"; })[0] || CAT[0];
    ui.wp = WP(asked) ? asked : (def ? def.id : null);
    if (asked && !WP(asked)) DC.toast({ title: "Для этих обоев пока нет фото", text: "Показали другие — выберите любые из списка", icon: "i-info" });
    if (WP(ui.wp)) D.remember(WP(ui.wp));
    if (w.length === 3 && w.some(function (x) { return WP(x); })) {
      w.forEach(function (id, i) { ui.s[ui.room][i] = WP(id) ? { wp: id } : null; if (WP(id)) D.remember(WP(id)); });
      var first = w.filter(function (x) { return WP(x); })[0]; ui.wp = first;
    } else {
      ui.s[ui.room][0] = ui.s[ui.room][1] = ui.s[ui.room][2] = ui.wp ? { wp: ui.wp } : null;
    }
    $("[data-scene-img]").src = "/assets/img/rooms/room-" + ui.room + ".jpg";
    renderWpChips(); setMode("wp"); sync();
    if (!studio) return;
    if (ui.light !== "day") studio.setLight(ui.light);
    var start = function () {
      studio.activate().then(function () {
        loading.hidden = true;
        var s = ui.s[ui.room], wpIdx = [0, 1, 2].filter(function (i) { return s[i] && s[i].wp; });
        var groups = {};
        wpIdx.forEach(function (i) { (groups[s[i].wp] = groups[s[i].wp] || []).push(i); });
        Object.keys(groups).forEach(function (id) { studio.setWall(groups[id], WP(id)); });
      });
    };
    if (document.readyState === "complete") start(); else window.addEventListener("load", start);
  }
  loadCat().then(init);
})();
