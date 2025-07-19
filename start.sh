#!/bin/bash
# Запуск backend
uvicorn backend.main:app --reload --port 6565 &
BACK_PID=$!
# Запуск frontend
cd frontend
npm start
cd ..
# После завершения frontend — убиваем backend
kill $BACK_PID 