// server.js
// Simple signaling server (Express + Socket.io)
// Serves static files from ./public and routes signaling between a single sender and a single receiver.
// Uses PORT from environment (needed for Render).
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

let senderSocket = null;
let receiverSocket = null;

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  socket.on('create_sender', () => {
    console.log('Sender registered', socket.id);
    senderSocket = socket;
    socket.emit('created', { role: 'sender' });
    // If a receiver is already connected, notify sender
    if (receiverSocket) {
      console.log('Notifying sender that receiver is ready');
      senderSocket.emit('receiver-ready');
    }
  });

  socket.on('create_receiver', () => {
    console.log('Receiver registered', socket.id);
    receiverSocket = socket;
    socket.emit('created', { role: 'receiver' });
    // If sender exists, notify it
    if (senderSocket) {
      console.log('Notifying sender (via server) that receiver is ready');
      senderSocket.emit('receiver-ready');
    }
  });

  socket.on('offer', (data, cb) => {
    console.log('Received offer from', socket.id);
    if (receiverSocket) {
      console.log('Forwarding offer to receiver', receiverSocket.id);
      receiverSocket.emit('offer', data);
      cb && cb({ status: 'forwarded' });
    } else {
      console.log('No receiver to forward to');
      cb && cb({ error: 'no-receiver' });
    }
  });

  socket.on('answer', (data) => {
    console.log('Received answer from', socket.id);
    if (senderSocket) {
      console.log('Forwarding answer to sender', senderSocket.id);
      senderSocket.emit('answer', data);
    } else {
      console.log('No sender to forward answer to');
    }
  });

  socket.on('ice-candidate', (data) => {
    // Forward ICE candidate to the other peer
    if (socket.id === (senderSocket && senderSocket.id)) {
      if (receiverSocket) {
        receiverSocket.emit('ice-candidate', data);
      }
    } else if (socket.id === (receiverSocket && receiverSocket.id)) {
      if (senderSocket) {
        senderSocket.emit('ice-candidate', data);
      }
    } else {
      socket.broadcast.emit('ice-candidate', data);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected', socket.id, reason);
    if (senderSocket && socket.id === senderSocket.id) {
      senderSocket = null;
      console.log('Sender cleared');
    }
    if (receiverSocket && socket.id === receiverSocket.id) {
      receiverSocket = null;
      console.log('Receiver cleared');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Signaling server running on port ${PORT}`));
