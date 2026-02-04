const Modes = (() => {

  const ACHAT_HEADERS = [
    "ARTICULO",
    "$ POR KILO / PIEZA",
    "PIEZAS",
    "ESTIMACION PRECIO",
    "ESTIMACION PESO"
  ];

  function setAchatMode_() {
    const ss = SheetsRepo.getSpreadsheet_();
    const sheet = ss.getSheetByName("GENERAL");
    const { startRow, startCol, totalCols } = detectTableRange_(sheet);

    const headers = sheet.getRange(startRow, startCol, 1, totalCols).getValues()[0];

    const keepCols = [];
    ACHAT_HEADERS.forEach(target => {
      headers.forEach((name, idx) => {
        if (name && name.toString().toUpperCase().trim() === target.toUpperCase().trim()) {
          keepCols.push(startCol + idx);
        }
      });
    });

    if (keepCols.length === 0) {
      SpreadsheetApp.getUi().alert("❌ Aucun header correspondant trouvé.");
      return;
    }

    const maxCols = sheet.getMaxColumns();
    const toHide = [];
    for (let col = 1; col <= maxCols; col++) {
      if (!keepCols.includes(col)) toHide.push(col);
    }

    hideColumnListAsRanges_(sheet, toHide);
    SpreadsheetApp.getUi().alert("✔ Mode Achat activé (colonnes filtrées)");
  }

  function setNormalMode_() {
    const sheet = SheetsRepo.getSpreadsheet_().getSheetByName("GENERAL");
    sheet.showColumns(1, sheet.getMaxColumns());
    SpreadsheetApp.getUi().alert("✔ Retour au Mode Normal");
  }

  function toggleMode_() {
    const sheet = SheetsRepo.getSpreadsheet_().getActiveSheet();
    const isHidden = sheet.isColumnHiddenByUser(1);
    if (isHidden) setNormalMode_();
    else setAchatMode_();
  }

  // --- helpers privés : copie tes fonctions ici ---
  function detectHeaderRow_(sheet) { /* ... */ }
  function detectTableRange_(sheet) { /* ... */ }
  function hideColumnListAsRanges_(sheet, colList) { /* ... */ }

  return { setAchatMode_, setNormalMode_, toggleMode_ };
})();
