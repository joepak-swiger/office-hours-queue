@echo off
setlocal
echo Starting Office Hours Queue in development mode...
echo.
if not exist node_modules (
  echo node_modules was not found. Installing dependencies first...
  npm install
  if errorlevel 1 exit /b %errorlevel%
)
npm run dev
