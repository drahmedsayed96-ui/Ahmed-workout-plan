package com.openai.workouttracker;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.speech.tts.TextToSpeech;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import android.webkit.JavascriptInterface;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    private TextToSpeech guideVoice;
    private boolean guideVoiceReady = false;
    private String queuedArabic = null;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        guideVoice = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS && guideVoice != null) {
                int r = guideVoice.setLanguage(Locale.forLanguageTag("ar-EG"));
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED)
                    r = guideVoice.setLanguage(new Locale("ar"));
                guideVoiceReady = r >= TextToSpeech.LANG_AVAILABLE;
                if (guideVoiceReady && queuedArabic != null) {
                    guideVoice.speak(queuedArabic, TextToSpeech.QUEUE_FLUSH, null, "onboarding");
                    queuedArabic = null;
                }
            }
        });
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
            @JavascriptInterface
            public void speakArabic(String words) {
                if (words == null || words.length() > 700) return;
                runOnUiThread(() -> {
                    if (guideVoiceReady && guideVoice != null)
                        guideVoice.speak(words, TextToSpeech.QUEUE_FLUSH, null, "setup-" + System.nanoTime());
                    else queuedArabic = words;
                });
            }

            @JavascriptInterface
            public void openExerciseVideo(String name) {
                if (name == null || name.trim().isEmpty() || name.length() > 120) return;
                runOnUiThread(() -> {
                    // Directs users to real exercise-instruction videos, not unlicensed bundled footage.
                    String q = name + " exercise technique Muscle and Strength";
                    String url = "https://www.youtube.com/results?search_query=" +
                        URLEncoder.encode(q, StandardCharsets.UTF_8);
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    try { startActivity(intent); }
                    catch (Exception ignored) { }
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
    protected void onDestroy() {
        if (guideVoice != null) { guideVoice.stop(); guideVoice.shutdown(); }
        if (webView != null) {
            webView.removeJavascriptInterface("CoachBridge");
            webView.destroy();
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
