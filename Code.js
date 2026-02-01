/********************************************************
 * MENU (toujours visible)
 ********************************************************/
/********************************************************
 * SINGLE MAIN MENU : BERT
 ********************************************************/
function _onOpen() {
  const ui = SpreadsheetApp.getUi();

  const bertMenu = ui.createMenu("🐝 BERT");

  // SUBMENU: MODES
  const modes = ui.createMenu("Modes")
    .addItem("Mode Achat", "runModeAchat")
    .addItem("Mode Normal", "runModeNormal")
    .addSeparator()
    .addItem("Toggle Achat/Normal", "runToggle");

  // SUBMENU: FORMS
  const forms = ui.createMenu("Forms")
    .addItem("Add Product", "showAddProductForm");

  // ADD all submenus to BERT
  bertMenu
    .addSubMenu(modes)
    .addSubMenu(forms)
    .addToUi();
}

/** Déclencheur simple : quand C2 change dans CONTA_DASHBOARD */
function _onEdit(e) {
  try {
    if (!e) return;

    const sh = e.range.getSheet();
    if (sh.getName() !== "CONTA_DASHBOARD") return;
    if (e.range.getA1Notation() !== "C2") return;

    aplicarFiltroColumnas_SIMPLE();
  } catch (err) {
    // Optionnel : log pour debug
    console.error(err);
  }
}

function _showAddProductForm() {
  const html = HtmlService.createHtmlOutputFromFile("add_product_form")
    .setTitle("Add Product");
  SpreadsheetApp.getUi().showSidebar(html);
}

function _aplicarFiltroColumnas_SIMPLE() {
  const sh = SpreadsheetApp.getActive().getSheetByName("CONTA_DASHBOARD");
  if (!sh) return;

  const COL_START = 4; // D
  const CODE_ROW = 8;  // ✅ codes en ligne 7

  const lastCol = sh.getLastColumn();
  const numCols = lastCol - COL_START + 1;
  if (numCols <= 0) return;

  // 1) lettre choisie = 1ère lettre de C2
  const raw = (sh.getRange("C2").getDisplayValue() || "").toString().trim().toUpperCase();
  const letter = raw.substring(0, 1); // S/M/T/A

  // Si rien ou pas une lettre attendue → ne casse rien : on montre tout
  if (!["S", "M", "T", "A"].includes(letter)) {
    sh.showColumns(COL_START, numCols);
    return;
  }

  // 2) reset: tout montrer
  sh.showColumns(COL_START, numCols);

  // 3) lire les codes ligne 7
  const codes = sh.getRange(CODE_ROW, COL_START, 1, numCols).getDisplayValues()[0];

  // 4) cacher si le code ne contient pas la lettre
  for (let i = numCols - 1; i >= 0; i--) {
    const code = (codes[i] || "").toString().toUpperCase(); // ex: "ATMS", "MS", "S"
    const keep = code.includes(letter);
    if (!keep) sh.hideColumns(COL_START + i);
  }
}

/**
 * Détecte la ligne de codes en scannant les 20 premières lignes :
 * on prend celle qui contient le plus de cellules avec au moins une lettre A/M/S/T.
 */
function _detectCodeRow_(sh, colStart, numCols) {
  const MAX_SCAN_ROWS = 20;
  const values = sh.getRange(1, colStart, MAX_SCAN_ROWS, numCols).getDisplayValues();

  let bestRow = null;
  let bestScore = 0;

  for (let r = 0; r < values.length; r++) {
    const row = values[r];
    let score = 0;

    for (let c = 0; c < row.length; c++) {
      const norm = normalizeCode_(row[c]); // ex "MS", "ATMS"
      if (norm.length >= 1) score++;
    }

    if (score > bestScore) {
      bestScore = score;
      bestRow = r + 1;
    }
  }

  // seuil : il faut au moins 2 colonnes taggées pour éviter de confondre avec une ligne random
  if (bestScore < 2) return null;
  return bestRow;
}


/********************************************************
 * WRAPPERS (ne s’exécutent que sur l’onglet GENERAL)
 ********************************************************/
function _runModeAchat() {
  if (!isGeneralSheet()) return notAllowed();
  setAchatMode();
}
function _runModeNormal() {
  if (!isGeneralSheet()) return notAllowed();
  setNormalMode();
}
function _runToggle() {
  if (!isGeneralSheet()) return notAllowed();
  toggleMode();
}

/********************************************************
 * Vérification d’onglet
 ********************************************************/
function _isGeneralSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  return sheet.getName().toUpperCase() === "GENERAL";
}
function _notAllowed() {
  SpreadsheetApp.getUi().alert("❌ Ce mode n’est disponible que dans l’onglet GENERAL.");
}

/********************************************************
 * Config colonnes à AFFICHER en Mode Achat (par NOM)
 ********************************************************/
const _ACHAT_HEADERS = [
  "ARTICULO",
 // "PROVEEDOR",
  "$ POR KILO / PIEZA",
  "PIEZAS",
  "ESTIMACION PRECIO",
  "ESTIMACION PESO"
];

/******************************************************
 * HEURISTIQUE: détection automatique de la ligne d’en-tête
 ******************************************************/
