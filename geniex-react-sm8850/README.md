# GenieX Vision SM8850

A phone-first Android shell for Qualcomm GenieX, tuned for Snapdragon 8 Elite Gen 5 (SM8850 / Hexagon v81).

The UI is a local React app rendered inside Android WebView. All inference, model management, image preprocessing, and NPU access stay native through the GenieX Android SDK. No remote inference or web API is used.

Primary fast path:

- Qwen3-VL-4B-Instruct
- Qualcomm AI Hub QAIRT bundle
- chipset: SM8850
- runtime: qairt
- compute: Hexagon NPU
- W4A16 bundle
- 512x512 compiled vision encoder
- Qwen3-VL DeepStack through GenieX QAIRT

Performance-focused changes compared with Qualcomm's sample app:

- default model is Qwen3-VL-4B-Instruct QAIRT for SM8850 instead of the old SM8750 catalog entries
- GGUF GPU/hybrid models use nGpuLayers = -1 instead of accidentally leaving VLMs at 0
- optional fresh-context "Vision Turbo" mode resets KV state before a new image turn to minimize prefill
- selected images are downsampled once in native code before inference, reducing decode/memory overhead from multi-megapixel phone images
- streaming tokens are batched across the WebView bridge instead of one evaluateJavascript call per token
- media encoder time, TTFT, prefill rate and decode rate are surfaced directly from GenieX ProfilingData
- model downloading/loading happens off the UI thread
- React UI is bundled locally into the APK and works fully offline after model download

Build is automated by `.github/workflows/build-geniex-react-sm8850.yml` and pins the Qualcomm source/runtime commits used for the APK.
