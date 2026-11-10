/* ============================================================
   DECANDO — библиотека рисунков обоев.
   Каждый рисунок — бесшовная SVG-плитка в миллиметрах (viewBox = раппорт),
   поэтому один и тот же источник даёт и превью в каталоге, и текстуру
   для примерочной (/assets/js/studio.js) в реальном масштабе.
     DC_PATTERNS.svg(spec)        → строка SVG
     DC_PATTERNS.url(spec)        → blob-URL (кэш) для CSS background-image
     DC_PATTERNS.canvas(spec, px) → Promise<canvas> для WebGL-текстуры
   spec = { gen: "damask", c: [фон, цвет1, цвет2, …], seed, w, h } (w, h — мм)
   ============================================================ */
(function (root) {
  "use strict";

  /* ---------- утилиты ---------- */
  function rng(seed) {
    var s = (seed | 0) || 1;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function f(n) { return Math.round(n * 100) / 100; }
  function fq(n) { return +n.toPrecision(4); }   // частоты шума: f() округлил бы 0.0022 до нуля
  function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbToHex(c) { return "#" + c.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"); }).join(""); }
  function mix(a, b, k) { var x = hexToRgb(a), y = hexToRgb(b); return rgbToHex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * k; })); }
  function shade(c, k) { return k >= 0 ? mix(c, "#ffffff", k) : mix(c, "#000000", -k); }

  /* элемент с переносом через края плитки: рисуем копии со сдвигом ±W/±H,
     если элемент (радиус r) задевает край — так плитка остаётся бесшовной */
  function place(W, H, x, y, r, body) {
    var out = "";
    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
      var X = x + dx * W, Y = y + dy * H;
      if (X + r < 0 || X - r > W || Y + r < 0 || Y - r > H) continue;
      out += '<g transform="translate(' + f(X) + " " + f(Y) + ')">' + body + "</g>";
    }
    return out;
  }
  function wrapSvg(W, H, defs, body, bg) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" preserveAspectRatio="none">' +
      (defs ? "<defs>" + defs + "</defs>" : "") +
      (bg ? '<rect width="' + W + '" height="' + H + '" fill="' + bg + '"/>' : "") + body + "</svg>";
  }
  /* фактура бумаги/флизелина: бесшовный шум (stitchTiles) поверх фона */
  function grainDefs(id, freq, amt, W, H) {
    return '<filter id="' + id + '" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + freq + '" numOctaves="3" seed="3" stitchTiles="stitch" result="n"/>' +
      '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ' + (amt * 2.2) + " " + (-amt) + '"/></filter>';
  }
  function grain(id, W, H) { return '<rect width="' + W + '" height="' + H + '" filter="url(#' + id + ')" style="mix-blend-mode:multiply"/>'; }

  /* лист: заострённый, слегка изогнутый, вдоль оси X, длина L, ширина w */
  function leafPath(L, w, c) {
    c = c || 0;
    return "M0,0C" + f(L * 0.22) + "," + f(-w * (1 + c)) + " " + f(L * 0.7) + "," + f(-w * (0.9 - c)) + " " + f(L) + "," + f(-w * c * 0.6) +
      "C" + f(L * 0.72) + "," + f(w * (0.75 + c)) + " " + f(L * 0.25) + "," + f(w * (1 - c)) + " 0,0Z";
  }
  function polar(n, R, fn) {
    var d = "";
    for (var i = 0; i <= n; i++) {
      var t = (i / n) * Math.PI * 2, r = R * fn(t);
      d += (i ? "L" : "M") + f(Math.cos(t) * r) + "," + f(Math.sin(t) * r);
    }
    return d + "Z";
  }

  var G = {};

  /* ---------- 1. Дамаск: классический орнамент, полу-смещённый раппорт ----------
     Мотив собирается из листьев аканта, разложенных вдоль кривых Безье (завитки),
     правая половина зеркалится — так получается «рукотворная» симметрия */
  function bez(p0, p1, p2, p3, t) {
    var u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  }
  function scroll(pts, n, size, side, tilt, taper) {
    var out = '<path d="M' + pts[0] + "C" + pts[1] + " " + pts[2] + " " + pts[3] + '" fill="none" stroke="currentColor" stroke-width="' + f(size * 0.16) + '" stroke-linecap="round"/>';
    for (var i = 1; i <= n; i++) {
      var t = i / (n + 0.5), a = bez(pts[0], pts[1], pts[2], pts[3], t), b = bez(pts[0], pts[1], pts[2], pts[3], Math.min(1, t + 0.01));
      var ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
      var sz = size * (taper ? Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.6) * 0.8 + 0.25 : 1);
      out += '<path transform="translate(' + f(a[0]) + " " + f(a[1]) + ") rotate(" + f(ang + side * tilt) + ')" d="' + leafPath(sz, sz * 0.32, side * 0.22) + '"/>';
    }
    return out;
  }
  G.damask = function (s) {
    var W = s.w, H = s.h, c = s.c, bg = c[0], fg = c[1], fg2 = c[2] || shade(c[1], 0.25), k = W / 530;
    var outline = [[[2, -156], [34, -146], [72, -104], [82, -40]], [[82, -40], [92, 12], [88, 64], [58, 110]], [[58, 110], [40, 138], [18, 152], [3, 166]]];
    var half =
      // перистый контур оживы: листья по внешней стороне
      outline.map(function (sg, i) { return scroll(sg, [7, 9, 5][i], [20, 24, 18][i], -1, 58, false); }).join("") +
      // внутренняя рамка
      '<path d="M2,-128C26,-118 56,-88 64,-38C72,8 68,52 46,90C34,110 18,124 2,134" fill="none" stroke="currentColor" stroke-width="3"/>' +
      // пальметта
      '<path transform="translate(2 22) rotate(-84)" d="' + leafPath(70, 11, 0) + '"/>' +
      '<path transform="translate(3 24) rotate(-62)" d="' + leafPath(60, 11, -0.15) + '"/>' +
      '<path transform="translate(4 26) rotate(-38)" d="' + leafPath(50, 10, -0.25) + '"/>' +
      '<path transform="translate(5 28) rotate(-14)" d="' + leafPath(36, 8, -0.3) + '"/>' +
      '<path transform="translate(4 40) rotate(38)" d="' + leafPath(40, 9, 0.3) + '"/>' +
      '<path transform="translate(2 44) rotate(70)" d="' + leafPath(54, 9, 0.15) + '"/>' +
      // корона и острие
      '<path transform="translate(1 -150) rotate(-90)" d="' + leafPath(24, 6, 0) + '"/>' +
      '<path transform="translate(1 162) rotate(90)" d="' + leafPath(16, 5, 0) + '"/>' +
      // жемчуг внутри рамки
      '<circle cx="20" cy="-96" r="3"/><circle cx="30" cy="-84" r="2.4"/><circle cx="38" cy="-72" r="1.9"/>' +
      '<circle cx="36" cy="98" r="2.6"/><circle cx="26" cy="110" r="2"/>';
    var veins = '<path d="M2,-50C20,-40 34,-26 44,-6M2,86C14,74 26,66 38,64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    var motif = '<g fill="' + fg + '" color="' + fg + '">' + half + veins + '<g transform="scale(-1,1)">' + half + veins + "</g></g>" +
      '<circle r="9" cy="32" fill="' + bg + '"/><circle r="5" cy="32" fill="' + fg2 + '"/>' +
      '<g fill="' + fg2 + '">' + [0, 72, 144, 216, 288].map(function (a) { return '<path transform="translate(0 -60) rotate(' + (a - 90) + ')" d="' + leafPath(14, 5, 0) + '"/>'; }).join("") + '</g>' +
      '<circle r="3.4" cy="-60" fill="' + bg + '"/>';
    var rosette = '<g fill="' + fg2 + '">' +
      [0, 60, 120, 180, 240, 300].map(function (a) { return '<path transform="rotate(' + a + ')" d="' + leafPath(18, 6, 0.15) + '"/>'; }).join("") +
      '<circle r="4.6" fill="' + bg + '"/><circle r="2"/></g>';
    var sc = "scale(" + f(k * 1.22) + ")", body = "";
    [[0, 0], [W, 0], [0, H], [W, H], [W / 2, H / 2]].forEach(function (p) {
      body += '<g transform="translate(' + f(p[0]) + " " + f(p[1]) + ") " + sc + '">' + motif + "</g>";
    });
    [[W / 2, 0], [W / 2, H], [0, H / 2], [W, H / 2]].forEach(function (p) {
      body += '<g transform="translate(' + f(p[0]) + " " + f(p[1]) + ") scale(" + f(k * 1.15) + ')">' + rosette + "</g>";
    });
    return wrapSvg(W, H, grainDefs("g", 0.9, 0.05, W, H), body + grain("g", W, H), bg);
  };

  /* ---------- 2. Ботаника: веточки с листьями вразброс ---------- */
  G.botanica = function (s) {
    var W = s.w, H = s.h, c = s.c, R = rng(s.seed || 11), bg = c[0], cols = c.slice(1), body = "";
    var n = s.n || 7, cell = Math.sqrt((W * H) / n), cols_n = Math.round(W / cell), rows_n = Math.round(H / cell);
    for (var gy = 0; gy < rows_n; gy++) for (var gx = 0; gx < cols_n; gx++) {
      var x = (gx + 0.15 + R() * 0.7) * (W / cols_n), y = (gy + 0.15 + R() * 0.7) * (H / rows_n);
      var L = cell * (0.62 + R() * 0.3), ang = R() * 360, col = cols[Math.floor(R() * cols.length)];
      var bend = (R() - 0.5) * L * 0.5;
      var sprig = '<g transform="rotate(' + f(ang) + ')"><path d="M0,0Q' + f(L / 2) + "," + f(bend) + " " + f(L) + ',0" fill="none" stroke="' + col + '" stroke-width="' + f(cell * 0.012) + '" stroke-linecap="round"/>';
      var steps = 6 + Math.floor(R() * 3);
      for (var i = 1; i <= steps; i++) {
        var t = i / (steps + 0.6), px = L * t, py = bend * 2 * t * (1 - t) * 1.0;
        var side = i % 2 ? 1 : -1, ll = cell * (0.26 - t * 0.11), lw = ll * 0.27;
        sprig += '<path transform="translate(' + f(px) + " " + f(py) + ") rotate(" + f(side * (48 - t * 14)) + ')" d="' + leafPath(ll, lw, 0.12 * side) + '" fill="' + col + '"/>';
      }
      sprig += '<path transform="translate(' + f(L) + ' 0)" d="' + leafPath(cell * 0.12, cell * 0.032, 0) + '" fill="' + col + '"/></g>';
      body += place(W, H, x, y, L * 1.15, sprig);
    }
    return wrapSvg(W, H, grainDefs("g", 0.8, 0.05, W, H), body + grain("g", W, H), bg);
  };

  /* ---------- 3. Тропики: крупные пальмовые листья, плотная композиция ---------- */
  G.tropic = function (s) {
    var W = s.w, H = s.h, c = s.c, R = rng(s.seed || 5), bg = c[0], cols = c.slice(1), body = "";
    var n = s.n || 11;
    for (var i = 0; i < n; i++) {
      var x = R() * W, y = R() * H, L = W * (0.34 + R() * 0.2), ang = R() * 360, col = cols[i % cols.length];
      var curve = (R() - 0.5) * 0.5, frond = '<g transform="rotate(' + f(ang) + ')">';
      var lf = 17, tone = [col, shade(col, 0.08), shade(col, -0.08)];
      for (var j = 2; j < lf; j++) {
        var t = j / lf, px = L * t, py = curve * L * t * t;
        var len = L * 0.46 * Math.sin(Math.PI * Math.min(1, t * 1.12)) + L * 0.05, wid = len * 0.055;
        var tan = Math.atan2(2 * curve * L * t, L) * 180 / Math.PI;
        frond += '<path transform="translate(' + f(px) + " " + f(py) + ") rotate(" + f(tan - 52 + t * 22) + ')" d="' + leafPath(len, wid, 0.35) + '" fill="' + tone[j % 3] + '"/>';
        frond += '<path transform="translate(' + f(px) + " " + f(py) + ") rotate(" + f(tan + 52 - t * 22) + ')" d="' + leafPath(len, wid, -0.35) + '" fill="' + tone[(j + 1) % 3] + '"/>';
      }
      frond += '<path d="M0,0Q' + f(L / 2) + ",0 " + f(L) + "," + f(curve * L) + '" fill="none" stroke="' + shade(col, 0.18) + '" stroke-width="' + f(W * 0.005) + '"/></g>';
      body += place(W, H, x, y, L * 1.35, frond);
    }
    return wrapSvg(W, H, grainDefs("g", 0.7, 0.06, W, H), body + grain("g", W, H), bg);
  };

  /* ---------- 4. Ар-деко: веера-чешуя с золотыми линиями ---------- */
  G.deco = function (s) {
    var W = s.w, H = s.h, c = s.c, bg = c[0], line = c[1], fill2 = c[2] || bg, Rr = W / 2, body = "";
    var fan = function (fill) {
      var g = '<path d="M' + f(-Rr) + ",0A" + f(Rr) + " " + f(Rr) + " 0 0 1 " + f(Rr) + ',0Z" fill="' + fill + '"/>';
      for (var k = 1; k <= 4; k++) {
        var r = Rr * (1 - k * 0.19);
        g += '<path d="M' + f(-r) + ",0A" + f(r) + " " + f(r) + " 0 0 1 " + f(r) + ',0" fill="none" stroke="' + line + '" stroke-width="' + f(W * 0.006) + '"/>';
      }
      for (var a = 15; a < 180; a += 15) {
        var ra = a * Math.PI / 180;
        g += '<line x1="0" y1="0" x2="' + f(-Math.cos(ra) * Rr * 0.24) + '" y2="' + f(-Math.sin(ra) * Rr * 0.24) + '" stroke="' + line + '" stroke-width="' + f(W * 0.004) + '"/>';
      }
      g += '<path d="M' + f(-Rr) + ",0A" + f(Rr) + " " + f(Rr) + " 0 0 1 " + f(Rr) + ',0" fill="none" stroke="' + line + '" stroke-width="' + f(W * 0.012) + '"/>';
      return g;
    };
    var rowH = H / 2;
    for (var row = -2; row <= 4; row++) {
      var y = row * rowH, off = (row & 1) ? Rr : 0;
      for (var x = -W + off; x <= W * 2; x += W) {
        body += '<g transform="translate(' + f(x) + " " + f(y + Rr) + ')">' + fan((row & 1) ? fill2 : bg) + "</g>";
      }
    }
    return wrapSvg(W, H, grainDefs("g", 0.9, 0.05, W, H), body + grain("g", W, H), bg);
  };

  /* ---------- 5. Полоса: ритм широких и тонких полос ---------- */
  G.stripes = function (s) {
    var W = s.w, H = s.h, c = s.c, bands = s.bands || [[0.36, 0], [0.04, 1], [0.08, 0], [0.04, 1], [0.36, 2], [0.12, 1]];
    var body = "", x = 0, tot = bands.reduce(function (a, b) { return a + b[0]; }, 0);
    bands.forEach(function (b) {
      var w = (b[0] / tot) * W;
      body += '<rect x="' + f(x) + '" y="0" width="' + f(w + 0.3) + '" height="' + H + '" fill="' + c[b[1]] + '"/>';
      x += w;
    });
    // тонкая нить по вертикали — как у текстильных обоев
    var R = rng(s.seed || 3);
    for (var i = 0; i < 70; i++) {
      var xx = R() * W;
      body += '<rect x="' + f(xx) + '" y="0" width="' + f(0.4 + R() * 0.6) + '" height="' + H + '" fill="#000" opacity="' + f(0.02 + R() * 0.04) + '"/>';
    }
    return wrapSvg(W, H, grainDefs("g", 0.6, 0.06, W, H), body + grain("g", W, H), c[0]);
  };

  /* ---------- 6. Огье: решётка-«луковица» с двойной линией и узлами ---------- */
  G.ogee = function (s) {
    var W = s.w, H = s.h, c = s.c, bg = c[0], ln = c[1], acc = c[2] || ln;
    var d = "M0,0C0," + f(H * 0.28) + " " + f(W * 0.5) + "," + f(H * 0.22) + " " + f(W * 0.5) + "," + f(H * 0.5) + "C" + f(W * 0.5) + "," + f(H * 0.78) + " 0," + f(H * 0.72) + " 0," + H +
      "M" + W + ",0C" + W + "," + f(H * 0.28) + " " + f(W * 0.5) + "," + f(H * 0.22) + " " + f(W * 0.5) + "," + f(H * 0.5) + "C" + f(W * 0.5) + "," + f(H * 0.78) + " " + W + "," + f(H * 0.72) + " " + W + "," + H;
    var body = '<path d="' + d + '" fill="none" stroke="' + ln + '" stroke-width="' + f(W * 0.05) + '" stroke-opacity=".5"/>' +
      '<path d="' + d + '" fill="none" stroke="' + bg + '" stroke-width="' + f(W * 0.03) + '"/>' +
      '<path d="' + d + '" fill="none" stroke="' + ln + '" stroke-width="' + f(W * 0.008) + '"/>';
    var node = function (x, y) {
      var g = "";
      for (var a = 0; a < 360; a += 90) g += '<path transform="rotate(' + a + ')" d="' + leafPath(W * 0.07, W * 0.022, 0) + '" fill="' + acc + '"/>';
      return '<g transform="translate(' + f(x) + " " + f(y) + ')">' + g + '<circle r="' + f(W * 0.014) + '" fill="' + bg + '"/></g>';
    };
    body += node(0, 0) + node(W, 0) + node(0, H) + node(W, H) + node(W / 2, H / 2);
    // капля в центре ячейки
    var drop = function (x, y) {
      return '<g transform="translate(' + f(x) + " " + f(y) + ')" fill="' + acc + '" opacity=".75"><path d="M0,' + f(-H * 0.09) + 'C' + f(W * 0.06) + "," + f(-H * 0.02) + " " + f(W * 0.05) + "," + f(H * 0.05) + " 0," + f(H * 0.07) + "C" + f(-W * 0.05) + "," + f(H * 0.05) + " " + f(-W * 0.06) + "," + f(-H * 0.02) + " 0," + f(-H * 0.09) + 'Z"/></g>';
    };
    body += drop(W / 2, 0) + drop(W / 2, H) + drop(0, H / 2) + drop(W, H / 2);
    return wrapSvg(W, H, grainDefs("g", 0.8, 0.05, W, H), body + grain("g", W, H), bg);
  };

  /* ---------- 7. Шеврон / ёлочка ---------- */
  G.chevron = function (s) {
    var W = s.w, H = s.h, c = s.c, n = s.n || 4, body = "", h = H / n;
    for (var i = -1; i <= n; i++) {
      var y = i * h, col = c[1 + ((i % (c.length - 1)) + (c.length - 1)) % (c.length - 1)];
      body += '<path d="M0,' + f(y) + "L" + f(W / 2) + "," + f(y + h * 0.9) + "L" + W + "," + f(y) + "L" + W + "," + f(y + h * 0.5) + "L" + f(W / 2) + "," + f(y + h * 1.4) + "L0," + f(y + h * 0.5) + 'Z" fill="' + col + '"/>';
    }
    return wrapSvg(W, H, grainDefs("g", 0.8, 0.06, W, H), body + grain("g", W, H), c[0]);
  };

  /* ---------- 8. Лён / рогожка: однотонные фактурные ---------- */
  G.linen = function (s) {
    var W = s.w, H = s.h, c = s.c, R = rng(s.seed || 7), body = "", base = c[0], dk = c[1] || shade(base, -0.12), lt = c[2] || shade(base, 0.1);
    for (var i = 0; i < 220; i++) {
      var y = R() * H, w = 0.25 + R() * 0.9;
      body += '<rect x="0" y="' + f(y) + '" width="' + W + '" height="' + f(w) + '" fill="' + (R() > 0.5 ? dk : lt) + '" opacity="' + f(0.12 + R() * 0.3) + '"/>';
    }
    for (var j = 0; j < 180; j++) {
      var x = R() * W, ww = 0.2 + R() * 0.7;
      body += '<rect x="' + f(x) + '" y="0" width="' + f(ww) + '" height="' + H + '" fill="' + (R() > 0.5 ? dk : lt) + '" opacity="' + f(0.08 + R() * 0.22) + '"/>';
    }
    var defs = grainDefs("g", 0.5, 0.09, W, H) +
      '<filter id="sl" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.004" numOctaves="2" seed="9" stitchTiles="stitch"/>' +
      '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .26 -.1"/></filter>';
    return wrapSvg(W, H, defs, body + grain("g", W, H) + '<rect width="' + W + '" height="' + H + '" filter="url(#sl)" style="mix-blend-mode:multiply"/>', base);
  };

  /* ---------- 9. Штукатурка / бетон: облака тона ---------- */
  G.plaster = function (s) {
    var W = s.w, H = s.h, c = s.c, base = hexToRgb(c[0]).map(function (v) { return v / 255; }), amp = s.amp || 0.16;
    var defs = '<filter id="pl" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + fq(2.2 / W) + '" numOctaves="6" seed="' + (s.seed || 4) + '" stitchTiles="stitch"/>' +
      '<feColorMatrix type="matrix" values="' +
      [0, 1, 2].map(function (i) { var a = amp * 2.4; return a + " 0 0 0 " + f(base[i] - a / 2); }).join("  ") + "  0 0 0 0 1\"/></filter>" +
      grainDefs("g", 0.9, 0.08, W, H);
    return wrapSvg(W, H, defs, '<rect width="' + W + '" height="' + H + '" filter="url(#pl)"/>' + grain("g", W, H), c[0]);
  };

  /* ---------- 10. Пионы: крупные цветы с листьями ---------- */
  G.peony = function (s) {
    var W = s.w, H = s.h, c = s.c, R = rng(s.seed || 21), bg = c[0], petal = c[1], deep = c[2] || shade(c[1], -0.25), leaf = c[3] || "#6f7f5e", leaf2 = c[4] || shade(leaf, 0.2);
    var body = "", n = s.n || 4, pts = [];
    for (var i = 0; i < n * 6 && pts.length < n; i++) {
      var p = [R() * W, R() * H], ok = true;
      for (var j = 0; j < pts.length; j++) {
        var dx = Math.abs(p[0] - pts[j][0]), dy = Math.abs(p[1] - pts[j][1]);
        dx = Math.min(dx, W - dx); dy = Math.min(dy, H - dy);
        if (Math.hypot(dx, dy) < W * 0.42) { ok = false; break; }
      }
      if (ok) pts.push(p);
    }
    // листья — первым слоем
    pts.forEach(function (p) {
      var g = "", base = R() * 360;
      for (var k = 0; k < 6; k++) {
        var a = base + k * 60 + (R() - 0.5) * 40, L = W * (0.2 + R() * 0.1);
        g += '<path transform="rotate(' + f(a) + ')" d="' + leafPath(L, L * 0.3, (R() - 0.5) * 0.3) + '" fill="' + (k & 1 ? leaf : leaf2) + '"/>';
        g += '<path transform="rotate(' + f(a) + ')" d="M' + f(L * 0.1) + ",0L" + f(L * 0.85) + ',0" stroke="' + shade(leaf, -0.2) + '" stroke-width="' + f(W * 0.002) + '" opacity=".5"/>';
      }
      body += place(W, H, p[0], p[1], W * 0.34, g);
    });
    pts.forEach(function (p) {
      var Rf = W * (0.12 + R() * 0.04), g = "", layers = 6;
      for (var l = 0; l < layers; l++) {
        var rr = Rf * (1 - l * 0.17), nlob = 7 + l * 2, ph = R() * 6.28, col = mix(petal, deep, l / (layers - 1) * 0.85);
        g += '<path d="' + polar(140, rr, function (t) { return 0.78 + 0.22 * Math.pow(Math.abs(Math.sin(nlob * t / 2 + ph)), 0.5) + 0.035 * Math.sin(23 * t + ph); }) +
          '" fill="' + col + '" stroke="' + shade(petal, 0.35) + '" stroke-opacity=".55" stroke-width="' + f(W * 0.0016) + '" transform="rotate(' + f(R() * 360) + ')"/>';
      }
      for (var d = 0; d < 9; d++) {
        var a2 = R() * 6.28, r2 = R() * Rf * 0.12;
        g += '<circle cx="' + f(Math.cos(a2) * r2) + '" cy="' + f(Math.sin(a2) * r2) + '" r="' + f(W * 0.004) + '" fill="#d9b25a" opacity=".8"/>';
      }
      body += place(W, H, p[0], p[1], Rf * 1.1, g);
    });
    // бутоны
    for (var b = 0; b < n; b++) {
      var bx = R() * W, by = R() * H, br = W * 0.022;
      body += place(W, H, bx, by, br * 3, '<path transform="rotate(' + f(R() * 360) + ')" d="' + leafPath(br * 3, br * 0.5, 0.2) + '" fill="' + leaf + '"/><circle r="' + f(br) + '" fill="' + mix(petal, deep, 0.5) + '"/>');
    }
    return wrapSvg(W, H, grainDefs("g", 0.8, 0.05, W, H), body + grain("g", W, H), bg);
  };

  /* ---------- 11. Шинуазри: ветви с цветами ---------- */
  G.chinoiserie = function (s) {
    var W = s.w, H = s.h, c = s.c, R = rng(s.seed || 8), bg = c[0], br = c[1], fl = c[2], fl2 = c[3] || shade(fl, -0.2), lf = c[4] || mix(br, bg, 0.4);
    var body = "";
    function branch(x, y, ang, len, width, depth) {
      var segs = 5, out = "", cx = x, cy = y, a = ang;
      for (var i = 0; i < segs; i++) {
        var l = len / segs, na = a + (R() - 0.5) * 0.5;
        var nx = cx + Math.cos(na) * l, ny = cy + Math.sin(na) * l, w = width * (1 - i / segs * 0.6);
        out += place(W, H, (cx + nx) / 2, (cy + ny) / 2, l, '<path d="M' + f(cx - (cx + nx) / 2) + "," + f(cy - (cy + ny) / 2) + "L" + f(nx - (cx + nx) / 2) + "," + f(ny - (cy + ny) / 2) + '" stroke="' + br + '" stroke-width="' + f(w) + '" stroke-linecap="round"/>');
        if (depth > 0 && R() < 0.55) out += branch(nx, ny, na + (R() > 0.5 ? 1 : -1) * (0.5 + R() * 0.5), len * 0.45, w * 0.6, depth - 1);
        if (R() < 0.7) out += blossom(nx + (R() - 0.5) * 8, ny + (R() - 0.5) * 8, W * (0.016 + R() * 0.012));
        if (R() < 0.6) out += place(W, H, nx, ny, W * 0.05, '<path transform="rotate(' + f(na * 57.3 + (R() > 0.5 ? 50 : -50)) + ')" d="' + leafPath(W * 0.045, W * 0.012, 0.1) + '" fill="' + lf + '"/>');
        cx = nx; cy = ny; a = na;
      }
      return out;
    }
    function blossom(x, y, r) {
      var g = "", col = R() > 0.4 ? fl : fl2;
      for (var k = 0; k < 5; k++) g += '<ellipse transform="rotate(' + (k * 72) + ') translate(' + f(r * 0.62) + ' 0)" rx="' + f(r * 0.58) + '" ry="' + f(r * 0.44) + '" fill="' + col + '"/>';
      g += '<circle r="' + f(r * 0.28) + '" fill="#c9a24e"/>';
      return place(W, H, x, y, r * 1.4, g);
    }
    var trunks = s.n || 3;
    for (var t = 0; t < trunks; t++) {
      body += branch(W * (t + 0.3 + R() * 0.4) / trunks, H * (0.2 + R() * 0.7), -Math.PI / 2 + (R() - 0.5) * 1.6, H * 0.55, W * 0.012, 2);
    }
    return wrapSvg(W, H, grainDefs("g", 0.8, 0.05, W, H), body + grain("g", W, H), bg);
  };

  /* ---------- 12. Арки-радуги: бохо и детские ---------- */
  G.arches = function (s) {
    var W = s.w, H = s.h, c = s.c, bg = c[0], cols = c.slice(1), body = "", r0 = W * 0.22, band = r0 / (cols.length + 0.5);
    var arch = function () {
      var g = "";
      cols.forEach(function (col, i) {
        var R1 = r0 - i * band, R2 = R1 - band * 0.82;
        g += '<path d="M' + f(-R1) + ",0A" + f(R1) + " " + f(R1) + " 0 0 1 " + f(R1) + ",0L" + f(R2) + ",0A" + f(R2) + " " + f(R2) + " 0 0 0 " + f(-R2) + ',0Z" fill="' + col + '"/>';
      });
      return g;
    };
    [[W * 0.25, H * 0.35], [W * 0.75, H * 0.85]].forEach(function (p) { body += place(W, H, p[0], p[1], r0, arch()); });
    var R = rng(s.seed || 2);
    for (var i = 0; i < 10; i++) body += place(W, H, R() * W, R() * H, 4, '<circle r="' + f(W * 0.008) + '" fill="' + cols[i % cols.length] + '" opacity=".7"/>');
    return wrapSvg(W, H, grainDefs("g", 0.8, 0.06, W, H), body + grain("g", W, H), bg);
  };

  /* ---------- 13. Звёзды и луны: детская ---------- */
  G.stars = function (s) {
    var W = s.w, H = s.h, c = s.c, bg = c[0], cols = c.slice(1), R = rng(s.seed || 31), body = "";
    var star = function (r, col) {
      return '<path d="' + polar(10, r, function (t) { return Math.round(t / (Math.PI / 5)) % 2 ? 0.45 : 1; }).replace(/L/g, " L") + '" fill="' + col + '" stroke="' + col + '" stroke-width="' + f(r * 0.35) + '" stroke-linejoin="round" transform="rotate(-90)"/>';
    };
    var cells = 5;
    for (var gy = 0; gy < cells; gy++) for (var gx = 0; gx < cells; gx++) {
      var x = (gx + 0.2 + R() * 0.6) * W / cells, y = (gy + 0.2 + R() * 0.6) * H / cells, col = cols[Math.floor(R() * cols.length)], kind = R();
      var r = W * (0.018 + R() * 0.02), g;
      if (kind < 0.55) g = star(r, col);
      else if (kind < 0.75) g = '<path d="M0,' + f(-r * 1.3) + "A" + f(r * 1.3) + " " + f(r * 1.3) + " 0 1 0 0," + f(r * 1.3) + "A" + f(r * 1.0) + " " + f(r * 1.0) + " 0 1 1 0," + f(-r * 1.3) + 'Z" fill="' + col + '" transform="rotate(' + f(R() * 60 - 30) + ')"/>';
      else g = '<circle r="' + f(r * 0.4) + '" fill="' + col + '"/>';
      body += place(W, H, x, y, r * 1.6, g);
    }
    return wrapSvg(W, H, grainDefs("g", 0.8, 0.05, W, H), body + grain("g", W, H), bg);
  };

  /* ---------- 14. Терраццо ---------- */
  G.terrazzo = function (s) {
    var W = s.w, H = s.h, c = s.c, bg = c[0], cols = c.slice(1), R = rng(s.seed || 13), body = "";
    var n = s.n || 120;
    for (var i = 0; i < n; i++) {
      var big = R() < 0.18, r = W * (big ? 0.025 + R() * 0.03 : 0.004 + R() * 0.01), m = 5 + Math.floor(R() * 4), pts = [];
      for (var k = 0; k < m; k++) { var a = (k / m) * 6.283 + R() * 0.6, rr = r * (0.6 + R() * 0.5); pts.push(f(Math.cos(a) * rr) + "," + f(Math.sin(a) * rr)); }
      body += place(W, H, R() * W, R() * H, r * 1.2, '<polygon points="' + pts.join(" ") + '" fill="' + cols[Math.floor(R() * cols.length)] + '"/>');
    }
    return wrapSvg(W, H, grainDefs("g", 0.9, 0.08, W, H), body + grain("g", W, H), bg);
  };

  /* ---------- 15. Кубы: оптическая геометрия ---------- */
  G.cubes = function (s) {
    var W = s.w, H = s.h, c = s.c, a = W / 2 / Math.cos(Math.PI / 6), body = "";
    // W = 2·a·cos30, H = 3a
    var cube = function (x, y) {
      var dx = a * Math.cos(Math.PI / 6), dy = a / 2;
      return '<g transform="translate(' + f(x) + " " + f(y) + ')">' +
        '<path d="M0,0L' + f(dx) + "," + f(-dy) + "L0," + f(-a) + "L" + f(-dx) + "," + f(-dy) + 'Z" fill="' + c[0] + '"/>' +
        '<path d="M0,0L' + f(-dx) + "," + f(-dy) + "L" + f(-dx) + "," + f(dy) + "L0," + f(a) + 'Z" fill="' + c[1] + '"/>' +
        '<path d="M0,0L' + f(dx) + "," + f(-dy) + "L" + f(dx) + "," + f(dy) + "L0," + f(a) + 'Z" fill="' + c[2] + '"/>' +
        (c[3] ? '<path d="M0,0L0,' + f(a) + "M0,0L" + f(dx) + "," + f(-dy) + "M0,0L" + f(-dx) + "," + f(-dy) + '" stroke="' + c[3] + '" stroke-width="' + f(W * 0.008) + '"/>' : "") + "</g>";
    };
    for (var row = -1; row <= 2; row++) for (var col = -1; col <= 2; col++) {
      body += cube(col * W + ((row & 1) ? W / 2 : 0), row * 1.5 * a + a);
    }
    return wrapSvg(W, H, grainDefs("g", 0.8, 0.05, W, H), body + grain("g", W, H), c[0]);
  };

  /* ---------- 16. Мрамор: прожилки ---------- */
  G.marble = function (s) {
    var W = s.w, H = s.h, c = s.c, vein = c[1], seed = s.seed || 6;
    /* прожилки — изолинии шума на уровне 0.5: непрерывные извилистые линии, как у камня */
    function band(n, w) {
      var t = []; for (var i = 0; i < n; i++) { var d = Math.abs(i - (n - 1) / 2) / w; t.push(f(Math.max(0, 1 - d * d))); }
      return t.join(" ");
    }
    function veinFilter(id, fx, fy, oct, sd, n, w) {
      return '<filter id="' + id + '" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
        '<feTurbulence type="fractalNoise" baseFrequency="' + fq(fx / W) + " " + fq(fy / H) + '" numOctaves="' + oct + '" seed="' + sd + '" stitchTiles="stitch"/>' +
        '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0"/>' +
        '<feComponentTransfer><feFuncA type="table" tableValues="' + band(n, w) + '"/></feComponentTransfer>' +
        '<feComposite in="SourceGraphic" operator="in"/></filter>';
    }
    // облака тона камня
    var defs = '<filter id="mc" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + fq(1.6 / W) + '" numOctaves="4" seed="' + (seed + 3) + '" stitchTiles="stitch"/>' +
      '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.2 0 0 0 -.95"/>' +
      '<feComposite in="SourceGraphic" operator="in"/></filter>' +
      veinFilter("mv", 0.7, 1.5, 6, seed, 81, 1.4) + veinFilter("mv2", 1.6, 2.4, 5, seed + 11, 61, 1.1);
    return wrapSvg(W, H, defs,
      '<rect width="' + W + '" height="' + H + '" fill="' + vein + '" filter="url(#mc)" opacity=".18"/>' +
      '<rect width="' + W + '" height="' + H + '" fill="' + vein + '" filter="url(#mv2)" opacity=".45"/>' +
      '<rect width="' + W + '" height="' + H + '" fill="' + vein + '" filter="url(#mv)"/>', c[0]);
  };

  /* ---------- 17. Фреска «Горы в тумане»: панно на всю высоту стены ---------- */
  G.mountains = function (s) {
    var W = s.w, H = s.h, c = s.c, R = rng(s.seed || 17);
    var sky = c[0], far = c[1], near = c[2], sun = c[3] || shade(c[0], 0.3);
    var defs = '<linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + shade(sky, 0.18) + '"/><stop offset=".65" stop-color="' + sky + '"/><stop offset="1" stop-color="' + shade(sky, -0.06) + '"/></linearGradient>';
    var layers = 6, body = '<rect width="' + W + '" height="' + H + '" fill="url(#sk)"/>' +
      '<circle cx="' + f(W * 0.68) + '" cy="' + f(H * 0.3) + '" r="' + f(H * 0.09) + '" fill="' + sun + '" opacity=".85"/>';
    for (var l = 0; l < layers; l++) {
      var t = l / (layers - 1), base = H * (0.42 + t * 0.42), amp = H * (0.12 - t * 0.04), col = mix(far, near, Math.pow(t, 0.9));
      var harm = [];
      for (var h = 0; h < 5; h++) harm.push([1 + Math.floor(R() * (2 + h * 2.4)), R() * 6.28, (0.6 / (h + 1)) * (0.6 + R() * 0.8)]);
      var d = "M0," + H;
      for (var xi = 0; xi <= 240; xi++) {
        var x = xi * W / 240, y = 0;
        harm.forEach(function (hh) { y += Math.sin((x / W) * 6.283 * hh[0] + hh[1]) * hh[2]; });
        // острые гребни: |sin| даёт вершины
        y = base - amp * (y + 0.32 * Math.abs(Math.sin((x / W) * 6.283 * harm[0][0] * 3 + harm[1][1])));
        d += "L" + f(x) + "," + f(y);
      }
      d += "L" + W + "," + H + "Z";
      body += '<path d="' + d + '" fill="' + col + '"/>';
      // туман между слоями
      body += '<rect y="' + f(base - amp * 0.2) + '" width="' + W + '" height="' + f(H * 0.08) + '" fill="' + sky + '" opacity="' + f(0.22 * (1 - t)) + '"/>';
    }
    return wrapSvg(W, H, defs + grainDefs("g", 0.6, 0.05, W, H), body + grain("g", W, H), null);
  };

  /* ---------- 18. Гинкго: веерные листья, японский минимализм ---------- */
  G.ginkgo = function (s) {
    var W = s.w, H = s.h, c = s.c, bg = c[0], cols = c.slice(1), R = rng(s.seed || 41), body = "";
    var leaf = function (r, col) {
      var d = "M0,0L" + f(-r * 0.62) + "," + f(-r * 0.78) + "Q" + f(-r * 0.3) + "," + f(-r * 1.12) + " " + f(-r * 0.04) + "," + f(-r * 0.92) +
        "L0," + f(-r * 0.78) + "L" + f(r * 0.04) + "," + f(-r * 0.92) + "Q" + f(r * 0.3) + "," + f(-r * 1.12) + " " + f(r * 0.62) + "," + f(-r * 0.78) + "Z";
      var veins = "";
      for (var a = -34; a <= 34; a += 8.5) veins += '<path d="M0,0L' + f(Math.sin(a * Math.PI / 180) * r * 0.95) + "," + f(-Math.cos(a * Math.PI / 180) * r * 0.86) + '" stroke="' + shade(col, -0.18) + '" stroke-width="' + f(r * 0.012) + '" opacity=".55"/>';
      return '<path d="' + d + '" fill="' + col + '"/>' + veins + '<path d="M0,0L0,' + f(r * 0.5) + '" stroke="' + col + '" stroke-width="' + f(r * 0.03) + '" stroke-linecap="round"/>';
    };
    var cells = 4;
    for (var gy = 0; gy < cells; gy++) for (var gx = 0; gx < cells; gx++) {
      var x = (gx + 0.15 + R() * 0.7) * W / cells, y = (gy + 0.15 + R() * 0.7) * H / cells, r = W * (0.06 + R() * 0.035);
      body += place(W, H, x, y, r * 1.3, '<g transform="rotate(' + f(R() * 360) + ')">' + leaf(r, cols[Math.floor(R() * cols.length)]) + "</g>");
    }
    return wrapSvg(W, H, grainDefs("g", 0.8, 0.05, W, H), body + grain("g", W, H), bg);
  };

  /* ---------- публичный API ---------- */
  var cacheUrl = {}, cacheCanvas = {};
  function key(spec) { return JSON.stringify([spec.gen, spec.c, spec.seed, spec.w, spec.h, spec.n, spec.bands, spec.amp]); }
  function svg(spec) {
    var g = G[spec.gen];
    if (!g) throw new Error("pattern " + spec.gen);
    return g(spec);
  }
  function url(spec) {
    var k = key(spec);
    if (!cacheUrl[k]) cacheUrl[k] = URL.createObjectURL(new Blob([svg(spec)], { type: "image/svg+xml" }));
    return cacheUrl[k];
  }
  /* растр для WebGL: px×px (степень двойки — нужна для повтора и мипмапов в WebGL1) */
  function canvas(spec, px) {
    px = px || 1024;
    var k = key(spec) + "@" + px;
    if (cacheCanvas[k]) return cacheCanvas[k];
    cacheCanvas[k] = new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () {
        var cv = document.createElement("canvas");
        cv.width = px; cv.height = px;
        var ctx = cv.getContext("2d");
        ctx.drawImage(img, 0, 0, px, px);
        res(cv);
      };
      img.onerror = rej;
      img.src = url(spec);
    });
    return cacheCanvas[k];
  }
  /* средний цвет рисунка — для отражённого света и подписи «тон» */
  function avgColor(spec) { return spec.avg || spec.c[0]; }

  root.DC_PATTERNS = { svg: svg, url: url, canvas: canvas, avg: avgColor, gens: Object.keys(G), mix: mix, shade: shade };
})(typeof window !== "undefined" ? window : globalThis);
