import { RoomManager } from "../models/Room";
import {
    Participant,
    Room,
    CreateRoomData,
    RoomInfo,
} from "../types/Conference";

export class RoomService {
    private roomManager: RoomManager;

    constructor() {
        this.roomManager = new RoomManager();
    }

    createRoom(data: CreateRoomData): {
        success: boolean;
        room?: Room;
        error?: string;
    } {
        try {
            const roomId = this.generateRoomId();
            const room = this.roomManager.createRoom(
                roomId,
                data.name,
                data.createdBy,
                data.maxParticipants || 10
            );

            return { success: true, room };
        } catch (error) {
            return {
                success: false,
                error: "Error al crear la sala",
            };
        }
    }

    joinRoom(
        roomId: string,
        participant: Participant,
        socketId: string
    ): { success: boolean; room?: Room; error?: string } {
        // Verificar si la sala existe
        if (!this.roomManager.roomExists(roomId)) {
            return {
                success: false,
                error: "La sala no existe",
            };
        }

        const joined = this.roomManager.joinRoom(roomId, participant, socketId);

        if (!joined) {
            return {
                success: false,
                error: "No se pudo unir a la sala. Puede que esté llena o bloqueada.",
            };
        }

        return {
            success: true,
            room: this.roomManager.getRoom(roomId),
        };
    }

    leaveRoom(
        roomId: string,
        userId: string,
        socketId: string
    ): { success: boolean; room?: Room } {
        const left = this.roomManager.leaveRoom(roomId, userId, socketId);

        if (!left) {
            return { success: false };
        }

        const room = this.roomManager.getRoom(roomId);
        return {
            success: true,
            room: room,
        };
    }

    updateParticipant(
        roomId: string,
        userId: string,
        updates: Partial<Participant>
    ): { success: boolean; participant?: Participant } {
        const updated = this.roomManager.updateParticipant(
            roomId,
            userId,
            updates
        );

        if (!updated) {
            return { success: false };
        }

        const room = this.roomManager.getRoom(roomId);
        const participant = room?.participants.find((p) => p.userId === userId);

        return {
            success: true,
            participant,
        };
    }

    getRoomInfo(roomId: string): Room | undefined {
        return this.roomManager.getRoom(roomId);
    }

    getAllRooms(): RoomInfo[] {
        return this.roomManager.getAllRooms();
    }

    getRoomByUserId(userId: string): string | undefined {
        return this.roomManager.getRoomByUserId(userId);
    }

    getSocketId(userId: string): string | undefined {
        return this.roomManager.getSocketId(userId);
    }

    getUserId(socketId: string): string | undefined {
        return this.roomManager.getUserId(socketId);
    }

    deleteRoom(
        roomId: string,
        userId: string
    ): { success: boolean; error?: string } {
        const room = this.roomManager.getRoom(roomId);

        if (!room) {
            return { success: false, error: "La sala no existe" };
        }

        if (room.createdBy !== userId) {
            return {
                success: false,
                error: "Solo el creador puede eliminar la sala",
            };
        }

        const deleted = this.roomManager.deleteRoom(roomId);
        return { success: deleted };
    }
}
