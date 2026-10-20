package com.admireveda.workcopilot

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

// WorkCoPilot Android shell: a thin WebView over the hosted WorkCoPilot console
// (the same responsive web app at admireveda.com/work, with the "Photo" camera
// capture). The native shell only adds what the web cannot do on its own:
// camera permission for live watch, a camera/file chooser for Photo capture,
// cookie persistence, and in-app back navigation. This is the reusable template
// for the future field-work products (plumbers, solar, mechanics): swap START_URL
// and the branding, keep everything else.
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooser = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val cb = filePathCallback
        filePathCallback = null
        cb?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data) ?: arrayOf())
    }

    private val requestCamera = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* result handled lazily by the web layer on next capture */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestCamera.launch(Manifest.permission.CAMERA)
        }

        webView = WebView(this)
        setContentView(webView)

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false   // let the camera stream start without a tap
            allowFileAccess = true
            cacheMode = WebSettings.LOAD_DEFAULT
            // Honor the page's width=device-width viewport so the responsive /work
            // console scales correctly on phones, phone-pads, and Android tablets
            // (any screen size / density), fitting the whole width on first paint.
            useWideViewPort = true
            loadWithOverviewMode = true
            userAgentString = "$userAgentString WorkCoPilotAndroid/1.0"
        }

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                // Keep WorkCoPilot navigation inside the app; send anything else to the browser.
                return if (url.startsWith(ORIGIN)) {
                    false
                } else {
                    try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: Exception) { }
                    true
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                // Grant camera/mic only to the trusted WorkCoPilot origin (for live watch).
                runOnUiThread {
                    if (request.origin?.toString()?.startsWith(ORIGIN) == true) request.grant(request.resources)
                    else request.deny()
                }
            }

            override fun onShowFileChooser(
                view: WebView?,
                callback: ValueCallback<Array<Uri>>?,
                params: FileChooserParams?
            ): Boolean {
                // Powers the "Photo" capture: <input type=file accept=image/* capture=environment>
                // opens the device camera (or gallery) and hands the shot back to the page.
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                val intent = params?.createIntent()
                if (intent == null) {
                    filePathCallback = null
                    return false
                }
                return try {
                    fileChooser.launch(intent)
                    true
                } catch (_: Exception) {
                    filePathCallback = null
                    false
                }
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        if (savedInstanceState == null) webView.loadUrl(START_URL) else webView.restoreState(savedInstanceState)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    companion object {
        private const val ORIGIN = "https://admireveda.com"
        private const val START_URL = "$ORIGIN/work"
    }
}
