/**
 * ====== UTILS ======
 * Helpers génériques, dates MX, parsing robuste, markdown, etc.
 */
function shouldSkipTelegramUpdate_(update) {
  if (!update || update.update_id == null) return false;
  const key = 'TG_LAST_UPDATE_ID';
  const props = PropertiesService.getScriptProperties();
  const last = Number(props.getProperty(key) || 0);
  const current = Number(update.update_id || 0);
  if (current <= last) return true;
  props.setProperty(key, String(current));
  return false;
}

const Utils = (() => {

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function toNumber(v) {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  function toMoneyNumber(v) {
    if (v == null) return 0;
    const cleaned = String(v).replace(/[^0-9.-]/g, '');
    const n = Number(cleaned);
    return isNaN(n) ? 0 : n;
  }

  function roundInt(n) {
    return Math.round(Number(n || 0));
  }

  function escapeMd(s) {
    return String(s).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }

  function debug_(msg, data) {
    if (!CFG || !CFG.DEBUG) return;
    const suffix = (typeof data !== 'undefined') ? ` | ${safeStringify_(data)}` : '';
    Logger.log(`[DEBUG] ${msg}${suffix}`);
  }

  function safeStringify_(obj) {
    try {
      return JSON.stringify(obj).slice(0, 500);
    } catch (e) {
      return String(obj);
    }
  }

  function assert(cond, msg) {
    if (!cond) throw new Error(msg);
  }

  // Force Date
  function asDate(v) {
    if (v instanceof Date) return v;

    // numbers / serials / strings parseables
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;

    throw new Error(`No pude convertir a fecha: ${v}`);
  }

  // Key stable "yyyy-MM-dd" en TZ Mexico
  function dateKeyMX(d) {
    return Utilities.formatDate(asDate(d), CFG.TZ, 'yyyy-MM-dd');
  }

  function formatDateMX(d) {
    return Utilities.formatDate(asDate(d), CFG.TZ, 'dd/MM/yyyy HH:mm');
  }

  // Fermeture: samedi 14h sinon 20h
  function getClosingTime(now) {
    const wd = Number(Utilities.formatDate(now, CFG.TZ, 'u')); // 1=lun..6=sab..7=dim
    const closeHour = (wd === 6) ? 14 : 20;

    const y = Number(Utilities.formatDate(now, CFG.TZ, 'yyyy'));
    const m = Number(Utilities.formatDate(now, CFG.TZ, 'MM')) - 1;
    const day = Number(Utilities.formatDate(now, CFG.TZ, 'dd'));

    return new Date(y, m, day, closeHour, 0, 0);
  }

  function minutesBetween(a, b) {
    return Math.floor((b.getTime() - a.getTime()) / 60000);
  }

  function nowMX() {
    return new Date(
      Utilities.formatDate(
        new Date(),
        CFG.TZ,
        "yyyy/MM/dd HH:mm:ss"
      )
    )
  };

  function trimLower(s) {
    return String(s || '').trim().toLowerCase();
  }

  function stripMarkdown(s) {
    return String(s || '').replace(/[*_`\[\]()]/g, '');
  };

  function formatDateShortMX_(d) {
  return Utilities.formatDate(d, CFG.TZ, "EEE d MMMM"); // ex: "lun. 23 enero"
}

  return {
    pick,
    toNumber,
    toMoneyNumber,
    roundInt,
    trimLower,
    escapeMd,
    debug_,
    shouldSkipTelegramUpdate_,
    assert,
    asDate,
    dateKeyMX,
    formatDateMX,
    formatDateShortMX_,
    getClosingTime,
    minutesBetween,
    nowMX,
    stripMarkdown
  };

})();
