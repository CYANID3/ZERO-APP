// Данные: S в памяти → localStorage (+ копия). Всё, что читается, проверяется.
const KEY = 'zero.v1';
const COLORS = ['orange', 'pink', 'teal', 'blue', 'violet', 'yellow'];
const COLOR_NAMES = { orange: 'Оранжевый', pink: 'Розовый', teal: 'Бирюзовый', blue: 'Голубой', violet: 'Фиолетовый', yellow: 'Жёлтый' };
const COLOR_HEX = { orange: '#F2A65A', pink: '#E879A6', teal: '#5CC8B0', blue: '#8AB4FF', violet: '#B79CFF', yellow: '#E8D45C' };
const MAX_REM = 12;

const DEF_SETTINGS = {
  view: 'cards',          // cards | tiles
  theme: 'dark',          // dark | light | auto
  seconds: true,
  past: 'bottom',         // bottom | hide
  defReminders: [1440, 60, 10],
  defMoment: true,
  widget: 'auto'          // auto | id события
};

let S = { v: 1, nextId: 1, events: [], settings: { ...DEF_SETTINGS } };

const okDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00').getTime());
const okTime = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

function cleanRem(a) {
  if (!Array.isArray(a)) return [];
  const out = [...new Set(a.map(Number).filter((n) => Number.isInteger(n) && n > 0 && n <= 525600))];
  return out.sort((x, y) => y - x).slice(0, MAX_REM);
}

function cleanEvent(e) {
  if (!e || typeof e !== 'object') return null;
  const id = Number(e.id);
  if (!Number.isInteger(id) || id < 1 || id > 2000000) return null;
  if (!okDate(e.date)) return null;
  return {
    id,
    title: String(e.title ?? '').slice(0, 80).trim() || 'Событие',
    date: e.date,
    time: okTime(e.time) ? e.time : null,
    repeat: e.repeat === true,
    color: COLORS.includes(e.color) ? e.color : 'blue',
    reminders: cleanRem(e.reminders),
    moment: e.moment !== false,
    created: Number.isFinite(e.created) ? e.created : Date.now()
  };
}

function cleanSettings(s) {
  const d = { ...DEF_SETTINGS };
  if (!s || typeof s !== 'object') return d;
  if (['cards', 'tiles'].includes(s.view)) d.view = s.view;
  if (['dark', 'light', 'auto'].includes(s.theme)) d.theme = s.theme;
  if (typeof s.seconds === 'boolean') d.seconds = s.seconds;
  if (['bottom', 'hide'].includes(s.past)) d.past = s.past;
  if (Array.isArray(s.defReminders)) d.defReminders = cleanRem(s.defReminders);
  if (typeof s.defMoment === 'boolean') d.defMoment = s.defMoment;
  if (s.widget === 'auto' || (Number.isInteger(s.widget) && s.widget > 0)) d.widget = s.widget;
  return d;
}

function adopt(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const events = (Array.isArray(o.events) ? o.events : []).map(cleanEvent).filter(Boolean);
  const ids = new Set();
  const uniq = events.filter((e) => !ids.has(e.id) && ids.add(e.id));
  const maxId = uniq.reduce((m, e) => Math.max(m, e.id), 0);
  const settings = cleanSettings(o.settings);
  if (settings.widget !== 'auto' && !ids.has(settings.widget)) settings.widget = 'auto';
  return { v: 1, nextId: Math.max(Number.isInteger(o.nextId) ? o.nextId : 1, maxId + 1), events: uniq, settings };
}

function load() {
  for (const k of [KEY, KEY + '.bak']) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) { S = adopt(JSON.parse(raw)); return; }
    } catch (e) { console.warn('load', k, e && e.message); }
  }
  S = adopt({});
}

let saveT = 0;
function save(now) {
  clearTimeout(saveT);
  const go = () => {
    try {
      const prev = localStorage.getItem(KEY);
      if (prev) localStorage.setItem(KEY + '.bak', prev);
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) { console.warn('save', e && e.message); }
  };
  if (now) go(); else saveT = setTimeout(go, 150);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
addEventListener('pagehide', () => save(true));

const evById = (id) => S.events.find((e) => e.id === id);
