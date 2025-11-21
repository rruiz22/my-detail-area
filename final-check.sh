#!/bin/bash
echo "========================================="
echo "🚀 Final Deployment Check"
echo "========================================="
echo ""
echo "Waiting 2 minutes for Railway to deploy..."
sleep 120
echo ""
echo "Running final verification..."
echo ""
./check-railway-status.sh
