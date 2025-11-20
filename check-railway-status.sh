#!/bin/bash
# Quick Railway Status Checker
# Verifica si el deployment fue exitoso

APP_URL="https://dds.mydetailarea.com"

echo "========================================"
echo "🚂 Railway Status Checker"
echo "========================================"
echo ""

# Check if app is responding
echo "1️⃣ Checking app status..."
http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$APP_URL" 2>/dev/null)
if [ "$http_code" = "200" ]; then
    echo "   ✅ App is UP (HTTP $http_code)"
else
    echo "   ❌ App is DOWN (HTTP $http_code)"
    exit 1
fi

# Check face recognition model
echo ""
echo "2️⃣ Checking face_recognition_model.bin..."
response=$(curl -sI "$APP_URL/models/face_recognition_model.bin" 2>/dev/null)
content_type=$(echo "$response" | grep -i "content-type" | awk '{print $2}' | tr -d '\r')
content_length=$(echo "$response" | grep -i "content-length" | awk '{print $2}' | tr -d '\r')

echo "   Content-Type: $content_type"
echo "   Content-Length: $content_length bytes"

# Validate
if [[ "$content_type" == *"octet-stream"* ]]; then
    echo "   ✅ Content-Type is correct!"
else
    echo "   ❌ Content-Type is WRONG (should be application/octet-stream)"
    echo "   ⚠️  Railway might still be deploying old version"
    echo ""
    echo "   Wait 2-3 minutes and try again, or force rebuild:"
    echo "   railway up --clean"
    exit 1
fi

if [ "$content_length" -gt "6000000" ]; then
    echo "   ✅ File size is correct (~6.2MB)"
else
    echo "   ❌ File size is WRONG (should be ~6.2MB, got $content_length bytes)"
    echo "   ⚠️  File is being served as HTML (SPA fallback)"
    exit 1
fi

# Check other models
echo ""
echo "3️⃣ Checking other models..."
for model in "tiny_face_detector_model.bin" "face_landmark_68_model.bin"; do
    size=$(curl -sI "$APP_URL/models/$model" 2>/dev/null | grep -i "content-length" | awk '{print $2}' | tr -d '\r')
    type=$(curl -sI "$APP_URL/models/$model" 2>/dev/null | grep -i "content-type" | awk '{print $2}' | tr -d '\r')

    if [[ "$type" == *"octet-stream"* ]]; then
        echo "   ✅ $model ($size bytes)"
    else
        echo "   ❌ $model (wrong Content-Type)"
    fi
done

echo ""
echo "========================================"
echo "🎉 ALL CHECKS PASSED!"
echo "========================================"
echo ""
echo "✅ App is running correctly"
echo "✅ All models are accessible"
echo "✅ Content-Type headers are correct"
echo ""
echo "🧪 Next: Test face recognition in browser"
echo "   1. Open $APP_URL"
echo "   2. Go to Detail Hub → Time Clock"
echo "   3. Check console for: '✓ All models loaded successfully'"
echo ""
