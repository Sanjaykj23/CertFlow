@echo off
echo ========================================================
echo   Starting CertFlow Java Backend (Zero-Docker Mode)
echo ========================================================
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8081 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
set MAVEN_OPTS=-Xmx384m -Xms64m -XX:MaxMetaspaceSize=192m -XX:+UseSerialGC
call .\mvnw.cmd spring-boot:run -pl certflow-api "-Dspring-boot.run.profiles=local" "-Dspring-boot.run.jvmArguments=-Xmx384m -Xms64m -XX:+UseSerialGC"
pause
