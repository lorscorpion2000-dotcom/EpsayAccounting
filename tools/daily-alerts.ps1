# daily-alerts.ps1
# هشدارهای هوشمند روزانه — از طریق API backend
# اجرا: Scheduled Task (پیشنهاد: هر روز ساعت ۸ صبح)

$ErrorActionPreference = 'Continue'

# ═══ تنظیمات ═══
$Root       = 'E:\EpsayAccounting'
$LogDir     = Join-Path $Root 'logs\alerts'
$LogFile    = Join-Path $LogDir ('alerts-' + (Get-Date -Format 'yyyy-MM') + '.log')
$ApiBase    = 'http://172.20.18.20:3000/api'
$TelegramConfigPath = Join-Path $Root 'tools\telegram.config.json'

# ═══ Logger ═══
function Write-Log {
    param([string]$Msg, [string]$Level = 'INFO')
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Msg"
    if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    $color = switch ($Level) { 'ERROR' { 'Red' } 'WARN' { 'Yellow' } 'OK' { 'Green' } default { 'Gray' } }
    Write-Host $line -ForegroundColor $color
}

# ═══ Telegram ═══
$TelegramConfig = $null
if (Test-Path $TelegramConfigPath) {
    try { $TelegramConfig = Get-Content $TelegramConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json } catch { }
}

function Send-Telegram {
    param([string]$Text)
    if (-not $TelegramConfig) { return }
    if (-not $TelegramConfig.enabled) { return }
    $token = $TelegramConfig.botToken
    $chat  = $TelegramConfig.chatId
    if (-not $token -or $token -like '*PUT_YOUR*') { return }
    if (-not $chat  -or $chat  -like '*PUT_YOUR*') { return }
    $body = @{ chat_id = $chat; text = $Text; parse_mode = 'HTML' } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri ("https://api.telegram.org/bot" + $token + "/sendMessage") `
            -Method Post -ContentType 'application/json; charset=utf-8' `
            -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 15 -ErrorAction Stop | Out-Null
    } catch {
        Write-Log "Telegram send failed: $($_.Exception.Message)" 'WARN'
    }
}

# ═══ Get Token ═══
function Get-AuthToken {
    # ورود به سیستم با کاربر admin
    $body = @{ username = 'admin'; password = 'Admin@1404' } | ConvertTo-Json
    try {
        $res = Invoke-RestMethod -Uri "$ApiBase/auth/login" -Method Post `
            -ContentType 'application/json' -Body $body -TimeoutSec 10 -ErrorAction Stop
        return $res.accessToken
    } catch {
        Write-Log "Login failed: $($_.Exception.Message)" 'ERROR'
        return $null
    }
}

# ═══ API call ═══
function Invoke-Api {
    param([string]$Path, [string]$Token)
    try {
        $headers = @{ Authorization = "Bearer $Token" }
        return Invoke-RestMethod -Uri "$ApiBase$Path" -Headers $headers -TimeoutSec 30 -ErrorAction Stop
    } catch {
        Write-Log "API $Path failed: $($_.Exception.Message)" 'WARN'
        return $null
    }
}

# ═══ شروع ═══
Write-Log "=== Alerts started ==="

$token = Get-AuthToken
if (-not $token) {
    Send-Telegram "🔴 خطا در ورود به backend برای هشدارهای روزانه"
    exit 1
}
Write-Log "Logged in successfully" 'OK'

# ═══ جمع‌آوری هشدارها ═══
$alerts = @()

# 1) فاکتورهای خرید معوق (بیش از 30 روز از سررسید)
$purchaseInvoices = Invoke-Api '/purchase-invoices?status=APPROVED' $token
if ($purchaseInvoices) {
    $today = Get-Date
    $overdue = $purchaseInvoices | Where-Object {
        $_.dueDate -and ([datetime]$_.dueDate).AddDays(30) -lt $today -and
        ([double]$_.totalAmount - [double]$_.paidAmount) -gt 0.01
    }
    if ($overdue) {
        $total = ($overdue | Measure-Object -Property totalAmount -Sum).Sum
        $alerts += "⚠ <b>فاکتورهای خرید معوق</b>`n   تعداد: $($overdue.Count) | جمع: $([math]::Round($total / 1000000, 1)) م.ت"
    }
}

