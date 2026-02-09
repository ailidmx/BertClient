/**
 * ====== PUBLIC ENTRYPOINTS ======
 * Fonctions visibles pour triggers Apps Script
 * (ventes + CRM + tests + debug)
 */

/**
 * Trigger Google Form -> vente
 */
function onFormSubmit(e) {
  try {
    const venta = Ventas.parseVentaFromEvent_(e);
    BotApi.getJson_('alert_venta', {
      vendedor: venta.vendedor,
      productos: venta.productos,
      pago: venta.pago,
      comentario: venta.comentario,
      gratis: venta.gratis,
      gratisPromo2: venta.gratisPromo2,
      topicKey: 'VENTAS'
    });

  } catch (err) {
    Utils.debug_('onFormSubmit error', err && err.stack ? err.stack : err);
    Telegram.sendTextToTopic_(
      'ERRORES',
      `❌ onFormSubmit\n${String(err)}`
    );
  }
}

function sendVentaAlert_(venta, kpi, topicKey) {
  Utils.debug_('sendVentaAlert_ via BotApi', topicKey);
  BotApi.getJson_('alert_venta', {
    vendedor: venta.vendedor,
    productos: venta.productos,
    pago: venta.pago,
    comentario: venta.comentario,
    gratis: venta.gratis,
    gratisPromo2: venta.gratisPromo2,
    topicKey: topicKey || 'VENTAS'
  });
}

// cierre/apertura entrypoints removed: handled by bot


function doPost(e) {
  try {
    const data = JSON.parse(e && e.postData ? e.postData.contents : '{}');
    Logger.log('[DEBUG] doPost invoked');
    Logger.log('[DEBUG] doPost raw: ' + (e && e.postData ? e.postData.contents : ''));
    throw new Error('DOPOST HIT');
    Utils.debug_('doPost update', data);
    Utils.debug_('doPost update raw', e && e.postData ? e.postData.contents : '');

    if (Utils.shouldSkipTelegramUpdate_(data)) {
      Utils.debug_('doPost skip duplicate update');
      return ContentService.createTextOutput('OK');
    }

    Bot.handleUpdate_(data);
    Produccion.handleUpdate_(data);
    return ContentService.createTextOutput('OK');
  } catch (err) {
    Utils.debug_('doPost error', err && err.stack ? err.stack : err);
    return ContentService.createTextOutput('ERROR');
  }
}

function doGet(e) {
  try {
    const mode = e && e.parameter ? String(e.parameter.view || '') : '';
    const api = e && e.parameter ? String(e.parameter.api || '') : '';
    if (api) {
      const token = e && e.parameter ? String(e.parameter.token || '') : '';
      const apiToken = Config.getApiToken_();
      if (apiToken && token !== apiToken) {
        return jsonOutput_({ error: 'Unauthorized' }, 401);
      }
      return handleApiRequest_(api, e.parameter || {});
    }
    if (mode === 'miniapp') {
      const now = Utils.nowMX();
      const kpi = Ventas.computeKpiDiario_(now);
      const month = Calendario.getMonthTotals_(now);
      const template = HtmlService.createTemplateFromFile('mini_app_showcase');
      template.title = (CFG.MINI_APP && CFG.MINI_APP.TITLE) ? CFG.MINI_APP.TITLE : 'BERT CRM Showcase';
      template.dateLabel = Utilities.formatDate(now, CFG.TZ, 'dd/MM/yyyy HH:mm');
      template.kpi = {
        goal: Utils.roundInt(kpi.goal || 0),
        sold: Utils.roundInt(kpi.sold || 0),
        missing: Utils.roundInt(kpi.missing || 0),
        pct: Math.round((kpi.pct || 0) * 100),
        ventasCaja: Utils.roundInt(kpi.ventasCaja || 0),
        canastaProm: Utils.roundInt(kpi.canastaProm || 0),
        pacePerHour: Utils.roundInt(kpi.pacePerHour || 0),
        gratis: Utils.roundInt(kpi.gratis || 0)
      };
      template.month = {
        label: Utilities.formatDate(now, CFG.TZ, 'MMMM yyyy'),
        obj: Utils.roundInt(month.obj || 0),
        ventasCaja: Utils.roundInt(month.ventasCaja || 0),
        pctMes: month.pctMes || '',
        gratisMes: Utils.roundInt(month.gratisMes || 0)
      };
      template.catalog = groupCatalogByCategory_(Ventas.getProductCatalog_());
      template.formUrl = CFG.MINI_APP && CFG.MINI_APP.FORM_URL ? CFG.MINI_APP.FORM_URL : '';
      const botUsername = Config.getTelegram_().BOT_USERNAME || '';
      template.botUrl = `https://t.me/${botUsername}`;

      const output = template.evaluate();
      output.setTitle(template.title);
      return output;
    }
  } catch (err) {
    Utils.debug_('doGet miniapp error', err && err.stack ? err.stack : err);
  }

  return ContentService.createTextOutput('OK');
}

function handleApiRequest_(api, params) {
  try {
    const now = Utils.nowMX();
    if (api === 'ping') {
      return jsonOutput_({ ok: true, now: Utils.formatDateMX(now) });
    }
    if (api === 'kpi') {
      const kpi = Ventas.computeKpiDiario_(now);
      const payload = {
        date: Utils.dateKeyMX(now),
        goal: Utils.roundInt(kpi.goal || 0),
        sold: Utils.roundInt(kpi.sold || 0),
        missing: Utils.roundInt(kpi.missing || 0),
        pct: Math.round((kpi.pct || 0) * 100),
        ventasCaja: Utils.roundInt(kpi.ventasCaja || 0),
        canastaProm: Utils.roundInt(kpi.canastaProm || 0),
        pacePerHour: Utils.roundInt(kpi.pacePerHour || 0),
        gratis: Utils.roundInt(kpi.gratis || 0)
      };
      return jsonOutput_(payload);
    }

    if (api === 'month') {
      const month = Calendario.getMonthTotals_(now);
      const payload = {
        label: Utilities.formatDate(now, CFG.TZ, 'MMMM yyyy'),
        obj: Utils.roundInt(month.obj || 0),
        ventasCaja: Utils.roundInt(month.ventasCaja || 0),
        pctMes: month.pctMes || '',
        gratisMes: Utils.roundInt(month.gratisMes || 0)
      };
      return jsonOutput_(payload);
    }

    if (api === 'catalog') {
      const catalog = groupCatalogByCategory_(Ventas.getProductCatalog_());
      return jsonOutput_(catalog);
    }

    return jsonOutput_({ error: 'API no encontrada', api: api }, 404);
  } catch (err) {
    Utils.debug_('handleApiRequest_ error', err && err.stack ? err.stack : err);
    return jsonOutput_({ error: String(err) }, 500);
  }
}

function jsonOutput_(payload, code) {
  const out = ContentService.createTextOutput(JSON.stringify(payload));
  out.setMimeType(ContentService.MimeType.JSON);
  if (code && out.setStatusCode) {
    out.setStatusCode(code);
  }
  return out;
}

function groupCatalogByCategory_(items) {
  const map = {};
  (items || []).forEach((item) => {
    const cat = String(item.categoria || 'Sin categoría');
    if (!map[cat]) map[cat] = [];
    map[cat].push({
      name: String(item.articulo || ''),
      fotoUrl: item.fotoUrl ? String(item.fotoUrl) : ''
    });
  });

  return Object.keys(map)
    .sort()
    .map((name) => ({
      name,
      items: map[name].sort((a, b) => a.name.localeCompare(b.name))
    }));
}

