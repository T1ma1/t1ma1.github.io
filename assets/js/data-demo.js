/* ============================================================
   DECANDO — ДЕМО-рисунки только для примерочной (primerka.html).
   ДЕМО-НАБОР: бренды — те, что продаёт Decando, но названия, цены и характеристики
   примерные; при запуске заменить выгрузкой из учётной системы (тот же формат).
   pat — рисунок из assets/js/patterns.js: gen, цвета c (первый — фон), w×h — раппорт в мм.
   roll — [ширина, длина] рулона в метрах; rapport — см; match: straight | offset | free.
   ============================================================ */
(function () {
  "use strict";

  var F = {
    type: { fliz: "Флизелиновые", vinyl: "Виниловые на флизелине", paint: "Под покраску", textile: "Текстильные", mural: "Фрески и панно" },
    style: { classic: "Классика", modern: "Современные", botanic: "Ботаника", geometry: "Геометрия", plain: "Однотонные", kids: "Детские", oriental: "Восточные", mural: "Фрески" },
    room: { living: "Гостиная", bedroom: "Спальня", kitchen: "Кухня", kids: "Детская", hall: "Прихожая", office: "Кабинет" },
    color: {
      beige: ["Бежевые", "#d8c8ad"], white: ["Белые", "#f3f0ea"], grey: ["Серые", "#a9a7a1"], green: ["Зелёные", "#6f8a6f"],
      blue: ["Синие", "#3a5068"], pink: ["Розовые", "#e3b3a5"], terra: ["Терракотовые", "#c08b6e"], gold: ["Золото", "#b8935a"],
      dark: ["Тёмные", "#2b2f2c"], yellow: ["Жёлтые", "#d9b56b"]
    },
    brand: {
      "Rasch": "Германия", "Marburg": "Германия", "A.S. Creation": "Германия", "Erismann": "Германия",
      "Grandeco": "Бельгия", "Zambaiti Parati": "Италия", "Sirpi": "Италия", "Loymina": "Россия", "Milassa": "Россия", "Decando": "Россия"
    },
    match: { straight: "Прямая стыковка", offset: "Со смещением", free: "Свободная стыковка" }
  };

  /* описания по семействам рисунка — коротко и по делу */
  var ABOUT = {
    damask: "Классический дамаск с тонким рельефом: орнамент мягко переливается при боковом свете и не спорит с мебелью. Подходит для гостиной, спальни и холла в классическом и неоклассическом интерьере.",
    botanica: "Лёгкие веточки на светлом поле — живой рисунок, который не утомляет глаз. Хорошо сочетается с деревом, льном и керамикой, визуально расширяет небольшие комнаты.",
    tropic: "Крупные пальмовые листья в несколько слоёв — эффектный акцент для одной стены за диваном или изголовьем. Ширина метр: меньше стыков, быстрее поклейка.",
    deco: "Веерный орнамент ар-деко с металлизированной линией: днём — графика, вечером при тёплом свете — мягкое мерцание. Для гостиной, кабинета, ресторанов и холлов.",
    stripes: "Ритм широких и тонких полос с текстильной нитью. Вертикаль «поднимает» потолок, а сдержанная гамма легко собирает интерьер вместе.",
    ogee: "Марокканская решётка «огье» с двойной линией — спокойная геометрия с восточным характером. Отлично смотрится на всех стенах сразу.",
    chevron: "Шеврон «ёлочка» — тихая геометрия для прихожей, кухни и кабинета. Мелкий раппорт почти не даёт отходов при поклейке.",
    linen: "Фактура натурального льна: однотонные обои, которые выглядят дорого и делают стены ровными на вид. Самый универсальный фон для любой мебели и декора.",
    plaster: "Эффект декоративной штукатурки без мокрых работ: облака тона и мелкое зерно. Клеятся за день, моются и не трескаются со временем.",
    peony: "Акварельные пионы с листьями — нежный цветочный рисунок для спальни и гостиной. Цветы крупные, поэтому стена выглядит как картина, а не как «обои в цветочек».",
    chinoiserie: "Шинуазри: цветущие ветви в духе китайских шёлковых панелей XVIII века. Самый «дорогой» рисунок для столовой, спальни и гостиной.",
    arches: "Мягкие арки-радуги в природных оттенках — спокойный рисунок для детской, который не надоест к школе.",
    stars: "Звёзды, луны и точки — сказочный рисунок для детской. Плотный флизелин легко моется от карандашей и пластилина.",
    terrazzo: "Терраццо: цветная каменная крошка на светлом поле. Яркий и практичный рисунок для кухни, столовой и прихожей.",
    cubes: "Оптическая геометрия из кубов: рисунок меняется в зависимости от точки обзора. Для акцентной стены, кабинета и прихожей.",
    marble: "Обои под мрамор с тонкими прожилками — благородный камень без веса и холода. Для ванной зоны вне брызг, кухни, холла и спальни.",
    mountains: "Фреска-панно на всю стену: туманные горные хребты без повтора рисунка. Печатаем по размерам вашей стены — без лишних стыков.",
    ginkgo: "Веерные листья гинкго в японском духе: много воздуха и мягкий металлический акцент. Для спальни, гостиной и кабинета."
  };

  function P(id, o) { o.id = id; return o; }
  var R53 = [0.53, 10.05], R106 = [1.06, 10.05];

  var products = [
    P("versal-cream", { name: "Версаль", tone: "Крем", brand: "Zambaiti Parati", coll: "Palazzo", type: "vinyl", style: "classic", color: "beige", rooms: ["living", "bedroom", "hall"],
      pat: { gen: "damask", c: ["#E9E1D2", "#D2C4AA", "#BCA987"], w: 530, h: 640 }, roll: R53, rapport: 64, match: "offset", price: 6890, washable: true, badges: ["hit"], pop: 98 }),
    P("versal-graphite", { name: "Версаль", tone: "Графит", brand: "Zambaiti Parati", coll: "Palazzo", type: "vinyl", style: "classic", color: "dark", rooms: ["living", "office", "hall"],
      pat: { gen: "damask", c: ["#2E3133", "#45494B", "#8C7A55"], w: 530, h: 640 }, roll: R53, rapport: 64, match: "offset", price: 6890, old: 8900, washable: true, badges: ["sale"], pop: 86 }),
    P("versal-sage", { name: "Версаль", tone: "Шалфей", brand: "Zambaiti Parati", coll: "Palazzo", type: "vinyl", style: "classic", color: "green", rooms: ["living", "bedroom"],
      pat: { gen: "damask", c: ["#C9CDBB", "#B0B69F", "#8F977A"], w: 530, h: 640 }, roll: R53, rapport: 64, match: "offset", price: 6890, washable: true, pop: 80 }),
    P("barocco-bordeaux", { name: "Барокко", tone: "Бордо", brand: "Sirpi", coll: "Imperium", type: "vinyl", style: "classic", color: "terra", rooms: ["living", "office"],
      pat: { gen: "damask", c: ["#5B1F24", "#76292F", "#B38B5A"], w: 530, h: 640 }, roll: R53, rapport: 64, match: "offset", price: 8450, washable: true, pop: 61 }),

    P("shalfey-light", { name: "Шалфей", tone: "Светлый", brand: "Rasch", coll: "Herbarium", type: "fliz", style: "botanic", color: "green", rooms: ["bedroom", "living", "kitchen"],
      pat: { gen: "botanica", c: ["#ECE7DC", "#8E9C7E", "#6F7F5E", "#B2BBA0"], w: 530, h: 530, seed: 11 }, roll: R53, rapport: 53, match: "straight", price: 2690, badges: ["hit"], pop: 96 }),
    P("shalfey-night", { name: "Шалфей", tone: "Ночь", brand: "Rasch", coll: "Herbarium", type: "fliz", style: "botanic", color: "dark", rooms: ["bedroom", "living"],
      pat: { gen: "botanica", c: ["#22302A", "#4F6B55", "#6E8A6F", "#A9B89E"], w: 530, h: 530, seed: 11 }, roll: R53, rapport: 53, match: "straight", price: 2690, old: 3590, badges: ["sale"], pop: 84 }),
    P("olive-branch", { name: "Оливковая ветвь", tone: "Песок", brand: "Marburg", coll: "Mediterraneo", type: "fliz", style: "botanic", color: "beige", rooms: ["kitchen", "living", "bedroom"],
      pat: { gen: "botanica", c: ["#F2EEE6", "#9A8F5E", "#B5AB7B", "#7E7650"], w: 530, h: 530, seed: 27, n: 12 }, roll: R53, rapport: 53, match: "straight", price: 3450, pop: 72 }),

    P("jungle-deep", { name: "Джунгли", tone: "Глубокий зелёный", brand: "A.S. Creation", coll: "Tropical Concrete", type: "fliz", style: "botanic", color: "green", rooms: ["living", "bedroom"],
      pat: { gen: "tropic", c: ["#1E2B24", "#2F4A3A", "#3E6049", "#56785E", "#7C9A7C"], w: 700, h: 700, seed: 5 }, roll: R106, rapport: 70, match: "straight", price: 4990, badges: ["new"], pop: 93 }),
    P("jungle-light", { name: "Джунгли", tone: "Утро", brand: "A.S. Creation", coll: "Tropical Concrete", type: "fliz", style: "botanic", color: "white", rooms: ["living", "bedroom", "kitchen"],
      pat: { gen: "tropic", c: ["#EFEAE0", "#BCC5AB", "#A3B092", "#CDD3BD"], w: 700, h: 700, seed: 5 }, roll: R106, rapport: 70, match: "straight", price: 4990, badges: ["new"], pop: 79 }),

    P("gatsby-emerald", { name: "Гэтсби", tone: "Изумруд", brand: "Loymina", coll: "Art Deco", type: "vinyl", style: "geometry", color: "green", rooms: ["living", "office", "hall"],
      pat: { gen: "deco", c: ["#1F2D2A", "#B8935A", "#233531"], w: 265, h: 132.5 }, roll: R106, rapport: 26.5, match: "straight", price: 9870, washable: true, badges: ["hit"], pop: 90 }),
    P("gatsby-ivory", { name: "Гэтсби", tone: "Слоновая кость", brand: "Loymina", coll: "Art Deco", type: "vinyl", style: "geometry", color: "gold", rooms: ["living", "bedroom", "hall"],
      pat: { gen: "deco", c: ["#EFE8DA", "#B08A50", "#E7DECD"], w: 265, h: 132.5 }, roll: R106, rapport: 26.5, match: "straight", price: 9870, washable: true, pop: 77 }),

    P("riviera-sand", { name: "Ривьера", tone: "Песок", brand: "Erismann", coll: "Cote d'Azur", type: "fliz", style: "modern", color: "beige", rooms: ["living", "bedroom", "hall", "office"],
      pat: { gen: "stripes", c: ["#EDE7DB", "#B9A88A", "#DCD0B9"], w: 530, h: 530 }, roll: R53, rapport: 0, match: "free", price: 2190, pop: 74 }),
    P("riviera-navy", { name: "Ривьера", tone: "Морской", brand: "Erismann", coll: "Cote d'Azur", type: "fliz", style: "modern", color: "blue", rooms: ["office", "living", "hall"],
      pat: { gen: "stripes", c: ["#1F2A3A", "#C6B68F", "#2B3A50"], w: 530, h: 530 }, roll: R53, rapport: 0, match: "free", price: 2190, old: 2990, badges: ["sale"], pop: 70 }),

    P("marrakesh-sand", { name: "Марракеш", tone: "Песок", brand: "Grandeco", coll: "Oriental Line", type: "vinyl", style: "oriental", color: "beige", rooms: ["living", "bedroom", "hall"],
      pat: { gen: "ogee", c: ["#E6DCCB", "#A07C4F", "#B38E5C"], w: 265, h: 350 }, roll: R53, rapport: 35, match: "straight", price: 3790, washable: true, pop: 75 }),
    P("marrakesh-teal", { name: "Марракеш", tone: "Бирюза", brand: "Grandeco", coll: "Oriental Line", type: "vinyl", style: "oriental", color: "blue", rooms: ["living", "office"],
      pat: { gen: "ogee", c: ["#1F4645", "#C4A46B", "#D8BE86"], w: 265, h: 350 }, roll: R53, rapport: 35, match: "straight", price: 3790, washable: true, badges: ["new"], pop: 82 }),

    P("herringbone-stone", { name: "Ёлочка", tone: "Камень", brand: "Erismann", coll: "Urban Basics", type: "fliz", style: "geometry", color: "grey", rooms: ["hall", "kitchen", "office"],
      pat: { gen: "chevron", c: ["#DCD4C6", "#CBC0AE", "#E6DFD3", "#B9AD98"], w: 210, h: 240, n: 4 }, roll: R53, rapport: 24, match: "straight", price: 1790, washable: true, pop: 66 }),

    P("linen-natural", { name: "Лён", tone: "Натуральный", brand: "Marburg", coll: "Natural Living", type: "fliz", style: "plain", color: "beige", rooms: ["living", "bedroom", "kitchen", "hall", "office", "kids"],
      pat: { gen: "linen", c: ["#E2D7C6"], w: 300, h: 300, seed: 7 }, roll: R106, rapport: 0, match: "free", price: 2350, washable: true, badges: ["hit"], pop: 99 }),
    P("linen-fog", { name: "Лён", tone: "Туман", brand: "Marburg", coll: "Natural Living", type: "fliz", style: "plain", color: "grey", rooms: ["living", "bedroom", "office", "hall"],
      pat: { gen: "linen", c: ["#CBC8C1"], w: 300, h: 300, seed: 8 }, roll: R106, rapport: 0, match: "free", price: 2350, washable: true, pop: 88 }),
    P("linen-sage", { name: "Лён", tone: "Шалфей", brand: "Marburg", coll: "Natural Living", type: "fliz", style: "plain", color: "green", rooms: ["bedroom", "living", "kitchen", "kids"],
      pat: { gen: "linen", c: ["#B7BEAA"], w: 300, h: 300, seed: 9 }, roll: R106, rapport: 0, match: "free", price: 2350, washable: true, pop: 85 }),
    P("linen-terracotta", { name: "Лён", tone: "Терракота", brand: "Marburg", coll: "Natural Living", type: "fliz", style: "plain", color: "terra", rooms: ["living", "kitchen", "bedroom"],
      pat: { gen: "linen", c: ["#BF8A6C"], w: 300, h: 300, seed: 10 }, roll: R106, rapport: 0, match: "free", price: 2350, washable: true, badges: ["new"], pop: 81 }),
    P("linen-graphite", { name: "Лён", tone: "Графит", brand: "Marburg", coll: "Natural Living", type: "fliz", style: "plain", color: "dark", rooms: ["office", "living", "bedroom"],
      pat: { gen: "linen", c: ["#4A4A47"], w: 300, h: 300, seed: 12 }, roll: R106, rapport: 0, match: "free", price: 2350, washable: true, pop: 73 }),
    P("rogozhka-milk", { name: "Рогожка", tone: "Молочный", brand: "Milassa", coll: "Casual", type: "fliz", style: "plain", color: "white", rooms: ["bedroom", "living", "kids", "hall"],
      pat: { gen: "linen", c: ["#EFE9DF", "#D9CFBF", "#FBF8F2"], w: 300, h: 300, seed: 14 }, roll: R106, rapport: 0, match: "free", price: 3190, washable: true, pop: 83 }),
    P("rogozhka-paint", { name: "Рогожка под покраску", tone: "Белый", brand: "Erismann", coll: "Paint Pro", type: "paint", style: "plain", color: "white", rooms: ["living", "bedroom", "kitchen", "hall", "office", "kids"],
      pat: { gen: "linen", c: ["#F2F0EB", "#DEDBD3", "#FFFFFF"], w: 300, h: 300, seed: 15 }, roll: [1.06, 25], rapport: 0, match: "free", price: 2790, paintable: true, pop: 68 }),

    P("venezia-ivory", { name: "Венеция", tone: "Слоновая кость", brand: "Zambaiti Parati", coll: "Stucco", type: "vinyl", style: "plain", color: "beige", rooms: ["living", "bedroom", "hall"],
      pat: { gen: "plaster", c: ["#D9CFC0"], w: 1000, h: 1000, amp: 0.14, seed: 4 }, roll: R106, rapport: 0, match: "free", price: 5490, washable: true, pop: 78 }),
    P("beton-loft", { name: "Бетон", tone: "Лофт", brand: "Grandeco", coll: "Urban", type: "vinyl", style: "modern", color: "grey", rooms: ["office", "hall", "kitchen", "living"],
      pat: { gen: "plaster", c: ["#A9A7A1"], w: 1000, h: 1000, amp: 0.2, seed: 9 }, roll: R53, rapport: 0, match: "free", price: 3290, washable: true, pop: 71 }),
    P("venezia-ochre", { name: "Венеция", tone: "Охра", brand: "Zambaiti Parati", coll: "Stucco", type: "vinyl", style: "plain", color: "yellow", rooms: ["living", "kitchen"],
      pat: { gen: "plaster", c: ["#C99A5E"], w: 1000, h: 1000, amp: 0.16, seed: 21 }, roll: R106, rapport: 0, match: "free", price: 5490, washable: true, pop: 62 }),

    P("peonies-blush", { name: "Пионы", tone: "Пудра", brand: "Rasch", coll: "Peonies", type: "fliz", style: "botanic", color: "pink", rooms: ["bedroom", "living"],
      pat: { gen: "peony", c: ["#F1ECE4", "#ECC3B8", "#C9796D", "#7E8C6C", "#9DAA88"], w: 530, h: 530, seed: 21 }, roll: R53, rapport: 53, match: "offset", price: 1900, badges: ["hit"], pop: 97 }),
    P("peonies-night", { name: "Пионы", tone: "Ночь", brand: "Rasch", coll: "Peonies", type: "fliz", style: "botanic", color: "dark", rooms: ["bedroom", "living"],
      pat: { gen: "peony", c: ["#1E2422", "#E3B3A5", "#B8675B", "#3F5244", "#56705A"], w: 530, h: 530, seed: 21 }, roll: R53, rapport: 53, match: "offset", price: 1900, pop: 87 }),

    P("chinoiserie-celadon", { name: "Шинуазри", tone: "Селадон", brand: "Sirpi", coll: "Jardin Chinois", type: "textile", style: "oriental", color: "green", rooms: ["bedroom", "living"],
      pat: { gen: "chinoiserie", c: ["#C9D6C8", "#6B5641", "#F4F1EA", "#E6C9C0", "#8BA38B"], w: 530, h: 700, seed: 8 }, roll: R53, rapport: 70, match: "offset", price: 7990, badges: ["new"], pop: 89 }),
    P("chinoiserie-indigo", { name: "Шинуазри", tone: "Индиго", brand: "Sirpi", coll: "Jardin Chinois", type: "textile", style: "oriental", color: "blue", rooms: ["bedroom", "living", "office"],
      pat: { gen: "chinoiserie", c: ["#22324A", "#B79A6A", "#F1EBDD", "#D9C3A0", "#5F7A86"], w: 530, h: 700, seed: 8 }, roll: R53, rapport: 70, match: "offset", price: 7990, pop: 76 }),

    P("rainbow-terra", { name: "Радуга", tone: "Терракота", brand: "A.S. Creation", coll: "Little Love", type: "fliz", style: "kids", color: "terra", rooms: ["kids"],
      pat: { gen: "arches", c: ["#F2EBE1", "#C98F6F", "#E2B88D", "#9CA88C", "#D8C6A8"], w: 265, h: 265, seed: 2 }, roll: R53, rapport: 26.5, match: "straight", price: 1590, badges: ["hit"], pop: 91 }),
    P("rainbow-pastel", { name: "Радуга", tone: "Пастель", brand: "A.S. Creation", coll: "Little Love", type: "fliz", style: "kids", color: "pink", rooms: ["kids"],
      pat: { gen: "arches", c: ["#EEF0EC", "#BFCCD2", "#E9CFC9", "#D2D9C2", "#EED9B6"], w: 265, h: 265, seed: 3 }, roll: R53, rapport: 26.5, match: "straight", price: 1590, pop: 80 }),
    P("starfall-night", { name: "Звездопад", tone: "Ночь", brand: "Rasch", coll: "Bambino", type: "fliz", style: "kids", color: "blue", rooms: ["kids", "bedroom"],
      pat: { gen: "stars", c: ["#2D3A4F", "#E9D9A8", "#C9B27A", "#DDE3EA"], w: 350, h: 350, seed: 31 }, roll: R53, rapport: 35, match: "straight", price: 1790, washable: true, pop: 78 }),
    P("starfall-milk", { name: "Звездопад", tone: "Молоко", brand: "Rasch", coll: "Bambino", type: "fliz", style: "kids", color: "white", rooms: ["kids"],
      pat: { gen: "stars", c: ["#F3EEE6", "#D9B99B", "#AFC1C9", "#E5C9C3"], w: 350, h: 350, seed: 33 }, roll: R53, rapport: 35, match: "straight", price: 1790, washable: true, badges: ["new"], pop: 74 }),

    P("terrazzo-milano", { name: "Терраццо", tone: "Милано", brand: "Grandeco", coll: "Materials", type: "vinyl", style: "modern", color: "white", rooms: ["kitchen", "hall", "kids"],
      pat: { gen: "terrazzo", c: ["#EEE8DF", "#C7826A", "#D9B58E", "#8F9C88", "#3E4A47"], w: 500, h: 500, seed: 13 }, roll: R53, rapport: 50, match: "free", price: 2990, old: 3790, washable: true, badges: ["sale"], pop: 76 }),

    P("optika-stone", { name: "Оптика", tone: "Камень", brand: "Marburg", coll: "Geometrics", type: "vinyl", style: "geometry", color: "grey", rooms: ["hall", "office", "living"],
      pat: { gen: "cubes", c: ["#DDD5C8", "#A99F8F", "#7D7464"], w: 180, h: 311.77 }, roll: R53, rapport: 31, match: "straight", price: 3390, washable: true, pop: 67 }),
    P("optika-forest", { name: "Оптика", tone: "Лес", brand: "Marburg", coll: "Geometrics", type: "vinyl", style: "geometry", color: "green", rooms: ["office", "hall"],
      pat: { gen: "cubes", c: ["#4C6A59", "#2C4336", "#7F9A86"], w: 180, h: 311.77 }, roll: R53, rapport: 31, match: "straight", price: 3390, washable: true, pop: 64 }),

    P("carrara", { name: "Каррара", tone: "Белый мрамор", brand: "Zambaiti Parati", coll: "Marmi", type: "vinyl", style: "modern", color: "white", rooms: ["kitchen", "hall", "bedroom", "living"],
      pat: { gen: "marble", c: ["#EEECE7", "#8E8C86"], w: 1000, h: 1000, seed: 6 }, roll: R106, rapport: 0, match: "free", price: 6290, washable: true, pop: 82 }),
    P("nero-marquina", { name: "Неро Маркина", tone: "Чёрный с золотом", brand: "Zambaiti Parati", coll: "Marmi", type: "vinyl", style: "modern", color: "dark", rooms: ["living", "office", "hall"],
      pat: { gen: "marble", c: ["#22221F", "#C9B78E"], w: 1000, h: 1000, seed: 16 }, roll: R106, rapport: 0, match: "free", price: 6290, washable: true, pop: 69 }),

    P("ginkgo-gold", { name: "Гинкго", tone: "Золото", brand: "Milassa", coll: "Ambient", type: "fliz", style: "oriental", color: "gold", rooms: ["bedroom", "living", "office"],
      pat: { gen: "ginkgo", c: ["#EFE9DE", "#C9A45C", "#B48C45", "#D8BE85"], w: 530, h: 530, seed: 41 }, roll: R106, rapport: 53, match: "straight", price: 3650, badges: ["new"], pop: 85 }),
    P("ginkgo-forest", { name: "Гинкго", tone: "Лесная палитра", brand: "Milassa", coll: "Ambient", type: "fliz", style: "oriental", color: "green", rooms: ["bedroom", "living", "office"],
      pat: { gen: "ginkgo", c: ["#2E3D33", "#B99657", "#8FA07E", "#C8AE72"], w: 530, h: 530, seed: 42 }, roll: R106, rapport: 53, match: "straight", price: 3650, badges: ["new"], pop: 83 }),

    P("fresco-mist", { name: "Горы в тумане", tone: "Рассвет", brand: "Decando", coll: "Фрески на заказ", type: "mural", style: "mural", color: "beige", rooms: ["bedroom", "living", "office"],
      pat: { gen: "mountains", c: ["#E9E2D6", "#CFC8BB", "#6E756C", "#F6E9D3"], w: 3200, h: 2700, seed: 17 }, roll: [3.2, 2.7], rapport: 0, match: "free", price: 3490, unit: "м²", badges: ["new"], pop: 88 }),
    P("fresco-dusk", { name: "Горы в тумане", tone: "Сумерки", brand: "Decando", coll: "Фрески на заказ", type: "mural", style: "mural", color: "blue", rooms: ["bedroom", "living", "office"],
      pat: { gen: "mountains", c: ["#5F6F78", "#77878D", "#1E2A2E", "#D8C49A"], w: 3200, h: 2700, seed: 19 }, roll: [3.2, 2.7], rapport: 0, match: "free", price: 3490, unit: "м²", pop: 79 })
  ];


  /* ---- атрибуты для SEO-фильтра. Значения — slug'и тегов старого decando.ru (см. _src/seo/facets.json).
     В демо-наборе считаются из type/style/color/rooms/рулона; у настоящего каталога attrs приходят из выгрузки. ---- */
  var A = {
    vid: { fliz: "flizelinovye", vinyl: "vinilovye-na-flizeline", paint: "pod-pokrasku", textile: "flizelinovye", mural: "fotooboi-i-panno" },
    pokr: { fliz: "bez-pokrytiya", vinyl: "vinilovoe", paint: "bez-pokrytiya", textile: "tekstilnoe", mural: "bez-pokrytiya" },
    risunok: { damask: ["damask"], botanica: ["rasteniya-vetki-listya-2"], tropic: ["rasteniya-vetki-listya-2"], deco: ["ar-deko", "geometricheskij-uzor"],
      stripes: ["polosy"], ogee: ["mavritanskaya-setka", "vostochnyj-risunok"], chevron: ["zigzag-elochka-2"], linen: ["odnotonnye", "tkan-imitatsiya-2"],
      plaster: ["odnotonnye", "shtukaturka-imitatsiya-2"], peony: ["tsvety", "tsvety-akvarelnye"], chinoiserie: ["v-stile-shinuazri", "ptitsy"],
      arches: ["geometricheskij-uzor", "dlya-malyshej"], stars: ["zvyozdochki-oblaka", "detskie-dlya-malchikov"], terrazzo: ["kamen-imitatsiya", "abstraktnyj-risunok"],
      cubes: ["geometricheskij-uzor", "kvadraty"], marble: ["kamen-imitatsiya"], mountains: ["syuzhetnyj-risunok"], ginkgo: ["rasteniya-vetki-listya-2", "vostochnyj-risunok"] },
    stil: { classic: ["klassika"], modern: ["sovremennyj-stil", "loft-shale-2"], botanic: ["skandinavskij", "sovremennyj-stil"], geometry: ["sovremennyj-stil", "modern"],
      plain: ["minimalizm"], kids: ["skandinavskij"], oriental: ["vostochnyj"], mural: ["sovremennyj-stil"] },
    stilByGen: { chinoiserie: ["shinuazri", "anglijskij"], ginkgo: ["dzhapandi"], deco: ["modern"], linen: ["minimalizm", "dzhapandi"], peony: ["provans"],
      plaster: ["loft-shale-2", "minimalizm"], stripes: ["anglijskij", "klassika"] },
    room: { living: ["gostinaya"], bedroom: ["spalnya"], kitchen: ["kuhnya"], kids: ["detskaya"], hall: ["prihozhaya", "koridor"], office: ["kabinet", "ofis"] },
    tsvet: { beige: "bezhevyj", white: "belyj", grey: "seryj", green: "zelenyj", blue: "sinij", pink: "rozovyj", terra: "korichnevyj", gold: "zolotoj", dark: "chernyj", yellow: "zheltyj" },
    strana: { "Германия": "germaniya", "Италия": "italiya", "Бельгия": "belgiya", "Россия": "rossiya" }
  };
  function uniq(a) { return a.filter(function (v, i) { return v && a.indexOf(v) === i; }); }
  function lum(hex) { var n = parseInt(hex.slice(1), 16); return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; }
  function numSlug(v) { return String(v).replace(".", "-"); }
  function attrsOf(p) {
    var a = {}, tip = [], rooms = [];
    a["vid-oboev"] = [A.vid[p.type]];
    a.pokrytie = [A.pokr[p.type]];
    a.risunok = (A.risunok[p.pat.gen] || []).slice();
    a.stil = uniq((A.stil[p.style] || []).concat(A.stilByGen[p.pat.gen] || []));
    p.rooms.forEach(function (r) { rooms = rooms.concat(A.room[r] || []); });
    a.pomeshhenie = uniq(rooms);
    a.tsvet = [A.tsvet[p.color]];
    a.ton = [lum(p.pat.c[0]) < 0.42 ? "temnye" : "svetlye"];
    if (p.type === "mural") tip.push("panno-fotooboi");
    else {
      tip.push(p.roll[0] >= 1 ? "rulonnye-1m" : "rulonnye-50-53-sm");
      if (p.washable) tip.push("moyushhiesya");
      if (p.type === "fliz" || p.type === "paint") tip.push("eko-oboi");
    }
    a["tip-oboev"] = tip;
    a.strana = uniq([A.strana[p.country]]);
    if (p.type !== "mural") {
      a.shirina = [numSlug(p.roll[0]) + "-m"]; a.dlina = [numSlug(p.roll[1]) + "-m"];
      if (p.rapport) a.rapport = [numSlug(p.rapport) + "-cm"];
    }
    return a;
  }

  var byId = {};
  products.forEach(function (p, i) {
    p.sku = "DC-" + String(1040 + i * 7).padStart(5, "0");
    /* на сайте показываем только бренд и артикул (просьба клиента); name/tone — служебные: варианты рисунка и поиск */
    p.title = p.brand + " · " + p.sku;
    p.country = F.brand[p.brand] || "";
    p.unit = p.unit || "рулон";
    p.about = ABOUT[p.pat.gen] || "";
    p.badges = p.badges || [];
    p.attrs = attrsOf(p);
    byId[p.id] = p;
  });

  function rub(n) { return Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ") + " ₽"; }
  function sizeLabel(p) {
    return p.type === "mural" ? "по размеру стены" : String(p.roll[0]).replace(".", ",") + " × " + String(p.roll[1]).replace(".", ",") + " м";
  }
  /* похожие: тот же рисунок в другой гамме + тот же стиль */
  function related(p, n) {
    var same = products.filter(function (q) { return q !== p && q.name === p.name; });
    var style = products.filter(function (q) { return q !== p && q.name !== p.name && q.style === p.style; });
    var rest = products.filter(function (q) { return q !== p && same.indexOf(q) < 0 && style.indexOf(q) < 0 && q.rooms.some(function (r) { return p.rooms.indexOf(r) >= 0; }); });
    return same.concat(style, rest.sort(function (a, b) { return b.pop - a.pop; })).slice(0, n || 8);
  }

  window.DC_DATA_DEMO = { products: products, byId: byId, F: F, rub: rub, sizeLabel: sizeLabel, related: related };
})();
