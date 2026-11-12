@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\vite\bin\vite.js" (
  echo Dependencies are missing. Open README.md and run the installation command first.
  pause
  exit /b 1
)

set "NODE_EXE="
where node.exe >nul 2>nul
if not errorlevel 1 set "NODE_EXE=node.exe"

if not defined NODE_EXE (
  for /d %%D in ("C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.*") do (
    if exist "%%~fD\dependencies\node\bin\node.exe" set "NODE_EXE=%%~fD\dependencies\node\bin\node.exe"
  )
)

if not defined NODE_EXE (
  set "NODE_EXE=C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1030-493-0_26.1030.493.0_x64__3k8sg7r9htsxt\dependencies\node\bin\node.exe"
)

if not exist "%NODE_EXE%" if not "%NODE_EXE%"=="node.exe" (
  echo Node.js was not found. Install Node.js or run this project from the Codex terminal.
  pause
  exit /b 1
)

echo Starting BYTOVKIn at http://127.0.0.1:5173/
echo Keep this window open while using the site. Press Ctrl+C to stop.
"%NODE_EXE%" "node_modules\vite\bin\vite.js" --host 127.0.0.1 --open

if errorlevel 1 (
  echo.
  echo The site did not start. Send the error shown above to Codex.
  pause
)
