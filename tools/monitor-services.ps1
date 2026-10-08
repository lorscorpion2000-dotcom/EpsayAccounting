# monitor-services.ps1
param([switch]$Verbose)

$ErrorActionPreference = 'Continue'

$ServicesToWatch = @(
    @{ Name = 'Epsay-Backend';  Url = 'http://localhost:3000/api/health'; RetrySeconds = 30 },
    @{ Name = 'Epsay-Frontend'; Url = 'http://localhost:5173';            RetrySeconds = 20 }
)
$LogDir      = 'E:\EpsayAccounting\logs\monitor'
$LogFile     = Join-Path $LogDir ('monitor-' + (Get-Date -Format 'yyyy-MM') + '.log')
$MaxLogLines = 5000

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    if ($Verbose) {
        $color = switch ($Level) {
            'ERROR'   { 'Red' }
            'WARN'    { 'Yellow' }
            'RESTART' { 'Magenta' }
            default   { 'Gray' }
        }
        Write-Host $line -ForegroundColor $color
    }
}

# HTTP test via curl.exe (Invoke-WebRequest times out in PS 5.1)
function Test-HttpEndpoint {
    param([string]$Url, [int]$TimeoutSec = 8)
    try {
        $output = & curl.exe -s -o NUL -w "%{http_code}" --max-time $TimeoutSec $Url 2>$null
        $code = [int]$output
        if ($code -ge 200 -and $code -lt 400) {
            return @{ Ok = $true; Status = $code }
        }
        return @{ Ok = $false; Status = "HTTP $code" }
    } catch {
        return @{ Ok = $false; Status = "err: $($_.Exception.Message)" }
    }
}

function Reset-Service {
    param([string]$Name)
    Write-Log "RESET $Name starting" 'RESTART'

    Get-Process nssm -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep 3

    sc.exe delete $Name 2>&1 | Out-Null
    Start-Sleep 3

    $NSSM = "C:\ProgramData\chocolatey\bin\nssm.exe"
    if (-not (Test-Path $NSSM)) {
        $NSSM = "C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe"
    }

    if ($Name -eq 'Epsay-Backend') {
        & $NSSM install $Name "node.exe" "E:\EpsayAccounting\backend\dist\src\main.js" 2>&1 | Out-Null
        & $NSSM set $Name AppDirectory "E:\EpsayAccounting\backend" 2>&1 | Out-Null
        & $NSSM set $Name AppEnvironmentExtra "NODE_ENV=production" "PORT=3000" 2>&1 | Out-Null
        & $NSSM set $Name AppStdout "E:\EpsayAccounting\logs\backend-out.log" 2>&1 | Out-Null
        & $NSSM set $Name AppStderr "E:\EpsayAccounting\logs\backend-err.log" 2>&1 | Out-Null
    } elseif ($Name -eq 'Epsay-Frontend') {
        $serveCmd = "C:\Users\M.Amini\AppData\Roaming\npm\serve.cmd"
        & $NSSM install $Name $serveCmd "-s dist -l 5173 --config serve.json" 2>&1 | Out-Null
        & $NSSM set $Name AppDirectory "E:\EpsayAccounting\frontend" 2>&1 | Out-Null
        & $NSSM set $Name AppStdout "E:\EpsayAccounting\logs\frontend-out.log" 2>&1 | Out-Null
        & $NSSM set $Name AppStderr "E:\EpsayAccounting\logs\frontend-err.log" 2>&1 | Out-Null
    }

    & $NSSM set $Name AppRotateFiles 1 2>&1 | Out-Null
    & $NSSM set $Name AppRotateBytes 10485760 2>&1 | Out-Null
    & $NSSM set $Name Start SERVICE_AUTO_START 2>&1 | Out-Null
    & $NSSM set $Name AppExit Default Restart 2>&1 | Out-Null
    & $NSSM set $Name AppRestartDelay 5000 2>&1 | Out-Null
    & $NSSM set $Name AppThrottle 10000 2>&1 | Out-Null

    & $NSSM start $Name 2>&1 | Out-Null
    Start-Sleep 20

    $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -eq 'Running') {
        Write-Log "RESET $Name OK" 'RESTART'
        return $true
    }
    Write-Log "RESET $Name failed - status: $($svc.Status)" 'ERROR'
    return $false
}

Write-Log '=== Monitoring started ==='
$restartCount = 0

foreach ($svcConfig in $ServicesToWatch) {
    $name = $svcConfig.Name
    $url  = $svcConfig.Url

    $service = Get-Service -Name $name -ErrorAction SilentlyContinue
    if (-not $service) {
        Write-Log "Service $name not found - RESET" 'WARN'
        if (Reset-Service -Name $name) { $restartCount++ }
        continue
    }

    if ($service.Status -eq 'Paused') {
        Write-Log "Service $name Paused - RESET" 'WARN'
        if (Reset-Service -Name $name) { $restartCount++ }
        continue
    }

    if ($service.Status -ne 'Running') {
        Write-Log "Service $name status=$($service.Status) - trying start" 'WARN'
        try {
            Start-Service -Name $name -ErrorAction Stop
            Start-Sleep 8
            $service.Refresh()
            if ($service.Status -eq 'Running') {
                Write-Log "Service $name started OK" 'RESTART'
                $restartCount++
            } else {
                Write-Log "Service $name still not running - RESET" 'ERROR'
                if (Reset-Service -Name $name) { $restartCount++ }
            }
        } catch {
            Write-Log "Start-Service $name failed: $($_.Exception.Message) - RESET" 'ERROR'
            if (Reset-Service -Name $name) { $restartCount++ }
        }
        continue
    }

    if ($url) {
        $check = Test-HttpEndpoint -Url $url -TimeoutSec 8
        if ($check.Ok) {
            Write-Log "$name HTTP OK ($($check.Status))"
            continue
        }

        Write-Log "$name HTTP FAIL - $($check.Status) - retry in $($svcConfig.RetrySeconds)s" 'WARN'
        Start-Sleep -Seconds $svcConfig.RetrySeconds

        $check2 = Test-HttpEndpoint -Url $url -TimeoutSec 8
        if ($check2.Ok) {
            Write-Log "$name HTTP recovered after retry" 'RESTART'
            continue
        }

        Write-Log "$name HTTP still failing - RESET" 'ERROR'
        if (Reset-Service -Name $name) { $restartCount++ }
    }
}

if (Test-Path $LogFile) {
    $lineCount = (Get-Content $LogFile -ErrorAction SilentlyContinue).Count
    if ($lineCount -gt $MaxLogLines) {
        $keep = $lineCount - $MaxLogLines
        $content = Get-Content $LogFile -ErrorAction SilentlyContinue
        $content | Select-Object -Skip $keep | Set-Content -Path $LogFile -Encoding UTF8
        Write-Log "Log trimmed (removed $keep old lines)" 'INFO'
    }
}

Write-Log "=== Monitoring finished (restarts=$restartCount) ==="
exit 0
