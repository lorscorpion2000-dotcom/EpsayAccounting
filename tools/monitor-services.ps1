# monitor-services.ps1
param([switch]$Verbose)

$ErrorActionPreference = 'Continue'

$ServicesToWatch = @(
    @{ Name = 'Epsay-Backend';  Url = 'http://localhost:3000/api/health'; RetrySeconds = 20 },
    @{ Name = 'Epsay-Frontend'; Url = 'http://localhost:5173'; RetrySeconds = 10 }
)
$LogDir  = 'E:\EpsayAccounting\logs\monitor'
$LogFile = Join-Path $LogDir ('monitor-' + (Get-Date -Format 'yyyy-MM') + '.log')
$MaxLogLines = 5000

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    if ($Verbose) { Write-Host $line }
}

function Test-HttpEndpoint {
    param([string]$Url, [int]$TimeoutSec = 5)
    try {
        $resp = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
        return @{ Ok = $true; Status = $resp.StatusCode }
    } catch {
        return @{ Ok = $false; Status = $_.Exception.Message }
    }
}

Write-Log '=== Monitoring started ==='
$restartCount = 0

foreach ($svc in $ServicesToWatch) {
    $name = $svc.Name
    $url  = $svc.Url

    try {
        $service = Get-Service -Name $name -ErrorAction Stop
    } catch {
        Write-Log "Service $name not found" 'ERROR'
        continue
    }

    if ($service.Status -eq 'Paused') {
        Write-Log "Service $name is Paused - full cleanup + restart" 'WARN'
        Get-Process nssm -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep 2
        sc.exe delete $name 2>&1 | Out-Null
        Start-Sleep 3

        $NSSM = "C:\ProgramData\chocolatey\bin\nssm.exe"
        if (-not (Test-Path $NSSM)) {
            $NSSM = "C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe"
        }

        if ($name -eq 'Epsay-Backend') {
            & $NSSM install $name "node.exe" "E:\EpsayAccounting\backend\dist\src\main.js"
            & $NSSM set $name AppDirectory "E:\EpsayAccounting\backend"
            & $NSSM set $name AppEnvironmentExtra "NODE_ENV=production" "PORT=3000"
            & $NSSM set $name AppStdout "E:\EpsayAccounting\logs\backend-out.log"
            & $NSSM set $name AppStderr "E:\EpsayAccounting\logs\backend-err.log"
        } elseif ($name -eq 'Epsay-Frontend') {
            $serveCmd = "C:\Users\M.Amini\AppData\Roaming\npm\serve.cmd"
            & $NSSM install $name $serveCmd "-s dist -l 5173"
            & $NSSM set $name AppDirectory "E:\EpsayAccounting\frontend"
            & $NSSM set $name AppStdout "E:\EpsayAccounting\logs\frontend-out.log"
            & $NSSM set $name AppStderr "E:\EpsayAccounting\logs\frontend-err.log"
        }

        & $NSSM set $name AppRotateFiles 1
        & $NSSM set $name AppRotateBytes 10485760
        & $NSSM set $name Start SERVICE_AUTO_START
        & $NSSM set $name AppExit Default Restart
        & $NSSM set $name AppRestartDelay 5000
        & $NSSM set $name AppThrottle 10000

        & $NSSM start $name
        Start-Sleep 15
        $service.Refresh()
        if ($service.Status -eq 'Running') {
            Write-Log "Service $name reset+restarted successfully" 'RESTART'
            $restartCount++
        } else {
            Write-Log "Service $name still not running after reset" 'ERROR'
        }
    } elseif ($service.Status -ne 'Running') {
        Write-Log "Service $name status=$($service.Status) - attempting restart" 'WARN'
        try {
            Stop-Service -Name $name -Force -ErrorAction SilentlyContinue
            Start-Sleep 2
            Start-Service -Name $name -ErrorAction Stop
            Start-Sleep 3
            $service.Refresh()
            if ($service.Status -eq 'Running') {
                Write-Log "Service $name restarted successfully" 'RESTART'
                $restartCount++
            } else {
                Write-Log "Service $name still not running" 'ERROR'
            }
        } catch {
            Write-Log "Failed to restart $name : $($_.Exception.Message)" 'ERROR'
            continue
        }
    }

    if ($url) {
        $check = Test-HttpEndpoint -Url $url -TimeoutSec 5
        if ($check.Ok) {
            Write-Log "$name HTTP OK ($($check.Status))"
        } else {
            Write-Log "$name HTTP FAIL - $($check.Status)" 'WARN'
            Start-Sleep -Seconds $svc.RetrySeconds
            $check2 = Test-HttpEndpoint -Url $url -TimeoutSec 5
            if ($check2.Ok) {
                Write-Log "$name HTTP recovered" 'RESTART'
            } else {
                Write-Log "$name HTTP still failing - restarting service" 'WARN'
                try {
                    Restart-Service -Name $name -Force -ErrorAction Stop
                    Write-Log "$name restarted" 'RESTART'
                    $restartCount++
                } catch {
                    Write-Log "Failed to restart $name : $($_.Exception.Message)" 'ERROR'
                }
            }
        }
    }
}

Write-Log "=== Monitoring finished (restarts=$restartCount) ==="
exit 0