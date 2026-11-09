// «Назад»: диалог → шаг в листе → закрыть лист → закрыть настройки → свернуть
function goBack() {
  if (dlgDone) { dlgDone(false); return; }
  if (shIsOpen()) { stepBack(); return; }
  if (stIsOpen() && $('settings').classList.contains('open')) { stClose(); return; }
  if (NATIVE) NATIVE.minimize();
}
