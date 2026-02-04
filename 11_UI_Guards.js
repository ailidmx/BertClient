const UI_Guards = (() => {
  function isGeneralSheet_() {
    const sheet = SpreadsheetApp.getActiveSheet();
    return sheet.getName().toUpperCase() === "GENERAL";
  }

  function notAllowed_() {
    SpreadsheetApp.getUi().alert("❌ Ce mode n’est disponible que dans l’onglet GENERAL.");
  }

  return { isGeneralSheet_, notAllowed_ };
})();