function _detectHeaderRow_(sheet) {
  const maxRows = sheet.getMaxRows();
  const maxCols = sheet.getMaxColumns();
  const values = sheet.getRange(1, 1, maxRows, maxCols).getValues();

  const HEADER_KEYWORDS = [
    "ARTICULO", "CATEGORIA", "PROVEEDOR", "PIEZAS", 
    "$ POR KILO / PIEZA", "$ PRODUCTO", "ESTIMACION", "MARGEN"
  ];

  const MIN_NON_EMPTY = 4;

  let bestRow = null;
  let bestScore = -1;

  for (let r = 0; r < maxRows; r++) {

    const row = values[r];
    const nonEmptyCount = row.filter(v => v !== "" && v !== null).length;

    // heuristique 1 : assez de colonnes remplies
    if (nonEmptyCount < MIN_NON_EMPTY) continue;

    // heuristique 2 : contient des mots ressemblant aux en-têtes
    let keywordHits = 0;
    row.forEach(v => {
      if (!v) return;
      const val = v.toString().toUpperCase();

      HEADER_KEYWORDS.forEach(key => {
        if (val.includes(key)) keywordHits++;
      });
    });

    if (keywordHits === 0) continue;

    // score final = combinaison des deux
    const score = nonEmptyCount + keywordHits * 5;

    if (score > bestScore) {
      bestScore = score;
      bestRow = r + 1; // 1-based
    }
  }

  if (!bestRow) {
    throw new Error("❌ Aucun header plausible détecté.");
  }

  return bestRow;
}

/**
 * Masque efficacement une liste de colonnes (indices 1-based) en regroupant
 * les colonnes contiguës pour limiter les appels à hideColumns().
 */
function _hideColumnListAsRanges_(sheet, colList) {
  if (!colList || colList.length === 0) return;

  // Nettoyage: valeurs uniques, triées, positives
  const uniqSorted = Array.from(new Set(colList.filter(c => c > 0))).sort((a, b) => a - b);

  // Construire des blocs contigus: [start, end]
  let start = uniqSorted[0];
  let prev = uniqSorted[0];

  for (let i = 1; i < uniqSorted.length; i++) {
    const cur = uniqSorted[i];
    if (cur === prev + 1) {
      prev = cur; // continue le bloc
    } else {
      // ferme le bloc précédent
      sheet.hideColumns(start, prev - start + 1);
      // démarre un nouveau bloc
      start = cur;
      prev = cur;
    }
  }

  // dernier bloc
  sheet.hideColumns(start, prev - start + 1);
}


/******************************************************
 * Détection du tableau autour du header détecté
 ******************************************************/
function _detectTableRange_(sheet) {
  const startRow = detectHeaderRow_(sheet);

  const maxCols = sheet.getMaxColumns();
  const headerRow = sheet.getRange(startRow, 1, 1, maxCols).getValues()[0];

  // Trouver la première colonne non vide du header
  let startCol = null;
  for (let c = 0; c < maxCols; c++) {
    if (headerRow[c] !== "" && headerRow[c] !== null) {
      startCol = c + 1;
      break;
    }
  }

  if (!startCol) throw new Error("❌ Impossible de détecter la colonne de départ du header.");

  // Trouver le nombre total de colonnes (jusqu’à première cellule vide)
  let totalCols = 0;
  for (let c = startCol - 1; c < maxCols; c++) {
    if (headerRow[c] === "" || headerRow[c] === null) break;
    totalCols++;
  }

  return { startRow, startCol, totalCols };
}

/********************************************************
 * Mode Achat (masque tout puis n’affiche que les colonnes ciblées)
 ********************************************************/
function _setAchatMode() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("GENERAL");

  const { startRow, startCol, totalCols } = detectTableRange_(sheet);

  // 1) Lire les en-têtes
  const headers = sheet.getRange(startRow, startCol, 1, totalCols).getValues()[0];

  // 2) Trouver colonnes à garder (index absolu dans la feuille)
  const keepCols = [];
  ACHAT_HEADERS.forEach(target => {
    headers.forEach((name, idx) => {
      if (name && name.toString().toUpperCase().trim() === target.toUpperCase().trim()) {
        keepCols.push(startCol + idx);
      }
    });
  });

  // Si aucune colonne trouvée → sécurité
  if (keepCols.length === 0) {
    SpreadsheetApp.getUi().alert("❌ Aucun header correspondant trouvé.");
    return;
  }

  // 3) Masquer uniquement les colonnes NON conservées
  const maxCols = sheet.getMaxColumns();
  const toHide = [];

  for (let col = 1; col <= maxCols; col++) {
    if (!keepCols.includes(col)) {
      toHide.push(col);
    }
  }

  // Google Sheets aime les ranges groupés → optimisation
  hideColumnListAsRanges_(sheet, toHide);

  SpreadsheetApp.getUi().alert("✔ Mode Achat activé (colonnes filtrées)");
}


/********************************************************
 * Mode Normal (ré-affiche toutes les colonnes)
 ********************************************************/
function _setNormalMode() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("GENERAL");
  sheet.showColumns(1, sheet.getMaxColumns());
  SpreadsheetApp.getUi().alert("✔ Retour au Mode Normal");
}

/********************************************************
 * Toggle (basé sur l’état de la première colonne)
 ********************************************************/
function _toggleMode() {
  const sheet = SpreadsheetApp.getActiveSheet();
  // Heuristique simple : si la col 1 est visible → passer en Achat, sinon Normal
  const isHidden = sheet.isColumnHiddenByUser(1);
  if (isHidden) setNormalMode();
  else setAchatMode();
}

function api_ping() {
  return 'OK';
}


