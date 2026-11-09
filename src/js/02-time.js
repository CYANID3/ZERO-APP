// Время события: когда наступает (с учётом ежегодного повтора) и сколько осталось
const DAY = 86400000;

function baseDate(e) {
  const [y, m, d] = e.date.split('-').map(Number);
  const [hh, mm] = (e.time || '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

// Даты наступления, начиная с первой, у которой ещё не прошли сутки после наступления
function occurrences(e, now, count) {
  const b = baseDate(e);
  if (!e.repeat) return [b];
  const out = [];
  for (let y = Math.max(b.getFullYear(), new Date(now).getFullYear() - 1); out.length < count && y < 10000; y++) {
    const o = new Date(y, b.getMonth(), b.getDate(), b.getHours(), b.getMinutes(), 0, 0);
    if (o < b) continue;
    if (o.getTime() > now - DAY) out.push(o);
  }
  return out;
}

// Текущая цель отсчёта
function target(e, now) { return occurrences(e, now, 1)[0] || baseDate(e); }

// Остаток: дни/часы/минуты/секунды
function left(t, now) {
  const diff = t.getTime() - now;
  let s = Math.floor(Math.abs(diff) / 1000);
  const days = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  return { past: diff <= 0, diff, days, h, m, s };
}

// Порядок в списке: только что наступившие (< суток) сверху, будущие по близости,
// давно прошедшие — внизу (или скрыты настройкой)
function sortedEvents(now) {
  const rows = S.events.map((e) => {
    const t = target(e, now);
    return { e, t, past: t.getTime() <= now, fresh: t.getTime() <= now && now - t.getTime() < DAY };
  });
  const fresh = rows.filter((r) => r.fresh).sort((a, b) => b.t - a.t);
  const fut = rows.filter((r) => !r.past).sort((a, b) => a.t - b.t);
  const past = S.settings.past === 'hide' ? [] : rows.filter((r) => r.past && !r.fresh).sort((a, b) => b.t - a.t);
  return { fresh, fut, past };
}
