import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, stop } from './helpers.mjs';

after(stop);
const NOW = Date.UTC(2026, 10, 9, 6, 0, 0); // 9 ноября 2026, 12:00 по Бишкеку
const DATA = {
  v: 1, nextId: 5,
  events: [
    { id: 1, title: 'Экзамен по вождению', date: '2026-11-12', time: '10:00', color: 'orange', reminders: [1440, 60], moment: true },
    { id: 2, title: 'День рождения мамы', date: '2020-11-21', time: null, repeat: true, color: 'pink', reminders: [4320], moment: true },
    { id: 3, title: 'Новый год', date: '2027-01-01', time: '00:00', color: 'blue', reminders: [10], moment: true },
    { id: 4, title: 'Старое', date: '2026-10-01', time: null, color: 'teal', reminders: [], moment: false }
  ],
  settings: { view: 'cards' }
};

test('список карточками: порядок, отсчёт, прошедшие внизу', async () => {
  const a = await openApp({ data: DATA, now: NOW });
  const rows = await a.ev(() => [...document.querySelectorAll('.card')].map((c) => [c.querySelector('.c-t').textContent, c.querySelector('.n-d').textContent, c.querySelector('.n-dw').textContent, c.className]));
  assert.deepEqual(rows.map((r) => r[0]), ['Экзамен по вождению', 'День рождения мамы', 'Новый год', 'Старое']);
  assert.deepEqual(rows[0].slice(1, 3), ['2', 'дня']);              // до 12.11 10:00 — 2 дня 22 ч
  assert.deepEqual(rows[1].slice(1, 3), ['11', 'дней']);            // ежегодное: 21.11.2026
  assert.match(rows[3][3], /is-past/);
  const hms0 = await a.ev(() => document.querySelector('.card .n-hms').textContent);
  assert.equal(hms0.length, 8);
  await a.wait(1300);
  const hms1 = await a.ev(() => document.querySelector('.card .n-hms').textContent);
  assert.notEqual(hms0, hms1, 'секунды тикают');
  assert.match(await a.ev(() => $('hdSub').textContent), /4 отсчёта · ближайшее через 2 дня/);
  assert.deepEqual(a.errors, []);
  await a.close();
});

test('плитки: первое крупно, кнопка добавления, переключение в настройках', async () => {
  const a = await openApp({ data: DATA, now: NOW });
  await a.page.click('#hdSet');
  await a.wait(350);
  await a.page.click('#stBody button[aria-pressed]:has-text("Плитки")');
  await a.wait(50);
  assert.equal(await a.ev(() => S.settings.view), 'tiles');
  assert.equal(await a.ev(() => document.querySelectorAll('.tile.is-big').length), 1);
  assert.equal(await a.ev(() => document.querySelector('.tile.is-big .t-t').textContent), 'Экзамен по вождению');
  assert.ok(await a.ev(() => !!document.querySelector('.tile-add')));
  assert.equal(await a.ev(() => $('ft').hidden), true);
  assert.equal(await a.ev(() => $('hdAdd').hidden), false);
  // после перезапуска вид сохраняется
  await a.ev(() => save(true));
  assert.equal(await a.ev(() => adopt(JSON.parse(localStorage.getItem('zero.v1'))).settings.view), 'tiles');
  assert.deepEqual(a.errors, []);
  await a.close();
});

