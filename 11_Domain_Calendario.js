// 11_Domain_Calendario
const Calendario = (() => {

  function getRowForDate_(now) {
    const rows = SheetsRepo.getRows_(CFG.SHEETS.CALENDARIO);
    if (rows.length < 2) return null;

    const headerRow = detectHeaderRowByKeywords_(rows, ['FECHA', 'Fecha', 'Día', 'Dia', 'FECHA MX']);
    const headers = rows[headerRow - 1];

    const idxFecha   = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.CAL.FECHA);
    const idxObj     = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.OBJ);
    const idxArt     = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.ART_VENDIDOS);
    const idxVentas  = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.VENTAS);
    const idxCaja    = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.VENTAS_CAJA);
    const idxCanasta = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.CANASTA);
    const idxAbierto = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.ABIERTO);

    const idxGap     = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.GAP);
    const idxPct     = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.PCT);
    const idxPctCaja = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.PCT_CAJA);

    const idxRed    = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.PD_RED);
    const idxOrange = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.PD_ORANGE);
    const idxGreen  = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.PD_GREEN);
    const idxStar   = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.PD_STAR);
    const idxDia    = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.DIA);
    const idxDiaMes = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.DIA_MES);
    const idxDiasMes = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.DIAS_MES);
    const idxPctMes = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.PCT_MES);
    const idxCumulMes = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.CUMUL_MES);
    const idxObjMes = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.OBJ_MES);
    const idxRitmoVenta = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.RITMO_VENTA_M);
    const idxGratisDia = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.GRATIS_DIA);
    const idxGratisMes = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.GRATIS_MES);
    const idxGratisDiaPromo2 = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.GRATIS_DIA_PROMO2);
    const idxGratisMesPromo2 = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.GRATIS_MES_PROMO2);

    const key = Utils.dateKeyMX(now);

    for (let i = headerRow; i < rows.length; i++) {
      const rawDate = rows[i][idxFecha];
      if (!rawDate) continue;

      const d = Utils.asDate(rawDate);
      if (Utils.dateKeyMX(d) !== key) continue;

      const abiertoRaw = (idxAbierto != null) ? rows[i][idxAbierto] : true;

      const pdStar   = idxStar   != null ? rows[i][idxStar]   : '';
      const pdGreen  = idxGreen  != null ? rows[i][idxGreen]  : '';
      const pdOrange = idxOrange != null ? rows[i][idxOrange] : '';
      const pdRed    = idxRed    != null ? rows[i][idxRed]    : '';
      const pd = pdStar || pdGreen || pdOrange || pdRed || '';

      return {
        fecha: d,
        obj: idxObj != null ? rows[i][idxObj] : 0,
        gap: idxGap != null ? rows[i][idxGap] : '',
        // %Obj live (VENTAS)
        pctLive: idxPct != null ? rows[i][idxPct] : '',
        // %Obj C. (CAJA)
        pctCaja: idxPctCaja != null ? rows[i][idxPctCaja] : '',
        // volumes
        artVendidos: idxArt != null ? rows[i][idxArt] : 0,
        ventasRegistradas: idxVentas != null ? rows[i][idxVentas] : 0,
        ventasCaja: idxCaja != null ? rows[i][idxCaja] : 0,
        canasta: idxCanasta != null ? rows[i][idxCanasta] : 0,
        // meta
        abierto: parseBool_(abiertoRaw, true),
        pd,
        dia: idxDia != null ? rows[i][idxDia] : '',
        diaMes: idxDiaMes != null ? rows[i][idxDiaMes] : '',
        diasMes: idxDiasMes != null ? rows[i][idxDiasMes] : '',
        pctMes: idxPctMes != null ? rows[i][idxPctMes] : '',
        cumulMes: idxCumulMes != null ? rows[i][idxCumulMes] : 0,
        objMes: idxObjMes != null ? rows[i][idxObjMes] : 0,
        ritmoVentaMes: idxRitmoVenta != null ? rows[i][idxRitmoVenta] : '',
        gratisDia: idxGratisDia != null ? rows[i][idxGratisDia] : 0,
        gratisMes: idxGratisMes != null ? rows[i][idxGratisMes] : 0,
        gratisDiaPromo2: idxGratisDiaPromo2 != null ? rows[i][idxGratisDiaPromo2] : 0,
        gratisMesPromo2: idxGratisMesPromo2 != null ? rows[i][idxGratisMesPromo2] : 0
      };
    }

    return null;
  }

  function parseBool_(v, def) {
    if (v === true || v === false) return v;
    const s = String(v || '').trim().toLowerCase();
    if (['true','verdadero','1','si','sí','y','yes'].includes(s)) return true;
    if (['false','falso','0','no','n'].includes(s)) return false;
    return def;
  }

  function getMonthTotals_(now) {
    const rows = SheetsRepo.getRows_(CFG.SHEETS.CALENDARIO);
    if (rows.length < 2) {
      return { obj: 0, ventasCaja: 0, dias: 0, pctMes: '' };
    }

    const headerRow = detectHeaderRowByKeywords_(rows, ['FECHA', 'Fecha', 'Día', 'Dia', 'FECHA MX']);
    const headers = rows[headerRow - 1];
    const idxFecha = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.CAL.FECHA);
    const idxObj = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.OBJ);
    const idxCaja = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.VENTAS_CAJA);
    const idxAbierto = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.ABIERTO);
    const idxCumulMes = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.CUMUL_MES);
    const idxObjMes = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.OBJ_MES);
    const idxPctMes = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.PCT_MES);
    const idxGratisMes = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.GRATIS_MES);
    const idxGratisMesPromo2 = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.GRATIS_MES_PROMO2);

    const base = Utils.asDate(now);
    const start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59);
    const todayKey = Utils.dateKeyMX(base);

    let totalObj = 0;
    let totalCaja = 0;
    let dias = 0;

    for (let i = headerRow; i < rows.length; i++) {
      const rawDate = rows[i][idxFecha];
      if (!rawDate) continue;
      const d = Utils.asDate(rawDate);
      if (d < start || d > end) continue;

      if (idxCumulMes != null && idxObjMes != null) {
        if (Utils.dateKeyMX(d) !== todayKey) continue;
        const cumul = Utils.roundInt(Utils.toMoneyNumber(rows[i][idxCumulMes]));
        const objMes = Utils.roundInt(Utils.toMoneyNumber(rows[i][idxObjMes]));
        const pctMes = idxPctMes != null ? rows[i][idxPctMes] : '';
        const gratisMes = idxGratisMes != null ? rows[i][idxGratisMes] : 0;
        const gratisMesPromo2 = idxGratisMesPromo2 != null ? rows[i][idxGratisMesPromo2] : 0;

        return {
          obj: objMes,
          ventasCaja: cumul,
          dias: 0,
          pctMes,
          gratisMes,
          gratisMesPromo2
        };
      }

      const abiertoRaw = idxAbierto != null ? rows[i][idxAbierto] : true;
      if (!parseBool_(abiertoRaw, true)) continue;

      dias += 1;
      totalObj += Utils.toNumber(idxObj != null ? rows[i][idxObj] : 0);
      totalCaja += Utils.toNumber(idxCaja != null ? rows[i][idxCaja] : 0);
    }

    return {
      obj: Utils.roundInt(totalObj),
      ventasCaja: Utils.roundInt(totalCaja),
      dias,
      pctMes: '',
      gratisMes: 0,
      gratisMesPromo2: 0
    };
  }

  function isFirstWorkingDay_(now) {
    const cal = getRowForDate_(now);
    if (!cal) return false;
    if (!cal.abierto) return false;
    if (!cal.fecha) return false;
    const date = Utils.asDate(cal.fecha);
    if (date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) return false;
    const diaMes = parseNumericDay_(cal.diaMes);
    return diaMes === 1;
  }

  function isLastWorkingDay_(now) {
    const cal = getRowForDate_(now);
    if (!cal) return false;
    if (!cal.abierto) return false;
    if (!cal.fecha) return false;
    const date = Utils.asDate(cal.fecha);
    if (date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) return false;
    const diaMes = parseNumericDay_(cal.diaMes);
    const diasMes = parseNumericDay_(cal.diasMes);
    if (!diaMes || !diasMes) return false;
    return diaMes === diasMes;
  }

  function parseNumericDay_(value) {
    if (value == null || value === '') return 0;
    const raw = String(value).trim();
    const match = raw.match(/\d+/);
    if (!match) return 0;
    const num = Number(match[0]);
    return Number.isFinite(num) ? num : 0;
  }

  function detectHeaderRowByKeywords_(rows, keywords) {
    const MAX_SCAN = Math.min(20, rows.length);
    const KEYWORDS = (keywords || []).map(k => String(k).toUpperCase());
    let bestRow = 1;
    let bestScore = -1;
    for (let r = 0; r < MAX_SCAN; r++) {
      const row = rows[r];
      let nonEmpty = 0;
      let hits = 0;
      row.forEach(cell => {
        if (cell !== '' && cell != null) nonEmpty++;
        const val = String(cell || '').toUpperCase();
        KEYWORDS.forEach(k => {
          if (val.indexOf(k) >= 0) hits++;
        });
      });
      if (nonEmpty < 3 || hits === 0) continue;
      const score = nonEmpty + hits * 5;
      if (score > bestScore) {
        bestScore = score;
        bestRow = r + 1;
      }
    }
    return bestRow;
  }

  return { getRowForDate_, getMonthTotals_, isFirstWorkingDay_, isLastWorkingDay_ };
})();
