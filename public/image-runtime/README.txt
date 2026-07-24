# Image runtime (background removal)

Plan 1 uses `@imgly/background-removal`, which downloads ONNX/WASM assets on first
"Remove background" (cached by the browser).

To self-host later, place vendor assets here and pass `publicPath: '/image-runtime/'`
into `removeBackgroundLocal` (see IMG.LY “Custom Asset Serving” docs).
