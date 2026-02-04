// 45_Bot
// Bot minimal pour /bert + boutons inline (réponses dans ERRORES pour l'instant)
const Bot = (() => {
  const TOPIC_KEY = 'ERRORES';
  const STATE_PREFIX = 'BERT:UI:';

  const ACTIONS = {
    DAILY_CHART: 'bert:daily_chart',
    MONTH_CHART: 'bert:month_chart',
    CIERRE_HOY: 'bert:cierre_hoy',
    APERTURA_HOY: 'bert:apertura_hoy',
    ESTADO_MES: 'bert:estado_mes',
    MINI_APP: 'bert:mini_app',
    PICK_DATE: 'bert:pick_date',
    CATALOG: 'bert:catalog'
  };

  function stateKey_(chatId) {
    return `${STATE_PREFIX}${chatId}`;
  }

  function loadState_(chatId) {
    if (!chatId) return {};
    const raw = PropertiesService.getScriptProperties().getProperty(stateKey_(chatId));
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch (err) {
      return {};
    }
  }

  function saveState_(chatId, state) {
    if (!chatId) return;
    PropertiesService.getScriptProperties().setProperty(stateKey_(chatId), JSON.stringify(state || {}));
  }

  function clearState_(chatId) {
    if (!chatId) return;
    PropertiesService.getScriptProperties().deleteProperty(stateKey_(chatId));
  }

  function handleUpdate_(update) {
    const message = update && update.message ? update.message : null;
    const callback = update && update.callback_query ? update.callback_query : null;
    const text = message && message.text ? String(message.text).trim() : '';
    const forumTopicName = message && message.forum_topic_created
      ? String(message.forum_topic_created.name || '').trim()
      : '';
    const threadId = message ? message.message_thread_id : null;
    const allowedThread = Config.getTelegram_().TOPICS[TOPIC_KEY];
    const isPrivate = message && message.chat && message.chat.type === 'private';
    const privateChatId = message && message.from ? message.from.id : null;

    Utils.debug_('Bot.update', {
      hasMessage: Boolean(message),
      hasCallback: Boolean(callback),
      text: text,
      forumTopicName: forumTopicName,
      chatId: message && message.chat ? message.chat.id : null,
      threadId: message ? message.message_thread_id : null,
      callbackData: callback ? callback.data : ''
    });

    if (message) {
      const rawCmd = text || forumTopicName;
      const lower = normalizeCommand_(rawCmd);
      const bare = lower.replace(/^\//, '');
      const chatId = message.chat && message.chat.id ? message.chat.id : null;
      const stateChatId = isPrivate ? chatId : privateChatId;
      const currentState = loadState_(stateChatId);
      if (isPrivate && forumTopicName) {
        Utils.debug_('Bot.privateForumTopic', { forumTopicName, threadId });
        sendUi_(message.chat && message.chat.id);
        return;
      }
      if (isPrivate && (lower === '/bert' || lower === '/menu' || lower === '/start' || bare === 'bert' || bare === 'menu' || bare === 'start')) {
        sendUi_(message.chat && message.chat.id);
        return;
      }
      if (!isPrivate && (lower === '/bert' || lower === '/menu' || lower === '/start' || bare === 'bert' || bare === 'menu' || bare === 'start')) {
        if (allowedThread && threadId && Number(threadId) !== Number(allowedThread)) {
          Utils.debug_('Bot.ignore', { reason: 'wrong_thread', threadId, allowedThread });
          return;
        }
        if (privateChatId) {
          sendUi_(privateChatId);
        }
        return;
      }

      if (isPrivate && currentState && currentState.step === 'ask_date') {
        const parsed = parseDateInput_(text);
        if (!parsed) {
          Telegram.sendTextToChat_(chatId, '❌ Fecha inválida. Usa formato YYYY-MM-DD.', {
            parse_mode: 'Markdown'
          });
          return;
        }
        currentState.step = null;
        currentState.selectedDate = parsed;
        saveState_(chatId, currentState);
        Telegram.sendTextToChat_(chatId, `✅ Fecha seleccionada: *${parsed}*`, {
          parse_mode: 'Markdown'
        });
        return;
      }
    }

    if (callback) {
      handleCallback_(callback);
    }
  }

  function sendUi_(chatId) {
    if (!chatId) return;
    Utils.debug_('Bot.sendUi', { chatId, topic: TOPIC_KEY });
    const text = '🧭 *BERT UI*\nSelecciona una acción:';
    const buttons = [
      [
        { text: '🧩 Mini App', callback_data: ACTIONS.MINI_APP }
      ],
      [
        { text: '📊 Gráfica día', callback_data: ACTIONS.DAILY_CHART },
        { text: '📅 Gráfica mes', callback_data: ACTIONS.MONTH_CHART }
      ],
      [
        { text: '✅ Cierre hoy', callback_data: ACTIONS.CIERRE_HOY },
        { text: '🌅 Apertura hoy', callback_data: ACTIONS.APERTURA_HOY }
      ],
      [
        { text: '📈 Estado mes', callback_data: ACTIONS.ESTADO_MES }
      ],
      [
        { text: '🗓️ Seleccionar fecha', callback_data: ACTIONS.PICK_DATE },
        { text: '🧺 Catálogo', callback_data: ACTIONS.CATALOG }
      ]
    ];

    Telegram.sendInlineButtons_(
      chatId,
      text,
      buttons,
      { parse_mode: 'Markdown' }
    );
  }

  function handleCallback_(callback) {
    const data = String(callback.data || '');
    const chatId = callback.message && callback.message.chat ? callback.message.chat.id : null;
    const threadId = callback.message ? callback.message.message_thread_id : null;
    const isPrivate = callback.message && callback.message.chat && callback.message.chat.type === 'private';
    const privateChatId = callback.from ? callback.from.id : null;
    const targetChatId = isPrivate ? chatId : privateChatId;

    Utils.debug_('Bot.callback', { data, chatId, threadId });

    if (callback.id) {
      Telegram.answerCallback_(callback.id, 'OK');
    }

    if (!targetChatId) return;

    const now = Utils.nowMX();
    if (data === ACTIONS.DAILY_CHART) {
      Utils.debug_('Bot.action', ACTIONS.DAILY_CHART);
      CRM_Charts.sendDailyHourlyToChat_(now, targetChatId, { period: 'compare' });
      return;
    }

    if (data === ACTIONS.MONTH_CHART) {
      Utils.debug_('Bot.action', ACTIONS.MONTH_CHART);
      CRM_Charts.sendMonthlyCajaToChat_(now, targetChatId);
      return;
    }

    if (data === ACTIONS.CIERRE_HOY) {
      Utils.debug_('Bot.action', ACTIONS.CIERRE_HOY);
      CRM.runHourly_(now, { force: true });
      Telegram.sendTextToChat_(targetChatId, '✅ Cierre ejecutado.', { parse_mode: 'Markdown' });
      return;
    }

    if (data === ACTIONS.APERTURA_HOY) {
      Utils.debug_('Bot.action', ACTIONS.APERTURA_HOY);
      CRM.runApertura_(now, { force: true, ignoreClosed: true });
      Telegram.sendTextToChat_(targetChatId, '✅ Apertura ejecutada.', { parse_mode: 'Markdown' });
      return;
    }

    if (data === ACTIONS.ESTADO_MES) {
      Utils.debug_('Bot.action', ACTIONS.ESTADO_MES);
      sendEstadoMes_(now, targetChatId);
      return;
    }

    if (data === ACTIONS.PICK_DATE) {
      Utils.debug_('Bot.action', ACTIONS.PICK_DATE);
      sendDatePicker_(targetChatId);
      return;
    }

    if (data === ACTIONS.CATALOG) {
      Utils.debug_('Bot.action', ACTIONS.CATALOG);
      sendCatalogCategories_(targetChatId);
      return;
    }

    if (data.indexOf('bert:date:') === 0) {
      handleDateCallback_(targetChatId, data);
      return;
    }

    if (data.indexOf('bert:cat:') === 0) {
      handleCatalogCallback_(targetChatId, data);
      return;
    }

    if (data === ACTIONS.MINI_APP) {
      Utils.debug_('Bot.action', ACTIONS.MINI_APP);
      sendMiniAppLink_(targetChatId);
    }
  }

  function sendMiniAppLink_(chatId) {
    const baseUrl = Config.getTelegram_().WEBAPP_URL || '';
    if (!baseUrl) {
      Telegram.sendTextToChat_(chatId, '⚠️ Mini App URL no configurada.', {
        parse_mode: 'Markdown'
      });
      return;
    }

    const url = `${baseUrl}?view=miniapp`;
    const text = `🧩 *Mini App*\n${url}`;
    Telegram.sendTextToChat_(chatId, text, {
      parse_mode: 'Markdown'
    });
  }

  function sendEstadoMes_(now, chatId) {
    Utils.debug_('Bot.sendEstadoMes', { chatId });
    const month = Calendario.getMonthTotals_(now);
    const obj = Utils.roundInt(month?.obj || 0);
    const caja = Utils.roundInt(month?.ventasCaja || 0);
    const pct = obj > 0 ? Math.round((caja / obj) * 100) : 0;
    const gratisMes = Utils.roundInt(month?.gratisMes || 0);
    const gratisMesPromo2 = Utils.roundInt(month?.gratisMesPromo2 || 0);

    const lines = [];
    lines.push('📈 *Estado del mes*');
    lines.push(`📆 ${Utilities.formatDate(now, CFG.TZ, 'MMMM yyyy')}`);
    lines.push(`✅ Ventas acumuladas: *${caja}*`);
    if (gratisMes > 0) {
      lines.push(`🎁 Promo 1 (1 producto gratis): *${gratisMes}*`);
    }
    if (gratisMesPromo2 > 0) {
      lines.push(`🎁 Promo 2 (2 productos gratis): *${gratisMesPromo2}*`);
    }
    if (obj > 0) {
      lines.push(`🎯 Objetivo mes: *${obj}* → *${pct}%*`);
    }

    Telegram.sendTextToChat_(chatId, lines.join('\n'), {
      parse_mode: 'Markdown'
    });
  }

  function sendDatePicker_(chatId) {
    const buttons = [[
      { text: 'Hoy', callback_data: 'bert:date:HOY' },
      { text: 'Ayer', callback_data: 'bert:date:AYER' }
    ], [
      { text: 'Elegir fecha', callback_data: 'bert:date:MANUAL' }
    ]];
    Telegram.sendInlineButtons_(chatId, '🗓️ Selecciona una fecha:', buttons, {
      parse_mode: 'Markdown'
    });
  }

  function handleDateCallback_(chatId, data) {
    const choice = data.split(':')[2] || '';
    const state = loadState_(chatId);
    if (choice === 'MANUAL') {
      state.step = 'ask_date';
      state.threadId = null;
      saveState_(chatId, state);
      Telegram.sendTextToChat_(chatId, '✍️ Escribe la fecha en formato *YYYY-MM-DD*', {
        parse_mode: 'Markdown'
      });
      return;
    }

    const date = choice === 'AYER'
      ? Utils.dateKeyMX(new Date(Date.now() - 24 * 60 * 60 * 1000))
      : Utils.dateKeyMX(new Date());
    state.selectedDate = date;
    state.step = null;
    state.threadId = null;
    saveState_(chatId, state);
    Telegram.sendTextToChat_(chatId, `✅ Fecha seleccionada: *${date}*`, {
      parse_mode: 'Markdown'
    });
  }

  function sendCatalogCategories_(chatId) {
    const categories = listCatalogCategories_();
    if (!categories.length) {
      Telegram.sendTextToChat_(chatId, '⚠️ Catálogo vacío.', {
        parse_mode: 'Markdown'
      });
      return;
    }
    const buttons = buildOptionButtons_(categories, 'cat');
    Telegram.sendInlineButtons_(chatId, '🧺 Elige una categoría:', buttons, {
      parse_mode: 'Markdown'
    });
  }

  function handleCatalogCallback_(chatId, data) {
    const raw = data.slice('bert:cat:'.length);
    let categoria = '';
    try {
      categoria = decodeURIComponent(raw);
    } catch (err) {
      categoria = raw;
    }
    const productos = listProductosByCategoria_(categoria);
    if (!productos.length) {
      Telegram.sendTextToChat_(chatId, '⚠️ No hay productos en esta categoría.', {
        parse_mode: 'Markdown'
      });
      return;
    }
    const lines = productos.slice(0, 50).map((p, idx) => `${idx + 1}. ${p}`);
    Telegram.sendTextToChat_(chatId, `📦 *${categoria}*\n${lines.join('\n')}`, {
      parse_mode: 'Markdown'
    });
  }

  function listCatalogCategories_() {
    const items = Ventas.getProductCatalog_();
    const map = {};
    (items || []).forEach((item) => {
      const cat = String(item.categoria || 'Sin categoría');
      map[cat] = true;
    });
    return Object.keys(map).sort();
  }

  function listProductosByCategoria_(categoria) {
    const items = Ventas.getProductCatalog_();
    const out = [];
    (items || []).forEach((item) => {
      if (Utils.trimLower(item.categoria) === Utils.trimLower(categoria)) {
        out.push(String(item.articulo || ''));
      }
    });
    return out.filter(Boolean).sort();
  }

  function buildOptionButtons_(options, prefix) {
    const buttons = [];
    const trimmed = (options || []).slice(0, 40);
    for (let i = 0; i < trimmed.length; i++) {
      const label = trimmed[i];
      buttons.push([{ text: label, callback_data: `bert:${prefix}:${encodeURIComponent(label)}` }]);
    }
    return buttons;
  }

  function parseDateInput_(text) {
    const raw = String(text || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    return raw;
  }

  function normalizeCommand_(text) {
    const raw = String(text || '').trim().toLowerCase();
    if (!raw) return '';
    const first = raw.split(/\s+/)[0];
    const at = first.indexOf('@');
    if (at === -1) return first;
    return first.slice(0, at);
  }

  return { handleUpdate_ };
})();
