// Главный экран: список событий карточками или плитками, отсчёт тикает каждую секунду
let live = [];         // [{ t, el }] — что обновлять на тике
let liveSig = '';      // какие события в каком состоянии (смена → перерисовать целиком)

function remLine(e) {
  const a = e.reminders.map((m) => fmtOffset(m, true));
  if (e.moment) a.push('в момент');
  return a.length ? a.join(' · ') : 'без уведомлений';
}

function cdParts(t, now) {
  const l = left(t, now);
  const hms = p2(l.h) + ':' + p2(l.m) + (S.settings.seconds ? ':' + p2(l.s) : '');
  return { ...l, hms, dw: wDays(l.days) };
}

function cardHtml(r, now) {
  const e = r.e, c = cdParts(r.t, now);
  const cls = 'card' + (r.fresh ? ' is-fresh' : r.past ? ' is-past' : '');
  const lab = r.past && !r.fresh ? 'прошло' : '';
  return '<button class="' + cls + '" data-id="' + e.id + '" onclick="edOpen(' + e.id + ')">' +
    '<span class="c-top"><span class="dot c-' + e.color + '"></span><span class="c-t">' + esc(e.title) + '</span>' +
      (e.repeat ? '<span class="c-rep" role="img" aria-label="Каждый год">' + ICON.repeat + '</span>' : '') + '</span>' +
    '<span class="c-lab">' + lab + '</span>' +
    (r.fresh
      ? '<span class="c-cd"><span class="n-now">Наступило!</span><span class="n-ago">прошло <span class="n-hms">' + c.hms + '</span></span></span>'
      : '<span class="c-cd"><span class="n-d">' + c.days + '</span><span class="n-dw">' + c.dw + '</span><span class="n-hms">' + c.hms + '</span></span>') +
    '<span class="c-ft"><span class="c-date">' + esc(fmtDate(r.t, !!e.time, true)) + '</span>' +
      '<span class="c-rem">' + ICON.bell + esc(remLine(e)) + '</span></span>' +
  '</button>';
}

function tileHtml(r, now, big) {
  const e = r.e, c = cdParts(r.t, now);
  const cls = 'tile t-' + e.color + (big ? ' is-big' : '') + (r.fresh ? ' is-fresh' : r.past ? ' is-past' : '');
  const lab = r.past ? 'прошло ' : '';
  const date = big ? fmtDate(r.t, !!e.time) : fmtShort(r.t);
  if (r.fresh) {
    return '<button class="' + cls + '" data-id="' + e.id + '" onclick="edOpen(' + e.id + ')">' +
      '<span class="t-top"><span class="t-t">' + esc(e.title) + '</span>' + (big ? '<span class="t-date">' + esc(date) + '</span>' : '') + '</span>' +
      '<span class="n-now">Наступило!</span><span class="t-sub">прошло <span class="n-hms">' + c.hms + '</span></span></button>';
  }
  return '<button class="' + cls + '" data-id="' + e.id + '" onclick="edOpen(' + e.id + ')">' +
    '<span class="t-top"><span class="t-t">' + esc(e.title) + '</span>' + (big ? '<span class="t-date">' + esc(date) + '</span>' : '') + '</span>' +
    '<span class="t-cd"><span class="n-d">' + c.days + '</span>' +
      '<span class="t-side"><span class="n-dw">' + c.dw + '</span>' + (big ? '<span class="n-hms">' + c.hms + '</span>' : '') + '</span></span>' +
    (big ? (lab ? '<span class="t-lab">' + lab.trim() + '</span>' : '') : '<span class="t-sub">' + lab + '<span class="n-hms">' + c.hms + '</span>' + (lab ? '' : ' · ' + esc(date)) + '</span>') +
  '</button>';
}

function renderList() {
  try {
    const now = Date.now();
    const { fresh, fut, past } = sortedEvents(now);
    const tiles = S.settings.view === 'tiles';
    const main = [...fresh, ...fut];
    let h = '';
    if (!S.events.length) {
      h = '<div class="empty">' + ICON.hourglass + '<b>Пока нет событий</b><span>Укажите дату — и начнётся обратный отсчёт</span>' +
        (tiles ? '<button class="tile-add" onclick="edOpen()">' + ICON.plus + 'Добавить событие</button>' : '') + '</div>';
    } else if (tiles) {
      h = '<div class="tiles">' + main.map((r, i) => tileHtml(r, now, i === 0)).join('') +
        '<button class="tile-add" onclick="edOpen()">' + ICON.plus + 'Добавить</button></div>';
      if (past.length) h += '<div class="gh">ПРОШЕДШИЕ</div><div class="tiles">' + past.map((r) => tileHtml(r, now, false)).join('') + '</div>';
    } else {
      h = '<div class="cards">' + main.map((r) => cardHtml(r, now)).join('') + '</div>';
      if (past.length) h += '<div class="gh">ПРОШЕДШИЕ</div><div class="cards">' + past.map((r) => cardHtml(r, now)).join('') + '</div>';
    }
    const list = $('list');
    list.innerHTML = h;
    list.classList.toggle('is-tiles', tiles);
    $('ft').hidden = tiles;
    $('hdAdd').hidden = !tiles;
    // что тикает
    live = [];
    for (const r of [...main, ...past]) {
      const el = list.querySelector('[data-id="' + r.e.id + '"]');
      if (el) live.push({ t: r.t, el, past: r.past });
    }
    liveSig = sigOf(now);
    renderSub(now, fut);
  } catch (err) {
    console.error('renderList', err);
    $('list').innerHTML = '<div class="empty"><b>Не получилось показать список</b><span>' + esc(err && err.message) + '</span></div>';
  }
}

function sigOf(now) {
  const { fresh, fut, past } = sortedEvents(now);
  return [fresh, fut, past].map((g) => g.map((r) => r.e.id + '@' + r.t.getTime()).join(',')).join('|');
}

function renderSub(now, fut) {
  const n = S.events.length;
  let s = n ? n + ' ' + plural(n, 'отсчёт', 'отсчёта', 'отсчётов') : '';
  if (fut && fut.length) {
    const l = left(fut[0].t, now);
    s += ' · ближайшее через ' + (l.days ? l.days + ' ' + wDays(l.days) : l.h ? l.h + ' ч' : (l.m || 1) + ' мин');
  }
  $('hdSub').textContent = s;
}

function tick() {
  const now = Date.now();
  if (sigOf(now) !== liveSig) { renderList(); if (NATIVE) ntSync(); return; }
  for (const x of live) {
    const c = cdParts(x.t, now);
    const q = (s) => x.el.querySelector(s);
    const d = q('.n-d'), w = q('.n-dw'), hm = q('.n-hms');
    if (d && d.textContent !== String(c.days)) d.textContent = c.days;
    if (w && w.textContent !== c.dw) w.textContent = c.dw;
    if (hm) hm.textContent = c.hms;
  }
  if (now % 60000 < 1000) renderSub(now, sortedEvents(now).fut);
}

let tickT = 0;
function tickLoop() {
  clearTimeout(tickT);
  if (document.hidden) return;
  tick();
  tickT = setTimeout(tickLoop, 1000 - (Date.now() % 1000) + 5);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderList(); tickLoop(); } else clearTimeout(tickT); });
