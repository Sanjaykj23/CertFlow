Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting CertFlow Java Backend (Zero-Docker Mode)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
$existingPort = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
if ($existingPort) {
    Write-Host "Releasing port 8081 (PID: $($existingPort.OwningProcess))..." -ForegroundColor Yellow
    Stop-Process -Id $existingPort.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}
$env:MAVEN_OPTS = "-Xmx384m -Xms64m -XX:MaxMetaspaceSize=192m -XX:+UseSerialGC -Djava.net.preferIPv4Stack=true"
.\mvnw.cmd spring-boot:run -pl certflow-api "-Dspring-boot.run.profiles=local" "-Dspring-boot.run.jvmArguments=-Xmx384m -Xms64m -XX:+UseSerialGC -Djava.net.preferIPv4Stack=true"
