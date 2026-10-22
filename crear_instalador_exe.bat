@echo off
cd /d "%~dp0"
title Merkafacil - Generador de Instalador Windows (.exe)
color 0B

echo ====================================================================
echo        CREADOR DE INSTALADOR .EXE DE WINDOWS CON ELECTRON
echo ====================================================================
echo.
echo Verificando entorno de trabajo...

call node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] No se detecto el comando node.
    echo Asegurese de tener Node.js instalado desde https://nodejs.org
    echo Si lo acaba de instalar, reinicie la ventana o su PC.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detectado correctamente.
echo.

echo [Paso 1 de 3] Verificando e instalando Electron y herramientas de empaquetado...
call npm install --save-dev electron electron-builder
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] No se pudieron instalar las dependencias de Electron.
    echo Revise su conexion a internet e intente nuevamente.
    pause
    exit /b 1
)

echo.
echo [Paso 2 de 3] Compilando la aplicacion y el servidor local...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Error durante la compilacion de la aplicacion.
    pause
    exit /b 1
)

echo Generando paquete de servidor autocontenido para escritorio...
call npm run bundle:server
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Error al empaquetar el servidor.
    pause
    exit /b 1
)

echo.
echo [Paso 3 de 3] Generando el instalador de Windows (.exe)...
echo Este proceso puede tomar un par de minutos, por favor espere...
echo.
call npx electron-builder --win
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Ocurrio un problema al empaquetar el archivo .exe.
    echo Revise los mensajes de error mostrados arriba.
    pause
    exit /b 1
)

echo.
echo ====================================================================
echo   INSTALADOR GENERADO CON EXITO
echo.
echo   Su instalador .exe se encuentra listo en la carpeta:
echo   dist-electron\
echo.
echo   Encontrara el archivo: "Merkafacil POS Setup 0.0.0.exe"
echo   Ese archivo puede instalarse en cualquier PC con Windows
echo   sin necesidad de Node.js ni consolas.
echo ====================================================================
echo.
pause
