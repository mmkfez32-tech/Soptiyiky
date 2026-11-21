package app.vibetune.music;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * VibeTune Music (Android). Membungkus Web App (folder www/ sebagai aset lokal) dalam WebView.
 * Aset dilayani lewat origin https virtual agar IndexedDB/localStorage (data akun, playlist,
 * unduhan offline) bekerja seperti di browser. Mendukung HTTP Range supaya seek audio berfungsi.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.vibetune.local";
    private static final String START = "https://" + HOST + "/index.html";
    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        web = new WebView(this);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setUserAgentString(s.getUserAgentString() + " VibeTuneAPK/1.0");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (!HOST.equals(u.getHost())) return null;
                return serve(u, r.getRequestHeaders());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                if (HOST.equals(r.getUrl().getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, r.getUrl())); } catch (Exception ignored) { }
                return true;
            }
        });
        if (b != null) web.restoreState(b); else web.loadUrl(START);
    }

    private WebResourceResponse serve(Uri u, Map<String, String> headers) {
        String path = u.getPath();
        if (path == null || path.equals("/")) path = "/index.html";
        path = path.substring(1);
        if (path.contains("..")) return notFound();
        try {
            InputStream in = getAssets().open(path);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            in.close();
            byte[] data = out.toByteArray();
            String ext = MimeTypeMap.getFileExtensionFromUrl(path);
            String mime = mime(ext);
            Map<String, String> h = new HashMap<>();
            h.put("Accept-Ranges", "bytes");
            h.put("Access-Control-Allow-Origin", "*");
            String range = null;
            for (Map.Entry<String, String> e : headers.entrySet())
                if ("range".equalsIgnoreCase(e.getKey())) range = e.getValue();
            if (range != null && range.startsWith("bytes=")) {
                String[] p = range.substring(6).split("-", 2);
                int start = p[0].isEmpty() ? 0 : Integer.parseInt(p[0]);
                int end = (p.length > 1 && !p[1].isEmpty()) ? Integer.parseInt(p[1]) : data.length - 1;
                end = Math.min(end, data.length - 1);
                if (start > end) start = 0;
                byte[] part = new byte[end - start + 1];
                System.arraycopy(data, start, part, 0, part.length);
                h.put("Content-Range", "bytes " + start + "-" + end + "/" + data.length);
                h.put("Content-Length", String.valueOf(part.length));
                return new WebResourceResponse(mime, null, 206, "Partial Content", h, new ByteArrayInputStream(part));
            }
            h.put("Content-Length", String.valueOf(data.length));
            return new WebResourceResponse(mime, null, 200, "OK", h, new ByteArrayInputStream(data));
        } catch (Exception e) {
            return notFound();
        }
    }

    private static String mime(String ext) {
        switch (ext == null ? "" : ext.toLowerCase()) {
            case "html": return "text/html";
            case "js": return "application/javascript";
            case "css": return "text/css";
            case "json": return "application/json";
            case "webmanifest": return "application/manifest+json";
            case "png": return "image/png";
            case "mp3": return "audio/mpeg";
            case "wav": return "audio/wav";
            default:
                String m = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
                return m != null ? m : "application/octet-stream";
        }
    }

    private WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<String, String>(),
                new ByteArrayInputStream("404".getBytes()));
    }

    @Override
    public void onBackPressed() {
        String url = web.getUrl();
        if (web.canGoBack() && url != null && !url.endsWith("#/home") && !url.endsWith("#/login")) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }

    @Override
    protected void onDestroy() { if (web != null) web.destroy(); super.onDestroy(); }
}
