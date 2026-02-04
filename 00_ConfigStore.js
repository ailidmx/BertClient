// 00_ConfigStore
// Config accessors + install helper for library usage.
const Config = (() => {
  const PROP_KEYS = {
    API_TOKEN: 'API_TOKEN',
    DATA_SPREADSHEET_ID: 'DATA_SPREADSHEET_ID',
    TELEGRAM_TOKEN: 'TELEGRAM_TOKEN',
    TELEGRAM_BOT_USERNAME: 'TELEGRAM_BOT_USERNAME',
    TELEGRAM_WEBAPP_URL: 'TELEGRAM_WEBAPP_URL',
    TELEGRAM_CHAT_ID: 'TELEGRAM_CHAT_ID',
    TELEGRAM_TOPICS_JSON: 'TELEGRAM_TOPICS_JSON'
  };

  function props_() {
    return PropertiesService.getScriptProperties();
  }

  function getProp_(key) {
    return props_().getProperty(key) || '';
  }

  function getApiToken_() {
    return getProp_(PROP_KEYS.API_TOKEN) || CFG.API_TOKEN;
  }

  function getData_() {
    return {
      SPREADSHEET_ID: getProp_(PROP_KEYS.DATA_SPREADSHEET_ID) || CFG.DATA.SPREADSHEET_ID
    };
  }

  function getTelegram_() {
    const rawTopics = getProp_(PROP_KEYS.TELEGRAM_TOPICS_JSON);
    let topics = CFG.TELEGRAM.TOPICS;
    if (rawTopics) {
      try {
        topics = JSON.parse(rawTopics);
      } catch (_) {
        topics = CFG.TELEGRAM.TOPICS;
      }
    }

    const chatIdRaw = getProp_(PROP_KEYS.TELEGRAM_CHAT_ID);
    const chatId = chatIdRaw ? Number(chatIdRaw) : CFG.TELEGRAM.CHAT_ID;

    return {
      TOKEN: getProp_(PROP_KEYS.TELEGRAM_TOKEN) || CFG.TELEGRAM.TOKEN,
      BOT_USERNAME: getProp_(PROP_KEYS.TELEGRAM_BOT_USERNAME) || CFG.TELEGRAM.BOT_USERNAME,
      WEBAPP_URL: getProp_(PROP_KEYS.TELEGRAM_WEBAPP_URL) || CFG.TELEGRAM.WEBAPP_URL,
      CHAT_ID: chatId,
      TOPICS: topics
    };
  }

  function install_(opts) {
    const options = opts || {};
    const props = {};

    if (options.apiToken) props[PROP_KEYS.API_TOKEN] = String(options.apiToken);
    if (options.spreadsheetId) props[PROP_KEYS.DATA_SPREADSHEET_ID] = String(options.spreadsheetId);

    if (options.telegramToken) props[PROP_KEYS.TELEGRAM_TOKEN] = String(options.telegramToken);
    if (options.telegramBotUsername) props[PROP_KEYS.TELEGRAM_BOT_USERNAME] = String(options.telegramBotUsername);
    if (options.telegramWebappUrl) props[PROP_KEYS.TELEGRAM_WEBAPP_URL] = String(options.telegramWebappUrl);
    if (options.telegramChatId !== undefined && options.telegramChatId !== null) {
      props[PROP_KEYS.TELEGRAM_CHAT_ID] = String(options.telegramChatId);
    }
    if (options.telegramTopics) {
      props[PROP_KEYS.TELEGRAM_TOPICS_JSON] = JSON.stringify(options.telegramTopics);
    }

    if (Object.keys(props).length) {
      props_().setProperties(props, false);
    }

    return {
      apiToken: getApiToken_(),
      data: getData_(),
      telegram: getTelegram_()
    };
  }

  return {
    getApiToken_,
    getData_,
    getTelegram_,
    install_
  };
})();
