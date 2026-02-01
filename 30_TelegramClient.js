// 30_TelegramClient.gs
const Telegram = (() => {

  function sendText_(text, opts = {}) {
    const url = `https://api.telegram.org/bot${CFG.TELEGRAM.TOKEN}/sendMessage`;

    const parseMode = opts.parse_mode || "Markdown";
    const safeText = sanitizeTelegramText_(text, parseMode);

    const payload = {
      chat_id: CFG.TELEGRAM.CHAT_ID,
      text: safeText,
      parse_mode: parseMode,
      disable_web_page_preview: true,
      ...(opts.message_thread_id ? { message_thread_id: Number(opts.message_thread_id) } : {})
    };

    let res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    res = retryTelegramParseError_(url, payload, res, 'sendText_');
    logTelegramResponse_(res, 'sendText_');
    return res;
  }

  function sendPhotoUrl_(photoUrl, caption = "", opts = {}) {
    const url = `https://api.telegram.org/bot${CFG.TELEGRAM.TOKEN}/sendPhoto`;

    const payload = {
      chat_id: CFG.TELEGRAM.CHAT_ID,
      photo: photoUrl,
      caption: sanitizeTelegramCaption_(caption || ""),
      ...(opts.message_thread_id ? { message_thread_id: Number(opts.message_thread_id) } : {})
    };

    const res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    logTelegramResponse_(res, 'sendPhotoUrl_');
    return res;
  }

  function sendPhotoUrlToChat_(chatId, photoUrl, caption = "", opts = {}) {
    const url = `https://api.telegram.org/bot${CFG.TELEGRAM.TOKEN}/sendPhoto`;

    const payload = {
      chat_id: Number(chatId),
      photo: photoUrl,
      caption: sanitizeTelegramCaption_(caption || ""),
      ...(opts.message_thread_id ? { message_thread_id: Number(opts.message_thread_id) } : {})
    };

    const res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    logTelegramResponse_(res, 'sendPhotoUrlToChat_');
    return res;
  }

  /**
   * ✅ NOUVEAU: télécharge une image (URL) -> blob -> sendPhoto (multipart)
   * Telegram accepte parfaitement l'upload en "photo" blob.
   */
  function sendPhotoFromUrlAsBlob_(imageUrl, caption = "", opts = {}) {
    const imgRes = UrlFetchApp.fetch(imageUrl, { muteHttpExceptions: true });
    const code = imgRes.getResponseCode();
    if (code < 200 || code >= 300) {
      throw new Error(`sendPhotoFromUrlAsBlob_: fetch image failed (${code}) url=${imageUrl}`);
    }

    const namedBlob = imgRes.getBlob().setName(`chart_${Date.now()}.png`);

    const url = `https://api.telegram.org/bot${CFG.TELEGRAM.TOKEN}/sendPhoto`;

    const formData = {
      chat_id: String(CFG.TELEGRAM.CHAT_ID),
      photo: namedBlob
    };

    if (caption) formData.caption = sanitizeTelegramCaption_(caption);
    if (opts.message_thread_id) formData.message_thread_id = String(Number(opts.message_thread_id));

    const res = UrlFetchApp.fetch(url, {
      method: "post",
      payload: formData,
      muteHttpExceptions: true
      // ⚠️ ne PAS mettre contentType ici: UrlFetchApp le gère en multipart auto
    });

    logTelegramResponse_(res, 'sendPhotoFromUrlAsBlob_');
    return res;
  }

  function sendPhotoFromUrlAsBlobToChat_(chatId, imageUrl, caption = "", opts = {}) {
    const imgRes = UrlFetchApp.fetch(imageUrl, { muteHttpExceptions: true });
    const code = imgRes.getResponseCode();
    if (code < 200 || code >= 300) {
      throw new Error(`sendPhotoFromUrlAsBlobToChat_: fetch image failed (${code}) url=${imageUrl}`);
    }

    const namedBlob = imgRes.getBlob().setName(`chart_${Date.now()}.png`);
    const url = `https://api.telegram.org/bot${CFG.TELEGRAM.TOKEN}/sendPhoto`;

    const formData = {
      chat_id: String(Number(chatId)),
      photo: namedBlob
    };

    if (caption) formData.caption = sanitizeTelegramCaption_(caption);
    if (opts.message_thread_id) formData.message_thread_id = String(Number(opts.message_thread_id));

    const res = UrlFetchApp.fetch(url, {
      method: "post",
      payload: formData,
      muteHttpExceptions: true
    });

    logTelegramResponse_(res, 'sendPhotoFromUrlAsBlobToChat_');
    return res;
  }

  function sendPhotoBlob_(blob, caption, opts = {}) {
    const url = `https://api.telegram.org/bot${CFG.TELEGRAM.TOKEN}/sendPhoto`;

    const payload = {
      chat_id: String(CFG.TELEGRAM.CHAT_ID),
      photo: blob.setName(blob.getName() || `img_${Date.now()}.png`)
    };

    if (caption) payload.caption = sanitizeTelegramCaption_(caption);
    if (opts.message_thread_id) payload.message_thread_id = String(Number(opts.message_thread_id));

    const res = UrlFetchApp.fetch(url, {
      method: "post",
      payload,
      muteHttpExceptions: true
    });

    logTelegramResponse_(res, 'sendPhotoBlob_');
    const body = safeContentText_(res);
    if (res.getResponseCode() === 400 && body && body.indexOf('PHOTO_INVALID_DIMENSIONS') >= 0) {
      Utils.debug_('Telegram sendPhotoBlob_: invalid dimensions, retry as document');
      return sendDocumentBlob_(blob, caption, opts);
    }
    return res;
  }

  function sendDocumentBlob_(blob, caption, opts = {}) {
    const url = `https://api.telegram.org/bot${CFG.TELEGRAM.TOKEN}/sendDocument`;

    const payload = {
      chat_id: String(CFG.TELEGRAM.CHAT_ID),
      document: blob.setName(blob.getName() || `doc_${Date.now()}.png`)
    };

    if (caption) payload.caption = sanitizeTelegramCaption_(caption);
    if (opts.message_thread_id) payload.message_thread_id = String(Number(opts.message_thread_id));

    const res = UrlFetchApp.fetch(url, {
      method: "post",
      payload,
      muteHttpExceptions: true
    });

    logTelegramResponse_(res, 'sendDocumentBlob_');
    return res;
  }

  function sendTextToTopic_(topicKey, text) {
    const threadId = CFG.TELEGRAM.TOPICS[topicKey];
    return sendText_(text, { message_thread_id: threadId });
  }

  function sendTextToChat_(chatId, text, opts = {}) {
    const url = `https://api.telegram.org/bot${CFG.TELEGRAM.TOKEN}/sendMessage`;
    const parseMode = opts.parse_mode || "Markdown";
    const safeText = sanitizeTelegramText_(text, parseMode);

    const payload = {
      chat_id: Number(chatId),
      text: safeText,
      parse_mode: parseMode,
      disable_web_page_preview: true,
      ...(opts.message_thread_id ? { message_thread_id: Number(opts.message_thread_id) } : {})
    };

    let res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    res = retryTelegramParseError_(url, payload, res, 'sendTextToChat_');
    logTelegramResponse_(res, 'sendTextToChat_');
    return res;
  }

  function sendInlineButtons_(chatId, text, buttons, opts = {}) {
    const url = `https://api.telegram.org/bot${CFG.TELEGRAM.TOKEN}/sendMessage`;
    const parseMode = opts.parse_mode || 'Markdown';
    const safeText = sanitizeTelegramText_(text, parseMode);

    const payload = {
      chat_id: Number(chatId),
      text: safeText,
      parse_mode: parseMode,
      reply_markup: { inline_keyboard: buttons || [] },
      disable_web_page_preview: true,
      ...(opts.message_thread_id ? { message_thread_id: Number(opts.message_thread_id) } : {})
    };

    let res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    res = retryTelegramParseError_(url, payload, res, 'sendInlineButtons_');
    logTelegramResponse_(res, 'sendInlineButtons_');
    return res;
  }

  function answerCallback_(callbackId, text) {
    const url = `https://api.telegram.org/bot${CFG.TELEGRAM.TOKEN}/answerCallbackQuery`;
    const payload = {
      callback_query_id: callbackId,
      text: text || '',
      show_alert: false
    };

    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    logTelegramResponse_(res, 'answerCallback_');
    return res;
  }

  function clearInlineButtons_(chatId, messageId) {
    const url = `https://api.telegram.org/bot${CFG.TELEGRAM.TOKEN}/editMessageReplyMarkup`;
    const payload = {
      chat_id: Number(chatId),
      message_id: Number(messageId),
      reply_markup: { inline_keyboard: [] }
    };

    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    logTelegramResponse_(res, 'clearInlineButtons_');
    return res;
  }

  function sendPhotoUrlToTopic_(topicKey, photoUrl, caption) {
    const topicId = CFG.TELEGRAM.TOPICS[topicKey];
    Utils.assert(topicId, `Unknown topic: ${topicKey}`);
    return sendPhotoUrl_(photoUrl, caption, { message_thread_id: topicId });
  }

  function sendPhotoBlobToTopic_(topicKey, blob, caption) {
    const topicId = CFG.TELEGRAM.TOPICS[topicKey];
    Utils.assert(topicId, `Unknown topic: ${topicKey}`);
    return sendPhotoBlob_(blob, caption, { message_thread_id: topicId });
  }

  function sendDocumentBlobToTopic_(topicKey, blob, caption) {
    const topicId = CFG.TELEGRAM.TOPICS[topicKey];
    Utils.assert(topicId, `Unknown topic: ${topicKey}`);
    return sendDocumentBlob_(blob, caption, { message_thread_id: topicId });
  }

  function sendPhotoFromUrlAsBlobToTopic_(topicKey, imageUrl, caption = "") {
    const topicId = CFG.TELEGRAM.TOPICS[topicKey];
    Utils.assert(topicId, `Unknown topic: ${topicKey}`);
    return sendPhotoFromUrlAsBlob_(imageUrl, caption, { message_thread_id: topicId });
  }

  function sendPhotoUrlWithFallbackToTopic_(topicKey, imageUrl, caption) {
    const topicId = CFG.TELEGRAM.TOPICS[topicKey];
    Utils.assert(topicId, `Unknown topic: ${topicKey}`);
    const opts = { message_thread_id: topicId };

    let res = sendPhotoUrl_(imageUrl, caption, opts);
    if (res.getResponseCode() === 200) return res;

    try {
      res = sendPhotoFromUrlAsBlob_(imageUrl, caption, opts);
      if (res.getResponseCode() === 200) return res;
    } catch (err) {
      Utils.debug_('sendPhotoUrlWithFallbackToTopic_ blob error', err);
    }

    sendText_(caption || '⚠️ Imagen no disponible', opts);
    return res;
  }

  function sendPhotoUrlWithFallbackToChat_(chatId, imageUrl, caption, opts = {}) {
    let res = sendPhotoUrlToChat_(chatId, imageUrl, caption, opts);
    if (res.getResponseCode() === 200) return res;

    try {
      res = sendPhotoFromUrlAsBlobToChat_(chatId, imageUrl, caption, opts);
      if (res.getResponseCode() === 200) return res;
    } catch (err) {
      Utils.debug_('sendPhotoUrlWithFallbackToChat_ blob error', err);
    }

    sendTextToChat_(chatId, caption || '⚠️ Imagen no disponible', opts);
    return res;
  }

  /**
   * Caption en texte brut (aucun markdown).
   * On enlève les chars qui font chier Telegram parse entities si parse_mode traîne quelque part.
   */
  function sanitizeTelegramCaption_(s) {
    return String(s || '')
      .replace(/[*_[\\]()~`>#+\\-=|{}.!]/g, '') // safe MarkdownV2
      .replace(/\\s+/g, ' ')
      .slice(0, 900)
      .trim();
  }

  /**
   * Texte avec parse_mode=Markdown. On échappe les entités pour éviter "can't parse entities".
   */
  function sanitizeTelegramText_(s, parseMode) {
    const raw = String(s || '');
    const safe = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    if (parseMode) {
      // Markdown: on garde les retours ligne et le format
      return safe.slice(0, 3800);
    }
    return safe.replace(/\s+/g, ' ').trim().slice(0, 3800);
  }

  function retryTelegramParseError_(url, payload, res, ctx) {
    if (!res) return res;
    if (res.getResponseCode() !== 400) return res;
    const body = safeContentText_(res);
    if (!body || body.indexOf("can't parse entities") === -1) return res;

    Utils.debug_('Telegram parse error, retry without parse_mode', { ctx, body });
    const retryPayload = Object.assign({}, payload);
    delete retryPayload.parse_mode;
    retryPayload.text = sanitizeTelegramText_(payload.text, null);

    return UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(retryPayload),
      muteHttpExceptions: true
    });
  }

  function safeContentText_(res) {
    try {
      return res.getContentText().slice(0, 800);
    } catch (e) {
      return '';
    }
  }

  function logTelegramResponse_(res, ctx) {
    const code = res.getResponseCode();
    const body = safeContentText_(res);
    Utils.debug_(`Telegram ${ctx} status=${code} body=${body}`);
  }

  return {
    sendText_,
    sendPhotoUrl_,
    sendTextToTopic_,
    sendTextToChat_,
    sendPhotoUrlToChat_,
    sendInlineButtons_,
    answerCallback_,
    clearInlineButtons_,
    sendPhotoUrlToTopic_,
    sendPhotoUrlWithFallbackToTopic_,
    sendPhotoUrlWithFallbackToChat_,
    sendPhotoFromUrlAsBlobToTopic_,
    sendPhotoBlobToTopic_,
    sendDocumentBlobToTopic_
  };
})();