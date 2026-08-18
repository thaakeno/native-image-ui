package com.geniex.demo

import android.app.Activity
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.view.WindowManager
import com.geniex.sdk.LlmWrapper
import com.geniex.sdk.ModelManagerWrapper
import com.geniex.sdk.VlmWrapper
import com.geniex.sdk.bean.ChatMessage
import com.geniex.sdk.bean.ComputeUnitValue
import com.geniex.sdk.bean.GenerationConfig
import com.geniex.sdk.bean.LlmCreateInput
import com.geniex.sdk.bean.LlmStreamResult
import com.geniex.sdk.bean.ModelConfig
import com.geniex.sdk.bean.ModelPullInput
import com.geniex.sdk.bean.ModelType
import com.geniex.sdk.bean.ProfilingData
import com.geniex.sdk.bean.VlmChatMessage
import com.geniex.sdk.bean.VlmContent
import com.geniex.sdk.bean.VlmCreateInput
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.max

internal class GenieController(
    private val activity: Activity,
    private val initError: String?,
    private val emit: (JSONObject) -> Unit,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val preparer = ImagePreparer(activity)
    private val generating = AtomicBoolean(false)
    private var loadedModelId = ""
    private var vlm: VlmWrapper? = null
    private var llm: LlmWrapper? = null
    private val vlmHistory = arrayListOf<VlmChatMessage>()
    private val llmHistory = arrayListOf<ChatMessage>()
    @Volatile private var selectedImagePath: String? = null

    private val tokenLock = Any()
    private val tokenBuffer = StringBuilder()
    @Volatile private var flushPending = false

    fun bootstrap() = scope.launch { bootstrapInternal() }
    fun downloadAndLoad(id: String) = scope.launch { downloadAndLoadInternal(id) }
    fun loadModel(id: String) = scope.launch { loadModelInternal(id) }
    fun send(text: String, useImage: Boolean, fastVision: Boolean, maxTokens: Int) = scope.launch {
        sendInternal(text, useImage, fastVision, maxTokens)
    }
    fun stop() = scope.launch { vlm?.stopStream(); llm?.stopStream() }
    fun clearImage() { selectedImagePath = null }
    fun prepareImage(uri: Uri) = scope.launch {
        emitState(loadedModelId, "preparing", "Preparing image before inference…", true, loadedModelId.isNotBlank())
        runCatching { preparer.prepare(uri) }
            .onSuccess { img ->
                selectedImagePath = img.path
                emit(JSONObject().put("type", "image").put("preview", img.preview).put("name", img.name)
                    .put("width", img.width).put("height", img.height))
                emitState(loadedModelId, "ready", "Image ready", true, loadedModelId.isNotBlank())
            }
            .onFailure { error("Couldn't prepare image: ${it.message ?: it}") }
    }
    fun clearChat() = scope.launch {
        vlm?.reset(); llm?.reset(); vlmHistory.clear(); llmHistory.clear(); selectedImagePath = null
        emit(JSONObject().put("type", "cleared"))
    }

    private suspend fun bootstrapInternal() {
        val models = JSONArray()
        for (spec in MODEL_CATALOG) {
            val installed = runCatching { ModelManagerWrapper.getPaths(spec.modelName) != null }.getOrDefault(false)
            models.put(JSONObject().put("id", spec.id).put("name", spec.name).put("shortName", spec.shortName)
                .put("backend", spec.backend).put("quant", spec.quant).put("params", spec.params)
                .put("description", spec.description).put("recommended", spec.recommended).put("installed", installed))
        }
        val detected = runCatching { ModelManagerWrapper.detectChipset(true) }.getOrNull()
        val soc = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) Build.SOC_MODEL else Build.HARDWARE
        val device = JSONObject().put("model", Build.MODEL).put("manufacturer", Build.MANUFACTURER)
            .put("chipset", detected ?: soc ?: TARGET_CHIPSET).put("targetChipset", TARGET_CHIPSET)
            .put("hexagon", "v81").put("android", Build.VERSION.RELEASE)
        emit(JSONObject().put("type", "bootstrap").put("device", device).put("models", models)
            .put("defaultModel", DEFAULT_MODEL_ID).put("loadedModel", loadedModelId)
            .put("message", if (initError == null) "Ready" else "GenieX init warning"))

        val preferred = MODEL_CATALOG.first { it.id == DEFAULT_MODEL_ID }
        if (loadedModelId.isBlank() && ModelManagerWrapper.getPaths(preferred.modelName) != null) loadModelInternal(DEFAULT_MODEL_ID)
        initError?.let { error(it) }
    }

    private suspend fun downloadAndLoadInternal(id: String) {
        val spec = MODEL_CATALOG.firstOrNull { it.id == id } ?: return error("Unknown model")
        if (ModelManagerWrapper.getPaths(spec.modelName) != null) return loadModelInternal(id)
        emitState(id, "downloading", "Downloading ${spec.shortName}…", false, false)
        val input = ModelPullInput(
            model_name = spec.modelName,
            precision = if (spec.backend == "GGUF") spec.quant else null,
            hub = spec.hub,
            chipset = if (spec.backend == "QAIRT") TARGET_CHIPSET else null,
            model_type = spec.type,
        )
        try {
            withWakeLock("download", 30 * 60_000L) {
                ModelManagerWrapper.pullFlow(input).collect { event ->
                    when (event) {
                        is ModelManagerWrapper.PullEvent.Progress -> {
                            val total = event.files.sumOf { if (it.total_bytes > 0) it.total_bytes else 0L }
                            val done = event.files.sumOf { max(0L, it.downloaded_bytes) }
                            val percent = if (total > 0) ((done * 100) / total).toInt().coerceIn(0,100) else 0
                            emit(JSONObject().put("type", "download").put("modelId", id).put("percent", percent)
                                .put("downloaded", done).put("total", total))
                        }
                        ModelManagerWrapper.PullEvent.Completed -> emit(JSONObject().put("type", "download")
                            .put("modelId", id).put("percent", 100).put("done", true))
                        is ModelManagerWrapper.PullEvent.Error -> throw IllegalStateException("Model download failed (${event.code}): ${event.message}")
                    }
                }
            }
        } catch (t: Throwable) {
            emit(JSONObject().put("type", "download").put("modelId", id).put("error", true))
            return error(t.message ?: "Model download failed")
        }
        if (ModelManagerWrapper.getPaths(spec.modelName) != null) loadModelInternal(id)
    }

    private suspend fun loadModelInternal(id: String) {
        if (generating.get()) return error("Stop generation before switching models")
        val spec = MODEL_CATALOG.firstOrNull { it.id == id } ?: return error("Unknown model")
        val paths = ModelManagerWrapper.getPaths(spec.modelName) ?: return error("Download ${spec.shortName} first")
        emitState(id, "loading", "Loading ${spec.shortName}…", true, false)
        unload()

        val runtime = paths.runtime_id.ifBlank { spec.runtimeId }
        val qairt = runtime == "qairt"
        val config = if (qairt) {
            ModelConfig(nCtx=0,nThreads=8,nThreadsBatch=8,nBatch=2048,nUBatch=512,nSeqMax=1,nGpuLayers=0)
        } else {
            ModelConfig(nCtx=4096,nThreads=8,nThreadsBatch=8,nBatch=2048,nUBatch=512,nSeqMax=1,nGpuLayers=-1)
        }
        val compute = if (qairt) null else ComputeUnitValue.HYBRID.value
        val build = if (spec.type == ModelType.VLM) {
            VlmWrapper.builder().vlmCreateInput(VlmCreateInput(paths.model_path, paths.mmproj_path, config, runtime, compute))
                .build().map { vlm = it }
        } else {
            LlmWrapper.builder().llmCreateInput(LlmCreateInput(paths.model_path, paths.tokenizer_path, config, runtime, compute))
                .build().map { llm = it }
        }
        build.onFailure { return error("Model load failed: ${it.message ?: it}") }
        loadedModelId = id
        vlmHistory.clear(); llmHistory.clear()
        emitState(id, "ready", "${spec.shortName} ready on ${if(qairt) "Hexagon NPU" else "GenieX hybrid"}", true, true)
    }

    private suspend fun sendInternal(text: String, useImage: Boolean, fastVision: Boolean, maxTokens: Int) {
        if (!generating.compareAndSet(false,true)) return
        val spec = MODEL_CATALOG.firstOrNull { it.id == loadedModelId }
        if (spec == null) { generating.set(false); return error("Load a model first") }
        val imagePath = if (useImage) selectedImagePath else null
        if (useImage && imagePath == null) { generating.set(false); return error("Image isn't ready yet") }
        if (useImage && spec.type != ModelType.VLM) { generating.set(false); return error("${spec.shortName} is text-only") }

        activity.runOnUiThread { activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
        emit(JSONObject().put("type", "generationStart"))
        val answer = StringBuilder()
        val maxOut = maxTokens.coerceIn(32,2048)
        try {
            if (spec.type == ModelType.VLM) {
                val wrapper = vlm ?: throw IllegalStateException("VLM is not loaded")
                if (useImage && fastVision) { wrapper.reset(); vlmHistory.clear() }
                val contents = arrayListOf<VlmContent>()
                if (imagePath != null) contents.add(VlmContent("image", imagePath))
                contents.add(VlmContent("text", text))
                val user = VlmChatMessage("user", contents)
                vlmHistory.add(user)
                val prompt = wrapper.applyChatTemplate(vlmHistory.toTypedArray(), null, false).getOrThrow().formattedText
                val config = wrapper.injectMediaPathsToConfig(arrayOf(user), GenerationConfig(maxTokens=maxOut))
                wrapper.generateStreamFlow(prompt, config).collect { result -> handleStreamResult(result, answer, true) }
            } else {
                val wrapper = llm ?: throw IllegalStateException("LLM is not loaded")
                val user = ChatMessage("user", text)
                llmHistory.add(user)
                val prompt = wrapper.applyChatTemplate(llmHistory.toTypedArray(), null, false).getOrThrow().formattedText
                wrapper.generateStreamFlow(prompt, GenerationConfig(maxTokens=maxOut)).collect { result -> handleStreamResult(result, answer, false) }
            }
        } catch (t: Throwable) {
            flushTokens()
            generating.set(false)
            activity.runOnUiThread { activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
            error("Generation failed: ${t.message ?: t}")
        } finally {
            if (useImage) selectedImagePath = null
        }
    }

    private fun handleStreamResult(result: LlmStreamResult, answer: StringBuilder, isVlm: Boolean) {
        when (result) {
            is LlmStreamResult.Token -> { answer.append(result.text); queueToken(result.text) }
            is LlmStreamResult.Completed -> {
                if (isVlm) vlmHistory.add(VlmChatMessage("assistant", listOf(VlmContent("text", answer.toString()))))
                else llmHistory.add(ChatMessage("assistant", answer.toString()))
                finish(result.profile)
            }
            is LlmStreamResult.Error -> throw result.throwable
        }
    }

    private fun queueToken(text: String) {
        if (text.isEmpty()) return
        synchronized(tokenLock) {
            tokenBuffer.append(text)
            if (!flushPending) {
                flushPending = true
                activity.runOnUiThread { activity.window.decorView.postDelayed({ flushTokens() },24L) }
            }
        }
    }

    private fun flushTokens() {
        val chunk = synchronized(tokenLock) {
            flushPending = false
            tokenBuffer.toString().also { tokenBuffer.setLength(0) }
        }
        if (chunk.isNotEmpty()) emit(JSONObject().put("type", "token").put("text", chunk))
    }

    private fun finish(profile: ProfilingData) {
        flushTokens()
        generating.set(false)
        activity.runOnUiThread { activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
        val p = JSONObject().put("ttftMs",profile.ttftMs).put("mediaMs",profile.mediaMs)
            .put("promptTimeMs",profile.promptTimeMs).put("decodeTimeMs",profile.decodeTimeMs)
            .put("promptTokens",profile.promptTokens).put("generatedTokens",profile.generatedTokens)
            .put("prefillSpeed",profile.prefillSpeed).put("decodingSpeed",profile.decodingSpeed).put("stopReason",profile.stopReason)
        emit(JSONObject().put("type","generationDone").put("profile",p))
    }

    private suspend fun unload() {
        vlm?.let { runCatching { it.stopStream() }; runCatching { it.destroy() } }
        llm?.let { runCatching { it.stopStream() }; runCatching { it.destroy() } }
        vlm=null; llm=null; loadedModelId=""
    }

    private fun emitState(id:String,state:String,message:String,installed:Boolean,loaded:Boolean) {
        emit(JSONObject().put("type","modelState").put("modelId",id).put("state",state).put("message",message)
            .put("installed",installed).put("loaded",loaded))
    }
    private fun error(message:String) = emit(JSONObject().put("type","error").put("message",message))

    private suspend fun <T> withWakeLock(tag:String,timeoutMs:Long,block:suspend()->T):T {
        val pm=activity.getSystemService(Activity.POWER_SERVICE) as PowerManager
        val lock=pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"GenieXVision:$tag")
        lock.acquire(timeoutMs)
        return try{block()}finally{if(lock.isHeld)lock.release()}
    }

    fun close() {
        runCatching { vlm?.destroy() }; runCatching { llm?.destroy() }; scope.cancel()
    }
}
