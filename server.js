// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Serve static receiver page from /public
app.use(express.static(path.join(__dirname, 'public')));

let senderSocket = null;
let receiverSocket = null;

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  socket.on('create_sender', () => {
    console.log('Sender registered', socket.id);
    senderSocket = socket;
    socket.emit('created', { role: 'sender' });
  });

  socket.on('create_receiver', () => {
    console.log('Receiver registered', socket.id);
    receiverSocket = socket;
    socket.emit('created', { role: 'receiver' });
    if (senderSocket) senderSocket.emit('receiver-ready');
  });

  // Sender posts offer -> forward to receiver
  socket.on('offer', (data, cb) => {
    if (receiverSocket) {
      receiverSocket.emit('offer', data);
      cb && cb({ status: 'forwarded' });
    } else {
      cb && cb({ error: 'no-receiver' });
    }
  });

  // Receiver posts answer -> forward to sender
  socket.on('answer', (data) => {
    if (senderSocket) senderSocket.emit('answer', data);
  });

  // ICE candidates forwarded between peers
  socket.on('ice-candidate', (data) => {
    if (socket.id === (senderSocket && senderSocket.id)) {
      if (receiverSocket) receiverSocket.emit('ice-candidate', data);
    } else if (socket.id === (receiverSocket && receiverSocket.id)) {
      if (senderSocket) senderSocket.emit('ice-candidate', data);
    } else {
      socket.broadcast.emit('ice-candidate', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
    if (senderSocket && socket.id === senderSocket.id) senderSocket = null;
    if (receiverSocket && socket.id === receiverSocket.id) receiverSocket = null;
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Signaling server running on port ${PORT}`));
