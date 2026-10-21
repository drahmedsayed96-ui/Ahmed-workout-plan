package com.openai.workouttracker;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.webkit.JavascriptInterface;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setTextZoom(100);
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void startArabicCoach(String id, String name) {
                if (id == null || !id.matches("ex\\d{3}")) return;
                final String safeName = name == null ? "" : name.substring(0, Math.min(100, name.length()));
                runOnUiThread(() -> {
                    Intent intent = new Intent(MainActivity.this, CoachActivity.class);
                    intent.putExtra("exerciseId", id);
                    intent.putExtra("exerciseName", safeName);
                    startActivityForResult(intent, 200);
                });
            }
        }, "CoachBridge");
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 200 && resultCode == RESULT_OK && data != null && webView != null) {
            try {
                org.json.JSONObject result = new org.json.JSONObject();
                result.put("exerciseId", data.getStringExtra("exerciseId"));
                result.put("reps", data.getIntExtra("reps", 0));
                result.put("mode", data.getStringExtra("mode"));
                webView.evaluateJavascript("window.onArabicCoachResult && window.onArabicCoachResult(" + result.toString() + ")", null);
            } catch (org.json.JSONException ignored) { }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
