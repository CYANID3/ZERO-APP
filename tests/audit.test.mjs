// Аудит: контраст текста во всех экранах × темах, переполнения на узком экране
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, stop } from './helpers.mjs';

after(stop);
const NOW = Date.UTC(2026, 10, 9, 6, 0, 0);
const DATA = {
  v: 1, nextId: 9,
  events: [
    { id: 1, title: 'Экзамен по вождению', date: '2026-11-12', time: '10:00', color: 'orange', reminders: [1440, 60], moment: true },
    { id: 2, title: 'День рождения мамы', date: '2020-11-21', repeat: true, color: 'pink', reminders: [4320], moment: true },
    { id: 3, title: 'Очень длинное название события, которое не помещается в одну строку', date: '2027-03-15', time: '08:30', color: 'teal', reminders: [20160, 10080, 1440, 60, 10], moment: true },
    { id: 4, title: 'Новый год', date: '2027-01-01', time: '00:00', color: 'blue', reminders: [], moment: false },
    { id: 5, title: 'Выпуск', date: '2029-06-20', color: 'violet', reminders: [], moment: true },
    { id: 6, title: 'Сдача', date: '2026-11-09', time: '09:00', color: 'yellow', reminders: [], moment: true },
    { id: 7, title: 'Давно', date: '2026-09-01', color: 'teal', reminders: [], moment: false }
  ],
  settings: {}
};

// В странице: видимый текст → цвет текста и реальный фон (слои с прозрачностью смешиваются)
const CONTRAST = () => {
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const mix = (top, bot) => [0, 1, 2].map((i) => top[i] * top[3] + bot[i] * (1 - top[3]));
  const bgOf = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const c = getComputedStyle(e).backgroundColor;
      const v = rgba(c);
      if (c !== 'rgba(0, 0, 0, 0)' && v[3] > 0) { layers.push(v); if (v[3] >= 1) break; }
    }
    let base = rgba(getComputedStyle(document.documentElement).backgroundColor);
    base = base.slice(0, 3);
    for (let i = layers.length - 1; i >= 0; i--) base = mix(layers[i], base);
    return base;
  };
  const bad = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    const el = n.parentElement;
    if (!n.textContent.trim() || !el) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || el.closest('[hidden]')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0 || el.closest('.scrim')) continue;
    // под листом/диалогом — не проверяем
    const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
    if (hit && !el.contains(hit) && !hit.contains(el) && hit.closest('.scrim, .sh, .page, .dlg-box')) continue;
    const fg = rgba(cs.color), bg = bgOf(el);
    const fgm = mix(fg, bg);
    const L1 = lum(fgm), L2 = lum(bg);
    const k = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    if (k < (big ? 3 : 4.5)) bad.push(n.textContent.trim().slice(0, 30) + ' — ' + k.toFixed(2));
  }
  return bad;
};

const SCREENS = {
  cards: async (a) => { await a.ev(() => { S.settings.view = 'cards'; renderList(); }); },
  tiles: async (a) => { await a.ev(() => { S.settings.view = 'tiles'; renderList(); }); },
  edit: async (a) => { await a.ev(() => edOpen(1)); await a.wait(350); },
  reminders: async (a) => { await a.ev(() => { edOpen(3); }); await a.wait(320); await a.ev(() => remOpen('ed')); await a.wait(320); },
  settings: async (a) => { await a.ev(() => stOpen()); await a.wait(350); },
  dialog: async (a) => { await a.ev(() => { ask('Удалить событие?', 'Текст', 'Удалить', 'Отмена', true); return 0; }); await a.wait(250); },
  toast: async (a) => { await a.ev(() => toast('Событие удалено', 'Отменить', () => {})); await a.wait(250); }
};

for (const theme of ['dark', 'light']) {
  test('контраст текста ≥ 4.5 (крупный ≥ 3): тема ' + theme, async () => {
    const all = {};
    for (const [name, go] of Object.entries(SCREENS)) {
      const a = await openApp({ data: { ...DATA, settings: { theme } }, now: NOW, native: true, perm: 'denied' });
      await go(a);
      const bad = await a.ev(CONTRAST);
      if (bad.length) all[name] = bad;
      assert.deepEqual(a.errors, []);
      await a.close();
    }
    assert.deepEqual(all, {});
  });
}

test('узкий экран 360×640: ничего не вылезает за край', async () => {
  const a = await openApp({ data: DATA, now: NOW });
  await a.page.setViewportSize({ width: 360, height: 640 });
  const over = () => [...document.querySelectorAll('body *')].filter((e) => {
    const r = e.getBoundingClientRect();
    if (!r.width || e.closest('[hidden]')) return false;
    const cs = getComputedStyle(e);
    if (cs.position === 'fixed') return false;
    return r.right > innerWidth + 1 && !e.closest('.page:not(.open)') && !e.closest('.ov[hidden]');
  }).map((e) => e.className || e.tagName).slice(0, 5);
  for (const [name, go] of Object.entries(SCREENS)) {
    if (name === 'dialog' || name === 'toast') continue;
    await a.ev(() => { shClose(); if (stIsOpen()) stClose(); return 0; });
    await a.wait(320);
    await go(a);
    assert.deepEqual(await a.ev(over), [], name);
  }
  assert.deepEqual(a.errors, []);
  await a.close();
});

// Край листа по кадрам: без скачков и «туда-обратно»
test('анимации листа без рывков', async () => {
  const a = await openApp({ data: DATA, now: NOW });
  const rec = (fn) => a.ev(async (code) => {
    const sh = document.querySelector('.sh');
    const ys = [];
    let run = true;
    const loop = () => { if (!$('ov').hidden) ys.push(Math.round(sh.getBoundingClientRect().top)); if (run) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    (0, eval)(code);
    await new Promise((r) => setTimeout(r, 450));
    run = false;
    return ys;
  }, fn);
  const check = (ys, name) => {
    const d = ys.slice(1).map((y, i) => y - ys[i]).filter((x) => x !== 0);
    const flips = d.slice(1).filter((x, i) => Math.sign(x) !== Math.sign(d[i])).length;
    assert.ok(flips === 0, name + ': туда-обратно ' + JSON.stringify(ys));
  };
  check(await rec('edOpen(3)'), 'открытие');
  check(await rec("remOpen('ed')"), 'к напоминаниям');
  check(await rec('stepBack()'), 'назад');
  check(await rec('shClose()'), 'закрытие');
  assert.deepEqual(a.errors, []);
  await a.close();
});
