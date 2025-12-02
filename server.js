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
    target_fps: 50,
    width: 640,
    height: 480,
    jpeg_quality: 50
};

// ⭐ NUOVE VARIABILI PER LA GESTIONE ANTI-LAG DEL SERVER ⭐
let lastFrameData = null;      // Contiene l'ultimo frame (il più fresco) ricevuto dal Raspberry
let isSendingFrame = false;    // Flag per sapere se stiamo già cercando di inviare

// ⭐ FUNZIONE CHE INVIA SOLO L'ULTIMO FRAME RICEVUTO ⭐
function sendLatestFrame() {
    // 1. Controlla se c'è un frame da inviare E se non siamo già in fase di invio
    if (!lastFrameData || isSendingFrame) {
        return;
    }

    // Blocca l'invio per evitare la spedizione di frame multipli contemporaneamente
    isSendingFrame = true; 
    
    const frameToSend = lastFrameData; // Preleva il frame più recente
    lastFrameData = null;              // ⭐ SVUOTA il buffer: questo fa sì che i frame più vecchi
                                       // che sono rimasti in coda vengano scartati se arrivano
                                       // prima del prossimo ciclo.
    
    // Tempo di attesa minimo basato sul target FPS (50 FPS -> 20ms)
    const delayTime = 1000 / currentConfig.target_fps;

    // Invia il frame a tutti i client (browser)
    // Usiamo io.emit perché vogliamo raggiungere tutti i client che visualizzano il video
    io.emit('stream_display', frameToSend); 

    // 2. Dopo un breve ritardo, sblocca l'invio
    setTimeout(() => {
        isSendingFrame = false;
        
        // 3. Se nel frattempo è arrivato un frame NUOVO, lo inviamo immediatamente
        if (lastFrameData) { 
            sendLatestFrame();
        }
    }, delayTime); 
}


app.get('/', (req, res) => {
    res.send('Server Ponte Video Attivo! Configurazione corrente: ' + JSON.stringify(currentConfig));
});

io.on('connection', (socket) => {
    console.log('Nuovo client connesso:', socket.id);

    // 1. Invia config iniziale
    socket.emit('config_updated', currentConfig);

    // 2. STREAMING VIDEO (Raspberry -> Browser)
    socket.on('video_frame', (data) => {
        // ⭐ NUOVA LOGICA: NON INOLTRARE IMMEDIATAMENTE
        // Aggiorna solo il frame più recente e tenta l'invio.
        lastFrameData = data;
        sendLatestFrame();
    });

    // 3. CONFIGURAZIONE (Browser <-> Server <-> Raspberry)
    socket.on('get_config', () => {
        socket.emit('config_updated', currentConfig);
    });

    socket.on('update_config', (newConfig) => {
        console.log('Nuova configurazione ricevuta:', newConfig);
        currentConfig = { ...currentConfig, ...newConfig };
        
        // Se si aggiorna l'FPS target, il timer di sendLatestFrame si aggiornerà al prossimo frame
        io.emit('config_updated', currentConfig);
    });

    // 4. SISTEMA VELOCITÀ (Nuovo)
    socket.on('toggle_speed_monitoring', (isActive) => {
        console.log(`Richiesta monitoraggio velocità: ${isActive}`);
        io.emit('set_speed_monitoring', isActive);
    });

    socket.on('speed_data', (data) => {
        socket.broadcast.emit('display_speed', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnesso:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});
