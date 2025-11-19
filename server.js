const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

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

// Servire file statici
app.use(express.static(path.join(__dirname, 'public')));

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gestione connessioni Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Invia configurazione TURN al client
  socket.emit('turn-config', TURN_CONFIG);

  // Gestione offerta WebRTC
  socket.on('offer', (data) => {
    console.log('Offer received from client');
    // Inoltra l'offerta ad altri client (per connessioni P2P)
    socket.broadcast.emit('offer', data);
  });

  // Gestione risposta WebRTC
  socket.on('answer', (data) => {
    console.log('Answer received from client');
    socket.broadcast.emit('answer', data);
  });

  // Gestione ICE candidates
  socket.on('ice-candidate', (data) => {
    socket.broadcast.emit('ice-candidate', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at: http://localhost:${PORT}`);
});
