@echo off
set "MAVEN_EXE=C:\Users\kjsan\.m2\wrapper\dists\apache-maven-3.9.12-bin\5nmfsn99br87k5d4ajlekdq10k\apache-maven-3.9.12\bin\mvn.cmd"
if exist "%MAVEN_EXE%" (
    call "%MAVEN_EXE%" %*
) else (
    mvn %*
)
