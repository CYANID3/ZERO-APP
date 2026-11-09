// Тема: тёмная / светлая / как в системе; строка состояния — цвета фона
let sysDark = null; // от телефона (WebView может не обновлять prefers-color-scheme)
const mqDark = matchMedia('(prefers-color-scheme: dark)');

function themeNow() {
  const t = S.settings.theme;
  if (t !== 'auto') return t;
  const dark = sysDark !== null ? sysDark : mqDark.matches;
  return dark ? 'dark' : 'light';
}

function applyTheme() {
  const t = themeNow();
  const root = document.documentElement;
  root.setAttribute('data-theme', t);
  const bg = t === 'light' ? '#F4F5F7' : '#0E0F12';
  root.style.background = bg;
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.setAttribute('content', bg);
  if (NATIVE) NATIVE.setBars(t === 'light', bg);
}

mqDark.addEventListener && mqDark.addEventListener('change', () => { if (S.settings.theme === 'auto') applyTheme(); });
onNative((N) => {
  N.sysDark().then((d) => { if (d !== null) { sysDark = d; applyTheme(); } });
  N.onSysTheme((d) => { sysDark = d; if (S.settings.theme === 'auto') applyTheme(); });
  N.onInsets((i) => {
    const r = document.documentElement.style;
    r.setProperty('--sat', (i.top || 0) + 'px');
    r.setProperty('--sab', (i.bottom || 0) + 'px');
    r.setProperty('--kb', (i.keyboard || 0) + 'px');
    // live — кадры анимации клавиатуры: без собственного перехода, иначе лист отстаёт
    document.documentElement.classList.toggle('kb-live', i.mode === 'live');
  });
});
