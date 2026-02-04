// 75_Produccion
const Produccion = (() => {

  const STATE_KEY = 'PRODUCCION_BOT_STATE';

  function ensureSheet_() {
    const ss = SheetsRepo.getSpreadsheet_();
    let sh = ss.getSheetByName(CFG.SHEETS.PRODUCCION);
    if (!sh) {
      sh = ss.insertSheet(CFG.SHEETS.PRODUCCION);
      const headers = [
        'Fecha',
        'Punto de Venta',
        'Categoria',
        'Producto',
        'Cantidad',
        'Unidad',
        'Costo Materia Prima',
        'Usuario',
        'Estado',
        'Inventario'
      ];
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    }
    return sh;
  }

  function loadState_() {
    const props = PropertiesService.getScriptProperties();
    const raw = props.getProperty(STATE_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch (err) {
      Utils.debug_('Produccion loadState_ error', err);
      return {};
    }
  }

  function saveState_(state) {
    PropertiesService.getScriptProperties()
      .setProperty(STATE_KEY, JSON.stringify(state || {}));
  }

  function clearState_() {
    PropertiesService.getScriptProperties().deleteProperty(STATE_KEY);
  }

  function listCategorias_() {
    const rows = SheetsRepo.getRows_(CFG.SHEETS.GENERAL);
    if (!rows.length) return [];
    const headerRow = detectHeaderRowByKeywords_(rows, ['ARTICULO', 'CATEGORIA', 'PROVEEDOR', 'PIEZAS', 'MARGEN']);
    const headers = rows[headerRow - 1];
    const idxCat = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.GENERAL.CATEGORIA);
    const categories = {};
    for (let i = headerRow; i < rows.length; i++) {
      const val = rows[i][idxCat];
      if (!val) continue;
      categories[Utils.trimLower(val)] = String(val).trim();
    }
    return Object.keys(categories)
      .sort()
      .map(key => categories[key]);
  }

  function listProductosByCategoria_(categoria) {
    const rows = SheetsRepo.getRows_(CFG.SHEETS.GENERAL);
    if (!rows.length) return [];
    const headerRow = detectHeaderRowByKeywords_(rows, ['ARTICULO', 'CATEGORIA', 'PROVEEDOR', 'PIEZAS', 'MARGEN']);
    const headers = rows[headerRow - 1];
    const idxCat = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.GENERAL.CATEGORIA);
    const idxArt = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.GENERAL.ARTICULO);

    const productos = [];
    for (let i = headerRow; i < rows.length; i++) {
      const cat = rows[i][idxCat];
      if (!cat || Utils.trimLower(cat) !== Utils.trimLower(categoria)) continue;
      const art = rows[i][idxArt];
      if (art) productos.push(String(art).trim());
    }
    return productos.sort();
  }

  function handleUpdate_(update) {
    const message = update && update.message ? update.message : null;
    const callback = update && update.callback_query ? update.callback_query : null;
    const text = message && message.text ? String(message.text).trim() : '';
    const chatId = message && message.chat ? message.chat.id : null;
    const callbackData = callback ? String(callback.data || '') : '';
    const callbackId = callback ? callback.id : null;
    const callbackChatId = callback && callback.message && callback.message.chat
      ? callback.message.chat.id
      : null;
    const callbackMessageId = callback && callback.message ? callback.message.message_id : null;
    const callbackThreadId = callback && callback.message ? callback.message.message_thread_id : null;

    if (!message && !callback) return;

    const isProdCommand = text.toLowerCase() === '/produccion';
    const isProdCallback = callbackData.indexOf('prd:') === 0;
    if (!isProdCommand && !isProdCallback) return;

    const state = loadState_();

    if (isProdCommand) {
      const next = {
        step: 'ask_quand',
        chatId: chatId,
        from: message.from ? message.from.first_name : ''
      };
      saveState_(next);
      sendInline_(chatId, '🛒 Nueva materia prima detectada. ¿Cuándo producimos?', buildQuandButtons_());
      return;
    }

    const activeChatId = callbackChatId || chatId;
    Utils.debug_('Produccion callback', {
      hasCallback: Boolean(callbackId),
      callbackData: callbackData,
      callbackChatId: callbackChatId,
      callbackThreadId: callbackThreadId,
      stateChatId: state.chatId,
      stateStep: state.step
    });

    if (!state || !state.step || state.chatId !== activeChatId) return;

    if (callbackId) {
      Telegram.answerCallback_(callbackId, 'OK');
      if (callbackChatId && callbackMessageId) {
        Telegram.clearInlineButtons_(callbackChatId, callbackMessageId);
      }
    }

    if (state.step === 'ask_quand') {
      const choice = callbackData ? parseQuandCallback_(callbackData) : normalizeChoice_(text);
      if (!choice) {
        reply_(activeChatId, 'Choix invalide. Réponds: Hoy / Mañana / No sé / Olvida');
        return;
      }
      if (choice === 'OLVIDA') {
        clearState_();
        reply_(activeChatId, '✅ OK, on ignore cette materia prima.');
        return;
      }
      state.quand = choice;
      state.step = 'ask_categoria';
      const cats = listCategorias_();
      state.options = cats;
      saveState_(state);
      sendInline_(activeChatId, '📂 Elige una categoría', buildOptionButtons_(cats, 'cat'));
      return;
    }

    if (state.step === 'ask_categoria') {
      const categoria = callbackData
        ? parseOptionCallback_(callbackData, 'cat')
        : resolveOption_(text, state.options || []);
      if (!categoria) {
        reply_(activeChatId, 'Opción inválida. Responde con el número o nombre exacto.');
        return;
      }
      state.categoria = categoria;
      state.step = 'ask_producto';
      const productos = listProductosByCategoria_(categoria);
      state.options = productos;
      saveState_(state);
      sendInline_(activeChatId, '📦 Elige un producto', buildOptionButtons_(productos, 'prod'));
      return;
    }

    if (state.step === 'ask_producto') {
      const producto = callbackData
        ? parseOptionCallback_(callbackData, 'prod')
        : resolveOption_(text, state.options || []);
      if (!producto) {
        reply_(activeChatId, 'Opción inválida. Responde con el número o nombre exacto.');
        return;
      }
      state.producto = producto;
      state.step = 'ask_cantidad';
      saveState_(state);
      reply_(activeChatId, `🔢 ¿Cuántas piezas/kg produjiste de **${escapeMarkdown_(producto)}**? (solo número)`);
      return;
    }

    if (state.step === 'ask_cantidad') {
      const qty = Number(String(text).replace(',', '.'));
      if (!isFinite(qty) || qty <= 0) {
        reply_(activeChatId, 'Cantidad inválida. Escribe solo un número > 0.');
        return;
      }
      state.cantidad = qty;
      saveState_(state);
      const producto = state.producto || '';
      state.unidad = lookupUnidad_(producto);
      state.step = 'ask_inventario';
      saveState_(state);
      reply_(activeChatId, `📦 ¿Cuántas piezas ya existen en inventario de **${escapeMarkdown_(producto)}**? (solo número)`);
      return;
    }

    if (state.step === 'ask_inventario') {
      const inv = Number(String(text).replace(',', '.'));
      if (!isFinite(inv) || inv < 0) {
        reply_(activeChatId, 'Cantidad inválida. Escribe solo un número ≥ 0.');
        return;
      }
      state.inventario = inv;
      saveState_(state);

      registerProduccion_(state);
      reply_(activeChatId, `✅ Producción registrada: ${state.categoria} → **${escapeMarkdown_(state.producto)}** (prod: ${state.cantidad}, inv: ${state.inventario}).`);
      clearState_();
      return;
    }
  }

  function registerProduccion_(state) {
    const sh = ensureSheet_();
    const values = [[
      new Date(),
      state.puntoVenta || '',
      state.categoria || '',
      state.producto || '',
      state.cantidad || '',
      state.unidad || '',
      state.costoMateria || '',
      state.from || '',
      state.quand || '',
      state.inventario || ''
    ]];
    sh.getRange(sh.getLastRow() + 1, 1, 1, values[0].length).setValues(values);
  }

  function escapeMarkdown_(text) {
    return String(text || '').replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }

  function normalizeChoice_(text) {
    const t = String(text || '').toLowerCase();
    if (['1', 'hoy', 'aujourd\'hui', 'today'].includes(t)) return 'HOY';
    if (['2', 'mañana', 'manana', 'demain', 'tomorrow'].includes(t)) return 'MANANA';
    if (['3', 'no se', 'no sé', 'sais pas', 'pas'].includes(t)) return 'NOSE';
    if (['4', 'olvida', 'ignore', 'oublie'].includes(t)) return 'OLVIDA';
    return null;
  }

  function buildListMessage_(title, list) {
    if (!list || !list.length) return `${title}\n(aucune option)`;
    const trimmed = list.slice(0, 40);
    const lines = trimmed.map((item, idx) => `${idx + 1}. ${item}`);
    return `${title}\n${lines.join('\n')}\n\nResponde con el número o el nombre exacto.`;
  }

  function buildQuandButtons_() {
    return [[
      { text: 'Hoy', callback_data: 'prd:quand:HOY' },
      { text: 'Mañana', callback_data: 'prd:quand:MANANA' }
    ], [
      { text: 'No sé', callback_data: 'prd:quand:NOSE' },
      { text: 'Olvida', callback_data: 'prd:quand:OLVIDA' }
    ]];
  }

  function buildOptionButtons_(options, prefix) {
    const buttons = [];
    const trimmed = (options || []).slice(0, 40);
    for (let i = 0; i < trimmed.length; i++) {
      const label = trimmed[i];
      buttons.push([{ text: label, callback_data: `prd:${prefix}:${encodeURIComponent(label)}` }]);
    }
    return buttons;
  }

  function parseQuandCallback_(data) {
    if (!data || data.indexOf('prd:quand:') !== 0) return null;
    return data.split(':')[2] || null;
  }

  function parseOptionCallback_(data, prefix) {
    const tag = `prd:${prefix}:`;
    if (!data || data.indexOf(tag) !== 0) return null;
    const raw = data.slice(tag.length);
    try {
      return decodeURIComponent(raw);
    } catch (err) {
      return raw;
    }
  }

  function reply_(chatId, text) {
    Telegram.sendTextToChat_(chatId, text, { parse_mode: 'Markdown' });
  }

  function sendInline_(chatId, text, buttons) {
    Telegram.sendInlineButtons_(chatId, text, buttons, { parse_mode: 'Markdown' });
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
      if (nonEmpty < 4 || hits === 0) continue;
      const score = nonEmpty + hits * 5;
      if (score > bestScore) {
        bestScore = score;
        bestRow = r + 1;
      }
    }
    return bestRow;
  }

  function resolveOption_(text, options) {
    const trimmed = String(text || '').trim();
    const idx = parseInt(trimmed, 10);
    if (!isNaN(idx) && idx >= 1 && idx <= options.length) {
      return options[idx - 1];
    }
    if (!trimmed) return null;
    const match = options.find(opt => Utils.trimLower(opt) === Utils.trimLower(trimmed));
    return match || null;
  }

  function lookupUnidad_(producto) {
    if (!producto) return '';
    const rows = SheetsRepo.getRows_(CFG.SHEETS.GENERAL);
    if (!rows.length) return '';
    const headerRow = detectHeaderRowByKeywords_(rows, ['ARTICULO', 'CATEGORIA', 'PROVEEDOR', 'PIEZAS', 'MARGEN']);
    const headers = rows[headerRow - 1];
    const idxArt = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.GENERAL.ARTICULO);
    const idxUnidad = SheetsRepo.findHeaderIndexOptional_(headers, CFG.COLS.GENERAL.UNIDAD);
    if (idxUnidad == null) return '';
    for (let i = headerRow; i < rows.length; i++) {
      const art = rows[i][idxArt];
      if (!art) continue;
      if (Utils.trimLower(art) !== Utils.trimLower(producto)) continue;
      return rows[i][idxUnidad] || '';
    }
    return '';
  }

  function checkNewMateriaPrima_() {
    const rows = SheetsRepo.getRows_(CFG.SHEETS.CONTA_ASIENTOS);
    if (!rows.length) {
      Utils.debug_('Produccion: CONTA_ASIENTOS empty');
      return;
    }

    ensureSheet_();

    const headerRow = detectHeaderRowByKeywords_(rows, ['Punto de Venta', 'Tipo', 'CATEGORIA', 'IMPORTE']);
    const headers = rows[headerRow - 1];
    Utils.debug_('Produccion: headerRow', headerRow);
    Utils.debug_('Produccion: headers', headers);

    const idxTipo = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.CONTA.TIPO);
    const idxCat = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.CONTA.CATEGORIA);
    const idxFecha = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.CONTA.FECHA);
    const idxPdv = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.CONTA.PUNTO_VENTA);
    const idxImp = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.CONTA.IMPORTE);

    const props = PropertiesService.getScriptProperties();
    const lastRowKey = 'CONTA_LAST_ROW';
    const lastRow = Number(props.getProperty(lastRowKey) || headerRow);
    Utils.debug_('Produccion: lastRow', lastRow);

    let triggered = false;
    for (let i = Math.max(headerRow, lastRow); i < rows.length; i++) {
      const row = rows[i];
      const tipo = String(row[idxTipo] || '').trim().toUpperCase();
      const cat = String(row[idxCat] || '').trim().toUpperCase();
      if (i === Math.max(headerRow, lastRow)) {
        Utils.debug_('Produccion: firstRowCheck', { i: i + 1, tipo, cat });
      }
      if (tipo !== 'GASTOS' || cat !== 'MATERIA PRIMA') continue;

      const state = loadState_();
      if (state && state.step) {
        Utils.debug_('Produccion: flow already active, skipping row', row);
        continue;
      }

      const entry = {
        step: 'ask_quand',
        chatId: Config.getTelegram_().CHAT_ID,
        from: '',
        puntoVenta: row[idxPdv] || '',
        costoMateria: row[idxImp] || '',
        fecha: row[idxFecha] || ''
      };
      saveState_(entry);
      const msg = [
        '🛒 Nueva materia prima detectada.',
        entry.puntoVenta ? `📍 ${entry.puntoVenta}` : '',
        entry.fecha ? `🗓️ ${entry.fecha}` : '',
        entry.costoMateria ? `💸 Importe: ${entry.costoMateria}` : ''
      ].filter(Boolean).join('\n');
      sendInline_(entry.chatId, msg, buildQuandButtons_());
      triggered = true;
      break;
    }

    props.setProperty(lastRowKey, String(rows.length));
    Utils.debug_('Produccion: lastRow saved', rows.length);
    if (triggered) {
      Utils.debug_('Produccion: trigger sent');
    }
  }

  function forceTestFlow_() {
    ensureSheet_();
    const entry = {
      step: 'ask_quand',
      chatId: Config.getTelegram_().CHAT_ID,
      from: 'Test',
      puntoVenta: 'TEST',
      costoMateria: '$0',
      fecha: Utils.formatDateMX(new Date())
    };
    saveState_(entry);
    const msg = [
      '🧪 TEST: flujo de producción manual.',
      '📍 TEST',
      `🗓️ ${entry.fecha}`,
      '💸 Importe: $0'
    ].join('\n');
    sendInline_(entry.chatId, msg, buildQuandButtons_());
  }

  return {
    ensureSheet_,
    handleUpdate_,
    checkNewMateriaPrima_,
    forceTestFlow_,
  };
})();
