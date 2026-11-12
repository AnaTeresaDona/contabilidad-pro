@echo off
rem Abre el juego en el navegador. Deja esta ventana abierta mientras juegas; ciérrala para terminar.
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando por primera vez, espera un momento...
  call npm install
)
echo Abriendo Contabilidad Pro en el navegador...
call npm run dev -- --open
