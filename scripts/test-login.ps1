$body = '{"username":"admin","password":"Admin@1234"}'
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/auth/login' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
  Write-Host "SUCCESS: HTTP $($r.StatusCode)" -ForegroundColor Green
  Write-Host $r.Content
} catch {
  Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response) {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host $reader.ReadToEnd() -ForegroundColor Yellow
  }
}