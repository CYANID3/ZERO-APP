// Правка сгенерированного android/: свои Java-классы, ресурсы, манифест, версия. Можно запускать повторно.
import fs from 'node:fs';
import path from 'node:path';

const APP = 'android/app';
const MAIN = path.join(APP, 'src/main');
const PKG = 'app/zero/countdown';
if (!fs.existsSync(MAIN)) throw new Error('Нет android/ — сначала npx cap add android');

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dst, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

// 1. Java
copyDir('native/android/java', path.join(MAIN, 'java', PKG));

// 2. Ресурсы: свои + растровые иконки; картинки-заставки Capacitor убрать
const res = path.join(MAIN, 'res');
for (const d of fs.readdirSync(res)) {
  if (d.startsWith('drawable')) {
    const f = path.join(res, d, 'splash.png');
    if (fs.existsSync(f)) fs.unlinkSync(f);
    const dir = path.join(res, d);
    if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  }
}
copyDir('native/android/res', res);
if (fs.existsSync('build/res')) copyDir('build/res', res);

// 3. Стили: заставка Android 12+ — фон и значок, затем основная тема с фоном приложения
const stylesP = path.join(res, 'values/styles.xml');
let styles = fs.readFileSync(stylesP, 'utf8');
styles = styles.replace(/<style name="AppTheme\.NoActionBarLaunch"[\s\S]*?<\/style>/,
  `<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">@color/zero_icon_bg</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/ic_splash</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
    </style>`);
if (!/NoActionBar"[^>]*>\s*<item name="android:windowBackground"/.test(styles)) {
  styles = styles.replace(/(<style name="AppTheme\.NoActionBar"[^>]*>)/, `$1\n        <item name="android:windowBackground">@color/zero_icon_bg</item>`);
}
fs.writeFileSync(stylesP, styles);

// 4. Манифест
const manP = path.join(MAIN, 'AndroidManifest.xml');
let man = fs.readFileSync(manP, 'utf8');
const perms = [
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32" />',
  '<uses-permission android:name="android.permission.USE_EXACT_ALARM" />',
  '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />'
];
for (const p of perms) if (!man.includes(p)) man = man.replace('</manifest>', '    ' + p + '\n</manifest>');

const receivers = `
        <!-- zero:widgets -->
        <receiver android:name=".ZeroWidgetWide" android:label="@string/zero_widget_wide" android:exported="true">
            <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/zero_widget_wide_info" />
        </receiver>
        <receiver android:name=".ZeroWidgetSmall" android:label="@string/zero_widget_small" android:exported="true">
            <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/zero_widget_small_info" />
        </receiver>
        <receiver android:name=".ZeroWidgetTick" android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.TIME_SET" />
                <action android:name="android.intent.action.TIMEZONE_CHANGED" />
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>
`;
if (!man.includes('zero:widgets')) man = man.replace('</application>', receivers + '    </application>');
if (!man.includes('windowSoftInputMode')) man = man.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:windowSoftInputMode="adjustResize"');
fs.writeFileSync(manP, man);

// 5. Версия из CI
const gradleP = path.join(APP, 'build.gradle');
let gradle = fs.readFileSync(gradleP, 'utf8');
const code = parseInt(process.env.APP_VERSION_CODE || '1', 10);
const name = process.env.APP_VERSION || '1.0.' + code;
gradle = gradle.replace(/versionCode \d+/, 'versionCode ' + code).replace(/versionName "[^"]*"/, 'versionName "' + name + '"');
fs.writeFileSync(gradleP, gradle);

console.log('android patched:', name, code);
