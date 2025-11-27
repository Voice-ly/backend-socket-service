import { Room as RoomType, Participant, RoomInfo } from "../types/Conference";

export class RoomManager {
    private rooms: Map<string, RoomType> = new Map();
    private userSocketMap: Map<string, string> = new Map();
    private socketUserMap: Map<string, string> = new Map();
    private userRoomsMap: Map<string, string> = new Map(); // userId -> roomId

    createRoom(
        roomId: string,
        name: string,
        createdBy: string,
        maxParticipants: number = 10
    ): RoomType {
        const room: RoomType = {
            id: roomId,
            name,
            maxParticipants,
            isLocked: false,
            participants: [],
            createdBy,
            createdAt: new Date(),
        };

        this.rooms.set(roomId, room);
        return room;
    }

    getRoom(roomId: string): RoomType | undefined {
        return this.rooms.get(roomId);
    }

    getAllRooms(): RoomInfo[] {
        return Array.from(this.rooms.values()).map((room) => ({
            id: room.id,
            name: room.name,
            maxParticipants: room.maxParticipants,
            isLocked: room.isLocked,
            participantCount: room.participants.length,
            createdBy: room.createdBy,
            createdAt: room.createdAt,
        }));
    }

    joinRoom(
        roomId: string,
        participant: Participant,
        socketId: string
    ): boolean {
        const room = this.rooms.get(roomId);

        if (!room) {
            return false;
        }

        if (room.isLocked) {
            return false;
        }

        if (room.participants.length >= room.maxParticipants) {
            return false;
        }

        // Verificar si el usuario ya está en la sala
        const existingParticipantIndex = room.participants.findIndex(
            (p) => p.userId === participant.userId
        );

        if (existingParticipantIndex === -1) {
            room.participants.push(participant);
        }

        // Mapear usuario y socket
        this.userSocketMap.set(participant.userId, socketId);
        this.socketUserMap.set(socketId, participant.userId);
        this.userRoomsMap.set(participant.userId, roomId);

        return true;
    }

    leaveRoom(roomId: string, userId: string, socketId: string): boolean {
        const room = this.rooms.get(roomId);

        if (!room) {
            return false;
        }

        // Remover participante
        room.participants = room.participants.filter(
            (p) => p.userId !== userId
        );

        // Limpiar mapeos
        this.userSocketMap.delete(userId);
        this.socketUserMap.delete(socketId);
        this.userRoomsMap.delete(userId);

        // Si la sala queda vacía, eliminarla después de un tiempo (opcional)
        if (room.participants.length === 0) {
            setTimeout(() => {
                const currentRoom = this.rooms.get(roomId);
                if (currentRoom && currentRoom.participants.length === 0) {
                    this.rooms.delete(roomId);
                    console.log(`Sala ${roomId} eliminada por estar vacía`);
                }
            }, 30000); // 30 segundos
        }

        return true;
    }

    updateParticipant(
        roomId: string,
        userId: string,
        updates: Partial<Participant>
    ): boolean {
        const room = this.rooms.get(roomId);

        if (!room) {
            return false;
        }

        const participant = room.participants.find((p) => p.userId === userId);

        if (!participant) {
            return false;
        }

        Object.assign(participant, updates);
        return true;
    }

    getRoomByUserId(userId: string): string | undefined {
        return this.userRoomsMap.get(userId);
    }

    getSocketId(userId: string): string | undefined {
        return this.userSocketMap.get(userId);
    }

    getUserId(socketId: string): string | undefined {
        return this.socketUserMap.get(socketId);
    }

    getRoomParticipants(roomId: string): Participant[] {
        const room = this.rooms.get(roomId);
        return room ? room.participants : [];
    }

    roomExists(roomId: string): boolean {
        return this.rooms.has(roomId);
    }

    deleteRoom(roomId: string): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        // Limpiar todos los mapeos de usuarios en esta sala
        room.participants.forEach((participant) => {
            this.userRoomsMap.delete(participant.userId);
            this.userSocketMap.delete(participant.userId);
        });

        return this.rooms.delete(roomId);
    }
}
