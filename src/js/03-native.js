// APP_NATIVE — всё, что умеет телефон. В браузере его нет, приложение работает и так.
// Тесты подставляют свой window.APP_NATIVE заранее.
let NATIVE = window.APP_NATIVE || null;
const nativeWaiters = [];
function onNative(fn) { if (NATIVE) fn(NATIVE); else nativeWaiters.push(fn); }

function buildNative(C) {
  const LN = C.LocalNotifications, Z = C.Zero, A = C.App;
  return {
    async notifPerm() { return (await LN.checkPermissions()).display; },
    async notifAsk() { return (await LN.requestPermissions()).display; },
    async exactOk() {
      try { return (await LN.checkExactNotificationSetting()).exact_alarm === 'granted'; } catch (e) { return true; }
    },
    async channels() {
      await LN.createChannel({ id: 'remind', name: 'Напоминания заранее', description: 'За какое-то время до события', importance: 4, visibility: 1, vibration: true });
      await LN.createChannel({ id: 'moment', name: 'Наступление события', description: 'Когда отсчёт дошёл до нуля', importance: 5, visibility: 1, vibration: true });
    },
    async pending() { return ((await LN.getPending()).notifications || []).map((n) => n.id); },
    async cancel(ids) { if (ids.length) await LN.cancel({ notifications: ids.map((id) => ({ id })) }); },
    async schedule(list) { if (list.length) await LN.schedule({ notifications: list }); },
    onNotifTap(fn) { LN.addListener('localNotificationActionPerformed', (a) => fn(a && a.notification && a.notification.extra)); },
    setBars(light, color) { return Z.setBars({ light, color }).catch(() => {}); },
    widget(items) { return Z.widget({ data: JSON.stringify(items) }).catch(() => {}); },
    openNotifSettings() { return Z.openNotifSettings().catch(() => {}); },
    async sysDark() { try { return (await Z.sysTheme()).dark; } catch (e) { return null; } },
    onSysTheme(fn) { Z.addListener('sysTheme', (d) => fn(!!d.dark)); },
    onInsets(fn) { Z.addListener('insets', fn); Z.insets().then(fn).catch(() => {}); },
    onBack(fn) { A.addListener('backButton', fn); },
    onResume(fn) { A.addListener('resume', fn); },
    minimize() { return A.minimizeApp().catch(() => {}); }
  };
}

function nativeReady() {
  if (NATIVE) return;
  const C = window.CAP;
  if (!C || !C.native) return;
  NATIVE = window.APP_NATIVE = buildNative(C);
  nativeWaiters.splice(0).forEach((fn) => { try { fn(NATIVE); } catch (e) { console.error(e); } });
}
if (window.CAP) setTimeout(nativeReady, 0); else addEventListener('cap-ready', nativeReady);
