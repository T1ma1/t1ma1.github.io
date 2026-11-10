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
  $$("[data-gthumb]").forEach(function (b) {
    b.addEventListener("click", function () {
      $$("[data-gthumb]").forEach(function (x) { x.classList.toggle("is-on", x === b); x.setAttribute("aria-selected", x === b); });
      mainImg.classList.add("is-swap");
      var src = b.getAttribute("data-gthumb"), im = new Image();
      im.onload = im.onerror = function () { mainImg.src = src; mainImg.classList.remove("is-swap"); };
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
    DC.toast({ title: "В корзине: " + p.title, text: qtyEl.value + " " + (isMural ? "м²" : DC.plural(+qtyEl.value, "рулон", "рулона", "рулонов")) + " · " + DC.rub(p.price * qtyEl.value), product: p, link: { href: "/cart", text: "Оформить" } });
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
