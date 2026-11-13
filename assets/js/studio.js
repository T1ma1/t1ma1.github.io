/* ============================================================
   DECANDO — движок примерочной (WebGL).
   Основа — движок перекраски NERO (маски SAM 2.1, карты света, «коробка» комнаты).
   Здесь стены получают ОБОИ: рисунок из DC_PATTERNS ложится на каждую стену
   в перспективе (гомография фото → плоскость стены в метрах), в реальном масштабе
   раппорта, со стыками полотен; смена обоев — «поклейка» полоса за полосой.
   Потолок и предметы перекрашиваются краской (как в NERO).
     var s = DC_STUDIO.create(sceneEl, { room: "living" });
     s.setWall("all" | 0..2, product | null);   s.setPaint(index, "#hex" | null);
     s.setRoom("bedroom");  s.setLight("warm");  s.setSplit(0.5);  s.hit(u, v);
   Комнаты: assets/img/rooms/room-*.jpg + маски (описание — в README).
   ============================================================ */
(function () {
  "use strict";
  var PT = window.DC_PATTERNS;
  var ROOM_DIR = "/assets/img/rooms/room-";

  /* геометрия «коробки» и калибровка поверхностей — из NERO (tools/room-masks/compose.py) */
  var ROOMS = {
    living: { name: "Гостиная", geom: { xL: 199.94, xR: 782.22, yT: 105.64, yB: 441.67, aCL: 42.8, aCR: 41.2, aFL: 26.8, aFR: 26.2 },
      wall: [0.4072, 0.2874, 0.1746], ceil: [0.4793, 0.3968, 0.3278], anchor: 1.219, anchorCeil: 1.021, cast: [1.0635, 0.9887, 0.9250],
      objects: [{ key: "sofa", name: "Диван", ref: [0.1590, 0.0212, 0.0065], anchor: 1.153, tex: 0.55 },
                { key: "rug", name: "Ковёр", ref: [0.3419, 0.1812, 0.0953], anchor: 1.201, tex: 0.86 },
                { key: "floor", name: "Пол", ref: [0.4508, 0.3467, 0.2502], anchor: 1.274, tex: 0.98 }] },
    bedroom: { name: "Спальня", geom: { xL: 199.39, xR: 781.99, yT: 105.48, yB: 427.64, aCL: 42.8, aCR: 40.9, aFL: 27.3, aFR: 26.0 },
      wall: [0.4020, 0.2831, 0.1683], ceil: [0.4678, 0.3916, 0.3231], anchor: 1.255, anchorCeil: 1.032, cast: [1.0406, 0.9925, 0.9546],
      objects: [{ key: "headboard", name: "Изголовье", ref: [0.2623, 0.1714, 0.1095], anchor: 1.233, tex: 0.83 },
                { key: "rug", name: "Ковёр", ref: [0.2423, 0.1170, 0.0482], anchor: 1.225, tex: 0.77 },
                { key: "floor", name: "Пол", ref: [0.4735, 0.2918, 0.1620], anchor: 1.3, tex: 0.95 }] },
    kitchen: { name: "Кухня", geom: { xL: 190.54, xR: 786.04, yT: 98.04, yB: 408.43, aCL: 41.9, aCR: 39.4, aFL: 34.2, aFR: 38.8 },
      wall: [0.4125, 0.2831, 0.1683], ceil: [0.4793, 0.3916, 0.3185], anchor: 1.218, anchorCeil: 1.017, cast: [1.0532, 0.9907, 0.9356],
      objects: [{ key: "fronts", name: "Фасады", ref: [0.0844, 0.0284, 0.0091], anchor: 1.233, opaque: 1 },
                { key: "island", name: "Остров", ref: [0.3278, 0.1441, 0.0545], anchor: 1.233, opaque: 1 },
                { key: "floor", name: "Пол", ref: [0.4125, 0.1620, 0.0742], anchor: 1.481, tex: 0.86 }] },
    kids: { name: "Детская", geom: { xL: 199.23, xR: 782.15, yT: 105.66, yB: 425.31, aCL: 42.8, aCR: 41.1, aFL: 28.1, aFR: 26.4 },
      wall: [0.4287, 0.3095, 0.1981], ceil: [0.4969, 0.4287, 0.3763], anchor: 1.231, anchorCeil: 1.018, cast: [1.0507, 0.9910, 0.9395],
      objects: [{ key: "bed", name: "Кровать", ref: [0.3185, 0.1413, 0.0578], anchor: 1.264, opaque: 1 },
                { key: "rug", name: "Ковёр", ref: [0.5210, 0.3763, 0.2705], anchor: 1.251 },
                { key: "floor", name: "Пол", ref: [0.4072, 0.2423, 0.1356], anchor: 1.462, tex: 0.91 }] }
  };
  var LIGHT = {
    day:  { name: "Дневной свет", wb: [1, 1, 1], expo: 1, night: 0 },
    warm: { name: "Тёплый свет", wb: [1.10, 0.985, 0.80], expo: 0.96, night: 0 },
    cold: { name: "Холодный свет", wb: [0.93, 1.005, 1.14], expo: 1.02, night: 0 },
    none: { name: "Вечер, без окон", wb: [1.07, 0.985, 0.85], expo: 0.74, night: 1 }
  };
  var N = 7, HM = 2.7;   // поверхностей в кадре; высота комнаты, м
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function hexToLin(hex) {
    var n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* перспектива стен: фото (ширина 1024) → плоскость стены в метрах (как в NERO) */
  function homography(s, d) {
    var A = [], i, j, k;
    for (i = 0; i < 4; i++) {
      var x = s[i][0], y = s[i][1], u = d[i][0], v = d[i][1];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]); A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
    }
    for (i = 0; i < 8; i++) {
      var piv = i;
      for (j = i + 1; j < 8; j++) if (Math.abs(A[j][i]) > Math.abs(A[piv][i])) piv = j;
      var t = A[i]; A[i] = A[piv]; A[piv] = t;
      for (j = 0; j < 8; j++) if (j !== i) { var fk = A[j][i] / A[i][i]; for (k = i; k < 9; k++) A[j][k] -= fk * A[i][k]; }
    }
    var h = []; for (i = 0; i < 8; i++) h.push(A[i][8] / A[i][i]);
    return [h[0], h[3], h[6], h[1], h[4], h[7], h[2], h[5], 1];
  }
  function wallGeo(g) {
    var f = 731, rad = Math.PI / 180, hb = g.yB - g.yT, Wm = HM * (g.xR - g.xL) / hb, Zb = f * HM / hb;
    var tCL = Math.tan(g.aCL * rad), tFL = Math.tan(g.aFL * rad), tCR = Math.tan(g.aCR * rad), tFR = Math.tan(g.aFR * rad);
    var back = homography([[g.xL, g.yT], [g.xR, g.yT], [g.xR, g.yB], [g.xL, g.yB]], [[0, 0], [Wm, 0], [Wm, HM], [0, HM]]);
    var t0 = g.yT - tCL * g.xL, b0 = g.yB + tFL * g.xL, D0 = Zb * (1 - hb / (b0 - t0));
    var left = homography([[g.xL, g.yT], [0, t0], [0, b0], [g.xL, g.yB]], [[0, 0], [D0, 0], [D0, HM], [0, HM]]);
    var t1 = g.yT - tCR * (1024 - g.xR), b1 = g.yB + tFR * (1024 - g.xR), D1 = Zb * (1 - hb / (b1 - t1));
    var right = homography([[g.xR, g.yT], [1024, t1], [1024, b1], [g.xR, g.yB]], [[0, 0], [D1, 0], [D1, HM], [0, HM]]);
    return { hom: new Float32Array(back.concat(left, right)), widths: [Wm, D0, D1] };
  }

  var VS = "attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }";
  var FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "varying vec2 vUv;",
    "#define LODB -0.85",
    "uniform sampler2D uPhoto; uniform sampler2D uMask; uniform sampler2D uMask3; uniform sampler2D uMask2;",
    "uniform sampler2D uLight; uniform sampler2D uLight2; uniform sampler2D uShade;",
    "uniform sampler2D uWp0; uniform sampler2D uWp1; uniform sampler2D uWp2;",
    "#ifndef NO_PREV",
    "uniform sampler2D uWq0; uniform sampler2D uWq1; uniform sampler2D uWq2;",
    "#endif",
    "uniform float uCurK[7]; uniform float uPrevK[7]; uniform vec3 uCurP[7]; uniform vec3 uPrevP[7]; uniform float uProg[7]; uniform float uMode[7];",
    "uniform vec3 uRef[7]; uniform float uAnchor[7]; uniform float uOpaque[7]; uniform float uTex[7];",
    "uniform vec2 uTileA[3]; uniform vec2 uTileB[3]; uniform vec2 uRollA[3]; uniform vec2 uRollB[3]; uniform float uWallW[3]; uniform mat3 uHom[3];",
    "uniform vec3 uWB; uniform float uExpo; uniform float uNight;",
    "uniform float uFlat; uniform float uFlatObj; uniform float uChroma; uniform float uBounce;",
    "uniform vec3 uWallAvg; uniform float uWallOn; uniform vec3 uCast;",
    "uniform vec3 uSel1; uniform vec3 uSel3; uniform vec3 uSel2; uniform float uHi; uniform vec2 uTexel; uniform float uSplit;",
    "vec3 toLin(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }",
    "vec3 toSrgb(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(0.41666667)) - 0.055, step(vec3(0.0031308), c)); }",
    "float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }",
    "vec3 softclip(vec3 x){ const float k = 0.92; return mix(x, k + (1.0 - k) * (1.0 - exp(-(x - k) / (1.0 - k))), step(vec3(k), x)); }",
    /* перекраска из NERO: пиксель = цвет × освещённость (фото / исходный цвет поверхности) */
    "vec3 repaint(vec3 src, vec3 paint, vec3 ref, float yref, float slow, float fl, float anchor, float opq, float shade, float tex, float aa){",
    "  float r0 = max(luma(src) / yref, 1e-4);",
    "  float r = mix(r0, exp2(shade * 5.0 - 3.5), opq);",
    "  float g = log2(r / max(slow, 1e-3)) * tex;",
    "  g *= smoothstep(0.5, 0.97, aa);",
    "  float illum = pow(slow, fl) * exp2(g);",
    "  vec3 cv = src / ref * (luma(ref) / yref) / r0;",
    "  vec3 light = illum * uCast * mix(vec3(1.0), cv, uChroma * (1.0 - opq));",
    "  return softclip(paint * light / anchor);",
    "}",
    "float sel(vec2 uv){ return dot(texture2D(uMask, uv).rgb, uSel1) + texture2D(uMask3, uv).r * uSel3.x + dot(texture2D(uMask2, uv).rgb, uSel2); }",
    "vec2 planeM(mat3 H, vec2 img){ vec3 p = H * vec3(img, 1.0); float z = abs(p.z) < 1e-4 ? 1e-4 : p.z; return clamp(p.xy / z, vec2(-50.0), vec2(50.0)); }",
    /* обои: u — по стене (на левой стене зеркально — смотрим на неё изнутри комнаты), v — от потолка вниз */
    "vec3 paper(sampler2D s, vec2 pm, vec2 tile, vec2 roll, float flip){",
    "  vec2 uv = vec2(pm.x * flip, -pm.y) / tile;",
    "  vec3 c = toLin(texture2D(s, uv).rgb);",
    /* стык полотен: тонкая тень каждые roll.x метров + едва заметная разница тона соседних полос */
    "  float d = abs(fract(pm.x / roll.x + 0.5) - 0.5) * roll.x;",
    "  float w = max(FW(pm.x) * 1.3, 0.0012);",
    "  float idx = floor(pm.x / roll.x);",
    "  float tone = 1.0 + (fract(sin(idx * 12.9898) * 43758.5453) - 0.5) * 0.012;",
    "  return c * tone * (1.0 - roll.y * (1.0 - smoothstep(0.0, w, d)));",
    "}",
    /* «поклейка»: полосы появляются по очереди от угла, каждая — сверху вниз */
    "float hang(float prog, vec2 pm, float roll, float wallW){",
    "  float n = ceil(max(wallW, roll) / roll);",
    "  float p = prog * (n + 1.4) - floor(pm.x / roll);",
    "  float yn = clamp(pm.y / 2.7, 0.0, 1.0);",
    "  return smoothstep(yn - 0.025, yn + 0.025, p * 1.3 - 0.15);",
    "}",
    "void main(){",
    "  vec3 src = toLin(texture2D(uPhoto, vUv, LODB).rgb);",
    "  vec3 m = texture2D(uMask, vUv, LODB).rgb;",
    "  vec3 m3 = texture2D(uMask3, vUv, LODB).rgb;",
    "  vec3 m2 = texture2D(uMask2, vUv, LODB).rgb;",
    "  vec3 lt = texture2D(uLight, vUv).rgb;",
    "  vec2 slow = exp2(lt.rg * 4.0 - 2.0);",
    "  vec3 slowO = exp2(texture2D(uLight2, vUv).rgb * 4.0 - 2.0);",
    "  vec3 sh = texture2D(uShade, vUv, LODB).rgb;",
    "  float yw = luma(uRef[0]);",
    "  float a0 = m.r; float a1 = m.g; float a2 = m.b; float a3 = m3.r; float a4 = m2.r; float a5 = m2.g; float a6 = m2.b;",
    "  float k = max(a0 + a1 + a2 + a3 + a4 + a5 + a6, 1.0);",
    "  a0 /= k; a1 /= k; a2 /= k; a3 /= k; a4 /= k; a5 /= k; a6 /= k;",
    "  vec2 img = vec2(vUv.x * 1024.0, (1.0 - vUv.y) * 680.0);",
    "  vec3 col = src * (1.0 - a0 - a1 - a2 - a3 - a4 - a5 - a6);",
    /* стены: текущее и предыдущее покрытие, переход — «поклейка» (обои) или плавная смена (краска) */
    "  vec2 pm0 = planeM(uHom[0], img); vec2 pm1 = planeM(uHom[1], img); vec2 pm2 = planeM(uHom[2], img);",
    "  WALL(0, pm0, uWp0, uWq0, a0, m.r, 1.0)",
    "  WALL(1, pm1, uWp1, uWq1, a1, m.g, -1.0)",
    "  WALL(2, pm2, uWp2, uWq2, a2, m.b, 1.0)",
    "  SURF(3, a3, m3.r, slow.y, uFlat, 0.5)",
    "  SURF(4, a4, m2.r, slowO.r, uFlatObj, sh.r)",
    "  SURF(5, a5, m2.g, slowO.g, uFlatObj, sh.g)",
    "  SURF(6, a6, m2.b, slowO.b, uFlatObj, sh.b)",
    /* отражённый свет от новых стен на пол, потолок и мебель */
    "  vec3 wt = pow(clamp(uWallAvg / uRef[0], vec3(0.4), vec3(1.8)), vec3(0.35));",
    "  vec3 bounce = mix(vec3(1.0), wt, clamp(lt.b * uBounce * uWallOn, 0.0, 1.0));",
    "  col *= mix(bounce, vec3(1.0), a0 + a1 + a2);",
    "  vec3 c0 = src;",
    "  if (uNight > 0.001) {",
    "    float wl = luma(toLin(texture2D(uPhoto, vUv, 4.5).rgb));",
    "    float fw = mix(0.6, 0.24, smoothstep(0.25, 0.9, wl));",
    "    float gf = log2(max(luma(src) / luma(uRef[6]), 1e-4) / max(slowO.b, 1e-3));",
    "    float ff = exp2(-max(gf - 0.12, 0.0) * 0.9) * pow(min(1.0, 1.0 / slowO.b), 0.7);",
    "    float fwall = pow(min(1.0, 1.0 / slow.x), 0.6), fceil = pow(min(1.0, 1.0 / slow.y), 0.6);",
    "    float f = mix(1.0, fw, m3.g) * mix(1.0, ff, m2.b) * mix(1.0, fwall, min(m.r + m.g + m.b, 1.0)) * mix(1.0, fceil, m3.r);",
    "    col *= mix(1.0, f, uNight); c0 *= mix(1.0, f, uNight);",
    "  }",
    "  vec2 dd = (vUv - 0.5) * vec2(1.0, 1.3);",
    "  float vig = 1.0 - uNight * 0.36 * smoothstep(0.18, 0.78, length(dd));",
    "  col *= uWB * uExpo * vig; c0 *= uWB * uExpo * vig;",
    "  vec3 outc = toSrgb(vUv.x < uSplit ? c0 : col);",
    "  if (uHi > 0.001 && vUv.x >= uSplit) {",
    "    float h = sel(vUv);",
    "    float e = abs(sel(vUv + vec2(uTexel.x, 0.0)) - sel(vUv - vec2(uTexel.x, 0.0))) + abs(sel(vUv + vec2(0.0, uTexel.y)) - sel(vUv - vec2(0.0, uTexel.y)));",
    "    outc = mix(outc, min(outc * 1.08 + 0.05, 1.0), h * uHi * 0.5);",
    "    outc = mix(outc, vec3(1.0), clamp(e * 1.2, 0.0, 1.0) * uHi * 0.9);",
    "  }",
    "  if (uSplit > 0.0) outc = mix(outc, vec3(1.0), 1.0 - smoothstep(0.0, uTexel.x * 1.2, abs(vUv.x - uSplit)));",
    "  gl_FragColor = vec4(outc, 1.0);",
    "}"
  ].join("\n");

  /* макросы поверхностей — в GLSL ES 1.0 нельзя индексировать массив сэмплеров переменной */
  function wallMacro(prev) {
    return "#define WALL(i, pm, ws, wq, a, aa, flip) { " +
      "vec3 cc = src; vec3 pc = src; " +
      "if (uCurK[i] > 1.5) cc = repaint(src, paper(ws, pm, uTileA[i], uRollA[i], flip), uRef[i], yw, slow.x, uFlat, uAnchor[i], 0.0, 0.5, 0.22, aa); " +
      "else if (uCurK[i] > 0.5) cc = repaint(src, uCurP[i], uRef[i], yw, slow.x, uFlat, uAnchor[i], 0.0, 0.5, 1.0, aa); " +
      (prev ? "if (uPrevK[i] > 1.5) pc = repaint(src, paper(wq, pm, uTileB[i], uRollB[i], flip), uRef[i], yw, slow.x, uFlat, uAnchor[i], 0.0, 0.5, 0.22, aa); else "
            : "") +
      "if (uPrevK[i] > 0.5) pc = repaint(src, uPrevP[i], uRef[i], yw, slow.x, uFlat, uAnchor[i], 0.0, 0.5, 1.0, aa); " +
      "float rv = uMode[i] > 0.5 ? hang(uProg[i], pm, uRollA[i].x, uWallW[i]) : uProg[i]; " +
      "vec3 sc = mix(pc, cc, rv) * (1.0 - 0.9 * rv * (1.0 - rv) * uMode[i]); " +
      "col += sc * a; }\n";
  }
  var SURF_MACRO = "#define SURF(i, a, aa, sl, fl, shd) { " +
    "vec3 cc = uCurK[i] > 0.5 ? repaint(src, uCurP[i], uRef[i], luma(uRef[i]), sl, fl, uAnchor[i], uOpaque[i], shd, uTex[i], aa) : src; " +
    "vec3 pc = uPrevK[i] > 0.5 ? repaint(src, uPrevP[i], uRef[i], luma(uRef[i]), sl, fl, uAnchor[i], uOpaque[i], shd, uTex[i], aa) : src; " +
    "col += mix(pc, cc, uProg[i]) * a; }\n";

  function create(sceneEl, opts) {
    opts = opts || {};
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    var ctxOpts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "low-power" };
    var gl = null, isGL2 = false;
    try {
      gl = canvas.getContext("webgl2", ctxOpts); isGL2 = !!gl;
      if (!gl) gl = canvas.getContext("webgl", ctxOpts) || canvas.getContext("experimental-webgl", ctxOpts);
    } catch (e) { gl = null; }
    if (!gl) return null;
    var units = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS), hasPrev = units >= 13;

    function shader(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { if (window.console) console.warn("studio shader:", gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    function sources() {
      var head = (hasPrev ? "" : "#define NO_PREV\n#define uWq0 uWp0\n#define uWq1 uWp1\n#define uWq2 uWp2\n") + wallMacro(hasPrev) + SURF_MACRO;
      var out = [];
      if (isGL2) out.push(["#version 300 es\nin vec2 aPos; out vec2 vUv; void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }",
        "#version 300 es\n#define FW(x) fwidth(x)\n" + head + FS.replace("varying vec2 vUv;", "in vec2 vUv;\nout vec4 fragOut;").replace(/texture2D\(/g, "texture(").replace(/gl_FragColor/g, "fragOut")]);
      if (gl.getExtension && gl.getExtension("OES_standard_derivatives"))
        out.push([VS, "#extension GL_OES_standard_derivatives : enable\n#define FW(x) fwidth(x)\n" + head + FS]);
      out.push([VS, "#define FW(x) 0.0015\n" + head + FS]);
      return out;
    }
    var vs = null, fs = null;
    sources().some(function (pair) { vs = shader(gl.VERTEX_SHADER, pair[0]); fs = vs && shader(gl.FRAGMENT_SHADER, pair[1]); return vs && fs; });
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ["uPhoto", "uMask", "uMask3", "uMask2", "uLight", "uLight2", "uShade", "uWp0", "uWp1", "uWp2", "uWq0", "uWq1", "uWq2",
     "uCurK", "uPrevK", "uCurP", "uPrevP", "uProg", "uMode", "uRef", "uAnchor", "uOpaque", "uTex",
     "uTileA", "uTileB", "uRollA", "uRollB", "uWallW", "uHom", "uWB", "uExpo", "uNight", "uFlat", "uFlatObj", "uChroma", "uBounce",
     "uWallAvg", "uWallOn", "uCast", "uSel1", "uSel3", "uSel2", "uHi", "uTexel", "uSplit"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    ["uPhoto", "uMask", "uMask3", "uMask2", "uLight", "uLight2", "uShade", "uWp0", "uWp1", "uWp2"].forEach(function (n, i) { gl.uniform1i(U[n], i); });
    if (hasPrev) { gl.uniform1i(U.uWq0, 10); gl.uniform1i(U.uWq1, 11); gl.uniform1i(U.uWq2, 12); }
    gl.uniform1f(U.uFlat, 0.55); gl.uniform1f(U.uFlatObj, 0.3); gl.uniform1f(U.uChroma, 0.3); gl.uniform1f(U.uBounce, 0.35);
    var aniso = gl.getExtension("EXT_texture_filter_anisotropic") || gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");

    sceneEl.appendChild(canvas);
    var dead = false;
    function fail() {
      if (dead) return; dead = true;
      sceneEl.classList.remove("is-gl");
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      if (opts.onFail) opts.onFail();
    }
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); fail(); });

    function loadImage(src) {
      return new Promise(function (res, rej) { var img = new Image(); img.decoding = "async"; img.onload = function () { res(img); }; img.onerror = rej; img.src = src; });
    }
    function makeTex(img, isMask, noMips) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, isMask ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);   // file:// → SecurityError → onFail
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (isGL2 && !noMips) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
      else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      return t;
    }
    /* плитка обоев: повтор, мипмапы, анизотропия — боковые стены видны под углом */
    function makeTile(cv) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, cv);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      return t;
    }
    var dummyTex = null;
    function dummy() {
      if (dummyTex) return dummyTex;
      dummyTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, dummyTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128]));
      return dummyTex;
    }
    /* текстуры обоев: по id товара; средний цвет — для отражённого света */
    var wpTex = {};
    function loadWp(p) {
      if (wpTex[p.id]) return wpTex[p.id].p;
      var rec = wpTex[p.id] = {};
      rec.p = tileOf(p).then(function (tile) {
        if (dead || !tile) return rec;
        var cv = tile.cv;
        rec.w = tile.w; rec.h = tile.h;
        rec.t = makeTile(cv);
        var c = document.createElement("canvas"); c.width = c.height = 8;
        var x = c.getContext("2d"); x.drawImage(cv, 0, 0, 8, 8);
        var d = x.getImageData(0, 0, 8, 8).data, s = [0, 0, 0];
        for (var i = 0; i < d.length; i += 4) { s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; }
        rec.avg = hexToLin("#" + s.map(function (v) { return Math.round(v / 64).toString(16).padStart(2, "0"); }).join(""));
        return rec;
      });
      return rec.p;
    }

    /* плитка обоев: сгенерированный рисунок (p.pat) или фото товара.
       Фото зеркалим 2×2 — на стыках повторов не остаётся шва; ширину кадра считаем равной ширине рулона. */
    function tileOf(p) {
      if (p.pat) return PT.canvas(p.pat, 1024).then(function (cv) { return { cv: cv, w: p.pat.w / 1000, h: p.pat.h / 1000 }; });
      return new Promise(function (res) {
        var src = (window.DC_DATA && DC_DATA.img ? DC_DATA.img(p, true) : "") || p.img || p.thumb;
        if (!src) return res(null);
        var im = new Image();
        im.onload = function () {
          var S = 1024, h = S / 2, cv = document.createElement("canvas"); cv.width = cv.height = S;
          var x = cv.getContext("2d");
          [[1, 1, 0, 0], [-1, 1, S, 0], [1, -1, 0, S], [-1, -1, S, S]].forEach(function (q) {
            x.setTransform(q[0], 0, 0, q[1], q[2], q[3]); x.drawImage(im, 0, 0, h, h);
          });
          x.setTransform(1, 0, 0, 1, 0, 0);
          var w = Math.min(p.roll ? p.roll[0] : 1.06, 1.06);
          res({ cv: cv, w: w * 2, h: w * 2 * im.naturalHeight / im.naturalWidth });
        };
        im.onerror = function () { res(null); };
        im.src = src;
      });
    }

    function makeHitMap(m1, m3, m2) {
      var W = 384, H = Math.round(W * m1.naturalHeight / m1.naturalWidth);
      var c = document.createElement("canvas"); c.width = W; c.height = H;
      var ctx = c.getContext("2d", { willReadFrequently: true });
      var read = function (img) { ctx.clearRect(0, 0, W, H); ctx.drawImage(img, 0, 0, W, H); return ctx.getImageData(0, 0, W, H).data; };
      return { W: W, H: H, d1: read(m1), d3: read(m3), d2: read(m2) };
    }
    var rooms = {};
    function loadRoom(key) {
      if (rooms[key]) return rooms[key].safe;
      var r = rooms[key] = { ready: false };
      var names = [".jpg", "-mask.png", "-mask3.png", "-mask2.png", "-light.png", "-light2.png", "-shade.png"];
      r.p = Promise.all(names.map(function (n) { return loadImage(ROOM_DIR + key + n); })).then(function (imgs) {
        if (dead) return;
        r.tex = [makeTex(imgs[0], false), makeTex(imgs[1], true), makeTex(imgs[2], true), makeTex(imgs[3], true),
                 makeTex(imgs[4], true, true), makeTex(imgs[5], true, true), makeTex(imgs[6], true)];
        r.hit = makeHitMap(imgs[1], imgs[2], imgs[3]);
        r.ready = true;
      });
      r.safe = r.p.catch(function () { fail(); });
      return r.safe;
    }

    /* ---------- состояние поверхностей ----------
       slot = { k: 0 исходная | 1 краска | 2 обои, p: [лин. RGB], wp: товар } */
    function emptySlot() { return { k: 0, p: [0.2, 0.2, 0.2], wp: null }; }
    function freshRoom() {
      var s = [];
      for (var i = 0; i < N; i++) s.push({ cur: emptySlot(), prev: emptySlot(), t0: 0, dur: 0, mode: 0 });
      return s;
    }
    var state = {}, roomKey = opts.room || "living", lightKey = "day", split = -1;
    Object.keys(ROOMS).forEach(function (k) { state[k] = freshRoom(); });
    var light = { from: LIGHT.day, to: LIGHT.day, t0: 0 }, hi = { sel: null, amt: 0, target: 0, pulseUntil: 0 };
    var active = false, raf = 0;
    var geo = {};
    function g() { if (!geo[roomKey]) geo[roomKey] = wallGeo(ROOMS[roomKey].geom); return geo[roomKey]; }

    function resize() {
      var rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      var w = Math.max(1, Math.min(2560, Math.round(rect.width * dpr))), h = Math.max(1, Math.min(2560, Math.round(rect.height * dpr)));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }
    function ease(k) { return 1 - Math.pow(1 - k, 3); }
    function progOf(s, now) { return s.dur ? clamp((now - s.t0) / s.dur, 0, 1) : 1; }
    function lerp3(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }

    function draw(now) {
      now = now || performance.now();
      var r = rooms[roomKey];
      if (dead || !r || !r.ready) return false;
      var meta = ROOMS[roomKey], S = state[roomKey], G = g();
      resize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      for (var t = 0; t < 7; t++) { gl.activeTexture(gl.TEXTURE0 + t); gl.bindTexture(gl.TEXTURE_2D, r.tex[t]); }
      var curK = [], prevK = [], curP = [], prevP = [], pr = [], md = [], tileA = [], tileB = [], rollA = [], rollB = [], busy = false;
      for (var i = 0; i < N; i++) {
        var s = S[i], k = progOf(s, now);
        if (k < 1) busy = true;
        curK.push(s.cur.k); prevK.push(s.prev.k);
        curP.push.apply(curP, s.cur.p); prevP.push.apply(prevP, s.prev.p);
        pr.push(s.mode ? k : ease(k)); md.push(s.mode);
        if (i < 3) {
          var a = s.cur.wp, b = s.prev.wp;
          var ta = a && wpTex[a.id] && wpTex[a.id].t, tb = b && wpTex[b.id] && wpTex[b.id].t;
          gl.activeTexture(gl.TEXTURE7 + i); gl.bindTexture(gl.TEXTURE_2D, ta || dummy());
          if (hasPrev) { gl.activeTexture(gl.TEXTURE10 + i); gl.bindTexture(gl.TEXTURE_2D, tb || dummy()); }
          if (s.cur.k === 2 && !ta) curK[i] = 0;
          if (s.prev.k === 2 && (!tb || !hasPrev)) prevK[i] = s.prev.k === 2 && !hasPrev ? 0 : prevK[i];
          var ra = a && wpTex[a.id], rb = b && wpTex[b.id];
          tileA.push(ra && ra.w || 1, ra && ra.h || 1); tileB.push(rb && rb.w || 1, rb && rb.h || 1);
          rollA.push(a ? Math.min(a.roll ? a.roll[0] : 1.06, 1.06) : 0.53, a && a.type !== "mural" ? 0.075 : 0.035);
          rollB.push(b ? Math.min(b.roll ? b.roll[0] : 1.06, 1.06) : 0.53, b && b.type !== "mural" ? 0.075 : 0.035);
        }
      }
      var refs = [meta.wall, meta.wall, meta.wall, meta.ceil], anchors = [meta.anchor, meta.anchor, meta.anchor, meta.anchorCeil];
      var opq = [0, 0, 0, 0], tex = [1, 1, 1, 1];
      meta.objects.forEach(function (o) { refs.push(o.ref); anchors.push(o.anchor); opq.push(o.opaque || 0); tex.push(o.tex || 1); });
      var flat = []; refs.forEach(function (v) { flat.push(v[0], v[1], v[2]); });
      gl.uniform1fv(U.uCurK, new Float32Array(curK)); gl.uniform1fv(U.uPrevK, new Float32Array(prevK));
      gl.uniform3fv(U.uCurP, new Float32Array(curP)); gl.uniform3fv(U.uPrevP, new Float32Array(prevP));
      gl.uniform1fv(U.uProg, new Float32Array(pr)); gl.uniform1fv(U.uMode, new Float32Array(md));
      gl.uniform3fv(U.uRef, new Float32Array(flat)); gl.uniform1fv(U.uAnchor, new Float32Array(anchors));
      gl.uniform1fv(U.uOpaque, new Float32Array(opq)); gl.uniform1fv(U.uTex, new Float32Array(tex));
      gl.uniform2fv(U.uTileA, new Float32Array(tileA)); gl.uniform2fv(U.uTileB, new Float32Array(tileB));
      gl.uniform2fv(U.uRollA, new Float32Array(rollA)); gl.uniform2fv(U.uRollB, new Float32Array(rollB));
      gl.uniform1fv(U.uWallW, new Float32Array(G.widths)); gl.uniformMatrix3fv(U.uHom, false, G.hom);
      gl.uniform3fv(U.uCast, meta.cast);
      /* свет */
      var lk = reduceMotion ? 1 : clamp((now - light.t0) / 450, 0, 1); if (lk < 1) busy = true;
      var le = ease(lk);
      gl.uniform3fv(U.uWB, lerp3(light.from.wb, light.to.wb, le));
      gl.uniform1f(U.uExpo, light.from.expo + (light.to.expo - light.from.expo) * le);
      gl.uniform1f(U.uNight, light.from.night + (light.to.night - light.from.night) * le);
      /* средний цвет стен — для отражённого света */
      var avg = [0, 0, 0], on = 0;
      for (var w = 0; w < 3; w++) {
        var c = S[w].cur, col = c.k === 2 && c.wp && wpTex[c.wp.id] && wpTex[c.wp.id].avg ? wpTex[c.wp.id].avg : c.k === 1 ? c.p : meta.wall;
        avg[0] += col[0] / 3; avg[1] += col[1] / 3; avg[2] += col[2] / 3; on += (c.k ? 1 : 0) / 3;
      }
      gl.uniform3fv(U.uWallAvg, avg); gl.uniform1f(U.uWallOn, on);
      /* подсветка */
      var tgt = hi.target;
      if (hi.pulseUntil) { if (now < hi.pulseUntil) { tgt = 1; busy = true; } else hi.pulseUntil = 0; }
      if (Math.abs(hi.amt - tgt) > 0.004) { hi.amt = reduceMotion ? tgt : hi.amt + (tgt - hi.amt) * 0.18; busy = true; } else hi.amt = tgt;
      var sv = hi.sel || [0, 0, 0, 0, 0, 0, 0];
      gl.uniform3fv(U.uSel1, [sv[0], sv[1], sv[2]]); gl.uniform3fv(U.uSel3, [sv[3], 0, 0]); gl.uniform3fv(U.uSel2, [sv[4], sv[5], sv[6]]);
      gl.uniform1f(U.uHi, hi.sel ? hi.amt : 0);
      gl.uniform2f(U.uTexel, 1.4 / canvas.width, 1.4 / canvas.height);
      gl.uniform1f(U.uSplit, split);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      sceneEl.classList.add("is-gl");
      return busy;
    }
    function tick(now) { raf = 0; if (draw(now)) raf = requestAnimationFrame(tick); }
    function kick() { if (!raf && active) raf = requestAnimationFrame(tick); }
    if (window.ResizeObserver) new ResizeObserver(function () { if (active) draw(); }).observe(canvas);
    else window.addEventListener("resize", function () { if (active) draw(); });

    /* смена покрытия: предыдущее остаётся под новым до конца перехода */
    function setSlot(i, next, instant, roomOverride) {
      var key = roomOverride || roomKey, s = state[key][i], now = performance.now();
      var k = progOf(s, now);
      if (k < 1 && s.mode === 0) { s.cur = { k: s.cur.k, p: lerp3(s.prev.p, s.cur.p, ease(k)), wp: s.cur.wp }; }
      s.prev = s.cur; s.cur = next;
      s.mode = next.k === 2 ? 1 : 0;
      s.dur = instant || reduceMotion || key !== roomKey ? 0 : next.k === 2 ? 1700 : 420;
      s.t0 = now;
      kick();
    }
    function wallIdx(w) { return w === "all" ? [0, 1, 2] : [].concat(w); }

    var api = {
      ROOMS: ROOMS, LIGHT: LIGHT,
      ready: function () { var r = rooms[roomKey]; return !!(r && r.ready && !dead); },
      room: function () { return roomKey; },
      /* обои на стену/стены; product = null — вернуть исходную стену */
      setWall: function (walls, product, o) {
        o = o || {};
        var idx = wallIdx(walls), key = o.room || roomKey;
        if (!product) { idx.forEach(function (i) { setSlot(i, emptySlot(), o.instant, key); }); return Promise.resolve(); }
        return loadWp(product).then(function () {
          if (dead) return;
          idx.forEach(function (i, n) {
            setSlot(i, { k: 2, p: [0.2, 0.2, 0.2], wp: product }, o.instant, key);
            if (!o.instant && key === roomKey) state[key][i].t0 += n * 120;   // стены — одна за другой
          });
        });
      },
      setPaint: function (i, hex, o) {
        o = o || {};
        setSlot(i, hex ? { k: 1, p: hexToLin(hex), wp: null } : emptySlot(), o.instant, o.room);
      },
      slot: function (i, room) { return state[room || roomKey][i].cur; },
      /* ширина задней, левой и правой стены, м — для расчёта рулонов */
      walls: function (room) { var k = room || roomKey; if (!geo[k]) geo[k] = wallGeo(ROOMS[k].geom); return geo[k].widths.slice(); },
      setRoom: function (key) {
        if (!ROOMS[key]) return Promise.resolve();
        roomKey = key; hi.sel = null; hi.amt = 0;
        sceneEl.classList.remove("is-gl");
        if (!active) return Promise.resolve();
        return loadRoom(key).then(function () { if (roomKey === key) { draw(); kick(); } });
      },
      setLight: function (key) {
        if (!LIGHT[key]) return;
        var now = performance.now(), k = clamp((now - light.t0) / 450, 0, 1), e = ease(k);
        light.from = { wb: lerp3(light.from.wb, light.to.wb, e), expo: light.from.expo + (light.to.expo - light.from.expo) * e, night: light.from.night + (light.to.night - light.from.night) * e };
        light.to = LIGHT[key]; light.t0 = reduceMotion ? 0 : now; lightKey = key;
        kick();
      },
      light: function () { return lightKey; },
      setSplit: function (x) { split = x == null ? -1 : clamp(x, 0, 1); kick(); },
      hit: function (u, v) {
        var r = rooms[roomKey];
        if (!r || !r.ready) return -1;
        var x = clamp(Math.floor(u * r.hit.W), 0, r.hit.W - 1), y = clamp(Math.floor(v * r.hit.H), 0, r.hit.H - 1);
        var o = (y * r.hit.W + x) * 4, d1 = r.hit.d1, d3 = r.hit.d3, d2 = r.hit.d2;
        var vals = [d1[o], d1[o + 1], d1[o + 2], d3[o], d2[o], d2[o + 1], d2[o + 2]], best = -1, bv = 110;
        for (var i = 0; i < N; i++) if (vals[i] > bv) { bv = vals[i]; best = i; }
        return best;
      },
      hover: function (idxs) {
        if (idxs && idxs.length) {
          var v = [0, 0, 0, 0, 0, 0, 0]; idxs.forEach(function (i) { if (i >= 0) v[i] = 1; });
          if (!hi.sel || hi.sel.join() !== v.join()) { hi.amt = 0; hi.sel = v; }
          hi.target = 1;
        } else hi.target = 0;
        kick();
      },
      pulse: function (idxs) {
        if (!idxs || !idxs.length) return;
        var v = [0, 0, 0, 0, 0, 0, 0]; idxs.forEach(function (i) { if (i >= 0) v[i] = 1; });
        hi.sel = v; hi.amt = 0; hi.target = 0; hi.pulseUntil = performance.now() + (reduceMotion ? 0 : 650);
        kick();
      },
      /* кадр для скачивания: рисуем и сразу читаем буфер (до показа на экране) */
      snapshot: function () {
        var prevSplit = split, prevHi = hi.sel; split = -1; hi.sel = null;
        draw(performance.now() + 1e5);
        var url = canvas.toDataURL("image/jpeg", 0.92);
        split = prevSplit; hi.sel = prevHi; draw();
        return url;
      },
      preload: function (p) { return loadWp(p); },
      activate: function () {
        if (active || dead) return Promise.resolve();
        active = true;
        return loadRoom(roomKey).then(function () {
          draw(); kick();
          if (opts.preloadAll !== false) Object.keys(ROOMS).forEach(function (k) { if (k !== roomKey) loadRoom(k); });
        });
      },
      destroy: function () { dead = true; if (canvas.parentNode) canvas.parentNode.removeChild(canvas); }
    };
    return api;
  }

  window.DC_STUDIO = { create: create, ROOMS: ROOMS, LIGHT: LIGHT };
})();
