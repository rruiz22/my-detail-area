# Face-API.js Models (Vladimir Mandic Fork)

**Source:** https://github.com/vladmandic/face-api

**Library:** `@vladmandic/face-api@1.7.12`

---

## 📦 Current Models (6 files, ~6.8MB)

✅ **Installed:**
- `tiny_face_detector_model.bin` (189 KB) - Face detection
- `tiny_face_detector_model-weights_manifest.json` (3.2 KB)
- `face_landmark_68_model.bin` (349 KB) - 68-point facial landmarks
- `face_landmark_68_model-weights_manifest.json` (8.4 KB)
- `face_recognition_model.bin` (6.2 MB) - 128D face descriptors
- `face_recognition_model-weights_manifest.json` (20 KB)

---

## 🔄 How to Update Models

### Method 1: Git Clone (Recommended)
```bash
cd public
git clone --depth=1 --filter=blob:none --sparse https://github.com/vladmandic/face-api.git temp_models
cd temp_models
git sparse-checkout set model
cp model/tiny_face_detector_model* ../models/
cp model/face_landmark_68_model.bin ../models/
cp model/face_landmark_68_model-weights_manifest.json ../models/
cp model/face_recognition_model* ../models/
cd ..
rm -rf temp_models
```

### Method 2: Download Script (Automated)
```bash
node download-models.cjs
```

---

## ⚠️ Important Notes

1. **Format Changed**: Vladmandic fork uses `.bin` files instead of `.shard1`, `.shard2`
2. **Compatibility**: These models are ONLY compatible with `@vladmandic/face-api`, NOT the original `face-api.js`
3. **Production**: Ensure `.bin` files are served with `Content-Type: application/octet-stream`
4. **No Compression**: DO NOT gzip/compress `.bin` files - it corrupts binary data
5. **Cache Busting**: Use version query params in production: `/models/face_recognition_model.bin?v=1.7.12`

---

## 🧪 Testing

```bash
npm run dev
```

Navigate to **Detail Hub → Time Clock**, click "Use Face Recognition":
- ✅ Should see "All models loaded successfully" in console
- ✅ Camera should activate and detect faces
- ✅ Should recognize enrolled employees with >70% confidence
- ❌ Should NOT see "tensor should have 8192 values" error

---

## 📚 References

- Main repo: https://github.com/vladmandic/face-api
- Models directory: https://github.com/vladmandic/face-api/tree/master/model
- Documentation: https://vladmandic.github.io/face-api/
- NPM package: https://www.npmjs.com/package/@vladmandic/face-api

---

**Last Updated:** 2025-11-20
**Model Version:** 1.7.12 (Vladmandic Fork)
