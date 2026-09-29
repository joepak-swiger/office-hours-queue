@echo off
setlocal
echo Building Office Hours Queue for production...
echo.
if not exist node_modules (
  echo node_modules was not found. Installing dependencies first...
  npm install
  if errorlevel 1 exit /b %errorlevel%
)
npm run build
