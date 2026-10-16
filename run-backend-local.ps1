# Starts the CertFlow Java backend (zero-Docker mode). Reads settings from .env in this folder.
Set-Location $PSScriptRoot
Write-Host "Starting CertFlow Java backend on http://localhost:8081 ..." -ForegroundColor Green
if (Test-Path .env) {
  Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
      $i = $line.IndexOf('=')
      [Environment]::SetEnvironmentVariable($line.Substring(0,$i).Trim(), $line.Substring($i+1).Trim(), 'Process')
    }
  }
  if ($env:SMTP_USERNAME -like 'FILL ME*' -or $env:SMTP_PASSWORD -like 'FILL ME*') {
    Write-Host "WARNING: SMTP_USERNAME / SMTP_PASSWORD in .env are not filled in. Sign-up codes and certificate emails will fail." -ForegroundColor Yellow
  }
} else {
  Write-Host ".env not found. Copy .env.example to .env first." -ForegroundColor Red
}
$existingPort = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
if ($existingPort) {
  Stop-Process -Id $existingPort.OwningProcess -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
}
$env:MAVEN_OPTS = "-Xmx384m -Xms64m -XX:MaxMetaspaceSize=192m -XX:+UseSerialGC -Djava.net.preferIPv4Stack=true"
.\mvnw.cmd spring-boot:run -pl certflow-api "-Dspring-boot.run.profiles=local" "-Dspring-boot.run.jvmArguments=-Xmx512m -Xms64m -XX:+UseSerialGC -Djava.net.preferIPv4Stack=true"
Read-Host "Backend stopped. Press Enter to close"
