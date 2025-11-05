# Face-API.js Models

This directory contains the face-api.js machine learning models required for facial recognition in Detail Hub.

## Required Models

Download the following models from the [face-api.js repository](https://github.com/justadudewhohacks/face-api.js/tree/master/weights):

### 1. Tiny Face Detector (Required)
- `tiny_face_detector_model-weights_manifest.json` (190 KB)
- `tiny_face_detector_model-shard1` (190 KB)

### 2. Face Landmark 68 Model (Required)
- `face_landmark_68_model-weights_manifest.json` (350 KB)
- `face_landmark_68_model-shard1` (350 KB)

## Download Instructions

### Option 1: Direct Download (Recommended)

```bash
cd public/models

# Download Tiny Face Detector
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1

# Download Face Landmark 68
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1
```

### Option 2: Manual Download

1. Visit: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
2. Download the 4 files listed above
3. Place them in this `public/models/` directory

## Verify Installation

After downloading, verify the files exist:

```bash
ls -la public/models/
```

You should see:
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`

## Model Details

**Tiny Face Detector:**
- Fast, lightweight detector (~190KB total)
- Input sizes: 128, 160, 224, 320, 416, 512, 608
- Used for real-time face detection in video streams

**Face Landmark 68:**
- Detects 68 facial landmarks
- Used for face angle calculation
- Enables liveness detection (smile, head turn, etc.)

## Performance

| Model | Size | Load Time | Inference Time |
|-------|------|-----------|----------------|
| Tiny Face Detector | 190 KB | ~500ms | <50ms |
| Face Landmark 68 | 350 KB | ~800ms | <30ms |

**Total:** ~540KB, loads in <2 seconds on first use

## Troubleshooting

### Models not loading?

1. Check browser console for 404 errors
2. Verify files are in `public/models/` (NOT `src/models/`)
3. Clear browser cache and reload
4. Check CORS headers (should be fine with local files)

### Slow loading?

- Models are cached after first load
- Use TinyFaceDetector (190KB) instead of SSD MobileNet (5MB)
- Serve models from CDN in production

## Production Deployment

For production, consider hosting models on CDN:

```typescript
// src/utils/faceDetection.ts
const MODEL_URL = 'https://cdn.yoursite.com/face-api-models';
```

This reduces bundle size and improves global load times.

## License

Models are from face-api.js (MIT License): https://github.com/justadudewhohacks/face-api.js
