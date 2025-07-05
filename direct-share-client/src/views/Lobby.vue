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
let peerConnection: RTCPeerConnection | null = null;
let dataChannel: RTCDataChannel | null = null;

function leaveLobby() {
    // Logic to leave the lobby
    router.push({ name: 'home' });
}

function sendFiles() {
    // Logic to send files
    console.log('Sending files...');
}

async function createOffer() {
    if (!peerConnection) return; 
    const offer = await peerConnection.createOffer();
    console.log("setLocalDescription with offer:", offer);
    await peerConnection.setLocalDescription(offer);
    clientSocket.emit("sendOffer", { offer: offer, lobbyId: lobbyId, userId: userId });
    console.log("Offer created and sent:", offer);
}

async function createAnswer() {
    if (!peerConnection) return;
    const answer = await peerConnection.createAnswer();
    console.log("setLocalDescription with answer:", answer);
    await peerConnection.setLocalDescription(answer);
    clientSocket.emit("sendAnswer", { answer: answer, lobbyId: lobbyId, userId: userId });
    console.log("Answer created and sent:", answer);
}

onMounted(() => {
    if (!userId || !lobbyId) {
        console.error('User ID or lobby ID is not provided');
        return;
    }

    // Initialize the peer connection and data channel
    peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

     // send ice candidates to the server
    peerConnection.onicecandidate = (event) => {
        console.log("ICE Candidate:", event.candidate);
        if (event.candidate) {
            clientSocket.emit("sendIceCandidate", { candidate: event.candidate, lobbyId: lobbyId, userId: userId });
            console.log("ICE Candidate sent:", event.candidate);
        } else {
            console.log("connnection is stable, no more candidates to send");
        }
    };


    dataChannel = peerConnection.createDataChannel('fileTransfer');


    dataChannel.onopen = () => {
        console.log("Data channel is open");
    };

    clientSocket.emit("joinLobby", { lobbyId: lobbyId, userId: userId });
    
    clientSocket.on("lobbyStatusChanged", (data: {lobby: ILobbyInfo}) => {
        console.log("Lobby status changed:", data.lobby);
        Object.assign(lobby.value, data.lobby);
    });

    clientSocket.on("lobbyJoined", async (data: {lobbyId: string; userId: string}) => {
        if (lobby.value.lobbyId === data.lobbyId && lobby.value.lobbyStatus === 'ready' && data.userId === userId) {
            // If the lobby is ready, create an offer
            createOffer();
        }
    });

    clientSocket.on("incomingOffer", async ({offer}:{offer: RTCSessionDescriptionInit}) => {
        if (offer) {
            console.log('setRemoteDescription with offer:', offer);
            await peerConnection?.setRemoteDescription(offer);
            createAnswer();
        }
    });

    clientSocket.on("incomingAnswer", async ({answer}: {answer: RTCSessionDescriptionInit}) => {
        if (answer) {
            console.log('setRemoteDescription with answer:', answer);
            await peerConnection?.setRemoteDescription(answer);
        }
    });

    clientSocket.on("iceCandidate", async ({candidate}: {candidate: RTCIceCandidateInit}) => {
        console.log("ICE Candidate received:", candidate);
        // Handle the ICE candidate logic here
        if (candidate) {
            await peerConnection?.addIceCandidate(candidate);
        }
    });

    clientSocket.on("lobbyDeleted", (lobbyId: string) => {
        leaveLobby();
    });
});

onBeforeUnmount(() => {
    clientSocket.emit("leaveLobby", { lobbyId: lobbyId, userId: userId });
    clientSocket.off("lobbyStatusChanged");
    clientSocket.off("lobbyJoined");
    clientSocket.off("incomingOffer");
    clientSocket.off("incomingAnswer");
    clientSocket.off("iceCandidate");
    clientSocket.off("lobbyDeleted");
    dataChannel?.close();
    peerConnection?.close();
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