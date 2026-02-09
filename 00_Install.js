// 00_Install
// One-shot installer for client projects using this library.
function installBertCore(opts) {
  const options = opts || {};

  if (!options.spreadsheetId) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) options.spreadsheetId = ss.getId();
    } catch (_) {
      // No active spreadsheet (standalone). Must pass spreadsheetId explicitly.
    }
  }

  const installed = Config.install_(options);
  const triggers = [];

  if (options.installTriggers !== false) {
    installProduccionTriggers();
    triggers.push('produccion');
  }

  return { installed, triggers };
}
