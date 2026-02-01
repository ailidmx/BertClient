// Minimal client wrappers using BertCore library.
// Library symbol: BertCore (configured in appsscript.json)

function onOpen() {
  if (BertCore && BertCore.UI_Menu && BertCore.UI_Menu.install_) {
    BertCore.UI_Menu.install_();
  }
}

function onEdit(e) {
  if (BertCore && BertCore.UI_OnEdit && BertCore.UI_OnEdit.handle_) {
    BertCore.UI_OnEdit.handle_(e);
  }
}

function showAddProductForm() {
  if (BertCore && BertCore.UI_Sidebar && BertCore.UI_Sidebar.showAddProductForm_) {
    BertCore.UI_Sidebar.showAddProductForm_();
  }
}

function runModeAchat() {
  if (BertCore && BertCore.Modes && BertCore.Modes.setAchatMode_) {
    BertCore.Modes.setAchatMode_();
  }
}

function runModeNormal() {
  if (BertCore && BertCore.Modes && BertCore.Modes.setNormalMode_) {
    BertCore.Modes.setNormalMode_();
  }
}

function runToggle() {
  if (BertCore && BertCore.Modes && BertCore.Modes.toggleMode_) {
    BertCore.Modes.toggleMode_();
  }
}

function crm_openingAlert() {
  if (BertCore && BertCore.CRM && BertCore.CRM.runApertura_) {
    BertCore.CRM.runApertura_(BertCore.Utils.nowMX(), { force: false });
  }
}

function crm_cierreManual() {
  if (BertCore && BertCore.CRM && BertCore.CRM.runHourly_) {
    BertCore.CRM.runHourly_(BertCore.Utils.nowMX(), { force: true, topicKey: 'CIERRE' });
  }
}

function produccion_watchConA() {
  if (BertCore && BertCore.Produccion && BertCore.Produccion.checkNewMateriaPrima_) {
    BertCore.Produccion.checkNewMateriaPrima_();
  }
}

function doPost(e) {
  if (BertCore && BertCore.PublicEntrypoints && BertCore.PublicEntrypoints.doPost) {
    return BertCore.PublicEntrypoints.doPost(e);
  }
  return ContentService.createTextOutput('OK');
}

function doGet(e) {
  if (BertCore && BertCore.PublicEntrypoints && BertCore.PublicEntrypoints.doGet) {
    return BertCore.PublicEntrypoints.doGet(e);
  }
  return ContentService.createTextOutput('OK');
}


