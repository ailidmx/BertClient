// 41_MessageBuilder_CRM
const CRM_Messages = (() => {

  function buildCierreMissing_(now, cal, kpi) {
    const fecha = Utils.formatDateMX(now);

    // Objectif officiel du jour
    const goal = Utils.roundInt(cal?.obj || kpi.goal || 0);

    // Ventes enregistrées (live / form)
    const reg = Utils.roundInt(kpi.sold);

    // Caisse (normalement 0 tant que pas de cierre)
    const caja = Utils.roundInt(cal?.ventasCaja || 0);

    // % estimé basé sur les ventes enregistrées
    const pctLiveTxt = goal > 0
      ? `${Math.round((reg / goal) * 100)}%`
      : '—';

    const lines = [];
    lines.push(`🔴 *CIERRE PENDIENTE*`);
    lines.push(`🕒 ${fecha}`);

    // ✅ clair et non ambigu
    lines.push(`🧾 Ventas registradas: *${reg}*`);
    const gratisDia = Utils.roundInt(cal?.gratisDia || kpi?.gratis || 0);
    const gratisDiaPromo2 = Utils.roundInt(cal?.gratisDiaPromo2 || 0);
    if (gratisDia > 0) {
      lines.push(`🎁 Promo 1 (1 producto gratis): *${gratisDia}*`);
    }
    if (gratisDiaPromo2 > 0) {
      lines.push(`🎁 Promo 2 (2 productos gratis): *${gratisDiaPromo2}*`);
    }

    if (goal > 0) {
      const canasta = kpi.canastaProm ? kpi.canastaProm.toFixed(2) : '';
      const extra = canasta ? ` | 🧺 Canasta prom: *${canasta}*` : '';
      lines.push(`🎯 Objetivo: *${goal}* | 📊 %Obj (estimado): *${pctLiveTxt}*${extra}`);
    }

    const ritmoLine = buildRitmoVentaLine_(cal);
    if (ritmoLine) lines.push(ritmoLine);

    const warns = [
      '😈 *Ojo*: todavía no hay *VENTAS CAJA* registradas.',
      '⚠️ Aún falta registrar *VENTAS CAJA*.',
      '🔔 Falta el cierre de caja para terminar el día.',
      '🚨 Cierre pendiente: la caja aún no está reportada.',
      '🧾 Sin caja registrada, no cerramos el día.',
      '⏳ Seguimos esperando *VENTAS CAJA*.',
      '🧯 El cierre sigue abierto: falta la caja.',
      '📌 Nota: falta registrar la caja para cerrar.',
      '👀 Aún no aparece la caja del día.',
      '🛑 Falta el último paso: *VENTAS CAJA*.'
    ];

    const nextSteps = [
      '🧾 En cuanto cierres caja, se apaga esta alarma.',
      '✅ Cuando registres caja, todo queda listo.',
      '🟢 Al registrar caja, cerramos automáticamente.',
      '🔒 Cierra caja y queda resuelto.',
      '🧾 Registra caja y listo.',
      '📌 Con caja registrada, terminamos.',
      '🧾 Reporta caja y todo en orden.',
      '🧾 En cuanto cargues la caja, se calma esto.'
    ];

    const teasers = [
      `👀 *Teasing*: tus registradas dicen *${reg}*… vamos a ver qué sale en caja 😈`,
      `🧐 Registradas: *${reg}*. Falta ver la caja real.`,
      `😏 Registradas hoy: *${reg}*. A ver qué dice caja.`,
      `🔎 Registradas: *${reg}*. Caja todavía pendiente.`,
      `📦 Registradas: *${reg}*. Solo falta el cierre.`
    ];

    lines.push(`\n${Utils.pick(warns)}`);
    lines.push(Utils.pick(nextSteps));
    lines.push(Utils.pick(teasers));

    return lines.join('\n');
  }

  function punchCierreMissing_(now, cal, kpi) {
    const reg = Utils.roundInt(kpi.sold);
    const goal = Utils.roundInt(cal.obj || kpi.goal || 0);
    const missing = goal > 0 ? Math.max(0, goal - reg) : 0;

    const pool = [
      `🚨 Cierra caja ya, crack.`,
      `😈 Falta el cierre… y falta dormir.`,
      `🧾 Sin caja no hay paz. Dale.`,
      `⚠️ Último paso: VENTAS CAJA.`,
      `🔥 Una venta más y cerramos bonito.`,
      goal > 0 ? `🎯 Estimado: ${reg}/${goal}. Faltan ${missing}.` : `💪 Reporta caja y listo.`,
      `🧾 Caja pendiente. No te vayas sin cerrarla.`,
      `🛎️ Última llamada: cierre de caja.`,
      `🔒 Cierra caja y descansa tranquilo.`,
      `👀 Caja faltante. Lo último del día.`,
      `🚦 Último semáforo: caja.`,
      `🧯 Apaga esta alerta cerrando caja.`
    ];
    return Utils.pick(pool);
  }

  function punchCierreOk_(now, cal, kpi) {
    const caja = Utils.roundInt(cal.ventasCaja || 0);
    const goal = Utils.roundInt(cal.obj || kpi.goal || 0);
    const pct = goal > 0 ? Math.round((caja / goal) * 100) : null;

    const pool = [
      `✅ Cierre hecho. Respeto.`,
      `🌙 Cerrado y a descansar.`,
      `🧾 Caja lista. Buen trabajo.`,
      `🔥 Mañana rompemos récord.`,
      goal > 0 ? `🎯 ${pct}% del objetivo (caja). Bien ahí.` : `🚀 Seguimos con todo.`,
      `🎉 Caja cerrada. Misión cumplida.`,
      `🏁 Cierre OK. Buen trabajo hoy.`,
      `👏 Caja lista. Gran día.`,
      `🛎️ Cierre completado.`,
      `💪 Buen cierre. Se siente el avance.`,
      `✨ Cierre perfecto.`,
      `🙌 Caja cerrada. Buenísimo.`
    ];
    return Utils.pick(pool);
  }

  function buildCierreOk_(now, cal, kpi) {
    const fecha = Utils.formatDateMX(now);

    const caja = Utils.roundInt(cal.ventasCaja);        // ventes officielles caisse
    const registradas = Utils.roundInt(kpi.sold);       // ventes enregistrées (form)
    const objetivo = Utils.roundInt(kpi.goal);

    const diffCajaVsReg = caja - registradas;

    // %Obj C. : on le calcule sur CAJA
    const pctCaja = (objetivo > 0) ? (caja / objetivo) : 0;
    const pctTxt = (objetivo > 0) ? `${Math.round(pctCaja * 100)}%` : '—';

    // “Productos vendidos : +9” = CAJA - OBJ (si positif)
    const plus = (objetivo > 0) ? (caja - objetivo) : 0;
    const plusTxt = (plus >= 0) ? `+${plus}` : `${plus}`;

    const lines = [];
    lines.push(`✅ *CIERRE REGISTRADO*`);
    lines.push(`🕒 ${fecha}`);

    // ✅ demandé : changer l’intitulé
    lines.push(`📦 Ventas del día: *${caja}*`);
    lines.push(`🧾 Ventas registradas: *${registradas}*`);
    const gratisDia = Utils.roundInt(cal?.gratisDia || kpi?.gratis || 0);
    const gratisDiaPromo2 = Utils.roundInt(cal?.gratisDiaPromo2 || 0);
    if (gratisDia > 0) {
      lines.push(`🎁 Promo 1 (1 producto gratis): *${gratisDia}*`);
    }
    if (gratisDiaPromo2 > 0) {
      lines.push(`🎁 Promo 2 (2 productos gratis): *${gratisDiaPromo2}*`);
    }

    // ✅ check principal : CAJA vs REGISTRADAS
    lines.push(`\n🔎 Check principal:`);
    lines.push(`• Caja - Registradas: *${diffCajaVsReg}* ${diffCajaVsReg !== 0 ? '⚠️' : '✅'}`);

    if (diffCajaVsReg !== 0) {
      lines.push(`  😬 Parece que se olvidó registrar algunas ventas. Cuidado para la próxima.`);
    }

    // ✅ demandé : bloc objectif simplifié
    if (objetivo > 0) {
      lines.push(`\n🎯 Objetivo: *${objetivo}*`);
      lines.push(`📦 Ventas del día: *${caja}*`);
      lines.push(`🏁 Productos vendidos : *${plusTxt}*`);
      if (kpi.canastaProm && kpi.canastaProm > 0) {
        lines.push(`🧺 Canasta prom: *${kpi.canastaProm.toFixed(2)}*`);
      }
      lines.push(`✅ Realización objectivo diario: *${pctTxt}*`);
    }

    const ritmoLine = buildRitmoVentaLine_(cal);
    if (ritmoLine) lines.push(ritmoLine);

    const closes = [
      '🌙 Buen cierre. Mañana más fuerte.',
      '👏 Cierre listo. Descansa y mañana seguimos.',
      '✅ Trabajo terminado. A recargar baterías.',
      '🌟 Cierre completo. Buen descanso, equipo.',
      '🧘‍♂️ Cierre hecho. Toca desconectar un rato.',
      '🥇 Cerrado con éxito. Mañana rompemos récord.',
      '💤 Caja cerrada. A dormir con la misión cumplida.',
      '✨ Día cerrado. Gracias por el esfuerzo.',
      '🛏️ Cierre terminado. Nos vemos mañana con todo.',
      '🤝 Buen cierre. Seguimos creciendo.',
      '🌅 Cierre OK. Mañana volvemos al ataque.',
      '🚀 Fin del día. Mañana más alto.',
      '💪 Gran trabajo. Descanso merecido.',
      '🧾 Caja finalizada. Buen trabajo hoy.',
      '🎉 Cierre completo. Buen cierre de jornada.',
      '🌌 Día cerrado. Descanso merecido.',
      '🧾 Caja hecha. Buenísima jornada.',
      '🌙 Descanso con la tarea cumplida.',
      '✅ Cierre de lujo. Nos vemos mañana.',
      '🌟 Gran cierre. Gracias equipo.',
      '🛌 Buenas noches, cierre completado.',
      '🚀 Cierre top. Mañana seguimos creciendo.',
      '👏 Jornada cerrada. Excelente trabajo.',
      '💼 Caja cerrada. Buen día de ventas.',
      '🎯 Objetivo cerrado. Descanso merecido.'
    ];

    lines.push(`\n${Utils.pick(closes)}`);
    return lines.join('\n');
  }


  function buildDescanso_(now, cal) {
    const fecha = Utils.formatDateMX(now);
    const rests = [
      'Hoy no se trabaja. Recarga batería 😌',
      'Día libre. Que se recargue el motor.',
      'Descanso total. Mañana volvemos fuertes.',
      'Hoy toca recargar energía. Mañana a romperla.',
      'Pausa merecida. Buen descanso.',
      'Día de descanso. Cuerpo y mente al 100.',
      'Hoy no hay ventas. Solo descanso.',
      'Respira. Mañana seguimos.',
      'Día tranquilo. Recupera fuerzas.',
      'Recarga hecha. Mañana vamos con todo.'
    ];

    const endings = [
      'Mañana volvemos por el objetivo.',
      'Mañana regresamos con todo.',
      'Mañana a por más ventas.',
      'Mañana reiniciamos con energía.',
      'Mañana seguimos la misión.'
    ];

    const lines = [
      `🌿 *DESCANSO*`,
      `🕒 ${fecha}`,
      Utils.pick(rests)
    ];

    const ritmoLine = buildRitmoVentaLine_(cal);
    if (ritmoLine) lines.push(ritmoLine);

    lines.push(Utils.pick(endings));
    return lines.join('\n');
  }

  function buildApertura_(now, cal, kpi, month) {
    const fecha = Utils.formatDateMX(now);
    const goal = Utils.roundInt(cal?.obj || kpi.goal || 0);
    const monthObj = Utils.roundInt(month?.obj || 0);
    const monthCaja = Utils.roundInt(month?.ventasCaja || 0);
    const pctMonth = monthObj > 0
      ? Math.round((monthCaja / monthObj) * 100)
      : Number(month?.pctMes || 0);

    const lines = [];
    if (cal && cal.abierto === false) {
      lines.push(`🌿 *DÍA DE DESCANSO*`);
    } else {
      lines.push(`🌅 *APERTURA DEL DÍA*`);
    }
    lines.push(`🕒 ${fecha}`);

    if (goal > 0) {
      lines.push(`🎯 Objetivo hoy: *${goal}*`);
    } else {
      lines.push(`🎯 Objetivo hoy: *—*`);
    }

    if (monthObj > 0) {
      lines.push(`📆 Avance del mes: *${monthCaja}* / Meta: *${monthObj}* → *${pctMonth}%*`);
    } else {
      lines.push(`📆 Avance del mes: *${monthCaja}*`);
    }

    const ritmoLine = buildRitmoVentaLine_(cal);
    if (ritmoLine) lines.push(ritmoLine);

    const closes = [
      '💪 Hoy se rompe el marcador.',
      '🚀 Arrancamos fuerte.',
      '🔥 Día nuevo, objetivo nuevo.',
      '🧠 Enfoque total desde la apertura.',
      '⚡️ A vender con ritmo desde temprano.'
    ];

    lines.push(`\n${Utils.pick(closes)}`);
    return lines.join('\n');
  }

  function punchApertura_(now, cal, kpi, month) {
    const goal = Utils.roundInt(cal?.obj || kpi.goal || 0);
    const monthObj = Utils.roundInt(month?.obj || 0);
    const monthCaja = Utils.roundInt(month?.ventasCaja || 0);
    const pctMonth = monthObj > 0
      ? Math.round((monthCaja / monthObj) * 100)
      : Number(month?.pctMes || 0);

    const pool = [
      goal > 0 ? `🎯 Obj hoy: ${goal}` : '🎯 Obj hoy: —',
      monthObj > 0 ? `📆 Avance mes: ${monthCaja}/${monthObj} (${pctMonth}%)` : `📆 Avance mes: ${monthCaja}`,
      '🚀 Apertura con todo',
      '🔥 Desde temprano se gana',
      '⚡️ Arranque fuerte'
    ];
    return Utils.pick(pool);
  }

  function buildRitmoVentaLine_(cal) {
    if (!cal || cal.ritmoVentaMes === '' || cal.ritmoVentaMes == null) return '';
    const ritmo = Utils.toNumber(cal.ritmoVentaMes);
    if (!isFinite(ritmo) || ritmo <= 0) return '';
    return `⚡ Ritmo actual (prod/día hábil): *${ritmo.toFixed(2)}*`;
  }

  function buildObjetivoMesOk_(now, month) {
    const obj = Utils.roundInt(month?.obj || 0);
    const caja = Utils.roundInt(month?.ventasCaja || 0);
    const pct = obj > 0 ? Math.round((caja / obj) * 100) : 0;
    const mes = Utilities.formatDate(now, CFG.TZ, 'MMMM yyyy');

    const lines = [];
    lines.push('🏆 *META MENSUAL ALCANZADA*');
    lines.push(`📆 ${mes}`);
    lines.push(`✅ Ventas acumuladas: *${caja}*`);
    if (obj > 0) {
      lines.push(`🎯 Objetivo mes: *${obj}* → *${pct}%*`);
    }
    lines.push('🚀 ¡Excelente trabajo equipo!');
    return lines.join('\n');
  }

  function buildInicioMes_(now, cal) {
    const fecha = Utils.formatDateMX(now);
    const diaMes = Utils.roundInt(cal?.diaMes || 0);
    const diasMes = Utils.roundInt(cal?.diasMes || 0);
    const lines = [];
    lines.push('🗓️ *INICIO DE MES*');
    lines.push(`🕒 ${fecha}`);
    if (diaMes > 0 && diasMes > 0) {
      lines.push(`📆 Día hábil: *${diaMes}* / *${diasMes}*`);
    }
    lines.push('🚀 Primer día trabajado. ¡Arrancamos fuerte!');
    return lines.join('\n');
  }

  function buildFinMes_(now, cal) {
    const fecha = Utils.formatDateMX(now);
    const diaMes = Utils.roundInt(cal?.diaMes || 0);
    const diasMes = Utils.roundInt(cal?.diasMes || 0);
    const lines = [];
    lines.push('🏁 *CIERRE DE MES*');
    lines.push(`🕒 ${fecha}`);
    if (diaMes > 0 && diasMes > 0) {
      lines.push(`📆 Día hábil: *${diaMes}* / *${diasMes}*`);
    }
    lines.push('🔥 Último día trabajado del mes. ¡A rematar!');
    return lines.join('\n');
  }

  return {
    buildCierreMissing_,
    buildCierreOk_,
    buildDescanso_,
    buildApertura_,
    buildObjetivoMesOk_,
    buildInicioMes_,
    buildFinMes_,
    punchCierreMissing_,
    punchCierreOk_,
    punchApertura_
  };
})();
