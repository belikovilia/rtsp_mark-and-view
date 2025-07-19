import React, { useState, useRef } from "react";

const DEFAULT_SIZE = "medium";
const SIZE_MAP = {
  small: { w: 320, h: 240 },
  medium: { w: 480, h: 360 },
  large: { w: 640, h: 480 },
};
const DEFAULT_COLS = 3;

function parseInput(input) {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [ip] = line.split(/\s+/);
      return ip;
    });
}

function parseM3U(content) {
  // Парсим m3u8, ищем rtsp://... строки и достаём только IP
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("rtsp://"))
    .map((line) => {
      // Извлекаем IP из rtsp://user:pass@IP:port/...
      const match = line.match(/rtsp:\/\/[^@]*@([\d.]+):/);
      if (match) return match[1];
      // Если нет user:pass, ищем просто после rtsp://
      const match2 = line.match(/rtsp:\/\/([\d.]+):/);
      if (match2) return match2[1];
      return "";
    })
    .filter(Boolean);
}

function CameraStream({ ip, size, imageData, onDownload }) {
  const canvasRef = useRef();
  const wsRef = useRef();
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [lastFrame, setLastFrame] = useState(null);

  React.useEffect(() => {
    setError("");
    setConnected(false);
    setHasImage(false);
    setLastFrame(null);
    const ws = new window.WebSocket(`ws://localhost:6565/ws/stream?ip=${ip}`);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onerror = () => setError("Ошибка WebSocket");
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      setHasImage(true);
      setLastFrame(event.data);
      const blob = new Blob([event.data], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      const img = new window.Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, size.w, size.h);
        ctx.drawImage(img, 0, 0, size.w, size.h);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    };
    return () => {
      ws.close();
    };
    // eslint-disable-next-line
  }, [ip, size.w, size.h]);

  // Скачивание снимка с подписью
  function downloadSnapshot() {
    if (!lastFrame) return;
    const blob = new Blob([lastFrame], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    const img = new window.Image();
    img.onload = function () {
      const w = img.width;
      const h = img.height;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      // Подпись
      const camNum = ip.split(".").pop();
      const label = camNum || "";
      ctx.font = `bold ${Math.round(h * 0.09)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(w/2 - ctx.measureText(label).width/2 - 18, h - h*0.13, ctx.measureText(label).width + 36, h*0.13);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, w/2, h);
      // Скачивание
      const outUrl = canvas.toDataURL("image/jpeg", 0.95);
      const a = document.createElement("a");
      a.href = outUrl;
      a.download = `camera_${label}.jpg`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 100);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // Для массового скачивания
  React.useEffect(() => {
    if (onDownload && typeof onDownload === "function") {
      onDownload(ip, downloadSnapshot);
    }
    // eslint-disable-next-line
  }, [lastFrame]);

  return (
    <div className="camera-viewer-tile"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="camera-viewer-title">{ip}</div>
      <div style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          width={size.w}
          height={size.h}
          style={{
            background: "#222",
            borderRadius: "1rem",
            boxShadow: "0 2px 16px #0004",
            width: size.w,
            height: size.h,
          }}
        />
        {hovered && hasImage && (
          <button
            className="download-icon-btn"
            style={{
              position: "absolute",
              left: "50%",
              bottom: 18,
              transform: "translateX(-50%)",
              background: "rgba(30,32,40,0.7)",
              border: "none",
              borderRadius: "50%",
              padding: 10,
              cursor: "pointer",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onClick={downloadSnapshot}
            type="button"
            title="Скачать снимок"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
        )}
      </div>
      <div className="camera-viewer-status">
        {hasImage ? (
          <span style={{ color: "#5e81ff" }}>Поток активен</span>
        ) : error ? (
          <span style={{ color: "#ff6b6b" }}>{error}</span>
        ) : connected ? (
          <span style={{ color: "#aaa" }}>Ожидание...</span>
        ) : (
          <span style={{ color: "#aaa" }}>Ожидание...</span>
        )}
      </div>
    </div>
  );
}

export default function ViewerPage() {
  const [input, setInput] = useState("");
  const [ips, setIps] = useState([]);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [downloadAllFlag, setDownloadAllFlag] = useState(0);
  const downloadFns = useRef({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setIps(parseInput(input));
  };

  const handleM3u = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ips = parseM3U(ev.target.result);
      setIps(ips);
      setInput(ips.join("\n")); // чтобы textarea тоже обновлялась
    };
    reader.readAsText(file);
  };

  // Для массового скачивания
  function handleDownloadAll() {
    setDownloadAllFlag(f => f + 1);
    // Запускаем скачивание для всех камер с задержкой
    Object.values(downloadFns.current).forEach((fn, idx) => {
      setTimeout(() => fn && fn(), idx * 300);
    });
  }

  return (
    <div className="viewer-page">
      <form className="glass-form" onSubmit={handleSubmit} style={{ maxWidth: 700 }}>
        <h2>Просмотр камер (WebSocket)</h2>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"192.168.165.101\n192.168.165.102\n..."}
          rows={4}
        />
        <div style={{ display: "flex", gap: 16, margin: "1rem 0" }}>
          <label>
            Размер:
            <select value={size} onChange={e => setSize(e.target.value)} style={{ marginLeft: 8 }}>
              <option value="small">Маленький</option>
              <option value="medium">Средний</option>
              <option value="large">Большой</option>
            </select>
          </label>
          <label>
            Камер в строке:
            <select value={cols} onChange={e => setCols(Number(e.target.value))} style={{ marginLeft: 8 }}>
              {[1,2,3,4,5,6].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label style={{ marginLeft: "auto" }}>
            <input type="file" accept=".m3u,.m3u8" onChange={handleM3u} style={{ display: "none" }} id="m3u-upload" />
            <button type="button" onClick={() => document.getElementById("m3u-upload").click()}>
              Загрузить m3u8
            </button>
          </label>
        </div>
        <button type="submit">Показать камеры</button>
      </form>
      {ips.length > 0 && (
        <div style={{ width: "100%", maxWidth: 1600, margin: "0 auto 1.5rem auto", display: "flex", justifyContent: "flex-end" }}>
          <button className="copy-btn" style={{ padding: "0.7rem 1.5rem", fontSize: "1.08rem" }} onClick={handleDownloadAll}>
            Скачать все снимки
          </button>
        </div>
      )}
      <div
        className="viewer-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 24,
          marginTop: 32,
        }}
      >
        {ips.map((ip, i) => (
          <CameraStream
            key={ip + i}
            ip={ip}
            size={SIZE_MAP[size]}
            onDownload={(ip, fn) => downloadFns.current[ip] = fn}
          />
        ))}
      </div>
    </div>
  );
} 