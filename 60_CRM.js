// 60_CRM.gs
const CRM = (() => {

  function runHourly_(now, opts = {}) {
    const force = !!opts.force;
    const topicKey = opts.topicKey || 'CIERRE';

    if (!force && !isCierreSlot_(now)) return;

    const cal = Calendario.getRowForDate_(now);
    if (!cal) {
      Telegram.sendTextToTopic_(
        'ERRORES',
        `⚠️ Calendario: no encontré fila para hoy (${Utils.dateKeyMX(now)})`
      );
      return;
    }

    const kpi = Ventas.computeKpiDiario_(now);
    const month = Calendario.getMonthTotals_(now);

    // --- DESCANSO ---
    if (!cal.abierto) {
      const punch = "🌿 Descanso. Recarga batería 😌";
      const memeUrl = MemeGen.buildCierreMeme_(now, cal, kpi, 'descanso');

      Telegram.sendPhotoUrlWithFallbackToTopic_(topicKey, memeUrl, punch);

      const key = keySlot_(now, 'DESCANSO_TX');
      sendOnce_(key, () => {
        const msg = CRM_Messages.buildDescanso_(now, cal);
        Telegram.sendTextToTopic_(topicKey, msg);
      }, force);

      maybeSendObjetivoMesOk_(now, month, force, topicKey);

      return;
    }

    const ventasCaja = Utils.roundInt(cal.ventasCaja || 0);

    // --- MISSING CAJA ---
    if (ventasCaja <= 0) {
      const punch = CRM_Messages.punchCierreMissing_(now, cal, kpi);
      const memeUrl = MemeGen.buildCierreMeme_(now, cal, kpi, 'missing');
      Telegram.sendPhotoUrlWithFallbackToTopic_(topicKey, memeUrl, punch);

      const key = keySlot_(now, 'CIERRE_MISSING_TX');
      sendOnce_(key, () => {
        const msg = CRM_Messages.buildCierreMissing_(now, cal, kpi);
        Telegram.sendTextToTopic_(topicKey, msg);
      }, force);

      const chartKey = keySlot_(now, 'CIERRE_HOURLY_CHART');
      sendOnce_(chartKey, () => CRM_Charts.sendDailyHourly_(now, topicKey, { period: 'compare' }), force);

      return;
    }

    // --- OK ---
    const punchOk = CRM_Messages.punchCierreOk_(now, cal, kpi);
    const memeOk = MemeGen.buildCierreMeme_(now, cal, kpi, 'ok');
    Telegram.sendPhotoUrlWithFallbackToTopic_(topicKey, memeOk, punchOk);

    const okKey = keyDay_(now, 'CIERRE_OK_TX_ONCE');
    sendOnce_(okKey, () => {
      const msg = CRM_Messages.buildCierreOk_(now, cal, kpi);
      Telegram.sendTextToTopic_(topicKey, msg);
    }, force);

    maybeSendObjetivoMesOk_(now, month, force, topicKey);

    const chartKey = keySlot_(now, 'CIERRE_HOURLY_CHART');
    sendOnce_(chartKey, () => CRM_Charts.sendDailyHourly_(now, topicKey, { period: 'compare' }), force);

    const monthKey = keyDay_(now, 'CIERRE_MONTH_CHART');
    sendOnce_(monthKey, () => CRM_Charts.sendMonthlyCaja_(now, topicKey), force);
  }

  function runApertura_(now, opts = {}) {
    const force = !!opts.force;
    const ignoreClosed = !!opts.ignoreClosed;
    Utils.debug_('Apertura start', { now: Utils.formatDateMX(now), force: force });
    const cal = Calendario.getRowForDate_(now);
    if (!cal) {
      Telegram.sendTextToTopic_(
        'ERRORES',
        `⚠️ Calendario: no encontré fila para hoy (${Utils.dateKeyMX(now)})`
      );
      Utils.debug_('Apertura abort: no calendario row');
      return;
    }

    if (!cal.abierto && !ignoreClosed) {
      const kpi = Ventas.computeKpiDiario_(now);
      const month = Calendario.getMonthTotals_(now);
      const punch = '🌿 Descanso, pero seguimos el mes.';
      const memeUrl = MemeGen.buildCierreMeme_(now, cal, kpi, 'descanso');
      Telegram.sendPhotoUrlWithFallbackToTopic_('VENTAS', memeUrl, punch);

      const msg = CRM_Messages.buildApertura_(now, cal, kpi, month);
      Telegram.sendTextToTopic_('VENTAS', msg);

      CRM_Charts.sendMonthlyCaja_(now, 'VENTAS');
      return;
    }

    const kpi = Ventas.computeKpiDiario_(now);
    const month = Calendario.getMonthTotals_(now);
    maybeSendObjetivoMesOk_(now, month, force, 'VENTAS');

    const punch = CRM_Messages.punchApertura_(now, cal, kpi, month);
    const memeUrl = MemeGen.buildAperturaMeme_(now, cal, kpi, month, punch);
    Utils.debug_('Apertura punch', punch);
    Utils.debug_('Apertura memeUrl', memeUrl);
    Telegram.sendPhotoUrlWithFallbackToTopic_('VENTAS', memeUrl, punch);

    const key = keyDay_(now, 'APERTURA_TX_ONCE');
    sendOnce_(key, () => {
      const msg = CRM_Messages.buildApertura_(now, cal, kpi, month);
      Utils.debug_('Apertura message', msg);
      Telegram.sendTextToTopic_('VENTAS', msg);
    }, force);

    const chartKey = keyDay_(now, 'APERTURA_MONTH_CHART');
    sendOnce_(chartKey, () => {
      CRM_Charts.sendMonthlyCaja_(now, 'VENTAS');
    }, force);
  }

  function isCierreSlot_(now) {
    const hm = Utilities.formatDate(now, CFG.TZ, 'HH:mm');
    return (CFG.CRM?.CIERRE_SLOTS || []).includes(hm);
  }

  function keyDay_(now, label) {
    return `${label}:${Utils.dateKeyMX(now)}`;
  }

  function keySlot_(now, label) {
    const day = Utils.dateKeyMX(now);
    const hm = Utilities.formatDate(now, CFG.TZ, 'HH:mm');
    return `${label}:${day}:${hm}`;
  }

  function sendOnce_(key, fn, force) {
    if (!force && State.wasSent_(key)) return false;
    fn();
    State.markSent_(key);
    return true;
  }

  function maybeSendObjetivoMesOk_(now, month, force, topicKey) {
    if (!month) return;
    const obj = Utils.roundInt(month.obj || 0);
    const caja = Utils.roundInt(month.ventasCaja || 0);
    if (obj <= 0 || caja <= 0) return;
    if (caja < obj) return;

    const key = keyDay_(now, 'OBJ_MES_OK');
    sendOnce_(key, () => {
      const msg = CRM_Messages.buildObjetivoMesOk_(now, month);
      Telegram.sendTextToTopic_(topicKey || 'VENTAS', msg);
    }, force);
  }

  return { runHourly_, runApertura_ };
})();
