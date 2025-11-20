# Face-API.js Models

Download models from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

Required files (7 total, ~6.2MB):
- tiny_face_detector_model-weights_manifest.json
- tiny_face_detector_model-shard1
- face_landmark_68_model-weights_manifest.json
- face_landmark_68_model-shard1
- face_recognition_model-weights_manifest.json
- face_recognition_model-shard1
- face_recognition_model-shard2

Download with PowerShell:
cd public\models
$base = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
"tiny_face_detector_model-weights_manifest.json","tiny_face_detector_model-shard1","face_landmark_68_model-weights_manifest.json","face_landmark_68_model-shard1","face_recognition_model-weights_manifest.json","face_recognition_model-shard1","face_recognition_model-shard2" | ForEach-Object { Invoke-WebRequest "$base/$_" -OutFile $_ }
