// Запуск
load();
applyTheme();
paintIcons();
$('hdSet').innerHTML = ICON.gear;
$('hdAdd').innerHTML = ICON.plus;
document.querySelector('.i-plus').innerHTML = ICON.plus;
renderList();
tickLoop();

onNative((N) => {
  applyTheme();
  N.onBack(goBack);
  N.onResume(() => { renderList(); tickLoop(); ntSync(); });
  N.onNotifTap(() => renderList());
  N.channels().catch((e) => console.warn('channels', e && e.message)).then(ntSync);
});
