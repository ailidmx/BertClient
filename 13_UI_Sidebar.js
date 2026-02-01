const UI_Sidebar = (() => {
  function showAddProductForm_() {
    const html = HtmlService.createHtmlOutputFromFile("add_product_form")
      .setTitle("Add Product");
    SpreadsheetApp.getUi().showSidebar(html);
  }
  return { showAddProductForm_ };
})();
