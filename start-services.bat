@echo off
echo Starting ScholarFinder Services...

echo.
echo Starting FastAPI Server on port 8000...
start "FastAPI" cmd /k "python -m uvicorn scholarfinder_api:app --host 127.0.0.1 --port 8000 --reload"

echo.
echo Starting Backend on port 3002...
start "Backend" cmd /k "cd backend && npm run dev"

echo.
echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Starting Frontend on port 8080...
start "Frontend" cmd /k "npm run dev"

echo.
echo Services are starting...
echo Fastul