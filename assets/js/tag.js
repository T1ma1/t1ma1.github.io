/* DECANDO — страницы SEO-фильтра (/oboi/…, /brand/…, /catalog): образцы в серверных карточках, «ещё» в фильтре, сортировка, мобильные фильтры */
(function () {
  "use strict";
  var DC = window.DC; if (!DC) return;
  var $ = DC.$, $$ = DC.$$;

  DC.hydrateCards(document);

  /* «Ещё N» — раскрыть скрытые значения группы */
  $$("[data-fmore]").forEach(function (b) {
    b.addEventListener("click", function () {
      var g = b.closest(".fgroup");
      $$(".is-hid", g).forEach(function (a) { a.classList.remove("is-hid"); });
      b.remove();
    });
  });

  /* сортировка — тот же адрес с параметром sort, с первой страницы */
  var sort = $("[data-sort]");
  if (sort) sort.addEventListener("change", function () {
    var u = new URL(location.href);
    if (this.value === "pop") u.searchParams.delete("sort"); else u.searchParams.set("sort", this.value);
    u.searchParams.delete("page");
    location.href = u.pathname + u.search;
  });

  /* мобильные фильтры (как в каталоге) */
  var fl = $("[data-filters]"), back = null;
  function openF(on) {
    if (!fl) return;
    fl.classList.toggle("is-open", on);
    document.body.classList.toggle("is-locked", on);
    if (on) { back = document.createElement("div"); back.className = "filters-backdrop"; back.addEventListener("click", function () { openF(false); }); document.body.appendChild(back); }
    else if (back) { back.remove(); back = null; }
  }
  var ob = $("[data-filters-open]"); if (ob) ob.addEventListener("click", function () { openF(true); });
  $$("[data-filters-close]").forEach(function (b) { b.addEventListener("click", function () { openF(false); }); });
})();
