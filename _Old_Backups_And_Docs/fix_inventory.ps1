
$raw = Get-Content 'public\assets\data\inventory.json' -Raw -Encoding UTF8

# Find where the corrupted shops data starts (added by old PowerShell command)
$corruptMarker = ',{"'
$corruptStart = $raw.LastIndexOf($corruptMarker + ' code')
if ($corruptStart -lt 0) {
    $corruptStart = $raw.LastIndexOf("`n,{`"")
}

# If not found by marker, find last good closing bracket before CE006
$ce006End = $raw.LastIndexOf('"intent": "buy"')
$validEnd = $raw.IndexOf(']', $ce006End)

$validJson = $raw.Substring(0, $validEnd).TrimEnd().TrimEnd(',')

# Add the 16 shops properly
$shops = @(
    @{code="B10S3B";project="SHOPS";price=6231000;floor="Ground Floor";view="No View";area=67;status="Available";type="shop";intent="buy"},
    @{code="B10S6B";project="SHOPS";price=6231000;floor="Ground Floor";view="No View";area=67;status="Available";type="shop";intent="buy"},
    @{code="B9S10"; project="SHOPS";price=2766000;floor="Ground Floor";view="No View";area=33;status="Available";type="shop";intent="buy"},
    @{code="B9S11"; project="SHOPS";price=4358000;floor="Ground Floor";view="No View";area=52;status="Available";type="shop";intent="buy"},
    @{code="B9S12"; project="SHOPS";price=4358000;floor="Ground Floor";view="No View";area=52;status="Available";type="shop";intent="buy"},
    @{code="B9S14"; project="SHOPS";price=3101000;floor="Ground Floor";view="No View";area=37;status="Available";type="shop";intent="buy"},
    @{code="B9S15"; project="SHOPS";price=4107000;floor="Ground Floor";view="No View";area=49;status="Available";type="shop";intent="buy"},
    @{code="B9S16"; project="SHOPS";price=5196000;floor="Ground Floor";view="No View";area=62;status="Available";type="shop";intent="buy"},
    @{code="B9S21"; project="SHOPS";price=3612000;floor="Ground Floor";view="No View";area=42;status="Available";type="shop";intent="buy"},
    @{code="B9S22"; project="SHOPS";price=3183000;floor="Ground Floor";view="No View";area=37;status="Available";type="shop";intent="buy"},
    @{code="B9S25"; project="SHOPS";price=4129000;floor="Ground Floor";view="No View";area=48;status="Available";type="shop";intent="buy"},
    @{code="B9S26"; project="SHOPS";price=3183000;floor="Ground Floor";view="No View";area=37;status="Available";type="shop";intent="buy"},
    @{code="B9S27"; project="SHOPS";price=5160000;floor="Ground Floor";view="No View";area=60;status="Available";type="shop";intent="buy"},
    @{code="B9S3";  project="SHOPS";price=4442000;floor="Ground Floor";view="No View";area=53;status="Available";type="shop";intent="buy"},
    @{code="B9S6";  project="SHOPS";price=3269000;floor="Ground Floor";view="No View";area=39;status="Available";type="shop";intent="buy"},
    @{code="B9S7";  project="SHOPS";price=4358000;floor="Ground Floor";view="No View";area=52;status="Available";type="shop";intent="buy"}
)

$shopLines = $shops | ForEach-Object {
    $s = $_
    ",`n    {`n        `"code`": `"$($s.code)`",`n        `"project`": `"$($s.project)`",`n        `"price`": $($s.price),`n        `"floor`": `"$($s.floor)`",`n        `"view`": `"$($s.view)`",`n        `"area`": $($s.area),`n        `"status`": `"$($s.status)`",`n        `"type`": `"$($s.type)`",`n        `"intent`": `"$($s.intent)`"`n    }"
}

$newJson = $validJson + ($shopLines -join '') + "`n]"

# Validate
$parsed = $newJson | ConvertFrom-Json
Write-Host "Total units after fix: $($parsed.Count)"
Write-Host "Shop units: $(($parsed | Where-Object { $_.type -eq 'shop' }).Count)"

# Save
$newJson | Set-Content 'public\assets\data\inventory.json' -Encoding UTF8
Write-Host "inventory.json saved successfully!"
