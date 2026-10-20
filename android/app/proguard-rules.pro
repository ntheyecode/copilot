# WorkCoPilot shell is a thin WebView over the hosted web app — no custom
# model classes cross a JS bridge, so default shrinking is safe. Keep the
# WebView JavaScript-interface surface in case a future bridge is added.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
