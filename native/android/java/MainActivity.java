package app.zero.countdown;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ZeroPlugin.class);
        super.onCreate(savedInstanceState);
    }

    // После блокировки экрана WebView иногда не перерисовывает кадр
    private void kick() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        final android.webkit.WebView w = getBridge().getWebView();
        w.invalidate();
        w.postDelayed(w::invalidate, 120);
    }

    @Override
    public void onResume() {
        super.onResume();
        kick();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) kick();
    }
}
