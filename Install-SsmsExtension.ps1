# PowerShell Script to Install SQL Server Plan Visualizer into SSMS
# Supports SSMS 18, 19, 20, 21, and SSMS 22
# Automatically targets both Modern SSMS AppData (SSMS\22.0_*) and Legacy (SQL Server Management Studio\*_IsoShell)

param (
    [string]$TargetSsmsPath = ""
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Installing SQL Plan Visualizer into SSMS                " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$sourceDir = Join-Path $PSScriptRoot "SsmsExtension\bin\Release"
if (-not (Test-Path (Join-Path $sourceDir "SsmsPlanVisualizer.dll"))) {
    Write-Error "Build output not found at: $sourceDir. Please build the project first."
    exit 1
}

$installedCount = 0

# 1. Target Modern SSMS 21/22 User Profiles (%LOCALAPPDATA%\Microsoft\SSMS\<version>_*)
$ssmsModernDirs = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\SSMS" -Directory -Filter "*.*_*" -ErrorAction SilentlyContinue

foreach ($shell in $ssmsModernDirs) {
    $versionName = $shell.Name
    $userExtDir = Join-Path $shell.FullName "Extensions"
    $targetDir = Join-Path $userExtDir "SsmsPlanVisualizer"
    $cacheDir = Join-Path $shell.FullName "ComponentModelCache"
    
    Write-Host "`n[User Profile] Installing to SSMS $versionName..." -ForegroundColor Green
    Write-Host "Destination: $targetDir" -ForegroundColor Gray

    try {
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Copy-Item -Path (Join-Path $sourceDir "*") -Destination $targetDir -Recurse -Force
        
        # Invalidate metadata and MEF caches
        Get-ChildItem -Path $userExtDir -Filter "ExtensionMetadata*.mpack" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
        New-Item -ItemType File -Path (Join-Path $userExtDir "extensions.configurationchanged") -Force | Out-Null
        if (Test-Path $cacheDir) {
            Get-ChildItem -Path $cacheDir -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
        }

        Write-Host "Successfully installed into SSMS $versionName!" -ForegroundColor Green
        $installedCount++
    }
    catch {
        Write-Warning "Could not install to $($targetDir): $_"
    }
}

# 2. Target SSMS 18/19/20 User Profiles (%LOCALAPPDATA%\Microsoft\SQL Server Management Studio\*_IsoShell)
$userIsoShells = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\SQL Server Management Studio" -Directory -Filter "*_IsoShell" -ErrorAction SilentlyContinue

foreach ($shell in $userIsoShells) {
    $versionName = $shell.Name
    $userExtDir = Join-Path $shell.FullName "Extensions"
    $targetDir = Join-Path $userExtDir "SsmsPlanVisualizer"
    $cacheDir = Join-Path $shell.FullName "ComponentModelCache"
    
    Write-Host "`n[User Profile] Installing to SSMS $versionName..." -ForegroundColor Green
    Write-Host "Destination: $targetDir" -ForegroundColor Gray

    try {
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Copy-Item -Path (Join-Path $sourceDir "*") -Destination $targetDir -Recurse -Force
        
        # Clear extension caches
        Get-ChildItem -Path $userExtDir -Filter "extensions*.cache" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
        New-Item -ItemType File -Path (Join-Path $userExtDir "extensions.configurationchanged") -Force | Out-Null
        if (Test-Path $cacheDir) {
            Get-ChildItem -Path $cacheDir -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
        }

        Write-Host "Successfully installed into SSMS $versionName!" -ForegroundColor Green
        $installedCount++
    }
    catch {
        Write-Warning "Could not install to $($targetDir): $_"
    }
}

# 3. Target System-wide Program Files if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$systemCandidates = @(
    "C:\Program Files\Microsoft SQL Server Management Studio 22\Release\Common7\IDE",
    "C:\Program Files\Microsoft SQL Server Management Studio 21\Release\Common7\IDE",
    "C:\Program Files\Microsoft SQL Server Management Studio 20\Common7\IDE",
    "C:\Program Files (x86)\Microsoft SQL Server Management Studio 19\Common7\IDE",
    "C:\Program Files (x86)\Microsoft SQL Server Management Studio 18\Common7\IDE"
)

if ($TargetSsmsPath -ne "" -and (Test-Path $TargetSsmsPath)) {
    $systemCandidates = @($TargetSsmsPath)
}

foreach ($idePath in $systemCandidates) {
    if (Test-Path (Join-Path $idePath "Ssms.exe")) {
        $extensionsDir = Join-Path $idePath "Extensions"
        $destDir = Join-Path $extensionsDir "SsmsPlanVisualizer"
        
        Write-Host "`n[System-wide] Checking: $idePath..." -ForegroundColor Cyan
        
        if (-not $isAdmin) {
            Write-Host "  Skipping Program Files write (User Profile install above is active and sufficient)." -ForegroundColor Yellow
            continue
        }

        try {
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            Copy-Item -Path (Join-Path $sourceDir "*") -Destination $destDir -Recurse -Force
            
            $configChangedFile = Join-Path $extensionsDir "extensions.configurationchanged"
            New-Item -ItemType File -Path $configChangedFile -Force | Out-Null

            Write-Host "  Successfully installed system-wide into $destDir!" -ForegroundColor Green
            $installedCount++
        }
        catch {
            Write-Warning "Could not write to $($destDir): $_"
        }
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
if ($installedCount -gt 0) {
    Write-Host "Installation Complete! ($installedCount location(s) updated)" -ForegroundColor Green
    Write-Host "To open the visualizer in SSMS:" -ForegroundColor White
    Write-Host "  1. Close and Re-open SSMS" -ForegroundColor White
    Write-Host "  2. Go to: Tools -> SQL Execution Plan Visualizer" -ForegroundColor Yellow
    Write-Host "     or:    View -> SQL Execution Plan Visualizer" -ForegroundColor Yellow
} else {
    Write-Warning "No installations updated."
}
Write-Host "==========================================================" -ForegroundColor Cyan
