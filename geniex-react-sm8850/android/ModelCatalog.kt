package com.geniex.demo

import com.geniex.sdk.bean.HubSource
import com.geniex.sdk.bean.ModelType

internal const val TARGET_CHIPSET = "SM8850"
internal const val DEFAULT_MODEL_ID = "qwen3-vl-4b-npu"

internal data class ModelSpec(
    val id: String,
    val name: String,
    val shortName: String,
    val modelName: String,
    val type: ModelType,
    val backend: String,
    val quant: String,
    val params: String,
    val description: String,
    val hub: HubSource,
    val runtimeId: String,
    val recommended: Boolean = false,
)

internal val MODEL_CATALOG = listOf(
    ModelSpec(
        id = "qwen3-vl-4b-npu",
        name = "Qwen3-VL-4B-Instruct",
        shortName = "Qwen3-VL-4B",
        modelName = "ai-hub-models/Qwen3-VL-4B-Instruct",
        type = ModelType.VLM,
        backend = "QAIRT",
        quant = "W4A16",
        params = "4B",
        description = "Hardware-compiled vision model for the Hexagon NPU. Best path on SM8850.",
        hub = HubSource.AUTO,
        runtimeId = "qairt",
        recommended = true,
    ),
    ModelSpec(
        id = "qwen3-4b-npu",
        name = "Qwen3-4B-Instruct-2507",
        shortName = "Qwen3-4B",
        modelName = "ai-hub-models/Qwen3-4B-Instruct-2507",
        type = ModelType.LLM,
        backend = "QAIRT",
        quant = "W4A16",
        params = "4B",
        description = "Fast text-only QAIRT model on the Snapdragon NPU.",
        hub = HubSource.AUTO,
        runtimeId = "qairt",
    ),
    ModelSpec(
        id = "qwen3-vl-4b-gguf",
        name = "Qwen3-VL-4B-Instruct GGUF",
        shortName = "Qwen3-VL-4B GGUF",
        modelName = "unsloth/Qwen3-VL-4B-Instruct-GGUF",
        type = ModelType.VLM,
        backend = "GGUF",
        quant = "Q4_0",
        params = "4B",
        description = "Community GGUF fallback using GenieX hybrid HTP + CPU scheduling.",
        hub = HubSource.HUGGINGFACE,
        runtimeId = "llama_cpp",
    ),
    ModelSpec(
        id = "qwen3.5-2b-gguf",
        name = "Qwen3.5-2B GGUF",
        shortName = "Qwen3.5-2B",
        modelName = "unsloth/Qwen3.5-2B-GGUF",
        type = ModelType.VLM,
        backend = "GGUF",
        quant = "Q4_0",
        params = "2B",
        description = "Smaller multimodal fallback with lower memory use.",
        hub = HubSource.HUGGINGFACE,
        runtimeId = "llama_cpp",
    ),
)
