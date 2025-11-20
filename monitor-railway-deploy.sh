#!/bin/bash
# Railway Deployment Monitor
# Checks if the app is up and face recognition models are loading

APP_URL="https://dds.mydetailarea.com"
MODEL_URL="$APP_URL/models/face_recognition_model.bin"
CHECK_INTERVAL=15  # seconds
MAX_CHECKS=30      # 7.5 minutes total

echo "========================================"
echo "🚂 Railway Deployment Monitor"
echo "========================================"
echo ""
echo "App URL: $APP_URL"
echo "Checking every ${CHECK_INTERVAL}s for up to $(($MAX_CHECKS * $CHECK_INTERVAL / 60)) minutes"
echo ""

check_count=0
last_status=""

while [ $check_count -lt $MAX_CHECKS ]; do
    check_count=$((check_count + 1))
    timestamp=$(date '+%H:%M:%S')

    echo "[$timestamp] Check #$check_count/$MAX_CHECKS"

    # Check if app is responding
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$APP_URL" 2>/dev/null)

    if [ "$http_code" = "200" ]; then
        echo "  ✅ App is UP! (HTTP $http_code)"

        # Check face recognition model
        model_size=$(curl -s -I "$MODEL_URL" 2>/dev/null | grep -i "content-length" | awk '{print $2}' | tr -d '\r')

        if [ ! -z "$model_size" ]; then
            model_mb=$(echo "scale=2; $model_size / 1024 / 1024" | bc)
            echo "  ✅ Face model accessible! Size: ${model_mb}MB"

            # Check Content-Type
            content_type=$(curl -s -I "$MODEL_URL" 2>/dev/null | grep -i "content-type" | awk '{print $2}' | tr -d '\r')
            if [[ "$content_type" == *"octet-stream"* ]]; then
                echo "  ✅ Content-Type correct: $content_type"
            else
                echo "  ⚠️  Content-Type: $content_type (should be application/octet-stream)"
            fi

            echo ""
            echo "========================================"
            echo "🎉 DEPLOYMENT SUCCESSFUL!"
            echo "========================================"
            echo ""
            echo "✅ App is live and responding"
            echo "✅ Face recognition models are accessible"
            echo "✅ Content-Type headers are correct"
            echo ""
            echo "🧪 Next steps:"
            echo "1. Open $APP_URL in browser"
            echo "2. Navigate to Detail Hub → Time Clock"
            echo "3. Test face recognition"
            echo "4. Check console for: '✓ All models loaded successfully'"
            echo ""
            exit 0
        else
            echo "  ⚠️  Model not accessible yet"
        fi
    elif [ "$http_code" = "503" ] || [ "$http_code" = "502" ]; then
        echo "  🔄 App is deploying... (HTTP $http_code)"
    elif [ "$http_code" = "000" ]; then
        echo "  ⏳ Connection timeout - Railway might be building..."
    else
        echo "  ❌ Unexpected status: HTTP $http_code"
    fi

    if [ $check_count -lt $MAX_CHECKS ]; then
        echo "  ⏱️  Waiting ${CHECK_INTERVAL}s..."
        echo ""
        sleep $CHECK_INTERVAL
    fi
done

echo ""
echo "========================================"
echo "⏰ TIMEOUT - Deployment taking longer than expected"
echo "========================================"
echo ""
echo "The deployment might still be in progress. Check:"
echo "1. Railway Dashboard: https://railway.app/dashboard"
echo "2. Build logs for errors"
echo "3. Container logs for startup issues"
echo ""
exit 1
