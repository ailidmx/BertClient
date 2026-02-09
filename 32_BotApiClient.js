// 32_BotApiClient
// Client HTTP vers bert-telegram-bot (endpoints API)
const BotApi = (() => {
  function getConfig_() {
    const cfg = Config.getBotApi_();
    return {
      baseUrl: cfg.BASE_URL || '',
      token: cfg.TOKEN || ''
    };
  }

  function buildUrl_(action, params = {}) {
    const { baseUrl, token } = getConfig_();
    if (!baseUrl) throw new Error('BotApi: BASE_URL no configurado');
    const query = Object.assign({}, params, { action, token });
    const qs = Object.keys(query)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(query[k]))}`)
      .join('&');
    return `${baseUrl}?${qs}`;
  }

  function getJson_(action, params = {}) {
    const url = buildUrl_(action, params);
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const code = res.getResponseCode();
    const text = res.getContentText() || '';
    if (code < 200 || code >= 300) {
      throw new Error(`BotApi ${action} (${code}): ${text}`);
    }
    return JSON.parse(text || '{}');
  }

  function getCalendario_() {
    return getJson_('calendario');
  }

  function getKpi_() {
    return getJson_('kpi');
  }

  function shouldSendInicioMes_() {
    return getJson_('alert_inicio_mes');
  }

  function shouldSendFinMes_() {
    return getJson_('alert_fin_mes');
  }

  function getMonthlyChart_() {
    return getJson_('monthly_chart');
  }

  function getDailyChart_(dateKey) {
    return getJson_('daily_chart', dateKey ? { date: dateKey } : {});
  }

  return {
    getJson_,
    getCalendario_,
    getKpi_,
    shouldSendInicioMes_,
    shouldSendFinMes_,
    getMonthlyChart_,
    getDailyChart_
  };
})();