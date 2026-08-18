package com.geniex.demo

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import com.geniex.sdk.GenieXSdk
import org.json.JSONObject

class MainActivity : Activity() {
    companion object { private const val REQ_IMAGE = 9001 }

    private lateinit var webView: WebView
    private lateinit var controller: GenieController
    private val handler = Handler(Looper.getMainLooper())
    private var initError: String? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = 0xFF07090E.toInt()
        window.navigationBarColor = 0xFF07090E.toInt()
        val layoutParams = window.attributes
        layoutParams.preferredRefreshRate = 120f
        window.attributes = layoutParams

        GenieXSdk.getInstance().init(this, object : GenieXSdk.InitCallback {
            override fun onSuccess() = Unit
            override fun onFailure(reason: String) { initError = reason }
        })

        webView = WebView(this).apply {
            setBackgroundColor(0xFF07090E.toInt())
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = false
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.setSupportMultipleWindows(false)
            settings.mediaPlaybackRequiresUserGesture = true
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            }
            addJavascriptInterface(Bridge(), "Native")
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url?.toString().orEmpty()
                    return !url.startsWith("file:///android_asset/www/")
                }
            }
            loadUrl("file:///android_asset/www/index.html")
        }
        controller = GenieController(this, initError, ::emit)
        setContentView(webView)
    }

    private inner class Bridge {
        @JavascriptInterface fun bootstrap() { controller.bootstrap() }
        @JavascriptInterface fun downloadModel(id:String) { controller.downloadAndLoad(id) }
        @JavascriptInterface fun loadModel(id:String) { controller.loadModel(id) }
        @JavascriptInterface fun clearImage() { controller.clearImage() }
        @JavascriptInterface fun send(text:String,useImage:Boolean,fastVision:Boolean,maxTokens:Int) {
            controller.send(text,useImage,fastVision,maxTokens)
        }
        @JavascriptInterface fun stop() { controller.stop() }
        @JavascriptInterface fun clearChat() { controller.clearChat() }
        @JavascriptInterface fun setFastVision(enabled:Boolean) = Unit
        @JavascriptInterface fun pickImage() {
            runOnUiThread {
                val intent=Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE); type="image/*"
                }
                @Suppress("DEPRECATION")
                startActivityForResult(intent,REQ_IMAGE)
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode:Int,resultCode:Int,data:Intent?) {
        super.onActivityResult(requestCode,resultCode,data)
        if(requestCode==REQ_IMAGE && resultCode==RESULT_OK) data?.data?.let { controller.prepareImage(it) }
    }

    private fun emit(obj:JSONObject) {
        val payload=JSONObject.quote(obj.toString())
        handler.post {
            if(::webView.isInitialized) webView.evaluateJavascript("window.__GENIEX_EVENT && window.__GENIEX_EVENT($payload)",null)
        }
    }

    override fun onDestroy() {
        if(::controller.isInitialized) controller.close()
        if(::webView.isInitialized) {
            webView.removeJavascriptInterface("Native")
            webView.stopLoading(); webView.destroy()
        }
        super.onDestroy()
    }
}
