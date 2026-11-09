package app.zero.countdown;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.View;
import android.view.Window;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsAnimationCompat;
import androidx.core.view.WindowInsetsCompat;
import java.util.List;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Zero")
public class ZeroPlugin extends Plugin {
    private JSObject lastInsets = insetsObj(0, 0, 0);

    private static JSObject insetsObj(int top, int bottom, int kb) {
        JSObject o = new JSObject();
        o.put("top", top);
        o.put("bottom", bottom);
        o.put("keyboard", kb);
        return o;
    }

    private void pushInsets(View v, WindowInsetsCompat insets, String mode) {
        float d = v.getResources().getDisplayMetrics().density;
        Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
        Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
        int kb = Math.max(0, ime.bottom - bars.bottom);
        JSObject o = insetsObj(Math.round(bars.top / d), Math.round(bars.bottom / d), Math.round(kb / d));
        o.put("mode", mode);
        lastInsets = o;
        notifyListeners("insets", o);
    }

    @Override
    public void load() {
        getActivity().runOnUiThread(() -> {
            Window w = getActivity().getWindow();
            WindowCompat.setDecorFitsSystemWindows(w, false);
            w.setStatusBarColor(Color.TRANSPARENT);
            w.setNavigationBarColor(Color.TRANSPARENT);
            if (Build.VERSION.SDK_INT >= 29) {
                w.setNavigationBarContrastEnforced(false);
                w.setStatusBarContrastEnforced(false);
            }
            View web = getBridge().getWebView();
            web.setOverScrollMode(View.OVER_SCROLL_NEVER);
            web.setVerticalScrollBarEnabled(false);
            final boolean[] animating = { false };
            ViewCompat.setOnApplyWindowInsetsListener(web, (v, insets) -> {
                if (!animating[0]) pushInsets(v, insets, "set");
                return insets;
            });
            // Клавиатура: высота на каждом кадре её анимации — лист едет вместе с ней
            ViewCompat.setWindowInsetsAnimationCallback(web, new WindowInsetsAnimationCompat.Callback(WindowInsetsAnimationCompat.Callback.DISPATCH_MODE_CONTINUE_ON_SUBTREE) {
                @Override
                public void onPrepare(WindowInsetsAnimationCompat animation) {
                    if ((animation.getTypeMask() & WindowInsetsCompat.Type.ime()) != 0) animating[0] = true;
                }

                @Override
                public WindowInsetsCompat onProgress(WindowInsetsCompat insets, List<WindowInsetsAnimationCompat> running) {
                    if (animating[0]) pushInsets(web, insets, "live");
                    return insets;
                }

                @Override
                public void onEnd(WindowInsetsAnimationCompat animation) {
                    if ((animation.getTypeMask() & WindowInsetsCompat.Type.ime()) == 0) return;
                    animating[0] = false;
                    WindowInsetsCompat now = ViewCompat.getRootWindowInsets(web);
                    if (now != null) pushInsets(web, now, "end");
                }
            });
            ViewCompat.requestApplyInsets(web);
        });
    }

    @PluginMethod
    public void insets(PluginCall call) {
        call.resolve(lastInsets);
    }

    @PluginMethod
    public void setBars(PluginCall call) {
        final boolean light = Boolean.TRUE.equals(call.getBoolean("light", false));
        final String color = call.getString("color", "#0E0F12");
        getActivity().runOnUiThread(() -> {
            Window w = getActivity().getWindow();
            WindowInsetsControllerCompat c = WindowCompat.getInsetsController(w, w.getDecorView());
            c.setAppearanceLightStatusBars(light);
            c.setAppearanceLightNavigationBars(light);
            try {
                int col = Color.parseColor(color);
                w.getDecorView().setBackgroundColor(col);
                getBridge().getWebView().setBackgroundColor(col);
            } catch (Exception ignored) {}
            call.resolve();
        });
    }

    @PluginMethod
    public void sysTheme(PluginCall call) {
        JSObject o = new JSObject();
        o.put("dark", isDark(getContext().getResources().getConfiguration()));
        call.resolve(o);
    }

    private static boolean isDark(Configuration c) {
        return (c.uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
    }

    private void sendTheme(Configuration c) {
        JSObject o = new JSObject();
        o.put("dark", isDark(c));
        notifyListeners("sysTheme", o);
    }

    @Override
    protected void handleOnConfigurationChanged(Configuration newConfig) {
        super.handleOnConfigurationChanged(newConfig);
        sendTheme(newConfig);
        ZeroWidget.updateAll(getContext());
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        sendTheme(getContext().getResources().getConfiguration());
    }

    // Данные для виджета: JSON со списком ближайших наступлений
    @PluginMethod
    public void widget(PluginCall call) {
        String data = call.getString("data", "{}");
        Context ctx = getContext();
        SharedPreferences p = ctx.getSharedPreferences(ZeroWidget.PREFS, Context.MODE_PRIVATE);
        p.edit().putString(ZeroWidget.KEY, data).apply();
        ZeroWidget.updateAll(ctx);
        call.resolve();
    }

    @PluginMethod
    public void openNotifSettings(PluginCall call) {
        Context ctx = getContext();
        Intent i;
        if (Build.VERSION.SDK_INT >= 26) {
            i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            i.putExtra(Settings.EXTRA_APP_PACKAGE, ctx.getPackageName());
        } else {
            i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + ctx.getPackageName()));
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            ctx.startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Не удалось открыть настройки: " + e.getMessage());
        }
    }
}
