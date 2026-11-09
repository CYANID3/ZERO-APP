'use strict';
// Общие мелочи: экранирование, числа, склонения, даты
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p2 = (n) => String(n).padStart(2, '0');
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

function plural(n, one, few, many) {
  const a = Math.abs(n) % 10, b = Math.abs(n) % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}
const wDays = (n) => plural(n, 'день', 'дня', 'дней');

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_S = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

// "12 ноября 2026, 10:00" (год — только если не текущий, или если full)
function fmtDate(d, withTime, full) {
  const y = d.getFullYear() !== new Date().getFullYear() || full ? ' ' + d.getFullYear() : '';
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + y + (withTime ? ', ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) : '');
}
function fmtShort(d) { return d.getDate() + ' ' + MONTHS_S[d.getMonth()]; }

// Интервал напоминания в минутах → «за 1 час»
function fmtOffset(min, short) {
  const u = [[10080, 'нед', 'неделю', 'недели', 'недель'], [1440, 'д', 'день', 'дня', 'дней'], [60, 'ч', 'час', 'часа', 'часов'], [1, 'мин', 'минуту', 'минуты', 'минут']];
  for (const [k, s, a, b, c] of u) {
    if (min % k === 0 && min >= k) {
      const n = min / k;
      return short ? n + ' ' + s : 'за ' + n + ' ' + plural(n, a, b, c);
    }
  }
  return short ? min + ' мин' : 'за ' + min + ' мин';
}

// «через 1 час» для текста уведомления
function fmtIn(min) { return fmtOffset(min).replace(/^за /, 'через '); }

const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const isoDate = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
