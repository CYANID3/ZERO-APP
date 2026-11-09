package app.zero.countdown;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

public class ZeroWidgetWide extends AppWidgetProvider {
    @Override public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) { ZeroWidget.updateAll(ctx); }
    @Override public void onEnabled(Context ctx) { ZeroWidget.updateAll(ctx); }
    @Override public void onDisabled(Context ctx) { ZeroWidget.updateAll(ctx); }
}
