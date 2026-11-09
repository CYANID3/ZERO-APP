// Выбор «напомнить заранее»: готовые интервалы + свой. Для события или для настроек по умолчанию.
const REM_PRESETS = [5, 10, 15, 30, 60, 120, 180, 360, 720, 1440, 2880, 4320, 10080, 20160];
const REM_UNITS = [[1, 'мин'], [60, 'ч'], [1440, 'дн'], [10080, 'нед']];
let remCtx = 'ed';     // ed | def
let remUnit = 60;

function remList() { return remCtx === 'ed' ? ED.reminders : S.settings.defReminders; }
function remSet(a) {
  const v = cleanRem(a);
  if (remCtx === 'ed') ED.reminders = v;
  else { S.settings.defReminders = v; save(); }
}

function remOpen(ctx) {
  remCtx = ctx;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const view = {
    title: ctx === 'ed' ? 'Напомнить заранее' : 'Напоминания по умолчанию',
    body: remBody,
    foot: () => '<button class="btn-main" onclick="remDone()">Готово</button>',
    after: remAfter
  };
  if (ctx === 'ed') shPush(view); else shOpen(view);
}

function remBody() {
  const cur = remList();
  const all = [...new Set([...REM_PRESETS, ...cur])].sort((a, b) => a - b);
  const rows = all.map((m) => {
    const on = cur.includes(m);
    return '<button class="row row-btn' + (on ? ' on' : '') + '" role="checkbox" aria-checked="' + on + '" onclick="remToggle(' + m + ')">' +
      '<span class="rt">' + fmtOffset(m) + '</span><span class="ck">' + (on ? ICON.check : '') + '</span></button>';
  }).join('<div class="sep"></div>');
  const units = REM_UNITS.map(([k, n]) =>
    '<button class="seg-b' + (remUnit === k ? ' on' : '') + '" aria-pressed="' + (remUnit === k) + '" onclick="remUnitSet(' + k + ')">' + n + '</button>').join('');
  return (remCtx === 'def' ? '<p class="hint">Подставляются в каждое новое событие. У события их можно поменять.</p>' : '') +
    '<div class="fl">СВОЙ ИНТЕРВАЛ</div>' +
    '<div class="custom"><label class="sr" for="remNum">Число</label><input id="remNum" class="inp inp-num" inputmode="numeric" pattern="[0-9]*" maxlength="3" placeholder="1" enterkeyhint="done">' +
      '<div class="seg">' + units + '</div>' +
      '<button class="btn-sm" onclick="remAdd()">Добавить</button></div>' +
    '<div class="fl">' + (cur.length ? 'ВЫБРАНО: ' + cur.length + ' ИЗ ' + MAX_REM : 'ГОТОВЫЕ') + '</div>' +
    '<div class="grp">' + rows + '</div>';
}

function remAfter() {
  const n = $('remNum');
  n.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') remAdd(); });
}

function remToggle(m) {
  const cur = remList();
  if (cur.includes(m)) remSet(cur.filter((x) => x !== m));
  else if (cur.length >= MAX_REM) { toast('Не больше ' + MAX_REM + ' напоминаний'); return; }
  else remSet([...cur, m]);
  shRefresh();
}

function remUnitSet(k) {
  const v = $('remNum') ? $('remNum').value : '';
  remUnit = k;
  shRefresh();
  if ($('remNum')) $('remNum').value = v;
}

function remAdd() {
  const inp = $('remNum');
  const n = parseInt(inp && inp.value, 10);
  if (!(n > 0)) { toast('Введите число'); if (inp) inp.focus(); return; }
  const m = n * remUnit;
  if (m > 525600) { toast('Не больше чем за год'); return; }
  const cur = remList();
  if (!cur.includes(m)) {
    if (cur.length >= MAX_REM) { toast('Не больше ' + MAX_REM + ' напоминаний'); return; }
    remSet([...cur, m]);
  }
  if (inp) inp.blur();
  shRefresh();
  toast('Добавлено: ' + fmtOffset(m));
}

function remDone() {
  if (remCtx === 'ed') stepBack();
  else { shClose(); stRender(); }
}
