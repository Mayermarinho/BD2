@echo off
rem Inicia o sistema em duas janelas: API (backend) e site (frontend, versao compilada).
rem   iniciar.bat        -> usa o MySQL configurado em backend\.env
rem   iniciar.bat demo   -> usa dados ficticios em memoria (nao precisa de banco)
setlocal
set "MODO=start"
if /i "%~1"=="demo" set "MODO=run demo"

start "API (backend)" /D "%~dp0backend" cmd /k "npm install && npm %MODO%"
start "Site (frontend)" /D "%~dp0frontend" cmd /k "npm install && npm run build && npm run preview"

echo.
echo Duas janelas foram abertas: "API (backend)" e "Site (frontend)".
echo Quando o site mostrar "Local: http://localhost:5173/", abra esse endereco no navegador.
echo Para o celular (mesmo Wi-Fi), use o endereco "Network" que aparece na janela do site.
echo Para parar: feche as duas janelas (ou Ctrl+C em cada uma).
endlocal
