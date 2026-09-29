@echo off
setlocal
echo Running Office Hours Queue tests...
echo.
if not exist node_modules (
  echo node_modules was not found. Installing dependencies first...
  npm install
  if errorlevel 1 exit /b %errorlevel%
)
npm run test
