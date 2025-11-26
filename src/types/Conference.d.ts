export interface Participant {
    id: string;
    userId: string;
    name: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isCurrentUser?: boolean;
}

export interface CreateRoomData {
    name: string;
    maxParticipants?: number;
    tittle?: string;
    description?: string;
    createdBy: string;
}

export interface JoinRoomData {
    roomId: string;
    user: Participant;
}

export interface LeaveRoomData {
    roomId: string;
    userId: string;
}

export interface ToggleMediaData {
    userId: string;
    roomId: string;
}

export interface RoomInfo {
    id: string;
    name: string;
    maxParticipants: number;
    isLocked: boolean;
    participantCount: number;
    createdBy: string;
    createdAt: Date;
}

// Añadir createdBy al interface Room
export interface Room {
    id: string;
    name: string;
    maxParticipants: number;
    isLocked: boolean;
    participants: Participant[];
    createdBy: string;
    createdAt: Date;
}
