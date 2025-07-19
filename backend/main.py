from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import ffmpeg
import base64
import asyncio
import subprocess
import os
from dotenv import load_dotenv

# Загружаем переменные из .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# Константы для RTSP
RTSP_USER = os.getenv("RTSP_USER", "login")
RTSP_PASS = os.getenv("RTSP_PASS", "pass")
RTSP_PORT = 554
RTSP_PATH = "/2"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_snapshot(rtsp_url):
    try:
        out, _ = (
            ffmpeg
            .input(rtsp_url, rtsp_transport='tcp', v='error')
            .output('pipe:', vframes=1, format='image2', vcodec='mjpeg')
            .run(capture_stdout=True, capture_stderr=True)
        )
        return base64.b64encode(out).decode('utf-8')
    except Exception as e:
        return None

async def get_snapshot_async(rtsp_url):
    return await asyncio.to_thread(get_snapshot, rtsp_url)

@app.post("/snapshots")
async def snapshots(ip_list: list[str]):
    tasks = []
    for ip in ip_list:
        rtsp_url = f"rtsp://{RTSP_USER}:{RTSP_PASS}@{ip}:{RTSP_PORT}{RTSP_PATH}"
        tasks.append(get_snapshot_async(rtsp_url))
    images = await asyncio.gather(*tasks)
    results = [{"ip": ip, "image": img} for ip, img in zip(ip_list, images)]
    return JSONResponse(content=results)

@app.websocket("/ws/stream")
async def ws_stream(websocket: WebSocket):
    await websocket.accept()
    ip = websocket.query_params.get("ip")
    if not ip:
        await websocket.close(code=4000)
        return
    rtsp_url = f"rtsp://{RTSP_USER}:{RTSP_PASS}@{ip}:{RTSP_PORT}{RTSP_PATH}"
    process = await asyncio.create_subprocess_exec(
        "ffmpeg",
        "-rtsp_transport", "tcp",
        "-i", rtsp_url,
        "-f", "image2pipe",
        "-vf", "scale=640:480",
        "-q:v", "5",
        "-update", "1",
        "-r", "5",
        "-vcodec", "mjpeg",
        "-",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )
    try:
        while True:
            data = await process.stdout.readuntil(b'\xff\xd9')
            await websocket.send_bytes(data)
    except (asyncio.IncompleteReadError, WebSocketDisconnect):
        pass
    except Exception as e:
        await websocket.close(code=4001)
    finally:
        process.kill()
        await process.wait() 