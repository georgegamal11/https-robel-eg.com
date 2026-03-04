$content = Get-Content -Path ".\home.js" -Encoding UTF8
$len = $content.Count
$p1 = $content[0..6009]
$p2 = $content[6418..($len-1)]
$newContent = $p1 + $p2
$newContent | Set-Content -Path ".\home.js" -Encoding UTF8
Write-Host "File updated successfully. New length: $($newContent.Count)"
