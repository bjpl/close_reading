# ONNX Model Setup Guide

## Download the all-MiniLM-L6-v2 Model

The semantic search feature requires the **all-MiniLM-L6-v2** ONNX model for generating text embeddings.

### Model Specifications
- **Model**: all-MiniLM-L6-v2
- **Format**: ONNX (Open Neural Network Exchange)
- **Size**: ~80 MB
- **Embedding Dimensions**: 384
- **Max Sequence Length**: 128 tokens
- **License**: Apache 2.0

### Download Instructions

#### Option 1: Download from Hugging Face (Recommended)

1. Visit the ONNX Community model repository:
   ```
   https://huggingface.co/Xenova/all-MiniLM-L6-v2
   ```

2. Download the ONNX model file:
   - Click on "Files and versions"
   - Download `onnx/model.onnx` or `onnx/model_quantized.onnx` (smaller, faster)
   - Rename to `all-MiniLM-L6-v2.onnx`

3. Place the downloaded file in:
   ```
   /public/models/all-MiniLM-L6-v2.onnx
   ```

#### Option 2: Using wget/curl (Command Line)

```bash
# Navigate to your project directory
cd /path/to/close_reading

# Create models directory
mkdir -p public/models

# Download model using wget
wget https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx \
  -O public/models/all-MiniLM-L6-v2.onnx

# Or using curl
curl -L https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx \
  -o public/models/all-MiniLM-L6-v2.onnx
```

#### Option 3: Python Script to Download

```python
# download_model.py
from huggingface_hub import hf_hub_download
import shutil
import os

# Download model from Hugging Face
model_path = hf_hub_download(
    repo_id="Xenova/all-MiniLM-L6-v2",
    filename="onnx/model.onnx"
)

# Copy to public/models
os.makedirs("public/models", exist_ok=True)
shutil.copy(model_path, "public/models/all-MiniLM-L6-v2.onnx")

print("Model downloaded successfully!")
```

Run with:
```bash
pip install huggingface-hub
python download_model.py
```

### Verify Installation

After downloading, verify the model file exists:

```bash
ls -lh public/models/all-MiniLM-L6-v2.onnx
```

Expected output:
```
-rw-r--r-- 1 user user 80M Nov 11 22:00 public/models/all-MiniLM-L6-v2.onnx
```

### Testing the Model

Run the development server and check the browser console:

```bash
npm run dev
```

Open the application and watch for these console messages:
```
[ONNX] Initializing embedding service...
[ONNX] Model path: /models/all-MiniLM-L6-v2.onnx
[ONNX] Cache initialized
[ONNX] Model loaded successfully in XXXms
```

### Alternative Models

If you need different performance characteristics:

1. **Faster, smaller model** (23 MB):
   - Model: `paraphrase-MiniLM-L3-v2`
   - Dimensions: 384
   - Download: https://huggingface.co/Xenova/paraphrase-MiniLM-L3-v2

2. **Higher quality model** (420 MB):
   - Model: `all-mpnet-base-v2`
   - Dimensions: 768
   - Download: https://huggingface.co/Xenova/all-mpnet-base-v2

To use an alternative model, update the configuration in:
`src/services/ml/OnnxEmbeddingService.ts`

```typescript
private readonly config: OnnxEmbeddingConfig = {
  modelPath: '/models/your-model-name.onnx',
  maxSequenceLength: 128,
  batchSize: 32,
  cacheEnabled: true,
};
```

### Troubleshooting

#### Model not found error
```
Error: Failed to load ONNX model: Error: Failed to fetch
```

**Solution**: Ensure the model file is in `public/models/` and the path is correct.

#### Model loading is slow
- First load always takes 2-5 seconds to initialize WASM backend
- Subsequent embeddings should be <100ms each
- Enable caching to improve performance

#### CORS errors
- Models must be served from same origin or with proper CORS headers
- Place models in `public/` directory (not `src/`)

#### Memory errors
- Model requires ~200MB RAM when loaded
- Use quantized model for lower memory usage
- Clear browser cache if issues persist

### Performance Benchmarks

Expected performance on modern hardware:

| Operation | Target | Typical |
|-----------|--------|---------|
| Model loading | - | 2-5s (first time) |
| Single embedding | <100ms | 30-50ms |
| Batch (10 texts) | - | 200-400ms |
| Cache hit | <1ms | <1ms |
| Vector search (1000 vectors) | <50ms | 20-40ms |

### Additional Resources

- [ONNX Runtime Web Documentation](https://onnxruntime.ai/docs/tutorials/web/)
- [Sentence Transformers](https://www.sbert.net/)
- [Hugging Face Model Hub](https://huggingface.co/models)
- [ONNX Model Zoo](https://github.com/onnx/models)

### Support

For issues or questions:
1. Check browser console for detailed error messages
2. Verify model file integrity (size should be ~80 MB)
3. Test with quantized model if size/memory is an issue
4. Open an issue with error logs and browser info
