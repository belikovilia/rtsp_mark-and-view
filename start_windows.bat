@echo off
start cmd /k "uvicorn backend.main:app --reload --port 6565"
cd frontend
start cmd /k "npm start"
cd .. 