const UI_OnEdit = (() => {

  function handle_(e) {
    try {
      if (!e) return;

      const sh = e.range.getSheet();
      if (sh.getName() !== "CONTA_DASHBOARD") return;
      if (e.range.getA1Notation() !== "C2") return;

      DashboardFilters.applyColumnFilterSimple_();

    } catch (err) {
      console.error(err);
    }
  }

  return { handle_ };
})();
