const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configurazione ExpressTURN
const TURN_CONFIG = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'
    },
    {
      urls: 'turn:expressturn.com:3450',
      username: '000000000007829535',
      credential: 'X.4BvxAe8E7tgVf9FKHnGQzHY3Zs'
    }
  ]
};

// Route principale - HTML minimale
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ricevitore Video WebRTC</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        video {
            max-width: 100%;
            max-height: 90vh;
            border: 2px solid #333;
            border-radius: 8px;
        }
        .status {
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="status" id="status">In attesa di connessione...</div>
    <video id="remoteVideo" autoplay playsinline></video>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        let socket;
        let peerConnection;

        const remoteVideo = document.getElementById('remoteVideo');
        const statusDiv = document.getElementById('status');

        // Inizializza Socket.io
        function initializeSocket() {
            socket = io();
            
            socket.on('connect', () => {
                updateStatus('Connesso al server');
                initializeWebRTC();
            });

            socket.on('offer', async (data) => {
                await handleOffer(data);
            });

            socket.on('ice-candidate', (data) => {
                if (peerConnection) {
                    peerConnection.addIceCandidate(data);
                }
            });

            socket.on('disconnect', () => {
                updateStatus('Disconnesso dal server');
            });
        }

        // Inizializza WebRTC
        function initializeWebRTC() {
            const config = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    {
                        urls: 'turn:expressturn.com:3450',
                        username: '000000000007829535',
                        credential: 'X.4BvxAe8E7tgVf9FKHnGQzHY3Zs'
                    }
                ]
            };

            peerConnection = new RTCPeerConnection(config);

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice-candidate', event.candidate);
                }
            };

            peerConnection.ontrack = (event) => {
                console.log('Stream video ricevuto');
                remoteVideo.srcObject = event.streams[0];
                updateStatus('Video in streaming');
            };

            peerConnection.onconnectionstatechange = () => {
                updateStatus('Stato: ' + peerConnection.connectionState);
            };
        }

        // Gestisce l'offerta ricevuta
        async function handleOffer(offer) {
            if (!peerConnection) {
                initializeWebRTC();
            }

            try {
                await peerConnection.setRemoteDescription(offer);
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('answer', answer);
                updateStatus('Connessione WebRTC stabilita');
            } catch (error) {
                console.error('Errore:', error);
                updateStatus('Errore di connessione');
            }
        }

        // Aggiorna lo stato
        function updateStatus(message) {
            statusDiv.textContent = message;
            console.log(message);
        }

        // Avvia tutto al caricamento della pagina
        window.addEventListener('load', initializeSocket);
    </script>
</body>
</html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'WebRTC Video Receiver',
    turn: 'expressturn.com:3450'
  });
});

// Gestione connessioni Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Inoltra messaggi tra client
  socket.on('offer', (data) => {
    socket.broadcast.emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.broadcast.emit('answer', data);
  });

  socket.on('ice-candidate', (data) => {
    socket.broadcast.emit('ice-candidate', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Video receiver ready at: http://localhost:${PORT}`);
});
