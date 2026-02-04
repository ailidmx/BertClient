// 70_Charts_CRM
const CRM_Charts = (() => {

  // QuickChart: forcer Chart.js v3 (sinon erreurs "Cannot read properties of undefined (reading 'options')")
  const QUICKCHART_VERSION = '3';

  function sendDailyHourly_(now, topicKey = 'CIERRE', opts = {}) {
    const period = String(opts.period || 'day');
    const compare = period === 'compare';

    const ranges = buildHourlyRanges_(now, compare ? 'forever' : period);
    const series = ranges.map(r => ({
      label: r.label,
      days: r.days,
      activeDays: Ventas.countActiveDaysInRange_(r.fromKey, r.toKey),
      buckets: Ventas.getHourlyBucketsForRange_(r.fromKey, r.toKey, r.opts)
    }));

    const caption = sanitizeCaption_(`Ventas hora (${period}) - ${Utils.formatDateMX(now)}`);
    try {
      const blob = buildHourlyComparisonChartBlob_(now, series, { period, compare });
      const url = buildHourlyComparisonChartUrl_(now, series, { period, compare });
      sendChartUrlOrBlob_(topicKey, url, blob, caption);
    } catch (err) {
      Utils.debug_('sendDailyHourly_ chart error', err && err.stack ? err.stack : err);
      Telegram.sendTextToTopic_(topicKey, `${caption} (sin chart)`);
    }
  }

  function sendDailyHourlyToChat_(now, chatId, opts = {}) {
    if (!chatId) return;
    const period = String(opts.period || 'day');
    const compare = period === 'compare';

    const ranges = buildHourlyRanges_(now, compare ? 'forever' : period);
    const series = ranges.map(r => ({
      label: r.label,
      days: r.days,
      activeDays: Ventas.countActiveDaysInRange_(r.fromKey, r.toKey),
      buckets: Ventas.getHourlyBucketsForRange_(r.fromKey, r.toKey, r.opts)
    }));

    const caption = sanitizeCaption_(`Ventas hora (${period}) - ${Utils.formatDateMX(now)}`);
    try {
      const blob = buildHourlyComparisonChartBlob_(now, series, { period, compare });
      const url = buildHourlyComparisonChartUrl_(now, series, { period, compare });
      sendChartUrlOrBlobToChat_(chatId, url, blob, caption);
    } catch (err) {
      Utils.debug_('sendDailyHourlyToChat_ chart error', err && err.stack ? err.stack : err);
      Telegram.sendTextToChat_(chatId, `${caption} (sin chart)`);
    }
  }

  function quickChartPngBlob_(chartConfig, width, height) {
    validateChartConfig_(chartConfig);
    const cleanConfig = sanitizeChartConfig_(chartConfig);
    Utils.debug_('QuickChart config', cleanConfig);
    const url = 'https://quickchart.io/chart';

    const body = {
      version: QUICKCHART_VERSION,
      width: width || 900,
      height: height || 500,
      format: 'png',
      chart: {
        type: cleanConfig.type,
        data: cleanConfig.data,
        options: cleanConfig.options
      },
      backgroundColor: 'white'
    };

    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
      followRedirects: true,
    });

    const code = res.getResponseCode();
    if (code !== 200) {
      const svgError = quickChartErrorAsSvg_(body);
      if (svgError && isQuickChartError_(svgError)) {
        Utils.debug_('QuickChart POST failed (svg error)', svgError);
        throw new Error(`QuickChart POST failed (${code}). ${svgError}`);
      }

      const imgBlob = extractImageBlobIfAny_(res);
      if (imgBlob) {
        Utils.debug_('QuickChart non-200 but image returned', { code, contentType: getContentType_(res) });
        return imgBlob.setName(`chart_${Date.now()}.png`);
      }

      const txt = safeText_(res);
      const detail = svgError ? ` | SVG=${svgError}` : '';
      Utils.debug_('QuickChart POST failed', { code, txt, detail });
      throw new Error(`QuickChart POST failed (${code}). ${txt}${detail}`);
    }

    const blob = res.getBlob();
    return blob.setName(`chart_${Date.now()}.png`);
  }

  function quickChartUrl_(chartConfig, width, height) {
    validateChartConfig_(chartConfig);
    const cleanConfig = sanitizeChartConfig_(chartConfig);
    const payload = {
      version: QUICKCHART_VERSION,
      width: width || 900,
      height: height || 500,
      format: 'png',
      backgroundColor: 'white',
      chart: {
        type: cleanConfig.type,
        data: cleanConfig.data,
        options: cleanConfig.options
      }
    };

    const encoded = encodeURIComponent(JSON.stringify(payload));
    const url = `https://quickchart.io/chart?c=${encoded}`;
    if (url.length <= 1800) return url;

    const shortUrl = quickChartShortUrl_(payload);
    return shortUrl || null;
  }

  function quickChartShortUrl_(payload) {
    try {
      const res = UrlFetchApp.fetch('https://quickchart.io/chart/create', {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() !== 200) return null;
      const data = JSON.parse(res.getContentText() || '{}');
      return data && data.url ? String(data.url) : null;
    } catch (err) {
      Utils.debug_('quickChartShortUrl error', err);
      return null;
    }
  }

  function validateChartConfig_(chartConfig) {
    Utils.assert(chartConfig && chartConfig.type, 'QuickChart: missing chart.type');
    Utils.assert(chartConfig.data && chartConfig.data.labels, 'QuickChart: missing data.labels');
    Utils.assert(Array.isArray(chartConfig.data.datasets), 'QuickChart: data.datasets must be array');
    try {
      JSON.stringify(chartConfig);
    } catch (e) {
      throw new Error('QuickChart: chartConfig is not serializable');
    }
  }

  function sanitizeChartConfig_(chartConfig) {
    const safe = JSON.parse(JSON.stringify(chartConfig));
    safe.data = safe.data || {};
    safe.data.labels = (safe.data.labels || []).map(l => String(l));
    safe.data.datasets = (safe.data.datasets || []).map(ds => {
      const clean = ds || {};
      if (Array.isArray(clean.data)) {
        clean.data = clean.data.map(v => {
          const n = Number(v);
          return isFinite(n) ? n : 0;
        });
      }
      if (typeof clean.label !== 'undefined') {
        clean.label = String(clean.label);
      }
      return clean;
    });
    return safe;
  }

  function safeText_(res) {
    try {
      const ct = getContentType_(res);
      if (ct.indexOf('image/') === 0) return `image response (${ct})`;
      const t = res.getContentText();
      return t ? t.slice(0, 500) : '';
    } catch (e) {
      return '';
    }
  }

  function isQuickChartError_(svgText) {
    const t = String(svgText || '').toLowerCase();
    return t.indexOf('error') >= 0 || t.indexOf('typeerror') >= 0 || t.indexOf('cannot read') >= 0;
  }

  function getContentType_(res) {
    try {
      const headers = res.getHeaders ? res.getHeaders() : {};
      return String(headers['Content-Type'] || headers['content-type'] || '').toLowerCase();
    } catch (e) {
      return '';
    }
  }

  function extractImageBlobIfAny_(res) {
    try {
      const ct = getContentType_(res);
      if (ct.indexOf('image/') !== 0 && ct.indexOf('application/octet-stream') < 0) return null;
      const blob = res.getBlob();
      const bytes = blob.getBytes();
      if (!bytes || !bytes.length) return null;
      return blob;
    } catch (e) {
      return null;
    }
  }

  function quickChartErrorAsSvg_(body) {
    try {
      const payload = JSON.stringify(Object.assign({}, body, { format: 'svg' }));
      const res = UrlFetchApp.fetch('https://quickchart.io/chart', {
        method: 'post',
        contentType: 'application/json',
        payload: payload,
        muteHttpExceptions: true
      });
      const code = res.getResponseCode();
      const txt = res.getContentText();
      if (code >= 400) return txt ? txt.slice(0, 500) : '';
      return txt ? txt.slice(0, 500) : '';
    } catch (e) {
      return '';
    }
  }

  // ---------- QuickChart (POST -> PNG blob) ----------
  function buildHourlyComparisonChartBlob_(now, series, opts = {}) {
    const labels = series[0].buckets.map(b => b.label);
    const compare = !!opts.compare;

    const normalized = normalizeSeries_(series);
    const averaged = applyDailyAverage_(normalized);

    const datasets = [];
    averaged.forEach((s) => {
      datasets.push({
        type: compare ? 'bar' : 'line',
        label: s.label,
        data: s.buckets.map(b => Number(b.productos || 0)),
        fill: false,
        tension: 0.25,
        pointRadius: compare ? 0 : 2,
        borderWidth: compare ? 0 : 2,
        backgroundColor: compare ? s.color : undefined,
        borderColor: compare ? s.color : undefined,
        yAxisID: 'y'
      });

      datasets.push({
        type: 'line',
        label: `${s.label} (ventas)`,
        data: s.buckets.map(b => Number(b.ventas || 0)),
        fill: false,
        tension: 0.25,
        pointRadius: compare ? 0 : 2,
        borderWidth: 1,
        borderDash: [4, 3],
        backgroundColor: compare ? fadedColor_(s.color, 0.35) : undefined,
        borderColor: compare ? fadedColor_(s.color, 0.6) : undefined,
        yAxisID: 'y1'
      });
    });

    const title = `Ventas por hora - ${Utils.formatDateMX(now)}`;

    const chartConfig = {
      type: compare ? 'bar' : 'line',
      data: { labels, datasets },
      options: {
        plugins: {
          legend: { display: true },
          title: { display: true, text: title }
        },
        scales: {
          y: { beginAtZero: true, position: 'left', title: { display: true, text: 'Productos' } },
          y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Ventas (count)' } },
          x: { ticks: { autoSkip: false } }
        }
      }
    };

    return quickChartPngBlob_(chartConfig, 900, 500);
  }

  function buildHourlyComparisonChartUrl_(now, series, opts = {}) {
    const labels = series[0].buckets.map(b => b.label);
    const compare = !!opts.compare;

    const normalized = normalizeSeries_(series);
    const averaged = applyDailyAverage_(normalized);

    const datasets = [];
    averaged.forEach((s) => {
      datasets.push({
        type: compare ? 'bar' : 'line',
        label: s.label,
        data: s.buckets.map(b => Number(b.productos || 0)),
        fill: false,
        tension: 0.25,
        pointRadius: compare ? 0 : 2,
        borderWidth: compare ? 0 : 2,
        backgroundColor: compare ? s.color : undefined,
        borderColor: compare ? s.color : undefined,
        yAxisID: 'y'
      });

      datasets.push({
        type: 'line',
        label: `${s.label} (ventas)`,
        data: s.buckets.map(b => Number(b.ventas || 0)),
        fill: false,
        tension: 0.25,
        pointRadius: compare ? 0 : 2,
        borderWidth: 1,
        borderDash: [4, 3],
        backgroundColor: compare ? fadedColor_(s.color, 0.35) : undefined,
        borderColor: compare ? fadedColor_(s.color, 0.6) : undefined,
        yAxisID: 'y1'
      });
    });

    const title = `Ventas por hora - ${Utils.formatDateMX(now)}`;

    const chartConfig = {
      type: compare ? 'bar' : 'line',
      data: { labels, datasets },
      options: {
        plugins: {
          legend: { display: true },
          title: { display: true, text: title }
        },
        scales: {
          y: { beginAtZero: true, position: 'left', title: { display: true, text: 'Productos' } },
          y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Ventas (count)' } },
          x: { ticks: { autoSkip: false } }
        }
      }
    };

    return quickChartUrl_(chartConfig, 900, 500);
  }

  function normalizeSeries_(series) {
    if (!series.length) return series;
    const base = series[0];
    return series.map((s, idx) => {
      if (idx === 0) return s;
      const hasData = s.buckets.some(b => Number(b.productos || 0) > 0);
      if (hasData) return s;
      return {
        label: s.label,
        days: s.days,
        buckets: base.buckets.map(b => ({
          label: b.label,
          productos: b.productos,
          ventas: b.ventas
        }))
      };
    });
  }

  function applyDailyAverage_(series) {
    return series.map((s) => {
      const days = Math.max(1, Number(s.activeDays || s.days || 1));
      return {
        label: s.label,
        days: days,
        activeDays: s.activeDays,
        color: pickSeriesColor_(s.label),
        buckets: s.buckets.map(b => ({
          label: b.label,
          productos: Math.round(Number(b.productos || 0) / days),
          ventas: Math.round(Number(b.ventas || 0) / days)
        }))
      };
    });
  }

  function buildHourlyRanges_(now, period) {
    const base = Utils.asDate(now);
    const dayKey = Utils.dateKeyMX(base);
    const ranges = [{ label: 'Día', fromKey: dayKey, toKey: dayKey, days: 1, opts: {} }];

    if (period === 'day') return ranges;

    ranges.push(buildWeekRange_(base));
    if (period === 'week') return ranges;

    ranges.push(buildMonthRange_(base));
    if (period === 'month') return ranges;

    ranges.push(buildYearRange_(base));
    if (period === 'year') return ranges;

    ranges.push(buildForeverRange_(base));
    return ranges;
  }

  function buildRangeByDays_(base, days, label) {
    const end = Utils.asDate(base);
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    return {
      label,
      fromKey: Utils.dateKeyMX(start),
      toKey: Utils.dateKeyMX(end),
      days: days,
      opts: {}
    };
  }

  function buildWeekRange_(base) {
    const end = Utils.asDate(base);
    const wd = Number(Utilities.formatDate(end, CFG.TZ, 'u')); // 1=lun..7=dim
    const start = new Date(end.getTime() - (wd - 1) * 24 * 60 * 60 * 1000);
    const days = wd;
    return {
      label: 'Semana',
      fromKey: Utils.dateKeyMX(start),
      toKey: Utils.dateKeyMX(end),
      days: days,
      opts: {}
    };
  }

  function buildMonthRange_(base) {
    const end = Utils.asDate(base);
    const start = new Date(end.getFullYear(), end.getMonth(), 1, 0, 0, 0);
    const days = Number(Utilities.formatDate(end, CFG.TZ, 'd'));
    return {
      label: 'Mes',
      fromKey: Utils.dateKeyMX(start),
      toKey: Utils.dateKeyMX(end),
      days: Math.max(1, days),
      opts: {}
    };
  }

  function buildYearRange_(base) {
    const end = Utils.asDate(base);
    const start = new Date(end.getFullYear(), 0, 1, 0, 0, 0);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    return {
      label: 'Año',
      fromKey: Utils.dateKeyMX(start),
      toKey: Utils.dateKeyMX(end),
      days: days,
      opts: {}
    };
  }

  function buildForeverRange_(base) {
    const start = new Date(base.getFullYear(), 0, 1, 0, 0, 0);
    const days = Math.max(1, Math.round((base.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    return {
      label: 'Forever',
      fromKey: Utils.dateKeyMX(start),
      toKey: Utils.dateKeyMX(base),
      days: days,
      opts: {}
    };
  }

  function pickSeriesColor_(label) {
    const key = String(label || '').toLowerCase();
    if (key.indexOf('día') >= 0 || key.indexOf('dia') >= 0) return 'rgba(54, 162, 235, 0.6)';
    if (key.indexOf('semana') >= 0) return 'rgba(75, 192, 192, 0.6)';
    if (key.indexOf('mes') >= 0) return 'rgba(255, 159, 64, 0.6)';
    if (key.indexOf('año') >= 0 || key.indexOf('ano') >= 0) return 'rgba(153, 102, 255, 0.6)';
    if (key.indexOf('forever') >= 0) return 'rgba(201, 203, 207, 0.6)';
    return 'rgba(54, 162, 235, 0.6)';
  }

  function fadedColor_(rgba, alpha) {
    const a = Math.max(0.05, Math.min(1, Number(alpha || 0.4)));
    return String(rgba || 'rgba(54, 162, 235, 0.6)').replace(/rgba\(([^,]+),([^,]+),([^,]+),[^\)]+\)/, `rgba($1,$2,$3,${a})`);
  }

  function sanitizeCaption_(caption) {
    return String(caption || '').slice(0, 200);
  }

  // ---------- Calendario monthly chart ----------
  function sendMonthlyCaja_(now, topicKey = 'CIERRE') {
    const data = buildMonthlyCajaSeries_(now);
    const caption = sanitizeCaption_(`Ventas caja mes - ${Utils.formatDateMX(now)}`);
    try {
      const blob = buildMonthlyCajaChartBlob_(now, data);
      const url = buildMonthlyCajaChartUrl_(now, data);
      sendChartUrlOrBlob_(topicKey, url, blob, caption);
    } catch (err) {
      Utils.debug_('sendMonthlyCaja_ chart error', err && err.stack ? err.stack : err);
      Telegram.sendTextToTopic_(topicKey, `${caption} (sin chart)`);
    }
  }

  function sendMonthlyCajaToChat_(now, chatId) {
    if (!chatId) return;
    const data = buildMonthlyCajaSeries_(now);
    const caption = sanitizeCaption_(`Ventas caja mes - ${Utils.formatDateMX(now)}`);
    try {
      const blob = buildMonthlyCajaChartBlob_(now, data);
      const url = buildMonthlyCajaChartUrl_(now, data);
      sendChartUrlOrBlobToChat_(chatId, url, blob, caption);
    } catch (err) {
      Utils.debug_('sendMonthlyCajaToChat_ chart error', err && err.stack ? err.stack : err);
      Telegram.sendTextToChat_(chatId, `${caption} (sin chart)`);
    }
  }

  function buildMonthlyCajaSeries_(now) {
    const base = Utils.asDate(now);
    const start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59);
    const prevStart = new Date(base.getFullYear(), base.getMonth() - 1, 1, 0, 0, 0);
    const prevEnd = new Date(base.getFullYear(), base.getMonth(), 0, 23, 59, 59);

    const rows = SheetsRepo.getRows_(CFG.SHEETS.CALENDARIO);
    if (rows.length < 2) {
      return { labels: [], caja: [], cajaPrev: [], obj: [], pdRed: [], pdOrange: [], pdGreen: [], pdStar: [] };
    }
    const headerRow = detectHeaderRowByKeywords_(rows, ['FECHA', 'Fecha', 'Día', 'Dia', 'FECHA MX']);
    const headers = rows[headerRow - 1];
    const idxFecha = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.CAL.FECHA);
    const idxCaja = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.VENTAS_CAJA);
    const idxObj = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.OBJ);
    const idxRed = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.PD_RED);
    const idxOrange = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.PD_ORANGE);
    const idxGreen = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.PD_GREEN);
    const idxStar = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.CAL.PD_STAR);

    const labels = [];
    const caja = [];
    const cajaPrev = [];
    const obj = [];
    const pdRed = [];
    const pdOrange = [];
    const pdGreen = [];
    const pdStar = [];
    const currMap = buildMonthlyCajaPrevMap_(rows, idxFecha, idxCaja, start, end, headerRow);
    const prevMap = buildMonthlyCajaPrevMap_(rows, idxFecha, idxCaja, prevStart, prevEnd, headerRow);
    const objMap = buildMonthlyCajaPrevMap_(rows, idxFecha, idxObj, start, end, headerRow);
    const redMap = buildMonthlyCajaPrevMap_(rows, idxFecha, idxRed, start, end, headerRow);
    const orangeMap = buildMonthlyCajaPrevMap_(rows, idxFecha, idxOrange, start, end, headerRow);
    const greenMap = buildMonthlyCajaPrevMap_(rows, idxFecha, idxGreen, start, end, headerRow);
    const starMap = buildMonthlyCajaPrevMap_(rows, idxFecha, idxStar, start, end, headerRow);

    const maxDayPrev = Number(Utilities.formatDate(prevEnd, CFG.TZ, 'd'));
    const maxDayCurr = Number(Utilities.formatDate(end, CFG.TZ, 'd'));
    const maxDay = Math.max(maxDayPrev, maxDayCurr);
    for (let day = 1; day <= maxDay; day++) {
      const dayLabel = String(day);
      labels.push(dayLabel);
      caja.push(safeNumber_(currMap[dayLabel] || 0));
      cajaPrev.push(safeNumber_(prevMap[dayLabel] || 0));
      obj.push(safeNumber_(objMap[dayLabel] || 0));
      pdRed.push(safeNumber_(redMap[dayLabel] || 0));
      pdOrange.push(safeNumber_(orangeMap[dayLabel] || 0));
      pdGreen.push(safeNumber_(greenMap[dayLabel] || 0));
      pdStar.push(safeNumber_(starMap[dayLabel] || 0));
    }

    return { labels, caja, cajaPrev, obj, pdRed, pdOrange, pdGreen, pdStar };
  }

  function buildMonthlyCajaPrevMap_(rows, idxFecha, idxCaja, prevStart, prevEnd, headerRow) {
    const map = {};
    if (idxFecha == null || idxCaja == null) return map;
    const startRow = headerRow || 1;
    for (let i = startRow; i < rows.length; i++) {
      const rawDate = rows[i][idxFecha];
      if (!rawDate) continue;
      const d = Utils.asDate(rawDate);
      if (d < prevStart || d > prevEnd) continue;
      const key = Utilities.formatDate(d, CFG.TZ, 'd');
      map[key] = safeNumber_(rows[i][idxCaja]);
    }
    return map;
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

  function safeNumber_(v) {
    const n = Utils.toNumber(v);
    return isFinite(n) ? n : 0;
  }

  function buildMonthlyCajaChartBlob_(now, series) {
    Utils.assert(series.labels && series.labels.length, 'Monthly chart: no data');

    const datasets = [
      {
        label: `$ ${buildMonthLabel_(now, 0)}`,
        data: series.caja,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 0.9)',
        borderWidth: 1
      },
      {
        label: `$ ${buildMonthLabel_(now, -1)}`,
        data: series.cajaPrev,
        backgroundColor: 'rgba(54, 162, 235, 0.25)',
        borderColor: 'rgba(54, 162, 235, 0.35)',
        borderWidth: 1
      },
      {
        type: 'line',
        label: '$ Obj',
        data: series.obj,
        borderColor: 'rgba(0, 0, 0, 0.8)',
        borderWidth: 3,
        pointRadius: 0,
        fill: false
      },
      {
        type: 'line',
        label: '$ PD Red',
        data: series.pdRed,
        borderColor: 'rgba(255, 99, 132, 0.9)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      },
      {
        type: 'line',
        label: '$ PD Orange',
        data: series.pdOrange,
        borderColor: 'rgba(255, 159, 64, 0.9)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      },
      {
        type: 'line',
        label: '$ PD Green',
        data: series.pdGreen,
        borderColor: 'rgba(75, 192, 192, 0.9)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      },
      {
        type: 'line',
        label: '$ PD Star',
        data: series.pdStar,
        borderColor: 'rgba(255, 205, 86, 0.9)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      }
    ];

    const title = `Ventas caja (mes) - ${Utils.formatDateMX(now)}`;
    const chartConfig = {
      type: 'bar',
      data: { labels: series.labels, datasets },
      options: {
        scales: {
          y: { beginAtZero: true },
          x: { ticks: { autoSkip: false } }
        }
      }
    };

    return quickChartPngBlob_(chartConfig, 800, 400);
  }

  function buildMonthlyCajaChartUrl_(now, series) {
    Utils.assert(series.labels && series.labels.length, 'Monthly chart: no data');

    const datasets = [
      {
        label: `$ ${buildMonthLabel_(now, 0)}`,
        data: series.caja,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 0.9)',
        borderWidth: 1
      },
      {
        label: `$ ${buildMonthLabel_(now, -1)}`,
        data: series.cajaPrev,
        backgroundColor: 'rgba(54, 162, 235, 0.25)',
        borderColor: 'rgba(54, 162, 235, 0.35)',
        borderWidth: 1
      },
      {
        type: 'line',
        label: '$ Obj',
        data: series.obj,
        borderColor: 'rgba(0, 0, 0, 0.8)',
        borderWidth: 3,
        pointRadius: 0,
        fill: false
      },
      {
        type: 'line',
        label: '$ PD Red',
        data: series.pdRed,
        borderColor: 'rgba(255, 99, 132, 0.9)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      },
      {
        type: 'line',
        label: '$ PD Orange',
        data: series.pdOrange,
        borderColor: 'rgba(255, 159, 64, 0.9)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      },
      {
        type: 'line',
        label: '$ PD Green',
        data: series.pdGreen,
        borderColor: 'rgba(75, 192, 192, 0.9)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      },
      {
        type: 'line',
        label: '$ PD Star',
        data: series.pdStar,
        borderColor: 'rgba(255, 205, 86, 0.9)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      }
    ];

    const title = `Ventas caja (mes) - ${Utils.formatDateMX(now)}`;
    const chartConfig = {
      type: 'bar',
      data: { labels: series.labels, datasets },
      options: {
        scales: {
          y: { beginAtZero: true },
          x: { ticks: { autoSkip: false } }
        }
      }
    };

    return quickChartUrl_(chartConfig, 800, 400);
  }

  function sendChartUrlOrBlob_(topicKey, chartUrl, chartBlob, caption) {
    const safeCaption = sanitizeCaption_(caption);
    if (chartBlob) {
      try {
        Telegram.sendPhotoBlobToTopic_(topicKey, chartBlob, safeCaption);
        return;
      } catch (err) {
        Utils.debug_('sendChartUrlOrBlob_ blob failed, fallback to url/doc', err);
        try {
          Telegram.sendDocumentBlobToTopic_(topicKey, chartBlob, safeCaption);
          return;
        } catch (err2) {
          Utils.debug_('sendChartUrlOrBlob_ document failed', err2);
        }
      }
    }

    if (chartUrl && CFG.CRM && CFG.CRM.CHARTS_VIA_URL) {
      try {
        Telegram.sendPhotoUrlWithFallbackToTopic_(topicKey, chartUrl, safeCaption);
        return;
      } catch (err) {
        Utils.debug_('sendChartUrlOrBlob_ url failed', err);
      }
    }

    Telegram.sendTextToTopic_(topicKey, safeCaption || '⚠️ Chart non disponible');
  }

  function sendChartUrlOrBlobToChat_(chatId, chartUrl, chartBlob, caption) {
    const safeCaption = sanitizeCaption_(caption);
    if (chartBlob) {
      try {
        Telegram.sendPhotoUrlWithFallbackToChat_(chatId, chartUrl, safeCaption);
        return;
      } catch (err) {
        Utils.debug_('sendChartUrlOrBlobToChat_ blob failed', err);
      }
    }

    if (chartUrl) {
      try {
        Telegram.sendPhotoUrlWithFallbackToChat_(chatId, chartUrl, safeCaption);
        return;
      } catch (err) {
        Utils.debug_('sendChartUrlOrBlobToChat_ url failed', err);
      }
    }

    Telegram.sendTextToChat_(chatId, safeCaption || '⚠️ Chart non disponible');
  }

  function buildMonthLabel_(now, offset) {
    const d = Utils.asDate(now);
    const date = new Date(d.getFullYear(), d.getMonth() + Number(offset || 0), 1);
    const raw = Utilities.formatDate(date, CFG.TZ, 'MMM yy');
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  return { sendDailyHourly_, sendMonthlyCaja_, sendDailyHourlyToChat_, sendMonthlyCajaToChat_ };
})();
