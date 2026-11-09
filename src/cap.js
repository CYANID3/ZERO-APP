// Мост к Capacitor: модуль собирается Vite, остальной код — классический скрипт.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';

const Zero = registerPlugin('Zero');
window.CAP = { native: Capacitor.isNativePlatform(), LocalNotifications, App, Zero };
window.dispatchEvent(new Event('cap-ready'));
