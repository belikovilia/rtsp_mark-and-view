# Camera Selecter

> **Утилита для разметки, просмотра и управления IP-камерами с быстрым экспортом скриптов и плейлистов**

---

## 🚀 Описание

Camera Selecter — это современное веб-приложение для быстрой работы с IP-камерами:
- Получение и разметка списка камер с MikroTik
- Просмотр живого видео с камер (WebSocket, RTSP → JPEG)
- Экспорт скриптов для MikroTik и плейлистов M3U8
- Массовое скачивание снимков с подписью номера камеры
- Удобный UI с тёмной темой и адаптивной сеткой

---

## 🛠️ Технологии
- **Backend:** Python 3.10+, FastAPI, ffmpeg
- **Frontend:** React (CRA), WebSocket, canvas, glassmorphism UI
- **Dev tools:** npm, uvicorn, bash/bat-скрипты, concurrently

---

## ⚡ Быстрый старт

### 1. Клонируй репозиторий
```sh
git clone <your-repo-url>
cd camera_selecter
```

### 2. Установи зависимости
- **Backend:**
  ```sh
  pip install -r backend/requirements.txt
  ```
- **Frontend:**
  ```sh
  cd frontend
  npm install
  npm install concurrently --save-dev
  cd ..
  ```

### 3. Настрой .env для backend
Создай файл `backend/.env` со следующим содержимым:
```ini
# backend/.env
RTSP_USER=login
RTSP_PASS=pass
```

### 4. Запуск (3 способа)

#### **A. npm run dev (рекомендуется, кроссплатформенно):**
```sh
cd frontend
npm run dev
```
- Запустит backend и frontend одновременно (требует установленного concurrently)

#### **B. Bash-скрипт (Linux/Mac):**
```sh
./start.sh
```

#### **C. Windows:**
```bat
start_windows.bat
```

- Откроются два окна: backend (FastAPI) и frontend (React)
- Перейди в браузере на [http://localhost:3000](http://localhost:3000)

---

## 🔑 Безопасность
- Все пароли и секреты должны храниться в `.env` или специальных файлах, которые не попадают в git (см. `.gitignore`).
- Не размещай реальные пароли в коде!
- Для RTSP-пароля и логина используй переменные окружения (можно доработать backend для чтения из `.env`).

---

## 🖥️ Возможности
- **Разметка:**
  - Вставь список IP+MAC, получи превью, выбери комментарии, экспортируй скрипт для MikroTik
  - Экспортируй плейлист M3U8
  - Скачивай снимки с подписью номера камеры (по одной или все сразу)
- **Просмотр:**
  - Вставь IP или загрузи m3u8 — смотри живое видео с камер в сетке
  - Выбирай размер превью и количество камер в строке
  - Скачивай снимки прямо из live-потока

---

## 📦 Структура проекта
```
camera_selecter/
├── backend/           # FastAPI + ffmpeg backend
├── frontend/          # React frontend
├── start.sh           # Bash-скрипт для запуска (Linux/Mac)
├── start_windows.bat  # Скрипт для запуска на Windows
├── .gitignore         # Безопасность и чистота репозитория
└── README.md          # Этот файл
```

---

## 💡 Авторы и поддержка
- Автор: Belikov Ilia
- Вопросы, баги, предложения — через Issues или Pull Requests

---

**Удачной работы с камерами!** 