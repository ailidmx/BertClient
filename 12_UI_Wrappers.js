function ui_runModeAchat() {
  if (!UI_Guards.isGeneralSheet_()) return UI_Guards.notAllowed_();
  Modes.setAchatMode_();
}

function ui_runModeNormal() {
  if (!UI_Guards.isGeneralSheet_()) return UI_Guards.notAllowed_();
  Modes.setNormalMode_();
}

function ui_runToggle() {
  if (!UI_Guards.isGeneralSheet_()) return UI_Guards.notAllowed_();
  Modes.toggleMode_();
}

function ui_showAddProductForm() {
  UI_Sidebar.showAddProductForm_();
}
