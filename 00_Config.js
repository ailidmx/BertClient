const CFG = {
  TZ: 'America/Mexico_City',
  DEBUG: false,
  API_TOKEN: 'BERT2026*',

  SHEETS: {
    FORM_VENTAS: 'VENTAS',
    CALENDARIO: 'CALENDARIO',
    GENERAL: 'GENERAL',
    CONTA_ASIENTOS: 'CONTA_ASIENTOS',
    PRODUCCION: 'PRODUCCION',
    SETTINGS: 'SETTINGS',
    CONTA_CATEGORIAS: 'CONTA_CATEGORIAS',
    CATEGORIAS: 'CATEGORIAS',
    PROVEEDORES: 'PROVEEDORES',
  },

  COLS: {
    FORM: {
      TS: 'Marca temporal',
      CANT: '¿Cuántos productos acabaste de vender?',
      VENDEDOR: 'Soy',
      PAGO: 'Modo de pago',
      GENERO: 'Género',
      EDAD: 'Edad',
      GRATIS: [
        'Productos gratis (10 etiquetas)',
        'Productos gratis (10 etiquetas) ',
        'Promo 1 (1 producto grátis)'
      ],
      GRATIS_PROMO2: ['Promo 2 (2 productos grátis)'],
      COMENTARIO: 'Comentario',
    },
    // --- CFG.COLS.CAL : remplace ton bloc CAL par celui-ci ---
    CAL: {
      FECHA: ['Fecha', 'FECHA', 'Date', 'Día', 'Dia', 'FECHA MX'],

      // articles vendus (ancien VENTAS)
      ART_VENDIDOS: ['ART. VENDIDOS', 'ART VENDIDOS', 'ARTICULOS VENDIDOS', 'ARTÍCULOS VENDIDOS'],

      // nombre de ventes (count)
      VENTAS: ['VENTAS', 'Ventas', 'Venta', 'VENTA'],

      // panier moyen
      CANASTA: ['CANASTA PROMEDIA', 'CANASTA PROMEDIO', 'PANIER PROM.', 'PANIER MOYEN', 'CANASTA'],

      // ventes caisse fin de journée
      VENTAS_CAJA: ['VENTAS CAJA', 'Ventas Caja', 'Caja', 'VENTA CAJA', 'VENTAS_CAJA'],

      // objectif
      OBJ: ['Obj', 'OBJ', 'Objetivo', 'Objetivo del día'],
      GAP: ['Obj Gap', 'OBJ GAP', 'Gap'],

      // %Obj "live" (basé sur VENTAS)
      PCT: ['%Obj', '%OBJ', 'Porcentaje Obj', '% Objetivo'],

      // %Obj C. (basé sur VENTAS CAJA)
      PCT_CAJA: ['%Obj C.', '%Obj C', '%OBJ C.', '%OBJ C', 'Porcentaje Obj Caja', '% Objetivo Caja'],

      // mensuel
      PCT_MES: ['%Obj. M', '%OBJ. M', '%Obj Mes', '%OBJ MES'],
      CUMUL_MES: ['Cumul. Mes', 'CUMUL MES', 'CUMUL_MES'],
      OBJ_MES: ['Obj. Mes', 'OBJ MES', 'OBJ_MES'],
      RITMO_VENTA_M: ['Ritmo venta M.', 'RITMO VENTA M', 'RITMO VENTA M.'],
      GRATIS_DIA: ['GRATIS_DIA', 'GRATIS DIA', 'Gratis día', 'Gratis dia'],
      GRATIS_MES: ['GRATIS_MES', 'GRATIS MES', 'Gratis mes'],
      GRATIS_DIA_PROMO2: ['GRATIS_DIA_PROMO2', 'GRATIS DIA PROMO2', 'Gratis día promo2', 'GRATIS_DIA_PROMO 2'],
      GRATIS_MES_PROMO2: ['GRATIS_MES_PROMO2', 'GRATIS MES PROMO2', 'Gratis mes promo2', 'GRATIS_MES_PROMO 2'],

      PD_RED: ['🔴 🎯PD #', 'PD ROJO', 'PD RED'],
      PD_ORANGE: ['🟠🎯PD #', 'PD NARANJA', 'PD ORANGE'],
      PD_GREEN: ['🟢🎯PD #', 'PD VERDE', 'PD GREEN'],
      PD_STAR: ['⭐ 🎯PD #', 'PD STAR', 'PD'],

      DIA: ['Día', 'Dia', 'Day'],

      // jour travaillé ?
      ABIERTO: ['abierto', 'ABIERTO', 'Open', 'Ouvert', 'Trabaja', 'TRABAJA'],
    },
    GENERAL: {
      ARTICULO: ['ARTICULO', 'ARTÍCULO'],
      CATEGORIA: ['CATEGORIA', 'CATEGORÍA'],
      UNIDAD: ['UNIDAD'],
      FOTO_URL: ['FOTO_URL', 'FOTO URL', 'FOTO', 'IMAGEN', 'IMAGEN_URL']
    },
    CONTA: {
      PUNTO_VENTA: ['Punto de Venta', 'PUNTO DE VENTA'],
      FECHA: ['FECHA', 'Fecha'],
      TIPO: ['Tipo', 'TIPO'],
      CATEGORIA: ['CATEGORIA', 'CATEGORÍA'],
      IMPORTE: ['IMPORTE', 'Importe'],
      OBSERVACION: ['Observacion', 'Observación', 'OBSERVACION'],
    },
  },

  TELEGRAM: {
    TOKEN: '8378938575:AAFQRqEN7gWOC5h-IdFMlRaFW3VF8VJX4Wo',
    BOT_USERNAME: 'casabertmx_bot',
    WEBAPP_URL: 'https://script.google.com/macros/s/AKfycbyDUY6mU333y1ENOmSQgCSb2ONWQk5FXFPs9_tql9kfICBRooY3QvKIofzBrMxrQFHnKQ/exec',
    CHAT_ID: -1003399305702,
    TOPICS: {
      VENTAS: 46,
      CIERRE: 47,
      RETOS: 48,
      GASTOS: 49,
      ERRORES: 59
    }
  },
  CRM: {
    CIERRE_SLOTS: ['20:30', '21:00', '21:30', '22:00'],
    CHARTS_VIA_URL: true
  },
  MINI_APP: {
    TITLE: 'BERT CRM Showcase',
    FORM_URL: 'https://forms.gle/2oFXDZ5KXMmB93jb6'
  }
};
