const http = require("http");
const WebSocket = require("ws");

let lastViewer = null;
let lastDevice = null;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("WebRTC signaling server running");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    let data;
    try { data = JSON.parse(message); } catch { return; }

    if (data.type === "offer" && data.role === "viewer") {
      lastViewer = ws;
      if (lastDevice && lastDevice.readyState === WebSocket.OPEN) {
        lastDevice.send(JSON.stringify(data));
      }
    } else if (data.type === "answer" && data.role === "device") {
      if (lastViewer && lastViewer.readyState === WebSocket.OPEN) {
        lastViewer.send(JSON.stringify(data));
      }
    } else if (data.type === "ice") {
      if (data.role === "viewer") {
        if (lastDevice && lastDevice.readyState === WebSocket.OPEN) {
          lastDevice.send(JSON.stringify(data));
        }
      } else if (data.role === "device") {
        if (lastViewer && lastViewer.readyState === WebSocket.OPEN) {
          lastViewer.send(JSON.stringify(data));
        }
      }
    } else if (data.type === "hello" && data.role === "device") {
      lastDevice = ws;
    } else if (data.type === "hello" && data.role === "viewer") {
      lastViewer = ws;
    }
  });

  ws.on("close", () => {
    if (ws === lastViewer) lastViewer = null;
    if (ws === lastDevice) lastDevice = null;
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Signaling server on :${PORT}`));
