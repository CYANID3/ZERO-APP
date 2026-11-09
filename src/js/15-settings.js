// Настройки: отдельная страница, выбор значений — в нижнем листе
function stIsOpen() { return !$('settings').hidden; }

function stOpen() {
  const p = $('settings');
  p.hidden = false;
  stRender();
  void p.offsetWidth;
  p.classList.add('open');
  if (NATIVE) ntSync();
}

function stClose() {
  const p = $('settings');
  p.classList.remove('open');
  setTimeout(() => { if (!p.classList.contains('open')) p.hidden = true; }, reduceMotion() ? 0 : 280);
}

function seg(opts, cur, fn, label) {
  return '<div class="seg" role="group" aria-label="' + esc(label) + '">' + opts.map(([v, n]) =>
    '<button class="seg-b' + (cur === v ? ' on' : '') + '" aria-pressed="' + (cur === v) + '" onclick="' + fn + '(\'' + v + '\')">' + n + '</button>').join('') + '</div>';
}

function stRow(icon, title, sub, right, onclick) {
  const tag = onclick ? 'button' : 'div';
  return '<' + tag + ' class="row' + (onclick ? ' row-btn' : '') + '"' + (onclick ? ' onclick="' + onclick + '"' : '') + '>' +
    (icon ? '<span class="ri ri-box">' + ICON[icon] + '</span>' : '') +
    '<span class="rt">' + title + (sub ? '<small>' + sub + '</small>' : '') + '</span>' + (right || '') + '</' + tag + '>';
}

function permText() {
  if (!NATIVE) return ['Работают только в приложении', ''];
  if (ntState === 'granted') return ntExact ? ['Включены, точное время — да', 'ok'] : ['Включены, но время может сдвигаться', 'warn'];
  if (ntState === 'denied') return ['Выключены — нажмите, чтобы открыть настройки', 'bad'];
  if (ntState === 'unknown') return ['Проверяем…', ''];
  return ['Ещё не разрешены — нажмите, чтобы разрешить', 'warn'];
}

function stRender() {
  try {
    const st = S.settings;
    const defs = st.defReminders.length ? st.defReminders.map((m) => fmtOffset(m)).join(' · ') : 'не напоминать';
    const wEv = st.widget === 'auto' ? 'Ближайшее' : (evById(st.widget) || {}).title || 'Ближайшее';
    const [pt, pc] = permText();
    $('stBody').innerHTML =
      '<div class="gh">УВЕДОМЛЕНИЯ</div><div class="grp">' +
        stRow('clock', 'Напоминать заранее', esc(defs), '<span class="chev">' + ICON.chev + '</span>', "remOpen('def')") +
        '<div class="sep sep-i"></div>' +
        stRow('bell', 'В момент наступления', 'Для новых событий', swHtml(st.defMoment, 'В момент наступления', 'stToggle(\'defMoment\')')) +
        '<div class="sep sep-i"></div>' +
        stRow('sound', 'Звук и вибрация', 'Системные настройки уведомлений', '<span class="chev">' + ICON.chev + '</span>', NATIVE ? 'NATIVE.openNotifSettings()' : '') +
        '<div class="sep sep-i"></div>' +
        stRow(pc === 'ok' ? 'check' : 'bellOff', 'Разрешения', '<span class="pm pm-' + pc + '">' + pt + '</span>', '', NATIVE && pc !== 'ok' ? 'ntFix()' : '') +
      '</div>' +
      '<div class="gh">ВИД</div><div class="grp">' +
        stRow('', 'Тема', '', seg([['light', 'Светлая'], ['dark', 'Тёмная'], ['auto', 'Авто']], st.theme, 'stTheme', 'Тема')) +
        '<div class="sep"></div>' +
        stRow('', 'Вид списка', '', seg([['cards', 'Карточки'], ['tiles', 'Плитки']], st.view, 'stView', 'Вид списка')) +
        '<div class="sep"></div>' +
        stRow('', 'Показывать секунды', '', swHtml(st.seconds, 'Показывать секунды', 'stToggle(\'seconds\')')) +
        '<div class="sep"></div>' +
        stRow('', 'Прошедшие события', '', '<span class="rv">' + (st.past === 'hide' ? 'Скрывать' : 'Внизу списка') + '</span><span class="chev">' + ICON.chev + '</span>', 'stPast()') +
      '</div>' +
      '<div class="gh">ВИДЖЕТ</div><div class="grp">' +
        stRow('widget', 'Событие на виджете', 'Добавьте виджет ZERO на рабочий стол', '<span class="rv rv-ell">' + esc(wEv) + '</span><span class="chev">' + ICON.chev + '</span>', 'stWidget()') +
      '</div>' +
      '<p class="ver">ZERO · версия ' + esc(APP_VERSION) + '</p>';
  } catch (err) {
    console.error('settings', err);
    $('stBody').innerHTML = '<div class="empty"><b>Не получилось открыть настройки</b><span>' + esc(err && err.message) + '</span></div>';
  }
}

function stToggle(k) { S.settings[k] = !S.settings[k]; save(); stRender(); if (k === 'seconds') renderList(); }
function stTheme(v) { S.settings.theme = v; save(); applyTheme(); stRender(); }
function stView(v) { S.settings.view = v; save(); stRender(); renderList(); }

// Выбор одного значения в нижнем листе
function pickOpen(title, opts, cur, onPick) {
  shOpen({
    title,
    body: () => '<div class="grp">' + opts.map(([v, n], i) =>
      '<button class="row row-btn' + (v === cur ? ' on' : '') + '" role="radio" aria-checked="' + (v === cur) + '" onclick="pickDo(' + i + ')">' +
        '<span class="rt">' + esc(n) + '</span><span class="ck">' + (v === cur ? ICON.check : '') + '</span></button>').join('<div class="sep"></div>') + '</div>'
  });
  pickDo = (i) => { onPick(opts[i][0]); shClose(); stRender(); };
}
let pickDo = () => {};

function stPast() {
  pickOpen('Прошедшие события', [['bottom', 'Показывать внизу списка'], ['hide', 'Скрывать через сутки']], S.settings.past, (v) => { S.settings.past = v; save(); renderList(); });
}

function stWidget() {
  const now = Date.now();
  const opts = [['auto', 'Ближайшее событие']].concat(
    S.events.slice().sort((a, b) => target(a, now) - target(b, now)).map((e) => [e.id, e.title + ' — ' + fmtShort(target(e, now))]));
  pickOpen('Событие на виджете', opts, S.settings.widget, (v) => { S.settings.widget = v; save(); wgSync(); });
}
