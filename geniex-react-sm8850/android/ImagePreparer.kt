package com.geniex.demo

import android.content.Context
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import android.util.Base64
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max
import kotlin.math.roundToInt

internal data class PreparedImage(
    val path: String,
    val preview: String,
    val name: String,
    val width: Int,
    val height: Int,
)

internal class ImagePreparer(private val context: Context) {
    fun prepare(uri: Uri): PreparedImage {
        val dir = File(context.cacheDir, "vision").apply { mkdirs() }
        val name = displayName(uri) ?: "image"
        val mime = context.contentResolver.getType(uri).orEmpty()
        val ext = when {
            mime.contains("png") -> "png"
            mime.contains("webp") -> "webp"
            else -> "jpg"
        }
        val source = File(dir, "src_${System.currentTimeMillis()}.$ext")
        context.contentResolver.openInputStream(uri).use { input ->
            requireNotNull(input) { "Cannot open image" }
            FileOutputStream(source).use { out -> input.copyTo(out, 256 * 1024) }
        }

        var originalLongest = 0
        val bitmap = ImageDecoder.decodeBitmap(ImageDecoder.createSource(source)) { decoder, info, _ ->
            decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
            val w = info.size.width
            val h = info.size.height
            originalLongest = max(w, h)
            if (originalLongest > 2048) {
                val scale = 2048f / originalLongest.toFloat()
                decoder.setTargetSize(max(1, (w * scale).roundToInt()), max(1, (h * scale).roundToInt()))
            }
        }

        val prepared = if (originalLongest > 2048) {
            val outFile = File(dir, "prepared_${System.currentTimeMillis()}.$ext")
            FileOutputStream(outFile).use { out ->
                val format = when (ext) {
                    "png" -> Bitmap.CompressFormat.PNG
                    "webp" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) Bitmap.CompressFormat.WEBP_LOSSLESS else Bitmap.CompressFormat.WEBP
                    else -> Bitmap.CompressFormat.JPEG
                }
                bitmap.compress(format, if (ext == "jpg") 94 else 100, out)
            }
            source.delete()
            outFile
        } else source

        val scale = minOf(1f, 360f / max(bitmap.width, bitmap.height).coerceAtLeast(1))
        val tw = max(1, (bitmap.width * scale).roundToInt())
        val th = max(1, (bitmap.height * scale).roundToInt())
        val thumb = if (tw == bitmap.width && th == bitmap.height) bitmap else Bitmap.createScaledBitmap(bitmap, tw, th, true)
        val bytes = ByteArrayOutputStream()
        thumb.compress(Bitmap.CompressFormat.JPEG, 76, bytes)
        val preview = "data:image/jpeg;base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP)
        if (thumb !== bitmap) thumb.recycle()
        val width = bitmap.width
        val height = bitmap.height
        bitmap.recycle()
        return PreparedImage(prepared.absolutePath, preview, name, width, height)
    }

    private fun displayName(uri: Uri): String? = runCatching {
        context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
            if (c.moveToFirst()) c.getString(0) else null
        }
    }.getOrNull()
}
