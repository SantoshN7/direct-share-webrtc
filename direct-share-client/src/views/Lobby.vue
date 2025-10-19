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
                <input type="file" ref="fileInput" multiple/> 
                <button @click="sendFiles()">Send Files</button>
                <button @click="leaveLobby()">Leave</button>
            </div>
            <div class="ds-lobby-file-transfer">
                <div class="ds-file-queue">
                    <h3>Outgoing files</h3>
                    <div v-for="file in outgoingFiles" :key="file.name">
                        <p>{{ file.name }} - {{ file.size }} bytes</p>
                    </div>
                </div>
                <div class="ds-file-queue">
                    <h3>Receiving files</h3>
                    <div v-for="file in incomingFiles" :key="file.name">
                        <p>{{ file.name }} - {{ file.size }} bytes</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, computed, inject } from 'vue';
import { useRouter } from 'vue-router';
import clientSocket from '../socket';

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
const fileInput = ref<HTMLInputElement | null>(null);
const outgoingFiles = ref<File[]>([]);
const incomingFiles = ref<File[]>([]);

function leaveLobby() {
    // Logic to leave the lobby
    router.push({ name: 'home' });
}

async function sendFiles() {
    // Logic to send files
    console.log('Sending files...');
    if (!dataChannel || dataChannel.readyState !== 'open') {
        console.error('Data channel is not open');
        return;
    }
    const files = fileInput.value?.files;
    if (!!files && files.length > 0) {
        for (const file of  Array.from(files)) {
            outgoingFiles.value.push(file);
            await sendFileChunks(file, dataChannel as RTCDataChannel);
        }
    } else {
        console.warn('No file selected');
    }
}

async function sendFileChunks(file: File, channel: RTCDataChannel) {
  const CHUNK_SIZE = 16 * 1024; // 16 KB per chunk
  const MAX_BUFFERED_AMOUNT = 2_000_000; // 2 MB safety limit

  // Optional: send file metadata first
  const metadata = {
    type: 'meta',
    name: file.name,
    size: file.size,
    mime: file.type
  };
  channel.send(JSON.stringify(metadata));

  let offset = 0;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();

    // Wait if the buffer is too full
    await waitForBufferDrain(channel, MAX_BUFFERED_AMOUNT);

    channel.send(buffer);
    offset += buffer.byteLength;
  }

  // ✅ All chunks sent — signal completion
  channel.send(JSON.stringify({ type: 'done', name: file.name }));
  console.log(`✅ Sent file "${file.name}" (${file.size} bytes)`);
}

function waitForBufferDrain(channel: RTCDataChannel, max = 2_000_000) {
  return new Promise(resolve => {
    if (channel.bufferedAmount < max) return resolve(true);

    const handler = () => {
      if (channel.bufferedAmount < max) {
        channel.removeEventListener('bufferedamountlow', handler);
        resolve(true);
      }
    };

    channel.bufferedAmountLowThreshold = max / 2;
    channel.addEventListener('bufferedamountlow', handler);
  });
}

function downloadReceivedFile(chunks: BlobPart[], fileName: string) {
    const blob = new Blob(chunks);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0); 
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

    // Create data channel for file transfer

    dataChannel = peerConnection.createDataChannel('fileTransfer');


    dataChannel.onopen = () => {
        console.log("Data channel is open");
    };

    dataChannel.onclose = () => {
        console.log("Data channel is closed");
    };

    // Receiving data channel from remote peer

    peerConnection.ondatachannel = (event) => {
        const receiveChannel = event.channel;
        let fileChunk: BlobPart[] = [];

        receiveChannel.onmessage = (event) => {
            console.log("Data channel message received:", event.data);
            // Handle incoming messages (file chunks, metadata, etc.)
            if (typeof event.data === 'string') {
                const message = JSON.parse(event.data);
                if (message.type === 'meta') {
                    console.log(`Receiving file "${message.name}" (${message.size} bytes)`);
                    incomingFiles.value.push({ name: message.name, size: message.size });
                    // Initialize receiving file logic here
                } else if (message.type === 'done') {
                    console.log(`✅ Received file "${message.name}" completely`);
                    // Finalize receiving file logic here
                    downloadReceivedFile(fileChunk, message.name);
                    fileChunk = [];
                }
            } else if (event.data instanceof ArrayBuffer) {
                // Handle binary data (file chunks)
                fileChunk.push(event.data);
                console.log(`Received ${event.data.byteLength} bytes of file data`);
                // Append chunk to the receiving file logic here
            }
        };

        receiveChannel.onopen = () => {
            console.log("Receive channel is open");
        };

        receiveChannel.onclose = () => {
            console.log("Receive channel is closed");
        };
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

    clientSocket.on("lobbyDeleted", () => {
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
    flex-direction: column;
    align-items: center;
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