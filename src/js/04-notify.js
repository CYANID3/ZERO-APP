// Уведомления (заранее и в момент наступления) и данные для виджета
let ntState = 'unknown';   // granted | denied | prompt | prompt-with-rationale | unknown
let ntExact = true;
let ntQueue = Promise.resolve();
const NT_MAX = 400;        // у Android есть предел на число будильников у приложения

// id: событие * 1000 + номер наступления * 100 + слот (0..11 — заранее, 99 — в момент)
function ntId(evId, occ, slot) { return evId * 1000 + occ * 100 + slot; }

function ntBuild(now) {
  const list = [];
  for (const e of S.events) {
    const occs = e.repeat ? occurrences(e, now, 3) : [baseDate(e)];
    occs.forEach((o, oi) => {
      const T = o.getTime();
      const when = fmtDate(o, !!e.time);
      e.reminders.forEach((min, ri) => {
        const at = T - min * 60000;
        if (at > now + 1000) list.push({ id: ntId(e.id, oi, ri), at, ch: 'remind', ev: e.id, title: e.title + ' — ' + fmtIn(min), body: when });
      });
      if (e.moment && T > now + 1000) list.push({ id: ntId(e.id, oi, 99), at: T, ch: 'moment', ev: e.id, title: e.title + ' — сейчас!', body: 'Отсчёт дошёл до нуля' });
    });
  }
  return list.sort((a, b) => a.at - b.at).slice(0, NT_MAX).map((n) => ({
    id: n.id, title: n.title, body: n.body, channelId: n.ch,
    schedule: { at: new Date(n.at), allowWhileIdle: true },
    smallIcon: 'ic_stat_zero', iconColor: '#8AB4FF', autoCancel: true,
    extra: { ev: n.ev }
  }));
}

async function ntDo() {
  if (!NATIVE) return;
  ntState = await NATIVE.notifPerm();
  ntExact = await NATIVE.exactOk();
  renderBanner();
  if (stIsOpen()) stRender();
  if (ntState !== 'granted') return;
  const list = ntBuild(Date.now());
  const old = await NATIVE.pending();
  await NATIVE.cancel(old);
  await NATIVE.schedule(list);
}

// Пересчитать все уведомления и виджет (по очереди, чтобы вызовы не перемешались)
function ntSync() {
  wgSync();
  ntQueue = ntQueue.then(ntDo).catch((e) => console.warn('notify', e && e.message));
  return ntQueue;
}

const needsNotif = () => S.events.some((e) => e.moment || e.reminders.length);

// Попросить разрешение — в момент, когда оно нужно, с объяснением перед системным окном
async function ntEnsure() {
  if (!NATIVE || !needsNotif()) return;
  ntState = await NATIVE.notifPerm();
  if (ntState === 'prompt' || ntState === 'prompt-with-rationale') {
    const ok = await ask('Разрешить уведомления?', 'Так ZERO сможет напомнить о событии заранее и в момент, когда отсчёт дойдёт до нуля. Никакие данные никуда не отправляются.', 'Разрешить', 'Не сейчас');
    if (ok) ntState = await NATIVE.notifAsk();
  }
  ntSync();
}

function ntFix() {
  if (!NATIVE) return;
  if (ntState === 'prompt' || ntState === 'prompt-with-rationale') {
    NATIVE.notifAsk().then(() => ntSync());
  } else NATIVE.openNotifSettings();
}

function renderBanner() {
  const b = $('banner');
  const show = !!NATIVE && ntState !== 'granted' && ntState !== 'unknown' && needsNotif();
  b.hidden = !show;
  if (show) b.innerHTML = ICON.bellOff + '<span><b>Уведомления выключены</b><br>Нажмите, чтобы включить — иначе напоминаний не будет</span>';
}

// Виджет: ближайшие наступления каждого события; виджет сам выберет нужное
function wgSync() {
  if (!NATIVE) return;
  const now = Date.now();
  const items = [];
  for (const e of S.events) {
    for (const o of (e.repeat ? occurrences(e, now, 3) : [baseDate(e)])) {
      items.push({ id: e.id, t: e.title, c: COLOR_HEX[e.color], at: o.getTime(), time: !!e.time, label: fmtDate(o, !!e.time) });
    }
  }
  items.sort((a, b) => a.at - b.at);
  NATIVE.widget({ sel: S.settings.widget, items: items.slice(0, 200) });
}
