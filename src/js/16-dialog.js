// Диалог подтверждения и тост «с отменой»
let dlgDone = null;

function ask(title, text, okLabel, cancelLabel, danger) {
  return new Promise((resolve) => {
    if (dlgDone) dlgDone(false);
    $('dlgT').textContent = title;
    $('dlgP').textContent = text;
    $('dlgBtns').innerHTML =
      '<button class="btn-ghost" id="dlgNo">' + esc(cancelLabel || 'Отмена') + '</button>' +
      '<button class="btn-main' + (danger ? ' btn-danger' : '') + '" id="dlgOk">' + esc(okLabel || 'OK') + '</button>';
    const d = $('dlg');
    d.hidden = false;
    void d.offsetWidth;
    d.classList.add('open');
    dlgDone = (v) => {
      dlgDone = null;
      d.classList.remove('open');
      setTimeout(() => { if (!d.classList.contains('open')) d.hidden = true; }, 200);
      resolve(v);
    };
    $('dlgNo').onclick = () => dlgDone && dlgDone(false);
    $('dlgOk').onclick = () => dlgDone && dlgDone(true);
  });
}

let toastT = 0;
function toast(msg, action, fn) {
  const t = $('toast');
  clearTimeout(toastT);
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (action ? '<button id="toastA">' + esc(action) + '</button>' : '');
  if (action) $('toastA').onclick = () => { t.classList.remove('open'); fn(); };
  t.hidden = false;
  void t.offsetWidth;
  t.classList.add('open');
  toastT = setTimeout(() => { t.classList.remove('open'); setTimeout(() => { if (!t.classList.contains('open')) t.hidden = true; }, 250); }, action ? 5000 : 2200);
}
