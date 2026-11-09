package app.zero.countdown;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

// Общая логика виджетов: выбрать событие, посчитать остаток, обновлять раз в минуту
public final class ZeroWidget {
    static final String PREFS = "zero_widget";
    static final String KEY = "data";
    private static final long DAY = 86400000L;

    private ZeroWidget() {}

    static String plural(long n, String one, String few, String many) {
        long a = n % 10, b = n % 100;
        if (a == 1 && b != 11) return one;
        if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
        return many;
    }

    private static int[] ids(Context ctx, Class<?> cls) {
        return AppWidgetManager.getInstance(ctx).getAppWidgetIds(new ComponentName(ctx, cls));
    }

    static void updateAll(Context ctx) {
        AppWidgetManager m = AppWidgetManager.getInstance(ctx);
        int[] wide = ids(ctx, ZeroWidgetWide.class);
        int[] small = ids(ctx, ZeroWidgetSmall.class);
        for (int id : wide) m.updateAppWidget(id, render(ctx, false));
        for (int id : small) m.updateAppWidget(id, render(ctx, true));
        if (wide.length + small.length > 0) scheduleTick(ctx); else cancelTick(ctx);
    }

    private static PendingIntent tickIntent(Context ctx) {
        Intent i = new Intent(ctx, ZeroWidgetTick.class);
        return PendingIntent.getBroadcast(ctx, 7001, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    // Следующая минута; RTC без пробуждения — пока экран выключен, телефон не будится
    private static void scheduleTick(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        long now = System.currentTimeMillis();
        long next = now - (now % 60000L) + 60000L + 200L;
        PendingIntent pi = tickIntent(ctx);
        try {
            if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) am.set(AlarmManager.RTC, next, pi);
            else am.setExact(AlarmManager.RTC, next, pi);
        } catch (SecurityException e) {
            am.set(AlarmManager.RTC, next, pi);
        }
    }

    private static void cancelTick(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(tickIntent(ctx));
    }

    private static JSONObject pick(Context ctx, long now) {
        try {
            String raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "{}");
            JSONObject o = new JSONObject(raw);
            JSONArray items = o.optJSONArray("items");
            if (items == null || items.length() == 0) return null;
            Object sel = o.opt("sel");
            long selId = (sel instanceof Number) ? ((Number) sel).longValue() : -1;
            for (int pass = 0; pass < 2; pass++) {
                JSONObject fut = null, past = null;
                for (int i = 0; i < items.length(); i++) {
                    JSONObject it = items.getJSONObject(i);
                    if (pass == 0 && selId > 0 && it.optLong("id") != selId) continue;
                    long at = it.optLong("at");
                    if (at > now) { if (fut == null || at < fut.optLong("at")) fut = it; }
                    else if (now - at < DAY) { if (past == null || at > past.optLong("at")) past = it; }
                }
                if (past != null) return past;   // только что наступило — показываем сутки
                if (fut != null) return fut;
                if (selId <= 0) break;
            }
        } catch (Exception ignored) {}
        return null;
    }

    static RemoteViews render(Context ctx, boolean small) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), small ? R.layout.zero_widget_small : R.layout.zero_widget_wide);
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        v.setOnClickPendingIntent(R.id.zw_root, PendingIntent.getActivity(ctx, 7002, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        long now = System.currentTimeMillis();
        JSONObject it = pick(ctx, now);
        if (it == null) {
            v.setTextViewText(R.id.zw_title, "ZERO");
            v.setTextViewText(R.id.zw_days, "—");
            v.setTextViewText(R.id.zw_word, "");
            v.setTextViewText(R.id.zw_sub, "Нет событий — нажмите, чтобы добавить");
            v.setViewVisibility(R.id.zw_hm, View.GONE);
            return v;
        }
        long at = it.optLong("at");
        boolean past = at <= now;
        long ms = Math.abs(at - now);
        long min = past ? ms / 60000L : (ms + 59999L) / 60000L; // до события округляем вверх
        long days = min / 1440, h = (min % 1440) / 60, m = min % 60;
        v.setTextViewText(R.id.zw_title, it.optString("t", "Событие"));
        try { v.setTextColor(R.id.zw_dot, Color.parseColor(it.optString("c", "#8AB4FF"))); } catch (Exception ignored) {}
        v.setTextViewText(R.id.zw_days, String.valueOf(days));
        v.setTextViewText(R.id.zw_word, plural(days, "день", "дня", "дней"));
        String hm = String.format(java.util.Locale.ROOT, "%02d:%02d", h, m);
        v.setViewVisibility(R.id.zw_hm, View.VISIBLE);
        v.setTextViewText(R.id.zw_hm, hm);
        String label = it.optString("label", "");
        v.setTextViewText(R.id.zw_sub, past ? "Наступило · прошло " + (days > 0 ? days + " д " : "") + hm : label);
        return v;
    }
}