# 2) چک‌های نزدیک سررسید (تا 3 روز آینده)
$cheques = Invoke-Api '/cheques' $token
if ($cheques) {
    $today = Get-Date
    $soon = $cheques | Where-Object {
        $_.status -eq 'PENDING' -and $_.dueDate -and
        ([datetime]$_.dueDate) -ge $today -and
        ([datetime]$_.dueDate) -le $today.AddDays(3)
    }
    if ($soon) {
        $alerts += "🔔 <b>چک‌های نزدیک سررسید (۳ روز)</b>`n   تعداد: $($soon.Count)"
        foreach ($c in $soon | Select-Object -First 5) {
            $d = ([datetime]$c.dueDate).ToString('yyyy-MM-dd')
            $amt = [math]::Round([double]$c.amount / 1000000, 1)
            $alerts += "   • $($c.serial) — $d — $amt م.ت"
        }
        if ($soon.Count -gt 5) { $alerts += "   ... و $($soon.Count - 5) چک دیگر" }
    }
}

# 3) اقلام زیر حد تجدید سفارش
$items = Invoke-Api '/warehouse/items' $token
if ($items) {
    $lowStock = $items | Where-Object {
        $_.isActive -and $_.reorderPoint -and ([double]$_.totalStock -lt [double]$_.reorderPoint)
    }
    if ($lowStock) {
        $alerts += "📦 <b>اقلام زیر حد تجدید سفارش</b>`n   تعداد: $($lowStock.Count)"
        foreach ($it in $lowStock | Select-Object -First 5) {
            $alerts += "   • $($it.name): موجودی $([math]::Round([double]$it.totalStock, 2)) / حد $($it.reorderPoint)"
        }
        if ($lowStock.Count -gt 5) { $alerts += "   ... و $($lowStock.Count - 5) قلم دیگر" }
    }
}

# 4) پروژه‌های دارای انحراف بودجه (از WIP overview)
$wipOverview = Invoke-Api '/wip/overview' $token
if ($wipOverview -and $wipOverview.rows) {
    $over = $wipOverview.rows | Where-Object {
        $_.contractAmount -gt 0 -and
        ([double]$_.realCost / [double]$_.contractAmount) -gt 0.9 -and
        ([double]$_.progressPct -lt 90)
    }
    if ($over) {
        $alerts += "💰 <b>هشدار انحراف بودجه</b>`n   تعداد: $($over.Count) پروژه با هزینه بالا و پیشرفت کم"
        foreach ($r in $over | Select-Object -First 3) {
            $costPct = [math]::Round((([double]$r.realCost / [double]$r.contractAmount) * 100), 1)
            $progPct = [math]::Round([double]$r.progressPct, 1)
            $alerts += "   • $($r.project.code): هزینه $costPct% / پیشرفت $progPct%"
        }
    }
}
# 5) فاکتورهای فروش معوق
$salesInvoices = Invoke-Api '/sales-invoices?status=APPROVED' $token
if ($salesInvoices) {
    $today = Get-Date
    $overdueAR = $salesInvoices | Where-Object {
        $_.dueDate -and ([datetime]$_.dueDate).AddDays(30) -lt $today -and
        ([double]$_.totalAmount - [double]$_.receivedAmount) -gt 0.01
    }
    if ($overdueAR) {
        $total = ($overdueAR | Measure-Object -Property totalAmount -Sum).Sum
        $alerts += "⏰ <b>مطالبات معوق</b>`n   تعداد: $($overdueAR.Count) | جمع: $([math]::Round($total / 1000000, 1)) م.ت"
    }
}

# ═══ ارسال ═══
if ($alerts.Count -eq 0) {
    Write-Log "No alerts today" 'OK'
} else {
    $hostName = $env:COMPUTERNAME
    $dateStr = (Get-Date).ToString('yyyy-MM-dd HH:mm')
    $header = "📊 <b>هشدارهای روزانه اپسای</b>`n<i>$hostName — $dateStr</i>`n"
    $text = $header + "`n" + ($alerts -join "`n`n")
    $text += "`n`n━━━━━━━━━━━━━━━━"
    $text += "`n🔗 $ApiBase/../../"
    Send-Telegram $text
    Write-Log "Sent $($alerts.Count) alert group(s) to Telegram" 'OK'
}

Write-Log "=== Alerts finished ==="
exit 0
