package app.zero.countdown;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

// Раз в минуту (и после включения телефона/смены времени) обновляет виджеты
public class ZeroWidgetTick extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        ZeroWidget.updateAll(ctx);
    }
}
