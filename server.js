const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room ${room}`);
        // Notify others in the room
        socket.to(room).emit('user-joined', socket.id);
    });

    socket.on('offer', (payload) => {
        console.log(`Relaying offer from ${socket.id} to ${payload.target}`);
        io.to(payload.target).emit('offer', {
            sdp: payload.sdp,
            type: payload.type,
            sender: socket.id
        });
    });

    socket.on('answer', (payload) => {
        console.log(`Relaying answer from ${socket.id} to ${payload.target}`);
        io.to(payload.target).emit('answer', {
            sdp: payload.sdp,
            type: payload.type,
            sender: socket.id
        });
    });

    socket.on('ice-candidate', (payload) => {
        console.log(`Relaying ICE candidate from ${socket.id} to ${payload.target}`);
        io.to(payload.target).emit('ice-candidate', {
            candidate: payload.candidate,
            sender: socket.id
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});
