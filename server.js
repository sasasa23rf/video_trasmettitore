const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// --- CONFIGURAZIONE GLOBALE CONDIVISA ---
let currentConfig = {
    target_fps: 30,
    width: 640,
    height: 480,
    jpeg_quality: 60
};

app.get('/', (req, res) => {
    res.send('Server Ponte Video Attivo! Configurazione corrente: ' + JSON.stringify(currentConfig));
});

io.on('connection', (socket) => {
    console.log('Nuovo client connesso:', socket.id);

    // 1. Invia config iniziale
    socket.emit('config_updated', currentConfig);

    // 2. STREAMING VIDEO (Raspberry -> Browser)
    // MODIFICA CRUCIALE: Riceve 'video_frame' e inoltra 'video_frame'
    socket.on('video_frame', (data) => {
        socket.broadcast.emit('video_frame', data);
    });

    // 3. CONFIGURAZIONE (Browser <-> Server <-> Raspberry)
    socket.on('get_config', () => {
        socket.emit('config_updated', currentConfig);
    });

    socket.on('update_config', (newConfig) => {
        console.log('Nuova configurazione ricevuta:', newConfig);
        currentConfig = { ...currentConfig, ...newConfig };
        io.emit('config_updated', currentConfig);
    });

    // 4. SISTEMA VELOCITÀ
    socket.on('toggle_speed_monitoring', (isActive) => {
        // Inoltra il comando a tutti (Raspberry incluso)
        io.emit('set_speed_monitoring', isActive);
    });

    socket.on('speed_data', (data) => {
        // Inoltra i dati al browser
        socket.broadcast.emit('display_speed', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnesso:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});
