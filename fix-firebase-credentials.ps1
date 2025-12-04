# Fix Firebase credentials: Use separate env vars instead of JSON parsing
$ErrorActionPreference = "Stop"

$filePath = "supabase\functions\send-notification\index.ts"
Write-Host "Reading Edge Function..." -ForegroundColor Cyan
$content = Get-Content -Path $filePath -Raw

Write-Host "Applying fix for Firebase credentials..." -ForegroundColor Yellow

# Step 1: Add environment variables
$old1 = @"
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT') // JSON string
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') || 'my-detail-area'
"@

$new1 = @"
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT') // JSON string (fallback)
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') || 'my-detail-area'
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL')
const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY')
"@

$content = $content.Replace($old1, $new1)

# Step 2: Replace getFirebaseAccessToken function logic
$old2 = @"
async function getFirebaseAccessToken(): Promise<string> {
  if (!FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not configured')
  }

  try {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT)
"@

$new2 = @"
async function getFirebaseAccessToken(): Promise<string> {
  // Build service account object from separate env vars (avoids JSON parsing issues)
  let serviceAccount: any

  if (FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    // Use separate credentials (preferred method)
    serviceAccount = {
      client_email: FIREBASE_CLIENT_EMAIL,
      private_key: FIREBASE_PRIVATE_KEY,
    }
  } else if (FIREBASE_SERVICE_ACCOUNT) {
    // Fallback: parse JSON
    try {
      serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT)
    } catch (parseError) {
      console.error('[send-notification] Error parsing FIREBASE_SERVICE_ACCOUNT JSON:', parseError)
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON. Use FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY instead.')
    }
  } else {
    throw new Error('Firebase credentials not configured. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY')
  }

  try {
"@

$content = $content.Replace($old2, $new2)

Write-Host "Writing file..." -ForegroundColor Yellow
$content | Set-Content -Path $filePath -NoNewline

Write-Host "✅ Firebase credentials fix applied!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Deploy: supabase functions deploy send-notification --project-ref swfnnrpzpkdypbrzmgnr" -ForegroundColor White
Write-Host "  2. Test: Change order status and check if push notifications work" -ForegroundColor White
