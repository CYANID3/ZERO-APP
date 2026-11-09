// Редактор события: название, дата, время (по желанию), повтор, напоминания, цвет
let ED = null;

function edOpen(id) {
  const e = id ? evById(id) : null;
  if (id && !e) return;
  const tm = new Date(Date.now() + DAY);
  ED = e
    ? { id: e.id, title: e.title, date: e.date, hasTime: !!e.time, time: e.time || '12:00', repeat: e.repeat, color: e.color, reminders: [...e.reminders], moment: e.moment }
    : { id: null, title: '', date: isoDate(tm), hasTime: false, time: '12:00', repeat: false,
        color: COLORS[S.events.length % COLORS.length], reminders: [...S.settings.defReminders], moment: S.settings.defMoment };
  shOpen(edView());
  if (!e) setTimeout(() => { const t = $('edTitle'); if (t && shIsOpen()) t.focus(); }, 320);
}

function edView() {
  return {
    title: ED.id ? 'Событие' : 'Новое событие',
    body: edBody,
    foot: () => '<button class="btn-main" onclick="edSave()">Сохранить</button>',
    after: edAfter
  };
}

function edBody() {
  const chips = ED.reminders.map((m, i) =>
    '<span class="chip"><span>' + fmtOffset(m) + '</span><button class="chip-x" aria-label="Убрать «' + fmtOffset(m) + '»" onclick="edRemDel(' + i + ')">' + ICON.x + '</button></span>').join('');
  const sw = COLORS.map((c) =>
    '<button class="swatch c-' + c + (ED.color === c ? ' on' : '') + '" aria-label="' + COLOR_NAMES[c] + (ED.color === c ? ', выбран' : '') + '" aria-pressed="' + (ED.color === c) + '" onclick="edColor(\'' + c + '\')"></button>').join('');
  return '' +
    '<label class="fld"><span class="fl">НАЗВАНИЕ</span>' +
      '<input id="edTitle" class="inp" maxlength="80" autocomplete="off" enterkeyhint="done" placeholder="Например, отпуск" value="' + esc(ED.title) + '"></label>' +
    '<div class="grp">' +
      '<div class="row" onclick="edPick(event, \'edDate\')"><span class="ri">' + ICON.cal + '</span><span class="rt">Дата</span>' +
        '<span class="pick"><span id="edDateV">' + esc(edDateText()) + '</span><input id="edDate" class="pick-in" type="date" aria-label="Дата" required value="' + esc(ED.date) + '"></span></div>' +
      '<div class="sep"></div>' +
      '<div class="row" onclick="edPick(event, \'edTime\')"><span class="ri">' + ICON.clock + '</span><span class="rt">Время</span>' +
        (ED.hasTime ? '<span class="pick"><span id="edTimeV">' + esc(ED.time) + '</span><input id="edTime" class="pick-in" type="time" aria-label="Время" value="' + esc(ED.time) + '"></span>' : '<span class="rv">весь день</span>') +
        swHtml(ED.hasTime, 'Указать время', 'edToggle(event, \'hasTime\')') + '</div>' +
      '<div class="sep"></div>' +
      '<div class="row"><span class="ri">' + ICON.repeat + '</span><span class="rt">Каждый год</span>' + swHtml(ED.repeat, 'Повторять каждый год', 'edToggle(event, \'repeat\')') + '</div>' +
    '</div>' +
    '<div class="fl">НАПОМНИТЬ ЗАРАНЕЕ</div>' +
    '<div class="chips">' + chips + '<button class="chip chip-add" onclick="remOpen(\'ed\')">' + ICON.plus + (ED.reminders.length ? 'Добавить' : 'Добавить напоминание') + '</button></div>' +
    '<div class="grp"><div class="row"><span class="ri">' + ICON.bell + '</span><span class="rt">В момент наступления</span>' + swHtml(ED.moment, 'Уведомить в момент наступления', 'edToggle(event, \'moment\')') + '</div></div>' +
    '<div class="fl">ЦВЕТ</div><div class="swatches">' + sw + '</div>' +
    (ED.id ? '<button class="btn-del" onclick="edDelete()">' + ICON.trash + 'Удалить событие</button>' : '') +
    '<div class="hint" id="edHint" hidden></div>';
}

