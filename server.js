const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
// Abilitiamo CORS per permettere al tuo file HTML locale di connettersi
const io = new Server(server, {
    cors: {
        origin: "*", // Accetta connessioni da ovunque (incluso il tuo file locale)
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Server Ponte Video Attivo! In attesa di frame dal Raspberry...');
});

io.on('connection', (socket) => {
    console.log('Nuovo client connesso:', socket.id);

    // Quando arriva un frame dal Raspberry (evento 'video_frame')
    socket.on('video_frame', (data) => {
        // Lo inoltriamo immediatamente a tutti gli altri (il browser)
        socket.broadcast.emit('stream_display', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnesso:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});
