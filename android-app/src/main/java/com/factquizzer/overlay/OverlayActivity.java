package com.factquizzer.overlay;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageButton;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class OverlayActivity extends Activity {

    private WebView webView;
    private static final Pattern YT_PATTERN = Pattern.compile(
            "(?:youtu\\.be/|youtube\\.com/(?:embed/|v/|watch\\?v=|watch\\?.+&v=))([\\w-]{11})"
    );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Make window translucent & modern
        Window window = getWindow();
        window.setFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);

        setContentView(R.layout.activity_overlay);

        ImageButton btnClose = findViewById(R.id.btn_close);
        btnClose.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        View root = findViewById(R.id.overlay_root);
        root.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        View card = findViewById(R.id.overlay_card);
        card.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // Prevent clicks on card from closing dialog
            }
        });

        setupWebView();
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void setupWebView() {
        webView = findViewById(R.id.quiz_webview);
        webView.setBackgroundColor(Color.parseColor("#0F172A"));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        // Bridge to allow JS to close overlay
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void closeOverlay() {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        finish();
                    }
                });
            }
        }, "AndroidOverlay");

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
    }

    private void handleIntent(Intent intent) {
        if (intent == null) {
            loadDefaultUrl(null);
            return;
        }

        String rawUrl = null;

        // 1. Data URI (ReVanced VIEW intent)
        Uri data = intent.getData();
        if (data != null) {
            rawUrl = data.toString();
        }

        // 2. Extra Text (Share intent)
        if (rawUrl == null && intent.hasExtra(Intent.EXTRA_TEXT)) {
            rawUrl = intent.getStringExtra(Intent.EXTRA_TEXT);
        }

        String videoId = extractVideoId(rawUrl);
        loadDefaultUrl(videoId);
    }

    private String extractVideoId(String text) {
        if (text == null) return null;
        Matcher matcher = YT_PATTERN.matcher(text);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    private void loadDefaultUrl(String videoId) {
        String url = "file:///android_asset/index.html";
        if (videoId != null && !videoId.isEmpty()) {
            url += "?url=https://www.youtube.com/watch?v=" + videoId;
        }
        webView.loadUrl(url);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