function edAfter() {
  const t = $('edTitle'), d = $('edDate'), tm = $('edTime');
  t.addEventListener('input', () => { ED.title = t.value; });
  t.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') t.blur(); });
  const upd = () => {
    if (d.value) ED.date = d.value;
    if (tm && tm.value) ED.time = tm.value;
    $('edDateV').textContent = edDateText();
    if (tm) $('edTimeV').textContent = ED.time;
    edHint();
  };
  d.addEventListener('change', upd); d.addEventListener('input', upd);
  // На части браузеров касание прозрачного поля не открывает выбор — открываем сами
  [d, tm].forEach((el) => el && el.addEventListener('click', () => { try { el.showPicker(); } catch (e) {} }));
  if (tm) { tm.addEventListener('change', upd); tm.addEventListener('input', upd); }
  edHint();
}

// Касание по строке открывает выбор даты/времени
function edPick(ev, id) {
  if (ev.target.closest('.sw')) return;
  const el = $(id);
  if (!el || ev.target === el) return;
  if (document.activeElement && document.activeElement.id === 'edTitle') document.activeElement.blur();
  try { el.showPicker(); } catch (e) { el.focus(); }
}

function edDateText() {
  const [y, m, dd] = ED.date.split('-').map(Number);
  return dd + ' ' + MONTHS[m - 1] + ' ' + y;
}

function edToggle(ev, k) {
  ev.stopPropagation();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  ED[k] = !ED[k];
  shRefresh();
}
function edColor(c) { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); ED.color = c; shRefresh(); }
function edRemDel(i) { ED.reminders.splice(i, 1); shRefresh(); }

function edDraft() {
  return cleanEvent({ id: ED.id || 1, title: ED.title, date: ED.date, time: ED.hasTime ? ED.time : null, repeat: ED.repeat, color: ED.color, reminders: ED.reminders, moment: ED.moment });
}

function edHint() {
  const h = $('edHint');
  if (!h) return;
  const e = edDraft();
  let msg = '';
  if (e && !e.repeat && baseDate(e).getTime() <= Date.now()) msg = 'Эта дата уже прошла — будет показано, сколько времени прошло.';
  h.textContent = msg;
  h.hidden = !msg;
}

function edSave() {
  if (!shIsOpen() || !ED) return;   // двойное касание «Сохранить» не создаёт копию
  const e = edDraft();
  if (!e) { toast('Укажите дату'); return; }
  if (ED.id) {
    const old = evById(ED.id);
    Object.assign(old, e, { id: ED.id, created: old.created });
  } else {
    e.id = S.nextId++;
    e.created = Date.now();
    S.events.push(e);
  }
  save();
  shClose();
  renderList();
  toast(ED.id ? 'Сохранено' : 'Отсчёт запущен');
  ntEnsure();
}

async function edDelete() {
  const e = evById(ED.id);
  if (!e) return;
  const ok = await ask('Удалить событие?', '«' + e.title + '» и его уведомления будут удалены.', 'Удалить', 'Отмена', true);
  if (!ok) return;
  const idx = S.events.indexOf(e);
  S.events.splice(idx, 1);
  const wasWidget = S.settings.widget === e.id;
  if (wasWidget) S.settings.widget = 'auto';
  save();
  shClose();
  renderList();
  ntSync();
  toast('Событие удалено', 'Отменить', () => {
    S.events.splice(Math.min(idx, S.events.length), 0, e);
    if (wasWidget) S.settings.widget = e.id;
    save(); renderList(); ntSync();
  });
}
