/**
 * ====== SHEETS REPO ======
 * Lecture par headers (jamais par index fixe "magique").
 */
const SheetsRepo = (() => {

  function getSpreadsheet_() {
    const data = Config.getData_();
    if (data && data.SPREADSHEET_ID) {
      return SpreadsheetApp.openById(data.SPREADSHEET_ID);
    }
    try {
      return SpreadsheetApp.getActive();
    } catch (err) {
      throw new Error('Missing DATA_SPREADSHEET_ID. Run installBertCore({ spreadsheetId }) first.');
    }
  }

  function getSheet_(name) {
    const ss = getSpreadsheet_();
    const sh = ss.getSheetByName(name);
    Utils.assert(!!sh, `Sheet not found: ${name}`);
    return sh;
  }

  function getRows_(sheetName) {
    const sh = getSheet_(sheetName);
    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    if (lastRow < 1 || lastCol < 1) return [];
    return sh.getRange(1, 1, lastRow, lastCol).getValues();
  }

  function normHeader_(h) {
    return String(h || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  /**
   * ✅ Robust:
   * - filtre les candidates vides ("")
   * - message d'erreur lisible avec liste des headers rencontrés
   */
  function findHeaderIndex_(headers, nameOrNames) {
    const names = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames];

    const clean = names
      .map(n => String(n || '').trim())
      .filter(n => n.length > 0); // ✅ remove ""

    if (clean.length === 0) {
      throw new Error(`Header candidates empty. Check CFG.COLS.* (received: ${JSON.stringify(nameOrNames)})`);
    }

    const wanted = clean.map(normHeader_);
    for (let i = 0; i < headers.length; i++) {
      if (wanted.includes(normHeader_(headers[i]))) return i;
    }

    // debug: on montre les headers réels
    throw new Error(
      `Header not found. Candidates=${JSON.stringify(clean)} | Headers=${JSON.stringify(headers)}`
    );
  }

  function findHeaderIndexOptional_(headers, nameOrNames) {
    try {
      return findHeaderIndex_(headers, nameOrNames);
    } catch (e) {
      return null;
    }
  }

  /**
   * Convertit un event (onFormSubmit) en objet { "Header": "value" }
   * Robuste: namedValues first, fallback headers+values.
   */
  function toNamedObjectFromEvent_(e) {
    // onFormSubmit => namedValues
    if (e && e.namedValues) {
      const obj = {};
      Object.keys(e.namedValues).forEach(k => {
        const val = e.namedValues[k];
        obj[k] = Array.isArray(val) ? val[0] : val;
      });
      return obj;
    }

    // fallback values + headers
    Utils.assert(e && e.values, 'Event inválido: no namedValues ni values');
    const sh = getSpreadsheet_().getActiveSheet();
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const obj = {};
    headers.forEach((h, i) => obj[h] = e.values[i]);
    return obj;
  }

  return {
    getSpreadsheet_,
    getRows_,
    findHeaderIndex_,
    findHeaderIndexOptional_,
    toNamedObjectFromEvent_,
  };
})();
