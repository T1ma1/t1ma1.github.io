/* DECANDO — карточка товара (/product/<slug>, разметка от PHP): фото с увеличением, расчёт рулонов, покупка, вкладки, похожие */
(function () {
  "use strict";
  var DC = window.DC, D = window.DC_DATA, $ = DC.$, $$ = DC.$$;
  var root = $("[data-product]"); if (!root) return;
  var p;
  try { p = JSON.parse(root.getAttribute("data-p")); } catch (e) { return; }
  p = D.remember(p);
  var isMural = p.type === "mural" || p.unit === "м²";

  /* ---------- галерея: миниатюры и лупа ---------- */
  var main = $("[data-gmain]"), mainImg = main && $("img", main);
  /* обычное фото 600 px показывается сразу; затем, если есть крупная версия и браузер её открыл, меняем на неё */
  function bigOf(src) { var m = /^(.*)\/assets\/img\/p\/([^\/]+)\.jpg$/.exec(src || ""); return m ? m[1] + "/assets/img/pl/" + m[2] + ".avif" : ""; }
  function sharpen(img) {
    var src = img.getAttribute("src"), b = bigOf(src); if (!b) return;
    img.setAttribute("data-base", src);
    var im = new Image();
    im.onload = function () { if (img.getAttribute("data-base") === src && im.naturalWidth) img.src = b; };
    im.src = b;
  }
  if (mainImg) { if (mainImg.complete) sharpen(mainImg); else mainImg.addEventListener("load", function f() { mainImg.removeEventListener("load", f); sharpen(mainImg); }); }
  $$("[data-gthumb]").forEach(function (b) {
    b.addEventListener("click", function () {
      $$("[data-gthumb]").forEach(function (x) { x.classList.toggle("is-on", x === b); x.setAttribute("aria-selected", x === b); });
      mainImg.classList.add("is-swap");
      var src = b.getAttribute("data-gthumb"), im = new Image();
      im.onload = im.onerror = function () { mainImg.removeAttribute("data-base"); mainImg.src = src; mainImg.classList.remove("is-swap"); sharpen(mainImg); };
      im.src = src;
    });
  });
  if (main && mainImg && window.matchMedia("(hover: hover)").matches) {
    main.addEventListener("mousemove", function (e) {
      var r = main.getBoundingClientRect();
      mainImg.style.transformOrigin = ((e.clientX - r.left) / r.width * 100).toFixed(1) + "% " + ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%";
    });
    main.addEventListener("mouseenter", function () { main.classList.add("is-zoom"); });
    main.addEventListener("mouseleave", function () { main.classList.remove("is-zoom"); });
  }

  /* ---------- просмотр фото: нажатие открывает снимок на весь экран (стрелки и свайп — если фото несколько) ---------- */
  if (main && mainImg) {
    var baseSrc = function () { return mainImg.getAttribute("data-base") || mainImg.getAttribute("src"); };
    var lbSrcs = function () { var a = Array.prototype.map.call($$("[data-gthumb]"), function (b) { return b.getAttribute("data-gthumb"); }); return a.length ? a : [baseSrc()]; };
    var lb = null, lbI = 0, lbList = [];
    var lbShow = function (i) { lbI = (i + lbList.length) % lbList.length; var li = $("img", lb); li.removeAttribute("data-base"); li.src = lbList[lbI]; sharpen(li); var c = $("[data-lb-count]", lb); if (c) c.textContent = lbList.length > 1 ? (lbI + 1) + " / " + lbList.length : ""; };
    var lbClose = function () { if (!lb) return; lb.remove(); lb = null; document.body.classList.remove("is-locked"); document.removeEventListener("keydown", lbKey); };
    var lbKey = function (e) { if (e.key === "Escape") lbClose(); else if (e.key === "ArrowLeft") lbShow(lbI - 1); else if (e.key === "ArrowRight") lbShow(lbI + 1); };
    main.addEventListener("click", function () {
      if (!mainImg.getAttribute("src") || main.classList.contains("is-noimg")) return;
      lbList = lbSrcs(); lbI = Math.max(0, lbList.indexOf(baseSrc()));
      lb = document.createElement("div"); lb.className = "lbox"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-label", "Просмотр фото");
      lb.innerHTML = '<button type="button" class="lbox__x" aria-label="Закрыть"><svg class="ic"><use href="#i-close"/></svg></button>' +
        (lbList.length > 1 ? '<button type="button" class="lbox__nav lbox__nav--prev" aria-label="Предыдущее фото"><svg class="ic"><use href="#i-arrow-l"/></svg></button><button type="button" class="lbox__nav lbox__nav--next" aria-label="Следующее фото"><svg class="ic"><use href="#i-arrow"/></svg></button>' : "") +
        '<img alt=""><span class="lbox__count" data-lb-count></span>';
      document.body.appendChild(lb); document.body.classList.add("is-locked");
      lbShow(lbI);
      lb.addEventListener("click", function (e) {
        if (e.target.closest(".lbox__nav--prev")) return lbShow(lbI - 1);
        if (e.target.closest(".lbox__nav--next")) return lbShow(lbI + 1);
        if (e.target.tagName !== "IMG" || lbList.length < 2) lbClose();
      });
      var x0 = null;
      lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      lb.addEventListener("touchend", function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40 && lbList.length > 1) lbShow(lbI + (dx < 0 ? 1 : -1)); }, { passive: true });
      document.addEventListener("keydown", lbKey);
    });
  }

  /* ---------- покупка ---------- */
  var info = $("[data-info]");
  var fb = $("[data-fav]", info);
  if (fb && DC.fav.has(p.id)) { fb.classList.add("is-on"); fb.setAttribute("aria-pressed", "true"); $("use", fb).setAttribute("href", "#i-heart-fill"); }
  var qtyEl = $("[data-qty]", info);
  if (!qtyEl || !p.price) return;   // «Цена по запросу»: покупки и расчёта на странице нет
  function setQty(n) { qtyEl.value = Math.max(1, Math.min(999, n | 0)); $("[data-buy-sum]", info).textContent = DC.rub(p.price * qtyEl.value); }
  $$("[data-q]", info).forEach(function (b) { b.addEventListener("click", function () { setQty(+qtyEl.value + +b.getAttribute("data-q")); }); });
  qtyEl.addEventListener("input", function () { setQty(+qtyEl.value); });
  $("[data-buy]", info).addEventListener("click", function () {
    DC.cart.add(p.id, +qtyEl.value);
    DC.toast({ title: "В корзине: " + p.title, text: qtyEl.value + " " + DC.qtyLabel(p, +qtyEl.value) + " · " + DC.rub(p.price * qtyEl.value), product: p, link: { href: "/cart", text: "Оформить" } });
  });

  /* ---------- сколько рулонов ---------- */
  var calcN = 1, miniBox = $("[data-mini]", info);
  function mini() {
    var v = function (k) { var el = $('[data-m="' + k + '"]', info); return el ? +el.value || 0 : 0; };
    var out = $("[data-m-out]", info);
    if (isMural || !p.roll) { calcN = Math.max(1, Math.ceil(v("w") * v("h"))); out.innerHTML = "Площадь: <b>" + calcN + " м²</b> · " + DC.rub(calcN * p.price); return; }
    var r = DC.rolls({ perimeter: 2 * (v("l") + v("w")), height: v("h") || 2.7, rollW: p.roll[0], rollL: p.roll[1], rapport: p.rapport || 0, match: "straight", doors: 1, windows: 1 });
    calcN = r.rolls;
    out.innerHTML = "Нужно: <b>" + r.rolls + " " + DC.plural(r.rolls, "рулон", "рулона", "рулонов") + "</b> · " + DC.rub(r.rolls * p.price);
  }
  if (miniBox) {
    miniBox.addEventListener("input", mini); mini();
    $("[data-m-use]", info).addEventListener("click", function () { setQty(calcN); $("[data-buy]", info).click(); });
  }
  setQty(1);
  if (isMural) qtyEl.setAttribute("aria-label", "Площадь, м²");

  /* ---------- вкладки ---------- */
  var panels = $$("[data-tabpanel]");
  function tab(k) {
    $$("[data-tab]").forEach(function (b) { var on = b.getAttribute("data-tab") === k; b.classList.toggle("is-on", on); b.setAttribute("aria-selected", on); });
    panels.forEach(function (x) { x.hidden = x.getAttribute("data-tabpanel") !== k; });
  }
  $$("[data-tab]").forEach(function (b) { b.addEventListener("click", function () { tab(b.getAttribute("data-tab")); }); });

  /* ---------- похожие ---------- */
  var rel = $("[data-related]");
  if (rel) { DC.hydrateCards(rel); DC.rail($("[data-rail]").parentNode); }

  /* недавно смотрели */
  var seen = DC.store.get("seen", []).filter(function (x) { return x !== p.id; }); seen.unshift(p.id); DC.store.set("seen", seen.slice(0, 12));
})();
