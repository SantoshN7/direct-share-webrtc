import Member from './member';

export default class Lobby {
    lobbyId: string;
    lobbyName: string;
    LobbyOwnerId: string;
    lobbyMembers: Member[] = [];

    constructor(lobbyId: string, lobbyOwnerId: string, lobbyName: string,) {
        this.lobbyId = lobbyId;
        this.lobbyName = lobbyName;
        this.LobbyOwnerId = lobbyOwnerId;
    }

    addMember(member: Member) {
        if (this.lobbyMembers.length < 2 && !this.lobbyMembers.some(m => m.memberId === member.memberId)) {
            if (!this.LobbyOwnerId) {
                this.LobbyOwnerId = member.memberId;
            }
            this.lobbyMembers.push(member);
        } else if (this.lobbyMembers.length >= 2) {
            throw new Error('Lobby is full');
        }
    }

    removeMember(memberId: string) {
        this.lobbyMembers = this.lobbyMembers.filter(m => m.memberId !== memberId);
        if (this.LobbyOwnerId === memberId) {
            this.LobbyOwnerId = this.lobbyMembers.length > 0 ? this.lobbyMembers[0].memberId : '';
        }
    }

    isLobbyFull(): boolean {
        return this.lobbyMembers.length >= 2;
    }

    isLobbyEmpty(): boolean {
        return this.lobbyMembers.length === 0;
    }

    isValidLobbyMember(memberId: string): boolean {
        return this.lobbyMembers.some(m => m.memberId === memberId);
    }
}