test('новое событие: дата, время, напоминания, сохранение и уведомления', async () => {
  const a = await openApp({ now: NOW, native: true, perm: 'prompt' });
  assert.match(await a.ev(() => $('list').textContent), /Пока нет событий/);
  await a.page.click('.ft .btn-main');
  await a.wait(350);
  await a.page.fill('#edTitle', 'Отпуск <img src=x onerror="window.__xss=1">');
  await a.page.fill('#edDate', '2026-12-15');
  await a.page.click('[aria-label="Указать время"]');
  await a.page.fill('#edTime', '08:30');
  await a.page.dispatchEvent('#edTime', 'change');
  // свой интервал: 2 нед
  await a.page.click('.chip-add');
  await a.wait(300);
  await a.page.fill('#remNum', '2');
  await a.page.click('.custom .seg-b:has-text("нед")');
  await a.page.click('.custom .btn-sm');
  await a.page.click('#shFt .btn-main');            // Готово
  await a.wait(300);
  assert.match(await a.ev(() => $('shBody').textContent), /за 2 недели/);
  await a.page.click('#shFt .btn-main');            // Сохранить
  await a.wait(150);
  // объяснение перед системным окном
  assert.equal(await a.ev(() => $('dlg').hidden), false);
  await a.page.click('#dlgOk');
  await a.wait(150);
  const e = await a.ev(() => S.events[0]);
  assert.equal(e.date, '2026-12-15');
  assert.equal(e.time, '08:30');
  assert.deepEqual(e.reminders, [20160, 1440, 60, 10]);
  assert.equal(await a.ev(() => window.__xss), undefined);
  const pend = await a.ev(() => window.__pending());
  assert.equal(pend.length, 5);                     // 4 заранее + в момент
  const moment = pend.find((n) => n.channelId === 'moment');
  assert.equal(new Date(moment.schedule.at).toISOString(), '2026-12-15T02:30:00.000Z');
  assert.match(moment.title, /сейчас!$/);
  const day = pend.find((n) => /через 1 день/.test(n.title));
  assert.equal(new Date(day.schedule.at).toISOString(), '2026-12-14T02:30:00.000Z');
  const calls = await a.ev(() => window.__calls.map((c) => c[0]));
  assert.ok(calls.includes('notifAsk'));
  assert.ok(calls.includes('widget'));
  assert.deepEqual(a.errors, []);
  await a.close();
});

test('ежегодное событие: три года вперёд, без прошлых', async () => {
  const a = await openApp({ data: DATA, now: NOW, native: true });
  await a.wait(300);
  const pend = await a.ev(() => window.__pending());
  const mom = pend.filter((n) => n.extra.ev === 2 && n.channelId === 'moment').map((n) => new Date(n.schedule.at).getUTCFullYear());
  assert.deepEqual(mom, [2026, 2027, 2028]);
  assert.ok(pend.every((n) => new Date(n.schedule.at).getTime() > NOW));
  assert.ok(!pend.some((n) => n.extra.ev === 4));
  assert.deepEqual(a.errors, []);
  await a.close();
});

test('удаление с отменой', async () => {
  const a = await openApp({ data: DATA, now: NOW });
  await a.page.click('.card[data-id="3"]');
  await a.wait(350);
  await a.page.click('.btn-del');
  await a.page.click('#dlgOk');
  await a.wait(100);
  assert.equal(await a.ev(() => S.events.length), 3);
  await a.page.click('#toastA');
  assert.equal(await a.ev(() => S.events.length), 4);
  assert.deepEqual(a.errors, []);
  await a.close();
});

test('мусор в хранилище не ломает приложение', async () => {
  for (let i = 0; i < 25; i++) {
    const junk = [null, 1, 'x', [], {}, { a: 1 }, true];
    const pick = () => junk[Math.floor(Math.random() * junk.length)];
    const data = { nextId: pick(), events: [pick(), { id: pick(), date: pick(), title: '<b>x</b>', reminders: pick() }, { id: 7, date: '2026-13-45' }, { id: 8, date: '2027-02-03', reminders: ['5', -1, 1e9, 'a'] }],
      settings: { view: pick(), theme: pick(), past: pick(), defReminders: pick(), widget: pick() } };
    const a = await openApp({ data, now: NOW });
    await a.page.click('#hdSet');
    await a.wait(50);
    const t = await a.ev(() => $('stBody').textContent);
    assert.match(t, /Вид списка/);
    assert.equal(await a.ev(() => S.events.length), 1);
    assert.deepEqual(await a.ev(() => S.events[0].reminders), [5]);
    assert.deepEqual(a.errors, []);
    await a.close();
  }
});

test('темы: светлая/тёмная/авто, строка состояния = фон', async () => {
  const a = await openApp({ data: DATA, now: NOW, native: true, scheme: 'light' });
  for (const [t, bg] of [['light', '#F4F5F7'], ['dark', '#0E0F12'], ['auto', '#F4F5F7']]) {
    await a.ev((v) => { S.settings.theme = v; applyTheme(); }, t);
    assert.equal(await a.ev(() => document.querySelector('meta[name=theme-color]').content), bg);
    const last = await a.ev(() => window.__calls.filter((c) => c[0] === 'setBars').pop());
    assert.equal(last[2], bg);
  }
  await a.ev(() => window.__emit('sysTheme', { dark: true }));
  assert.equal(await a.ev(() => document.documentElement.dataset.theme), 'dark');
  assert.deepEqual(a.errors, []);
  await a.close();
});

