@echo off
echo Starting FastAPI ScholarFinder Server on port 8000...
cd /d "%~dp0"
python -m uvicorn scholarfinder_api:app --host 127.0.0.1 --port 8000 --reload
pause