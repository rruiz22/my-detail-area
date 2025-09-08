#!/bin/bash

# Testing Infrastructure Runner
# Since package.json is read-only, use this script to run tests

echo "🧪 MDA Sistema - Testing Infrastructure"
echo "======================================"

case $1 in
  "unit")
    echo "Running unit tests..."
    npx vitest run
    ;;
  "unit:ui")
    echo "Running unit tests with UI..."
    npx vitest --ui
    ;;
  "unit:coverage")
    echo "Running unit tests with coverage..."
    npx vitest run --coverage
    ;;
  "e2e")
    echo "Running E2E tests..."
    npx playwright test
    ;;
  "e2e:ui")
    echo "Running E2E tests with UI..."
    npx playwright test --ui
    ;;
  "type-check")
    echo "Running TypeScript type check..."
    npx tsc --noEmit
    ;;
  "lint")
    echo "Running ESLint..."
    npx eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0
    ;;
  "lint:fix")
    echo "Running ESLint with auto-fix..."
    npx eslint . --ext ts,tsx --fix
    ;;
  "all")
    echo "Running all tests..."
    echo "1. Type checking..."
    npx tsc --noEmit
    echo "2. Linting..."
    npx eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0
    echo "3. Unit tests..."
    npx vitest run
    echo "4. E2E tests..."
    npx playwright test
    ;;
  *)
    echo "Available commands:"
    echo "  ./run-tests.sh unit          - Run unit tests"
    echo "  ./run-tests.sh unit:ui       - Run unit tests with UI"
    echo "  ./run-tests.sh unit:coverage - Run unit tests with coverage"
    echo "  ./run-tests.sh e2e           - Run E2E tests"
    echo "  ./run-tests.sh e2e:ui        - Run E2E tests with UI"
    echo "  ./run-tests.sh type-check    - Run TypeScript check"
    echo "  ./run-tests.sh lint          - Run ESLint"
    echo "  ./run-tests.sh lint:fix      - Run ESLint with auto-fix"
    echo "  ./run-tests.sh all           - Run all tests"
    ;;
esac