/**
 * ====== DOMAIN: VENTAS ======
 * - Parse vente depuis event
 * - KPI du jour (obj, vendu, manque, cadence)
 * - ⚠️ Calendario est lu UNIQUEMENT via module Calendario (source unique)
 * - Somme ventes du jour depuis sheet Form
 * - Buckets horaires depuis Form
 */
const Ventas = (() => {

  function parseVentaFromEvent_(e) {
    const data = SheetsRepo.toNamedObjectFromEvent_(e);

    const vendedor = data[CFG.COLS.FORM.VENDEDOR] || 'Alguien misterioso';
    const productos = Math.max(1, Utils.toNumber(data[CFG.COLS.FORM.CANT]));
    const pago = data[CFG.COLS.FORM.PAGO] || '';
    const comentario = data[CFG.COLS.FORM.COMENTARIO] || '';
    const gratis = Utils.toNumber(data[CFG.COLS.FORM.GRATIS]);
    const gratisPromo2 = Utils.toNumber(data[CFG.COLS.FORM.GRATIS_PROMO2]);

    return { vendedor, productos, pago, comentario, gratis, gratisPromo2 };
  }

  function getCalendarioRowForDate_(now) {
    const cal = Calendario.getRowForDate_(now);
    return cal || { obj: 0, gap: 0, pctSheet: '', pd: '', dia: '', artVendidos: 0, ventasRegistradas: 0, ventasCaja: 0, canasta: 0, abierto: true };
  }

  function getTodaySalesFromForm_(now) {
    const rows = SheetsRepo.getRows_(CFG.SHEETS.FORM_VENTAS);
    if (rows.length < 2) return 0;

    const headers = rows[0];
    const idxTs = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.FORM.TS);
    const idxQ  = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.FORM.CANT);

    const key = Utils.dateKeyMX(now);
    let sum = 0;

    for (let i = 1; i < rows.length; i++) {
      const ts = rows[i][idxTs];
      if (!ts) continue;

      const d = Utils.asDate(ts);
      if (Utils.dateKeyMX(d) === key) sum += Utils.toNumber(rows[i][idxQ]);
    }
    return sum;
  }

  function getTodayGratisFromForm_(now) {
    const rows = SheetsRepo.getRows_(CFG.SHEETS.FORM_VENTAS);
    if (rows.length < 2) return 0;

    const headers = rows[0];
    const idxTs = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.FORM.TS);
    const idxGratis = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.FORM.GRATIS);
    const idxGratisPromo2 = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.FORM.GRATIS_PROMO2);
    if (idxGratis == null && idxGratisPromo2 == null) return 0;

    const key = Utils.dateKeyMX(now);
    let sum = 0;

    for (let i = 1; i < rows.length; i++) {
      const ts = rows[i][idxTs];
      if (!ts) continue;

      const d = Utils.asDate(ts);
      if (Utils.dateKeyMX(d) === key) {
        if (idxGratis != null) {
          sum += Utils.toNumber(rows[i][idxGratis]);
        }
        if (idxGratisPromo2 != null) {
          sum += Utils.toNumber(rows[i][idxGratisPromo2]) * 2;
        }
      }
    }
    return sum;
  }

  function getTodayVentasCountFromForm_(now) {
    const rows = SheetsRepo.getRows_(CFG.SHEETS.FORM_VENTAS);
    if (rows.length < 2) return 0;

    const headers = rows[0];
    const idxTs = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.FORM.TS);

    const key = Utils.dateKeyMX(now);
    let count = 0;

    for (let i = 1; i < rows.length; i++) {
      const ts = rows[i][idxTs];
      if (!ts) continue;

      const d = Utils.asDate(ts);
      if (Utils.dateKeyMX(d) === key) count += 1;
    }

    return count;
  }

  function computeKpiDiario_(now) {
    const cal = getCalendarioRowForDate_(now);

    const goal = Utils.roundInt(cal.obj);
    const sold = Utils.roundInt(getTodaySalesFromForm_(now));
    const gratis = Utils.roundInt(getTodayGratisFromForm_(now));
    const ventasCount = Utils.roundInt(getTodayVentasCountFromForm_(now));
    const canastaProm = ventasCount > 0
      ? (sold / ventasCount)
      : Utils.toNumber(cal.canasta || 0);

    const pct = (goal > 0) ? (sold / goal) : 0;
    const missing = Math.max(0, goal - sold);

    const close = Utils.getClosingTime(now);
    const minsLeft = Math.max(0, Utils.minutesBetween(now, close));
    const hrsLeft = minsLeft / 60;

    const pacePerHour = (hrsLeft > 0) ? (missing / hrsLeft) : missing;
    const paceInt = Math.ceil(pacePerHour);

    return {
      goal,
      sold,
      pct,
      missing,
      close,
      minsLeft,
      pacePerHour: paceInt,

      gap: Utils.roundInt(cal.gap),
      pctSheet: cal.pctLive || cal.pctSheet,
      pd: cal.pd,
      dia: cal.dia,

      ventasCal: Utils.roundInt(cal.artVendidos || cal.ventas || 0),
      ventasRegistradas: Utils.roundInt(cal.ventasRegistradas || 0),
      ventasCount: ventasCount,
      gratis: gratis,
      canastaProm: canastaProm,
      canasta: Utils.roundInt(cal.canasta || 0),
      ventasCaja: Utils.roundInt(cal.ventasCaja || 0),
      abierto: cal.abierto
    };
  }

  function getHourlyBucketsFromForm_(now, opts = {}) {
    const key = Utils.dateKeyMX(now);
    return getHourlyBucketsForRange_(key, key, opts);
  }

  function getHourlyBucketsForRange_(fromKey, toKey, opts = {}) {
    const rows = SheetsRepo.getRows_(CFG.SHEETS.FORM_VENTAS);
    if (rows.length < 2) return defaultBuckets_(opts);

    const headers = rows[0];
    const idxTs = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.FORM.TS);
    const idxQ  = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.FORM.CANT);

    const startH = Number(opts.startHour ?? 8);
    const endH   = Number(opts.endHour ?? 21);

    const map = initHourlyMap_(startH, endH);

    for (let i = 1; i < rows.length; i++) {
      const ts = rows[i][idxTs];
      if (!ts) continue;

      const d = Utils.asDate(ts);
      const key = Utils.dateKeyMX(d);
      if (key < fromKey || key > toKey) continue;

      const hour = Number(Utilities.formatDate(d, CFG.TZ, 'HH'));
      const label = String(hour).padStart(2,'0');
      if (!map[label]) continue;

      map[label].ventas += 1;
      map[label].productos += Utils.toNumber(rows[i][idxQ]);
    }

    return Object.keys(map).sort().map(k => map[k]);
  }

  function countActiveDaysInRange_(fromKey, toKey) {
    const rows = SheetsRepo.getRows_(CFG.SHEETS.FORM_VENTAS);
    if (rows.length < 2) return 0;

    const headers = rows[0];
    const idxTs = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.FORM.TS);

    const days = {};
    for (let i = 1; i < rows.length; i++) {
      const ts = rows[i][idxTs];
      if (!ts) continue;

      const d = Utils.asDate(ts);
      const key = Utils.dateKeyMX(d);
      if (key < fromKey || key > toKey) continue;
      days[key] = true;
    }

    return Object.keys(days).length;
  }

  function getVentasCountInLastMinutes_(now, minutes) {
    const rows = SheetsRepo.getRows_(CFG.SHEETS.FORM_VENTAS);
    if (rows.length < 2) return 0;

    const headers = rows[0];
    const idxTs = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.FORM.TS);

    const since = new Date(now.getTime() - minutes * 60 * 1000);
    let count = 0;

    for (let i = 1; i < rows.length; i++) {
      const ts = rows[i][idxTs];
      if (!ts) continue;
      const d = Utils.asDate(ts);
      if (d >= since && d <= now) count += 1;
    }

    return count;
  }

  function initHourlyMap_(startH, endH) {
    const map = {};
    for (let h = startH; h <= endH; h++) {
      const label = String(h).padStart(2, '0');
      map[label] = { label, ventas: 0, productos: 0 };
    }
    return map;
  }

  function defaultBuckets_(opts = {}) {
    const startH = Number(opts.startHour ?? 8);
    const endH   = Number(opts.endHour ?? 21);
    const out = [];
    for (let h = startH; h <= endH; h++) {
      out.push({ label: String(h).padStart(2,'0'), ventas: 0, productos: 0 });
    }
    return out;
  }

  function getProductCatalog_() {
    const rows = SheetsRepo.getRows_(CFG.SHEETS.GENERAL);
    if (rows.length < 2) return [];
    const headers = rows[0];
    const idxArticulo = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.GENERAL.ARTICULO);
    const idxCategoria = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.GENERAL.CATEGORIA);
    const idxFoto = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.GENERAL.FOTO_URL);

    const list = [];
    for (let i = 1; i < rows.length; i++) {
      const articulo = rows[i][idxArticulo];
      const categoria = rows[i][idxCategoria];
      const fotoUrl = idxFoto != null ? rows[i][idxFoto] : '';
      if (!articulo) continue;
      list.push({
        articulo: String(articulo),
        categoria: String(categoria || 'Sin categoría'),
        fotoUrl: fotoUrl ? String(fotoUrl) : ''
      });
    }
    return list;
  }

  return {
    parseVentaFromEvent_,
    computeKpiDiario_,
    getHourlyBucketsFromForm_, // ✅
    getHourlyBucketsForRange_, // ✅ comparatifs
    countActiveDaysInRange_,    // ✅ jours actifs
    getVentasCountInLastMinutes_,
    defaultBuckets_,           // optionnel
    getProductCatalog_
  };
})();
