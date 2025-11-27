import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { ConferenceHandler } from "./socket/conferenceHandler";
import { RoomService } from "./services/room-service";

const app = express();
const server = createServer(app);
const roomService = new RoomService();

// Configuración de CORS
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        credentials: true,
    })
);

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Rutas HTTP para salas
app.get("/api/rooms", (req, res) => {
    try {
        const rooms = roomService.getAllRooms();
        res.json({ success: true, rooms });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Error al obtener salas",
        });
    }
});

app.get("/api/rooms/:roomId", (req, res) => {
    try {
        const { roomId } = req.params;
        const room = roomService.getRoomInfo(roomId);

        if (!room) {
            return res
                .status(404)
                .json({ success: false, error: "Sala no encontrada" });
        }

        res.json({ success: true, room });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Error al obtener la sala",
        });
    }
});

// Configuración de Socket.IO
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

// Inicializar manejador de conferencias
new ConferenceHandler(io);

export { app, server, io };
