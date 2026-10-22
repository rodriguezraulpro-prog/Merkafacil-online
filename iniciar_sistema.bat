@echo off
title Merkafacil - Punto de Venta Local
color 0B
echo ==========================================================
echo       INICIANDO MERKAFACIL - SISTEMA DE BODEGA LOCAL
echo ==========================================================
echo.

cd /d "%~dp0"

:: Si la carpeta dist no existe, compila primero
if not exist "dist\server.cjs" (
    echo El sistema aun no esta compilado. Ejecutando compilacion inicial...
    call npm run build
)

echo [1/2] Iniciando servidor local con base de datos SQLite...
start "Servidor Merkafacil" /min cmd /c "npm start"

echo [2/2] Esperando conexion...
timeout /t 2 /nobreak >nul

echo.
echo Abriendo Merkafacil en su navegador...
start http://localhost:3000

echo ==========================================================
echo   Sistema activo en: http://localhost:3000
echo.
echo   * Para apagar el sistema, cierre la ventana del servidor
echo     o presione Ctrl+C.
echo ==========================================================
