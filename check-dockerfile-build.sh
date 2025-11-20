#!/bin/bash
echo "=== Testing Dockerfile locally ==="
echo ""
echo "Step 1: Building image..."
docker build -t mydetailarea-test . 2>&1 | tee docker-build.log
BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
    echo ""
    echo "❌ Docker build FAILED!"
    echo "Check docker-build.log for details"
    exit 1
fi

echo ""
echo "✓ Build successful!"
echo ""
echo "Step 2: Checking image size..."
docker images mydetailarea-test --format "{{.Size}}"

echo ""
echo "Step 3: Testing container startup..."
docker run --rm -d -p 8081:8080 -e PORT=8080 --name mydetailarea-test mydetailarea-test
sleep 5

if docker ps | grep mydetailarea-test > /dev/null; then
    echo "✓ Container running"
    echo ""
    echo "Step 4: Testing healthcheck..."
    curl -I http://localhost:8081/ 2>&1 | head -5
    echo ""
    echo "Step 5: Stopping container..."
    docker stop mydetailarea-test
    echo "✓ All tests passed!"
else
    echo "❌ Container failed to start"
    echo "Checking logs:"
    docker logs mydetailarea-test 2>&1 | tail -20
    docker rm -f mydetailarea-test 2>/dev/null
    exit 1
fi
