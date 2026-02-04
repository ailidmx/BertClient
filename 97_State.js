// 97_State
const State = (() => {
  const P = PropertiesService.getScriptProperties();

  function k_(key) { return `BERT:${key}`; }

  function wasSent_(key) {
    return P.getProperty(k_(key)) === '1';
  }

  function markSent_(key) {
    P.setProperty(k_(key), '1');
  }

  function clear_(key) {
    P.deleteProperty(k_(key));
  }

  return { wasSent_, markSent_, clear_};
})();
