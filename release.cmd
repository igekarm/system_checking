@echo off
setlocal
if "%~1"=="" (
  echo Usage: release.cmd VERSION [COMMIT_MESSAGE]
  echo Example: release.cmd 0.1.8 "Add Oracle Database provider"
  exit /b 2
)
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0scripts\publish-release.ps1" -Version "%~1" -CommitMessage "%~2"
exit /b %errorlevel%
