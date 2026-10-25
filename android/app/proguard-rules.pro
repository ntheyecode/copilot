# =============================================================================
# WorkCoPilot Android shell - R8 / ProGuard keep rules (RELEASE builds only)
# =============================================================================
# The shell is a thin WebView (MainActivity) over the hosted console at
# https://admireveda.com/work. On release builds R8 minifies, name-mangles
# (obfuscates), and tree-shakes the native Kotlin/Android layer for IP
# protection. The rules below are the MINIMAL set required for the app to keep
# running after obfuscation. Everything NOT named here is free to be renamed
# and shrunk - that is the point.
#
# Obfuscation is ON: this file does NOT contain -dontobfuscate, and the
# release buildType sets minifyEnabled true.
#
# ALREADY HANDLED AUTOMATICALLY (deliberately NOT repeated below, to stay
# minimal and let R8 obfuscate as much as possible):
#   * MainActivity - referenced from AndroidManifest.xml. The Android Gradle
#     Plugin generates keep rules (aapt_rules.txt) for every manifest-declared
#     component, so the activity entry point and its no-arg constructor are
#     preserved without an explicit rule here.
#   * AndroidX (appcompat, core-ktx, activity-ktx) - each AAR ships its own
#     consumer ProGuard rules, which R8 applies automatically. We do not
#     re-declare framework / AndroidX keeps.
#   * android.webkit.WebView / WebViewClient / WebChromeClient and the
#     AndroidX ActivityResult APIs are framework/library classes (never
#     stripped). Our overridden callbacks (shouldOverrideUrlLoading,
#     onPermissionRequest, onShowFileChooser, handleOnBackPressed) live in
#     anonymous subclasses that R8 keeps because their kept supertypes
#     reference them virtually.

# -----------------------------------------------------------------------------
# 1. WebView JavaScript bridge  (THE #1 way WebView apps break under R8)
# -----------------------------------------------------------------------------
# Any method annotated @android.webkit.JavascriptInterface is called by NAME
# from JavaScript (via WebView.addJavascriptInterface). R8 cannot see that
# cross-language call, so without this rule it would rename those methods and
# the JS -> native bridge would silently break. The shell has NO bridge today
# (MainActivity never calls addJavascriptInterface), but this is the standard
# defensive keep so that adding a bridge later cannot be broken by obfuscation.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# -----------------------------------------------------------------------------
# 2. Readable crash reports from obfuscated release builds
# -----------------------------------------------------------------------------
# Keep source-file and line-number attributes so crash tools (Play Console,
# etc.) can symbolicate stack traces, while hiding the real source file name.
# Class and method NAMES are still obfuscated; de-obfuscation uses the mapping
# file R8 emits at:
#     android/app/build/outputs/mapping/release/mapping.txt
# KEEP mapping.txt PRIVATE. It reverses the obfuscation, so it must never be
# bundled in the APK/AAB - archive it per release, out of source control, for
# crash de-obfuscation only.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
