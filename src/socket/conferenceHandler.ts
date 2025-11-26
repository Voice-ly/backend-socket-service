import { Server, Socket } from "socket.io";
import { RoomService } from "../services/room-service";
import {
    JoinRoomData,
    LeaveRoomData,
    ToggleMediaData,
    CreateRoomData,
} from "../types/Conference";

export class ConferenceHandler {
    private roomService: RoomService;

    constructor(private io: Server) {
        this.roomService = new RoomService();
        this.initializeSocketEvents();
    }

    private initializeSocketEvents() {
        this.io.on("connection", (socket: Socket) => {
            console.log("Usuario conectado:", socket.id);

            // Crear una sala
            socket.on("create-room", (data: CreateRoomData) => {
                this.handleCreateRoom(socket, data);
            });

            // Unirse a una sala
            socket.on("join-room", (data: JoinRoomData) => {
                this.handleJoinRoom(socket, data);
            });

            // Dejar una sala
            socket.on("leave-room", (data: LeaveRoomData) => {
                this.handleLeaveRoom(socket, data);
            });

            // Obtener lista de salas
            socket.on("get-rooms", () => {
                this.handleGetRooms(socket);
            });

            // Eliminar sala
            socket.on(
                "delete-room",
                (data: { roomId: string; userId: string }) => {
                    this.handleDeleteRoom(socket, data);
                }
            );

            // Toggle audio
            socket.on("toggle-audio", (data: ToggleMediaData) => {
                this.handleToggleAudio(socket, data);
            });

            // Toggle video
            socket.on("toggle-video", (data: ToggleMediaData) => {
                this.handleToggleVideo(socket, data);
            });

            // Desconexión
            socket.on("disconnect", () => {
                this.handleDisconnect(socket);
            });
        });
    }

    private handleCreateRoom(socket: Socket, data: CreateRoomData) {
        try {
            const result = this.roomService.createRoom(data);

            if (!result.success) {
                socket.emit("room-creation-error", { message: result.error });
                return;
            }

            // Notificar a todos sobre la nueva sala
            this.io.emit("room-created", {
                room: result.room,
            });

            socket.emit("room-created-success", {
                room: result.room,
                message: "Sala creada exitosamente",
            });

            console.log(`Sala ${result.room?.id} creada por ${data.createdBy}`);
        } catch (error) {
            console.error("Error en create-room:", error);
            socket.emit("room-creation-error", {
                message: "Error al crear la sala",
            });
        }
    }

    private handleGetRooms(socket: Socket) {
        try {
            const rooms = this.roomService.getAllRooms();
            socket.emit("rooms-list", { rooms });
        } catch (error) {
            console.error("Error en get-rooms:", error);
            socket.emit("error", {
                message: "Error al obtener la lista de salas",
            });
        }
    }

    private handleDeleteRoom(
        socket: Socket,
        data: { roomId: string; userId: string }
    ) {
        try {
            const result = this.roomService.deleteRoom(
                data.roomId,
                data.userId
            );

            if (!result.success) {
                socket.emit("room-deletion-error", { message: result.error });
                return;
            }

            // Notificar a todos que la sala fue eliminada
            this.io.emit("room-deleted", { roomId: data.roomId });

            socket.emit("room-deleted-success", {
                roomId: data.roomId,
                message: "Sala eliminada exitosamente",
            });

            console.log(`Sala ${data.roomId} eliminada por ${data.userId}`);
        } catch (error) {
            console.error("Error en delete-room:", error);
            socket.emit("room-deletion-error", {
                message: "Error al eliminar la sala",
            });
        }
    }

    private handleJoinRoom(socket: Socket, data: JoinRoomData) {
        try {
            const { roomId, user } = data;

            // Unir socket a la room de Socket.IO
            socket.join(roomId);

            // Unir usuario a la room lógica
            const result = this.roomService.joinRoom(roomId, user, socket.id);

            if (!result.success) {
                socket.emit("join-error", { message: result.error });
                return;
            }

            // Enviar información de la sala al usuario que se unió
            socket.emit("room-info", {
                room: result.room,
                participants: result.room?.participants || [],
            });

            // Notificar a otros usuarios que alguien se unió
            socket.to(roomId).emit("user-joined", {
                user,
                participants: result.room?.participants || [],
            });

            // Actualizar lista de salas para todos
            this.io.emit("rooms-updated", {
                rooms: this.roomService.getAllRooms(),
            });

            console.log(`Usuario ${user.userId} se unió a la sala ${roomId}`);
        } catch (error) {
            console.error("Error en join-room:", error);
            socket.emit("join-error", { message: "Error al unirse a la sala" });
        }
    }

    private handleLeaveRoom(socket: Socket, data: LeaveRoomData) {
        try {
            const { roomId, userId } = data;

            // Remover usuario de la room lógica
            const result = this.roomService.leaveRoom(
                roomId,
                userId,
                socket.id
            );

            if (result.success) {
                // Notificar a otros usuarios que alguien salió
                socket.to(roomId).emit("user-left", {
                    userId,
                    participants: result.room?.participants || [],
                });

                // Actualizar lista de salas
                this.io.emit("rooms-updated", {
                    rooms: this.roomService.getAllRooms(),
                });

                // Sacar socket de la room de Socket.IO
                socket.leave(roomId);

                console.log(`Usuario ${userId} salió de la sala ${roomId}`);
            }
        } catch (error) {
            console.error("Error en leave-room:", error);
        }
    }

    private handleToggleAudio(socket: Socket, data: ToggleMediaData) {
        this.handleMediaToggle(socket, data, "isAudioEnabled");
    }

    private handleToggleVideo(socket: Socket, data: ToggleMediaData) {
        this.handleMediaToggle(socket, data, "isVideoEnabled");
    }

    private handleMediaToggle(
        socket: Socket,
        data: ToggleMediaData,
        mediaType: "isAudioEnabled" | "isVideoEnabled"
    ) {
        try {
            const { roomId, userId } = data;

            // Obtener usuario actual para toggle
            const room = this.roomService.getRoomInfo(roomId);
            const participant = room?.participants.find(
                (p) => p.userId === userId
            );

            if (!participant) {
                return;
            }

            const updates = { [mediaType]: !participant[mediaType] };

            // Actualizar en el servicio
            const result = this.roomService.updateParticipant(
                roomId,
                userId,
                updates
            );

            if (result.success && result.participant) {
                // Notificar a todos en la sala
                this.io.to(roomId).emit("user-updated", {
                    userId,
                    updates: result.participant,
                });
            }
        } catch (error) {
            console.error(`Error en toggle-${mediaType}:`, error);
        }
    }

    private handleDisconnect(socket: Socket) {
        try {
            const userId = this.roomService.getUserId(socket.id);

            if (userId) {
                const roomId = this.roomService.getRoomByUserId(userId);
                if (roomId) {
                    this.roomService.leaveRoom(roomId, userId, socket.id);

                    // Notificar a otros en la sala
                    socket.to(roomId).emit("user-left", {
                        userId,
                        participants:
                            this.roomService.getRoomInfo(roomId)
                                ?.participants || [],
                    });

                    // Actualizar lista de salas
                    this.io.emit("rooms-updated", {
                        rooms: this.roomService.getAllRooms(),
                    });

                    console.log(
                        `Usuario ${userId} desconectado de la sala ${roomId}`
                    );
                }
            }

            console.log("Usuario desconectado:", socket.id);
        } catch (error) {
            console.error("Error en disconnect:", error);
        }
    }
}
