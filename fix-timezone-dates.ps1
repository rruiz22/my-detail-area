$file = "src/components/reports/ReportFilters.tsx"
$content = Get-Content $file -Raw

# Add helper function to normalize dates to UTC midnight after the getWeekDates function
$insertAfter = @"
    return \{ monday, sunday \};
  \};
"@

$helperFunction = @"
    return { monday, sunday };
  };

  // Helper to normalize date to UTC midnight (removes timezone offset)
  const toUTCMidnight = (date: Date): Date => {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
  };
"@

$content = $content -replace $insertAfter, $helperFunction

# Now update handleQuickDateRange to use toUTCMidnight
$content = $content -replace "    onFiltersChange\(\{`n      ...filters,`n      startDate,`n      endDate`n    \}\);", @"
    onFiltersChange({
      ...filters,
      startDate: toUTCMidnight(startDate),
      endDate: toUTCMidnight(endDate)
    });
"@

$content | Set-Content $file -NoNewline

Write-Host "Timezone fix applied to ReportFilters!" -ForegroundColor Green
