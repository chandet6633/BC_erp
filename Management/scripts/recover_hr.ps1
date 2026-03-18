$historyRoot = "$env:APPDATA\Antigravity\User\History"
$htmlFiles = @(
    (Get-Item -Path "src\pages\hr\index.html" -ErrorAction SilentlyContinue),
    (Get-Item -Path "src\pages\hr\collection_management.html" -ErrorAction SilentlyContinue),
    (Get-Item -Path "src\pages\hr\payroll.html" -ErrorAction SilentlyContinue)
) | Where-Object { $_ -ne $null }

foreach ($file in $htmlFiles) {
    if (-not $file) { continue }
    $targetPath = $file.FullName
    $unixPath = $targetPath.Replace('\', '/')
    $fragment = $unixPath.Substring($unixPath.IndexOf("src/pages"))

    $entries = Get-ChildItem -Path $historyRoot -Recurse -Filter "entries.json"
    $foundBackup = $null

    foreach ($entry in $entries) {
        $json = Get-Content $entry.FullName -Raw
        if ($json -match [regex]::Escape($fragment)) {
            $backups = Get-ChildItem -Path $entry.DirectoryName -File | Where-Object { $_.Name -ne "entries.json" } | Sort-Object LastWriteTime -Descending
            foreach ($backup in $backups) {
                # We specifically want a backup that DOES NOT have mojibake but HAS HTML tags
                $content = Get-Content $backup.FullName -Encoding UTF8 -Raw
                if ($content -notmatch "à¸" -and $content -notmatch "Ã" -and $content -match "<html") {
                    $foundBackup = $backup.FullName
                    break
                }
            }
            if ($foundBackup) {
                break
            }
        }
    }

    if ($foundBackup) {
        Copy-Item -Path $foundBackup -Destination $targetPath -Force
        Write-Host "Recovered $($file.Name) from IDE history."
    } else {
        Write-Host "WARNING: Could not find clean backup for $($file.Name)."
    }
}
