// server.js
const WebSocket = require('ws');
const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

function ts() {
  return new Date().toISOString();
}

console.log(`${ts()} Signaling: avviato, porta ${process.env.PORT || 8080}`);

const clients = new Map(); // ws -> { role, id, lastSeen }

server.on('connection', (ws, req) => {
  const id = Math.random().toString(36).slice(2, 10);
  const remote = req.socket.remoteAddress + ':' + req.socket.remotePort;
  clients.set(ws, { id, role: null, lastSeen: Date.now(), remote });
  console.log(`${ts()} Connessione aperta id=${id} remote=${remote} totalClients=${clients.size}`);

  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
    const info = clients.get(ws) || {};
    info.lastSeen = Date.now();
    clients.set(ws, info);
  });

  ws.on('message', (data) => {
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      console.log(`${ts()} id=${id} messaggio non JSON: ${data}`);
      return;
    }

    const info = clients.get(ws) || {};
    info.lastSeen = Date.now();
    if (parsed.role) {
      info.role = parsed.role;
      clients.set(ws, info);
      console.log(`${ts()} id=${id} set role=${parsed.role}`);
      return;
    }

    console.log(`${ts()} id=${id} message: keys=[${Object.keys(parsed).join(',')}]`);

    // Broadcast verso gli altri client: semplice forward di signaling
    server.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(parsed));
        } catch (err) {
          console.log(`${ts()} id=${id} errore invio a client: ${err}`);
        }
      }
    });
  });

  ws.on('close', (code, reason) => {
    const info = clients.get(ws) || {};
    console.log(`${ts()} Connessione chiusa id=${id} role=${info.role} remote=${info.remote} code=${code} reason=${reason}`);
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    const info = clients.get(ws) || {};
    console.log(`${ts()} Errore su id=${id} role=${info.role} remote=${info.remote} err=${err}`);
  });
});

// Simple interval to ping clients and drop dead ones
const interval = setInterval(() => {
  server.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      const info = clients.get(ws) || {};
      console.log(`${ts()} Client non risponde, chiusura id=${info.id} role=${info.role}`);
      return ws.terminate();
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch (e) {
      const info = clients.get(ws) || {};
      console.log(`${ts()} Ping fallito per id=${info.id} role=${info.role} err=${e}`);
    }
  });
}, 20000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`${ts()} Signaling: SIGINT ricevuto, chiudo server`);
  clearInterval(interval);
  server.close(() => process.exit(0));
});
