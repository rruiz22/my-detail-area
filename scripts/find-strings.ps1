# PowerShell script to find hardcoded strings in React components

Write-Host "🔍 Searching for hardcoded strings in React components..." -ForegroundColor Cyan

# Get all TSX/TS files
$files = Get-ChildItem -Path "../src" -Recurse -Include "*.tsx", "*.ts" | Where-Object { $_.Name -notlike "*.d.ts" }

Write-Host "📁 Found $($files.Count) files to analyze`n" -ForegroundColor Green

$results = @()

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")

    # Skip if already has translation setup
    $hasTranslation = $content -match 'useTranslation|t\('

    $hardcodedStrings = @()

    # Find toast messages
    $toastMatches = [regex]::Matches($content, "toast\.(success|error|info|warning)\(['""`]([^'""`]+)['""`]\)")
    foreach ($match in $toastMatches) {
        $hardcodedStrings += @{
            Text = $match.Groups[2].Value
            Type = "toast"
            Line = ($content.Substring(0, $match.Index) -split "`n").Count
        }
    }

    # Find JSX text content
    $jsxMatches = [regex]::Matches($content, ">([A-Z][a-zA-Z\s]{3,40})<")
    foreach ($match in $jsxMatches) {
        $text = $match.Groups[1].Value.Trim()
        if ($text -notmatch '\{' -and ($text -split ' ').Count -ge 2) {
            $hardcodedStrings += @{
                Text = $text
                Type = "jsx_text"
                Line = ($content.Substring(0, $match.Index) -split "`n").Count
            }
        }
    }

    # Find quoted strings
    $quotedMatches = [regex]::Matches($content, "['""`]([A-Z][a-zA-Z\s]{3,40})['""`]")
    foreach ($match in $quotedMatches) {
        $text = $match.Groups[1].Value
        if ($text -notmatch '/' -and $text -notmatch '@' -and ($text -split ' ').Count -ge 2) {
            $hardcodedStrings += @{
                Text = $text
                Type = "quoted_string"
                Line = ($content.Substring(0, $match.Index) -split "`n").Count
            }
        }
    }

    # Remove duplicates
    $uniqueStrings = $hardcodedStrings | Group-Object Text | ForEach-Object { $_.Group[0] }

    if ($uniqueStrings.Count -gt 0) {
        $results += @{
            FilePath = $file.FullName
            RelativePath = $relativePath
            HasTranslation = $hasTranslation
            HardcodedStrings = $uniqueStrings
            Count = $uniqueStrings.Count
        }
    }
}

# Sort by count descending
$results = $results | Sort-Object Count -Descending

Write-Host "📊 HARDCODED STRINGS ANALYSIS RESULTS" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Yellow

if ($results.Count -eq 0) {
    Write-Host "✅ No hardcoded strings found! Your project is well internationalized." -ForegroundColor Green
    exit
}

Write-Host "`n🎯 TOP 10 FILES WITH MOST HARDCODED STRINGS:`n" -ForegroundColor Cyan

for ($i = 0; $i -lt [Math]::Min(10, $results.Count); $i++) {
    $result = $results[$i]
    $coverage = if ($result.HasTranslation) { "🔄 Partial" } else { "❌ None" }

    Write-Host "$($i + 1). $($result.RelativePath)" -ForegroundColor White
    Write-Host "   📍 $($result.Count) hardcoded strings | i18n: $coverage" -ForegroundColor Gray

    # Show top strings
    $topStrings = $result.HardcodedStrings | Select-Object -First 3
    foreach ($str in $topStrings) {
        Write-Host "   ├─ `"$($str.Text)`" ($($str.Type):$($str.Line))" -ForegroundColor DarkGray
    }

    if ($result.Count -gt 3) {
        Write-Host "   └─ ... and $($result.Count - 3) more" -ForegroundColor DarkGray
    }
    Write-Host ""
}

# Summary statistics
$totalStrings = ($results | Measure-Object -Property Count -Sum).Sum
$filesWithTranslation = ($results | Where-Object HasTranslation).Count

Write-Host "`n📈 SUMMARY STATISTICS:" -ForegroundColor Yellow
Write-Host "├─ Total files with hardcoded strings: $($results.Count)" -ForegroundColor Gray
Write-Host "├─ Total hardcoded strings found: $totalStrings" -ForegroundColor Gray
Write-Host "├─ Files with partial i18n setup: $filesWithTranslation" -ForegroundColor Gray
Write-Host "├─ Files needing complete i18n setup: $($results.Count - $filesWithTranslation)" -ForegroundColor Gray

$averageStrings = [Math]::Round($totalStrings / $results.Count, 1)
Write-Host "└─ Average hardcoded strings per file: $averageStrings" -ForegroundColor Gray

# String type breakdown
Write-Host "`n🏷️  STRING TYPE BREAKDOWN:" -ForegroundColor Yellow
$typeBreakdown = @{}
foreach ($result in $results) {
    foreach ($str in $result.HardcodedStrings) {
        if ($typeBreakdown.ContainsKey($str.Type)) {
            $typeBreakdown[$str.Type]++
        } else {
            $typeBreakdown[$str.Type] = 1
        }
    }
}

$sortedTypes = $typeBreakdown.GetEnumerator() | Sort-Object Value -Descending
foreach ($type in $sortedTypes) {
    Write-Host "├─ $($type.Key): $($type.Value) strings" -ForegroundColor Gray
}

Write-Host "`n🛠️  BATCH PROCESSING RECOMMENDATIONS:" -ForegroundColor Yellow
Write-Host "1. Focus on files with 5+ hardcoded strings first" -ForegroundColor Gray
Write-Host "2. Start with toast messages (easiest to fix)" -ForegroundColor Gray
Write-Host "3. Then fix JSX text content" -ForegroundColor Gray
Write-Host "4. Finally handle quoted strings and placeholders" -ForegroundColor Gray

# Generate top files list for manual processing
$topFiles = $results | Select-Object -First 5
Write-Host "`n📋 TOP 5 FILES FOR IMMEDIATE BATCH PROCESSING:" -ForegroundColor Cyan
foreach ($file in $topFiles) {
    Write-Host "   • $($file.RelativePath) ($($file.Count) strings)" -ForegroundColor White
}