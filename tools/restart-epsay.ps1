Get-Service Epsay-Backend | Format-Table Name, Status
Stop-Service Epsay-Backend -Force -ErrorAction Continue
Start-Sleep -Seconds 2
Start-Service Epsay-Backend -ErrorAction Continue
Start-Sleep -Seconds 2
Get-Service Epsay-Backend | Format-Table Name, Status