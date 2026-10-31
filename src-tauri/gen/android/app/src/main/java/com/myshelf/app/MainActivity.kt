package com.myshelf.app

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.documentfile.provider.DocumentFile

class MainActivity : TauriActivity() {
  private var mAppWebView: WebView? = null
  private var pendingContent: String? = null
  private lateinit var createDocLauncher: ActivityResultLauncher<Intent>
  private lateinit var openDocsLauncher: ActivityResultLauncher<Array<String>>
  private lateinit var openTreeLauncher: ActivityResultLauncher<Uri?>

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    openTreeLauncher = registerForActivityResult(
      ActivityResultContracts.OpenDocumentTree()
    ) { treeUri ->
      if (treeUri == null) {
        mAppWebView?.post {
          mAppWebView?.evaluateJavascript(
            "window.__onAndroidPickFolderResult && window.__onAndroidPickFolderResult([])",
            null
          )
        }
        return@registerForActivityResult
      }

      val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
      try {
        contentResolver.takePersistableUriPermission(treeUri, flags)
      } catch (_: Exception) {}

      Thread {
        val results = mutableListOf<String>()
        val rootDoc = DocumentFile.fromTreeUri(applicationContext, treeUri)
        if (rootDoc != null) {
          val queue = java.util.ArrayDeque<DocumentFile>()
          queue.add(rootDoc)
          while (!queue.isEmpty()) {
            val dir = queue.poll() ?: continue
            for (file in dir.listFiles()) {
              if (file.isDirectory) {
                val dName = file.name ?: ""
                if (!dName.startsWith(".") && dName != "node_modules") {
                  queue.add(file)
                }
              } else {
                val fName = file.name ?: ""
                val fNameLower = fName.lowercase()
                if (fNameLower.endsWith(".epub") || fNameLower.endsWith(".pdf")) {
                  val safeUri = file.uri.toString().replace("\"", "\\\"")
                  val safeName = fName.replace("\"", "\\\"")
                  val fSize = file.length()
                  results.add("{\"uri\":\"$safeUri\",\"name\":\"$safeName\",\"size\":$fSize}")
                }
              }
            }
          }
        }

        val jsonArray = "[" + results.joinToString(",") + "]"
        mAppWebView?.post {
          mAppWebView?.evaluateJavascript(
            "window.__onAndroidPickFolderResult && window.__onAndroidPickFolderResult($jsonArray)",
            null
          )
        }
      }.start()
    }

    openDocsLauncher = registerForActivityResult(
      ActivityResultContracts.OpenMultipleDocuments()
    ) { uris ->
      val results = mutableListOf<String>()
      if (uris != null) {
        val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        for (uri in uris) {
          try {
            contentResolver.takePersistableUriPermission(uri, flags)
          } catch (_: Exception) {}

          var name = "Unknown"
          var size = 0L
          try {
            contentResolver.query(uri, null, null, null, null)?.use { cursor ->
              val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
              val sizeIndex = cursor.getColumnIndex(android.provider.OpenableColumns.SIZE)
              if (cursor.moveToFirst()) {
                if (nameIndex != -1) name = cursor.getString(nameIndex) ?: name
                if (sizeIndex != -1) size = cursor.getLong(sizeIndex)
              }
            }
          } catch (_: Exception) {}

          val safeUri = uri.toString().replace("\"", "\\\"")
          val safeName = name.replace("\"", "\\\"")
          results.add("{\"uri\":\"$safeUri\",\"name\":\"$safeName\",\"size\":$size}")
        }
      }
      val jsonArray = "[" + results.joinToString(",") + "]"
      mAppWebView?.post {
        mAppWebView?.evaluateJavascript(
          "window.__onAndroidPickBooksResult && window.__onAndroidPickBooksResult($jsonArray)",
          null
        )
      }
    }

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

    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() {
        mAppWebView?.post {
          mAppWebView?.evaluateJavascript(
            "window.__handleAndroidBack ? window.__handleAndroidBack() : false",
            null
          )
        }
      }
    })
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

  fun launchOpenDocuments(types: Array<String>) {
    openDocsLauncher.launch(types)
  }

  fun launchOpenDocumentTree() {
    openTreeLauncher.launch(null)
  }
}

class AndroidBackupBridge(private val activity: MainActivity) {
  @JavascriptInterface
  fun pickFolder() {
    activity.runOnUiThread {
      activity.launchOpenDocumentTree()
    }
  }

  @JavascriptInterface
  fun pickBooks() {
    activity.runOnUiThread {
      activity.launchOpenDocuments(arrayOf("application/epub+zip", "application/pdf", "*/*"))
    }
  }

  @JavascriptInterface
  fun readBookBinaryBase64(uriString: String): String? {
    return try {
      val uri = Uri.parse(uriString)
      activity.contentResolver.openInputStream(uri)?.use { stream ->
        val bytes = stream.readBytes()
        android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
      }
    } catch (e: Exception) {
      e.printStackTrace()
      null
    }
  }

  @JavascriptInterface
  fun checkUriValid(uriString: String): Boolean {
    return try {
      val uri = Uri.parse(uriString)
      activity.contentResolver.openInputStream(uri)?.use {
        true
      } ?: false
    } catch (_: Exception) {
      false
    }
  }

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

  @JavascriptInterface
  fun exitApp() {
    activity.runOnUiThread {
      activity.finish()
    }
  }
}
