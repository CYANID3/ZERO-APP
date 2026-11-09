// Нижний лист: стопка видов (редактор → выбор напоминаний …), «назад» шагает по стопке
let shStack = [];
let shCloseT = 0;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function shIsOpen() { return !$('ov').hidden && $('ov').classList.contains('open'); }

function shOpen(view) {
  clearTimeout(shCloseT);
  shStack = [view];
  const ov = $('ov');
  ov.hidden = false;
  shRender(0);
  void ov.offsetWidth;
  ov.classList.add('open');
}

function shPush(view) {
  const cur = shStack[shStack.length - 1];
  if (cur) cur.st = $('shBody').scrollTop;   // при возврате — на то же место
  shStack.push(view);
  shRender(1);
}

function stepBack() {
  if (shStack.length > 1) { shStack.pop(); shRender(-1, 'restore'); } else shClose();
}

function shRefresh() { if (shStack.length) shRender(0, true); }

function shRender(dir, keepScroll) {
  const v = shStack[shStack.length - 1];
  if (!v) return;
  const sh = document.querySelector('.sh');
  const body = $('shBody');
  const h0 = sh.getBoundingClientRect().height;
  const st = body.scrollTop;
  $('shTitle').textContent = v.title;
  $('shBack').hidden = shStack.length < 2;
  try {
    body.innerHTML = v.body();
    $('shFt').innerHTML = v.foot ? v.foot() : '';
  } catch (err) {
    console.error('sheet', err);
    body.innerHTML = '<div class="empty"><b>Не получилось открыть</b><span>' + esc(err && err.message) + '</span></div>';
  }
  paintIcons(sh);
  if (v.after) v.after();
  body.scrollTop = keepScroll === 'restore' ? (v.st || 0) : keepScroll ? st : 0;
  if (reduceMotion() || !shIsOpen()) return;
  // Смена вида: содержимое въезжает сбоку; любая смена высоты — край листа плавно доезжает (FLIP)
  const h1 = sh.getBoundingClientRect().height;
  if (dir) body.animate([{ transform: 'translateX(' + (dir * 28) + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,0,0,1)' });
  if (Math.abs(h1 - h0) > 2 && h0 > 0) {
    sh.animate([{ transform: 'translateY(' + (h1 - h0) + 'px)' }, { transform: 'none' }], { duration: dir ? 280 : 200, easing: 'cubic-bezier(.2,0,0,1)' });
  }
}

function shClose() {
  const ov = $('ov');
  if (ov.hidden) return;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  ov.classList.remove('open');
  clearTimeout(shCloseT);
  shCloseT = setTimeout(() => { ov.hidden = true; shStack = []; $('shBody').innerHTML = ''; $('shFt').innerHTML = ''; }, reduceMotion() ? 0 : 280);
  if (stIsOpen()) stRender();   // настройки могли поменяться в листе (напоминания по умолчанию)
}

// Касание по листу вне поля ввода не забирает фокус у поля (иначе клавиатура прыгает)
document.addEventListener('mousedown', (ev) => {
  const sh = ev.target.closest && ev.target.closest('.sh');
  if (sh && !ev.target.closest('input, textarea, select, label')) ev.preventDefault();
});

// Переключатель-«switch»: общая разметка
function swHtml(on, label, onclick) {
  return '<button class="sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" aria-label="' + esc(label) + '" onclick="' + onclick + '"><span></span></button>';
}
