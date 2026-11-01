@echo off
chcp 65001 >nul
title ATLAS Earth Intelligence
cd /d "%~dp0"
echo.
echo ===============================================
echo       ATLAS - EARTH INTELLIGENCE
 echo ===============================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado. Descargalo de https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Instalando dependencias por primera vez...
  call npm.cmd install
  if errorlevel 1 (
    echo ERROR al instalar dependencias.
    pause
    exit /b 1
  )
)
echo.
echo Abri http://localhost:3000 en tu navegador.
echo Para cerrar el servidor, presiona Ctrl+C.
echo.
call npm.cmd run dev
pause
