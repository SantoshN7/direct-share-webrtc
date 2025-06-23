<script setup lang="ts">
</script>

<template>
    <div class="ds-lobby-container">
        <div class="ds-lobby-left-panel">
            <h2 class="ds-lobby-name">{{ lobby.lobbyName }}</h2>
            <div class="ds-lobby-status">
                <p>{{ lobbyStatus }}</p>
            </div>
            <div class="ds-lobby-members" v-if="lobby.lobbyMembers.length > 0">
                <p>Members:</p>
                <ul>
                    <li v-for="user in lobby.lobbyMembers" :key="user.memberId">{{ user.memberName }}</li>
                </ul>
            </div>

        </div>
        <div class="ds-lobby-right-panel">
            <div class="ds-lobby-actions">
                <button @click="sendFiles()">Send Files</button>
                <button @click="leaveLobby()">Leave</button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, computed, inject } from 'vue';
import { useRouter } from 'vue-router';
import clientSocket from '../socket';
import {Lobby} from '';

interface ILobbyInfo {
    lobbyId: string;
    lobbyName: string;
    LobbyOwnerId: string;
    lobbyMembers: {memberId: string; memberName: string}[];
    lobbyStatus: 'ready' | 'not-ready';
}

const lobby = ref<ILobbyInfo>({
    lobbyName: 'Default Lobby',
    lobbyStatus: 'not-ready',
    lobbyMembers: []
});

const lobbyStatus = computed(() => {
    return lobby.value.status === 'ready' ? 'Ready to send files' : 'Waiting for members';
});

const router = useRouter();

const userId = inject<string>('userId');
const lobbyId = router.currentRoute._value.params.id as string;

function leaveLobby() {
    // Logic to leave the lobby
    console.log('Leaving lobby...');
    router.push({ name: 'home' });
}

function sendFiles() {
    // Logic to send files
    console.log('Sending files...');
}

onMounted(() => {
    if (!userId || !lobbyId) {
        console.error('User ID or lobby ID is not provided');
        return;
    }

    clientSocket.emit("joinLobby", { lobbyId: lobbyId, userId: userId });
    
    clientSocket.on("lobbyStatusChanged", (data: {lobby: ILobbyInfo}) => {
        console.log("Lobby status changed:", data.lobby);
        lobby.value = data.lobby
    });

    clientSocket.on("offerCreated", (offer: any) => {
        console.log("Offer created:", offer);
        // Handle the offer creation logic here
    });

    clientSocket.on("answerCreated", (answer: any) => {
        console.log("Answer created:", answer);
        // Handle the answer creation logic here
    });

    clientSocket.on("iceCandidate", (candidate: any) => {
        console.log("ICE Candidate received:", candidate);
        // Handle the ICE candidate logic here
    });

    clientSocket.on("lobbyDeleted", (lobbyId: string) => {
        leaveLobby();
        console.log(`Lobby ${lobbyId} has been deleted.`);
    });
});

onBeforeUnmount(() => {
    clientSocket.emit("leaveLobby", { lobbyId: lobbyId, userId: userId });
    clientSocket.off("lobbyStatusChanged");
    clientSocket.off("offerCreated");
    clientSocket.off("answerCreated");
    clientSocket.off("iceCandidate");
    clientSocket.off("lobbyDeleted");
});
</script>

<style scoped>
.ds-lobby-container {
    display: flex;
    flex: 1;
    height: 80vh;
}               
.ds-lobby-left-panel {
    display: flex;
    flex-direction: column;
    width: 20%;
    margin-right: 20px;
    border-right: 2px solid #ccc;
    align-items: center;
}

.ds-lobby-right-panel {
    display: flex;
    flex: 1;
    flex-direction: row;
    justify-content: center;
}
.ds-lobby-actions {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
}
.ds-lobby-actions button {
    margin: 10px;
    padding: 10px;
    font-size: 1em;
    cursor: pointer;
}
.ds-lobby-actions button:hover {
    background-color: #007bff;
    color: white;
}
.ds-lobby-name {
    font-size: 1.5em;
    margin-bottom: 10px;
}
.ds-lobby-status {
    margin-bottom: 20px;
}
.ds-lobby-members {
    margin-bottom: 20px;
}
.ds-lobby-members ul {
    list-style: none;
    padding: 0;
}
.ds-lobby-members li {
    margin: 5px 0;
}


</style>