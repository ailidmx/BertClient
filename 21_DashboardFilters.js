const DashboardFilters = (() => {

  function applyColumnFilterSimple_() {
    const sh = SpreadsheetApp.getActive().getSheetByName("CONTA_DASHBOARD");
    if (!sh) return;

    const COL_START = 4; // D
    const CODE_ROW = 8;  // ligne codes

    const lastCol = sh.getLastColumn();
    const numCols = lastCol - COL_START + 1;
    if (numCols <= 0) return;

    const raw = (sh.getRange("C2").getDisplayValue() || "").toString().trim().toUpperCase();
    const letter = raw.substring(0, 1); // S/M/T/A

    if (!["S", "M", "T", "A"].includes(letter)) {
      sh.showColumns(COL_START, numCols);
      return;
    }

    sh.showColumns(COL_START, numCols);

    const codes = sh.getRange(CODE_ROW, COL_START, 1, numCols).getDisplayValues()[0];

    for (let i = numCols - 1; i >= 0; i--) {
      const code = (codes[i] || "").toString().toUpperCase();
      const keep = code.includes(letter);
      if (!keep) sh.hideColumns(COL_START + i);
    }
  }

  return { applyColumnFilterSimple_ };
})();
