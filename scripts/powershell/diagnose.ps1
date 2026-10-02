# diagnose.ps1 - ASCII only, no encoding issues
$ErrorActionPreference = 'Continue'
$Root = "E:\EpsayAccounting"
$Frontend = Join-Path $Root "frontend"

function Section($title) {
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
}

function Show-File($path) {
    if (Test-Path $path) {
        $size = [math]::Round((Get-Item $path).Length / 1KB, 2)
        Write-Host ""
        Write-Host "// ===== FILE: $path ($size KB) =====" -ForegroundColor Yellow
        Write-Host ""
        Get-Content $path -Encoding UTF8 | ForEach-Object { Write-Host $_ }
    } else {
        Write-Host "[X] File not found: $path" -ForegroundColor Red
    }
}

Section "1. FRONTEND KEY FILES"
$srcDir = Join-Path $Frontend "src"
$keyFiles = @(
    "vite.config.ts",
    "vite.config.js",
    "package.json",
    "tsconfig.json",
    "src\app\router.tsx",
    "src\app\router.jsx",
    "src\components\PageLoader.tsx",
    "src\main.tsx",
    "src\App.tsx",
    "index.html"
)
foreach ($f in $keyFiles) {
    $full = Join-Path $Frontend $f
    if (Test-Path $full) {
        $sz = [math]::Round((Get-Item $full).Length / 1KB, 2)
        Write-Host "  [OK] $f ($sz KB)" -ForegroundColor Green
    } else {
        Write-Host "  [--] $f" -ForegroundColor DarkGray
    }
}

Section "2. VITE CONFIG"
Show-File (Join-Path $Frontend "vite.config.ts")
Show-File (Join-Path $Frontend "vite.config.js")

Section "3. ROUTER.TSX"
Show-File (Join-Path $Frontend "src\app\router.tsx")

Section "4. PACKAGE.JSON"
$pkgPath = Join-Path $Frontend "package.json"
if (Test-Path $pkgPath) {
    $pkg = Get-Content $pkgPath -Raw -Encoding UTF8 | ConvertFrom-Json
    Write-Host ""
    Write-Host "Dependencies:" -ForegroundColor Yellow
    $pkg.dependencies.PSObject.Properties | Sort-Object Name | ForEach-Object {
        Write-Host "  $($_.Name.PadRight(40)) $($_.Value)"
    }
    Write-Host ""
    Write-Host "DevDependencies:" -ForegroundColor Yellow
    $pkg.devDependencies.PSObject.Properties | Sort-Object Name | ForEach-Object {
        Write-Host "  $($_.Name.PadRight(40)) $($_.Value)"
    }
    Write-Host ""
    Write-Host "Scripts:" -ForegroundColor Yellow
    $pkg.scripts.PSObject.Properties | ForEach-Object {
        Write-Host "  $($_.Name.PadRight(20)) = $($_.Value)"
    }
}

Section "5. LAZY IMPORT ANALYSIS"
$routerPath = Join-Path $Frontend "src\app\router.tsx"
if (Test-Path $routerPath) {
    $content = Get-Content $routerPath -Raw -Encoding UTF8
    $lazyCount = ([regex]::Matches($content, 'lazy\(')).Count
    $importCount = ([regex]::Matches($content, '(?m)^import ')).Count
    Write-Host ""
    Write-Host "  Lazy imports:   $lazyCount"
    Write-Host "  Static imports: $importCount"
    if ($importCount -gt 5 -and $lazyCount -eq 0) {
        Write-Host ""
        Write-Host "  [!] No lazy loading detected - all pages static imported!" -ForegroundColor Red
    }
}

Section "6. SCRIPTS FOLDER"
$scriptsDir = Join-Path $Root "scripts\powershell"
if (Test-Path $scriptsDir) {
    Get-ChildItem $scriptsDir -File | ForEach-Object {
        $sz = [math]::Round($_.Length/1KB,2)
        Write-Host "  [PS1] $($_.Name) ($sz KB)"
    }
} else {
    Write-Host "  [X] scripts\powershell not found" -ForegroundColor Red
}

$backupDir = Join-Path $Root "backups"
if (Test-Path $backupDir) {
    Write-Host ""
    Write-Host "  backups/ exists" -ForegroundColor Green
    Get-ChildItem $backupDir -File | Select-Object -Last 5 | ForEach-Object {
        $mb = [math]::Round($_.Length/1MB,2)
        Write-Host "    $($_.Name) ($mb MB)"
    }
} else {
    Write-Host "  [!] backups/ not found" -ForegroundColor Yellow
}

Section "7. HEAVY LIBRARIES USAGE COUNT"
$heavyLibs = @('recharts', 'xlsx-js-style', 'xlsx', 'react-multi-date-picker', 'lucide-react', 'react-to-print')
foreach ($lib in $heavyLibs) {
    $files = Get-ChildItem $srcDir -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue | 
             Select-String -Pattern "from '$lib'" -SimpleMatch -ErrorAction SilentlyContinue
    $count = @($files).Count
    Write-Host "  $($lib.PadRight(30)) : $count files"
}

Section "8. HELP CONTENT"
$helpPath = Join-Path $Frontend "src\modules\help\helpContent.ts"
if (Test-Path $helpPath) {
    $size = [math]::Round((Get-Item $helpPath).Length / 1KB, 2)
    Write-Host "  helpContent.ts: $size KB"
    $content = Get-Content $helpPath -Raw -Encoding UTF8
    $entryCount = ([regex]::Matches($content, "'/[^']+':")).Count
    Write-Host "  Pages in help: $entryCount"
} else {
    Write-Host "  [X] helpContent.ts not found" -ForegroundColor Red
}

Section "9. BUILD OUTPUT (dist)"
$distDir = Join-Path $Frontend "dist"
if (Test-Path $distDir) {
    $assetsDir = Join-Path $distDir "assets"
    if (Test-Path $assetsDir) {
        Get-ChildItem $assetsDir -File | Sort-Object Length -Descending | Select-Object -First 15 | ForEach-Object {
            $sizeKB = [math]::Round($_.Length / 1KB, 2)
            Write-Host "  $($_.Name.PadRight(55)) $sizeKB KB"
        }
        $sum = (Get-ChildItem $assetsDir -File | Measure-Object Length -Sum).Sum
        $totalKB = [math]::Round($sum / 1KB, 2)
        Write-Host ""
        Write-Host "  TOTAL: $totalKB KB" -ForegroundColor Cyan
    }
} else {
    Write-Host "  [!] No dist folder - not built yet" -ForegroundColor Yellow
}

Section "10. NODE_MODULES LOCK"
$pkgLock = Join-Path $Frontend "package-lock.json"
$yarnLock = Join-Path $Frontend "yarn.lock"
$pnpmLock = Join-Path $Frontend "pnpm-lock.yaml"
if (Test-Path $pkgLock) { Write-Host "  npm (package-lock.json)" }
if (Test-Path $yarnLock) { Write-Host "  yarn (yarn.lock)" }
if (Test-Path $pnpmLock) { Write-Host "  pnpm (pnpm-lock.yaml)" }

Section "DONE"
Write-Host ""
Write-Host "Copy this output and send it back." -ForegroundColor Green
Write-Host ""