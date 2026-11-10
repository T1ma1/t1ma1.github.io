/* DECANDO — корзина с оформлением заказа и избранное */
(function () {
  "use strict";
  var DC = window.DC, D = window.DC_DATA, CFG = window.DC_CONFIG, $ = DC.$, $$ = DC.$$, esc = DC.esc;

  /* ---------- корзина ---------- */
  var root = $("[data-cart-root]");
  if (root) {
    var formState = null;   // сохраняем введённое при перерисовке
    var render = function () {
      var items = DC.cart.items();
      if (!items.length) {
        if ($("[data-form='checkout']", root) === null && root.querySelector(".lead__done")) return;   // заказ отправлен — оставляем «спасибо»
        root.innerHTML = '<div class="empty"><span class="empty__art" data-pattern="peonies-blush" data-pattern-cm="40"></span><h2 class="h2">В корзине <em>пока пусто</em></h2>' +
          '<p class="muted">Начните с примерочной — или пройдите подбор, и мы предложим варианты под вашу комнату.</p>' +
          '<div class="hero__cta" style="justify-content:center"><a class="btn btn--primary" href="/oboi">Перейти в каталог<svg class="ic"><use href="#i-arrow"/></svg></a><button type="button" class="btn btn--ghost" data-lead="podbor">Помочь с выбором</button></div></div>';
        DC.paintPatterns(root);
        return;
      }
      if (root.querySelector("[data-form='checkout']")) {
        var f = $("[data-form='checkout']", root), fd = new FormData(f);
        formState = {}; fd.forEach(function (v, k) { formState[k] = v; });
      }
      var total = DC.cart.total(), n = DC.cart.count(), rolls = items.filter(function (i) { return D.byId[i.id].unit !== "м²"; }).reduce(function (s, i) { return s + i.qty; }, 0);
      root.innerHTML =
        '<div class="cart"><div><div class="cart__list">' + items.map(function (it) {
          var p = D.byId[it.id], u = p.unit === "м²";
          return '<div class="citem"><a class="citem__sw" href="/product/' + p.id + '" data-sw="' + p.id + '" aria-label="' + esc(p.title) + '"></a><div>' +
            '<p class="pcard__brand">' + esc(D.F.type[p.type]) + '</p><a class="citem__t" href="/product/' + p.id + '">' + esc(p.title) + "</a>" +
            '<p class="citem__s">' + esc(D.sizeLabel(p)) + " · " + DC.rub(p.price) + " " + DC.unitLabel(p) + "</p>" +
            '<div class="citem__ctrl"><div class="stepper"><button type="button" data-dq="-1" data-id="' + p.id + '" aria-label="Меньше"><svg class="ic"><use href="#i-minus"/></svg></button>' +
            '<input type="number" min="1" max="999" value="' + it.qty + '" data-qid="' + p.id + '" aria-label="Количество"><button type="button" data-dq="1" data-id="' + p.id + '" aria-label="Больше"><svg class="ic"><use href="#i-plus"/></svg></button></div>' +
            '<span class="muted" style="font-size:13px">' + (u ? "м²" : DC.plural(it.qty, "рулон", "рулона", "рулонов")) + "</span>" +
            '<a class="citem__rm" href="/product/' + encodeURIComponent(p.id) + '">Открыть</a><button type="button" class="citem__rm" data-rm="' + p.id + '">Удалить</button></div></div>' +
            '<p class="citem__sum">' + DC.rub(p.price * it.qty) + (p.old ? "<small><s>" + DC.rub(p.old * it.qty) + "</s></small>" : "") + "</p></div>";
        }).join("") + "</div>" +
        '<div class="checkout"><p class="eyebrow">Оформление</p><h2 class="h2" style="margin:14px 0 10px">Контакты и <em>доставка</em></h2>' +
        '<p class="muted" style="margin-bottom:24px">Менеджер проверит наличие одной партии, назовёт стоимость доставки и пришлёт ссылку на оплату или счёт. Оплачивать сейчас ничего не нужно.</p>' +
        '<form class="form" data-form="checkout" data-title="Заказ с сайта" novalidate><input type="hidden" name="kind" value="order">' +
        '<div class="checkout__grid">' +
        '<div class="field"><input class="field__input" id="oName" name="name" placeholder=" " autocomplete="name" required><label class="field__label" for="oName">Имя и фамилия</label></div>' +
        '<div class="field"><input class="field__input" id="oPhone" name="phone" type="tel" inputmode="tel" placeholder=" " autocomplete="tel" required data-phone><label class="field__label" for="oPhone">Телефон</label></div>' +
        '<div class="field"><input class="field__input" id="oMail" name="email" type="email" placeholder=" " autocomplete="email"><label class="field__label" for="oMail">E-mail для чека (необязательно)</label></div>' +
        '<div class="field"><input class="field__input" id="oCity" name="city" placeholder=" " autocomplete="address-level2" required><label class="field__label" for="oCity">Город</label></div>' +
        '<div class="full"><p class="pinfo__label" style="margin:10px 0"><b>Получение</b></p><div class="choice">' +
        '<label><input type="radio" name="delivery" value="Самовывоз из шоурума" checked><span><b>Самовывоз</b><small>из шоурума в Москве, СПб, Брянске или Калуге</small></span></label>' +
        '<label><input type="radio" name="delivery" value="Курьер по городу"><span><b>Курьер</b><small>по городу шоурума до двери</small></span></label>' +
        '<label><input type="radio" name="delivery" value="Транспортная компания"><span><b>По России</b><small>транспортной компанией до пункта или двери</small></span></label></div></div>' +
        '<div class="field field--select full" data-pickup><select class="field__select" id="oShop" name="showroom">' + CFG.showrooms.map(function (s) { return "<option>" + esc(s.city + " — " + s.address) + "</option>"; }).join("") + '</select><label class="field__label" for="oShop">Шоурум</label></div>' +
        '<div class="field full" data-addr hidden><input class="field__input" id="oAddr" name="address" placeholder=" " autocomplete="street-address"><label class="field__label" for="oAddr">Адрес доставки</label></div>' +
        '<div class="full"><p class="pinfo__label" style="margin:10px 0"><b>Оплата</b></p><div class="choice">' +
        '<label><input type="radio" name="payment" value="Онлайн по ссылке" checked><span><b>Онлайн</b><small>картой или СБП по ссылке после подтверждения</small></span></label>' +
        '<label><input type="radio" name="payment" value="По счёту"><span><b>По счёту</b><small>для компаний и дизайнеров</small></span></label>' +
        '<label><input type="radio" name="payment" value="При получении"><span><b>При получении</b><small>в шоуруме, наличными или картой</small></span></label></div></div>' +
        '<div class="field full"><textarea class="field__area" id="oMsg" name="comment" placeholder=" "></textarea><label class="field__label" for="oMsg">Комментарий: удобное время звонка, этаж, пожелания</label></div>' +
        "</div>" +
        '<label class="hp" aria-hidden="true">Не заполняйте<input name="website" tabindex="-1" autocomplete="off"></label>' +
        '<label class="check"><input type="checkbox" name="consent" required><span>Соглашаюсь на <a href="/consent.html" target="_blank">обработку персональных данных</a>, принимаю условия <a href="/offer.html" target="_blank">публичной оферты</a> и <a href="/privacy.html" target="_blank">политики конфиденциальности</a></span></label>' +
        '<button class="btn btn--primary btn--lg" type="submit" style="align-self:flex-start">Отправить заказ<svg class="ic"><use href="#i-arrow"/></svg></button>' +
        "</form></div></div>" +
        '<aside class="summary"><p class="eyebrow">Ваш заказ</p>' +
        '<div class="summary__row"><span>Товаров</span><span>' + items.length + " " + DC.plural(items.length, "позиция", "позиции", "позиций") + (rolls ? " · " + rolls + " " + DC.plural(rolls, "рулон", "рулона", "рулонов") : "") + "</span></div>" +
        '<div class="summary__row"><span>Доставка</span><span>рассчитает менеджер</span></div>' +
        '<div class="summary__total"><span>Итого</span><b>' + DC.rub(total) + "</b></div>" +
        '<p class="muted" style="font-size:13px">Совет: возьмите 1 рулон в запас — у разных партий может отличаться тон.</p>' +
        '<button type="button" class="btn btn--ghost btn--block" data-goto-form>К оформлению</button>' +
        '<button type="button" class="btn btn--ghost btn--block" data-lead="callback">Нужна консультация</button></aside></div>';
      $$("[data-sw]", root).forEach(function (el) { DC.patBg(el, D.byId[el.getAttribute("data-sw")], 30); });
      var f2 = $("[data-form='checkout']", root);
      f2._details = function () {
        return "Состав заказа:\n" + DC.cart.items().map(function (i) { var p = D.byId[i.id]; return "• " + p.title + " × " + i.qty + (p.unit === "м²" ? " м²" : " рул.") + " = " + DC.rub(p.price * i.qty); }).join("\n") +
          "\nИтого: " + DC.rub(DC.cart.total());
      };
      if (formState) Object.keys(formState).forEach(function (k) { var el = f2.elements[k]; if (!el) return; if (el.length && el[0] && el[0].type === "radio") { $$("[name='" + k + "']", f2).forEach(function (r) { r.checked = r.value === formState[k]; }); } else if (el.type !== "checkbox") el.value = formState[k]; });
      deliveryToggle();
    };
    var deliveryToggle = function () {
      var f = $("[data-form='checkout']", root); if (!f) return;
      var v = (f.querySelector("[name=delivery]:checked") || {}).value || "";
      $("[data-pickup]", f).hidden = v.indexOf("Самовывоз") !== 0;
      $("[data-addr]", f).hidden = v.indexOf("Самовывоз") === 0;
    };
    root.addEventListener("change", function (e) {
      if (e.target.name === "delivery") deliveryToggle();
      if (e.target.matches("[data-qid]")) DC.cart.setQty(e.target.getAttribute("data-qid"), +e.target.value || 1);
    });
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-dq]");
      if (b) { var id = b.getAttribute("data-id"), it = DC.cart.items().filter(function (i) { return i.id === id; })[0]; if (it) DC.cart.setQty(id, it.qty + +b.getAttribute("data-dq")); return; }
      var r = e.target.closest("[data-rm]");
      if (r) { var p = D.byId[r.getAttribute("data-rm")]; DC.cart.remove(p.id); DC.toast({ title: "Удалили из корзины", text: p.title, icon: "i-close" }); return; }
      if (e.target.closest("[data-goto-form]")) { var f = $("[data-form='checkout']", root); f.scrollIntoView({ behavior: "smooth", block: "start" }); setTimeout(function () { f.elements.name.focus(); }, 500); }
    });
    DC.onChange(render);
    render();
  }

  /* ---------- избранное ---------- */
  var grid = $("[data-fav-grid]");
  if (grid) {
    var renderFav = function () {
      var ids = DC.fav.ids();
      $("[data-fav-actions]").hidden = !ids.length;
      if (!ids.length) {
        grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><span class="empty__art" data-pattern="ginkgo-gold" data-pattern-cm="40"></span><h2 class="h2">Здесь будут <em>любимые</em> обои</h2>' +
          '<p class="muted">Нажимайте на сердечко в каталоге — сравните варианты и примерьте их на стенах.</p><a class="btn btn--primary" href="/oboi">В каталог<svg class="ic"><use href="#i-arrow"/></svg></a></div>';
        DC.paintPatterns(grid);
        return;
      }
      grid.innerHTML = "";
      ids.forEach(function (id) { grid.appendChild(DC.card(D.byId[id])); });
      
    };
    DC.onChange(renderFav);
    renderFav();
    $("[data-fav-send]").addEventListener("click", function () {
      DC.openLead("studio", { sub: "Пришлём наличие, расчёт рулонов и похожие варианты по вашей подборке.", details: function () {
        return "Избранное:\n" + DC.fav.ids().map(function (id) { var p = D.byId[id]; return "• " + p.title + " — " + DC.rub(p.price) + DC.unitLabel(p); }).join("\n");
      } });
    });
    var seen = DC.store.get("seen", []).filter(function (id) { return D.byId[id]; });
    if (seen.length) {
      $("[data-seen-wrap]").hidden = false;
      seen.forEach(function (id) { $("[data-seen]").appendChild(DC.card(D.byId[id])); });
    }
  }
})();
