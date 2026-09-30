@echo off
setlocal

set "PROJECT_DIR=E:\JOEPAK\office-hours-queue-v0.1.0"
set "PORT=3000"

set "PROFESSOR_URL=http://localhost:%PORT%/auth/login"
set "STUDENT_101_URL=http://localhost:%PORT%/c/4ed0d22533834cdeb8bbe500a5908593"
set "STUDENT_302_URL=http://localhost:%PORT%/c/7e3c75b2d0c64e6ebc6ef247c7eda43d"

echo.
echo Stopping anything already using ports 3000, 3001, or 3002...
for %%A in (3000 3001 3002) do (
  for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%%A .*LISTENING"') do (
    echo Killing PID %%P on port %%A
    taskkill /F /PID %%P >nul 2>nul
  )
)

cd /d "%PROJECT_DIR%" || (
  echo Could not find project folder:
  echo %PROJECT_DIR%
  pause
  exit /b 1
)

echo.
echo Cleaning old Next cache...
if exist ".next" rmdir /s /q ".next"

echo.
echo Starting Office Hours Queue on localhost:%PORT%...
start "Office Hours Queue Dev Server" cmd /k "cd /d ""%PROJECT_DIR%"" && npm run dev -- -p %PORT%"

echo.
echo Waiting for the dev server to boot...
timeout /t 12 /nobreak >nul

set "FIREFOX="
if exist "%ProgramFiles%\Mozilla Firefox\firefox.exe" set "FIREFOX=%ProgramFiles%\Mozilla Firefox\firefox.exe"
if exist "%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe" set "FIREFOX=%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe"

if not defined FIREFOX (
  echo Firefox was not found in the standard install path.
  echo Opening professor page in your default browser instead.
  start "" "%PROFESSOR_URL%"
  echo.
  echo Open these student URLs manually in Firefox private windows:
  echo WGST 101: %STUDENT_101_URL%
  echo WGST 302: %STUDENT_302_URL%
  pause
  exit /b 0
)

echo Opening professor login in normal Firefox window...
start "Professor Login" "%FIREFOX%" -new-window "%PROFESSOR_URL%"

timeout /t 1 /nobreak >nul

echo Opening WGST 101 student page in Firefox private window...
start "Student WGST 101" "%FIREFOX%" -private-window "%STUDENT_101_URL%"

timeout /t 1 /nobreak >nul

echo Opening WGST 302 student page in Firefox private window...
start "Student WGST 302" "%FIREFOX%" -private-window "%STUDENT_302_URL%"

echo.
echo Professor: %PROFESSOR_URL%
echo WGST 101:  %STUDENT_101_URL%
echo WGST 302:  %STUDENT_302_URL%
echo.
echo Leave the dev server window open while testing.
pause
