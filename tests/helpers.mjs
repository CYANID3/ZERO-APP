// Общий запуск приложения в эмуляции телефона (Pixel 7)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const ROOT = path.resolve('www');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
let server, port, browser;

async function start() {
  if (server) return;
  if (!fs.existsSync(path.join(ROOT, 'index.html'))) throw new Error('Сначала npm run build');
  server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = path.join(ROOT, u === '/' ? 'index.html' : u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
  const exe = process.env.CHROME_PATH || (fs.existsSync('/usr/bin/google-chrome') && !process.env.CI ? '/usr/bin/google-chrome' : undefined);
  browser = await chromium.launch({ executablePath: exe });
}

export async function stop() {
  if (browser) await browser.close();
  if (server) server.close();
  browser = server = null;
}

// Мок телефона: записывает вызовы, умеет «события» от натива
const NATIVE_MOCK = (perm) => {
  const calls = [];
  const L = {};
  let state = perm;
  let pending = [];
  window.__calls = calls;
  window.__emit = (ev, d) => (L[ev] || []).forEach((f) => f(d));
  window.__setPerm = (p) => { state = p; };
  window.__pending = () => pending;
  const on = (ev) => (fn) => { (L[ev] = L[ev] || []).push(fn); };
  window.APP_NATIVE = {
    notifPerm: async () => { calls.push(['notifPerm']); return state; },
    notifAsk: async () => { calls.push(['notifAsk']); state = 'granted'; return state; },
    exactOk: async () => true,
    channels: async () => { calls.push(['channels']); },
    pending: async () => pending.map((n) => n.id),
    cancel: async (ids) => { calls.push(['cancel', ids.length]); pending = pending.filter((n) => !ids.includes(n.id)); },
    schedule: async (list) => { calls.push(['schedule', list.length]); pending = pending.concat(JSON.parse(JSON.stringify(list))); },
    onNotifTap: on('tap'),
    setBars: (light, color) => { calls.push(['setBars', light, color]); },
    widget: (o) => { calls.push(['widget', o]); },
    openNotifSettings: () => { calls.push(['openNotifSettings']); },
    sysDark: async () => null,
    onSysTheme: on('sysTheme'),
    onInsets: on('insets'),
    onBack: on('back'),
    onResume: on('resume'),
    minimize: () => { calls.push(['minimize']); }
  };
};

export async function openApp({ data, scheme = 'dark', native = false, perm = 'granted', now } = {}) {
  await start();
  const ctx = await browser.newContext({ ...devices['Pixel 7'], colorScheme: scheme, locale: 'ru-RU', timezoneId: 'Asia/Bishkek' });
  if (now) await ctx.addInitScript(`(() => { const T = ${now}; const D = Date; const off = T - D.now();
    class FD extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + off); } static now() { return D.now() + off; } }
    window.Date = FD; })();`);
  if (data) await ctx.addInitScript(`localStorage.setItem('zero.v1', ${JSON.stringify(JSON.stringify(data))});`);
  if (native) await ctx.addInitScript(`(${NATIVE_MOCK})(${JSON.stringify(perm)});`);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => document.querySelector('#list') && typeof S !== 'undefined');
  return {
    page, errors,
    ev: (fn, arg) => page.evaluate(fn, arg),
    wait: (ms) => page.waitForTimeout(ms),
    close: () => ctx.close()
  };
}