test('«Назад»: лист → настройки → свернуть', async () => {
  const a = await openApp({ data: DATA, now: NOW, native: true });
  await a.page.click('#hdSet');
  await a.wait(320);
  await a.page.click('text=Напоминать заранее');
  await a.wait(320);
  assert.equal(await a.ev(() => shIsOpen()), true);
  await a.ev(() => window.__emit('back')); await a.wait(320);
  assert.equal(await a.ev(() => shIsOpen()), false);
  await a.ev(() => window.__emit('back')); await a.wait(320);
  assert.equal(await a.ev(() => $('settings').hidden), true);
  await a.ev(() => window.__emit('back'));
  assert.ok(await a.ev(() => window.__calls.some((c) => c[0] === 'minimize')));
  assert.deepEqual(a.errors, []);
  await a.close();
});

test('у каждой кнопки есть имя', async () => {
  const a = await openApp({ data: DATA, now: NOW });
  const check = () => [...document.querySelectorAll('button, input')].filter((b) => b.offsetParent !== null)
    .filter((b) => !(b.getAttribute('aria-label') || b.textContent.trim() || (b.labels && b.labels.length) || b.closest('label'))).map((b) => b.outerHTML.slice(0, 80));
  assert.deepEqual(await a.ev(check), []);
  await a.page.click('.card[data-id="1"]'); await a.wait(350);
  assert.deepEqual(await a.ev(check), []);
  await a.ev(() => remOpen('ed')); await a.wait(350);
  assert.deepEqual(await a.ev(check), []);
  assert.deepEqual(a.errors, []);
  await a.close();
});

test('только что наступившее: «Наступило!» сверху, через сутки — в прошедших', async () => {
  const data = { ...DATA, events: [...DATA.events, { id: 9, title: 'Сдача', date: '2026-11-09', time: '09:00', color: 'yellow', reminders: [], moment: true }] };
  let a = await openApp({ data, now: NOW });
  const first = await a.ev(() => { const c = document.querySelector('.card'); return [c.dataset.id, c.querySelector('.n-now')?.textContent, c.querySelector('.n-hms').textContent]; });
  assert.deepEqual(first, ['9', 'Наступило!', '03:00:00']);
  await a.ev(() => { S.settings.view = 'tiles'; renderList(); });
  assert.equal(await a.ev(() => document.querySelector('.tile.is-big .n-now').textContent), 'Наступило!');
  assert.deepEqual(a.errors, []);
  await a.close();
  a = await openApp({ data, now: NOW + 86400000 });
  assert.equal(await a.ev(() => document.querySelector('.card[data-id="9"]').className), 'card is-past');
  assert.deepEqual(a.errors, []);
  await a.close();
});

test('лист: «назад» из напоминаний возвращает на то же место, единица не сбрасывает ввод', async () => {
  const a = await openApp({ data: DATA, now: NOW });
  await a.page.setViewportSize({ width: 412, height: 600 });
  await a.page.click('.card[data-id="1"]'); await a.wait(350);
  await a.ev(() => { $('shBody').scrollTop = 9999; });
  const st = await a.ev(() => $('shBody').scrollTop);
  assert.ok(st > 0);
  await a.page.click('.chip-add'); await a.wait(320);
  await a.page.fill('#remNum', '3');
  await a.page.focus('#remNum');
  await a.page.click('.custom .seg-b:has-text("дн")');
  assert.equal(await a.ev(() => document.activeElement.id), 'remNum');
  assert.equal(await a.ev(() => $('remNum').value), '3');
  await a.page.click('.custom .btn-sm');
  await a.page.click('#shFt .btn-main'); await a.wait(320);
  assert.equal(await a.ev(() => $('shBody').scrollTop), st);
  assert.match(await a.ev(() => $('shBody').textContent), /за 3 дня/);
  assert.deepEqual(a.errors, []);
  await a.close();
});

test('двойное касание «Сохранить» создаёт одно событие', async () => {
  const a = await openApp({ now: NOW });
  await a.page.click('.ft .btn-main'); await a.wait(350);
  await a.page.fill('#edTitle', 'Раз');
  await a.ev(() => { edSave(); edSave(); return 0; });
  assert.equal(await a.ev(() => S.events.length), 1);
  assert.deepEqual(a.errors, []);
  await a.close();
});
