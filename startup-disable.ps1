<#
    Removes the sign-in shortcut created by startup-enable.ps1.
    Your tracked habits and exams are untouched - they live in the browser,
    not in the shortcut.

    Usage
        .\startup-disable.ps1
#>
[CmdletBinding()]
param(
    [string] $Name = "Quiet Progress Tracker"
)

$ErrorActionPreference = "Stop"
$startup = [Environment]::GetFolderPath("Startup")
$removed = @()

foreach ($ext in ".lnk", ".url") {
    $path = Join-Path $startup "$Name$ext"
    if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Force
        $removed += $path
    }
}

Write-Host ""
if ($removed.Count -eq 0) {
    Write-Host "  Nothing to remove - no startup entry named '$Name' was found." -ForegroundColor Yellow
    Write-Host "  Looked in: $startup"
}
else {
    Write-Host "  Startup entry removed." -ForegroundColor Green
    $removed | ForEach-Object { Write-Host "  $_" }
    Write-Host ""
    Write-Host "  Your habit data is unaffected."
}
Write-Host ""
