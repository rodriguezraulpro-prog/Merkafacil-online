@echo off
cd /d "%~dp0"
title Merkafacil - Prueba en Modo Escritorio (Electron)
color 0A
echo ====================================================================
echo      EJECUTANDO MERKAFACIL EN MODO ESCRITORIO (ELECTRON)
echo ====================================================================
echo.

if not exist "node_modules\electron" (
    echo Instalando Electron para pruebas de escritorio...
    call npm install --save-dev electron
)

if not exist "dist\server.cjs" (
    echo Compilando aplicacion...
    call npm run build
)

if not exist "dist\server-bundle.cjs" (
    echo Empaquetando servidor...
    call npm run bundle:server
)

echo Abriendo ventana de escritorio de Merkafacil...
call npx electron .
