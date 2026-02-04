function myFunction() {
  const UI_Menu = (() => {

  function install_() {
    const ui = SpreadsheetApp.getUi();

    const bertMenu = ui.createMenu("🐝 BERT");

    const modes = ui.createMenu("Modes")
      .addItem("Mode Achat", "ui_runModeAchat")
      .addItem("Mode Normal", "ui_runModeNormal")
      .addSeparator()
      .addItem("Toggle Achat/Normal", "ui_runToggle");

    const forms = ui.createMenu("Forms")
      .addItem("Add Product", "ui_showAddProductForm");

    bertMenu
      .addSubMenu(modes)
      .addSubMenu(forms)
      .addToUi();
  }

  return { install_ };
})();

}
