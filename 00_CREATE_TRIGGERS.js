function installCierreTriggers() {
  try {
    const all = ScriptApp.getProjectTriggers();
    all.forEach(t => {
      if (t.getHandlerFunction() === 'crm_runNow_slot') {
        ScriptApp.deleteTrigger(t);
      }
    });

    const slots = CFG.CRM.CIERRE_SLOTS;

    slots.forEach(hm => {
      const [h, m] = hm.split(':').map(Number);

      ScriptApp.newTrigger('crm_runNow_slot')
        .timeBased()
        .everyDays(1)
        .atHour(h)
        .nearMinute(m)
        .create();
    });

    Utils.debug_('✅ Cierre triggers installed', slots.join(', '));

  } catch (err) {
    Utils.debug_('createCierreTriggers error', err);
    try {
      Telegram.sendTextToTopic_(
        'ERRORES',
        `🚨 *ERROR installCierreTriggers*\n\`\`\`\n${String(err)}\n\`\`\``
      );
    } catch (_) {}
    throw err;
  }
}

function installAperturaTriggers() {
  try {
    const all = ScriptApp.getProjectTriggers();
    all.forEach(t => {
      if (t.getHandlerFunction() === 'crm_openingAlert') {
        ScriptApp.deleteTrigger(t);
      }
    });

    ScriptApp.newTrigger('crm_openingAlert')
      .timeBased()
      .everyDays(1)
      .atHour(8)
      .nearMinute(0)
      .create();

    Utils.debug_('✅ Apertura trigger installed at 08:00');

  } catch (err) {
    Utils.debug_('installAperturaTriggers error', err);
    try {
      Telegram.sendTextToTopic_(
        'ERRORES',
        `🚨 *ERROR installAperturaTriggers*\n\`\`\`\n${String(err)}\n\`\`\``
      );
    } catch (_) {}
    throw err;
  }
}
