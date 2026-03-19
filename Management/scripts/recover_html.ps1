$historyRoot = "$env:APPDATA\Antigravity\User\History"
$htmlFiles = Get-ChildItem -Path "src\pages" -Recurse -Filter "*.html" | Where-Object { $_.Name -ne "index.html.fixed" }

foreach ($file in $htmlFiles) {
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
        Write-Host "WARNING: Could not find clean backup for $($file.Name). It might not have been corrupted, or history doesn't exist."
    }
}
