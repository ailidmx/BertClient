/**
 * ====== MEME GEN (memegen.link) ======
 * Génère une URL d'image meme à partir d'un template + top/bottom.
 */
const MemeGen = (() => {

  function safeLine_(s) {
    // memegen: "_" = vide ; "/" sépare lignes ; on encode pour URL
    const txt = String(s || "_").trim();
    const normalized = txt === "" ? "_" : txt.replaceAll("\n", "/");
    return encodeURIComponent(normalized);
  }

  function stripMd_(s) {
    // Pour éviter caractères Markdown/Telegram bizarres dans le rendu image
    return String(s || "").replace(/[*_`\[\]()]/g, "");
  }

  function url_(template, top, bottom) {
    const t = safeLine_(top);
    const b = safeLine_(bottom);

    // ✅ cache-buster: force une URL unique (évite cache Telegram/CDN)
    const cb = `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;

    return `https://api.memegen.link/images/${template}/${t}/${b}.png?cb=${cb}`;
  }

  function pickVentaTemplate_(productos) {
    const n = Math.max(0, Number(productos || 0));

    // Pools de templates (random)
    const POOLS = {
      hot: [
        "drake",
        "leo-toast",
        "keanu",
        "success",
        "nice",
        "stonks",
        "money",
        "oprah"
      ],
      small: [
        "awkward",
        "yodawg",
        "doge",
        "joker",
        "sad-biden",
        "angry",
        "bad",
        "matrix",
        "rollsafe",
        "wonka"
      ],
      mid: [
        "nice",
        "success",
        "kermit",
        "gru",
        "leo-toast",
        "disaster-girl",
        "drake",
        "keanu",
        "patrick",
        "spongebob"
      ],
      big: [
        "stonks",
        "oprah",
        "this-is-fine",
        "money",
        "elon",
        "futurama-fry",
        "joker2",
        "pikachu",
        "trump",
        "toy-story"
      ]
    };

    // 🎯 Thresholds
    if (n >= 1 && n <= 5) {
      return Math.random() < 0.2
        ? Utils.pick(POOLS.hot)
        : Utils.pick(POOLS.small);
    }

    // 6–9 -> transition (50/50)
    if (n >= 6 && n <= 9) {
      return Math.random() < 0.5
        ? Utils.pick(POOLS.small)
        : Utils.pick(POOLS.mid);
    }

    if (n >= 10 && n <= 15) {
      return Math.random() < 0.35
        ? Utils.pick(POOLS.hot)
        : Utils.pick(POOLS.mid);
    }

    // > 15
    return Math.random() < 0.5
      ? Utils.pick(POOLS.hot)
      : Utils.pick(POOLS.big);
  }

  function pickCierreTemplate_(state) {
    const POOLS = {
      ok: ["success", "nice", "leo-toast", "stonks", "money", "oprah", "keanu", "drake"],
      missing: ["this-is-fine", "sad-biden", "awkward", "joker", "gru", "disaster-girl", "bad"],
      descanso: ["kermit", "doge", "awkward", "rollsafe", "wonka"]
    };

    // un peu de random cross-pool pour varier
    if (state === 'missing' && Math.random() < 0.15) return Utils.pick(POOLS.ok);
    if (state === 'ok' && Math.random() < 0.10) return Utils.pick(POOLS.missing);

    return Utils.pick(POOLS[state] || POOLS.missing);
  }

  function formatFechaMeme_(date) {
    const dias = ['Dom.', 'Lu.', 'Ma.', 'Mi.', 'Ju.', 'Vi.', 'Sa.'];
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const d = date.getDay();
    const day = date.getDate();
    const m = date.getMonth();

    return `${dias[d]} ${day} ${meses[m]}`;
  }

  function buildCierreMeme_(now, cal, kpi, state) {
    const template = pickCierreTemplate_(state);

    const d = formatFechaMeme_(now);

    const topMap = {
      ok: `CIERRE OK ${d}`,
      missing: `CIERRE PENDIENTE ${d}`,
      descanso: `DESCANSO ${d}`,
    };

    const top = topMap[state] || `CIERRE ${d}`;

    const caja = Utils.roundInt(cal?.ventasCaja || 0);
    const form = Utils.roundInt(kpi?.sold || 0);
    const goal = Utils.roundInt(cal?.obj || kpi?.goal || 0);

    const bottom = goal > 0
      ? `CAJA ${caja} | REG ${form} | OBJ ${goal}`
      : `CAJA ${caja} | REG ${form}`;

    return url_(template, top, bottom);
  }

  function buildAperturaMeme_(now, cal, kpi, month, punch) {
    const template = Utils.pick(['nice', 'success', 'drake', 'leo-toast', 'keanu', 'spongebob', 'gru']);
    const d = formatFechaMeme_(now);

    const goal = Utils.roundInt(cal?.obj || kpi?.goal || 0);
    const monthObj = Utils.roundInt(month?.obj || 0);
    const monthCaja = Utils.roundInt(month?.ventasCaja || 0);
    const pctMonth = monthObj > 0 ? Math.round((monthCaja / monthObj) * 100) : 0;

    const top = `APERTURA ${d}`;
    const bottom = punch
      ? stripMd_(punch).slice(0, 90)
      : (monthObj > 0
        ? `HOY ${goal} | CUMUL ${monthCaja}/${monthObj} (${pctMonth}%)`
        : `HOY ${goal}`);

    return url_(template, top, bottom);
  }

  function buildGoalReachedMeme_(now, kpi) {
    const templates = [
      'success',
      'nice',
      'oprah',
      'stonks',
      'money',
      'this-is-fine',
      'leo-toast',
      'drake',
      'keanu',
      'pikachu'
    ];
    const template = Utils.pick(templates);
    const d = formatFechaMeme_(now);

    const sold = Utils.roundInt(kpi.sold || 0);
    const goal = Utils.roundInt(kpi.goal || 0);
    const pct = goal > 0 ? `${Math.round((sold / goal) * 100)}%` : '';
    const bonus = Math.max(0, sold - goal);

    const top = `OBJ SUPERADO ${d}`;
    const bottom = goal > 0
      ? `HOY ${sold}/${goal} (${pct}) +${bonus}`
      : `HOY ${sold}`;

    return url_(template, top, bottom);
  }



  /**
   * punch (optionnel) : si fourni => utilisé comme bottom (court)
   */
  function buildVentaMeme_(venta, kpi, punch) {
    const template = pickVentaTemplate_(venta.productos);

    // TOP/BOTTOM courts = lisibles
    const top = `VENTA +${venta.productos}`;

    const pct = kpi.goal > 0 ? `${Math.round(kpi.pct * 100)}%` : "";
    const fallback = kpi.goal > 0
      ? `HOY ${kpi.sold}/${kpi.goal} (${pct})`
      : `VAMOS 💪`;

    const bottom = punch
      ? stripMd_(punch).slice(0, 90)
      : fallback;

    return url_(template, top, bottom);
  }

  return {  url_, buildVentaMeme_, buildCierreMeme_, buildAperturaMeme_, buildGoalReachedMeme_ };
})();
