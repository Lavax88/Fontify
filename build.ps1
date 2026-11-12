# Fontify - Package Build Script (Windows PowerShell)
# Author: Lava

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$ModuleName = "Fontify"
$Version = "v1.0.0"

if (Test-Path "module.prop") {
    $propLine = Get-Content "module.prop" | Where-Object { $_ -match "^version=" }
    if ($propLine) {
        $Version = ($propLine -split "=", 2)[1].Trim()
    }
}

$OutputZip = "${ModuleName}-${Version}.zip"

Write-Host "======================================"
Write-Host " Building $OutputZip "
Write-Host " Author: Lava "
Write-Host "======================================"

# 1. Build TypeScript WebUI with Vite
Write-Host ">> Compiling WebUI (TypeScript + Vite)..."
if (Get-Command "npm.cmd" -ErrorAction SilentlyContinue) {
    if (-not (Test-Path "node_modules")) {
        Write-Host ">> Installing dependencies..."
        & npm.cmd install
    }
    & npm.cmd run build
} else {
    Write-Error "npm is not installed. Please install Node.js to build Fontify."
    exit 1
}

# Ensure webroot output exists
if (-not (Test-Path "webroot/index.html")) {
    Write-Error "webroot/index.html not found after build!"
    exit 1
}

# 2. Clean up previous archives
if (Test-Path $OutputZip) {
    Remove-Item $OutputZip -Force
}

# 3. Package flashable module zip
Write-Host ">> Packaging flashable module zip..."
$filesToZip = @(
    "module.prop",
    "customize.sh",
    "hotinstall.sh",
    "uninstall.sh",
    "service.sh",
    "post-fs-data.sh",
    "bin",
    "webroot"
)

# Use tar.exe (built into modern Windows) or 7z or python to ensure standard Unix forward-slash zip structure
if (Get-Command "tar.exe" -ErrorAction SilentlyContinue) {
    & tar.exe -a -cf $OutputZip $filesToZip
} elseif (Get-Command "7z.exe" -ErrorAction SilentlyContinue) {
    & 7z.exe a -tzip $OutputZip $filesToZip
} else {
    Compress-Archive -Path $filesToZip -DestinationPath $OutputZip -Force
}

Write-Host ""
Write-Host "======================================"
Write-Host " Build Complete: $OutputZip"
Write-Host "======================================"
Get-Item $OutputZip | Select-Object Name, Length, LastWriteTime
