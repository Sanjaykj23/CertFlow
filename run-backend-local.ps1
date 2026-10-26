# Starts the CertFlow Java backend (zero-Docker mode). Reads settings from .env in this folder.
Set-Location $PSScriptRoot
Write-Host "Starting CertFlow Java backend on http://localhost:8081 ..." -ForegroundColor Green

if (-not (Get-Command java -ErrorAction SilentlyContinue) -and -not $env:JAVA_HOME) {
  Write-Host "Java was not found. Install JDK 17+ and make sure 'java -version' works in a new window." -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}

if (Test-Path .env) {
  Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
      $i = $line.IndexOf('=')
      $name = $line.Substring(0, $i).Trim()
      $value = $line.Substring($i + 1).Trim()
      # Strip one pair of surrounding quotes: KEY="value" or KEY='value'
      if ($value.Length -ge 2 -and (($value[0] -eq '"' -and $value[-1] -eq '"') -or ($value[0] -eq "'" -and $value[-1] -eq "'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      if ($name) { [Environment]::SetEnvironmentVariable($name, $value, 'Process') }
    }
  }
  if ($env:SMTP_USERNAME -like 'FILL ME*' -or $env:SMTP_PASSWORD -like 'FILL ME*') {
    Write-Host "WARNING: SMTP_USERNAME / SMTP_PASSWORD in .env are not filled in. Sign-up codes and certificate emails will fail." -ForegroundColor Yellow
  }
} else {
  Write-Host ".env not found - using built-in defaults (embedded H2 database, no email). See LOCAL_SETUP.md." -ForegroundColor Yellow
}

# Free port 8081 if a previous backend is still running (skip System/Idle pseudo-processes)
Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  Where-Object { $_ -gt 4 } |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 1 }

$env:MAVEN_OPTS = "-Xmx384m -Xms64m -XX:MaxMetaspaceSize=192m -XX:+UseSerialGC -Djava.net.preferIPv4Stack=true"

# certflow-api depends on certflow-common, so build and install it (and the parent pom) into ~/.m2 first.
# Without this, "spring-boot:run -pl certflow-api" cannot resolve com.certflow:certflow-common.
& .\mvnw.cmd -B install -pl certflow-common -am -DskipTests
if ($LASTEXITCODE -ne 0) {
  Write-Host "Building certflow-common failed (see errors above)." -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}

& .\mvnw.cmd -B spring-boot:run -pl certflow-api "-Dspring-boot.run.profiles=local" "-Dspring-boot.run.jvmArguments=-Xmx512m -Xms64m -XX:+UseSerialGC -Djava.net.preferIPv4Stack=true"
Read-Host "Backend stopped. Press Enter to close"
