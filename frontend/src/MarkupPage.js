import React, { useState } from "react";

const COMMENT_OPTIONS = [
  "kitchen1",
  "kitchen2",
  "livingroom1",
  "livingroom2",
  "livingroom3",
  "livingroom4",
  "bedroom1",
  "bedroom2",
  "bedroom3",
  "bedroom4",
  "bathroom",
  "toilet",
  "hall",
  "balcony",
  "lodjia",
];

const RTSP_USER = "admin";
const RTSP_PASS = "Hikvision";
const RTSP_PORT = 554;
const RTSP_PATH = "/2";

function parseInput(input) {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [ip, mac] = line.split(/\s+/);
      return { ip, mac };
    });
}

async function fetchSnapshot(ip) {
  const res = await fetch("http://localhost:6565/snapshots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([ip]),
  });
  const data = await res.json();
  return data[0];
}

export default function MarkupPage() {
  const [input, setInput] = useState("");
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [comments, setComments] = useState({}); // {ip: comment}
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [hovered, setHovered] = useState(null);

  // Выбранные комментарии
  const usedComments = Object.values(comments).filter(Boolean);
  // Свободные комментарии
  const availableComments = COMMENT_OPTIONS.filter((c) => !usedComments.includes(c));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const parsed = parseInput(input);
    if (!parsed.length) {
      setError("Введите хотя бы одну строку с IP и MAC");
      return;
    }
    setDevices([]);
    setComments({});
    setCopied(false);
    setProgress({ current: 0, total: parsed.length });
    setLoading(true);
    for (let i = 0; i < parsed.length; i++) {
      const { ip, mac } = parsed[i];
      try {
        const result = await fetchSnapshot(ip);
        setDevices((prev) => [...prev, { ...result, mac }]);
      } catch (e) {
        setDevices((prev) => [...prev, { ip, mac, image: null, error: "Ошибка запроса" }]);
      }
      setProgress((prev) => ({ ...prev, current: prev.current + 1 }));
    }
    setLoading(false);
  };

  // Для каждого ip возвращаем только свободные + выбранный для этой камеры
  const getDropdownOptions = (ip) => {
    const current = comments[ip];
    return current
      ? [current, ...availableComments]
      : availableComments;
  };

  // Формируем скрипт
  const script = devices
    .filter((d) => comments[d.ip])
    .map(
      (d) =>
        `add address=${d.ip} mac-address=${d.mac} comment="${comments[d.ip]}" server=default`
    )
    .join("\n");

  // Формируем плейлист M3U
  const playlist = (() => {
    const parsed = parseInput(input);
    let lines = ["#EXTM3U"];
    parsed.forEach((d, idx) => {
      if (d.ip) {
        lines.push(`#EXTINF:-1,Камера ${idx + 1}`);
        lines.push(`rtsp://${RTSP_USER}:${RTSP_PASS}@${d.ip}:${RTSP_PORT}${RTSP_PATH}`);
      }
    });
    return lines.join("\n");
  })();

  const handleCommentChange = (ip, value) => {
    setComments((prev) => ({ ...prev, [ip]: value }));
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `/ip dhcp-server lease\n${script}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Скачать плейлист
  const handleDownloadPlaylist = () => {
    // Получаем третий октет первого IP
    const parsed = parseInput(input);
    let filename = "cameras.m3u8";
    if (parsed.length > 0 && parsed[0].ip) {
      const parts = parsed[0].ip.split(".");
      if (parts.length === 4) {
        filename = `${parts[2]}_cameras.m3u8`;
      }
    }
    const blob = new Blob([playlist], { type: "application/vnd.apple.mpegurl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Функция для скачивания снимка с подписью
  function downloadSnapshotWithLabel(d) {
    const img = new window.Image();
    img.src = `data:image/jpeg;base64,${d.image}`;
    img.onload = function () {
      const w = img.width;
      const h = img.height;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      // Подпись
      const ip = d.ip || "";
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
      const url = canvas.toDataURL("image/jpeg", 0.95);
      const a = document.createElement("a");
      a.href = url;
      a.download = `camera_${label}.jpg`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 100);
    };
  }

  // Функция для скачивания всех снимков
  function downloadAllSnapshots() {
    devices.forEach((d, idx) => {
      setTimeout(() => downloadSnapshotWithLabel(d), idx * 300); // чтобы не было блокировки
    });
  }

  return (
    <div className="App">
      <form className="glass-form" onSubmit={handleSubmit}>
        <h2>Вставьте список IP и MAC</h2>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"192.168.165.101 BC:BA:C2:DA:7A:41\n192.168.165.102 64:F2:FB:6A:99:06"}
          rows={8}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Загрузка..." : "Показать камеры"}
        </button>
        {error && <div className="error">{error}</div>}
      </form>
      {devices.length > 0 && (
        <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto 1.5rem auto", display: "flex", justifyContent: "flex-end" }}>
          <button className="copy-btn" style={{ padding: "0.7rem 1.5rem", fontSize: "1.08rem" }} onClick={downloadAllSnapshots}>
            Скачать все снимки
          </button>
        </div>
      )}
      <div className="playlist-block glass-form">
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Плейлист для плеера (M3U):</div>
        <pre className="mikrotik-script" style={{marginBottom: 0}}>{playlist}</pre>
        <button className="copy-btn" onClick={handleDownloadPlaylist} style={{marginTop: 10}}>
          Скачать плейлист
        </button>
      </div>
      {loading && (
        <div className="progress-block">
          <div className="progress-text">
            Загрузка изображений: {progress.current} из {progress.total}
          </div>
          <div className="progress-bar-outer">
            <div
              className="progress-bar-inner"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <div className="preloader-spinner" />
        </div>
      )}
      <div className="grid">
        {devices.map((d, i) => (
          <div className="glass-card" key={d.ip + d.mac}>
            <div className="info">
              <span className="ip">{d.ip}</span>
              <span className="mac">{d.mac}</span>
            </div>
            {d.image ? (
              <div
                style={{ position: "relative", width: "100%" }}
                onMouseEnter={() => setHovered(d.ip)}
                onMouseLeave={() => setHovered(null)}
              >
                <img
                  src={`data:image/jpeg;base64,${d.image}`}
                  alt={d.ip}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "45vh",
                    borderRadius: "1rem",
                    boxShadow: "0 4px 32px #0008",
                  }}
                  id={`img-${d.ip}`}
                />
                {hovered === d.ip && (
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
                    onClick={() => downloadSnapshotWithLabel(d)}
                    type="button"
                    title="Скачать снимок"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                )}
              </div>
            ) : (
              <div className="no-image">Нет изображения</div>
            )}
            <div className="dropdown-block">
              <select
                value={comments[d.ip] || ""}
                onChange={(e) => handleCommentChange(d.ip, e.target.value)}
              >
                <option value="" disabled>
                  Выберите комментарий
                </option>
                {getDropdownOptions(d.ip).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
      {devices.length > 0 && (
        <div className="script-block glass-form">
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Скрипт для MikroTik:</div>
          <pre className="mikrotik-script">{`/ip dhcp-server lease\n${script}`}</pre>
          <button className="copy-btn" onClick={handleCopy} disabled={!script}>
            {copied ? "Скопировано!" : "Скопировать"}
          </button>
        </div>
      )}
    </div>
  );
} 