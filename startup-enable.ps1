<#
    Opens the habit tracker automatically when you sign in to Windows.

    It creates ONE shortcut in your own Startup folder:
        %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

    No registry keys, no scheduled tasks, no admin rights. Undo it any time
    by running startup-disable.ps1, or by deleting the shortcut by hand.

    Usage
        .\startup-enable.ps1                      # opens the local index.html
        .\startup-enable.ps1 -Url "https://..."   # opens the hosted version instead
#>
[CmdletBinding()]
param(
    [string] $Url,
    [string] $Name = "Quiet Progress Tracker"
)

$ErrorActionPreference = "Stop"
$startup = [Environment]::GetFolderPath("Startup")

if ($Url) {
    if ($Url -notmatch '^https?://') { throw "-Url must start with http:// or https://" }
    $shortcut = Join-Path $startup "$Name.url"
    @('[InternetShortcut]', "URL=$Url") | Set-Content -Path $shortcut -Encoding ASCII
    $opens = $Url
}
else {
    $page = Join-Path $PSScriptRoot "index.html"
    if (-not (Test-Path -LiteralPath $page)) {
        throw "index.html not found next to this script ($PSScriptRoot). Pass -Url to use the hosted version instead."
    }
    $shortcut = Join-Path $startup "$Name.lnk"
    $shell = New-Object -ComObject WScript.Shell
    $lnk = $shell.CreateShortcut($shortcut)
    $lnk.TargetPath       = $page
    $lnk.WorkingDirectory = $PSScriptRoot
    $lnk.Description      = "Quiet Progress habit and study tracker"
    $lnk.Save()
    $opens = $page
}

Write-Host ""
Write-Host "  Startup entry created." -ForegroundColor Green
Write-Host "  Shortcut : $shortcut"
Write-Host "  Opens    : $opens"
Write-Host ""
Write-Host "  It will launch in your default browser at every sign-in."
Write-Host "  To undo:   .\startup-disable.ps1"
Write-Host ""
