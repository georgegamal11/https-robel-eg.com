# Robel Real Estate - Deployment Helper
# This script automatically updates all JS and CSS query strings to the latest timestamp
# to ensure users get the latest version immediately after deployment (Cache Busting).

$version = Get-Date -Format "yyyyMMddHHmmss"
$targetFiles = Get-ChildItem -Path "public" -Filter "*.html" -Recurse

Write-Host "?? Starting Cache Busting for version: $version" -ForegroundColor Cyan

foreach ($file in $targetFiles) {
    Write-Host "?? Processing $($file.FullName)..."
    $content = Get-Content $file.FullName -Raw
    
    # Replace .js?v=XXXX or .js with .js?v=$version
    $content = $content -replace '(?<=src=")(?!http)([^"]+?\.js)(?:\?v=[^"]*)?(?=")', ('$1?v=' + $version)
    
    # Replace .css?v=XXXX or .css with .css?v=$version
    $content = $content -replace '(?<=href=")(?!http)([^"]+?\.css)(?:\?v=[^"]*)?(?=")', ('$1?v=' + $version)

    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "?? Done! All HTML files are now stamped with version $version." -ForegroundColor Green
