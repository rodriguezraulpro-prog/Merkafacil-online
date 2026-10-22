@echo off
cd /d "%~dp0"
title Merkafacil - Instalador Local
color 0A

echo ==========================================================
echo    INSTALADOR LOCAL - MERKAFACIL PUNTO DE VENTA
echo ==========================================================
echo.
echo Verificando Node.js en su sistema...

call node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] No se encontro Node.js en su sistema.
    echo Por favor descargue e instale Node.js LTS desde: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detectado correctamente.
echo.
echo [Paso 1 de 2] Instalando dependencias del sistema...
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Hubo un problema instalando las dependencias.
    pause
    exit /b 1
)

echo.
echo [Paso 2 de 2] Compilando la aplicacion para produccion...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Hubo un problema al compilar el proyecto.
    pause
    exit /b 1
)

echo.
echo ==========================================================
echo   INSTALACION FINALIZADA CON EXITO
echo   La base de datos SQLite local esta lista en la carpeta data.
echo   Ahora puede iniciar el sistema haciendo doble clic en:
echo   iniciar_sistema.bat
echo ==========================================================
echo.
pause
