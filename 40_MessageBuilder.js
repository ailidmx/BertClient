/**
 * ====== MESSAGE BUILDER ======
 * Génère le texte Telegram.
 */
const Messages = (() => {

  function emojiPago_(pago) {
    const p = String(pago || '').toLowerCase();
    if (p.includes('efect')) return '💵';
    if (p.includes('terminal') || p.includes('tarjeta')) return '💳';
    if (p.includes('transfer')) return '🏦';
    return '💰';
  }

  function motivationByContext_(venta, kpi) {
    const v = venta.vendedor || 'crack';
    const n = Math.max(1, Number(venta.productos || 1));

    const urgent = (kpi.minsLeft > 0 && kpi.minsLeft <= 90 && kpi.missing >= 10);
    const mood = pickMood_(kpi);

    const one = [
      `😏 ${v}, con *1* no pagamos ni el aire. La siguiente mínimo *3*, ¿va?`,
      `🐣 ${v}, ya arrancó. Ahora sí: *modo volumen*.`,
      `🫠 ${v}, 1… ok. ¿Y si hoy sí nos ponemos serios?`,
      `🥊 ${v}, un golpecito. Ahora mete el combo.`,
      `🧲 ${v}, atrae clientes, no fantasmas 😈`,
      `🦅 ${v}, 1 es señal… de que hoy toca despegar.`,
      `👀 ${v}, primera cayó. Ahora que no se enfríe.`,
      `🧯 ${v}, fuego mínimo… ahora prende el real.`,
      `🎯 ${v}, 1 cuenta, pero hoy queremos más.`,
      `🧊 ${v}, rompimos el hielo. Ahora sube la temperatura.`,
      `🛫 ${v}, despegamos. Siguiente parada: *5+*.`,
      `🧠 ${v}, ya encendimos. Ahora modo venta.`,
      `🐉 ${v}, 1 es el inicio. Vamos por la racha.`,
      `🥤 ${v}, esa venta sabe a apertura. Dale otra.`,
      `👣 ${v}, primer paso listo. Ahora aceleramos.`,
      `🔋 ${v}, batería cargada. Súbele.`,
      `🪙 ${v}, una moneda cayó. Ahora la bolsa completa.`,
      `🧨 ${v}, se encendió la mecha. Ahora el show.`,
      `🏹 ${v}, primer tiro. Ahora que entren los demás.`,
      `🚦 ${v}, luz verde. A vender sin freno.`,
      `🧭 ${v}, dirección correcta. A por el objetivo.`,
      `🪄 ${v}, apareció la primera. Invoca la siguiente.`,
      `🐝 ${v}, una abejita ya llegó. Que venga el enjambre.`,
      `🥅 ${v}, primer gol. Ahora la remontada.`,
      `🎬 ${v}, arrancó la peli. Hora de acción.`,
      `🔔 ${v}, sonó la campana. A correr la ronda.`,
    ];

    const normal = [
      `🔥 Bien ${v}. Sostén el ritmo y hoy cerramos bonito.`,
      `📈 ${v}, vas bien. El KPI quiere más comida.`,
      `😈 ${v}, así se empieza… ahora encadena la siguiente.`,
      `🧠 ${v}, cada venta es gasolina. Dale otra.`,
      `🏃‍♂️ ${v}, no pares… el cierre se gana con constancia.`,
      `🧃 ${v}, eso ya sabe a día productivo.`,
      `🤝 ${v}, buen flow. Ahora a convertir miradas en compras.`,
      `🛠️ ${v}, buena base. Sigamos construyendo el día.`,
      `🌤️ ${v}, ritmo estable. Que no baje.`,
      `🎯 ${v}, vamos bien. Ajusta y sigue.`,
      `💡 ${v}, vas prendiendo la tienda. Mantén el foco.`,
      `🚶‍♂️ ${v}, paso firme. Cada venta suma.`,
      `🧩 ${v}, otra pieza al objetivo.`,
      `📌 ${v}, hoy pinta bien. Continúa el patrón.`,
      `🧭 ${v}, rumbo correcto. Sigue avanzando.`,
      `🥇 ${v}, sólido. Ahora otro más.`,
      `🚀 ${v}, buen ritmo. Acelera poquito.`,
      `📣 ${v}, buena vibra. Que no se apague.`,
      `🧮 ${v}, números sanos. Vamos por más.`,
      `🌱 ${v}, creciendo bien. Mantén la constancia.`,
      `🧸 ${v}, suave pero firme. Sigue.`,
      `⚙️ ${v}, engranaje funcionando. No pares.`,
      `🏹 ${v}, apuntaste bien. Otra flecha.`,
      `🥁 ${v}, ritmo marcado. Sosténlo.`,
      `🧊 ${v}, frío no estamos. A calentar más.`,
      `🧃 ${v}, energía en alto. A seguir.`,
      `📊 ${v}, buen promedio. Súbele un poco.`,
    ];

    const strong = [
      `🚀 ${v} anda fino. Mantén el flow.`,
      `💥 ${v}, la caja sonó rico. Sigue pegando.`,
      `🥵 Caliente caliente, ${v}… no pares.`,
      `🦾 ${v}, ventas de verdad. Se nota.`,
      `🏆 ${v}, respeto. Eso ya pesa en el cierre.`,
      `🧲 ${v}, estás jalando clientes como imán.`,
      `⚡️ ${v}, energía brutal. El día está tuyo.`,
      `🔥 ${v}, esto ya es racha seria.`,
      `💪 ${v}, estás en modo bestia.`,
      `🥇 ${v}, líder del día.`,
      `🚂 ${v}, tren en marcha. No frenes.`,
      `🌪️ ${v}, estás arrasando.`,
      `🏁 ${v}, aceleración total.`,
      `🚀 ${v}, estás rompiendo el marcador.`,
      `⚡️ ${v}, rayos de ventas.`,
      `🧨 ${v}, explosivo.`,
      `🎯 ${v}, precisión total.`,
      `👑 ${v}, corona bien ganada.`,
      `🧠 ${v}, estrategia top.`,
      `🏹 ${v}, no fallas.`,
      `🧱 ${v}, muro de ventas.`,
      `🌟 ${v}, hoy brillas.`,
      `🚀 ${v}, ritmo de campeón.`,
      `💼 ${v}, negocio serio.`,
      `🥵 ${v}, está on fire.`,
      `⚡️ ${v}, estás eléctrico.`,
      `🦅 ${v}, vuelo alto.`,
    ];

    const clutch = [
      `⏱️ ${v}, *último sprint*: quedan *${kpi.minsLeft} min*. ¡Sí se puede!`,
      `🚨 ${v}, se viene el cierre… *aprieta* y cae el objetivo.`,
      `⚡️ ${v}, modo clutch: cada minuto cuenta.`,
      `🧨 ${v}, no es tarde: es *momento de rematar*.`,
      `🔥 ${v}, estamos a un empujón del cierre. Dale con todo.`,
      `⏳ ${v}, reloj en rojo. Último empuje.`,
      `🚨 ${v}, esto se define ahora.`,
      `🧯 ${v}, apaga el gap con otra venta.`,
      `🏁 ${v}, recta final.`,
      `💥 ${v}, cierre cerca. Mete turbo.`,
      `🧲 ${v}, atrae una más antes del cierre.`,
      `🔔 ${v}, última llamada.`,
      `⚡️ ${v}, sprint final con todo.`,
      `🧠 ${v}, enfoque máximo ahora.`,
      `🎯 ${v}, último dardo.`,
      `🚀 ${v}, cierre inminente.`,
      `🥵 ${v}, aprieta y cerramos.`,
      `🔥 ${v}, clímax del día.`,
      `🛎️ ${v}, campana final.`,
      `💪 ${v}, último esfuerzo del día.`,
      `🧨 ${v}, remate final.`,
      `🚦 ${v}, verde hasta el final.`,
      `⚔️ ${v}, duelo final: objetivo.`,
      `🧭 ${v}, no pierdas rumbo ahora.`,
      `💥 ${v}, todo o nada.`,
    ];

    const freq = buildFrequencyMsg_(venta, kpi);
    const base = urgent
      ? Utils.pick(clutch)
      : (n === 1 ? Utils.pick(one) : (n <= 6 ? Utils.pick(normal) : Utils.pick(strong)));

    const moodLine = mood ? ` ${mood}` : '';
    const freqLine = freq ? ` ${freq}` : '';
    return `${base}${moodLine}${freqLine}`;
  }

  function pickMood_(kpi) {
    const pct = Number(kpi && kpi.pct ? kpi.pct : 0);
    if (pct <= 0) return '';
    if (pct < 0.4) return '🧊 Vamos con calma, pero firmes.';
    if (pct < 0.8) return '🙂 Buen ritmo, sigamos constantes.';
    return '🚀 Estamos volando, no aflojes.';
  }

  function buildFrequencyMsg_(venta, kpi) {
    const now = new Date();
    const recentCount = Ventas.getVentasCountInLastMinutes_(now, 60);
    if (recentCount >= 4) {
      return '🔥 Racha caliente en la última hora. ¡Sigue así!';
    }

    const minsSince = getMinutesSinceLastSale_(now);
    if (minsSince >= 60) {
      return '✅ Volvió la venta. ¡Se reactivó el flow!';
    }

    return '';
  }

  function getMinutesSinceLastSale_(now) {
    const rows = SheetsRepo.getRows_(CFG.SHEETS.FORM_VENTAS);
    if (rows.length < 2) return 9999;

    const headers = rows[0];
    const idxTs = SheetsRepo.findHeaderIndex_(headers, CFG.COLS.FORM.TS);

    let last = null;
    for (let i = rows.length - 1; i >= 1; i--) {
      const ts = rows[i][idxTs];
      if (!ts) continue;
      last = Utils.asDate(ts);
      break;
    }

    if (!last) return 9999;
    return Math.floor((now.getTime() - last.getTime()) / (60 * 1000));
  }

  function buildVentaMessage_(venta, kpi) {
    const now = new Date();
    const fecha = Utils.formatDateMX(now);
    const pagoEmoji = emojiPago_(venta.pago);

    let msg = `🚀 *VENTA REGISTRADA*\n`;
    msg += `🕒 ${fecha}\n`;
    msg += `👑 ${Utils.escapeMd(venta.vendedor)} vendió *${venta.productos}*\n`;
    if (venta.pago) msg += `${pagoEmoji} Pago: ${Utils.escapeMd(venta.pago)}\n`;
    if (venta.gratis > 0) msg += `🎁 Promo 1 (1 producto gratis): *${Utils.roundInt(venta.gratis)}*\n`;
    if (venta.gratisPromo2 > 0) msg += `🎁 Promo 2 (2 productos gratis): *${Utils.roundInt(venta.gratisPromo2)}*\n`;
    if (venta.comentario) msg += `💬 "${Utils.escapeMd(venta.comentario)}"\n`;

    if (kpi.goal > 0) {
      const pctTxt = (kpi.pct * 100).toFixed(0) + '%';
      const h = Math.floor(kpi.minsLeft / 60);
      const m = kpi.minsLeft % 60;

      msg += `\n🎯 Obj hoy: *${kpi.goal}* | 📦 Hoy: *${kpi.sold}* | ✅ *${pctTxt}*\n`;
      msg += `⏳ Faltan: *${kpi.missing}*`;

      if (kpi.canastaProm && kpi.canastaProm > 0) {
        msg += ` | 🧺 Canasta prom: *${kpi.canastaProm.toFixed(2)}*`;
      }

      if (kpi.minsLeft > 0) {
        msg += ` | 🕰️ Quedan: *${h}h ${m}m* | ⚡️ Ritmo: *${kpi.pacePerHour}/h*\n`;
      } else {
        msg += ` | 🧨 *Fuera de hora* (pero se cobra 😈)\n`;
      }

      //if (kpi.pd) msg += `🎯 PD: *${Utils.escapeMd(kpi.pd)}*\n`;
      if (kpi.gap) msg += `📉 Obj Gap: *${kpi.gap}*\n`;
    }

    msg += `\n${motivationByContext_(venta, kpi)}`;
    return msg;
  }

  function buildGoalReachedMessage_(kpi) {
    const sold = Utils.roundInt(kpi.sold);
    const goal = Utils.roundInt(kpi.goal);
    const bonus = Math.max(0, sold - goal);
    const pctTxt = goal > 0 ? `${Math.round((sold / goal) * 100)}%` : '';

    const headlines = [
      '🏆 *OBJETIVO SUPERADO*',
      '🔥 *OBJETIVO DESTROZADO*',
      '🚀 *META ROMPIDA*',
      '💥 *OBJETIVO REVENTADO*',
      '👑 *DÍA LEGENDARIO*'
    ];

    const cheers = [
      '🙌 Equipo, esto es nivel PRO MAX. ¡Aplausos de estadio!',
      '⚡️ ¡Qué locura! Hoy escribimos historia.',
      '💪 Tremendo. Lo de hoy es de campeones absolutos.',
      '🎉 ¡Objetivo superado! A partir de aquí TODO es bonus.',
      '🧨 Estamos reventando el día. ¡Sigue el fuego!',
      '🔥 Esto ya no es venta, es DOMINIO TOTAL.'
    ];

    const lines = [];
    lines.push(Utils.pick(headlines));
    lines.push(`📦 Vendidos hoy: *${sold}* / Obj: *${goal}* → *${pctTxt}*`);
    if (bonus > 0) {
      lines.push(`✨ Bonus sobre objetivo: *+${bonus}*`);
    }
    lines.push(Utils.pick(cheers));
    return lines.join('\n');
  }

  function buildMotivationOnly_(venta, kpi) {
    return motivationByContext_(venta, kpi);
  }

  function buildVentaPunch_(venta, kpi) {
    return pickPunchline_(venta, kpi);
  }

  function pickPunchline_(venta, kpi) {
    const v = venta.vendedor || 'crack';
    const n = Math.max(1, Number(venta.productos || 1));
    const pct = kpi && kpi.goal > 0 ? `${Math.round(kpi.pct * 100)}%` : '';

    const pool = [
      `+${n} y seguimos`,
      `otra más, ${v}`,
      `vamos por más`,
      `modo venta ON`,
      `ritmo fino`,
      `sin freno`,
      `a romperla`,
      `ventas con flow`,
      `cliente feliz`,
      `caja sonando`,
      `hoy se gana`,
      `seguimos arriba`,
      `sube la racha`,
      `esto va bien`,
      `a seguir sumando`,
      `con todo`,
      `no aflojes`,
      `venta limpia`,
      `buen ritmo`,
      `más clientes`,
      `caliente`,
      `seguimos sumando`,
      `enfocado`,
      `venta bonita`,
      `otra y otra`,
      `meta en mente`,
      `vamos por el ${pct}`,
      `actitud top`,
      `día fuerte`,
      `suma y sigue`,
      `clientes entrando`,
      `hoy hay ventas`,
      `días así`,
      `la tienda vibra`,
      `flow constante`,
      `a por el objetivo`,
      `siempre arriba`,
      `a romper récord`,
      `energía al 100`,
      `vuelve la racha`,
      `se nota el nivel`
    ];

    return Utils.pick(pool);
  }

  return { buildVentaMessage_, buildMotivationOnly_, buildVentaPunch_, buildGoalReachedMessage_ };
})();
