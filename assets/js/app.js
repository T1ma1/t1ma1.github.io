/* ============================================================
   DECANDO — общее поведение всех страниц:
   корзина и избранное, карточки товаров, квиз-подбор, заявки,
   поиск, cookie, мобильное меню, появление блоков.
   ============================================================ */
(function () {
  "use strict";
  var CFG = window.DC_CONFIG, D = window.DC_DATA, PT = window.DC_PATTERNS;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var rub = D.rub;
  document.documentElement.classList.remove("no-js");

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function plural(n, a, b, c) { n = Math.abs(n) % 100; var m = n % 10; return n > 10 && n < 20 ? c : m > 1 && m < 5 ? b : m === 1 ? a : c; }

  /* ---------- хранилище (корзина, избранное — необходимые данные) ---------- */
  var store = {
    get: function (k, def) { try { var v = localStorage.getItem("dc_" + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem("dc_" + k, JSON.stringify(v)); } catch (e) { /* приватный режим */ } }
  };
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { fn(); }); updateCounts(); }

  var cart = {
    items: function () { return store.get("cart", []).filter(function (i) { return D.byId[i.id]; }); },
    add: function (id, qty) {
      var items = cart.items(), it = items.filter(function (i) { return i.id === id; })[0];
      if (it) it.qty += qty || 1; else items.push({ id: id, qty: qty || 1 });
      store.set("cart", items); emit();
    },
    setQty: function (id, qty) {
      var items = cart.items().map(function (i) { if (i.id === id) i.qty = Math.max(1, Math.min(999, qty)); return i; });
      store.set("cart", items); emit();
    },
    remove: function (id) { store.set("cart", cart.items().filter(function (i) { return i.id !== id; })); emit(); },
    clear: function () { store.set("cart", []); emit(); },
    count: function () { return cart.items().reduce(function (s, i) { return s + i.qty; }, 0); },
    total: function () { return cart.items().reduce(function (s, i) { return s + D.byId[i.id].price * i.qty; }, 0); }
  };
  var fav = {
    ids: function () { return store.get("fav", []).filter(function (id) { return D.byId[id]; }); },
    has: function (id) { return fav.ids().indexOf(id) >= 0; },
    toggle: function (id) {
      var ids = fav.ids(), i = ids.indexOf(id), on = i < 0;
      if (on) ids.unshift(id); else ids.splice(i, 1);
      store.set("fav", ids); emit();
      return on;
    }
  };
  function updateCounts() {
    var c = cart.count(), f = fav.ids().length;
    $$("[data-cart-count]").forEach(function (el) { setCount(el, c); });
    $$("[data-fav-count]").forEach(function (el) { setCount(el, f); });
  }
  function setCount(el, n) {
    var prev = el.textContent;
    el.hidden = !n; el.textContent = n > 99 ? "99+" : String(n);
    if (prev && prev !== el.textContent) { el.classList.remove("is-bump"); void el.offsetWidth; el.classList.add("is-bump"); }
  }

  /* ---------- фото товара (или рисунок примерочной) как фон ---------- */
  function patBg(el, p, cm) {
    if (!el || !p) return;
    if (!p.pat) {
      var u = D.img(p); if (!u) return;
      el.style.backgroundImage = "url(" + JSON.stringify(u) + ")"; el.style.backgroundSize = "cover"; el.style.backgroundPosition = "center"; el.style.backgroundRepeat = "no-repeat";
      return;
    }
    PT = PT || window.DC_PATTERNS; if (!PT) return;
    el.style.backgroundImage = "url(" + PT.url(p.pat) + ")";
    el.style.backgroundColor = p.pat.c[0];
    if (p.type === "mural") { el.style.backgroundSize = "cover"; el.style.backgroundPosition = "center"; el.style.backgroundRepeat = "no-repeat"; }
    else el.style.backgroundSize = (p.pat.w / ((cm || 60) * 10) * 100).toFixed(2) + "% auto";
  }
  function paintPatterns(root) {
    $$("[data-pattern]", root).forEach(function (el) {
      var p = D.byId[el.getAttribute("data-pattern")];
      patBg(el, p, +el.getAttribute("data-pattern-cm") || 60);
    });
  }

  /* ---------- карточка товара ---------- */
  function badgeHtml(p) {
    var map = { hit: ["hit", "Хит"], new: ["new", "Новинка"], sale: ["sale", p.old ? "−" + Math.round((1 - p.price / p.old) * 100) + "%" : "Скидка"] };
    return p.badges.map(function (b) { var m = map[b]; return m ? '<span class="badge badge--' + m[0] + '">' + m[1] + "</span>" : ""; }).join("");
  }
  function unitLabel(p) { return p.unit === "м²" ? "/ м²" : "/ рулон"; }
  /* карточка — та же разметка, что dc_card() в lib/seo.php: фото, артикул, название, цена, корзина */
  function card(p, opt) {
    opt = opt || {};
    var el = document.createElement("article"), u = D.img(p), url = "/product/" + encodeURIComponent(p.id), on = fav.has(p.id);
    el.className = "pcard" + (opt.reveal ? " reveal" : "");
    el.setAttribute("data-id", p.id);
    el.innerHTML =
      '<a class="pcard__media" href="' + url + '" tabindex="-1" aria-hidden="true" data-ph="' + esc(p.brand + " · " + p.sku) + '">' + (u ? '<img class="pcard__img" src="' + esc(u) + '" alt="" loading="lazy" decoding="async">' : '<span class="pcard__noimg">Decando</span>') + '<span class="pcard__badges">' + badgeHtml(p) + "</span></a>" +
      '<button type="button" class="pcard__fav' + (on ? " is-on" : "") + '" data-fav="' + esc(p.id) + '" aria-label="В избранное" aria-pressed="' + on + '"><svg class="ic"><use href="#' + (on ? "i-heart-fill" : "i-heart") + '"/></svg></button>' +
      '<div class="pcard__body"><p class="pcard__sku">Арт.: ' + esc(p.sku) + "</p>" +
      '<h3 class="pcard__title"><a href="' + url + '">' + esc(p.title) + "</a></h3>" +
      '<div class="pcard__foot"><p class="pcard__price">' + (p.price ? rub(p.price) + (p.old ? " <s>" + rub(p.old) + "</s>" : "") : '<span class="price-ask">Цена по запросу</span>') + "</p>" +
      (p.price ? '<button type="button" class="pcard__cart" data-add="' + esc(p.id) + '" aria-label="В корзину"><svg class="ic"><use href="#i-bag"/></svg></button>' : '<button type="button" class="pcard__cart" data-lead="oneclick" data-product="' + esc(p.id) + '" aria-label="Узнать цену"><svg class="ic"><use href="#i-phone"/></svg></button>') + "</div></div>";
    return el;
  }

  /* серверные карточки (SEO-фильтр, карточка товара): образец, варианты цвета, избранное */
  function hydrateCards(root) {
    $$(".pcard[data-id]", root).forEach(function (el) {
      var p = D.byId[el.getAttribute("data-id")];
      if (!p && el.hasAttribute("data-p")) { try { p = JSON.parse(el.getAttribute("data-p")); } catch (e) { p = null; } }
      if (!p) return;
      var f = $("[data-fav]", el); if (f && fav.has(p.id) && !f.classList.contains("is-on")) { f.classList.add("is-on"); f.setAttribute("aria-pressed", "true"); var u = $("use", f); if (u) u.setAttribute("href", "#i-heart-fill"); }
    });
  }

  /* ---------- уведомления ---------- */
  function toast(o) {
    var box = $("[data-toasts]"); if (!box) return;
    var t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = (o.product ? '<span class="toast__sw"></span>' : '<span class="toast__ic"><svg class="ic"><use href="#' + (o.icon || "i-check") + '"/></svg></span>') +
      "<div><b>" + esc(o.title) + "</b>" + (o.text ? "<span>" + esc(o.text) + "</span>" : "") + "</div>" +
      (o.link ? '<a href="' + o.link.href + '">' + esc(o.link.text) + "</a>" : "");
    if (o.product) patBg($(".toast__sw", t), o.product, 30);
    box.appendChild(t);
    setTimeout(function () { t.classList.add("is-out"); setTimeout(function () { t.remove(); }, 420); }, o.ms || 3800);
  }

  /* делегирование: избранное и корзина в любой карточке */
  /* товар с серверной страницы — запомнить снимок (data-p), чтобы корзина и избранное знали цену и фото */
  function known(id, from) {
    if (D.byId[id] && D.byId[id].price) return D.remember(D.byId[id]);
    var holder = from && from.closest("[data-p]");
    if (holder) { try { return D.remember(JSON.parse(holder.getAttribute("data-p"))); } catch (e) { /* битый снимок */ } }
    return D.byId[id];
  }
  document.addEventListener("click", function (e) {
    var f = e.target.closest("[data-fav]");
    if (f) known(f.getAttribute("data-fav"), f);
    var ad = e.target.closest("[data-add]");
    if (ad) known(ad.getAttribute("data-add"), ad);
    if (f) {
      e.preventDefault();
      var id = f.getAttribute("data-fav"), on = fav.toggle(id), p = D.byId[id];
      $$('[data-fav="' + id + '"]').forEach(function (b) {
        b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on);
        var u = $("use", b); if (u) u.setAttribute("href", on ? "#i-heart-fill" : "#i-heart");
      });
      toast(on ? { title: "Добавили в избранное", text: p.title, product: p, link: { href: "/favorites.html", text: "Открыть" } } : { title: "Убрали из избранного", text: p.title, icon: "i-heart" });
      return;
    }
    var a = e.target.closest("[data-add]");
    if (a) {
      e.preventDefault();
      var pid = a.getAttribute("data-add"), qty = +(a.getAttribute("data-qty") || 1), pr = D.byId[pid];
      cart.add(pid, qty);
      toast({ title: "В корзине: " + pr.title, text: qty + " " + (pr.unit === "м²" ? "м²" : plural(qty, "рулон", "рулона", "рулонов")) + " · " + rub(pr.price * qty), product: pr, link: { href: "/cart.html", text: "Оформить" } });
    }
  });

  /* ---------- модальные окна ---------- */
  var openModal = null, lastFocus = null;
  function showModal(name) {
    var m = $('[data-modal="' + name + '"]'); if (!m) return null;
    if (openModal && openModal !== m) hideModal(openModal, true);
    lastFocus = document.activeElement;
    m.hidden = false; openModal = m;
    document.body.classList.add("is-locked");
    setTimeout(function () { var f = $("input:not([type=hidden]):not([tabindex='-1']), button:not([data-close])", m); if (f && name !== "quiz") f.focus(); }, 60);
    return m;
  }
  function hideModal(m, silent) {
    m = m || openModal; if (!m) return;
    m.hidden = true; openModal = null;
    document.body.classList.remove("is-locked");
    if (!silent && lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener("click", function (e) { if (e.target.closest("[data-close]") && openModal) hideModal(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openModal) hideModal();
    if (e.key === "Tab" && openModal) {   // фокус не уходит из окна
      var f = $$("a[href], button:not([disabled]), input:not([type=hidden]):not([tabindex='-1']), select, textarea", openModal).filter(function (x) { return x.offsetParent; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---------- телефон и проверка форм ---------- */
  function fmtPhone(v) {
    var d = v.replace(/\D/g, "");
    if (!d) return "";
    if (d[0] === "8") d = "7" + d.slice(1);
    if (d[0] !== "7") d = "7" + d;
    d = d.slice(0, 11);
    var o = "+7";
    if (d.length > 1) o += " (" + d.slice(1, 4);
    if (d.length >= 4) o += ")";
    if (d.length > 4) o += " " + d.slice(4, 7);
    if (d.length > 7) o += "-" + d.slice(7, 9);
    if (d.length > 9) o += "-" + d.slice(9, 11);
    return o;
  }
  document.addEventListener("input", function (e) {
    if (e.target.matches("[data-phone]")) {
      var el = e.target, end = el.selectionEnd === el.value.length;
      el.value = fmtPhone(el.value);
      if (end) el.setSelectionRange(el.value.length, el.value.length);
    }
  });
  function validate(form) {
    var ok = true;
    $$(".is-error", form).forEach(function (x) { x.classList.remove("is-error"); });
    $$(".field__err", form).forEach(function (x) { x.remove(); });
    function bad(input, msg) {
      ok = false;
      var w = input.closest(".field") || input.closest(".check");
      if (w) {
        w.classList.add("is-error");
        if (msg && w.classList.contains("field")) { var e = document.createElement("p"); e.className = "field__err"; e.textContent = msg; w.appendChild(e); }
      }
    }
    var name = form.elements.name, phone = form.elements.phone, consent = form.elements.consent;
    if (name && name.required && name.value.trim().length < 2) bad(name, "Напишите, как к вам обращаться");
    if (phone && phone.value.replace(/\D/g, "").length !== 11) bad(phone, "Проверьте номер: +7 и 10 цифр");
    if (consent && !consent.checked) bad(consent);
    $$("[required]", form).forEach(function (i) { if (i !== name && i !== phone && i !== consent && !i.value.trim()) bad(i, "Заполните поле"); });
    var first = $(".is-error input, .is-error select, .is-error textarea", form);
    if (first) first.focus();
    return ok;
  }

  /* ---------- отправка заявки ---------- */
  function leadText(data) {
    var lines = ["Заявка с сайта Decando: " + (data.title || data.kind), "Имя: " + data.name, "Телефон: " + data.phone];
    if (data.via) lines.push("Связаться: " + data.via);
    if (data.details) lines.push(data.details);
    return lines.join("\n");
  }
  function sendLead(data) {
    data.page = location.pathname.split("/").pop() || "index.html";
    data.ts = new Date().toISOString();
    var log = store.get("leads", []); log.unshift(data); store.set("leads", log.slice(0, 20));
    var ctl = "AbortController" in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
    return fetch(CFG.leadEndpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error("http " + r.status);
      return r.json().catch(function () { return { ok: true }; });
    }).then(function (j) { if (j && j.ok === false) throw new Error(j.error || "fail"); return { ok: true }; })
      .catch(function () { clearTimeout(timer); return { ok: false, wa: CFG.whatsapp + "?text=" + encodeURIComponent(leadText(data)) }; });
  }
  function doneHtml(res, title, text) {
    return '<div class="lead__done"><span class="lead__done-ic"><svg class="ic"><use href="#i-check"/></svg></span>' +
      '<h3 class="h3">' + esc(title) + "</h3><p class=\"muted\">" + esc(text) + "</p>" +
      (res.ok ? "" : '<div class="note note--warn">Не удалось связаться с сервером — заявка сохранена в браузере. Чтобы мы получили её прямо сейчас, отправьте её в WhatsApp одним нажатием.</div>' +
        '<a class="btn btn--primary" href="' + res.wa + '" target="_blank" rel="noopener"><svg class="ic"><use href="#i-wa"/></svg>Отправить в WhatsApp</a>') +
      "</div>";
  }

  /* формы на страницах и в окне заявки */
  document.addEventListener("submit", function (e) {
    var form = e.target.closest("[data-form]");
    if (!form) return;
    e.preventDefault();
    if (form.elements.website && form.elements.website.value) return;   // ловушка для ботов
    if (!validate(form)) return;
    var fd = new FormData(form), data = {};
    fd.forEach(function (v, k) { if (k !== "website" && k !== "consent") data[k] = typeof v === "string" ? v.trim() : v; });
    data.consent = true;
    data.title = form.getAttribute("data-title") || (LEADS[data.kind] || {}).title || "Заявка";
    if (form._details) data.details = form._details();
    var btn = $("[type=submit]", form);
    btn.classList.add("is-loading");
    sendLead(data).then(function (res) {
      btn.classList.remove("is-loading");
      var host = form.getAttribute("data-form") === "lead" ? form : form;
      host.outerHTML = doneHtml(res, "Спасибо, " + (data.name || "заявка принята") + "!", "Менеджер свяжется с вами в течение " + CFG.managerReply + " (" + CFG.hours + "). Если пишете ночью — ответим утром.");
      if (form.getAttribute("data-form") === "checkout") cart.clear();
    });
  });

  /* ---------- окно заявки: варианты ---------- */
  var LEADS = {
    podbor: { eyebrow: "Бесплатно", title: "Подбор материалов под ваш проект", sub: "Менеджер свяжется с вами в течение 15 минут и поможет подобрать обои, краску и лепнину.", btn: "Получить подборку",
      extra: { type: "textarea", name: "comment", label: "Помещение, стиль, бюджет — что знаете" } },
    callback: { eyebrow: "Бесплатно", title: "Перезвоним за 15 минут", sub: "Подскажем по обоям, наличию и доставке. Без навязчивых звонков.", btn: "Жду звонка" },
    oneclick: { eyebrow: "Купить в один клик", title: "Оформим заказ за вас", sub: "Менеджер уточнит количество рулонов, наличие партии и доставку — вам останется только подтвердить.", btn: "Оформить" },
    showroom: { eyebrow: "Шоурум", title: "Посмотреть вживую", sub: "Подготовим образцы к вашему приходу: рисунок, фактуру и цвет лучше видно в руках.", btn: "Записаться",
      extra: { type: "select", name: "city", label: "Шоурум", options: CFG.showrooms.map(function (s) { return s.city + " — " + s.address; }) } },
    paint: { eyebrow: "Краска · 94 позиции", title: "Подберём краску", sub: "Пришлите фото, код цвета или образец обоев — подберём оттенок и рассчитаем расход.", btn: "Подобрать краску",
      extra: { type: "textarea", name: "comment", label: "Что красим, какой цвет нужен" } },
    moulding: { eyebrow: "Лепнина · 574 позиции", title: "Лепнина под ваш проект", sub: "Карнизы, молдинги, розетки, пилястры. Пришлите план или фото — подберём и посчитаем.", btn: "Получить подбор",
      extra: { type: "textarea", name: "comment", label: "Помещение, высота потолка, пожелания" } },
    calc: { eyebrow: "Расчёт", title: "Проверим расчёт", sub: "Менеджер проверит количество с учётом раппорта и партии и пришлёт итоговую сумму.", btn: "Отправить расчёт" },
    studio: { eyebrow: "Примерочная", title: "Отправить подборку менеджеру", sub: "Мы получим ваш интерьер с выбранными обоями, проверим наличие и рассчитаем рулоны.", btn: "Отправить подборку" },
    loymina: { eyebrow: "Loymina · Загадочный лес", title: "Цена и наличие коллекции", sub: "Пришлём актуальные цены по артикулам, проверим наличие на фабрике и рассчитаем рулоны под вашу стену.", btn: "Запросить",
      extra: { type: "textarea", name: "comment", label: "Какие артикулы интересуют (например, IMG11 006, IMG14 020)" } },
    partner: { eyebrow: "Партнёрам", title: "Станьте партнёром Decando", sub: "Персональные условия для дизайнеров, архитекторов и строительных бригад.", btn: "Отправить заявку",
      extra: { type: "textarea", name: "comment", label: "Компания или портфолио, город" } }
  };
  var leadTpl = null;
  function openLead(kind, o) {
    o = o || {};
    var cfg = LEADS[kind] || LEADS.callback, m = $('[data-modal="lead"]'); if (!m) return;
    var main = $(".lead__main", m);
    if (!leadTpl) leadTpl = main.innerHTML;
    if (!$("form", main)) main.innerHTML = leadTpl;   // после отправки на месте формы — «спасибо»; возвращаем форму
    var form = $("form", m);
    form.reset();
    $$(".is-error", form).forEach(function (x) { x.classList.remove("is-error"); });
    $$(".field__err", form).forEach(function (x) { x.remove(); });
    form.elements.kind.value = kind;
    form.elements.product.value = o.product ? o.product.id : "";
    form.setAttribute("data-title", cfg.title + (o.product ? ": " + o.product.title : ""));
    form._details = o.details || (o.product ? function () { return "Товар: " + o.product.title + " — " + rub(o.product.price) + unitLabel(o.product); } : null);
    $("[data-lead-eyebrow]", m).textContent = cfg.eyebrow;
    $("[data-lead-title]", m).textContent = o.product && kind === "oneclick" ? o.product.title : cfg.title;
    $("[data-lead-sub]", m).textContent = o.sub || cfg.sub;
    $("[data-lead-btn]", m).firstChild.textContent = cfg.btn;
    var ex = $("[data-lead-extra]", m);
    ex.innerHTML = ""; ex.hidden = !cfg.extra;
    if (cfg.extra) {
      var x = cfg.extra;
      ex.className = "field field--extra" + (x.type === "select" ? " field--select" : "");
      ex.innerHTML = x.type === "select"
        ? '<select class="field__select" id="leadExtra" name="' + x.name + '">' + x.options.map(function (op) { return "<option>" + esc(op) + "</option>"; }).join("") + '</select><label class="field__label" for="leadExtra">' + esc(x.label) + "</label>"
        : '<textarea class="field__area" id="leadExtra" name="' + x.name + '" placeholder=" "></textarea><label class="field__label" for="leadExtra">' + esc(x.label) + "</label>";
    }
    var art = $("[data-lead-art]", m), ap = o.product || D.set("popular")[Math.floor(Math.random() * Math.min(8, D.set("popular").length))];
    patBg(art, ap, 40);
    showModal("lead");
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-lead]");
    if (!b) return;
    e.preventDefault();
    var pid = b.getAttribute("data-product");
    openLead(b.getAttribute("data-lead"), { product: pid ? known(pid, b) || null : null });
    var fabEl = $("[data-fab]"); if (fabEl) fabEl.classList.remove("is-open");
  });

  /* ---------- квиз-подбор ---------- */
  var MOOD = {
    light: { t: "Светлая и воздушная", c: ["white", "beige", "grey"], dots: ["#f3f0ea", "#e2d7c6", "#cbc8c1"] },
    warm: { t: "Тёплая натуральная", c: ["beige", "terra", "yellow", "gold"], dots: ["#d8c8ad", "#c08b6e", "#c99a5e"] },
    green: { t: "Зелень и природа", c: ["green"], dots: ["#b7beaa", "#6f8a6f", "#27412f"] },
    dark: { t: "Глубокая и тёмная", c: ["dark", "blue"], dots: ["#22302a", "#1f2a3a", "#2e3133"] },
    pastel: { t: "Нежная пастель", c: ["pink", "white", "blue"], dots: ["#ecc3b8", "#bfccd2", "#eef0ec"] },
    any: { t: "Пока не знаю — нужен совет", c: [], dots: [] }
  };
  var BUDGET = { b1: [0, 2000, "до 2 000 ₽"], b2: [2000, 4000, "2 000 – 4 000 ₽"], b3: [4000, 8000, "4 000 – 8 000 ₽"], b4: [8000, 1e9, "от 8 000 ₽"], any: [0, 1e9, "Не принципиально"] };
  var QUIZ = [
    { key: "room", q: "Какую комнату оформляем?", hint: "Подберём рисунок, плотность и моющиеся покрытия под помещение.", kind: "img",
      opts: [["living", "Гостиная", "img:room-living"], ["bedroom", "Спальня", "img:room-bedroom"], ["kitchen", "Кухня", "img:room-kitchen"],
             ["kids", "Детская", "img:room-kids"], ["hall", "Прихожая", "pat:herringbone-stone"], ["office", "Кабинет", "pat:gatsby-emerald"]] },
    { key: "style", q: "Какой стиль вам ближе?", hint: "Можно выбрать до двух вариантов.", kind: "pat", multi: 2, cols: 4,
      opts: [["classic", "Классика", "versal-cream"], ["botanic", "Ботаника", "shalfey-light"], ["plain", "Однотонные", "linen-natural"], ["geometry", "Геометрия", "gatsby-ivory"],
             ["oriental", "Восток", "chinoiserie-celadon"], ["modern", "Мрамор и бетон", "carrara"], ["kids", "Детские", "rainbow-terra"], ["mural", "Фрески", "fresco-mist"]] },
    { key: "mood", q: "Какая гамма по душе?", hint: "Подберём оттенок под мебель и свет в комнате.", kind: "row",
      opts: Object.keys(MOOD).map(function (k) { return [k, MOOD[k].t, MOOD[k].dots]; }) },
    { key: "area", q: "Какая площадь стен?", hint: "Чтобы рассчитать рулоны. Точно посчитаем вместе с менеджером.", kind: "row",
      opts: [["s", "До 20 м² — небольшая комната"], ["m", "20–40 м²"], ["l", "40–60 м²"], ["xl", "Больше 60 м²"], ["?", "Не знаю — помогите рассчитать"]] },
    { key: "budget", q: "Какой бюджет за рулон?", hint: "Покажем лучшие варианты в вашем диапазоне.", kind: "row",
      opts: Object.keys(BUDGET).map(function (k) { return [k, BUDGET[k][2]]; }) },
    { key: "when", q: "Когда планируете поклейку?", hint: "Проверим наличие партии к нужной дате.", kind: "row",
      opts: [["now", "Ремонт уже идёт"], ["month", "В ближайший месяц"], ["later", "Через 1–3 месяца"], ["look", "Пока присматриваюсь"]] }
  ];
  var quiz = { step: 0, ans: {} };
  function roomImg(name) { return "/assets/img/rooms/" + name + "-sm.jpg"; }
  function quizScore(p) {
    var a = quiz.ans, s = p.pop / 100;
    if (a.room && p.rooms.indexOf(a.room) >= 0) s += 3;
    else if (a.room) s -= 2;
    if (a.style && a.style.length) s += a.style.indexOf(p.style) >= 0 ? 4 : -1;
    if (a.mood && MOOD[a.mood] && MOOD[a.mood].c.length) s += MOOD[a.mood].c.indexOf(p.color) >= 0 ? 2 : 0;
    if (a.budget && BUDGET[a.budget]) { var b = BUDGET[a.budget]; s += p.price >= b[0] && p.price <= b[1] ? 2 : -1.5; }
    if (a.room === "kids" && p.style === "kids") s += 2;
    if (a.room !== "kids" && p.style === "kids") s -= 4;
    return s;
  }
  function quizMatches() { return D.products.map(function (p) { return [quizScore(p), p]; }).sort(function (x, y) { return y[0] - x[0]; }).map(function (x) { return x[1]; }); }
  function quizArt() {
    var a = quiz.ans, id = a.style && a.style.length ? QUIZ[1].opts.filter(function (o) { return o[0] === a.style[0]; })[0][2] : "versal-sage";
    patBg($("[data-quiz-art]"), D.byId[id], 46);
  }
  function renderQuiz() {
    var root = $("[data-quiz-root]"); if (!root) return;
    var body = $("[data-quiz-body]", root), total = QUIZ.length + 1, st = quiz.step;
    $("[data-quiz-count]", root).textContent = st < QUIZ.length ? "Вопрос " + (st + 1) + " из " + QUIZ.length : st === QUIZ.length ? "Последний шаг" : "Готово";
    $("[data-quiz-bar]", root).style.width = Math.min(100, (st / total) * 100 + 6) + "%";
    $("[data-quiz-foot]", root).hidden = st > QUIZ.length;
    $("[data-quiz-back]", root).style.visibility = st === 0 ? "hidden" : "visible";
    quizArt();
    if (st < QUIZ.length) {
      var q = QUIZ[st], val = quiz.ans[q.key];
      var html = '<h2 class="quiz__q" id="quizTitle">' + q.q + '</h2><p class="quiz__hint">' + q.hint + "</p>";
      var cls = q.kind === "row" ? "quiz__opts quiz__opts--list" : "quiz__opts" + (q.cols === 4 ? " quiz__opts--4" : "");
      html += '<div class="' + cls + '" role="' + (q.multi ? "group" : "radiogroup") + '" aria-labelledby="quizTitle">';
      q.opts.forEach(function (o) {
        var on = q.multi ? (val || []).indexOf(o[0]) >= 0 : val === o[0];
        var tick = '<span class="qopt__tick"><svg class="ic"><use href="#i-check"/></svg></span>';
        if (q.kind === "row") {
          html += '<button type="button" class="qopt qopt--row' + (on ? " is-on" : "") + '" data-v="' + o[0] + '" aria-pressed="' + on + '">' +
            (o[2] && o[2].length ? '<span class="qopt__dots">' + o[2].map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") + "</span>" : "") +
            '<span class="qopt__t">' + o[1] + "</span>" + tick + "</button>";
        } else {
          var img = o[2], media = img.indexOf("img:") === 0 ? '<span class="qopt__img"><img src="' + roomImg(img.slice(4)) + '" alt="" loading="lazy"></span>'
            : '<span class="qopt__img" data-qpat="' + (img.indexOf("pat:") === 0 ? img.slice(4) : img) + '"></span>';
          html += '<button type="button" class="qopt' + (on ? " is-on" : "") + '" data-v="' + o[0] + '" aria-pressed="' + on + '">' + media + '<span class="qopt__t">' + o[1] + tick + "</span></button>";
        }
      });
      body.innerHTML = html + "</div>";
      $$("[data-qpat]", body).forEach(function (el) { patBg(el, D.byId[el.getAttribute("data-qpat")], 50); });
      var next = $("[data-quiz-next]", root);
      next.disabled = q.multi ? !(val && val.length) : !val;
      next.innerHTML = "Дальше<svg class=\"ic\"><use href=\"#i-arrow\"/></svg>";
    } else if (st === QUIZ.length) {
      var top = quizMatches(), n = Math.max(6, top.filter(function (p) { return quizScore(p) >= 7.5; }).length);
      body.innerHTML = '<h2 class="quiz__q" id="quizTitle">Нашли ' + n + " " + plural(n, "вариант", "варианта", "вариантов") + " под ваш запрос</h2>" +
        '<p class="quiz__hint">Куда прислать подборку с расчётом рулонов? Менеджер свяжется в течение ' + CFG.managerReply + ".</p>" +
        '<div class="quiz__teaser">' + top.slice(0, 4).map(function (p) { return '<span data-qpat="' + p.id + '"></span>'; }).join("") + "</div>" +
        '<form class="form" data-quiz-form novalidate>' +
        '<div class="checkout__grid"><div class="field"><input class="field__input" id="qName" name="name" placeholder=" " autocomplete="name" required><label class="field__label" for="qName">Ваше имя</label></div>' +
        '<div class="field"><input class="field__input" id="qPhone" name="phone" type="tel" inputmode="tel" placeholder=" " autocomplete="tel" required data-phone><label class="field__label" for="qPhone">Телефон</label></div></div>' +
        '<fieldset class="seg" aria-label="Куда прислать"><label><input type="radio" name="via" value="WhatsApp" checked><span>WhatsApp</span></label><label><input type="radio" name="via" value="Telegram"><span>Telegram</span></label><label><input type="radio" name="via" value="Звонок"><span>Звонок</span></label></fieldset>' +
        '<label class="hp" aria-hidden="true">Не заполняйте<input name="website" tabindex="-1" autocomplete="off"></label>' +
        '<label class="check"><input type="checkbox" name="consent" required><span>Соглашаюсь на <a href="/consent.html" target="_blank">обработку персональных данных</a> и с <a href="/privacy.html" target="_blank">политикой конфиденциальности</a></span></label>' +
        '<button type="button" class="u-link muted" data-quiz-skip style="align-self:flex-start;font-size:13.5px">Показать подборку без контактов</button>' +
        "</form>";
      $$("[data-qpat]", body).forEach(function (el) { patBg(el, D.byId[el.getAttribute("data-qpat")], 40); });
      var nx = $("[data-quiz-next]", root);
      nx.disabled = false; nx.innerHTML = "Получить подборку<svg class=\"ic\"><use href=\"#i-arrow\"/></svg>";
    } else {
      var res = quiz.result || { ok: true }, tp = quizMatches().slice(0, 6), a = quiz.ans;
      var qs = "/catalog.html?" + [a.room ? "room=" + a.room : "", a.style && a.style.length ? "style=" + a.style.join(",") : ""].filter(Boolean).join("&");
      body.innerHTML = '<div class="quiz__done-head"><span class="lead__done-ic"><svg class="ic"><use href="#i-check"/></svg></span><div><h2 class="quiz__q" id="quizTitle">' +
        (quiz.skipped ? "Ваша подборка" : "Подборка готова") + '</h2><p class="quiz__hint" style="margin:0">' +
        (quiz.skipped ? "Понравится что-то — примерьте на стенах или оставьте заявку, посчитаем рулоны." : "Менеджер пришлёт расширенную подборку и расчёт в течение " + CFG.managerReply + ". А пока — лучшие совпадения:") + "</p></div></div>" +
        (res.ok ? "" : '<div class="note note--warn" style="margin-top:16px">Сервер заявок недоступен. <a href="' + res.wa + '" target="_blank" rel="noopener"><b>Отправьте подборку в WhatsApp</b></a> — так мы получим её сразу.</div>') +
        '<div class="quiz__result" data-quiz-res></div>' +
        '<div class="hero__cta" style="margin-top:22px"><a class="btn btn--primary" href="/primerka.html?p=' + tp[0].id + '">Примерить на стенах<svg class="ic"><use href="#i-arrow"/></svg></a><a class="btn btn--ghost" href="' + qs + '">Смотреть всё в каталоге</a></div>';
      var box = $("[data-quiz-res]", body);
      tp.forEach(function (p) { box.appendChild(card(p, { cm: 50 })); });
    }
  }
  function openQuiz(preset) {
    if (preset) { quiz.ans = Object.assign({}, quiz.ans, preset); quiz.step = 1; }
    else if (quiz.step > QUIZ.length) { quiz = { step: 0, ans: {} }; }
    renderQuiz();
    showModal("quiz");
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-quiz]");
    if (t) { e.preventDefault(); var room = t.getAttribute("data-quiz-room"); openQuiz(room ? { room: room } : null); return; }
    var root = $("[data-quiz-root]");
    if (!root || !root.contains(e.target)) return;
    var opt = e.target.closest(".qopt[data-v]");
    if (opt) {
      var q = QUIZ[quiz.step], v = opt.getAttribute("data-v");
      if (q.multi) {
        var arr = (quiz.ans[q.key] || []).slice(), i = arr.indexOf(v);
        if (i >= 0) arr.splice(i, 1); else { arr.push(v); if (arr.length > q.multi) arr.shift(); }
        quiz.ans[q.key] = arr; renderQuiz();
      } else {
        quiz.ans[q.key] = v; renderQuiz();
        setTimeout(function () { if (QUIZ[quiz.step] === q) { quiz.step++; renderQuiz(); } }, 260);
      }
      return;
    }
    if (e.target.closest("[data-quiz-back]")) { quiz.step = Math.max(0, quiz.step - 1); renderQuiz(); return; }
    if (e.target.closest("[data-quiz-skip]")) { quiz.skipped = true; quiz.step = QUIZ.length + 1; renderQuiz(); return; }
    if (e.target.closest("[data-quiz-next]")) {
      if (quiz.step < QUIZ.length) { quiz.step++; renderQuiz(); return; }
      var form = $("[data-quiz-form]", root);
      if (!validate(form)) return;
      var a = quiz.ans, top = quizMatches().slice(0, 8);
      var data = {
        kind: "quiz", title: "Квиз-подбор обоев", name: form.elements.name.value.trim(), phone: form.elements.phone.value, via: form.elements.via.value, consent: true,
        details: [
          "Комната: " + (D.F.room[a.room] || "—"),
          "Стиль: " + ((a.style || []).map(function (s) { return D.F.style[s]; }).join(", ") || "—"),
          "Гамма: " + (MOOD[a.mood] ? MOOD[a.mood].t : "—"),
          "Площадь: " + ((QUIZ[3].opts.filter(function (o) { return o[0] === a.area; })[0] || [])[1] || "—"),
          "Бюджет: " + (BUDGET[a.budget] ? BUDGET[a.budget][2] : "—"),
          "Сроки: " + ((QUIZ[5].opts.filter(function (o) { return o[0] === a.when; })[0] || [])[1] || "—"),
          "Подобрали: " + top.map(function (p) { return p.title; }).join("; ")
        ].join("\n")
      };
      var btn = $("[data-quiz-next]", root); btn.classList.add("is-loading");
      sendLead(data).then(function (r) { btn.classList.remove("is-loading"); quiz.result = r; quiz.skipped = false; quiz.step = QUIZ.length + 1; renderQuiz(); });
    }
  });

  /* ---------- поиск: подсказки с сервера (/api/search.php), полный список — /oboi?q=… ---------- */
  function searchBox(input, out, hints) {
    var timer = 0, last = "", ctrl = null;
    function render(q, r) {
      if (hints) hints.hidden = !!q;
      if (!q) { out.innerHTML = ""; out.hidden = true; return; }
      out.hidden = false;
      out.innerHTML = r.items.length ? r.items.map(function (p) {
        var u = D.img(p);
        return '<a class="sres" href="/product/' + encodeURIComponent(p.id) + '"><span class="sres__sw">' + (u ? '<img src="' + esc(u) + '" alt="" loading="lazy">' : "") + '</span><span><span class="sres__t">' + esc(p.title) + '</span><br><span class="sres__s">Арт.: ' + esc(p.sku) + '</span></span><span class="sres__p">' + rub(p.price) + "</span></a>";
      }).join("") + '<a class="sres sres--all" href="/oboi?q=' + encodeURIComponent(q) + '"><span></span><span class="sres__t">Все результаты — ' + r.total + '</span><span class="sres__p">→</span></a>'
        : '<p class="search__empty">По запросу «' + esc(q) + '» ничего не нашли. Попробуйте бренд, коллекцию или артикул.</p>';
    }
    input.addEventListener("input", function () {
      var q = input.value.trim(); clearTimeout(timer);
      if (q.length < 2) { last = ""; render("", null); return; }
      timer = setTimeout(function () {
        if (q === last) return; last = q;
        if (ctrl && ctrl.abort) ctrl.abort();
        ctrl = window.AbortController ? new AbortController() : null;
        fetch("/api/search.php?q=" + encodeURIComponent(q), ctrl ? { signal: ctrl.signal } : {})
          .then(function (r) { return r.json(); })
          .then(function (r) { if (input.value.trim() === q) render(q, r); })
          .catch(function () { /* сервер недоступен — остаётся переход на /oboi?q= по Enter */ });
      }, 180);
    });
  }
  (function () {
    var input = $("[data-search-input]");
    if (input) {
      searchBox(input, $("[data-search-results]"), $("[data-search-hints]"));
      document.addEventListener("click", function (e) {
        if (e.target.closest("[data-search]")) { e.preventDefault(); showModal("search"); setTimeout(function () { input.focus(); }, 50); }
      });
    }
    $$("[data-hsearch]").forEach(function (form) {
      var inp = $("input", form), drop = $("[data-hsearch-drop]", form);
      searchBox(inp, drop, null);
      document.addEventListener("click", function (e) { if (!form.contains(e.target)) drop.hidden = true; });
      inp.addEventListener("focus", function () { if (drop.innerHTML) drop.hidden = false; });
      form.addEventListener("keydown", function (e) { if (e.key === "Escape") { drop.hidden = true; inp.blur(); } });
    });
  })();

  /* ---------- шапка, меню, плавающая кнопка ---------- */
  (function () {
    var h = $("[data-header]");
    if (h) {
      var onScroll = function () { h.classList.toggle("is-scrolled", window.scrollY > 8); };
      window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    }
    var burger = $("[data-menu]"), mnav = $("[data-mnav]");
    if (burger && mnav) burger.addEventListener("click", function () {
      var open = mnav.hidden; mnav.hidden = !open; burger.setAttribute("aria-expanded", open);
      document.body.classList.toggle("is-locked", open);
    });
    if (mnav) mnav.addEventListener("click", function (e) { if (e.target.closest("a, button")) { mnav.hidden = true; burger.setAttribute("aria-expanded", "false"); document.body.classList.remove("is-locked"); } });
    /* кнопка «Каталог» — мега-меню */
    var catBtn = $("[data-catbtn]"), mega = $("[data-mega]");
    if (catBtn && mega) {
      var setMega = function (open) { mega.hidden = !open; catBtn.setAttribute("aria-expanded", open); catBtn.classList.toggle("is-open", open); document.body.classList.toggle("has-mega", open); };
      catBtn.addEventListener("click", function () { setMega(mega.hidden); });
      document.addEventListener("click", function (e) { if (!mega.hidden && !mega.contains(e.target) && !catBtn.contains(e.target)) setMega(false); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !mega.hidden) { setMega(false); catBtn.focus(); } });
      mega.addEventListener("click", function (e) { if (e.target.closest("a, [data-lead]")) setMega(false); });
    }
    var fab = $("[data-fab]");
    if (fab) $("[data-fab-toggle]", fab).addEventListener("click", function () { var o = !fab.classList.contains("is-open"); fab.classList.toggle("is-open", o); this.setAttribute("aria-expanded", o); });
    var page = document.body.getAttribute("data-page");
    $$(".nav__link[href], .tabbar__a[data-tab]").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("?")[0];
      if (href === page + ".html") { a.setAttribute("aria-current", "page"); a.classList.add("is-on"); }
    });
  })();

  /* ---------- cookie ---------- */
  (function () {
    var box = $("[data-cookie]"); if (!box) return;
    if (!store.get("cookie", null)) setTimeout(function () { box.hidden = false; }, 1400);
    box.addEventListener("click", function (e) {
      var ok = e.target.closest("[data-cookie-ok]"), only = e.target.closest("[data-cookie-only]");
      if (!ok && !only) return;
      store.set("cookie", { v: ok ? "all" : "necessary", ts: Date.now() });
      box.hidden = true;
    });
  })();

  /* ---------- аккордеоны ---------- */
  document.addEventListener("click", function (e) {
    var q = e.target.closest(".acc__q"); if (!q) return;
    var i = q.closest(".acc__i"), open = !i.classList.contains("is-open");
    i.classList.toggle("is-open", open); q.setAttribute("aria-expanded", open);
  });

  /* ---------- появление при прокрутке ---------- */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }) : null;
  function reveal(root) { $$(".reveal:not(.is-in)", root).forEach(function (el) { if (io) io.observe(el); else el.classList.add("is-in"); }); }

  /* ---------- горизонтальные ленты ---------- */
  function rail(root) {
    var tr = $(".rail__track", root), prev = $("[data-rail-prev]", root), next = $("[data-rail-next]", root);
    if (!tr) return;
    function upd() { if (!prev) return; prev.disabled = tr.scrollLeft < 8; next.disabled = tr.scrollLeft + tr.clientWidth > tr.scrollWidth - 8; }
    if (prev) prev.addEventListener("click", function () { tr.scrollBy({ left: -tr.clientWidth * 0.8, behavior: "smooth" }); });
    if (next) next.addEventListener("click", function () { tr.scrollBy({ left: tr.clientWidth * 0.8, behavior: "smooth" }); });
    tr.addEventListener("scroll", upd, { passive: true }); setTimeout(upd, 50);
    return upd;
  }

  /* ---------- расчёт рулонов (общая формула) ---------- */
  function rolls(o) {
    // o: perimeter (м), height (м), rollW, rollL (м), rapport (см), doors, windows, reserve
    var R = (o.rapport || 0) / 100, cut = o.height + 0.1;
    if (R > 0) cut = Math.ceil(cut / R - 1e-9) * R + (o.match === "offset" ? R / 2 : 0);
    var perStrip = Math.max(1, Math.floor(o.rollL / cut + 1e-9));
    var openings = (o.doors || 0) * 0.9 + (o.windows || 0) * 1.2;
    var strips = Math.max(1, Math.ceil(Math.max(0, o.perimeter - openings * 0.6) / o.rollW - 1e-9));
    var n = Math.ceil(strips / perStrip) + (o.reserve ? 1 : 0);
    return { strips: strips, cut: cut, perRoll: perStrip, rolls: n, area: o.perimeter * o.height };
  }

  /* ---------- фото не загрузилось — аккуратная заглушка «бренд · артикул» вместо битой картинки ---------- */
  var IMG_SEL = ".pcard__img, .pgal__main img, .sres__sw img, .tone-img img, .pgal__thumb img";
  function imgFail(img) { var box = img.parentNode; if (box) box.classList.add("is-noimg"); img.style.display = "none"; }
  document.addEventListener("error", function (e) { var t = e.target; if (t && t.tagName === "IMG" && t.matches(IMG_SEL)) imgFail(t); }, true);
  $$(IMG_SEL).forEach(function (img) { if (img.complete && !img.naturalWidth && img.getAttribute("src")) imgFail(img); });

  /* ---------- старт ---------- */
  updateCounts();
  paintPatterns();
  reveal();
  hydrateCards(document);
  window.addEventListener("storage", function (e) { if (e.key === "dc_cart" || e.key === "dc_fav") emit(); });

  window.DC = {
    $: $, $$: $$, esc: esc, plural: plural, rub: rub, store: store, cart: cart, fav: fav, onChange: function (fn) { listeners.push(fn); },
    card: card, patBg: patBg, hydrateCards: hydrateCards, paintPatterns: paintPatterns, toast: toast, openLead: openLead, openQuiz: openQuiz, showModal: showModal, hideModal: hideModal,
    sendLead: sendLead, validate: validate, reveal: reveal, rail: rail, rolls: rolls, unitLabel: unitLabel, badgeHtml: badgeHtml, roomImg: roomImg
  };
})();
