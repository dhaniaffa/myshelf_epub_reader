package com.myshelf.app

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  private var mAppWebView: WebView? = null
  private var pendingContent: String? = null
  private lateinit var createDocLauncher: ActivityResultLauncher<Intent>

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    createDocLauncher = registerForActivityResult(
      ActivityResultContracts.StartActivityForResult()
    ) { result ->
      if (result.resultCode == Activity.RESULT_OK) {
        val uri: Uri? = result.data?.data
        if (uri != null && pendingContent != null) {
          try {
            contentResolver.openOutputStream(uri)?.use { stream ->
              stream.write(pendingContent!!.toByteArray(Charsets.UTF_8))
            }
            pendingContent = null
            mAppWebView?.post {
              mAppWebView?.evaluateJavascript(
                "window.__onAndroidSaveResult && window.__onAndroidSaveResult(true)",
                null
              )
            }
            return@registerForActivityResult
          } catch (e: Exception) {
            e.printStackTrace()
          }
        }
      }
      pendingContent = null
      mAppWebView?.post {
        mAppWebView?.evaluateJavascript(
          "window.__onAndroidSaveResult && window.__onAndroidSaveResult(false)",
          null
        )
      }
    }

    ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content)) { view, insets ->
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
      )
      view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      WindowInsetsCompat.CONSUMED
    }
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    mAppWebView = webView
    webView.overScrollMode = View.OVER_SCROLL_NEVER
    webView.addJavascriptInterface(AndroidBackupBridge(this), "AndroidBackupBridge")
  }

  fun launchCreateDocument(filename: String, content: String, mimeType: String) {
    pendingContent = content
    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = if (mimeType.isNotEmpty()) mimeType else "*/*"
      putExtra(Intent.EXTRA_TITLE, filename)
    }
    createDocLauncher.launch(intent)
  }
}

class AndroidBackupBridge(private val activity: MainActivity) {
  @JavascriptInterface
  fun saveFileWithPicker(filename: String, content: String, mimeType: String) {
    activity.runOnUiThread {
      activity.launchCreateDocument(filename, content, mimeType)
    }
  }

  @JavascriptInterface
  fun saveFile(filename: String, content: String, mimeType: String): Boolean {
    saveFileWithPicker(filename, content, mimeType)
    return true
  }
}
